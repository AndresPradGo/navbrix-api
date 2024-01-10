import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import validateRequest from '../middleware/validateRequest';
import { briefingRequestSchema } from '../schemas/briefing.schema'
import type { BriefingRequestInput } from '../schemas/briefing.schema'
import Processor from '../scraper/processor';
import isUtcDateFuture from '../utils/isUtcDateFuture';


const router = express.Router()

// POST: Weather briefing
router.post(
    '/weather', 
    [validateRequest(briefingRequestSchema)],
    async (req: Request<{}, {}, BriefingRequestInput>, res: Response<{}>) => {
        // Check flight is in the future
        if (
            !isUtcDateFuture(req.body.departure.dateTime) ||
            !isUtcDateFuture(req.body.arrival.dateTime) ||
            !isUtcDateFuture(req.body.alternates.dateTime) ||
            !!req.body.legs.find(leg => (!isUtcDateFuture(leg.dateTime))) 
        ) return res.status(400).json('Flight must be in the future.')
        
        // Scrape
        const aerodromeCodes = Processor.preprocessBriefingInput(req.body)
        const scraper = new Scraper(3)
        await scraper.init()
        const reports = await scraper.getAerodromeReports({
            aerodromeCodes,
            reports: new Set(['METAR', 'TAF', 'AIRMET', 'SIGMET', 'PIREP'])
        })
        const gfas = await scraper.getGFAs(aerodromeCodes)
        await scraper.close()

        // Process scraped data
        const aerodromeBriefings = Processor.postprocessAerodromeBriefingOutput(req.body, reports)
        const enrouteBriefings = Processor.postprocessEnrouteBriefingOutput(req.body, reports, gfas)


        // Return response
        return res.status(200).json({})
    }
)

// POST: NOTAM briefing
router.post(
    '/notam', 
    [validateRequest(briefingRequestSchema)],
    async (req: Request<{}, {}, BriefingRequestInput>, res: Response<{}>) => {
        // Check flight is in the future
        if (
            !isUtcDateFuture(req.body.departure.dateTime) ||
            !isUtcDateFuture(req.body.arrival.dateTime) ||
            !isUtcDateFuture(req.body.alternates.dateTime) ||
            !!req.body.legs.find(leg => (!isUtcDateFuture(leg.dateTime))) 
        ) return res.status(400).json('Flight must be in the future.')
        
        // Scrape
        const aerodromeCodes = Processor.preprocessBriefingInput(req.body)
        const scraper = new Scraper()
        await scraper.init()
        const notams = await scraper.getNOTAMs(aerodromeCodes)
        await scraper.close()
        
        // Process scraped data
        const processedNotams = Processor.postprocessNotams(req.body, notams)

        // Return response
        return res.status(200).json({})
    }
)

export default router