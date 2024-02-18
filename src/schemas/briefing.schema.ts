import { z } from "zod";
import zodToJsonSchema from 'zod-to-json-schema'

import type { BaseAerodromeBriefingResult, NOTAMsPostProcessData } from '../scraper/processor'
import type { GFAGraph, GFARegion } from '../scraper/scraper'
import type { PIREPType } from '../scraper/interpreter'

// Post Briefing request schemas
const aerodromeRequestSchema = z.object({
    code: z
        .string({ 
            invalid_type_error: "Aerodrome Code must be a string",
            required_error: "Aerodrome Code is required" 
        })
        .min(2, { message: "Must be at least 2 characters long" })
        .max(12, { message: "Must be at most 12 characters long" })
        .regex(/^[-A-Za-z0-9']+$/, {
            message: "Only letters, numbers and symbols -'",
        }),
    nauticalMilesFromPath: z
        .number({ 
            invalid_type_error: "Distance from path must be a number",
            required_error: "Distance from path is required" 
        })
        .min(0, "Distance from path must be a positive number")
})

const briefingRequestBaseSchema = z.object({
    dateTime: z
        .string({ required_error: "Date-time is required" })
        .datetime('Date-time format: "2020-01-01T00:00:00Z"'),
    aerodromes: z.array(aerodromeRequestSchema, { required_error: "List of aerodromes is required" }),
})

const departureArrivalAerodromeSchema = z.object({
    dateTime: z
        .string({ required_error: "Date-time is required" })
        .datetime('Date-time format: "2020-01-01T00:00:00Z"'),
    aerodrome: z
        .string({ 
            invalid_type_error: "Aerodrome Code must be a string",
            required_error: "Aerodrome Code is required" 
        })
        .min(2, { message: "Must be at least 2 characters long" })
        .max(12, { message: "Must be at most 12 characters long" })
        .regex(/^[-A-Za-z0-9']+$/, {
            message: "Only letters, numbers and symbols -'",
        }).optional(),
})

const briefingParamsSquema = z.object({
    flightId: z
        .string()
        .regex(/^[1-9]\d*$/, {
            message: "Valid flightId is required.",
        }),
})

const briefingRequestBodySchema = z.object ({
    departure: departureArrivalAerodromeSchema,
    legs: z.array(briefingRequestBaseSchema),
    arrival: departureArrivalAerodromeSchema,
    alternates: briefingRequestBaseSchema,
}).describe("Schema that outlines the data required to post a new briefing request.")

export const briefingRequestSchema = z.object({
    body: briefingRequestBodySchema,
    params: briefingParamsSquema
})

// Types
export type BriefingRequestParams = z.infer<typeof briefingParamsSquema>
export type BriefingRequestInput = z.infer<typeof briefingRequestBodySchema>;

interface BaseEnrouteBriefingResult {
    dateFrom: Date;
    dateTo?: Date
    data: string;
}

export type WeatherBriefing = {
    dateTime: Date;
    regions:{
        region: GFARegion;
        weatherGraphs: GFAGraph[];
        iceGraphs: GFAGraph[];
        airmets: BaseEnrouteBriefingResult[];
        sigmets: BaseEnrouteBriefingResult[];
        pireps: PIREPType[]
      }[],
    aerodromes: {
        departure: {
            dateTimeAt: Date
            aerodrome?: BaseAerodromeBriefingResult
          }
          legs: {
            dateTimeAt: Date;
            aerodromes: BaseAerodromeBriefingResult[]
          }[]
          arrival: {
            dateTimeAt: Date
            aerodrome?: BaseAerodromeBriefingResult
          }
          alternates: BaseAerodromeBriefingResult[]
    }
}

export type NOTAMsBriefing = NOTAMsPostProcessData

// Swagger documentation schemas
export const BriefingRequest = zodToJsonSchema(
    briefingRequestBodySchema, 
    {definitions: { departureArrivalAerodromeSchema,  briefingRequestBaseSchema}}
)