-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
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
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "defaultCutoffTime" TEXT NOT NULL DEFAULT '14:00',
    "defaultDailyCapacity" INTEGER NOT NULL DEFAULT 50,
    "defaultMaxDaysAhead" INTEGER NOT NULL DEFAULT 30,
    "enableWeekendDelivery" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "showOnCartPage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackoutDate" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryDayCount" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeliveryDayCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDeliveryCache" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN,
    "cutoffHours" INTEGER,
    "maxDaysAhead" INTEGER,
    "dailyCapacity" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDeliveryCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "variantId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "AddOn_shop_idx" ON "AddOn"("shop");

