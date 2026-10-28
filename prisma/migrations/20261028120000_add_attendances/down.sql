-- Manual rollback: npx prisma db execute --file prisma/migrations/20261028120000_add_attendances/down.sql
DROP TABLE IF EXISTS `attendances`;

-- Let `prisma migrate deploy` re-apply this migration later
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261028120000_add_attendances';
