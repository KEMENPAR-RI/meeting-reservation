-- CreateTable
CREATE TABLE `attendances` (
    `id` CHAR(36) NOT NULL,
    `booking_id` CHAR(36) NOT NULL,
    `attendee_name` VARCHAR(100) NOT NULL,
    `name_key` VARCHAR(150) COLLATE utf8mb4_bin NOT NULL,
    `division` VARCHAR(100) NOT NULL,
    `signature` VARCHAR(100) NOT NULL,
    `signed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `attendances_booking_id_name_key_key`(`booking_id`, `name_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
