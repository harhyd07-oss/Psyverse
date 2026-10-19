ALTER TABLE "Registration" ADD COLUMN "rollNumber" TEXT;
CREATE UNIQUE INDEX "Registration_rollNumber_key" ON "Registration"("rollNumber");
