import type {TAFWindSummary, ChangeGroup, UpperwindPerAltitude} from './interpreter'

interface AerodromeWindInputData {
    aerodrome: string;
    dateTimeAt: Date;
    flightWithinForecast: boolean;
    nauticalMilesFromTarget: number;
    winds: TAFWindSummary;
}

interface METARInputData {
    aerodromeCode: string;
    nauticalMilesFromTarget: number;
    date: Date;
    temperature?: number;
    altimeter?: number;
}

interface UpperwindInput {
    aerodromeCode: string;
    nauticalMilesFromTarget: number;
    dateFrom: Date;
    dateTo: Date;
    flightWithinForecast: boolean;
    dataPerAltitude: UpperwindPerAltitude[];
}

interface TAFGroupWindData {
    dateFrom: Date;
    dateTo: Date;
    gustKnots?: number;
    knots: number;
    degreesTrue: number;
    degreesRange: number;
}

interface AerodromeWind {
    aerodrome: string;
    order: number;
    date: Date;
    dateFrom: Date;
    dateTo: Date;
    gustFactorKnots: number;
    knots: number;
    degreesTrue: number;
    degreesRange: number;
}

interface EnrouteMETAR {
    aerodromeCode: string;
    order: number;
    date: Date;
    altimeter: number;
}

interface AerodromeMETAR extends EnrouteMETAR{
    temperature: number;
}

interface UpperWindsAltitudeIndices {
    lowerIndex: number,
    actualIndex: number,
    upperIndex: number,
}

interface BaseWind {
    knots: number;
    degreesTrue: number;
}

interface UpperWind {
    aerodromeCode: string;
    dateFrom: Date;
    dateTo: Date;
    order: number;
    forecast: UpperwindPerAltitude[];
    wind?: BaseWind;
    temperature?: number;
}

// Cleaner has functions that "clean" the data from the interpreter, by slecting 
// and sorting the relevant data to write into the DB and resturn to the user.
class Cleaner {
    static aerodromeWinds(data: AerodromeWindInputData[]): AerodromeWind[] {
        const sortedData = data.sort((a,b) => {
            if (a.flightWithinForecast && !b.flightWithinForecast) return -1
            if (!a.flightWithinForecast && b.flightWithinForecast) return 1
            if (a.nauticalMilesFromTarget < b.nauticalMilesFromTarget) return -1
            if (a.nauticalMilesFromTarget > b.nauticalMilesFromTarget) return 1
            return 0
        })

        const selectedData = sortedData.map((item, idx) => {
            const selectedWindData = Cleaner._selectTafGroup(item.winds.groups, item.dateTimeAt, item.flightWithinForecast)
            return {
                aerodrome: item.aerodrome,
                order: idx + 1,
                date: item.winds.date,
                dateFrom: selectedWindData.dateFrom,
                dateTo: selectedWindData.dateTo,
                gustFactorKnots: selectedWindData.gustKnots ? selectedWindData.gustKnots - selectedWindData.knots : 0,
                knots: selectedWindData.knots,
                degreesTrue: selectedWindData.degreesTrue,
                degreesRange: selectedWindData.degreesRange,
            } as AerodromeWind
        }) 
        
        return selectedData
    }

    static aerodromeMETAR(data: METARInputData[]): AerodromeMETAR[] {
        return data.filter(metar => !!metar.temperature && !!metar.altimeter).sort((a,b) => {
            if (a.nauticalMilesFromTarget < b.nauticalMilesFromTarget) return -1
            if (a.nauticalMilesFromTarget > b.nauticalMilesFromTarget) return 1
            if (a.date > b.date) return -1
            return 0
        }).map((metar, idx) => ({...metar, order: idx + 1})) as AerodromeMETAR[]

    }

    static enrouteMETAR(data: METARInputData[]): EnrouteMETAR[] {
        return data.filter(metar => !!metar.altimeter).sort((a,b) => {
            if (a.nauticalMilesFromTarget < b.nauticalMilesFromTarget) return -1
            if (a.nauticalMilesFromTarget > b.nauticalMilesFromTarget) return 1
            if (a.date > b.date) return -1
            return 0
        }).map((metar, idx) => ({...metar, order: idx + 1})) as EnrouteMETAR[]

    }

    static enrouteUpperWinds(data: UpperwindInput[], altitude: number, dateTimeAt: Date): UpperWind[] {
        // Get list of aerodrome codes sorted by distance from taget
        const aerodromes = new Set(data.sort((a,b) => {
            if (a.nauticalMilesFromTarget < b.nauticalMilesFromTarget) return -1
            if (a.nauticalMilesFromTarget > b.nauticalMilesFromTarget) return 1
            return 0
        }).map(item => item.aerodromeCode))

        // Loop over data by aerodrome
        const upperwinds: UpperWind[] = []
        let order = 1
        for (const aerodrome of aerodromes) {
            const aerodromeData = data.filter(item => (
                item.aerodromeCode === aerodrome
            )).sort((a,b) => {
                if (a.dateFrom < b.dateFrom) return -1
                if (a.dateFrom > b.dateFrom) return 1
                return 0
            })

            const aerodromeDataAtFlightTime = aerodromeData.find(item => item.flightWithinForecast)
            let selectedAerodromeData: UpperwindInput
            if (aerodromeDataAtFlightTime !== undefined) {
                selectedAerodromeData = aerodromeDataAtFlightTime
            } else {
                if (dateTimeAt < aerodromeData[0].dateFrom) {
                    selectedAerodromeData = aerodromeData[0]
                } else selectedAerodromeData = aerodromeData[aerodromeData.length - 1]
            }


            const wind = Cleaner._getWindAtAltitude(selectedAerodromeData.dataPerAltitude, altitude)
            const temperature = Cleaner._getTemperatureAtAltitude(selectedAerodromeData.dataPerAltitude, altitude)
            upperwinds.push({
                aerodromeCode: selectedAerodromeData.aerodromeCode,
                dateFrom: selectedAerodromeData.dateFrom,
                dateTo: selectedAerodromeData.dateTo,
                order,
                forecast: selectedAerodromeData.dataPerAltitude || [],
                wind,
                temperature,
            } as UpperWind)

            order += 1
        }
        return upperwinds
    }

    private static _getWindAtAltitude(data: UpperwindPerAltitude[], altitude: number): BaseWind | undefined {
        const filteredData = data.filter(item => item.forecast && item.forecast.wind)
        if(filteredData.length <= 0) return undefined
        if(filteredData.length === 1) return {
            knots: filteredData[0].forecast?.wind?.knots || 0,
            degreesTrue: filteredData[0].forecast?.wind?.degreesTrue || 0
        }
        const indices = Cleaner._findUpperWindIndicesByAltitude(filteredData, altitude)

        if(indices.actualIndex >= 0) {
            const wind = filteredData[indices.actualIndex].forecast?.wind
            return {
                knots: wind?.knots || 1,
                degreesTrue: wind?.degreesTrue || 1
            }
        }
        if(indices.lowerIndex >= 0 && indices.upperIndex >= 0) {
            const lowerAltitude = filteredData[indices.lowerIndex].altitude
            const upperAltitude = filteredData[indices.upperIndex].altitude
            const lowerWind = filteredData[indices.lowerIndex].forecast?.wind
            const upperWind = filteredData[indices.upperIndex].forecast?.wind

            
            if(lowerWind && upperWind) {
                const knotsSlope = (upperWind.knots - lowerWind.knots) / (upperAltitude - lowerAltitude)
                const knotsIntercept = lowerWind.knots - knotsSlope * lowerAltitude
                const degreesSlope = (upperWind.degreesTrue - lowerWind.degreesTrue) / (upperAltitude - lowerAltitude)
                const degreesIntercept= lowerWind.degreesTrue - degreesSlope * lowerAltitude

                return {
                    knots:  knotsSlope * altitude + knotsIntercept,
                    degreesTrue: degreesSlope * altitude + degreesIntercept
                }
            }

            return undefined
        }
    }

    private static _getTemperatureAtAltitude(data: UpperwindPerAltitude[], altitude: number): number | undefined {
        const filteredData = data.filter(item => item.forecast && item.forecast.temperature)
        if(filteredData.length <= 0) return undefined
        if(filteredData.length === 1) return filteredData[0].forecast?.temperature || 0

        const indices = Cleaner._findUpperWindIndicesByAltitude(filteredData, altitude)

        if(indices.actualIndex >= 0) return filteredData[indices.actualIndex].forecast?.temperature

        if(indices.lowerIndex >= 0 && indices.upperIndex >= 0) {
            const lowerAltitude = filteredData[indices.lowerIndex].altitude
            const upperAltitude = filteredData[indices.upperIndex].altitude
            const lowerTemperature = filteredData[indices.lowerIndex].forecast?.temperature
            const upperTemperature = filteredData[indices.upperIndex].forecast?.temperature

            
            if(lowerTemperature && upperTemperature) {
                const slope = (upperTemperature - lowerTemperature) / (upperAltitude - lowerAltitude)
                const intercept = lowerTemperature - slope * lowerAltitude

                return slope * altitude + intercept
            }

            return undefined
        }
    }
    
    private static _findUpperWindIndicesByAltitude(data: UpperwindPerAltitude[], altitude: number): UpperWindsAltitudeIndices  {
        if (data.length < 2) return {lowerIndex: -1 , actualIndex: 0, upperIndex: -1}
        let lowerIndex = -1
        let actualIndex = -1
        let upperIndex = data.findIndex((item, idx) => {
            if (item.altitude < altitude) lowerIndex = idx
            if (item.altitude === altitude) actualIndex = idx
            return item.altitude > altitude
        })

        if(actualIndex >= 0 || (lowerIndex >= 0 && upperIndex >= 0))
            return {lowerIndex, actualIndex, upperIndex}  

        if (lowerIndex >= 0) return {lowerIndex: lowerIndex -1, actualIndex, upperIndex: lowerIndex}

        return {lowerIndex: upperIndex, actualIndex, upperIndex: upperIndex + 1}
    }

    private static _selectTafGroup(data: ChangeGroup[], dateTimeAt: Date, withinForecast: boolean): TAFGroupWindData {
        if (withinForecast) {
            let isPrevious = false
            const permanentGorupIdx = data.findIndex((group, idx) => {
                if (group.type === 'BECMG') {
                    if (group.dateFrom <= dateTimeAt &&  dateTimeAt < group.transitionDate) {
                        const prevWind = data[idx - 1].groups[0].wind
                        const currentWind = group.groups[0].wind
                        const prevWindMagnitude = prevWind.gustKnots ? prevWind.gustKnots : prevWind.knots
                        const currentWindMagnitude =currentWind.gustKnots ?currentWind.gustKnots :currentWind.knots
                        if (prevWindMagnitude > currentWindMagnitude) isPrevious = true
                        return true

                    }
                    return group.transitionDate <= dateTimeAt &&  dateTimeAt < group.dateTo 
                }
                return group.dateFrom <= dateTimeAt &&  dateTimeAt < group.dateTo
            })
            if (permanentGorupIdx >= 0) {
                if (isPrevious) {
                    const tempGroup = data[permanentGorupIdx - 1].groups[0]
                    const becmgGroup = data[permanentGorupIdx]
                    return {
                        dateFrom: tempGroup.dateFrom,
                        dateTo: becmgGroup.type === 'BECMG' ? becmgGroup.transitionDate : becmgGroup.groups[0].dateTo,
                        gustKnots: tempGroup.wind.gustKnots,
                        knots: tempGroup.wind.knots,
                        degreesTrue: tempGroup.wind.degreesTrue,
                        degreesRange: tempGroup.wind.degreesRange
                    }
                }
                const tempGroupIdx = data[permanentGorupIdx].groups.findIndex((group, idx) => (
                    group.type !== 'MAIN' ? group.dateFrom <= dateTimeAt &&  dateTimeAt <= group.dateTo : false
                ))
                let tempGroup = data[permanentGorupIdx].groups[0]
                if (tempGroupIdx >= 0) tempGroup = data[permanentGorupIdx].groups[tempGroupIdx]
                return {
                    dateFrom: tempGroup.dateFrom,
                    dateTo: tempGroup.dateTo,
                    gustKnots: tempGroup.wind.gustKnots,
                    knots: tempGroup.wind.knots,
                    degreesTrue: tempGroup.wind.degreesTrue,
                    degreesRange: tempGroup.wind.degreesRange
                }
            }
        }
        const flightIsBeforeForecast = dateTimeAt < data[0].dateFrom
        const lastPermanentGroup = data[data.length - 1]
        const lastTempGroup = lastPermanentGroup.groups[lastPermanentGroup.groups.length - 1]
        const tempGroup = flightIsBeforeForecast ? data[0].groups[0] : lastTempGroup
        return {
            dateFrom: tempGroup.dateFrom,
            dateTo: tempGroup.dateTo,
            gustKnots: tempGroup.wind.gustKnots,
            knots: tempGroup.wind.knots,
            degreesTrue: tempGroup.wind.degreesTrue,
            degreesRange: tempGroup.wind.degreesRange
        }

    }
}

export default Cleaner