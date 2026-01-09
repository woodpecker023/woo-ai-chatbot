CREATE TABLE IF NOT EXISTS "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_chunks_document_id_idx" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_chunks_store_id_idx" ON "document_chunks" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_store_id_idx" ON "documents" USING btree ("store_id");