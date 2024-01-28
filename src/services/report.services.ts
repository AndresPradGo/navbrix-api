import { db } from '../utils/db.server'
import {getOfficialAerodromes} from './shared.services'


const findAerodromeWeather = async (id: number, isDeparture: boolean): Promise<{id: number} | null> => {
    const filter = isDeparture ? {departure_id: id} : {arrival_id: id}
    const weather = await db.aerodrome_weather_reports.findFirst({where: filter})
    return weather ? {id: weather.id} : null
}


const findLegWeather = async (legId: number): Promise<{id: number} | null> => {
    const weather = await db.enroute_weather_reports.findFirst({where: {id: legId}})
    return weather ? {id: weather.id,} : null
}

const getFlightUpdatedDate = async (flightId: number): Promise<Date> => {
    const flight = await db.flights.findUnique({where: {id: flightId}})
    return flight?.last_updated || new Date()
}

interface WeatherUpdatedDates {
    official?: Date,
    wind: Date,
    temperature: Date,
    altimeter: Date, 
}
export const getAerodromeWeatherUpdatedDates = async (flightId: number, isDeparture: boolean): Promise<WeatherUpdatedDates> => {
    const query = {where: {flight_id: flightId}, include: {aerodrome_weather_reports: true}}
    const departure = isDeparture ? await db.departures.findUnique(query) : await db.arrivals.findUnique(query)
    const flightDate = await getFlightUpdatedDate(flightId)
    return {
        official: departure?.aerodrome_weather_reports && flightDate <= departure?.aerodrome_weather_reports.date 
            ? departure?.aerodrome_weather_reports.date : undefined,
        wind: departure?.wind_last_updated && flightDate <=  departure.wind_last_updated 
            ? departure.wind_last_updated : new Date(0),
        temperature: departure?.temperature_last_updated && flightDate <=  departure.temperature_last_updated 
            ? departure.temperature_last_updated : new Date(0),
        altimeter: departure?.altimeter_last_updated && flightDate <=  departure.altimeter_last_updated
            ? departure.altimeter_last_updated : new Date(0),
    }
}

export const getEnrouteWeatherUpdatedDates = async (flightId: number): Promise<WeatherUpdatedDates[]> => {
    const legs = await db.legs.findMany({
        where: {flight_id: flightId},
        orderBy: {sequence: "asc"},
        include: {enroute_weather_reports: true}
    })
    const flightDate = await getFlightUpdatedDate(flightId)

    return legs.map(leg => ({
        official: leg?.enroute_weather_reports && flightDate <= leg?.enroute_weather_reports.date 
            ? leg?.enroute_weather_reports.date : undefined,
        wind: leg?.wind_last_updated && flightDate <=  leg.wind_last_updated 
            ? leg.wind_last_updated : new Date(0),
        temperature: leg?.temperature_last_updated && flightDate <=  leg.temperature_last_updated 
            ? leg.temperature_last_updated : new Date(0),
        altimeter: leg?.altimeter_last_updated && flightDate <=  leg.altimeter_last_updated
            ? leg.altimeter_last_updated : new Date(0),
    }))
}

interface BasicWeatherData {
    date: Date
    windMagnitude: number;
    windDirection?: number;
    temperature: number;
    altimeter: number;
}

interface TAFData {
    aerodromeCode: string;
    date: Date;
    dateFrom: Date;
    dateTo: Date;
    windDirection: number;
    windDirectionRange: number;
    windMagnitude: number;
    gustFactor: number;
}

interface METARData {
    aerodromeCode: string;
    date: Date;
    temperature?: number;
    altimeter: number;
}

interface AerodromeWeatherData extends BasicWeatherData {
    tafs: TAFData[]
    metars: METARData[]
}

export interface DatabaseWeatherData {
    wind_direction?: number;
    wind_magnitude_knot: number;
    temperature_c: number;
    altimeter_inhg: number;
    temperature_last_updated: Date | null;
    wind_last_updated: Date | null;
    altimeter_last_updated: Date | null;
}

export const updateAerodromeWeather = async (
    flightId: number, 
    data: AerodromeWeatherData, 
    isDeparture: boolean
): Promise<DatabaseWeatherData> => {
    // Update Departure/Arrival weather data
    const updateQuery = {
        where: {flight_id: flightId},
        data: {
            temperature_c: data.temperature,
            wind_direction: data.windDirection,
            wind_magnitude_knot: data.windMagnitude,
            altimeter_inhg: data.altimeter,
            last_updated: new Date((new Date()).toISOString())
        }
    }
    const departureArrival = isDeparture 
        ? await db.departures.update(updateQuery) 
        : await db.arrivals.update(updateQuery)

    // Update official aerodrome weather data
    let weatherId: number;
    const weather = await findAerodromeWeather(flightId, isDeparture)
    if (weather !== null) {
        weatherId = weather.id
        // Update if it already exists
        await db.aerodrome_weather_reports.update({
            where: {id: weather.id},
            data: {date: data.date, last_updated: new Date((new Date()).toISOString())}
        })
        // Delete existing TAFs and METARs
        await db.taf_forecasts.deleteMany({where: {aerodrome_weather_id: weather.id}})
        await db.metar_reports.deleteMany({where: {aerodrome_weather_id: weather.id}})
    } else {
        // Create if it doesn't exist
        const departureArrivalIdQuery = isDeparture ? {departure_id: flightId} : {arrival_id: flightId}
        const weather = await db.aerodrome_weather_reports.create({data:{
            ...departureArrivalIdQuery,
            date:data.date,
            created_at: new Date((new Date()).toISOString()),
            last_updated: new Date((new Date()).toISOString())
        }}) 
        weatherId = weather.id
    }
    // Add new TAFS and METARS
    for (const tafData of data.tafs) {
        const aerodrome = (await getOfficialAerodromes([tafData.aerodromeCode]))[0]
        await db.taf_forecasts.create({
            data: {
                date: tafData.date,
                date_from: tafData.dateFrom,
                date_to: tafData.dateTo,
                wind_direction: tafData.windDirection,
                wind_direction_range: tafData.windDirectionRange, 
                wind_magnitude_knot: tafData.windMagnitude,
                gust_factor_knot: tafData.gustFactor,
                aerodrome_id: aerodrome.id,
                aerodrome_weather_id: weatherId,
                created_at: new Date((new Date()).toISOString()),
                last_updated: new Date((new Date()).toISOString())
            }
        })
    }
    for (const metarData of data.metars) {
        const aerodrome = (await getOfficialAerodromes([metarData.aerodromeCode]))[0]
        await db.metar_reports.create({
            data: {
                date: metarData.date,
                temperature_c: metarData.temperature,
                altimeter_inhg: metarData.altimeter,
                aerodrome_id: aerodrome.id,
                aerodrome_weather_id: weatherId,
                created_at: new Date((new Date()).toISOString()),
                last_updated: new Date((new Date()).toISOString())
            }
        })
    }
    // Return
    return {
        ...departureArrival, 
        wind_direction: departureArrival.wind_direction ? departureArrival.wind_direction : undefined,
        altimeter_inhg: Number(departureArrival.altimeter_inhg)
    }
}

interface UpperwindData {
    aerodromeCode: string;
    dateFrom: Date;
    dateTo: Date;
    winds: {
        altitude: number;
        windDirection?: number;
        windMagnitude?: number;
        temperature?: number;
    }[];
}

interface EnrouteWeatherData extends BasicWeatherData {
    upperwinds: UpperwindData[]
    metars: METARData[]
}
export const updateEnrouteWeather = async (flightId: number, sequence: number, data: EnrouteWeatherData): Promise<DatabaseWeatherData> => {
    const leg = await db.legs.findFirst({where: {flight_id: flightId, sequence: sequence}})
    await db.legs.update({
        where: {id: leg?.id},
        data: {
            temperature_c: data.temperature,
            wind_direction: data.windDirection,
            wind_magnitude_knot: data.windMagnitude,
            altimeter_inhg: data.altimeter,
            last_updated: new Date((new Date()).toISOString())
        }
    })

     // Update official aerodrome weather data
     const weather = await findLegWeather(leg?.id || flightId)
     let weatherId: number
     if (weather !== null) {
        // Update if it already exists
        weatherId = weather.id
        await db.enroute_weather_reports.update({
            where: {id: weather.id},
            data: {date: data.date, last_updated: new Date((new Date()).toISOString())}
        })
        // Delete existing FDs and METARs
        await db.fd_forecasts.deleteMany({where: {enroute_weather_id: weather.id}})
        await db.metar_reports.deleteMany({where: {enroute_weather_id: weather.id}})

    }  else {
        // Create if it doesn't exist
        const weather = await db.enroute_weather_reports.create({data: {
            id: leg?.id || flightId, 
            date:data.date,
            created_at: new Date((new Date()).toISOString()),
            last_updated: new Date((new Date()).toISOString())
        }}) 
        weatherId = weather.id
    }
    // Add new TAFS and METARS
    for (const upperwindData of data.upperwinds) {
        const aerodrome = (await getOfficialAerodromes([upperwindData.aerodromeCode]))[0]
        const fd_forecast = await db.fd_forecasts.create({
            data: {
                date_from: upperwindData.dateFrom,
                date_to: upperwindData.dateTo,
                aerodrome_id: aerodrome.id,
                enroute_weather_id: weatherId,
                created_at: new Date((new Date()).toISOString()),
                last_updated: new Date((new Date()).toISOString())
            }
        })
        for (const wind of upperwindData.winds) {
            await db.fds_at_altitude.create({
                data: {
                    altitude_ft: wind.altitude, 
                    wind_direction: wind.windDirection, 
                    wind_magnitude_knot: wind.windMagnitude, 
                    temperature_c: wind.temperature, 
                    fd_forecasts_id: fd_forecast.id, 
                    created_at: new Date((new Date()).toISOString()),
                    last_updated: new Date((new Date()).toISOString())
                }
            })
        }
    }
    for (const metarData of data.metars) {
        const aerodrome = (await getOfficialAerodromes([metarData.aerodromeCode]))[0]
        await db.metar_reports.create({
            data: {
                date: metarData.date,
                altimeter_inhg: metarData.altimeter,
                aerodrome_id: aerodrome.id,
                enroute_weather_id: weatherId,
                created_at: new Date((new Date()).toISOString()),
                last_updated: new Date((new Date()).toISOString())
            }
        })
    }
    // Return
    const updatedLeg = (await db.legs.findMany({where:{flight_id: flightId, sequence: sequence}}))[0]
    return {
        ...updatedLeg, 
        wind_direction: updatedLeg?.wind_direction ? updatedLeg.wind_direction : undefined,
        altimeter_inhg: Number(updatedLeg?.altimeter_inhg)
    }
}
