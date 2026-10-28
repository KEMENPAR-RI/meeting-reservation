-- Manual rollback: npx prisma db execute --file prisma/migrations/20261028000000_init_mysql/down.sql
DROP TABLE IF EXISTS `booking_locks`;
DROP TABLE IF EXISTS `bookings`;

-- Let `prisma migrate deploy` re-apply this migration later
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261028000000_init_mysql';
