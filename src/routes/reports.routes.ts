import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import Processor from '../scraper/processor';
import Interpreter from '../scraper/interpreter'
import validateRequest from '../middleware/validateRequest';
import auth from '../middleware/auth'
import { reportRequestSchema, reportResposeBodySchema } from '../schemas/report.schema'
import type { ReportRequestParams, ReportRequestInput, ReportResponseBody } from '../schemas/report.schema'
import isUtcDateFuture from '../utils/isUtcDateFuture';
import { db } from '../utils/db.server'

const router = express.Router()

router.post(
    '/:flightId',
    [validateRequest(reportRequestSchema), auth], 
    async (req: Request<ReportRequestParams, {}, ReportRequestInput>, res: Response<{}>) => {
        // Check flight exists
        const flight = await db.flights.findUnique({
            where: {id: parseInt(req.params.flightId)}
        })
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

        // Process and interprete scraped data
        const processedData = Processor.postprocessScrapedRreport(req.body, scrapedData)
        
        const takeoffWinds = processedData.takeoffWeather?.taf.map(taf => ({
                aerodrome: taf.aerodromeCode,
                dateTimeAt: processedData.takeoffWeather?.dateTimeAt,
                flightWithinForecast: taf.flightWithinForecast,
                nauticalMilesFromTarget: taf.nauticalMilesFromTarget,
                winds: Interpreter.extractWindFromTAF(
                    taf.data,
                    taf.aerodromeCode
                )
        }))
        const takeoffMetarData = processedData.takeoffWeather?.metar.map(metar => ({
                aerodromeCode: metar.aerodromeCode,
                nauticalMilesFromTarget: metar.nauticalMilesFromTarget,
                date: metar.dateFrom,
                temperature: Interpreter.extractTemperatureFromMETAR(metar.data),
                altimeter: Interpreter.extractAltimeterFromMETAR(metar.data)
        }))
        const legsWeather = processedData.enrouteWeather?.map(leg => ({
            dateTimeAt: leg.dateTimeAt,
            altitude: leg.altitude,
            upperwind: leg.upperwind.map(item => ({
                aerodromeCode: item.aerodromeCode,
                nauticalMilesFromTarget: item.nauticalMilesFromTarget,
                dateFrom: item.dateFrom,
                dateTo: item.dateTo,
                dataPerAltitude: Interpreter.readUpperWinds(item.data),
                data: item.data
            })), 
            altimeters: leg.metar.map(metar => ({
                aerodromeCode: metar.aerodromeCode,
                nauticalMilesFromTarget: metar.nauticalMilesFromTarget,
                date: metar.dateFrom,
                altimeter: Interpreter.extractAltimeterFromMETAR(metar.data)
            }))
        }))
        const landingWinds = processedData.landingWeather?.taf.map(taf => ({
            aerodrome: taf.aerodromeCode,
            dateTimeAt: processedData.landingWeather?.dateTimeAt,
            flightWithinForecast: taf.flightWithinForecast,
            nauticalMilesFromTarget: taf.nauticalMilesFromTarget,
            winds: Interpreter.extractWindFromTAF(
                taf.data,
                taf.aerodromeCode
            )
        }))
        const landingMetarData = processedData.landingWeather?.metar.map(metar => ({
                aerodromeCode: metar.aerodromeCode,
                nauticalMilesFromTarget: metar.nauticalMilesFromTarget,
                date: metar.dateFrom,
                temperature: Interpreter.extractTemperatureFromMETAR(metar.data),
                altimeter: Interpreter.extractAltimeterFromMETAR(metar.data)
        }))

        // Return response
        return res.status(200).json({legsWeather})
    }
)

export default router