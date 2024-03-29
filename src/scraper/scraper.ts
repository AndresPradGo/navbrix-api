import puppeteer from 'puppeteer'
import type {PuppeteerLaunchOptions} from 'puppeteer'
import type {Browser, Page} from 'puppeteer'
import utcDateTime from '../utils/utcDateTime';
import extractSearchedPerformedDate from '../utils/extractSearchedPerformedDate';
import extractGFADateTime from '../utils/extractGFADateTime';


export type ReportType = 'METAR' | 'TAF' | 'Upper Wind' | 'SIGMET' | 'AIRMET' | 'PIREP' | 'NOTAM'

export type GFARegion = 'Pacific (GFACN31)'
    | 'Prairies (GFACN32)' 
    | 'Pacific (GFACN33)' 
    | 'Ontario & Quebec (GFACN34)'
    | 'Yukon & NWT (GFACN35)' 
    | 'Nunavut (GFACN36)' 
    | 'Arctic (GFACN37)'

type GFAType = 'Clouds & Weather' | 'Icing, Turbulence & Freezing level'
export interface ReportsRequestType {
    aerodromeCodes: string;
    reports: Set<ReportType>
}

export interface WeatherReportReturnType {
    aerodromes: string[];
    type: ReportType;
    data: string;
    geometryWarning?: boolean;
    dateFrom?: Date;
    dateTo? : Date
}

interface NotamReportReturnType {
    aerodromes: string[];
    data: string;
    dateFrom: Date;
    dateTo? : Date;
    isSup: boolean;
}

export interface AerodromesWeatherReports {
    date: Date;
    reports: WeatherReportReturnType[];
}

export interface AerodromeNOTAMs {
    date: Date;
    reports: NotamReportReturnType[];
}

export interface GFAGraph {
    src: string; 
    validAt: Date; 
    hoursSpan: number;
}

interface GFAReturnType {
    aerodromes: string[];
    type: GFAType;
    region: GFARegion;
    graphs: GFAGraph[];
}

export interface AerodromeGFAs {
    date: Date;
    gfas: GFAReturnType[];
}

// Scraper is in charge of scraping the Nav-Canada website and returning the raw data
class Scraper {
    private _browser?: Browser;
    private _page?: Page;
    private _METARHours: number;

    constructor(METARHours?: number) {
        this._METARHours = METARHours === undefined || METARHours < 0 ? 0 : Math.min(METARHours, 6) 
    }

    async init() {
        const options = {
            args: ['--enable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
            headless: "new" as "new", 
            handleSIGINT: false
        } as PuppeteerLaunchOptions
        if(process.env.NODE_ENV === 'production') 
            options["executablePath"] = "/usr/bin/google-chrome"
        this._browser = await puppeteer.launch(options)
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
                    let geometryWarning = false;
                    try {
                        await row.$eval(
                            'strong', 
                            item => {
                                if (item.textContent?.includes("This product may contain invalid or unknown geometry"))
                                    geometryWarning = true
                            })
                    } catch (_){}
                    const tableCells = await row.$$('td');
                    if (tableCells.length === 2) {
                        // Metadata: report type, aerodrome code
                        const metadata = await tableCells[0].$('div');
                        const reportType = await metadata?.$eval(
                            'div', 
                            div => (div.textContent as (ReportType | null | undefined))
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
                                geometryWarning,
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
                                await new Promise(r => setTimeout(r, 500));
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
                            region: titleSections[2].trim() as GFARegion,
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

    private async _search() {await this._page?.click('div.btn.btn-primary.search-button')}


    private async  _setAerodromeSearch(request: ReportsRequestType) {
        await this._addReports(request.reports)
        await this._addAerodrome(request.aerodromeCodes)
    }

    private async _setGFASearch(aerodromes: string) {
        await this._addAerodrome(aerodromes)
        await this._page?.click(`input[type="checkbox"][id="graphicalForecast-gfaCldwx-toggle"]`)
        await this._page?.click(`input[type="checkbox"][id="graphicalForecast-gfaTurbc-toggle"]`)
    }

    private async _addAerodrome(aerodromes: string) {
        await this._page?.type('div.react-tags__search-input >>>> input', `${aerodromes} `)
    }

    private async _addReports (reports: Set<ReportType>) {
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

    private async _resetSearch() {
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
        await this._page?.select(
            'div.product-inputs >>>> div.product-input:nth-child(4) >>>> select[title="Historical Hours"]', 
            this._METARHours === 0 ? "" : `${this._METARHours}`
        )
        await this._page?.waitForSelector('div.product-inputs >>>> div.product-input:nth-child(7) >>>> select[title="Historical Hours"]')
        await this._page?.select('div.product-inputs >>>> div.product-input:nth-child(7) >>>> select[title="Historical Hours"]', "low")
        for (const checkboxId of checkboxIds) {
            await this._page?.click(`input[type="checkbox"][id="${checkboxId}"]`)
        }

    }

    private async _getDatePerformed (): Promise<Date> {
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