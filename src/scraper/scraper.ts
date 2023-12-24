import puppeteer from 'puppeteer'
import type {Browser, Page} from 'puppeteer'

interface AerodromeWeatherRequest {
    aerodromeCode: string;
    reports: Set<'METAR' | 'TAF' | 'FDs' | 'GFA_Weather' | 'GFA_Ice' | 'SIGMET' | 'AIRMET' | 'PIREP'>
}

class Scraper {
    _browser?: Browser;
    _page?: Page;

    constructor() {}

    async init() {
        this._browser = await puppeteer.launch({headless: false})
        this._page = await this._browser.newPage()
        await this._page.goto('https://plan.navcanada.ca/wxrecall/')
        await this._resetReports()
    }

    async close() {await this._browser?.close()}

    async scrape(): Promise<string | undefined> {
        await this._addAerodrome('CYVR')
        setTimeout(async() => {
            await this._resetAerodromes()
          }, 2000);
        const content = await this._page?.content()
        return content
    }

    async _search() {await this._page?.click('div.btn.btn-primary.search-button')}

    async _setAerodromeSearch (request: AerodromeWeatherRequest) {
        await this._addAerodrome(request.aerodromeCode)
        await this._addReports(request.reports)
    }

    async _addAerodrome (aerodrome: string) {
        await this._page?.type('div.react-tags__search-input >>>> input', `${aerodrome} `)
    }

    async _addReports (reports: Set<'METAR' | 'TAF' | 'FDs' | 'GFA_Weather' | 'GFA_Ice' | 'SIGMET' | 'AIRMET' | 'PIREP'>) {
        const checkboxIds = {
            SIGMET: "sigmet-toggle",
            AIRMET: "airmet-toggle",
            METAR: "metar-toggle",
            TAF: "taf-toggle",
            PIREP: "pirep-toggle",
            FDs: "upperwind-toggle",
            GFA_Weather: "graphicalForecast-gfaCldwx-toggle",
            GFA_Ice: "graphicalForecast-gfaTurbc-toggle"
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