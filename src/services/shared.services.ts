import { db } from '../utils/db.server'

interface Flight {
    id: number,
    departure_time: Date,
    bhp_percent: number,
    added_enroute_time_hours: number,
    reserve_fuel_hours: number,
    contingency_fuel_hours: number,
    briefing_radius_nm: number,
    alternate_radius_nm: number,
    aircraft_id: number | null,
    pilot_id: number,
    created_at: Date,
    last_updated: Date
  }

export const  getUserFlight = async (flightId: number, userEmail: string): Promise<Flight | null> => {
    // Check flight exists and user has permissions
    const flight = await db.flights.findUnique({
        where: {
            id: flightId,
            users: {
                email: userEmail
            }
        }
    })

    return flight ? {
        ...flight,
        added_enroute_time_hours: Number(flight.added_enroute_time_hours),
        reserve_fuel_hours: Number(flight.reserve_fuel_hours),
        contingency_fuel_hours: Number(flight.contingency_fuel_hours),
      } : null

}

interface Aerodrome {
    id: number;
    code: string,
    has_taf: boolean,
    has_metar: boolean,
    has_fds: boolean,
}
export const getOfficialAerodromes = async (codes: string[]): Promise<Aerodrome[]> => {
    const aerodromes = await db.aerodromes.findMany({
        where: {
            vfr_waypoint_id: {not: null},
            user_waypoint_id: null,
            vfr_waypoints: {
                code: { in: codes},
                hidden: false
            }
        },
        include: {vfr_waypoints: true}
    })

    return aerodromes.map(a => (a && a.vfr_waypoints ? {
        id: a.id,
        code: a.vfr_waypoints.code,
        has_taf: a.has_taf,
        has_metar: a.has_metar,
        has_fds: a.has_fds,
    }: null)).filter(a => a !== null) as Aerodrome[]
}
