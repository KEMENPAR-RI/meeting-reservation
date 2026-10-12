-- Manual rollback: npx prisma db execute --file prisma/migrations/20261012000000_init_bookings/down.sql
DROP TABLE IF EXISTS "bookings";

-- Let `prisma migrate deploy` re-apply this migration later
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261012000000_init_bookings';
