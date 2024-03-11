import type {Express} from 'express'
import swaggerUi from 'swagger-ui-express';
import config from 'config'

import { ReportRequest, ReportResponse } from '../schemas/report.schema';
import { BriefingRequest } from '../schemas/briefing.schema';

const addDocumentation = (app: Express, port: number) => {

    const specs = {
        openapi: '3.1.0',
        info: {
          title: 'NavBrix API',
          version: '1.0.0',
          description: `Improving the navigation briefing experience. NavBrix API enables [NavCraft API](${config.get('navcraft_api_url')}) to work with weather forecasts and NOTAMs, from the Nav Canada weather briefing web app [CFPS](https://plan.navcanada.ca/wxrecall/). \n \n - It connects to the NavCraft API's database and updates the flight plans' weather. \n \n - It provides departure, arrival, enroute and alternate weather and NOTAM briefings`
        },
        tags: [
          {
            name: 'Reports',
            description: 'that contain the weather data required by the NavCraft API to make flight plan calculations.'
          },
          { name: 'Briefings' }
        ],
        paths: {
            '/api/reports/{flightId}': {
                post: {
                    summary: 'Post Weather Report',
                    description: 'Creates a weather report with the latest weather forecasts available, and updates the flight data accordingly. The data required to create a report, is provided by the NavCraft API "Get Flight" endpoint.',
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
                    description: 'Creates and return a weather briefing for your flight, using the latest weather forecasts available. The data required to create a briefing, is provided by the NavCraft API "Get Flight" endpoint.',
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
                    description: 'Creates and return a NOTAMs briefing for your flight. The data required to create a briefing, is provided by the NavCraft API "Get Flight" endpoint.',
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
                WeatherBriefingResponse: {
                    "$schema": "http://json-schema.org/draft-07/schema#",
                    "$ref": "#/definitions/WeatherBriefing",
                    "type": "object",
                    "description": "Schema that outlines the weather briefing data to return to the client."
                },
                NotamsBriefingResponse: {
                    "$schema": "http://json-schema.org/draft-07/schema#",
                    "$ref": "#/definitions/NOTAMsBriefing",
                    "type": "object",
                    "decription": "Schema that outlines the NOTAMs briefing data to return to the client."
                  }
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
            ...{
                "WeatherBriefing": {
                  "type": "object",
                  "properties": {
                    "dateTime": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "regions": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "region": {
                            "$ref": "#/definitions/GFARegion"
                          },
                          "weatherGraphs": {
                            "type": "array",
                            "items": {
                              "$ref": "#/definitions/GFAGraph"
                            }
                          },
                          "iceGraphs": {
                            "type": "array",
                            "items": {
                              "$ref": "#/definitions/GFAGraph"
                            }
                          },
                          "airmets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "dateFrom": {
                                  "type": "string",
                                  "format": "date-time"
                                },
                                "dateTo": {
                                  "type": "string",
                                  "format": "date-time"
                                },
                                "data": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "dateFrom",
                                "data"
                              ],
                              "additionalProperties": false
                            }
                          },
                          "sigmets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "dateFrom": {
                                  "type": "string",
                                  "format": "date-time"
                                },
                                "dateTo": {
                                  "type": "string",
                                  "format": "date-time"
                                },
                                "data": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "dateFrom",
                                "data"
                              ],
                              "additionalProperties": false
                            }
                          },
                          "pireps": {
                            "type": "array",
                            "items": {
                              "$ref": "#/definitions/PIREPType"
                            }
                          }
                        },
                        "required": [
                          "region",
                          "weatherGraphs",
                          "iceGraphs",
                          "airmets",
                          "sigmets",
                          "pireps"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "aerodromes": {
                      "type": "object",
                      "properties": {
                        "departure": {
                          "type": "object",
                          "properties": {
                            "dateTimeAt": {
                              "type": "string",
                              "format": "date-time"
                            },
                            "aerodrome": {
                              "$ref": "#/definitions/BaseAerodromeBriefingResult"
                            }
                          },
                          "required": [
                            "dateTimeAt"
                          ],
                          "additionalProperties": false
                        },
                        "legs": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "dateTimeAt": {
                                "type": "string",
                                "format": "date-time"
                              },
                              "aerodromes": {
                                "type": "array",
                                "items": {
                                  "$ref": "#/definitions/BaseAerodromeBriefingResult"
                                }
                              }
                            },
                            "required": [
                              "dateTimeAt",
                              "aerodromes"
                            ],
                            "additionalProperties": false
                          }
                        },
                        "arrival": {
                          "type": "object",
                          "properties": {
                            "dateTimeAt": {
                              "type": "string",
                              "format": "date-time"
                            },
                            "aerodrome": {
                              "$ref": "#/definitions/BaseAerodromeBriefingResult"
                            }
                          },
                          "required": [
                            "dateTimeAt"
                          ],
                          "additionalProperties": false
                        },
                        "alternates": {
                          "type": "array",
                          "items": {
                            "$ref": "#/definitions/BaseAerodromeBriefingResult"
                          }
                        }
                      },
                      "required": [
                        "departure",
                        "legs",
                        "arrival",
                        "alternates"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "required": [
                    "dateTime",
                    "regions",
                    "aerodromes"
                  ],
                  "additionalProperties": false
                },
                "GFARegion": {
                  "type": "string",
                  "enum": [
                    "Pacific (GFACN31)",
                    "Prairies (GFACN32)",
                    "Pacific (GFACN33)",
                    "Ontario & Quebec (GFACN34)",
                    "Yukon & NWT (GFACN35)",
                    "Nunavut (GFACN36)",
                    "Arctic (GFACN37)"
                  ]
                },
                "GFAGraph": {
                  "type": "object",
                  "properties": {
                    "src": {
                      "type": "string"
                    },
                    "validAt": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "hoursSpan": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "src",
                    "validAt",
                    "hoursSpan"
                  ],
                  "additionalProperties": false
                },
                "PIREPType": {
                  "type": "object",
                  "properties": {
                    "dateFrom": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "dateTo": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "data": {
                      "type": "string"
                    },
                    "geometryWarning": {
                      "type": "boolean"
                    },
                    "isUrgent": {
                      "type": "boolean"
                    },
                    "location": {
                      "type": "string"
                    },
                    "ftASL": {
                      "type": "number"
                    },
                    "aircraft": {
                      "type": "string"
                    },
                    "clouds": {
                      "type": "string"
                    },
                    "temperature": {
                      "type": "number"
                    },
                    "wind": {
                      "type": "string"
                    },
                    "turbulence": {
                      "type": "string"
                    },
                    "icing": {
                      "type": "string"
                    },
                    "remarks": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "dateFrom",
                    "data"
                  ],
                  "additionalProperties": false
                },
                "BaseAerodromeBriefingResult": {
                  "type": "object",
                  "properties": {
                    "aerodromeCode": {
                      "type": "string"
                    },
                    "nauticalMilesFromTarget": {
                      "type": "number"
                    },
                    "taf": {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "string"
                        },
                        "dateFrom": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "dateTo": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "flightWithinForecast": {
                          "type": "boolean"
                        }
                      },
                      "required": [
                        "data",
                        "dateFrom",
                        "dateTo",
                        "flightWithinForecast"
                      ],
                      "additionalProperties": false
                    },
                    "metar": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "string"
                          },
                          "date": {
                            "type": "string",
                            "format": "date-time"
                          }
                        },
                        "required": [
                          "data",
                          "date"
                        ],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": [
                    "aerodromeCode",
                    "nauticalMilesFromTarget",
                    "metar"
                  ],
                  "additionalProperties": false
                }
              },
            ...{
                "NOTAMsBriefing": {
                  "$ref": "#/definitions/NOTAMsPostProcessData"
                },
                "NOTAMsPostProcessData": {
                  "type": "object",
                  "properties": {
                    "dateTime": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "notams": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "aerodromes": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "code": {
                                  "type": "string"
                                },
                                "dateTimeAt": {
                                  "type": "string",
                                  "format": "date-time"
                                },
                                "flightWithinNotam": {
                                  "type": "boolean"
                                }
                              },
                              "required": [
                                "code",
                                "dateTimeAt",
                                "flightWithinNotam"
                              ],
                              "additionalProperties": false
                            }
                          },
                          "data": {
                            "type": "string"
                          },
                          "dateFrom": {
                            "type": "string",
                            "format": "date-time"
                          },
                          "dateTo": {
                            "type": "string",
                            "format": "date-time"
                          },
                          "isAipSuplement": {
                            "type": "boolean"
                          }
                        },
                        "required": [
                          "aerodromes",
                          "data",
                          "dateFrom",
                          "isAipSuplement"
                        ],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": [
                    "dateTime",
                    "notams"
                  ],
                  "additionalProperties": false
                }
              }
        },
        config: {
            // Other configuration settings...
            docExpansion: 'none',
            // Set the title property
            title: 'Your Custom Title',
        },
    }

    const options = {
        customSiteTitle: "NavBrix API | Docs",
        customfavIcon: "/logo.png",
        customCss: ".swagger-ui .topbar { max-height: 0px !important; padding: 0px !important; overflow: hidden;}"
      };

    app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, options, undefined, undefined, "public/logo.png"));
}


export default addDocumentation
