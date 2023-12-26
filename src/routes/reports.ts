import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import validateRequest from '../middleware/validateRequest';
import { reportRequestSchema, ReportRequestInput } from '../schemas/report.schema'

const router = express.Router()

router.post(
    '/',
    [validateRequest(reportRequestSchema)] , 
    async (req: Request<{}, {}, ReportRequestInput>, res: Response<{}>) => {
        const scraper = new Scraper()
        await scraper.init()
        const content = await scraper.getAerodromeReports({
            aerodromeCodes: 'CYVR CZBB CYXX CYYJ',
            reports: new Set(['METAR', 'TAF', 'Upper Wind', 'AIRMET', 'SIGMET', 'PIREP'])
        })
        await scraper.close()
        return res.status(200).json({report: content})
    }
)

export default router