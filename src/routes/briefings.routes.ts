import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import validateRequest from '../middleware/validateRequest';
import { briefingRequestSchema } from '../schemas/briefing.schema'
import type { BriefingRequestInput } from '../schemas/briefing.schema'


const router = express.Router()

// POST: Weather briefing
router.post(
    '/weather', 
    [validateRequest(briefingRequestSchema)],
    async (req: Request<{}, {}, BriefingRequestInput>, res: Response<{}>) => {
        const scraper = new Scraper()
        await scraper.init()
        const content = await scraper.getAerodromeReports({
            aerodromeCodes: 'CYVR CZBB CYXX CYYJ',
            reports: new Set(['METAR', 'TAF', 'Upper Wind', 'AIRMET', 'SIGMET', 'PIREP'])
        })
        await scraper.close()
    return res.status(200).json({briefing: content})
})

// POST: NOTAM briefing
router.post(
    '/notam', 
    [validateRequest(briefingRequestSchema)],
    async (req: Request<{}, {}, BriefingRequestInput>, res: Response<{}>) => {
    const scraper = new Scraper()
    await scraper.init()
    const content = await scraper.getNOTAMs('CYVR CZBB CYXX')
    await scraper.close()
    return res.status(200).json({report: content})
})

export default router