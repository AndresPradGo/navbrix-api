import { z } from "zod";

const baseReportRequestSquema = z.object({
    aerodromeCode: z
        .string({ required_error: "Aerodrome Code is required" })
        .min(2, { message: "Must be at least 2 characters long" })
        .max(12, { message: "Must be at most 12 characters long" })
        .regex(/^[-A-Za-z0-9']+$/, {
        message: "Only letters, numbers and symbols -'",
        }),
    nauticalMilesFromTarget: z
        .number({ required_error: "Distance from target is required" })
        .min(0, "Must be a positive number")
})

const aerodromeReportSchema = z.object({
    dateTime: z.string({ required_error: "Date-time is required" }).datetime(),
    taf: z.array(baseReportRequestSquema, { required_error: "TAFs are required" }),
    metar: z.array(baseReportRequestSquema, { required_error: "METARs are required" })
})

const enrouteReportSchema = z.object({
    dateTime: z.string({ required_error: "Date-time is required" }).datetime(),
    upperwind: z.array(baseReportRequestSquema, { required_error: "Upper Winds are required" }),
    metar: z.array(baseReportRequestSquema, { required_error: "METARs are required" })
})

export const reportRequestSchema = z.object({
  body: z.object ({
      takeoffWeather: aerodromeReportSchema.optional(),
      enrouteWeather: z.array(enrouteReportSchema).optional(),
      landingWeather:  aerodromeReportSchema.optional(),
  })
})

export type ReportRequestInput = z.infer<typeof reportRequestSchema>;