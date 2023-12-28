import type { BriefingRequestInput } from '../schemas/briefing.schema'
import type { ReportRequestInput } from '../schemas/report.schema'
import type { ReportsRequestType, ReportTypeOptions } from './scraper'


// Processor class has static methods to proces input and output data from the scraper
class Processor {

  static preprocessReportsInput (request: ReportRequestInput): ReportsRequestType {
    const aerodromesList = new Set<string>()
    const reports = new Set<ReportTypeOptions>()
  
    if (request.takeoffWeather) {
      reports.add('TAF')
      reports.add('METAR')
      request.takeoffWeather.taf.forEach(item => aerodromesList.add(item.aerodromeCode))
      request.takeoffWeather.metar.forEach(item => aerodromesList.add(item.aerodromeCode))
    }
    if (request.enrouteWeather) {
      reports.add('TAF')
      reports.add('Upper Wind')
      request.enrouteWeather.forEach(leg => {
        leg.metar.forEach(item => aerodromesList.add(item.aerodromeCode))
        leg.upperwind.forEach(item => aerodromesList.add(item.aerodromeCode))
      })
    }
    if (request.landingWeather) {
      reports.add('TAF')
      reports.add('METAR')
      request.landingWeather.taf.forEach(item => aerodromesList.add(item.aerodromeCode))
      request.landingWeather.metar.forEach(item => aerodromesList.add(item.aerodromeCode))
    }
  
    const aerodromeCodes = Array.from(aerodromesList).join(" ")
  
    return {aerodromeCodes, reports}
  
    }

  static preprocessBriefingInput (request: BriefingRequestInput): string {
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
}

export default Processor