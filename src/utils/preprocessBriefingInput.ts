import type { BriefingRequestInput } from '../schemas/briefing.schema'


const preprocessBriefingInput = (request: BriefingRequestInput): string => {
    const aerodromesList = new Set<string>()
    aerodromesList.add(request.departure.aerodrome)
    aerodromesList.add(request.arrival.aerodrome)
    request.legs.forEach(item => {
        item.aerodromes.forEach(a => aerodromesList.add(a.code));
    });
    request.diversionOptions.forEach(item => {
        item.aerodromes.forEach(a => aerodromesList.add(a.code));
    });

    return Array.from(aerodromesList).join(" ")
}

export default preprocessBriefingInput