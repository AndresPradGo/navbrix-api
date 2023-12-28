import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import validateRequest from '../middleware/validateRequest';
import { reportRequestSchema, reportResposeBodySchema } from '../schemas/report.schema'
import type { ReportRequestInput, ReportResponseBody } from '../schemas/report.schema'
import Processor from '../scraper/processor';

const router = express.Router()

router.post(
    '/',
    [validateRequest(reportRequestSchema)], 
    async (req: Request<{}, {}, ReportRequestInput>, res: Response<{}>) => {
        const scraperInput = Processor.preprocessReportsInput(req.body)
        const scraper = new Scraper()
        await scraper.init()
        const reports = await scraper.getAerodromeReports(scraperInput)
        await scraper.close()
        return res.status(200).json({reports})
    }
)

export default router