import extractWxReportDateTime from '../utils/extractWxReportDateTime';

interface Wind {
    knots: number
    degreesTrue: number
    degreesRange: number
    gustKnots?: number
}

interface TemporaryGroup {
    dateFrom: Date;
    dateTo: Date;
    type: 'MAIN' | 'PROB30' | 'PROB40' | 'TEMPO';
    wind: Wind;
}

type ChangeGroup = ({
    dateFrom: Date;
    dateTo: Date;
    type: 'MAIN' | 'FM';
    groups: TemporaryGroup[]
} | {
    dateFrom: Date;
    transitionDate: Date;
    dateTo: Date;
    type: 'BECMG';
    groups: TemporaryGroup[]
})

interface TAFWindSummary {
    date: Date;
    groups: ChangeGroup[]
}

interface UpperwindPerAltitude {
    altitude: number;
    forecast?: {
        temperature?: number;
        wind?: {
            knots: number;
            degreesTrue: number;
        };
    }
}


class Interpreter {


    static extractWindFromTAF(data: string, aerodrome: string): TAFWindSummary {
        // Define Regulas expressions
        const permanentChangeGroupRegex = new RegExp(
            `([A-Z0-9\\s−/]+?)((${aerodrome}|FM|BECMG)(\\s\\d{6}Z\\s|\\s)?(\\d{4})(\\d{2}|\\/)(\\d{4})?|\sRMK\\s)`, 
            "g"
        );
        const temporaryChangeGroupRegex = /((TEMPO|PROB[34]0)\s(\d{4})\/(\d{4}))/g

        // organize wind data by change group
        const changeGroups: ChangeGroup[] = []
        let match: RegExpExecArray | null;
        let reportDate: Date = new Date()
        let endDate: Date = new Date()
        let i = 0
        let idxIncrement = 1
        while ((match = permanentChangeGroupRegex.exec(data)) !== null) {
            if(!/^\s*RMK\s*$/.test(match[2])) {
                const type = match[3] as 'FM' | 'MAIN' | 'BECMG'
                const dateFrom = extractWxReportDateTime(match[5] || "0100")
                const secondDate = extractWxReportDateTime(match[7] || "0100")
                if (type === aerodrome) endDate = secondDate
                if (type !== 'BECMG') {
                    changeGroups.push({
                        dateFrom,
                        dateTo: endDate,
                        type: type === aerodrome ? 'MAIN' : type,
                        groups: []
                    })   
                    
                } else {
                    changeGroups.push({
                        dateFrom,
                        transitionDate: secondDate,
                        dateTo: endDate,
                        type,
                        groups: []
                    })   
                }
                if (i > 0) changeGroups[i - 1].dateTo = changeGroups[i].dateFrom
            }
            if (i > 0) {
                const groupData = match[1].trim()
                let subMatch: RegExpExecArray | null
                changeGroups[i - 1].groups.push({
                    type: 'MAIN',
                    dateFrom: changeGroups[i - 1].dateFrom,
                    dateTo: changeGroups[i - 1].dateTo,
                    wind: {knots: 0,degreesTrue: 0,degreesRange: 0}
                })
                let j = 0
                let strIndex = 0
                while ((subMatch = temporaryChangeGroupRegex.exec(groupData)) !== null) {
                    changeGroups[i - 1].groups.push({
                        dateFrom: extractWxReportDateTime(subMatch[3] || "0100"),
                        dateTo: extractWxReportDateTime(subMatch[4] || "0100"),
                        type: subMatch[2] as 'PROB30' | 'PROB40' | 'TEMPO',
                        wind: {knots: 0,degreesTrue: 0,degreesRange: 0}
                    })
                    const wind  = Interpreter._extractWindFromTAF(
                        groupData.slice(strIndex,subMatch.index).trim()
                    )
                    if (wind) {
                        changeGroups[i - 1].groups[j].wind = wind
                        j += 1
                    } else changeGroups[i - 1].groups.splice(j, 1)

                    strIndex = subMatch.index + subMatch[1].length
                }
                const wind = Interpreter._extractWindFromTAF(
                    groupData.slice(strIndex, -1).trim()
                )              
                if (wind) changeGroups[i - 1].groups[j].wind = wind
                else changeGroups[i - 1].groups.splice(j, 1)

                if (changeGroups[i - 1].groups.length === 0) {
                    changeGroups.splice(i - 1, 1)
                    if (i - 1 > 0) changeGroups[i - 2].dateTo = endDate
                    idxIncrement = 0
                } else idxIncrement = 1

            } else reportDate = extractWxReportDateTime(match[4].trim().slice(0,6), true, true)
            i += idxIncrement
        }

        return {
            date: reportDate,
            groups: changeGroups
        }
    }

    static extractAltimeterFromMETAR(data: string): number | undefined {
        const regex = /\sA(\d{4})(\s|=)/g
        const match = regex.exec(data)
        if (match === null) return undefined
        const rawAltimeter = parseInt(match[1])
        if (Number.isNaN(rawAltimeter)) return undefined
        return rawAltimeter/100
    }

    static extractTemperatureFromMETAR(data: string): number | undefined {
        const regex = /\s(M)?(\d{2})\/M?\d{2}\s/g
        const match = regex.exec(data)
        if (match === null) return undefined
        const temperature = parseInt(match[2])
        const multiplier = match[1] === 'M' ? -1 : 1
        if (Number.isNaN(temperature)) return undefined
        return multiplier * temperature

    }

    static readUpperWinds(data: string): UpperwindPerAltitude[] | undefined {
        const regex = /^[A-Z0-9 ]+\n[A-Z ]+\n[A-Z0-9 ]+\n[A-Z0-9 ]+\n[A-Z0-9 -]+\n[3690 ]+\n([A-Za-z0-9 -]+)\n[1280 ]+\n([A-Za-z0-9 -]+)$/g
        const match = regex.exec(data)
        if(match) {
            const upperwindArray:UpperwindPerAltitude[]  = [
                {altitude: 3000}, {altitude: 6000}, {altitude: 9000}, {altitude: 12000}, {altitude: 18000}
            ]
            const row1Regex = /^([0-3]\d{2}\s{1,3}\d{1,3}|Calm|No Forecast)\s+((([0-3]\d{2}\s{1,3}\d{1,3}|Calm)\s{1,3}(-?\d{1,2}))|No Forecast)\s+((([0-3]\d{2}\s{1,3}\d{1,3}|Calm)\s{1,3}(-?\d{1,2}))|No Forecast)$/g
            const row1Match = row1Regex.exec(match[1].trim())
            if(row1Match){
               const rowMatchResults = [
                    {forecast: row1Match[1].trim(), wind: row1Match[1]?.trim(),temperature: undefined},
                    {forecast: row1Match[3].trim(), wind: row1Match[4]?.trim(),temperature: row1Match[5]?.trim()},
                    {forecast: row1Match[7].trim(), wind: row1Match[8]?.trim(),temperature: row1Match[9]?.trim()}
                ]
                rowMatchResults.forEach((item,idx) => {
                    if(item.forecast !== "No Forecast") {
                        if (item.wind && item.wind !== "Calm") {
                            const knots = parseInt(item.wind.slice(4).trim())
                            const degreesTrue = parseInt(item.wind.slice(0,3))
                            upperwindArray[idx].forecast = {
                                wind: Number.isNaN(knots) || Number.isNaN(degreesTrue) ? undefined : {
                                    knots,
                                    degreesTrue
                                }
                            }
                        }
                        const temperature = parseInt(item.temperature || "")
                        if (!Number.isNaN(temperature)) {
                            upperwindArray[idx].forecast = {
                                ...upperwindArray[idx].forecast,
                                temperature
                            }
                        }
                    }
                })
            }
            const row2Regex = /^((([0-3]\d{2}\s{1,3}\d{1,3}|Calm)\s{1,3}(-?\d{1,2}))|No Forecast)\s+((([0-3]\d{2}\s{1,3}\d{1,3}|Calm)\s{1,3}(-?\d{1,2}))|No Forecast)$/g
            const row2Match = row2Regex.exec(match[2].trim())
            if(row2Match){
                const rowMatchResults = [
                    {forecast: row2Match[2].trim(), wind: row2Match[3]?.trim(),temperature: row2Match[4]?.trim()},
                    {forecast: row2Match[6].trim(), wind: row2Match[7]?.trim(),temperature: row2Match[8]?.trim()}
                ]
                rowMatchResults.forEach((item,idx) => {
                    if(item.forecast !== "No Forecast") {
                        if (item.wind && item.wind !== "Calm") {
                            const knots = parseInt(item.wind.slice(4).trim())
                            const degreesTrue = parseInt(item.wind.slice(0,3))
                            upperwindArray[idx + 3].forecast = {
                                wind: Number.isNaN(knots) || Number.isNaN(degreesTrue) ? undefined : {
                                    knots,
                                    degreesTrue
                                }
                            }
                        }
                        const temperature = parseInt(item.temperature || "")
                        if (!Number.isNaN(temperature)) {
                            upperwindArray[idx + 3].forecast = {
                                ...upperwindArray[idx + 3].forecast,
                                temperature
                            }
                        }
                    }
                })
            }
            return upperwindArray
        }

        return undefined


    }

    private static _extractWindFromTAF(data: string): Wind | undefined {
        const windRegex = /([0-3]\d0|VRB)(\d{2})G?(\d{2})?KT/g
        const match = windRegex.exec(data)
        if (match !== null) {
            return {
                knots: parseInt(match[2]),
                degreesTrue: match[1] === "VRB" ? 0 : parseInt(match[1]), 
                degreesRange: match[1] === "VRB" ? 360 : 0,
                gustKnots: parseInt(match[3]),
            }
        }
        return undefined
    }
}

export default Interpreter