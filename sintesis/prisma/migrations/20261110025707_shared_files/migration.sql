-- CreateTable
CREATE TABLE "shared_files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shared_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_files_expires_at_idx" ON "shared_files"("expires_at");
