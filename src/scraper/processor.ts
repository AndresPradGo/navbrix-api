import type { BriefingRequestInput } from '../schemas/briefing.schema'
import type { ReportRequestInput, BaseReportRequest } from '../schemas/report.schema'
import type { 
  ReportsRequestType, 
  ReportType, 
  AerodromesWeatherReports, 
  WeatherReportReturnType,
  GFARegion,
  GFAGraph,
  AerodromeGFAs,
  AerodromeNOTAMs
} from './scraper'
import utcDateTime from '../utils/utcDateTime';

interface BaseReportResult {
  aerodromeCode: string;
  nauticalMilesFromTarget: number
  data: string;
  dateFrom: Date;
  dateTo? : Date;
  flightWithinForecast: boolean;
}

interface BaseAerodromeBriefingResult {
  aerodromeCode: string;
  nauticalMilesFromTarget: number;
  taf?: {
    data: string;
    dateFrom: Date;
    dateTo : Date;
    flightWithinForecast: boolean;
  }
  metar: {
    data: string;
    date: Date;
  }[]
}

interface BaseEnrouteBriefingResult {
  aerodromes: {
    code: string;
    nauticalMilesFromTarget: number;
    isPartOfFlight: boolean;
    isAlternate: boolean;
  }[]
  dateFrom: Date;
  dateTo?: Date
  data: string;
  geometryWarning?: boolean;
}

interface AerodromeReportPostProcessData {
  dateTimeAt: Date;
  taf: BaseReportResult[]
  metar: BaseReportResult[]
}

interface EnrouteReportPostProcessData {
  dateTimeAt: Date;
  altitude: number;
  upperwind: BaseReportResult[]
  metar: BaseReportResult[]
}

interface WeatherReportPostProcessData {
  dateTime: Date
  takeoffWeather?: AerodromeReportPostProcessData
  enrouteWeather?: EnrouteReportPostProcessData[]
  landingWeather?: AerodromeReportPostProcessData
}

interface AerodromeBriefingPostProcessData {
  dateTime: Date;
  departure: {
    dateTimeAt: Date
    aerodrome: BaseAerodromeBriefingResult
  }
  legs: {
    dateTimeAt: Date;
    aerodromes: BaseAerodromeBriefingResult[]
  }[]
  arrival: {
    dateTimeAt: Date
    aerodrome: BaseAerodromeBriefingResult
  }
  alternates: BaseAerodromeBriefingResult[]
}

interface BaseEnrouteBriefingPostProcessData {
  region: GFARegion;
  dateFrom: Date;
  dateTo: Date;
  weatherGraphs: GFAGraph[];
  iceGraphs: GFAGraph[];
  airmets: BaseEnrouteBriefingResult[];
  sigmets: BaseEnrouteBriefingResult[];
  pireps: BaseEnrouteBriefingResult[]
}

interface EnrouteBriefingPostProcessData {
  dateTime: Date;
  briefings: BaseEnrouteBriefingPostProcessData[]
}

interface NotamReportReturnType {
  aerodromes: {
    code: string
    dateTimeAt: Date
    flightWithinNotam: boolean
  }[];
  data: string;
  dateFrom?: Date;
  dateTo? : Date;
}

interface NOTAMsPostProcessData {
  dateTime: Date;
  aipSuplementNotams: NotamReportReturnType[];
  notams: NotamReportReturnType[];
}

// Processor class has static methods to proces input and output data from the scraper
class Processor {

  static preprocessReportsInput (request: ReportRequestInput): ReportsRequestType {
    const aerodromesList = new Set<string>()
    const reports = new Set<ReportType>()
  
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
    request.alternates.aerodromes.forEach(a => aerodromesList.add(a.code));

    return Array.from(aerodromesList).join(" ")
  }

  static postprocessScrapedRreport (
    request: ReportRequestInput,
    scrapedData: AerodromesWeatherReports
  ): WeatherReportPostProcessData {

    const postprocessedData:WeatherReportPostProcessData  = {
      dateTime: scrapedData.date
    }

    const TAFs = scrapedData.reports.filter(item => item.type === 'TAF')
    const METARs = scrapedData.reports.filter(item => item.type === 'METAR')
    const upperWinds = scrapedData.reports.filter(item => item.type === 'Upper Wind')

    if (request.takeoffWeather !== undefined) {
      const takeoffData: AerodromeReportPostProcessData = {
        dateTimeAt: utcDateTime(request.takeoffWeather?.dateTime) || new Date(),
        taf: request.takeoffWeather.taf.map(tafRequest => (
          Processor._filterReports(tafRequest, TAFs, utcDateTime(request.takeoffWeather?.dateTime))
        )).filter(report => report !== undefined) as BaseReportResult[],
        metar: request.takeoffWeather.metar.map(metarRequest => (
          Processor._filterReports(metarRequest, METARs, utcDateTime(request.takeoffWeather?.dateTime))
        )).filter(report => report !== undefined) as BaseReportResult[],
      }
      postprocessedData.takeoffWeather = takeoffData
    }
    if (request.landingWeather !== undefined) {
      const landingData: AerodromeReportPostProcessData = {
        dateTimeAt: utcDateTime(request.landingWeather?.dateTime) || new Date(),
        taf: request.landingWeather.taf.map(tafRequest => (
          Processor._filterReports(tafRequest, TAFs, utcDateTime(request.landingWeather?.dateTime))
        )).filter(report => report !== undefined) as BaseReportResult[],
        metar: request.landingWeather.metar.map(metarRequest => (
          Processor._filterReports(metarRequest, METARs, utcDateTime(request.landingWeather?.dateTime))
        )).filter(report => report !== undefined) as BaseReportResult[],
      }
      postprocessedData.landingWeather = landingData
    }
    if (request.enrouteWeather) {
      const enrouteData: EnrouteReportPostProcessData[] = request.enrouteWeather.map(leg => ({
        dateTimeAt: utcDateTime(leg.dateTime) || new Date(),
        altitude: leg.altitude,
        upperwind: leg.upperwind.map(request => (
          Processor._filterReports(request, upperWinds, utcDateTime(leg.dateTime))
        )).filter(report => report !== undefined) as BaseReportResult[],
        metar: leg.metar.map(metarRequest => (
          Processor._filterReports(metarRequest, METARs, utcDateTime(leg.dateTime))
        )).filter(report => report !== undefined) as BaseReportResult[],
      }))
      postprocessedData.enrouteWeather = enrouteData
    }

    return postprocessedData
  }

  static postprocessScrapedAerodromeBriefing (
    request: BriefingRequestInput,
    scrapedData: AerodromesWeatherReports
  ): AerodromeBriefingPostProcessData {

    const TAFs = scrapedData.reports.filter(item => item.type === 'TAF')
    const METARs = scrapedData.reports.filter(item => item.type === 'METAR')

    

    const departureTaf = Processor._findReportByDate(
      TAFs.filter(taf => !!taf.aerodromes.find(a => a.includes(request.departure.aerodrome))),
      utcDateTime(request.departure.dateTime)
    )
    const arrivalTaf = Processor._findReportByDate(
      TAFs.filter(taf => !!taf.aerodromes.find(a => a.includes(request.arrival.aerodrome))),
      utcDateTime(request.arrival.dateTime)
    )
    
    const postprocessedData:AerodromeBriefingPostProcessData  = {
      dateTime: scrapedData.date,
      departure: {
        dateTimeAt: utcDateTime(request.departure?.dateTime) || new Date(),
        aerodrome: {
          aerodromeCode: request.departure.aerodrome,
          nauticalMilesFromTarget: 0,
          taf: departureTaf ? {
            data: departureTaf.report.data,
            dateFrom: departureTaf.report.dateFrom || new Date(),
            dateTo : departureTaf.report.dateTo || new Date(),
            flightWithinForecast: departureTaf.within,
          } : undefined,
          metar: METARs.filter(
            metar => metar.aerodromes.find(a => a.includes(request.departure.aerodrome))
          ).map(metar => ({data: metar.data, date: metar.dateFrom || new Date()})).sort(
            (a, b) => (b.date && a.date ? b.date.getTime() - a.date.getTime() : 0)
          )
        }
      },
      legs: request.legs.map(leg => ({
        dateTimeAt: utcDateTime(leg.dateTime) || new Date(),
        aerodromes: leg.aerodromes.map(aerodrome => {
          const aerodromeTaf = Processor._findReportByDate(
            TAFs.filter(taf => !!taf.aerodromes.find(tafAerodrome => tafAerodrome.includes(aerodrome.code))),
            utcDateTime(leg.dateTime)
          )
          return ({
              aerodromeCode: aerodrome.code,
              nauticalMilesFromTarget: aerodrome.nauticalMilesFromPath,
              taf: aerodromeTaf ? {
                data: aerodromeTaf.report.data,
                dateFrom: aerodromeTaf.report.dateFrom || new Date(),
                dateTo : aerodromeTaf.report.dateTo || new Date(),
                flightWithinForecast: aerodromeTaf.within,
              } : undefined,
              metar: METARs.filter(
                metar => metar.aerodromes.find(metarAerodrome => metarAerodrome.includes(aerodrome.code))
              ).map(metar => ({data: metar.data, date: metar.dateFrom || new Date()})).sort(
                (a, b) => (b.date && a.date ? b.date.getTime() - a.date.getTime() : 0)
              )
            } as BaseAerodromeBriefingResult)
        }) 
      })),
      arrival: {
        dateTimeAt: utcDateTime(request.arrival?.dateTime) || new Date(),
        aerodrome: {
          aerodromeCode: request.arrival.aerodrome,
          nauticalMilesFromTarget: 0,
          taf: arrivalTaf ? {
            data: arrivalTaf.report.data,
            dateFrom: arrivalTaf.report.dateFrom || new Date(),
            dateTo : arrivalTaf.report.dateTo || new Date(),
            flightWithinForecast: arrivalTaf.within,
          } : undefined,
          metar: METARs.filter(
            metar => metar.aerodromes.find(a => a.includes(request.arrival.aerodrome))
          ).map(metar => ({data: metar.data, date: metar.dateFrom || new Date()})).sort(
            (a, b) => (b.date && a.date ? b.date.getTime() - a.date.getTime() : 0)
          )
        }
      },
      alternates: request.alternates.aerodromes.map(aerodrome => {
        const aerodromeTaf = Processor._findReportByDate(
          TAFs.filter(taf => !!taf.aerodromes.find(tafAerodrome => tafAerodrome.includes(aerodrome.code))),
          utcDateTime(request.arrival.dateTime)
        )
        return ({
            aerodromeCode: aerodrome.code,
            nauticalMilesFromTarget: aerodrome.nauticalMilesFromPath,
            taf: aerodromeTaf ? {
              data: aerodromeTaf.report.data,
              dateFrom: aerodromeTaf.report.dateFrom || new Date(),
              dateTo : aerodromeTaf.report.dateTo || new Date(),
              flightWithinForecast: aerodromeTaf.within,
            } : undefined,
            metar: METARs.filter(
              metar => metar.aerodromes.find(metarAerodrome => metarAerodrome.includes(aerodrome.code))
            ).map(metar => ({data: metar.data, date: metar.dateFrom || new Date()})).sort(
              (a, b) => (b.date && a.date ? b.date.getTime() - a.date.getTime() : 0)
            )
          } as BaseAerodromeBriefingResult)
      }) 
    }

    return postprocessedData

  }

  static postprocessScrapedEnrouteBriefing (
    request: BriefingRequestInput,
    scrapedReports: AerodromesWeatherReports,
    scrapedGFAs: AerodromeGFAs
  ): EnrouteBriefingPostProcessData {
    const postprocessedData: BaseEnrouteBriefingPostProcessData[] = []
    const regions = new Set(scrapedGFAs.gfas.map(gfa => gfa.region))
    const eta = utcDateTime(request.arrival.dateTime) || new Date()
    const etaPlus2 = new Date(eta.getTime())
    etaPlus2.setHours(eta.getHours() + 2)
    const etd = utcDateTime(request.departure.dateTime) || new Date()
    const etdMinus2 = new Date(etd.getTime())
    etdMinus2.setHours(etd.getHours() - 2)
    const AIRMETs = scrapedReports.reports.filter(item => (
      item.type === 'AIRMET' &&
      !((item.dateFrom && etaPlus2 < item.dateFrom) || (item.dateTo && item.dateTo < etdMinus2))
    ))
    const SIGMETs = scrapedReports.reports.filter(item => (
      item.type === 'SIGMET' &&
      !((item.dateFrom && etaPlus2 < item.dateFrom) || (item.dateTo && item.dateTo < etdMinus2))
    ))
    const PIREPs = scrapedReports.reports.filter(item => (
      item.type === 'PIREP' &&
      !((item.dateFrom && etaPlus2 < item.dateFrom) || (item.dateTo && item.dateTo < etdMinus2))
    )) 
    const aerodromesData = [{
      code: request.departure.aerodrome,
      dateTimeAt: utcDateTime(request.departure.dateTime),
      isAlternate: false, 
      nauticalMilesFromPath: 0
    }]
    request.legs.forEach(leg => leg.aerodromes.forEach(aerodrome => {
      aerodromesData.push({
        code: aerodrome.code,
        dateTimeAt: utcDateTime(leg.dateTime),
        isAlternate: false,
        nauticalMilesFromPath: aerodrome.nauticalMilesFromPath
      })
    }));
    aerodromesData.concat(request.alternates.aerodromes.map(aerodrome => ({
      code: aerodrome.code,
      dateTimeAt: utcDateTime(request.alternates.dateTime),
      isAlternate: true,
      nauticalMilesFromPath: aerodrome.nauticalMilesFromPath
    })))
    aerodromesData.push({
      code: request.arrival.aerodrome,
      dateTimeAt: utcDateTime(request.arrival.dateTime),
      isAlternate: false, 
      nauticalMilesFromPath: 0
    })
    
    for (const region of regions) {
      let weatherGraphs: GFAGraph[] = []
      let iceGraphs: GFAGraph[] = []
      let aerodromes: string[] = []
      scrapedGFAs.gfas.forEach(item => {
        if (item.region === region) {
          aerodromes = item.aerodromes
          if (item.type === 'Clouds & Weather')
            weatherGraphs = item.graphs
          if (item.type === 'Icing, Turbulence & Freezing level')
            iceGraphs = item.graphs
        }
      });
      const airmets = AIRMETs.filter(
        item => item.aerodromes.some(value => aerodromes.find(a => value.includes(a))) 
      ).map(item => {
        const aerodromes = item.aerodromes.map(a => {
          const aerodrome = aerodromesData.find(aerodromeData => aerodromeData.code === a)
          return ({
            code: a,
            nauticalMilesFromTarget: aerodrome? aerodrome.nauticalMilesFromPath : 0,
            isAlternate: !!aerodrome?.isAlternate 
          }) || []
        })

        return ({
          aerodromes,
          data: item.data,
          dateFrom: item.dateFrom || new Date(),
          dateTo: item.dateTo,
          geometryWarning: item.geometryWarning
        } as BaseEnrouteBriefingResult)
      }) as BaseEnrouteBriefingResult[]
      const sigmets = SIGMETs.filter(
        item => item.aerodromes.some(value => aerodromes.find(a => value.includes(a))) 
      ).map(item => {
        const aerodromes = item.aerodromes.map(a => {
          const aerodrome = aerodromesData.find(aerodromeData => aerodromeData.code === a)
          return ({
            code: a,
            nauticalMilesFromTarget: aerodrome? aerodrome.nauticalMilesFromPath : 0,
            isAlternate: !!aerodrome?.isAlternate 
          }) || []
        })

        return ({
          aerodromes,
          data: item.data,
          dateFrom: item.dateFrom || new Date(),
          dateTo: item.dateTo,
          geometryWarning: item.geometryWarning
        } as BaseEnrouteBriefingResult)
      }) as BaseEnrouteBriefingResult[]
      const pireps = PIREPs.filter(
        item => item.aerodromes.some(value => aerodromes.find(a => value.includes(a))) 
      ).map(item => {
        const aerodromes = item.aerodromes.map(a => {
          const aerodrome = aerodromesData.find(aerodromeData => aerodromeData.code === a)
          return ({
            code: a,
            nauticalMilesFromTarget: aerodrome? aerodrome.nauticalMilesFromPath : 0,
            isAlternate: !!aerodrome?.isAlternate 
          }) || []
        })

        return ({
          aerodromes,
          data: item.data,
          dateFrom: item.dateFrom || new Date(),
          dateTo: item.dateTo,
          geometryWarning: item.geometryWarning
        } as BaseEnrouteBriefingResult)
      }) as BaseEnrouteBriefingResult[]

      const aerodromesInGFA = aerodromesData.filter(
        a => aerodromes.find(code => code === a.code)
      ) 
      
      const dateFrom = aerodromesInGFA.length > 0 
        ? aerodromesInGFA[0].dateTimeAt || utcDateTime(request.departure.dateTime) || new Date()
        : utcDateTime(request.departure.dateTime) || new Date()
      const dateTo = aerodromesInGFA.length > 1 
        ? aerodromesInGFA[aerodromesInGFA.length - 1].dateTimeAt || utcDateTime(request.arrival.dateTime) || new Date()
        : utcDateTime(request.arrival.dateTime) || new Date()

      postprocessedData.push({
        region,
        weatherGraphs,
        iceGraphs,
        airmets,
        sigmets,
        pireps,
        dateFrom,
        dateTo,
      })
    }

    return {dateTime: scrapedReports.date, briefings: postprocessedData}
  }


  static postprocessScrapedNotams (
    request: BriefingRequestInput,
    scrapedNotams: AerodromeNOTAMs,
  ): NOTAMsPostProcessData {
    const eta = utcDateTime(request.arrival.dateTime) || new Date()
    const etaPlus2 = new Date(eta.getTime())
    etaPlus2.setHours(eta.getHours() + 2)
    const etd = utcDateTime(request.departure.dateTime) || new Date()
    const etdMinus2 = new Date(etd.getTime())
    etdMinus2.setHours(etd.getHours() - 2)
    const notams = scrapedNotams.reports.filter(notam => (
      !notam.isSup &&
      !((notam.dateFrom && etaPlus2 < notam.dateFrom) || (notam.dateTo && notam.dateTo < etdMinus2))
    )).map(notam => {

      const aerodromes = notam.aerodromes.map(code => {

        const dateTimeAt = (code.includes(request.departure.aerodrome) ? utcDateTime(request.departure.dateTime) 
          : code.includes(request.arrival.aerodrome) ? utcDateTime(request.arrival.dateTime) 
          : !!request.alternates.aerodromes.find(a => code.includes(a.code)) ? utcDateTime(request.alternates.dateTime)
          : utcDateTime(request.legs.find(leg => !!leg.aerodromes.find(a => code.includes(a.code)))?.dateTime)) || new Date()
        
        const flightWithinNotam = !((notam.dateFrom && dateTimeAt < notam.dateFrom) || (notam.dateTo && notam.dateTo < dateTimeAt))

        return {
          code: code,
          dateTimeAt,
          flightWithinNotam
        }
      })

      return {
        aerodromes,
        data: notam.data,
        dateFrom: notam.dateFrom,
        dateTo: notam.dateTo,
      }
    }).sort((a, b) => a.aerodromes.length - b.aerodromes.length)
    const aipSuplementNotams = scrapedNotams.reports.filter(notam => (
      !notam.isSup &&
      !((notam.dateFrom && etaPlus2 < notam.dateFrom) || (notam.dateTo && notam.dateTo < etdMinus2))
    )).map(notam => {

      const aerodromes = notam.aerodromes.map(code => {

        const dateTimeAt = (code.includes(request.departure.aerodrome) ? utcDateTime(request.departure.dateTime) 
          : code.includes(request.arrival.aerodrome) ? utcDateTime(request.arrival.dateTime) 
          : !!request.alternates.aerodromes.find(a => code.includes(a.code)) ? utcDateTime(request.alternates.dateTime)
          : utcDateTime(request.legs.find(leg => !!leg.aerodromes.find(a => code.includes(a.code)))?.dateTime)) || new Date()
        
        const flightWithinNotam = !((notam.dateFrom && dateTimeAt < notam.dateFrom) || (notam.dateTo && notam.dateTo < dateTimeAt))

        return {
          code: code,
          dateTimeAt,
          flightWithinNotam
        }
      })

      return {
        aerodromes,
        data: notam.data,
        dateFrom: notam.dateFrom,
        dateTo: notam.dateTo,
      }
    }).sort((a, b) => a.aerodromes.length - b.aerodromes.length)
    
    const postProcessedNotams: NOTAMsPostProcessData = {
      dateTime: scrapedNotams.date,
      aipSuplementNotams,
      notams
    }

    return postProcessedNotams
  }


  private static _filterReports(
    reportRequest: BaseReportRequest, 
    reports: WeatherReportReturnType[], 
    date?: Date
  ): BaseReportResult | undefined {
    const report = Processor._findReportByDate(
      reports.filter(t => !!t.aerodromes.find(a => a.includes(reportRequest.aerodromeCode))), 
      date
    ) as {report: WeatherReportReturnType, within: boolean} | undefined

    if (report) {
      return {
        ...reportRequest,
        data: report.report.data,
        dateFrom: report.report.dateFrom,
        dateTo: report.report.dateTo,
        flightWithinForecast: report.within
      } as BaseReportResult
    }
    return undefined
  }

  private static _findReportByDate(
    reports: WeatherReportReturnType[], 
    date?: Date
  ): {report: WeatherReportReturnType, within: boolean} | undefined {
    const reportList = [...reports].sort(
      (a, b) => (
        b.dateTo && a.dateTo ? b.dateTo.getTime() - a.dateTo.getTime() 
          : b.dateFrom && a.dateFrom ? b.dateFrom.getTime() - a.dateFrom.getTime() 
          : 0
      )
    )
    
    const filteredReports: WeatherReportReturnType[] = reportList.filter((f) => {
      if (f.dateFrom && f.dateTo && date) return f.dateFrom <= date && date <= f.dateTo
      return false
    })

    return (
      filteredReports.length !== 0 
      ? {report: filteredReports[0], within: true} : reportList.length !== 0 
      ? {report: reportList[0], within: false} : undefined
    )
  }
}

export default Processor