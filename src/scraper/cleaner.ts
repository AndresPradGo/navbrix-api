import type {TAFWindSummary, ChangeGroup} from './interpreter'

interface AerodromeWindInputData {
    aerodrome: string;
    dateTimeAt: Date;
    flightWithinForecast: boolean;
    nauticalMilesFromTarget: number;
    winds: TAFWindSummary;
}

interface AerodromeMETARInputData {
    aerodromeCode: string;
    nauticalMilesFromTarget: number;
    date: Date;
    temperature?: number;
    altimeter?: number;
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

interface AerodromeMETAR {
    aerodromeCode: string;
    order: number;
    date: Date;
    temperature: number;
    altimeter: number;
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

    static aerodromeMETAR(data: AerodromeMETARInputData[]): AerodromeMETAR[] {
        return data.filter(metar => !!metar.temperature && !!metar.altimeter).sort((a,b) => {
            if (a.nauticalMilesFromTarget < b.nauticalMilesFromTarget) return -1
            if (a.nauticalMilesFromTarget > b.nauticalMilesFromTarget) return 1
            if (a.date > b.date) return -1
            return 0
        }).map((metar, idx) => ({...metar, order: idx + 1})) as AerodromeMETAR[]

    }

    private static _selectTafGroup(data: ChangeGroup[], dateTimeAt: Date, withinForecast: boolean): TAFGroupWindData {
        if (withinForecast) {
            let isPrevious = false
            const permanentGorupIdx = data.findIndex((group, idx) => {
                if (group.type === 'BECMG') {
                    if (group.dateFrom <= dateTimeAt &&  dateTimeAt <= group.transitionDate) {
                        const prevWind = data[idx - 1].groups[0].wind
                        const currentWind = group.groups[0].wind
                        const prevWindMagnitude = prevWind.gustKnots ? prevWind.gustKnots : prevWind.knots
                        const currentWindMagnitude =currentWind.gustKnots ?currentWind.gustKnots :currentWind.knots
                        if (prevWindMagnitude > currentWindMagnitude) isPrevious = true
                        return true

                    }
                    return group.transitionDate <= dateTimeAt &&  dateTimeAt <= group.dateTo 
                }
                return group.dateFrom <= dateTimeAt &&  dateTimeAt <= group.dateTo
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