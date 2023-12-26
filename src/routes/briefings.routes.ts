import express from 'express';

import Scraper from '../scraper/scraper';


const router = express.Router()

// POST: Weather briefing
router.post('/weather', async (req, res) => {
    console.log('Weather biefings reached')
    return res.status(200).json({briefing: "Weather"})
})

// POST: NOTAM briefing
router.post('/notam', async (req, res) => {
    const scraper = new Scraper()
    await scraper.init()
    const content = await scraper.getNOTAMs('CYVR CZBB CYXX')
    await scraper.close()
    return res.status(200).json({report: content})
})

export default router