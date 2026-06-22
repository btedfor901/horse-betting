-- AlterTable: track which model rank the actual winner held
ALTER TABLE "RaceResult" ADD COLUMN "winnerModelRank" INTEGER;
