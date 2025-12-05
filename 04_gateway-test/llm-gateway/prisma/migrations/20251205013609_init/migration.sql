/*
  Warnings:

  - You are about to drop the column `cost` on the `UsageLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ApiKey_keyHash_key";

-- CreateTable
CREATE TABLE "MonitorToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitorToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "providerCost" REAL,
    "margin" REAL,
    "totalCost" REAL,
    "estimatedCost" REAL,
    "endpoint" TEXT,
    "isStreaming" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "statusCode" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'passthrough',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsageLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UsageLog" ("apiKeyId", "id", "inputTokens", "latencyMs", "model", "orgId", "outputTokens", "provider", "requestedAt", "statusCode") SELECT "apiKeyId", "id", "inputTokens", "latencyMs", "model", "orgId", "outputTokens", "provider", "requestedAt", "statusCode" FROM "UsageLog";
DROP TABLE "UsageLog";
ALTER TABLE "new_UsageLog" RENAME TO "UsageLog";
CREATE INDEX "UsageLog_orgId_requestedAt_idx" ON "UsageLog"("orgId", "requestedAt");
CREATE INDEX "UsageLog_provider_model_idx" ON "UsageLog"("provider", "model");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MonitorToken_tokenHash_idx" ON "MonitorToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
