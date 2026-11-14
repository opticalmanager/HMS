# Apex HMS — Technology Stack Rationale

## 1. Full-Stack Framework & Core Libraries

| Technology | Version | Operational Purpose | Architecture Rationale |
|---|---|---|---|
| **Next.js** | `16.2.4` | App Router Full-Stack Framework | Turbopack compilation, React Server Components (RSC), asynchronous cookies, server action body limits (15MB). |
| **React** | `19.2.4` | Core UI Rendering Engine | Seamless hydration, actions, and server-side streaming without client waterfall delays. |
| **TypeScript** | `^5.0.0` | End-to-End Type Safety | Unified type contracts across database schemas, API routes, and clinical form props. |
| **Drizzle ORM** | `^0.40.1` | Relational Database ORM | Zero-overhead SQL generation, strict TypeScript type inference, and instant relational queries. |
| **Drizzle Kit** | `^0.31.1` | Schema Migration CLI | Fast declarative migrations and database inspection via direct session connection (`DIRECT_DATABASE_URL`). |
| **PostgreSQL** | `^3.4.5` (driver) | Relational Database | ACID compliant, high-concurrency transactional database hosted on Supabase. |
| **Supabase SSR** | `^0.6.1` | Authentication & Session Management | Modern cookie-based authentication supporting Next.js 16 async cookie storage. |
| **Dexie.js** | `^4.4.5` | Client-Side Offline Database (IndexedDB) | Reactive IndexedDB wrapper for local patient caching and offline queue management. |
| **Tailwind CSS** | `^4.0.0` | Styling & Design System | High-density utility styling with CSS theme variables, zero-runtime overhead. |
| **Lucide React** | `^0.487.0` | Clinical & System Icons | Consistent, lightweight vector icon suite for all 12 hospital modules. |
| **TanStack Table** | `^8.21.2` | Data Table Logic | Headless sorting, filtering, and pagination for high-volume patient and billing registers. |

---

## 2. Infrastructure & External Services

- **Supabase PostgreSQL Dual-URL Setup**:
  - Pooler URL (Port 6543): `prepare: false` for serverless concurrency.
  - Direct URL (Port 5432): For Drizzle Kit migrations.
- **Meta WhatsApp Cloud API (WABA v20+)**: Official Graph API endpoints for reliable transactional messaging.
- **ABDM (National Health Authority Sandbox)**: REST API gateway adhering to NHA Milestone 1 & 2 FHIR R4 standard.
