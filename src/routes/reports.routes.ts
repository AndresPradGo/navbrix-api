import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import Processor from '../scraper/processor';
import Interpreter from '../scraper/interpreter'
import validateRequest from '../middleware/validateRequest';
import { reportRequestSchema, reportResposeBodySchema } from '../schemas/report.schema'
import type { ReportRequestParams, ReportRequestInput, ReportResponseBody } from '../schemas/report.schema'
import isUtcDateFuture from '../utils/isUtcDateFuture';

const router = express.Router()

router.post(
    '/:flightId',
    [validateRequest(reportRequestSchema)], 
    async (req: Request<ReportRequestParams, {}, ReportRequestInput>, res: Response<{}>) => {
        // Check flight is in the future
        if (
            req.body.takeoffWeather && !isUtcDateFuture(req.body.takeoffWeather.dateTime) ||
            req.body.landingWeather && !isUtcDateFuture(req.body.landingWeather.dateTime) ||
            req.body.enrouteWeather && !!req.body.enrouteWeather.find(leg => (
                !isUtcDateFuture(leg.dateTime)
            )) 
        ) return res.status(400).json('Flight must be in the future.')
        
        // Scrape
        const scraperInput = Processor.preprocessReportsInput(req.body)
        const scraper = new Scraper()
        await scraper.init()
        const scrapedData = await scraper.getAerodromeReports(scraperInput)
        await scraper.close()

        // Process scraped data
        const processedData = Processor.postprocessorRreportOutput(req.body, scrapedData)
        
        const landingWinds = processedData.landingWeather?.taf.map(taf => {
            return {
                processed: taf,
                interpreted: Interpreter.extractWindFromTAF(
                    taf.data,
                    taf.aerodromeCode
                )
            }
        })

        const takeoffWinds = processedData.takeoffWeather?.taf.map(taf => {
            return {
                processed: taf,
                interpreted: Interpreter.extractWindFromTAF(
                    taf.data,
                    taf.aerodromeCode
                )
            }
        })

        // Return response
        return res.status(200).json({landingWinds})
    }
)

export default router