import { z } from "zod";
import zodToJsonSchema from 'zod-to-json-schema'

// Post Report request schemas
const baseReportRequestSchema = z.object({
    aerodromeCode: z
        .string({ 
            invalid_type_error: "Aerodrome Code must be a string",
            required_error: "Aerodrome Code is required" 
        })
        .min(2, { message: "Must be at least 2 characters long" })
        .max(12, { message: "Must be at most 12 characters long" })
        .regex(/^[-A-Za-z0-9']+$/, {
            message: "Only letters, numbers and symbols -'",
        }),
    nauticalMilesFromTarget: z
        .number({ 
            invalid_type_error: "Distance from target must be a number",
            required_error: "Distance from target is required" 
        })
        .min(0, "Distance from target must be a positive number")
})

const aerodromeReportRequestSchema = z.object({
    dateTime: z
        .string({ required_error: "Date-time is required" })
        .datetime('Date-time format: "2020-01-01T00:00:00Z"'),
    taf: z.array(baseReportRequestSchema, { required_error: "TAFs are required" }),
    metar: z.array(baseReportRequestSchema, { required_error: "METARs are required" })
})

const enrouteReportRequestSchema = z.object({
    dateTime: z
        .string({ required_error: "Date-time is required" })
        .datetime('Date-time format: "2020-01-01T00:00:00Z"'),
    altitude: z
        .number({ required_error: "altitude is required" })
        .min(500, { message: "Must be at least 500 ft" })
        .max(17999, { message: "VFR Flights must be below 18,000 ft" }),
    upperwind: z.array(baseReportRequestSchema, { required_error: "Upper Winds are required" }),
    metar: z.array(baseReportRequestSchema, { required_error: "METARs are required" })
})

const reportRequestBodySchema = z.object ({
    takeoffWeather: aerodromeReportRequestSchema.optional(),
    enrouteWeather: z.array(enrouteReportRequestSchema).optional(),
    landingWeather:  aerodromeReportRequestSchema.optional(),
}).describe("Schema that outlines the data required to post a new weather report.");

const reportParamsSquema = z.object({
    flightId: z
        .string()
        .regex(/^[1-9]\d*$/, {
            message: "Valid flightId is required.",
        }),
})

export const reportRequestSchema = z.object({
  body: reportRequestBodySchema,
  params: reportParamsSquema
})

// Post Report response schemas
const baseReportResponseSchema = z.object({
    wind_magnitude_knot: z
        .number({ 
            invalid_type_error: "Wind magnitude must be a number", 
            required_error: "Wind magnitude is required" 
        })
        .int("Wind magnitude must be a round number")
        .min(0, "Wind magnitude must be a positive number"),
    wind_direction: z
        .number({ 
            invalid_type_error: "Wind direction must be a number",
            required_error: "Wind direction is required"
        })
        .int("Wind direction must be a round number")
        .min(0, "Wind direction must be bewteen 0 and 360")
        .max(360, "Wind direction must be bewteen 0 and 360")
        .optional(),
  temperature_c: z
        .number({ 
            invalid_type_error: "Temperature must be a number",
            required_error: "Temperature is required"
        })
        .int("Temperature must be a round number"),
  altimeter_inhg: z
        .number({ 
            invalid_type_error: "Altimeter must be a number",
            required_error: "Altimeter is required"
        })
        .max(99.94, { message: "Altimeter must be less than 99.95" })
        .min(-99.94, { message: "Altimeter must be greater than -99.95" }),
})

export const reportResposeBodySchema = z.object ({
    takeoffWeather: baseReportResponseSchema.optional(),
    enrouteWeather: z.array(baseReportResponseSchema).optional(),
    landingWeather:  baseReportResponseSchema.optional(),
    allWeatherIsOfficial: z.boolean(),
    weatherHoursFromETD: z.number().min(-1).describe("Equals -1 if ETD is in the past \n\n Greather then 10,000 if some weather data has not been updated ")
}).describe("Schema that outlines the weather report data to return to the client.");

// Types
export type BaseReportRequest = z.infer<typeof baseReportRequestSchema>;
export type ReportRequestParams = z.infer<typeof reportParamsSquema>
export type ReportRequestInput = z.infer<typeof reportRequestBodySchema>;
export type ReportResponseBody = z.infer<typeof reportResposeBodySchema>;

// Swagger documentation schemas
export const ReportRequest = zodToJsonSchema(
    reportRequestBodySchema, 
    {definitions: { aerodromeReportRequestSchema }}
)
export const ReportResponse = zodToJsonSchema(
    reportResposeBodySchema, 
    {definitions: { baseReportResponseSchema }}
)