import { z } from "zod";

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
        }),
})

const briefingRequestBodySchema = z.object ({
    departure: departureArrivalAerodromeSchema,
    legs: z.array(briefingRequestBaseSchema),
    arrival: departureArrivalAerodromeSchema,
    diversionOptions: z.array(briefingRequestBaseSchema),
})

export const briefingRequestSchema = z.object({
    body: briefingRequestBodySchema
})

// Types
export type BriefingRequestInput = z.infer<typeof briefingRequestBodySchema>;