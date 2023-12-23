import puppeteer from 'puppeteer'
import type {Browser, Page} from 'puppeteer'

class Scraper {
    _browser?: Browser;
    page?: Page;

    constructor() {}

    async init() {
        this._browser = await puppeteer.launch({headless: false})
        this.page = await this._browser.newPage()
        await this.page.goto('https://plan.navcanada.ca/wxrecall/')
    }

    async close() {await this._browser?.close()}

    async scrape(): Promise<string | undefined> {
        const content = await this.page?.content()
        return content
    }
}

export default Scraper