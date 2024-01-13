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


class Interpreter {


    static extractWindFromTAF(data: string, aerodrome: string): TAFWindSummary {
        // Define Regulas expressions
        const permanentChangeGroupRegex = new RegExp(
            `([A-Z0-9\\s−/]+?)((${aerodrome}|FM|BECMG)(\\s\\d{6}Z\\s|\\s)?(\\d{4})(\\d{2}|\\/)(\\d{4})?|\\bRMK\\b)`, 
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

    static extractAltimeterFromMETAR(data: string, aerodrome: string) {
        
    }

    static extractTemperatureFromMETAR(data: string, aerodrome: string) {

        
    }

    static readUpperWinds(data: string, aerodrome: string) {
        
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