-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'disputed');

-- CreateTable
CREATE TABLE "listing_requests" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "provider_response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "listing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_requests_listing_id_idx" ON "listing_requests"("listing_id");

-- CreateIndex
CREATE INDEX "listing_requests_client_id_status_idx" ON "listing_requests"("client_id", "status");

-- CreateIndex
CREATE INDEX "listing_requests_provider_id_status_idx" ON "listing_requests"("provider_id", "status");

-- CreateIndex
CREATE INDEX "listing_requests_client_id_created_at_idx" ON "listing_requests"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "listing_requests_provider_id_created_at_idx" ON "listing_requests"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "listing_requests_status_created_at_idx" ON "listing_requests"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "listing_requests" ADD CONSTRAINT "listing_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_requests" ADD CONSTRAINT "listing_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_requests" ADD CONSTRAINT "listing_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
