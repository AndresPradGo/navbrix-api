-- CreateTable
CREATE TABLE `aerodrome_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aerodrome_weather_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(0) NOT NULL,
    `departure_id` INTEGER NULL,
    `arrival_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `arrival_id`(`arrival_id`),
    INDEX `departure_id`(`departure_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aerodromes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vfr_waypoint_id` INTEGER NULL,
    `user_waypoint_id` INTEGER NULL,
    `has_taf` BOOLEAN NOT NULL,
    `has_metar` BOOLEAN NOT NULL,
    `has_fds` BOOLEAN NOT NULL,
    `elevation_ft` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `vfr_waypoint_id`(`vfr_waypoint_id`),
    UNIQUE INDEX `user_waypoint_id`(`user_waypoint_id`),
    INDEX `status_id`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aircraft` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `make` VARCHAR(255) NOT NULL,
    `model` VARCHAR(255) NOT NULL,
    `abbreviation` VARCHAR(10) NOT NULL,
    `registration` VARCHAR(50) NOT NULL,
    `owner_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `owner_id`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arrivals` (
    `flight_id` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `wind_direction` INTEGER NULL,
    `wind_magnitude_knot` INTEGER NOT NULL,
    `altimeter_inhg` DECIMAL(4, 2) NOT NULL,
    `temperature_last_updated` DATETIME(0) NULL,
    `wind_last_updated` DATETIME(0) NULL,
    `altimeter_last_updated` DATETIME(0) NULL,
    `aerodrome_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `flight_id`(`flight_id`),
    INDEX `aerodrome_id`(`aerodrome_id`),
    PRIMARY KEY (`flight_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `baggage_compartments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `arm_in` DECIMAL(6, 2) NOT NULL,
    `weight_limit_lb` DECIMAL(6, 2) NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `baggages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `weight_lb` DECIMAL(5, 2) NOT NULL,
    `flight_id` INTEGER NOT NULL,
    `baggage_compartment_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `baggage_compartment_id`(`baggage_compartment_id`),
    INDEX `flight_id`(`flight_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `climb_performance_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight_lb` INTEGER NOT NULL,
    `pressure_alt_ft` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `kias` INTEGER NULL,
    `fpm` INTEGER NULL,
    `time_min` INTEGER NOT NULL,
    `fuel_gal` DECIMAL(4, 2) NOT NULL,
    `distance_nm` INTEGER NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cruise_performance_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight_lb` INTEGER NOT NULL,
    `pressure_alt_ft` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `bhp_percent` INTEGER NOT NULL,
    `rpm` INTEGER NOT NULL,
    `ktas` INTEGER NOT NULL,
    `gph` DECIMAL(6, 2) NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departures` (
    `flight_id` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `wind_direction` INTEGER NULL,
    `wind_magnitude_knot` INTEGER NOT NULL,
    `altimeter_inhg` DECIMAL(4, 2) NOT NULL,
    `temperature_last_updated` DATETIME(0) NULL,
    `wind_last_updated` DATETIME(0) NULL,
    `altimeter_last_updated` DATETIME(0) NULL,
    `aerodrome_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `flight_id`(`flight_id`),
    INDEX `aerodrome_id`(`aerodrome_id`),
    PRIMARY KEY (`flight_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enroute_weather_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(0) NOT NULL,
    `leg_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `leg_id`(`leg_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fd_forecasts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date_from` DATETIME(0) NOT NULL,
    `date_to` DATETIME(0) NOT NULL,
    `enroute_weather_id` INTEGER NOT NULL,
    `aerodrome_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `aerodrome_id`(`aerodrome_id`),
    INDEX `enroute_weather_id`(`enroute_weather_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flight_waypoints` (
    `waypoint_id` INTEGER NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `from_user_waypoint` BOOLEAN NOT NULL,
    `from_vfr_waypoint` BOOLEAN NOT NULL,
    `leg_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `waypoint_id`(`waypoint_id`),
    INDEX `leg_id`(`leg_id`),
    PRIMARY KEY (`waypoint_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flights` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `departure_time` DATETIME(0) NOT NULL,
    `bhp_percent` INTEGER NOT NULL,
    `added_enroute_time_hours` DECIMAL(4, 2) NOT NULL,
    `reserve_fuel_hours` DECIMAL(4, 2) NOT NULL,
    `contingency_fuel_hours` DECIMAL(4, 2) NOT NULL,
    `briefing_radius_nm` INTEGER NOT NULL,
    `alternate_radius_nm` INTEGER NOT NULL,
    `aircraft_id` INTEGER NULL,
    `pilot_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `aircraft_id`(`aircraft_id`),
    INDEX `pilot_id`(`pilot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fuel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gallons` DECIMAL(5, 2) NOT NULL,
    `flight_id` INTEGER NOT NULL,
    `fuel_tank_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `flight_id`(`flight_id`),
    INDEX `fuel_tank_id`(`fuel_tank_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fuel_tanks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `arm_in` DECIMAL(6, 2) NOT NULL,
    `fuel_capacity_gallons` DECIMAL(5, 2) NOT NULL,
    `unusable_fuel_gallons` DECIMAL(5, 2) NOT NULL,
    `burn_sequence` INTEGER NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fuel_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `density_lb_gal` DECIMAL(4, 2) NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `landing_performance_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight_lb` INTEGER NOT NULL,
    `pressure_alt_ft` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `groundroll_ft` INTEGER NOT NULL,
    `obstacle_clearance_ft` INTEGER NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sequence` INTEGER NOT NULL,
    `altitude_ft` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `wind_direction` INTEGER NULL,
    `wind_magnitude_knot` INTEGER NOT NULL,
    `altimeter_inhg` DECIMAL(4, 2) NOT NULL,
    `temperature_last_updated` DATETIME(0) NULL,
    `wind_last_updated` DATETIME(0) NULL,
    `altimeter_last_updated` DATETIME(0) NULL,
    `flight_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `flight_id`(`flight_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metar_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(0) NOT NULL,
    `altimeter_inhg` DECIMAL(4, 2) NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `aerodrome_weather_id` INTEGER NULL,
    `enroute_weather_id` INTEGER NULL,
    `aerodrome_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `aerodrome_id`(`aerodrome_id`),
    INDEX `aerodrome_weather_id`(`aerodrome_weather_id`),
    INDEX `enroute_weather_id`(`enroute_weather_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passenger_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `weight_lb` DECIMAL(5, 2) NOT NULL,
    `creator_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `creator_id`(`creator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `performance_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `is_complete` BOOLEAN NOT NULL,
    `center_of_gravity_in` DECIMAL(6, 2) NULL,
    `empty_weight_lb` DECIMAL(7, 2) NOT NULL,
    `max_ramp_weight_lb` DECIMAL(7, 2) NOT NULL,
    `max_takeoff_weight_lb` DECIMAL(7, 2) NOT NULL,
    `max_landing_weight_lb` DECIMAL(7, 2) NOT NULL,
    `baggage_allowance_lb` DECIMAL(6, 2) NOT NULL,
    `take_off_taxi_fuel_gallons` DECIMAL(4, 2) NOT NULL,
    `percent_decrease_takeoff_headwind_knot` DECIMAL(4, 2) NOT NULL,
    `percent_increase_takeoff_tailwind_knot` DECIMAL(4, 2) NOT NULL,
    `percent_decrease_landing_headwind_knot` DECIMAL(4, 2) NOT NULL,
    `percent_increase_landing_tailwind_knot` DECIMAL(4, 2) NOT NULL,
    `percent_increase_climb_temperature_c` DECIMAL(4, 2) NOT NULL,
    `is_preferred` BOOLEAN NOT NULL,
    `fuel_type_id` INTEGER NULL,
    `aircraft_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `aircraft_id`(`aircraft_id`),
    INDEX `fuel_type_id`(`fuel_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `persons_on_board` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seat_number` INTEGER NOT NULL,
    `name` VARCHAR(255) NULL,
    `weight_lb` DECIMAL(5, 2) NULL,
    `flight_id` INTEGER NULL,
    `seat_row_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `passenger_profile_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `flight_id`(`flight_id`),
    INDEX `passenger_profile_id`(`passenger_profile_id`),
    INDEX `seat_row_id`(`seat_row_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `runway_surfaces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `surface` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `surface`(`surface`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `runways` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `length_ft` INTEGER NOT NULL,
    `landing_length_ft` INTEGER NOT NULL,
    `intersection_departure_length_ft` INTEGER NULL,
    `number` INTEGER NOT NULL,
    `position` VARCHAR(1) NULL,
    `surface_id` INTEGER NOT NULL,
    `aerodrome_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `aerodrome_id`(`aerodrome_id`),
    INDEX `surface_id`(`surface_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seat_rows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `arm_in` DECIMAL(6, 2) NOT NULL,
    `weight_limit_lb` DECIMAL(6, 2) NULL,
    `number_of_seats` INTEGER NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surfaces_performance_decrease` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `percent` DECIMAL(4, 2) NOT NULL,
    `is_takeoff` BOOLEAN NOT NULL,
    `surface_id` INTEGER NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    INDEX `surface_id`(`surface_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taf_forecasts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(0) NOT NULL,
    `date_from` DATETIME(0) NOT NULL,
    `date_to` DATETIME(0) NOT NULL,
    `wind_direction` INTEGER NULL,
    `wind_direction_range` INTEGER NULL,
    `wind_magnitude_knot` INTEGER NOT NULL,
    `gust_factor_knot` INTEGER NULL,
    `aerodrome_weather_id` INTEGER NOT NULL,
    `aerodrome_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `aerodrome_id`(`aerodrome_id`),
    INDEX `aerodrome_weather_id`(`aerodrome_weather_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `takeoff_performance_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight_lb` INTEGER NOT NULL,
    `pressure_alt_ft` INTEGER NOT NULL,
    `temperature_c` INTEGER NOT NULL,
    `groundroll_ft` INTEGER NOT NULL,
    `obstacle_clearance_ft` INTEGER NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_waypoints` (
    `waypoint_id` INTEGER NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `creator_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `waypoint_id`(`waypoint_id`),
    INDEX `creator_id`(`creator_id`),
    PRIMARY KEY (`waypoint_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `weight_lb` DECIMAL(5, 2) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL,
    `is_admin` BOOLEAN NOT NULL,
    `is_master` BOOLEAN NOT NULL,
    `is_trial` BOOLEAN NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vfr_waypoints` (
    `waypoint_id` INTEGER NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `hidden` BOOLEAN NOT NULL,
    `creator_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    UNIQUE INDEX `waypoint_id`(`waypoint_id`),
    UNIQUE INDEX `code`(`code`),
    INDEX `creator_id`(`creator_id`),
    PRIMARY KEY (`waypoint_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waypoints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lat_degrees` INTEGER NOT NULL,
    `lat_minutes` INTEGER NOT NULL,
    `lat_seconds` INTEGER NOT NULL,
    `lat_direction` VARCHAR(1) NOT NULL,
    `lon_degrees` INTEGER NOT NULL,
    `lon_minutes` INTEGER NOT NULL,
    `lon_seconds` INTEGER NOT NULL,
    `lon_direction` VARCHAR(1) NOT NULL,
    `magnetic_variation` DECIMAL(4, 2) NULL,
    `in_north_airspace` BOOLEAN NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weight_balance_limits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cg_location_in` DECIMAL(6, 2) NOT NULL,
    `weight_lb` DECIMAL(7, 2) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `weight_balance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `weight_balance_profile_id`(`weight_balance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weight_balance_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `performance_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `performance_profile_id`(`performance_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fds_at_altitude` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `altitude_ft` INTEGER NOT NULL,
    `wind_direction` INTEGER NULL,
    `wind_magnitude_knot` INTEGER NULL,
    `temperature_c` INTEGER NULL,
    `fd_forecasts_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_updated` DATETIME(0) NOT NULL,

    INDEX `fd_forecasts_id`(`fd_forecasts_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `aerodrome_weather_reports` ADD CONSTRAINT `aerodrome_weather_reports_ibfk_1` FOREIGN KEY (`departure_id`) REFERENCES `departures`(`flight_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aerodrome_weather_reports` ADD CONSTRAINT `aerodrome_weather_reports_ibfk_2` FOREIGN KEY (`arrival_id`) REFERENCES `arrivals`(`flight_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aerodromes` ADD CONSTRAINT `aerodromes_ibfk_1` FOREIGN KEY (`vfr_waypoint_id`) REFERENCES `vfr_waypoints`(`waypoint_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aerodromes` ADD CONSTRAINT `aerodromes_ibfk_2` FOREIGN KEY (`user_waypoint_id`) REFERENCES `user_waypoints`(`waypoint_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aerodromes` ADD CONSTRAINT `aerodromes_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `aerodrome_status`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aircraft` ADD CONSTRAINT `aircraft_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arrivals` ADD CONSTRAINT `arrivals_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arrivals` ADD CONSTRAINT `arrivals_ibfk_2` FOREIGN KEY (`aerodrome_id`) REFERENCES `aerodromes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baggage_compartments` ADD CONSTRAINT `baggage_compartments_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baggages` ADD CONSTRAINT `baggages_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baggages` ADD CONSTRAINT `baggages_ibfk_2` FOREIGN KEY (`baggage_compartment_id`) REFERENCES `baggage_compartments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `climb_performance_data` ADD CONSTRAINT `climb_performance_data_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cruise_performance_data` ADD CONSTRAINT `cruise_performance_data_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departures` ADD CONSTRAINT `departures_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departures` ADD CONSTRAINT `departures_ibfk_2` FOREIGN KEY (`aerodrome_id`) REFERENCES `aerodromes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enroute_weather_reports` ADD CONSTRAINT `enroute_weather_reports_ibfk_1` FOREIGN KEY (`leg_id`) REFERENCES `legs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fd_forecasts` ADD CONSTRAINT `fd_forecasts_ibfk_1` FOREIGN KEY (`enroute_weather_id`) REFERENCES `enroute_weather_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fd_forecasts` ADD CONSTRAINT `fd_forecasts_ibfk_2` FOREIGN KEY (`aerodrome_id`) REFERENCES `aerodromes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flight_waypoints` ADD CONSTRAINT `flight_waypoints_ibfk_1` FOREIGN KEY (`waypoint_id`) REFERENCES `waypoints`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flight_waypoints` ADD CONSTRAINT `flight_waypoints_ibfk_2` FOREIGN KEY (`leg_id`) REFERENCES `legs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_ibfk_1` FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_ibfk_2` FOREIGN KEY (`pilot_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel` ADD CONSTRAINT `fuel_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel` ADD CONSTRAINT `fuel_ibfk_2` FOREIGN KEY (`fuel_tank_id`) REFERENCES `fuel_tanks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel_tanks` ADD CONSTRAINT `fuel_tanks_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `landing_performance_data` ADD CONSTRAINT `landing_performance_data_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legs` ADD CONSTRAINT `legs_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metar_reports` ADD CONSTRAINT `metar_reports_ibfk_1` FOREIGN KEY (`aerodrome_weather_id`) REFERENCES `aerodrome_weather_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metar_reports` ADD CONSTRAINT `metar_reports_ibfk_2` FOREIGN KEY (`enroute_weather_id`) REFERENCES `enroute_weather_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metar_reports` ADD CONSTRAINT `metar_reports_ibfk_3` FOREIGN KEY (`aerodrome_id`) REFERENCES `aerodromes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passenger_profiles` ADD CONSTRAINT `passenger_profiles_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `performance_profiles` ADD CONSTRAINT `performance_profiles_ibfk_1` FOREIGN KEY (`fuel_type_id`) REFERENCES `fuel_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `performance_profiles` ADD CONSTRAINT `performance_profiles_ibfk_2` FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons_on_board` ADD CONSTRAINT `persons_on_board_ibfk_1` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons_on_board` ADD CONSTRAINT `persons_on_board_ibfk_2` FOREIGN KEY (`seat_row_id`) REFERENCES `seat_rows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons_on_board` ADD CONSTRAINT `persons_on_board_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons_on_board` ADD CONSTRAINT `persons_on_board_ibfk_4` FOREIGN KEY (`passenger_profile_id`) REFERENCES `passenger_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `runways` ADD CONSTRAINT `runways_ibfk_1` FOREIGN KEY (`surface_id`) REFERENCES `runway_surfaces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `runways` ADD CONSTRAINT `runways_ibfk_2` FOREIGN KEY (`aerodrome_id`) REFERENCES `aerodromes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seat_rows` ADD CONSTRAINT `seat_rows_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surfaces_performance_decrease` ADD CONSTRAINT `surfaces_performance_decrease_ibfk_1` FOREIGN KEY (`surface_id`) REFERENCES `runway_surfaces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surfaces_performance_decrease` ADD CONSTRAINT `surfaces_performance_decrease_ibfk_2` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taf_forecasts` ADD CONSTRAINT `taf_forecasts_ibfk_1` FOREIGN KEY (`aerodrome_weather_id`) REFERENCES `aerodrome_weather_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taf_forecasts` ADD CONSTRAINT `taf_forecasts_ibfk_2` FOREIGN KEY (`aerodrome_id`) REFERENCES `aerodromes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `takeoff_performance_data` ADD CONSTRAINT `takeoff_performance_data_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_waypoints` ADD CONSTRAINT `user_waypoints_ibfk_1` FOREIGN KEY (`waypoint_id`) REFERENCES `waypoints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_waypoints` ADD CONSTRAINT `user_waypoints_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vfr_waypoints` ADD CONSTRAINT `vfr_waypoints_ibfk_1` FOREIGN KEY (`waypoint_id`) REFERENCES `waypoints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vfr_waypoints` ADD CONSTRAINT `vfr_waypoints_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weight_balance_limits` ADD CONSTRAINT `weight_balance_limits_ibfk_1` FOREIGN KEY (`weight_balance_profile_id`) REFERENCES `weight_balance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weight_balance_profiles` ADD CONSTRAINT `weight_balance_profiles_ibfk_1` FOREIGN KEY (`performance_profile_id`) REFERENCES `performance_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fds_at_altitude` ADD CONSTRAINT `fds_at_altitude_ibfk_1` FOREIGN KEY (`fd_forecasts_id`) REFERENCES `fd_forecasts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

