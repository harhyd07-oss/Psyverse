CREATE TABLE "Registration" ("id" TEXT NOT NULL,"fullName" TEXT NOT NULL,"email" TEXT NOT NULL,"department" TEXT NOT NULL,"yearOfStudy" TEXT NOT NULL,"phone" TEXT,"accessibilityRequest" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Registration_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Registration_email_key" ON "Registration"("email");
CREATE TABLE "AnonymousThought" ("id" TEXT NOT NULL,"message" VARCHAR(1500) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AnonymousThought_pkey" PRIMARY KEY ("id"));
