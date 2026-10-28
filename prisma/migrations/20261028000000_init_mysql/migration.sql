-- CreateTable
CREATE TABLE `bookings` (
    `id` CHAR(36) NOT NULL,
    `starts_at` DATETIME(6) NOT NULL,
    `ends_at` DATETIME(6) NOT NULL,
    `booker_name` VARCHAR(100) NOT NULL,
    `division` VARCHAR(100) NOT NULL,
    `agenda` VARCHAR(1000) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `bookings_starts_at_idx`(`starts_at`),
    INDEX `bookings_ends_at_idx`(`ends_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_locks` (
    `id` TINYINT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Hand-written: enforced on MySQL >= 8.0.16 / MariaDB >= 10.2.1
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_time_order` CHECK (`ends_at` > `starts_at`);

-- Hand-written: lock row for booking writes (ADR 0001); never delete
INSERT INTO `booking_locks` (`id`) VALUES (1);
