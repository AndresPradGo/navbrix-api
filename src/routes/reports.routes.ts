import express from 'express';
import {ZodError} from 'zod'
import type { Request, Response } from 'express'

import Scraper from '../scraper/scraper';
import Processor from '../scraper/processor';
import Interpreter from '../scraper/interpreter'
import Cleaner from '../scraper/cleaner'
import validateRequest from '../middleware/validateRequest';
import auth from '../middleware/auth'
import {getUserFlight, getOfficialAerodromes} from '../services/shared.services'
import {
    updateAerodromeWeather, 
    updateEnrouteWeather, 
    getAerodromeWeatherUpdatedDates, 
    getEnrouteWeatherUpdatedDates
} from '../services/report.services'
import { reportRequestSchema, reportResposeBodySchema } from '../schemas/report.schema'
import isUtcDateFuture from '../utils/isUtcDateFuture';
import type { ReportRequestParams, ReportRequestInput, ReportResponseBody } from '../schemas/report.schema'
import type {DatabaseWeatherData} from '../services/report.services'

const router = express.Router()

router.post(
    '/:flightId',
    [validateRequest(reportRequestSchema), auth], 
    async (
        req: Request<ReportRequestParams, ReportResponseBody | string, ReportRequestInput>, 
        res: Response<ReportResponseBody | string>
    ) => {
        // Check if user has permissions to update flight
        const flight = await getUserFlight(parseInt(req.params.flightId), req.query.userEmail as string)
        if(!flight) return res.status(400).json('Valid flightId is required.')

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
                return res.status(400).json('Provide only valid aerodrome codes.')
        }

        // Scrape
        const scraperInput = Processor.preprocessReportsInput(req.body)
        if (scraperInput.numAerodromes > 48)
            return res.status(400).json(`This request includes ${scraperInput.numAerodromes} aerodromes. A maximum number of 48 aerodromes is accepted per request.`)
        
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

        interface AllDatabaseWeatherData {
            takeoffWeather?: DatabaseWeatherData,
            landingWeather?: DatabaseWeatherData,
            enrouteWeather?: DatabaseWeatherData[]
        }
        let databaseWeatherData: AllDatabaseWeatherData  = {}
        
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

            // Refresh database
            const newWeatherData = {
                date: scrapedData.date,
                windMagnitude: weatherData.takeoffWeather.wind_magnitude_knot,
                windDirection: weatherData.takeoffWeather.wind_direction,
                temperature: weatherData.takeoffWeather.temperature_c,
                altimeter:  weatherData.takeoffWeather.altimeter_inhg,
                tafs: takeoffWind.map(taf => ({
                    aerodromeCode: taf.aerodrome,
                    date: taf.date,
                    dateFrom:taf.dateFrom,
                    dateTo:taf.dateTo,
                    windDirection: taf.degreesTrue,
                    windDirectionRange: taf.degreesRange,
                    windMagnitude: taf.knots,
                    gustFactor: taf.gustFactorKnots,
                })),
                metars: takeoffMetarData.map(metar => ({
                    aerodromeCode: metar.aerodromeCode,
                    date: metar.date,
                    temperature: metar.temperature,
                    altimeter: metar.altimeter,
                })),
            }
            databaseWeatherData.takeoffWeather = await updateAerodromeWeather(flight.id, newWeatherData, true)
        }

        // Interprete and clean enroute processed data
        if (processedData.enrouteWeather) {
            const legsWeather = processedData.enrouteWeather.map(leg => ({
                upperwinds: Cleaner.enrouteUpperWinds(
                    leg.upperwind.map(item => ({
                        aerodromeCode: item.aerodromeCode,
                        nauticalMilesFromTarget: item.nauticalMilesFromTarget,
                        dateFrom: item.dateFrom,
                        dateTo: item.dateTo || new Date(),
                        flightWithinForecast: item.flightWithinForecast,
                        dataPerAltitude: Interpreter.readUpperWinds(item.data) || []
                    })), 
                    leg.altitude, 
                    leg.dateTimeAt
                ), 
                altimeters: Cleaner.enrouteMETAR(leg.metar.map(metar => ({
                    aerodromeCode: metar.aerodromeCode,
                    nauticalMilesFromTarget: metar.nauticalMilesFromTarget,
                    date: metar.dateFrom,
                    altimeter: Interpreter.extractAltimeterFromMETAR(metar.data)
                })))
            }))

            weatherData.enrouteWeather = legsWeather.map(leg => ({
                wind_magnitude_knot: leg.upperwinds.find(item => item.wind)?.wind?.knots || 0,
                wind_direction: leg.upperwinds.find(item => item.wind)?.wind?.degreesTrue || 0,
                temperature_c: leg.upperwinds.find(item => item.temperature)?.temperature || 0,
                altimeter_inhg: leg.altimeters[0].altimeter
            }))

            //Refresh database
            databaseWeatherData.enrouteWeather = await Promise.all(legsWeather.map(async (leg, idx) => {
                const newWeatherData = {
                    date: scrapedData.date,
                    windMagnitude: leg.upperwinds.find(item => item.wind)?.wind?.knots || 0,
                    windDirection: leg.upperwinds.find(item => item.wind)?.wind?.degreesTrue || 0,
                    temperature: leg.upperwinds.find(item => item.temperature)?.temperature || 0,
                    altimeter: leg.altimeters[0].altimeter,
                    upperwinds: leg.upperwinds.map(item => ({
                        aerodromeCode: item.aerodromeCode,
                        dateFrom: item.dateFrom,
                        dateTo: item.dateTo,
                        winds: item.forecast.map(fd => ({
                            altitude: fd.altitude,
                            windDirection: fd.forecast?.wind?.degreesTrue,
                            windMagnitude: fd.forecast?.wind?.knots,
                            temperature: fd.forecast?.temperature,
                        }))
                    })),
                    metars: leg.altimeters
                }
                return await updateEnrouteWeather(flight.id, idx + 1, newWeatherData)
            }));
        }

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

            // Refresh database
            const newWeatherData = {
                date: scrapedData.date,
                windMagnitude: weatherData.landingWeather.wind_magnitude_knot,
                windDirection: weatherData.landingWeather.wind_direction,
                temperature: weatherData.landingWeather.temperature_c,
                altimeter:  weatherData.landingWeather.altimeter_inhg,
                tafs: landingWind.map(taf => ({
                    aerodromeCode: taf.aerodrome,
                    date: taf.date,
                    dateFrom:taf.dateFrom,
                    dateTo:taf.dateTo,
                    windDirection: taf.degreesTrue,
                    windDirectionRange: taf.degreesRange,
                    windMagnitude: taf.knots,
                    gustFactor: taf.gustFactorKnots,
                })),
                metars: landingMetarData.map(metar => ({
                    aerodromeCode: metar.aerodromeCode,
                    date: metar.date,
                    temperature: metar.temperature,
                    altimeter: metar.altimeter,
                })),
            }
            databaseWeatherData.landingWeather = await updateAerodromeWeather(flight.id, newWeatherData, false)
        }

        // Get weather hours from ETD and check if all weather is official
        let weatherHoursFromETD = Math.round(Math.abs(flight.departure_time.getTime() - scrapedData.date.getTime()) / (1000 * 60 * 60))
        let allWeatherIsOfficial = true
        const weatherDates = []
        if(databaseWeatherData.takeoffWeather === undefined) {
            const departWeatherDates = await getAerodromeWeatherUpdatedDates(flight.id, true)
            weatherDates.push(departWeatherDates)
        }
        if(databaseWeatherData.enrouteWeather === undefined) {
            const enrouteWeatherDates = await getEnrouteWeatherUpdatedDates(flight.id)
            weatherDates.concat(enrouteWeatherDates)
        }
        if(databaseWeatherData.landingWeather === undefined) {
            const arrivalWeatherDates = await getAerodromeWeatherUpdatedDates(flight.id, false)
            weatherDates.push(arrivalWeatherDates)
        }
        for (const date of weatherDates) {
            const windNotOfficial = date.official === undefined || (date.wind || 1) > date.official
            const temperatureNotOfficial = date.official === undefined || (date.temperature || 1) > date.official
            const altimeterNotOfficial = date.official === undefined || (date.altimeter || 1) > date.official
            const anyNotOfficial = windNotOfficial || temperatureNotOfficial || altimeterNotOfficial
            const allNotOfficial = windNotOfficial && temperatureNotOfficial && altimeterNotOfficial
            allWeatherIsOfficial = allWeatherIsOfficial && !anyNotOfficial
            let thisHoursFromETD: number
            if (allNotOfficial) {
                thisHoursFromETD = Math.round(Math.abs(
                    flight.departure_time.getTime() - Math.min(...[date.wind, date.temperature, date.altimeter].map(d => d.getTime()))
                ) / (1000 * 60 * 60))
            } else {
                thisHoursFromETD = Math.round(Math.abs(
                    flight.departure_time.getTime() - (date.official?.getTime() || (new Date(0)).getTime())
                ) / (1000 * 60 * 60))
            }
            weatherHoursFromETD = Math.max(weatherHoursFromETD, thisHoursFromETD)
        }

        // Validate and return response
        let responseData: ReportResponseBody = {
            ...databaseWeatherData,
            allWeatherIsOfficial,
            weatherHoursFromETD
        }

        try {
            responseData = reportResposeBodySchema.parse(responseData)
        } catch (error) {
            if(error instanceof ZodError && error.errors.length > 0) {
                return res.status(422).json(error.errors[0].message)
            }
            return res.status(500).json("An unexpected server error occured, please try again later.")
        }

        return res.status(200).json(responseData)
    }
)

export default router