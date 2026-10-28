-- Manual rollback: npx prisma db execute --file prisma/migrations/20261029000000_public_attendance/down.sql
DROP TABLE IF EXISTS `attendance_rate_limits`;

DROP INDEX `attendances_booking_id_phone_key` ON `attendances`;
ALTER TABLE `attendances` DROP COLUMN `phone`, DROP COLUMN `attendee_role`;

DROP INDEX `bookings_attendance_token_key` ON `bookings`;
ALTER TABLE `bookings` DROP COLUMN `attendance_token`;

-- Let `prisma migrate deploy` re-apply this migration later
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261029000000_public_attendance';
