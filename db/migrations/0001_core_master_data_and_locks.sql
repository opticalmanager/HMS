-- 0001_core_master_data_and_locks.sql
-- Step 2: Core Master Data, Concurrency Locks & pg_trgm Fuzzy Search

-- 1. PostgreSQL Extension: pg_trgm for fast fuzzy matching on medicine & tariff names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Clinic Profiles Table (1-to-1 with organization)
CREATE TABLE IF NOT EXISTS "clinic_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
  "default_slot_minutes" integer DEFAULT 15 NOT NULL,
  "working_hours_json" jsonb,
  "waba_id" text UNIQUE,
  "broadcast_webhook_url" text,
  "broadcast_api_key_enc" text,
  "gstin" text,
  "invoice_prefix" text DEFAULT 'INV' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "clinic_profiles_org_id_idx" ON "clinic_profiles"("organization_id");

-- 3. Doctors Table
CREATE TABLE IF NOT EXISTS "doctors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "full_name" text NOT NULL,
  "specialty" text NOT NULL,
  "phone_e164" text,
  "consultation_fee" numeric(10, 2) DEFAULT '500.00' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "doctors_organization_id_idx" ON "doctors"("organization_id");
CREATE INDEX IF NOT EXISTS "doctors_org_phone_idx" ON "doctors"("organization_id", "phone_e164");
CREATE UNIQUE INDEX IF NOT EXISTS "doctors_org_user_unique_idx" ON "doctors"("organization_id", "user_id") WHERE user_id IS NOT NULL;

-- 4. Doctor Schedules & Slot Blocks
CREATE TABLE IF NOT EXISTS "doctor_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "day_of_week" smallint NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "slot_duration_mins" integer DEFAULT 15 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "doctor_schedules_start_before_end" CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS "doctor_schedules_org_id_idx" ON "doctor_schedules"("organization_id");
CREATE INDEX IF NOT EXISTS "doctor_schedules_org_doctor_idx" ON "doctor_schedules"("organization_id", "doctor_id");

CREATE TABLE IF NOT EXISTS "doctor_slot_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "reason" text,
  "created_via" text DEFAULT 'WEB' NOT NULL,
  "created_by_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "doctor_slot_blocks_org_id_idx" ON "doctor_slot_blocks"("organization_id");
CREATE INDEX IF NOT EXISTS "doctor_slot_blocks_org_doc_range_idx" ON "doctor_slot_blocks"("organization_id", "doctor_id", "start_at", "end_at");

-- 5. Master Catalog: Medicines & Service Tariffs
CREATE TABLE IF NOT EXISTS "medicine_master" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "brand_name" text NOT NULL,
  "generic_name" text NOT NULL,
  "strength" text,
  "form" text NOT NULL,
  "default_dosage" text,
  "default_frequency" text,
  "default_duration_days" integer,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "medicine_master_organization_id_idx" ON "medicine_master"("organization_id");
CREATE INDEX IF NOT EXISTS "medicine_master_brand_trgm_idx" ON "medicine_master" USING gin ("brand_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "medicine_master_generic_trgm_idx" ON "medicine_master" USING gin ("generic_name" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "service_tariffs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
  "hsn_sac_code" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "service_tariffs_organization_id_idx" ON "service_tariffs"("organization_id");
CREATE INDEX IF NOT EXISTS "service_tariffs_name_trgm_idx" ON "service_tariffs" USING gin ("name" gin_trgm_ops);

-- 6. Prescriptions Table
CREATE TABLE IF NOT EXISTS "prescriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
  "doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "raw_transcript" text,
  "chief_complaint" text,
  "diagnosis" text,
  "items_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "follow_up_date" timestamp with time zone,
  "approved_by_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "prescriptions_organization_id_idx" ON "prescriptions"("organization_id");
CREATE INDEX IF NOT EXISTS "prescriptions_patient_id_idx" ON "prescriptions"("patient_id");
CREATE INDEX IF NOT EXISTS "prescriptions_doctor_id_idx" ON "prescriptions"("doctor_id");

-- 7. Webhook Outbox Table
CREATE TABLE IF NOT EXISTS "webhook_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "next_retry_at" timestamp with time zone,
  "last_error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "webhook_outbox_org_id_idx" ON "webhook_outbox"("organization_id");
CREATE INDEX IF NOT EXISTS "webhook_outbox_status_retry_idx" ON "webhook_outbox"("status", "next_retry_at") WHERE status IN ('PENDING', 'FAILED');

-- 8. AI Audit Logs Table
CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "trace_id" text NOT NULL,
  "channel" text NOT NULL,
  "actor_role" text,
  "actor_id" text,
  "action_type" text NOT NULL,
  "model" text,
  "tool_calls_json" jsonb,
  "latency_ms" integer,
  "tokens_in" integer DEFAULT 0 NOT NULL,
  "tokens_out" integer DEFAULT 0 NOT NULL,
  "estimated_cost_usd" numeric(10, 6) DEFAULT '0.000000',
  "status" text NOT NULL,
  "error_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ai_audit_logs_organization_id_idx" ON "ai_audit_logs"("organization_id");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_trace_id_idx" ON "ai_audit_logs"("trace_id");

-- 9. Alter Existing Tables (patients, appointments, invoices)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "phone_e164" text;
CREATE UNIQUE INDEX IF NOT EXISTS "patients_org_phone_e164_unique_idx" ON "patients"("organization_id", "phone_e164") WHERE phone_e164 IS NOT NULL;

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "slot_start" timestamp with time zone;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "slot_end" timestamp with time zone;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'WEB' NOT NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "appointments" ALTER COLUMN "branch_id" DROP NOT NULL;

-- If appointments has an old FK constraint to profiles, drop it safely and re-point to doctors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_doctor_id_profiles_id_fk'
      AND table_name = 'appointments'
  ) THEN
    ALTER TABLE "appointments" DROP CONSTRAINT "appointments_doctor_id_profiles_id_fk";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_doctor_id_doctors_id_fk'
      AND table_name = 'appointments'
  ) THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "appointments_doctor_slot_concurrency_idx" ON "appointments"("organization_id", "doctor_id", "slot_start")
WHERE status IN ('scheduled', 'arrived', 'in_consultation') AND slot_start IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "appointments_idempotency_key_idx" ON "appointments"("organization_id", "idempotency_key")
WHERE idempotency_key IS NOT NULL;

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ISSUED' NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL;
