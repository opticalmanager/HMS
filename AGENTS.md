# AGENTS.md — Clinic CRM Engineering & AI Safety Rules

Always read `docs/architecture.md` before proposing changes or writing code. You are working on a **multi-tenant healthcare Clinic CRM** with real clinical, financial, and patient-privacy risks. Correctness, tenant isolation, and clinical safety override speed.

---

## 1. Execution & Planning Protocol

1. **Inspect Before Editing:** Before writing code for any new feature, inspect `package.json`, the database schema/ORM (Prisma or Drizzle), and existing routes/components. Never guess table names, column names, or library versions.
2. **Plan First on Multi-File Tasks:** For any feature touching more than 2 files or modifying database schemas, output a concise file-by-file plan and wait for confirmation before editing.
3. **One Phase at a Time:** Follow the phased roadmap in `docs/architecture.md`. Do NOT scaffold future phases (e.g., Dograh routes, Redis semantic cache, or MCP endpoints) unless explicitly requested in the current task.
4. **No Silent Scope Expansion:** Do not refactor unrelated UI pages, change styling libraries, or upgrade major packages without asking.
5. **Mandatory Documentation Update on Every Feature:** Whenever implementing, updating, or refactoring any feature, database schema, API route, or workflow, you MUST immediately update the corresponding documentation files in the `docs/` directory. Never treat documentation as an afterthought—code changes and docs updates must happen in lockstep to maintain an accurate project audit trail.

---

## 2. Non-Negotiable Multi-Tenancy & Auth Laws

1. **Better Auth Only:** Use Better Auth (`lib/auth.ts`) with the `organization` plugin (`1 organization = 1 clinic`) and `@better-auth/drizzle-adapter`. Never implement custom hand-rolled JWT login/session systems for web users.
2. **Zero Client Trust for Tenancy:** NEVER read `clinicId`, `organizationId`, `userId`, or `role` from client request bodies, URL query parameters, or LLM tool arguments. Always derive them server-side via `requireClinicSession()` (`lib/auth-guard.ts`) or verified API-key + identity resolution (integrations).
3. **Mandatory Tenant Scoping:** EVERY PostgreSQL `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `pgvector` similarity search MUST explicitly filter by `clinicId` (mapped to `organizationId`). No exceptions.
4. **RBAC Enforcement in Code, Never Prompts:** Enforce role permissions (`owner`, `admin`, `doctor`, `receptionist`) using Better Auth's `createAccessControl` (`lib/auth-permissions.ts`) in server middleware, domain services, and route guards. Never rely on system prompt instructions to restrict data access.
5. **NextCookies Plugin Required:** Always ensure `nextCookies()` from `better-auth/next-js` is included as the last plugin in `lib/auth.ts` for safe cookie mutation in Next.js 16 App Router.
6. **Hard Tool Segregation:** When serving MCP tools or agent function definitions, physically omit staff/doctor tools from the tool list for `patient` sessions.

---

## 3. Database, Concurrency & Data Integrity Laws

1. **Single Domain Service Layer:** Never put raw database queries or core business logic directly inside Next.js API routes, Server Actions, Copilot orchestrators, or MCP tool handlers. All channels MUST call `src/services/domain/*`.
2. **Atomic Concurrency for Bookings:** Appointment creation must run inside a database transaction that checks `doctor_slot_blocks` and relies on the partial unique index `(clinic_id, doctor_id, slot_start) WHERE status IN ('CONFIRMED', 'CHECKED_IN')`. Handle unique violation (`23505`) gracefully by returning alternative open slots.
3. **Idempotency on External Writes:** External booking endpoints and MCP `book_appointment` tools MUST support `idempotency_key` so retries never create duplicate appointments or duplicate WhatsApp messages.
4. **Timezone Discipline:** Store all timestamps in PostgreSQL as `TIMESTAMPTZ` (UTC). Convert to the clinic's configured timezone (`clinic_profiles.timezone`, default `Asia/Kolkata`) only for slot display and AI prompt formatting.
5. **No Raw Unparameterized SQL:** Always use ORM query builders or strictly parameterized queries (especially for `pgvector` and `pg_trgm` queries).
6. **Transactional Outbox for Notifications:** Never couple booking commits directly to synchronous third-party WhatsApp HTTP calls. Write notification events to `webhook_outbox` (or trigger asynchronously after DB commit) so a Broadcast Manager outage never breaks appointment booking.

---

## 4. Clinical Safety & AI Engineering Laws

1. **Mandatory Human-in-the-Loop (HITL) for Clinical & Financial Writes:** AI voice dictation MUST ONLY create `DRAFT` prescriptions and `DRAFT` invoices. An LLM must NEVER directly finalize a prescription, alter an approved medical record, or issue a final bill without explicit doctor/staff confirmation.
2. **Deterministic Grounding for Drugs & Prices:** Never trust LLM-generated medicine spellings or service prices blindly. Always fuzzy-match extracted items against `medicine_master` and `service_tariffs` (`clinic_id`-scoped), pull official clinic prices from DB, and mark low-confidence matches with `needsReview: true`.
3. **Structured Outputs with Zod:** Every LLM call that returns structured data (extraction, routing, classification) MUST be validated with a strict Zod schema. Handle parse failures with a controlled retry or fallback—never pass unvalidated LLM JSON to the database or UI.
4. **Anti-Hallucination & Patient Medical Boundaries:**
   - RAG and tool-backed prompts must instruct the model to answer strictly from provided context/tool results and say when information is unavailable.
   - Patient-facing AI (WhatsApp & Voice) must NEVER diagnose conditions, prescribe medicines, or alter dosages; emergency symptoms must immediately direct the user to call emergency services or visit a hospital.
5. **LLM Timeouts & Iteration Caps:** Every external LLM/STT HTTP call must specify explicit timeouts, bounded retries, and a hard max tool-call loop limit (default: 5 iterations) to prevent infinite agent loops and runaway token spend.

---

## 5. MCP Server & Multi-Channel Laws

1. **Typed Contracts:** Every MCP tool must define strict Zod input schemas with clear descriptions and return concise, structured text/JSON outputs.
2. **Graceful Error Data:** Expected business failures inside MCP tools (slot unavailable, clinic closed, appointment not found) must return `{ isError: true, content: [...] }` with actionable next steps—never throw unhandled exceptions that break the agent loop.
3. **Two-Step Destructive Actions:** Destructive or high-impact tools like `block_doctor_slot` MUST require a `dryRun: true` conflict check first when overlapping patient appointments exist before executing `dryRun: false`.
4. **Voice-Friendly Payloads:** Tools shared with voice agents (`get_available_slots`, `list_doctors`) must return compact responses (max 3-5 slots/items, clean readable dates/times) to minimize latency and LLM token bloat.
5. **Channel Decoupling:** Voice agents (Dograh) must never call WhatsApp Broadcast Manager directly. All booking confirmations flow exclusively through the CRM notification event pipeline.

---

## 6. Security, Guardrails & Caching Laws

1. **Input/Output Guardrails:** Run input sanitization (length limits, prompt-injection heuristics) before invoking LLMs, and validate outputs before returning to users or executing tool writes.
2. **Treat Tool & DB Text as Untrusted:** Patient names, notes, and uploaded clinic documents can contain indirect prompt injection. Keep system instructions strictly separated from retrieved RAG/DB content.
3. **Safe Semantic Caching Only:** If semantic caching is enabled, ONLY cache stateless `PUBLIC_CLINIC_FAQ` queries namespaced by `clinicId` and `knowledgeVersion`. NEVER cache personalized queries (appointments, schedules, bills, prescriptions, or patient lookups).
4. **Zero PHI/PII in Debug Logs:** Never `console.log` full patient transcripts, phone numbers, prescriptions, or raw auth tokens/API keys in production logs. Redact sensitive fields in telemetry and error reports.

---

## 7. Next.js, TypeScript & VPS Portability Laws

1. **Strict TypeScript:** No `any` in domain services, auth guards, or MCP tool handlers. Share Zod schemas and inferred types across backend and frontend.
2. **Environment Portability (Vercel -> VPS):** Never hardcode `localhost` or Vercel-specific domains/APIs. Drive all base URLs, DB URLs, secrets, and webhook endpoints from validated environment variables (`src/lib/env.ts` using Zod). Avoid Vercel-only runtime lock-in so the app builds cleanly with `output: "standalone"` in Docker.
3. **Server/Client Boundaries:** Keep all DB clients, Better Auth server logic, LLM API keys, and webhook signing secrets strictly in server-only modules (`import "server-only"`).

---

## 8. Mandatory Pre-Completion Checklist

Before marking any task complete, verify and report:
- [ ] All new/modified DB queries enforce `clinic_id` scoping.
- [ ] Every protected route and Server Action calls `requireClinicSession()` (or verified service auth) with the right RBAC permission.
- [ ] Business logic lives in `src/services/domain/*`, not duplicated inside routes or MCP handlers.
- [ ] Zod validates all external inputs and LLM outputs.
- [ ] TypeScript compiles cleanly (`npm run typecheck` / `tsc --noEmit`) and migrations (if any) are safe and reversible.
- [ ] No secrets, PII, or raw transcripts are logged.
- [ ] Relevant documentation files in `docs/` are updated to reflect the new feature, schema, route, or workflow changes.

---

## 9. Developer Machine Hardware Safeguards (Zero Local Docker Policy)

1. **Host Hardware Constraints**:
   - The development laptop runs an **Intel Core i3-7020U (2 cores, 4 threads @ 2.30 GHz)** with **8.0 GB RAM** and **critically low primary drive space (~10 GB free on `C:`)**.
2. **Strict Prohibition of Local Docker Desktop**:
   - **NEVER install or run Docker Desktop or WSL2 virtual machine disks locally on this machine.** Docker images and WSL2 `ext4.vhdx` virtual disks will exhaust the remaining 10 GB on `C:` and cause Windows system crashes and Out-Of-Memory (OOM) freezing.
3. **Lightweight Local Execution**:
   - Local development is strictly restricted to **Node.js runtime (`npm run dev`) via Next.js Turbopack**, consuming only ~400–500 MB of RAM.
   - All containerized workloads (Dograh, production PostgreSQL) reside exclusively on the VPS.

---

## 10. Clinical UI/UX, High-Density Ergonomics & Code Quality

1. **High-Density Proportions & Compact Spacing**:
   - Design enterprise dashboards with compact, proportional spacing (Stripe/Linear/Vercel standard) to fit key metrics and tables onto standard laptop screens without vertical scroll fatigue.
   - Use `p-3.5` to `p-4` padding for KPI cards, `py-2.5 px-4` for table rows, and keep section gaps compact (`gap-3.5` to `gap-4`). Inputs must be `32px`–`36px` (`h-9`), `text-[13px]`.
2. **No Duplicate Action Buttons**:
   - Never duplicate primary call-to-action buttons (e.g. `+ New Appointment`, `+ Add Patient`, `+ Create Bill`) across both the sticky Topbar header and inner page headers.
3. **Enter-as-Tab Navigation & Keyboard Shortcuts**:
   - Clinical staff and OPD receptionists navigate dense multi-field forms at POS speed using the Enter key without touching the mouse (`utils/form-navigation.ts`).
   - Global Command Palette (`Ctrl+K`): Instant search for Patients (UHID/Phone), Doctors, Invoices, OPD Queue, and Beds from anywhere in the app.
4. **Zero-Positional Selectors & Strict Print Isolation**:
   - Never use positional DOM selectors (e.g. `> div:first-child`, `> * > *`) in CSS.
   - Layout components must declare their own print visibility explicitly using `print:hidden` or semantic attributes (`[data-sidebar]`, `[data-topbar]`).
5. **Synchronized Documentation Maintenance & Tracking (`docs/`):**
   - System documentation in `docs/` must always remain 100% synchronized with the live codebase after every feature update:
     - **Database updates (Drizzle schema/migrations):** Update `docs/database_schema.md`.
     - **API routes & Server Actions:** Update `docs/api_contract.md`.
     - **Roles, permissions, or access control:** Update `docs/rbac_matrix.md`.
     - **Feature workflows, user flows, UI screens:** Update `docs/modules_workflow.md`.
     - **System architecture, external services, or core stack:** Update `docs/architecture.md` and `docs/tech_stack.md`.
     - **Overall project status & module completion:** Update `docs/overview.md`.
   - Never consider a feature complete until its corresponding documentation in `docs/` has been updated to maintain an accurate project audit trail.
6. **Mandatory Navigation Exposure for Every Screen (Zero Orphan Pages Rule)**:
   - Whenever any new screen or sub-route is implemented in `app/`, it is strictly prohibited to leave it as an orphan URL accessible only by typing the address bar.
   - Every new route MUST simultaneously be wired into:
     1. **The primary sidebar navigation (`AppSidebar.tsx`)**: Either as a top-level module or nested under an expandable active parent tree.
     2. **The module's shared sub-navigation/tab bar (`SettingsNav.tsx` or parent module tab strip)**: Permitting 1-click horizontal switching between all sibling subpages.
     3. **The Global Command Palette (`CommandPalette.tsx` / `Ctrl+K`)**: With search keywords and descriptions.
     4. **The Topbar user menu (`AppTopbar.tsx`) or parent dashboard quick action cards**.
   - No task touching UI routes may be marked complete without verifying that users can reach the page in 1–2 clicks from anywhere in the application.
