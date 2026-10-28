-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `attendance_token` CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL;

-- CreateIndex
CREATE UNIQUE INDEX `bookings_attendance_token_key` ON `bookings`(`attendance_token`);

-- AlterTable
ALTER TABLE `attendances`
    ADD COLUMN `attendee_role` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER `division`,
    ADD COLUMN `phone` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER `attendee_role`;

-- CreateIndex
CREATE UNIQUE INDEX `attendances_booking_id_phone_key` ON `attendances`(`booking_id`, `phone`);

-- CreateTable
CREATE TABLE `attendance_rate_limits` (
    `ip_key` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `window_start` DATETIME(0) NOT NULL,
    `hits` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `attendance_rate_limits_window_start_idx`(`window_start`),
    PRIMARY KEY (`ip_key`, `window_start`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
