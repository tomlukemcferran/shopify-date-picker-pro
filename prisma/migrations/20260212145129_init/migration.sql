-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "defaultCutoffTime" TEXT NOT NULL DEFAULT '14:00',
    "defaultDailyCapacity" INTEGER NOT NULL DEFAULT 50,
    "defaultMaxDaysAhead" INTEGER NOT NULL DEFAULT 30,
    "enableWeekendDelivery" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "showOnCartPage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BlackoutDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeliveryDayCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ProductDeliveryCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN,
    "cutoffHours" INTEGER,
    "maxDaysAhead" INTEGER,
    "dailyCapacity" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSettings_shop_key" ON "GlobalSettings"("shop");

-- CreateIndex
CREATE INDEX "BlackoutDate_shop_idx" ON "BlackoutDate"("shop");

-- CreateIndex
CREATE INDEX "BlackoutDate_shop_date_idx" ON "BlackoutDate"("shop", "date");

-- CreateIndex
CREATE INDEX "DeliveryDayCount_shop_idx" ON "DeliveryDayCount"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDayCount_shop_date_key" ON "DeliveryDayCount"("shop", "date");

-- CreateIndex
CREATE INDEX "ProductDeliveryCache_shop_idx" ON "ProductDeliveryCache"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDeliveryCache_shop_productId_key" ON "ProductDeliveryCache"("shop", "productId");
