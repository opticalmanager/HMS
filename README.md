# Apex HMS & Clinical EMR (Enterprise Hospital Monolith)

A production-grade, monolithic Hospital Management System (HMS) and Electronic Medical Record (EMR) engineered for high-density clinical workflows, zero-latency ergonomics, multi-branch scalability, and compliance with the Ayushman Bharat Digital Mission (ABDM).

---

## 🏥 12 Core Hospital Modules (Healthray Reference Architecture)

1. **Reception & Token Board**: Live queue display, arrival tracking, token callouts with audio alerts.
2. **Appointments & Scheduling**: Doctor slot management, multi-department booking, priority categorization.
3. **OPD (Outpatient Department)**: Clinical consultation console, vitals recording, ICD-10 search, prescription (Rx) builder, lab investigation requests.
4. **IPD (Inpatient Department)**: Ward & bed occupancy visualizer, admission processing, bed transfers, nursing charts, discharge summaries.
5. **Patient Management & EMR**: Complete longitudinal medical records, UHID generation, ABHA ID linking, emergency contacts.
6. **Billing & Invoicing**: OPD/IPD invoices, advance deposits, split payments, Indian GST calculations, 80mm thermal receipt & A4 letterhead printing.
7. **Pharmacy & Inventory**: Medicine catalog, batch and expiry tracking, stock movements, Good Receipt Notes (GRN), low-stock reorder triggers.
8. **Diagnostic & Laboratory Services**: Tariff management, specimen tracking, pathology/radiology requests, test report dispatches.
9. **WhatsApp Patient Communication**: Meta WABA v20+ official integration for automated booking confirmations, prescription PDFs, and follow-up alerts.
10. **Staff & Doctor Directory**: Roster scheduling, medical license verification, specialization filtering, department assignment.
11. **Reports & Clinical Analytics**: Daily footfall, doctor consult volumes, bed turn-around times, revenue breakdown, GST summary.
12. **Audit Logs & System Settings**: Hospital branding, print layout setup, multi-branch configuration, and immutable PHI access audit trail.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, PostCSS, Radix UI Primitives, Lucide Icons, Shadcn (`base-nova` style)
- **Database & ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`), PostgreSQL via Supabase (Dual-URL connection pooler)
- **Authentication**: Supabase Auth (`@supabase/ssr`) with cryptographic HMAC-SHA256 offline fallback
- **Offline Storage**: Dexie.js (IndexedDB) for local clinical caching
- **WhatsApp Cloud API**: Official Meta Graph API v20+ service
- **National Health Stack**: ABDM FHIR R4 Milestone 1 & Milestone 2 adapter
- **Clinical Ergonomics**: Enter-as-Tab POS navigation, Ctrl+K command palette, in-memory ICD-10 dictionary

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `>= 20`
- PostgreSQL database (Supabase instance recommended)

### 2. Setup
```bash
# Clone and enter the repository
cd C:\Users\Gaurav\Desktop\HMS

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Run Drizzle schema migrations
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the clinical console.

---

## 📚 Documentation
Comprehensive architectural documentation is available in the [`docs/`](./docs) directory:
- [Architecture Overview](./docs/architecture.md)
- [Database Schema Specifications](./docs/database_schema.md)
- [RBAC Permission Matrix](./docs/rbac_matrix.md)
- [Clinical Modules Workflow](./docs/modules_workflow.md)
- [WhatsApp Cloud API Integration](./docs/waba_integration.md)
- [ABDM Integration Guide](./docs/abdm_integration.md)
- [Technology Stack Rationale](./docs/tech_stack.md)
- [Clinical Ergonomics & Print Rules](./docs/clinical_ergonomics.md)
