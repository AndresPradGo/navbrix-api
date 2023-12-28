import type { ReportRequestInput } from '../schemas/report.schema'
import type { ReportsRequestType, ReportTypeOptions } from '../scraper/scraper'



const preprocessReportsInput = (request: ReportRequestInput): ReportsRequestType => {
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

export default preprocessReportsInput