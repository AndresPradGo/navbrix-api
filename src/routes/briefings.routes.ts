import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import validateRequest from '../middleware/validateRequest';
import auth from '../middleware/auth'
import {getUserFlight, getOfficialAerodromes} from '../services/shared.services'
import { briefingRequestSchema } from '../schemas/briefing.schema'
import type { 
    BriefingRequestInput, 
    BriefingRequestParams, 
    WeatherBriefing, 
    NOTAMsBriefing 
} from '../schemas/briefing.schema'
import Processor from '../scraper/processor';
import isUtcDateFuture from '../utils/isUtcDateFuture';
import Interpreter from '../scraper/interpreter';
import Cleaner from '../scraper/cleaner';


// Reusable function to check aerodrome codes are valid
const aerodromesAreValid = async (
    req: Request<BriefingRequestParams, any, BriefingRequestInput>
) => {
    const aerodromesSet: Set<string> = new Set()
        if(req.body.departure.aerodrome)aerodromesSet.add(req.body.departure.aerodrome)
        if(req.body.arrival.aerodrome)aerodromesSet.add(req.body.arrival.aerodrome)
        req.body.alternates.aerodromes.forEach(a => aerodromesSet.add(a.code));
        req.body.legs.forEach(leg => {
            leg.aerodromes.forEach(a => aerodromesSet.add(a.code));
        });
        if(aerodromesSet.size > 0) {
            const aerodromesList = [...aerodromesSet]
            const aerodromesInDB = await getOfficialAerodromes(aerodromesList)
            return aerodromesInDB.length >= aerodromesList.length
        }
        return true
}

const router = express.Router()

// POST: Weather briefing
router.post(
    '/weather/:flightId', 
    [validateRequest(briefingRequestSchema), auth],
    async (
        req: Request<BriefingRequestParams, WeatherBriefing | string, BriefingRequestInput>, 
        res: Response<WeatherBriefing | string>
    ) => {
        // Check if user has permissions to update flight
        const flight = await getUserFlight(parseInt(req.params.flightId), req.query.userEmail as string)
        if(!flight) return res.status(400).json('You do not have permissions to update this flight.')

        // Check flight is in the future
        if (
            !isUtcDateFuture(req.body.departure.dateTime) ||
            !isUtcDateFuture(req.body.arrival.dateTime) ||
            !isUtcDateFuture(req.body.alternates.dateTime) ||
            !!req.body.legs.find(leg => (!isUtcDateFuture(leg.dateTime))) 
        ) return res.status(400).json('Flight must be in the future.')

        // Check all aerodrome codes are valid
        if (!(await aerodromesAreValid(req)))
                return res.status(400).json('All aerodrome codes need to be valid codes.')

        
        // Preprocess input and check that total number of aerodromes is within 48
        const {aerodromes: aerodromeCodes, numAerodromes} = Processor.preprocessBriefingInput(req.body)
        if (numAerodromes > 48)
            return res.status(400).json(`This request includes ${numAerodromes} aerodromes. A maximum number of 48 aerodromes is accepted per request.`)
         // Scrape
        const scraper = new Scraper(3)
        await scraper.init()
        const reports = await scraper.getAerodromeReports({
            aerodromeCodes,
            reports: new Set(['METAR', 'TAF', 'AIRMET', 'SIGMET', 'PIREP'])
        })
        const gfas = await scraper.getGFAs(aerodromeCodes)
        await scraper.close()

        // Process scraped data
        const aerodromeBriefings = Processor.postprocessScrapedAerodromeBriefing(req.body, reports)
        const enrouteBriefings = Processor.postprocessScrapedEnrouteBriefing(req.body, reports, gfas)

        // Return response
        return res.status(200).json({
            dateTime: aerodromeBriefings.dateTime,
            aerodromes: Cleaner.briefingAerodromes(aerodromeBriefings),
            regions: enrouteBriefings.briefings.map(region => ({
                ...region,
                pireps: Interpreter.readPIREPs(region.pireps),
                airmets: Interpreter.filterCanadianAIRMETs(region.airmets)
            }))
        })
    }
)

// POST: NOTAM briefing
router.post(
    '/notam/:flightId', 
    [validateRequest(briefingRequestSchema), auth],
    async (
        req: Request<BriefingRequestParams, NOTAMsBriefing | string, BriefingRequestInput>, 
        res: Response<NOTAMsBriefing | string>
    ) => {
        // Check flight is in the future
        if (
            !isUtcDateFuture(req.body.departure.dateTime) ||
            !isUtcDateFuture(req.body.arrival.dateTime) ||
            !isUtcDateFuture(req.body.alternates.dateTime) ||
            !!req.body.legs.find(leg => (!isUtcDateFuture(leg.dateTime))) 
        ) return res.status(400).json('Flight must be in the future.')

        // Check all aerodrome codes are valid
        if (!(await aerodromesAreValid(req)))
                return res.status(400).json('All aerodrome codes need to be valid codes.')
        
        // Preprocess input and check that total number of aerodromes is within 48
        const {aerodromes: aerodromeCodes, numAerodromes} = Processor.preprocessBriefingInput(req.body)
        if (numAerodromes > 48)
            return res.status(400).json(`This request includes ${numAerodromes} aerodromes. A maximum number of 48 aerodromes is accepted per request.`)
        
        // Scrape
        const scraper = new Scraper()
        await scraper.init()
        const notams = await scraper.getNOTAMs(aerodromeCodes)
        await scraper.close()
        
        // Process scraped data
        const processedNotams = Processor.postprocessScrapedNotams(req.body, notams)

        // Return response
        return res.status(200).json(processedNotams)
    }
)

export default router