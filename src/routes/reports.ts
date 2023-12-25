import express from 'express';

import Scraper from '../scraper/scraper';

const router = express.Router()

router.post('/', async (req, res) => {
    const scraper = new Scraper()
    await scraper.init()
    const content = await scraper.getAerodromeReports({
        aerodromeCodes: 'CYVR CZBB CYXX CYYJ',
        reports: new Set(['METAR', 'TAF', 'Upper Wind', 'AIRMET', 'SIGMET', 'PIREP'])
    })
    await scraper.close()
    return res.status(200).json({report: content})
})

export default router