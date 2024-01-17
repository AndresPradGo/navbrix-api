import express from 'express';
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import Processor from '../scraper/processor';
import Interpreter from '../scraper/interpreter'
import Cleaner from '../scraper/cleaner'
import validateRequest from '../middleware/validateRequest';
import auth from '../middleware/auth'
import {getUserFlight, getOfficialAerodromes} from '../services/shared.services'
import { reportRequestSchema, reportResposeBodySchema } from '../schemas/report.schema'
import type { ReportRequestParams, ReportRequestInput, ReportResponseBody } from '../schemas/report.schema'
import isUtcDateFuture from '../utils/isUtcDateFuture';

const router = express.Router()

router.post(
    '/:flightId',
    [validateRequest(reportRequestSchema), auth], 
    async (req: Request<ReportRequestParams, {}, ReportRequestInput>, res: Response<ReportResponseBody | string>) => {
        // Check if user has permissions to update flight
        const flight = await getUserFlight(parseInt(req.params.flightId), req.query.userEmail as string)
        if(!flight) return res.status(400).json('You do not have permissions to update this flight.')

        // Check flight is in the future
        if (
            req.body.takeoffWeather && !isUtcDateFuture(req.body.takeoffWeather.dateTime) ||
            req.body.landingWeather && !isUtcDateFuture(req.body.landingWeather.dateTime) ||
            req.body.enrouteWeather && !!req.body.enrouteWeather.find(leg => (
                !isUtcDateFuture(leg.dateTime)
            )) 
        ) return res.status(400).json('Flight must be in the future.')

        // Check all aerodrome codes are valid
        const aerodromesSet: Set<string> = new Set()
        if(req.body.takeoffWeather) {
            req.body.takeoffWeather.taf.forEach(taf => aerodromesSet.add(taf.aerodromeCode))
            req.body.takeoffWeather.metar.forEach(metar => aerodromesSet.add(metar.aerodromeCode))
        }
        if(req.body.landingWeather) {
            req.body.landingWeather.taf.forEach(taf => aerodromesSet.add(taf.aerodromeCode))
            req.body.landingWeather.metar.forEach(metar => aerodromesSet.add(metar.aerodromeCode))
        }
        if(req.body.enrouteWeather) {
            req.body.enrouteWeather.forEach(leg => {
                leg.metar.forEach(metar => aerodromesSet.add(metar.aerodromeCode));
                leg.upperwind.forEach(fd => aerodromesSet.add(fd.aerodromeCode));
            });
        }
        if(aerodromesSet.size > 0) {
            const aerodromesList = [...aerodromesSet]
            const aerodromesInDB = await getOfficialAerodromes(aerodromesList)
            if (aerodromesInDB.length < aerodromesList.length )
                return res.status(400).json('All aerodrome codes need to be valid codes.')
        }

        // Scrape
        const scraperInput = Processor.preprocessReportsInput(req.body)
        const scraper = new Scraper()
        await scraper.init()
        const scrapedData = await scraper.getAerodromeReports(scraperInput)
        await scraper.close()

        // Process scraped data and define return object
        const processedData = Processor.postprocessScrapedRreport(req.body, scrapedData)

        const weatherData: ReportResponseBody = {
            takeoffWeather: undefined,
            enrouteWeather: undefined,
            landingWeather: undefined,
            allWeatherIsOfficial: false,
            weatherHoursFromETD: 0
        }
        
        // Interprete and clean takeoff processed data
        if (processedData.takeoffWeather) {
            const processedTakeoffWinds = processedData.takeoffWeather.taf.map(taf => ({
                    aerodrome: taf.aerodromeCode,
                    dateTimeAt: processedData.takeoffWeather?.dateTimeAt || new Date(),
                    flightWithinForecast: taf.flightWithinForecast,
                    nauticalMilesFromTarget: taf.nauticalMilesFromTarget,
                    data: taf.data,
                    winds: Interpreter.extractWindFromTAF(
                        taf.data,
                        taf.aerodromeCode
                    )
            }))
            const takeoffWind = Cleaner.aerodromeWinds(processedTakeoffWinds)
            const takeoffMetarData = Cleaner.aerodromeMETAR(processedData.takeoffWeather.metar.map(metar => ({
                    aerodromeCode: metar.aerodromeCode,
                    nauticalMilesFromTarget: metar.nauticalMilesFromTarget,
                    date: metar.dateFrom,
                    temperature: Interpreter.extractTemperatureFromMETAR(metar.data),
                    altimeter: Interpreter.extractAltimeterFromMETAR(metar.data)
            })))

            weatherData.takeoffWeather = {
                wind_magnitude_knot: takeoffWind[0].knots + takeoffWind[0].gustFactorKnots,
                temperature_c: takeoffMetarData[0].temperature,
                altimeter_inhg: takeoffMetarData[0].altimeter,
                wind_direction: takeoffWind[0].knots === 0 && takeoffWind[0].gustFactorKnots === 0 
                    ? undefined : takeoffWind[0].degreesRange !== 0 
                    ? 0 
                    : takeoffWind[0].degreesTrue === 0 
                    ? 360 
                    : takeoffWind[0].degreesTrue
            }
        }

        // Interprete enroute processed data
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

        // Interprete and clean landing processed data
        if (processedData.landingWeather) {
            const processedLandingWinds = processedData.landingWeather.taf.map(taf => ({
                    aerodrome: taf.aerodromeCode,
                    dateTimeAt: processedData.landingWeather?.dateTimeAt || new Date(),
                    flightWithinForecast: taf.flightWithinForecast,
                    nauticalMilesFromTarget: taf.nauticalMilesFromTarget,
                    data: taf.data,
                    winds: Interpreter.extractWindFromTAF(
                        taf.data,
                        taf.aerodromeCode
                    )
            }))
            const landingWind = Cleaner.aerodromeWinds(processedLandingWinds)
            const landingMetarData = Cleaner.aerodromeMETAR(processedData.landingWeather.metar.map(metar => ({
                    aerodromeCode: metar.aerodromeCode,
                    nauticalMilesFromTarget: metar.nauticalMilesFromTarget,
                    date: metar.dateFrom,
                    temperature: Interpreter.extractTemperatureFromMETAR(metar.data),
                    altimeter: Interpreter.extractAltimeterFromMETAR(metar.data)
            })))

            weatherData.landingWeather = {
                wind_magnitude_knot: landingWind[0].knots + landingWind[0].gustFactorKnots,
                temperature_c: landingMetarData[0].temperature,
                altimeter_inhg: landingMetarData[0].altimeter,
                wind_direction: landingWind[0].knots === 0 && landingWind[0].gustFactorKnots === 0 
                    ? undefined : landingWind[0].degreesRange !== 0 
                    ? 0 
                    : landingWind[0].degreesTrue === 0 
                    ? 360 
                    : landingWind[0].degreesTrue
            }
        }

        // Return response
        return res.status(200).json(weatherData)
    }
)

export default router