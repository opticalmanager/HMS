# Apex HMS & Clinical EMR — Engineering & Architecture Standards

> [!IMPORTANT]
> This monolith is an enterprise, high-density Hospital Management System & Electronic Medical Record (HMS / EMR) replicating all 12 operational modules scanned from Healthray (`ray.healthray.com`).

---

## 1. Architectural & Database Principles

1. **Monolithic Simplicity, High Cohesion**: Everything lives in this single repository for transactional atomicity, unified type systems, and rapid deployment. No distributed microservice fragmentation.
2. **Dual-URL Supabase PostgreSQL Database Architecture**:
   - `DATABASE_URL` connects through Supabase's transaction pooler (port 6543) with `prepare: false` to ensure leak-free serverless scalability.
   - `DIRECT_DATABASE_URL` connects directly to PostgreSQL (port 5432) for Drizzle Kit schema migrations and introspections.
3. **Resilient Clinical Continuity (Offline Mode)**:
   - When internet connectivity drops, local clinic workflows (Patient lookups, Vitals entry, Token queues, Rx caching) continue seamlessly via IndexedDB (Dexie.js).
   - Authentication falls back to cryptographic HMAC-SHA256 offline session validation (`lib/offline-auth.ts`).
4. **Official Meta WhatsApp Cloud API (WABA v20+)**:
   - All notifications (Appointment confirmations, Rx download links, IPD discharge summaries, Lab reports) use Meta's official Graph API endpoints. No unstable third-party scrapers or Baileys companions.
5. **NHA ABDM (Ayushman Bharat Digital Mission) FHIR R4 Standard**:
   - Conforms to NHA Milestone 1 (M1: ABHA creation & verification via Aadhaar/Mobile OTP) and Milestone 2 (M2: Care Context linking).
   - Includes `MockAbdmAdapter` for development and production sandbox interchangeability.

---

## 2. Core UI/UX & High-Density Design Guidelines (From Optical Manager)

1. **High-Density Proportions & Compact Spacing**:
   - Always design enterprise dashboards with compact, proportional spacing (Stripe/Linear/Vercel standard) to fit key metrics and tables onto standard laptop screens without vertical scroll fatigue.
   - Use `p-3.5` to `p-4` padding for KPI cards, `py-2.5 px-4` for table rows, and keep section gaps compact (`gap-3.5` to `gap-4`). Inputs must be `32px`–`36px` (`h-9`), `text-[13px]`.

2. **No Duplicate Action Buttons**:
   - Never duplicate primary call-to-action buttons (e.g. `+ New Appointment`, `+ Add Patient`, `+ Create Bill`) across both the sticky Topbar header and inner page headers. The sticky Topbar is the single primary source for top-level quick actions.

3. **Interactive KPI Selection States**:
   - Top metric/KPI cards must feature crisp hover states and active selection borders (`border-2 border-[#2563eb] shadow-md scale-[1.01]`).
   - Selecting a card must instantly filter/update the main table below with zero latency.

4. **Typography & Badge Hierarchy**:
   - Keep page titles crisp (`text-xl font-bold tracking-tight text-slate-900`) and metric values proportional (`text-2xl font-extrabold`).
   - Use soft HSL pill badges (`bg-blue-50 text-[#2563eb]`, `bg-emerald-50 text-emerald-600`, `bg-rose-50 text-rose-600`) with small sharp fonts (`text-[10px]` / `text-xs font-bold`).

5. **Universal Multi-Device Responsiveness**:
   - Every UI component developed must be 100% responsive across mobile, tablet, laptop, and desktop displays, adhering to modern clinical UI/UX design standards.

6. **Strict Clinical Ergonomics & Keyboard Navigation**:
   - **Enter-as-Tab Navigation**: Clinical staff and OPD receptionists navigate dense multi-field forms at POS speed using the Enter key without touching the mouse (`utils/form-navigation.ts`).
   - **Global Command Palette (`Ctrl+K`)**: Instant search for Patients (UHID/Phone), Doctors, Invoices, OPD Queue, and Beds from anywhere in the app.
   - **In-Memory ICD-10 Search**: Instant, zero-latency autocomplete for diagnosis codes (WHO ICD-10 classification).

7. **Zero-Positional Selectors & Strict Print Chrome Isolation**:
   - Never use positional DOM selectors (e.g. `> div:first-child`, `> div:nth-child(n)`, `> * > *`) in CSS or `<style>` blocks to target or hide external layout elements like sidebars, headers, or navbars.
   - All shell layout components (`Sidebar`, `Topbar`, modals) must declare their own print visibility explicitly using `print:hidden` or semantic data attributes (`[data-sidebar]`, `[data-topbar]`).
   - Unconstrained Print Reset (`@media print`):
     - A4 Letterheads: Clinical prescriptions, discharge summaries, and comprehensive invoices print cleanly with custom hospital headers, avoiding overflow clipping.
     - 80mm Thermal Slips: Token slips and quick billing receipts format cleanly with 0 margin waste.

---

## 3. Engineering Rigor & Codebase Quality Guidelines

1. **Zero-Latency & Optimized Codebase**:
   - Code must be highly optimized, efficient, free of unnecessary re-renders, and built for zero-latency clinical user experiences.
2. **Industry-Grade Database Management**:
   - Database schemas, Drizzle migrations, relational indexing, and service queries must be managed to enterprise/production standards.
3. **Backwards Compatibility & Feature Integrity**:
   - Never break existing functionality, routes, or workflows when adding new features, unless explicitly instructed by the user.
4. **Synchronized Documentation Maintenance (`docs/`)**:
   - Whenever performing any development, adding features, modifying database schemas, updating architecture, adding API endpoints, or configuring external services, you MUST simultaneously update the relevant documentation files inside the `docs/` directory (`docs/overview.md`, `docs/architecture.md`, `docs/tech_stack.md`, `docs/modules_workflow.md`, `docs/database_schema.md`, `docs/rbac_matrix.md`, `docs/api_contract.md`, `docs/clinical_ergonomics.md`). System documentation must always remain 100% synchronized with the live codebase.
5. **Minimal Compilation & Optimized Rendering Performance**:
   - Always write lightweight, modular code logic optimized for minimal compilation time and ultra-fast client/server rendering, eliminating heavy unused imports, redundant re-renders, and unnecessary runtime overhead.
6. **Automatic Cleanup of Obsolete & Unused Files/Code**:
   - Always immediately delete unused files, deprecated route handlers, dead components, or temporary runner scripts after creating replacement features or updating existing code. Never leave redundant, unused, or orphaned files in the codebase.
7. **Strict Input Field Typing & Datatype Enforcement**:
   - When creating or updating any input field, always ensure that only valid datatypes and strict input constraints are permitted (e.g. numeric-only restrictions for mobile numbers with 10-digit regional formatting and `onKeyPress`/`inputMode` restrictions, proper date controls for dates, structured email formatters). Never permit arbitrary string entry in fields requiring specific data formats.
8. **Strict Real Data & Zero Mock Data Policy (In Live Modules)**:
   - In production routes and components, never use hardcoded fake arrays or dummy placeholder data. All code deployed must strictly integrate with authentic database queries, live schema models, multi-tenant organization contexts, and real API/server actions. (Only designated testing mock adapters like `MockAbdmAdapter` are permitted for external sandbox simulation).
