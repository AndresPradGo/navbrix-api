import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import validateRequest from '../middleware/validateRequest';
import { briefingRequestSchema } from '../schemas/briefing.schema'
import type { BriefingRequestInput } from '../schemas/briefing.schema'
import preprocessBriefingInput from '../utils/preprocessBriefingInput';


const router = express.Router()

// POST: Weather briefing
router.post(
    '/weather', 
    [validateRequest(briefingRequestSchema)],
    async (req: Request<{}, {}, BriefingRequestInput>, res: Response<{}>) => {
        const aerodromeCodes = preprocessBriefingInput(req.body)
        const scraper = new Scraper()
        await scraper.init()
        const reports = await scraper.getAerodromeReports({
            aerodromeCodes,
            reports: new Set(['METAR', 'TAF', 'Upper Wind', 'AIRMET', 'SIGMET', 'PIREP'])
        })
        const gfas = await scraper.getGFAs(aerodromeCodes)
        await scraper.close()
        return res.status(200).json({})
    }
)

// POST: NOTAM briefing
router.post(
    '/notam', 
    [validateRequest(briefingRequestSchema)],
    async (req: Request<{}, {}, BriefingRequestInput>, res: Response<{}>) => {
        const aerodromeCodes = preprocessBriefingInput(req.body)
        const scraper = new Scraper()
        await scraper.init()
        const notams = await scraper.getNOTAMs(aerodromeCodes)
        await scraper.close()
        return res.status(200).json({})
    }
)

export default router