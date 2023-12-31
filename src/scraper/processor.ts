import type { BriefingRequestInput } from '../schemas/briefing.schema'
import type { ReportRequestInput, BaseReportRequest } from '../schemas/report.schema'
import type { 
  ReportsRequestType, 
  ReportType, 
  AerodromesWeatherReports, 
  WeatherReportReturnType,
  GFARegion,
  GFAGraph,
  AerodromeGFAs
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
    isDiversionOption: boolean;
  }[]
  dateFrom: Date;
  dateTo?: Date
  data: string;
  geometryWarning?: boolean;
}

interface AerodromeReportPostProcessData {
  taf: BaseReportResult[]
  metar: BaseReportResult[]
}

interface EnrouteReportPostProcessData {
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
  departure: BaseAerodromeBriefingResult
  legs: {
    dateTime: Date;
    aerodromes: BaseAerodromeBriefingResult[]
  }[]
  arrival: BaseAerodromeBriefingResult
  diversionOptions: BaseAerodromeBriefingResult[]
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
    request.diversionOptions.aerodromes.forEach(a => aerodromesList.add(a.code));

    return Array.from(aerodromesList).join(" ")
  }

  static postprocessorRreportOutput (
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
        taf: request.takeoffWeather.taf.map(tafRequest => (
          Processor._filterReports(tafRequest, TAFs, utcDateTime(request.takeoffWeather?.dateTime))
        )),
        metar: request.takeoffWeather.metar.map(metarRequest => (
          Processor._filterReports(metarRequest, METARs, utcDateTime(request.takeoffWeather?.dateTime))
        )),
      }
      postprocessedData.takeoffWeather = takeoffData
    }
    if (request.landingWeather !== undefined) {
      const landingData: AerodromeReportPostProcessData = {
        taf: request.landingWeather.taf.map(tafRequest => (
          Processor._filterReports(tafRequest, TAFs, utcDateTime(request.landingWeather?.dateTime))
        )),
        metar: request.landingWeather.metar.map(metarRequest => (
          Processor._filterReports(metarRequest, METARs, utcDateTime(request.landingWeather?.dateTime))
        )),
      }
      postprocessedData.landingWeather = landingData
    }
    if (request.enrouteWeather) {
      const enrouteData: EnrouteReportPostProcessData[] = request.enrouteWeather.map(leg => ({
        upperwind: leg.upperwind.map(tafRequest => (
          Processor._filterReports(tafRequest, upperWinds, utcDateTime(leg.dateTime))
        )),
        metar: leg.metar.map(metarRequest => (
          Processor._filterReports(metarRequest, METARs, utcDateTime(leg.dateTime))
        )),
      }))
      postprocessedData.enrouteWeather = enrouteData
    }

    return postprocessedData
  }

  static postprocessAerodromeBriefingOutput (
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
      },
      legs: request.legs.map(leg => ({
        dateTime: utcDateTime(leg.dateTime) || new Date(),
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
      },
      diversionOptions: request.diversionOptions.aerodromes.map(aerodrome => {
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

  static postprocessEnrouteBriefingOutput (
    request: BriefingRequestInput,
    scrapedReports: AerodromesWeatherReports,
    scrapedGFAs: AerodromeGFAs
  ): EnrouteBriefingPostProcessData {
    const postprocessedData: BaseEnrouteBriefingPostProcessData[] = []
    const regions = new Set(scrapedGFAs.gfas.map(gfa => gfa.region))
    const AIRMETs = scrapedReports.reports.filter(item => item.type === 'AIRMET')
    const SIGMETs = scrapedReports.reports.filter(item => item.type === 'SIGMET')
    const PIREPs = scrapedReports.reports.filter(item => item.type === 'PIREP') 
    const aerodromesData = [{
      code: request.departure.aerodrome,
      dateTimeAt: utcDateTime(request.departure.dateTime),
      isPartOfFlightPlan: true,
      isDiversionOption: false, 
      nauticalMilesFromPath: 0
    }]
    request.legs.forEach(leg => leg.aerodromes.forEach(aerodrome => {
      aerodromesData.push({
        code: aerodrome.code,
        dateTimeAt: utcDateTime(leg.dateTime),
        isPartOfFlightPlan: aerodrome.isPartOfFlightPlan,
        isDiversionOption: false,
        nauticalMilesFromPath: aerodrome.nauticalMilesFromPath
      })
    }));
    aerodromesData.concat(request.diversionOptions.aerodromes.map(aerodrome => ({
      code: aerodrome.code,
      dateTimeAt: utcDateTime(request.diversionOptions.dateTime),
      isPartOfFlightPlan: false,
      isDiversionOption: true,
      nauticalMilesFromPath: aerodrome.nauticalMilesFromPath
    })))
    aerodromesData.push({
      code: request.arrival.aerodrome,
      dateTimeAt: utcDateTime(request.arrival.dateTime),
      isPartOfFlightPlan: true,
      isDiversionOption: false, 
      nauticalMilesFromPath: 0
    })

    const eta = utcDateTime(request.arrival.dateTime) || new Date()
    const etaPlus2 = new Date(eta.getTime())
    etaPlus2.setHours(eta.getHours() + 2)
    const etd = utcDateTime(request.departure.dateTime) || new Date()
    const etdMinus2 = new Date(etd.getTime())
    etdMinus2.setHours(etd.getHours() - 2)
    
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
        item => (
          item.aerodromes.some(value => aerodromes.find(a => value.includes(a))) &&
          !((item.dateFrom && etaPlus2 < item.dateFrom) || (item.dateTo && item.dateTo < etdMinus2))
        )
      ).map(item => {
        const aerodromes = item.aerodromes.map(a => {
          const aerodrome = aerodromesData.find(aerodromeData => aerodromeData.code === a)
          return ({
            code: a,
            nauticalMilesFromTarget: aerodrome? aerodrome.nauticalMilesFromPath : 0,
            isPartOfFlight: !!aerodrome?.isPartOfFlightPlan,
            isDiversionOption: !!aerodrome?.isDiversionOption 
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
        item => (
          item.aerodromes.some(value => aerodromes.find(a => value.includes(a))) &&
          !((item.dateFrom && etaPlus2 < item.dateFrom) || (item.dateTo && item.dateTo < etdMinus2))
        )
      ).map(item => {
        const aerodromes = item.aerodromes.map(a => {
          const aerodrome = aerodromesData.find(aerodromeData => aerodromeData.code === a)
          return ({
            code: a,
            nauticalMilesFromTarget: aerodrome? aerodrome.nauticalMilesFromPath : 0,
            isPartOfFlight: !!aerodrome?.isPartOfFlightPlan,
            isDiversionOption: !!aerodrome?.isDiversionOption 
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
        item => (
          item.aerodromes.some(value => aerodromes.find(a => value.includes(a))) &&
          !((item.dateFrom && etaPlus2 < item.dateFrom) || (item.dateTo && item.dateTo < etdMinus2))
        )
      ).map(item => {
        const aerodromes = item.aerodromes.map(a => {
          const aerodrome = aerodromesData.find(aerodromeData => aerodromeData.code === a)
          return ({
            code: a,
            nauticalMilesFromTarget: aerodrome? aerodrome.nauticalMilesFromPath : 0,
            isPartOfFlight: !!aerodrome?.isPartOfFlightPlan,
            isDiversionOption: !!aerodrome?.isDiversionOption 
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

  private static _filterReports(
    reportRequest: BaseReportRequest, 
    reports: WeatherReportReturnType[], 
    date?: Date
  ): BaseReportResult {
    const report = Processor._findReportByDate(
      reports.filter(t => !!t.aerodromes.find(a => a.includes(reportRequest.aerodromeCode))), 
      date
    ) as {report: WeatherReportReturnType, within: boolean}
    return {
      ...reportRequest,
      data: report.report.data,
      dateFrom: report.report.dateFrom,
      dateTo: report.report.dateTo,
      flightWithinForecast: report.within
    } as BaseReportResult
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