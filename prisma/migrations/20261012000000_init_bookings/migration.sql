-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "booker_name" VARCHAR(100) NOT NULL,
    "division" VARCHAR(100) NOT NULL,
    "agenda" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_ends_at_idx" ON "bookings"("ends_at");

-- Hand-written: not expressible in Prisma schema
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_time_order" CHECK ("ends_at" > "starts_at");

-- Single room, half-open range: 09:00-10:00 and 10:00-11:00 may coexist
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_no_overlap"
    EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&);
