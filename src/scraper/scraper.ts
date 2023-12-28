import puppeteer from 'puppeteer'
import type {Browser, Page} from 'puppeteer'
import utcDateTime from '../utils/utcDateTime';
import extractSearchedPerformedDate from '../utils/extractSearchedPerformedDate';
import extractGFADateTime from '../utils/extractGFADateTime';


export type ReportTypeOptions = 'METAR' | 'TAF' | 'Upper Wind' | 'SIGMET' | 'AIRMET' | 'PIREP' | 'NOTAM'

export interface ReportsRequestType {
    aerodromeCodes: string;
    reports: Set<ReportTypeOptions>
}

interface WeatherReportReturnType {
    aerodromes: string[];
    type: ReportTypeOptions;
    data: string;
    dateFrom?: Date;
    dateTo? : Date
}

interface NotamReportReturnType {
    aerodromes: string[];
    data: string;
    dateFrom?: Date;
    dateTo? : Date;
    isSup: boolean;
}

interface AerodromesWeatherReports {
    date: Date;
    reports: WeatherReportReturnType[];
}

interface AerodromeNOTAMs {
    date: Date;
    reports: NotamReportReturnType[];
}

interface GFAReturnType {
    aerodromes: string[];
    type: string;
    region: string;
    graphs: {src: string, validAt: Date, hoursSpan: number}[];
}

interface AerodromeGFAs {
    date: Date;
    gfas: GFAReturnType[];
}

// Scraper is in charge of scraping the Nav-Canada website and returning the raw data
class Scraper {
    _browser?: Browser;
    _page?: Page;

    constructor() {}

    async init() {
        this._browser = await puppeteer.launch({headless: false, handleSIGINT: false})
        this._page = await this._browser.newPage()
        await this._page.setViewport({
            width: 1900,
            height: 1000,
            isLandscape: true,
            hasTouch: false,
            deviceScaleFactor: 1
        })
        await this._page.goto('https://plan.navcanada.ca/wxrecall/')
        await this._resetSearch()
    }

    async close() {await this._browser?.close()}

    async getAerodromeReports(request: ReportsRequestType): Promise<AerodromesWeatherReports> {
        // Perform search
        await this._setAerodromeSearch(request);
        await this._search();

        // Get date performed
        const datePerformed = await this._getDatePerformed()

        // Get result table rows
        const tableBody = await this._page?.waitForSelector(
            'div.search-results >>>> table.table.table-striped >>>> tbody'
        );
        const tableRows = await tableBody?.$$('tr:not(.hidden)');
        
        // Map table rows to report-result objects
        const reports = [] as WeatherReportReturnType[]
        if (tableRows) {
            for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
                if (rowIndex > 0) {
                    const row = tableRows[rowIndex]
                    const tableCells = await row.$$('td');
                    if (tableCells.length === 2) {
                        // Metadata: report type, aerodrome code
                        const metadata = await tableCells[0].$('div');
                        const reportType = await metadata?.$eval(
                            'div', 
                            div => (div.textContent as (ReportTypeOptions | null | undefined))
                        );
                        const aerodromes = ((await metadata?.$$eval(
                            'div.location-description', 
                            divs => (divs.map(div => div.textContent))
                        ))?.filter((a) => a !== null) || []) as string[]
                        
                        // Bulletin: report data, date-times
                        const bulletin = await tableCells[1].$('div');
                        const data = await bulletin?.$eval('pre', pre => (pre.textContent));
                        const dateSpan = await bulletin?.$$eval(
                            'div.datapanel-footer >>>> span',
                            (spans) => {
                                const dates = {
                                    from: "",
                                    to: ""
                                };
                                spans.forEach(span => {
                                    if (span.className === "start-validity")
                                        dates.from = span.textContent || "";
                                    else if (span.className === "end-validity")
                                        dates.to = span.textContent || "";
                                });
                                return dates;
                            }
                        );
                        if (reportType && data && dateSpan) {
                            reports.push({
                                aerodromes,
                                type: reportType,
                                data: data, 
                                dateFrom: utcDateTime(dateSpan.from),
                                dateTo: utcDateTime(dateSpan.to)
                            } as WeatherReportReturnType)
                        }
                    }
                }
            }
        }

        // Reset search and return
        await this._resetSearch();
        return {
            date: datePerformed,
            reports
        }
    }

    async getGFAs(aerodromeCodes: string): Promise<AerodromeGFAs> {
        // Perform search
        await this._setGFASearch(aerodromeCodes);
        await this._search();

        // Get date performed
        const datePerformed = await this._getDatePerformed()

        // Get result table rows
        const tableBody = await this._page?.waitForSelector(
            'div.search-results >>>> table.table.table-striped >>>> tbody'
        );
        const tableRows = await tableBody?.$$('tr:not(.hidden)');

        // Map table rows to graph objects
        const graphs = [] as GFAReturnType[]
        if (tableRows) {
            for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
                if (rowIndex > 0) {
                    const row = tableRows[rowIndex]
                    const tableCells = await row.$$('td');
                    if (tableCells.length === 2) {
                        // Metadata: aerodrome code
                        const metadata = await tableCells[0].$('div');
                        const aerodromeContainers = await metadata?.$$('div.location-description')

                        const aerodromes = ((await Promise.all(aerodromeContainers?.map(async (div) => (
                        await div.$eval('em', em => em.textContent)
                        )) as Promise<(string | null)>[])).filter((a) => a !== null) || []) as string[]
                        
                        // gfaPanelSections: header(title), content(graph), footer(dateTime buttons)
                        const graphHeader = await tableCells[1].$(
                            'div >>>> div.wxrecall-panel.panel >>>> div.panel-header'
                        );
                        const graphContent = await tableCells[1].$(
                            'div >>>> div.wxrecall-panel.panel >>>> div.panel-content'
                        );
                        const graphFooter = await tableCells[1].$(
                            'div >>>> div.wxrecall-panel.panel >>>> div.panel-footer'
                        );

                        // Get title
                        const title = (await graphHeader?.$eval(
                            'div.panel-header-title-bar >>>> div',
                            div => div.textContent
                        )) || ""
                        const titleSections = title.split("/")
                        
                        // Get graphs
                        const graphsResults = [] as {src: string, validAt: Date, hoursSpan: number}[]
                        for (let btnIndex = 0; btnIndex <= 2; btnIndex++) {
                            const btn = await graphFooter?.waitForSelector(
                                `div.selector-group >>>> div.frame-selector.selector.btn:nth-child(${btnIndex + 1})`
                            )

                            const dateText = (await btn?.$eval(
                                'div',
                                div => div.textContent
                            ) || "00 0000").slice(-7)

                            if (btnIndex > 0 && btn) {
                                await btn.click()
                                await new Promise(r => setTimeout(r, 100));
                            }

                            const imgContainer = await graphContent?.waitForSelector(
                                'div.reactEasyCrop_Container'
                            )
                            const src = await imgContainer?.$eval(
                                'img',
                                (img) => img?.src
                            ) || ""
                                    
                            graphsResults.push({
                                src,
                                validAt: extractGFADateTime(dateText),
                                hoursSpan: Math.max(6, btnIndex * 6)
                            })
                        }

                        graphs.push({
                            aerodromes,
                            type: titleSections[1].trim(),
                            region: titleSections[2].trim(),
                            graphs: graphsResults
                        } as GFAReturnType)
                    }
                }
            }
        }

        // Reset and return 
        await this._resetSearch();
        return {
            date: datePerformed,
            gfas: graphs
        }
    }

    async getNOTAMs(aerodromeCodes: string): Promise<AerodromeNOTAMs> {
        // Perform search
        await this._setAerodromeSearch({aerodromeCodes, reports: new Set(['NOTAM'])});
        await this._search();

        // Get date performed
        const datePerformed = await this._getDatePerformed()

        // Get result table rows
        const tableBody = await this._page?.waitForSelector(
            'div.search-results >>>> table.table.table-striped >>>> tbody'
        );
        const tableRows = await tableBody?.$$('tr:not(.hidden)');

        // Map table rows to report-result objects
        const reports = [] as NotamReportReturnType[]
        if (tableRows) {
            for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
                if (rowIndex > 0) {
                    const row = tableRows[rowIndex]
                    const tableCells = await row.$$('td');
                    if (tableCells.length === 2) {
                        // Metadata: report type, aerodrome code
                        const metadata = await tableCells[0].$('div');
                        const aerodromes = ((await metadata?.$$eval(
                            'div.location-description', 
                            divs => (divs.map(div => div.textContent))
                        ))?.filter((a) => a !== null) || []) as string[]
                        
                        // Bulletin: report data, suplements link,  date-times
                        const bulletin = await tableCells[1].$('div');
                        const data = await bulletin?.$eval('pre', pre => (pre.textContent));
                        const suplementsLink = await bulletin?.$('a')
                        const dateSpan = await bulletin?.$$eval(
                            'div.datapanel-footer >>>> span',
                            (spans) => {
                                const dates = {
                                    from: "",
                                    to: ""
                                };
                                spans.forEach(span => {
                                    if (span.className === "start-validity")
                                        dates.from = span.textContent || "";
                                    else if (span.className === "end-validity")
                                        dates.to = span.textContent || "";
                                });
                                return dates;
                            }
                        );
                        if (data && dateSpan) {
                            reports.push({
                                aerodromes,
                                data: data, 
                                dateFrom: utcDateTime(dateSpan.from),
                                dateTo: utcDateTime(dateSpan.to),
                                isSup: !!suplementsLink
                            } as NotamReportReturnType)
                        }
                    }
                }
            }
        }

        await this._resetSearch();
        return {
            date: datePerformed,
            reports
        }



    }

    async _search() {await this._page?.click('div.btn.btn-primary.search-button')}


    async _setAerodromeSearch(request: ReportsRequestType) {
        await this._addAerodrome(request.aerodromeCodes)
        await this._addReports(request.reports)
    }

    async _setGFASearch(aerodromes: string) {
        await this._addAerodrome(aerodromes)
        await this._page?.click(`input[type="checkbox"][id="graphicalForecast-gfaCldwx-toggle"]`)
        await this._page?.click(`input[type="checkbox"][id="graphicalForecast-gfaTurbc-toggle"]`)
    }

    async _addAerodrome(aerodromes: string) {
        await this._page?.type('div.react-tags__search-input >>>> input', `${aerodromes} `)
    }

    async _addReports (reports: Set<ReportTypeOptions>) {
        const checkboxIds = {
            SIGMET: "sigmet-toggle",
            AIRMET: "airmet-toggle",
            METAR: "metar-toggle",
            TAF: "taf-toggle",
            PIREP: "pirep-toggle",
            NOTAM: "notam-toggle",
            "Upper Wind": "upperwind-toggle",
        }

        for (const report of reports) {
            await this._page?.click(`input[type="checkbox"][id="${checkboxIds[report]}"]`)
        }
    }

    async _resetSearch() {
        const checkboxIds = [
            "sigmet-toggle",
            "airmet-toggle",
            "notam-toggle",
            "metar-toggle",
            "taf-toggle",
            "pirep-toggle",
            "upperwind-toggle"
        ]
        await this._page?.waitForSelector('div.btn.btn-secondary.search-button')
        await this._page?.click('div.btn.btn-secondary.search-button')
        await this._page?.waitForSelector('div.product-inputs >>>> div.product-input:nth-child(3) >>>> select[title="Notam Language"]')
        await this._page?.select('div.product-inputs >>>> div.product-input:nth-child(3) >>>> select[title="Notam Language"]', "english")
        await this._page?.waitForSelector('div.product-inputs >>>> div.product-input:nth-child(4) >>>> select[title="Historical Hours"]')
        await this._page?.select('div.product-inputs >>>> div.product-input:nth-child(4) >>>> select[title="Historical Hours"]', "1")
        await this._page?.waitForSelector('div.product-inputs >>>> div.product-input:nth-child(7) >>>> select[title="Historical Hours"]')
        await this._page?.select('div.product-inputs >>>> div.product-input:nth-child(7) >>>> select[title="Historical Hours"]', "low")
        for (const checkboxId of checkboxIds) {
            await this._page?.click(`input[type="checkbox"][id="${checkboxId}"]`)
        }

    }

    async _getDatePerformed (): Promise<Date> {
        const datePerformedContainer = await this._page?.waitForSelector(
            'div.search-results >>>> div.row-fluid.search-query-info'
        );
        const datePerformedText = await datePerformedContainer?.$eval(
            'div.span6',
            (div) => div.textContent || ""
        );
        const datePerformed = extractSearchedPerformedDate(
            datePerformedText || ""
        ) || new Date((new Date()).toUTCString());  

        return datePerformed
    }

}

export default Scraper