import puppeteer from 'puppeteer'
import type {Browser, Page} from 'puppeteer'
import utcDateTime from '../utils/utcDateTime';
import extractSearchedPerformedDate from '../utils/extractSearchedPerformedDate';


type ReportTypeOptions = 'METAR' | 'TAF' | 'Upper Wind' | 'SIGMET' | 'AIRMET' | 'PIREP' | 'NOTAM'

interface RequestType {
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


class Scraper {
    _browser?: Browser;
    _page?: Page;

    constructor() {}

    async init() {
        this._browser = await puppeteer.launch({headless: false, handleSIGINT: false})
        this._page = await this._browser.newPage()
        await this._page.goto('https://plan.navcanada.ca/wxrecall/')
        await this._resetReports()
    }

    async close() {await this._browser?.close()}

    async getAerodromeReports(request: RequestType): Promise<AerodromesWeatherReports> {
        // Perform search
        await this._setAerodromeSearch(request);
        await this._search();

        // Get date performed
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

        // Get result table rows
        const tableBody = await this._page?.waitForSelector(
            'div.search-results >>>> table.table.table-striped >>>> tbody'
        );
        const tableRows = await tableBody?.$$('tr');

        const reports = (await Promise.all(tableRows?.map(async (row, idx) => {
            if (idx > 0) {
                const tableCells = await row.$$('td');
                if (tableCells.length === 2) {
                    // Metadata: report type, aerodrome code
                    const metadata = await tableCells[0].$('div');
                    const reportType = await metadata?.$eval('div', div => (div.textContent as (ReportTypeOptions | null | undefined)));
                    const aerodromes = await metadata?.$$eval(
                        'div.location-description', 
                        divs => (divs.map(div => div.textContent))
                    )
                    
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
                        return {
                            aerodromes,
                            type: reportType,
                            data: data, 
                            dateFrom: utcDateTime(dateSpan.from),
                            dateTo: utcDateTime(dateSpan.to)
                        } as WeatherReportReturnType
                    } else return null
                }
                return null
            }
            return null
        }) as Promise<WeatherReportReturnType | null>[])).filter(r => r !== null) as WeatherReportReturnType[]

        await this._resetSearch();
        return {
            date: datePerformed,
            reports
        }
    }


    async getNOTAMs(aerodromeCodes: string): Promise<AerodromeNOTAMs> {
        // Perform search
        await this._setAerodromeSearch({aerodromeCodes, reports: new Set(['NOTAM'])});
        await this._search();

        // Get date performed
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

        // Get result table rows
        const tableBody = await this._page?.waitForSelector(
            'div.search-results >>>> table.table.table-striped >>>> tbody'
        );
        const tableRows = await tableBody?.$$('tr');

        const reports = (await Promise.all(tableRows?.map(async (row, idx) => {
            if (idx > 0) {
                const tableCells = await row.$$('td');
                if (tableCells.length === 2) {
                    // Metadata: report type, aerodrome code
                    const metadata = await tableCells[0].$('div');
                    const aerodromes = await metadata?.$$eval(
                        'div.location-description', 
                        divs => (divs.map(div => div.textContent))
                    )
                    
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
                        return {
                            aerodromes,
                            data: data, 
                            dateFrom: utcDateTime(dateSpan.from),
                            dateTo: utcDateTime(dateSpan.to),
                            isSup: !!suplementsLink
                        } as NotamReportReturnType
                    } else return null
                }
                return null
            }
            return null
        }) as Promise<NotamReportReturnType | null>[])).filter(r => r !== null) as NotamReportReturnType[]

        await this._resetSearch();
        return {
            date: datePerformed,
            reports
        }



    }

    async _search() {await this._page?.click('div.btn.btn-primary.search-button')}


    async _setAerodromeSearch (request: RequestType) {
        await this._addAerodrome(request.aerodromeCodes)
        await this._addReports(request.reports)
    }

    async _addAerodrome (aerodrome: string) {
        await this._page?.type('div.react-tags__search-input >>>> input', `${aerodrome} `)
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
        await this._resetAerodromes
        await this._resetReports
    }

    async _resetReports() {
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

    async _resetAerodromes () {
        const inputSelector = 'div.react-tags__selected >>>> button.react-tags__selected-tag';
        const aerodromes = await this._page?.$$(inputSelector) || [];
        for (const aerodrome of aerodromes) {
            aerodrome.click()
        }
    }

}

export default Scraper