-- CreateTable
CREATE TABLE "RaceDay" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'Churchill Downs',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "raceDayId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "postTime" TEXT,
    "distance" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "raceType" TEXT NOT NULL,
    "purse" TEXT,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorseEntry" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "programNumber" TEXT,
    "postPosition" INTEGER NOT NULL,
    "horseName" TEXT NOT NULL,
    "morningLineOdds" TEXT,
    "currentOdds" TEXT,
    "jockeyName" TEXT,
    "jockeyWinPct" DOUBLE PRECISION,
    "trainerName" TEXT,
    "trainerWinPct" DOUBLE PRECISION,
    "owner" TEXT,
    "weight" INTEGER,
    "medication" TEXT,
    "equipment" TEXT,
    "runStyle" TEXT,
    "daysOff" INTEGER,
    "avgSpeed" DOUBLE PRECISION,
    "bestSpeed" DOUBLE PRECISION,
    "backSpeed" DOUBLE PRECISION,
    "speedLR" DOUBLE PRECISION,
    "primePower" DOUBLE PRECISION,
    "avgClass" DOUBLE PRECISION,
    "lastClass" DOUBLE PRECISION,
    "earlyPace1" DOUBLE PRECISION,
    "earlyPace2" DOUBLE PRECISION,
    "latePace" DOUBLE PRECISION,
    "avgDistance" DOUBLE PRECISION,
    "angles" TEXT,
    "scratched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelScore" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "horseEntryId" TEXT NOT NULL,
    "speedScore" DOUBLE PRECISION NOT NULL,
    "classScore" DOUBLE PRECISION NOT NULL,
    "formScore" DOUBLE PRECISION NOT NULL,
    "paceScore" DOUBLE PRECISION NOT NULL,
    "jockeyScore" DOUBLE PRECISION NOT NULL,
    "trainerScore" DOUBLE PRECISION NOT NULL,
    "postScore" DOUBLE PRECISION NOT NULL,
    "valueScore" DOUBLE PRECISION NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "modelProbability" DOUBLE PRECISION NOT NULL,
    "impliedProbability" DOUBLE PRECISION NOT NULL,
    "valueRating" DOUBLE PRECISION NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetRecommendation" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "horses" TEXT NOT NULL,
    "horseIds" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "costPerCombination" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "scoreLead" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "orderOfFinish" TEXT NOT NULL,
    "betPlaced" TEXT NOT NULL,
    "amountWagered" DOUBLE PRECISION NOT NULL,
    "amountReturned" DOUBLE PRECISION NOT NULL,
    "profitLoss" DOUBLE PRECISION NOT NULL,
    "winPayout" DOUBLE PRECISION,
    "placePayout" DOUBLE PRECISION,
    "showPayout" DOUBLE PRECISION,
    "exactaPayout" DOUBLE PRECISION,
    "trifectaPayout" DOUBLE PRECISION,
    "superfectaPayout" DOUBLE PRECISION,
    "notes" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankrollSnapshot" (
    "id" TEXT NOT NULL,
    "raceDayId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankrollSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataImportLog" (
    "id" TEXT NOT NULL,
    "raceId" TEXT,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "rawData" JSONB,
    "normalizedData" JSONB,

    CONSTRAINT "DataImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "startingBankroll" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "currentBankroll" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "unitSize" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "maxBetPerRace" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "dailyStopLoss" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "dailyProfitTarget" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "maxBetsPerDay" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaceDay_date_track_key" ON "RaceDay"("date", "track");

-- CreateIndex
CREATE UNIQUE INDEX "Race_raceDayId_number_key" ON "Race"("raceDayId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ModelScore_horseEntryId_key" ON "ModelScore"("horseEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "BetRecommendation_raceId_key" ON "BetRecommendation"("raceId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceId_key" ON "RaceResult"("raceId");

-- CreateIndex
CREATE UNIQUE INDEX "DataImportLog_raceId_key" ON "DataImportLog"("raceId");

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_raceDayId_fkey" FOREIGN KEY ("raceDayId") REFERENCES "RaceDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorseEntry" ADD CONSTRAINT "HorseEntry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelScore" ADD CONSTRAINT "ModelScore_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelScore" ADD CONSTRAINT "ModelScore_horseEntryId_fkey" FOREIGN KEY ("horseEntryId") REFERENCES "HorseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetRecommendation" ADD CONSTRAINT "BetRecommendation_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankrollSnapshot" ADD CONSTRAINT "BankrollSnapshot_raceDayId_fkey" FOREIGN KEY ("raceDayId") REFERENCES "RaceDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataImportLog" ADD CONSTRAINT "DataImportLog_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE SET NULL ON UPDATE CASCADE;
