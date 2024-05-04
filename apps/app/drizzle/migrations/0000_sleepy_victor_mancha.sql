CREATE TABLE IF NOT EXISTS "clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user" serial NOT NULL,
	"video" text NOT NULL,
	"start" numeric NOT NULL,
	"end" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"image" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_idx" ON "users" ("email");