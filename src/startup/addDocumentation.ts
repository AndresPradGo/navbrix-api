import type {Express} from 'express'
import swaggerUi from 'swagger-ui-express';
import { ReportRequest, ReportResponse } from '../schemas/report.schema';
import { BriefingRequest, WeatherBriefingResponse, NotamsBriefingResponse } from '../schemas/briefing.schema';

const addDocumentation = (app: Express, port: number) => {
    
    const specs = {
        openapi: '3.1.0',
        info: {
          title: 'NavBrix API',
          version: '1.0.0',
          description: 'An API that provides official weather forecast and NOTAMs data, from the official Nav Canada website. The data provided by NavBrix API, is meant to be used with flight plans created with the NavCraft API flight planner. NavBrix API can also connect to the NavCraft API database, to update the flight plans’ weather data.'
        },
        externalDocs: {
            description: 'NavCraft API Documentation',
            url: 'http://localhost:8000/docs'

        },
        servers: [ { url: 'http://127.0.0.1:3000' } ],
        tags: [
          {
            name: 'Reports',
            description: 'containing the weather data required by the NavCraft API, to make flight plan calculations.'
          },
          { name: 'Briefings' }
        ],
        paths: {
            '/api/reports/{flightId}': {
                post: {
                    summary: 'Post Weather Report',
                    description: "Creates a weather report with the latest weather forecasts available, and updates the flight data accordingly",
                    tags: ["Reports"],
                    parameters: [{
                        name: "flightId",
                        in: "path",
                        required: true,
                        schema: {
                           type: "integer"
                        }
                    }],
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {$ref: "#/components/schemas/ReportRequest"}
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Successful Response",
                            content: {
                                "application/json": {
                                    schema: {$ref: "#/components/schemas/ReportResponse"}
                                }
                            }
                        },
                        "400": {
                            description: "Invalid Input"
                        },
                        "422": {
                            description: "Validation Error"
                        }
                    },
                    security: [{
                        "x-auth-token": []
                    }]
                }
            },
            '/api/briefings/weather/{flightId}': {
                post: {
                    summary: 'Post Weather Briefing',
                    description: "Creates and return a weather briefing for your flight, using the latest weather forecasts available",
                    tags: ["Briefings"],
                    parameters: [{
                        name: "flightId",
                        in: "path",
                        required: true,
                        schema: {
                           type: "integer"
                        }
                    }],
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {$ref: "#/components/schemas/BriefingRequest"}
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Successful Response",
                            content: {
                                "application/json": {
                                    schema: {$ref: "#/components/schemas/WeatherBriefingResponse"}
                                }
                            }
                        },
                        "400": {
                            description: "Invalid Input"
                        },
                        "422": {
                            description: "Validation Error"
                        }
                    },
                    security: [{
                        "x-auth-token": []
                    }]
                }
            },
            '/api/briefings/notam/{flightId}': {
                post: {
                    summary: 'Post NOTAMs Briefing',
                    description: "Creates and return a NOTAMs briefing for your flight",
                    tags: ["Briefings"],
                    parameters: [{
                        name: "flightId",
                        in: "path",
                        required: true,
                        schema: {
                           type: "integer"
                        }
                    }],
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {$ref: "#/components/schemas/BriefingRequest"}
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Successful Response",
                            content: {
                                "application/json": {
                                    schema: {$ref: "#/components/schemas/NotamsBriefingResponse"}
                                }
                            }
                        },
                        "400": {
                            description: "Invalid Input"
                        },
                        "422": {
                            description: "Validation Error"
                        }
                    },
                    security: [{
                        "x-auth-token": []
                    }]
                }
            }
        },
        components: {
            schemas: {
                ReportRequest,
                ReportResponse,
                BriefingRequest,
                WeatherBriefingResponse,
                NotamsBriefingResponse
            },
            securitySchemes: {
                "x-auth-token": {
                    type: "http",
                    name: "x-auth-token",
                    in: "header",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "The NavBrix API endpoints are safeguarded through JSON Web Tokens (JWT) for authentication. These tokens are generated by the NavCraft API servers. To acquire a valid JWT, users must complete the registration and login processes on the NavCraft API platform."
                }
            }
        },
        definitions: {
            aerodromeReportRequestSchema: ReportRequest.definitions?.aerodromeReportRequestSchema,
            baseReportResponseSchema: ReportResponse.definitions?.baseReportResponseSchema,
            departureArrivalAerodromeSchema: BriefingRequest.definitions?.departureArrivalAerodromeSchema,
            briefingRequestBaseSchema: BriefingRequest.definitions?.briefingRequestBaseSchema,
            ...WeatherBriefingResponse.definitions,
            ...NotamsBriefingResponse.definitions
        },
        config: {
            // Other configuration settings...
            docExpansion: 'none',
            // Set the title property
            title: 'Your Custom Title',
        },
    }

    const options = {
        customSiteTitle: "NavBrix API - Swagger UI",
      };

    app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, options));
}


export default addDocumentation
