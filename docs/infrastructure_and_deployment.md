# Apex HMS & Clinical EMR — Infrastructure, Database & Deployment Blueprint

> [!IMPORTANT]
> This document establishes the complete infrastructure, development-to-production lifecycle, database portability standard, and hardware safeguards for the Apex HMS monolith and its ecosystem (Dograh Voice AI, WhatsApp CRM, and Cloudflare R2).

---

## 1. Architectural Topology Overview

The system is decoupled into a **lightweight local development environment** and a **centralized cloud/VPS production infrastructure**. This eliminates local machine bottlenecks while maintaining 100% production fidelity.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT PHASE (Laptop)                              │
│                                                                                   │
│   • Intel Core i3-7020U (2 Cores, 4 Threads) | 8 GB RAM | Windows 11              │
│   • Next.js 16 Monolith (`npm run dev` with Turbopack)                           │
│   • RAM Footprint: ~400 MB to 500 MB (Snappy, responsive, zero local lag)         │
│   • ZERO Docker Containers locally                                                │
└────────────────────────────┬─────────────────────────────┬────────────────────────┘
                             │                             │
             DATABASE_URL    │                             │  DOGRAH_API_URL / WS
     (SSL / Tailscale Mesh)  ▼                             ▼  (Encrypted WebRTC)
┌────────────────────────────────────────┐     ┌────────────────────────────────────┐
│      DEVELOPMENT POSTGRESQL            │     │          DOGRAH VOICE AI           │
│  Option A: Supabase / Neon Free Tier   │     │  Hosted directly on the 8 GB VPS   │
│  Option B: VPS `hms_dev` via Tailscale │     │  with open WebRTC ports & Docker   │
└────────────────────────────────────────┘     └────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────────────────────

┌───────────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION PHASE (Single 8 GB VPS)                         │
│                                                                                   │
│  Ubuntu 24.04 LTS | 4 vCPU / 8 GB RAM / NVMe SSD                                  │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Reverse Proxy & SSL: Nginx / Caddy (Let's Encrypt Automatic HTTPS)          │  │
│  └───────┬─────────────────────────────────┬───────────────────────────┬───────┘  │
│          │                                 │                           │          │
│          ▼                                 ▼                           ▼          │
│  ┌───────────────────────┐     ┌───────────────────────┐   ┌───────────────────┐  │
│  │ 1. Apex HMS Next.js   │     │ 2. Dograh Voice AI    │   │ 3. WACRM Backend  │  │
│  │    EMR Monolith       │     │    WebRTC / Telephony │   │    Meta Cloud API │  │
│  │    (~500 MB RAM)      │     │    (~2.5 - 3.5 GB RAM)│   │    (~350 MB RAM)  │  │
│  └───────────┬───────────┘     └───────────┬───────────┘   └───────────┬───────┘  │
│              │                             │                           │          │
│              └──────────────────────┬──────┴───────────────────────────┘          │
│                                     │ Internal Docker Network                     │
│                                     ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ 4. PostgreSQL 16 Central Engine (~400 MB to 600 MB RAM)                     │  │
│  │    ├─ `hms_prod`   : Live clinical records, OPD, appointments, pharmacy     │  │
│  │    ├─ `hms_dev`    : Staging & active local developer testing               │  │
│  │    ├─ `dograh_db`  : Voice agent logs, call recordings, telephony state     │  │
│  │    └─ `wacrm_prod` : WhatsApp messaging logs, patient templates             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  Total VPS Memory Consumption: ~4.5 GB to 5.8 GB out of 8 GB (Ample Headroom)     │
└───────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ Direct Uploads / Presigned URLs
┌───────────────────────────────────────────────────────────────────────────────────┐
│                 EXTERNAL STORAGE: Cloudflare R2 Object Storage                    │
│  • S3-Compatible API | 10 GB Free Tier | $0 Egress Bandwidth                      │
│  • Holds all X-Rays, Lab Reports, Rx PDFs, Clinical Scans, and Audio Records      │
│  • Zero disk storage used on VPS or local laptop                                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Local Machine Hardware Profile & "Zero Local Docker" Rule

### Verified Hardware Audit
- **CPU**: Intel Core i3-7020U @ 2.30 GHz (2 Cores, 4 Logical Threads, 15W TDP).
- **RAM**: 8.0 GB Physical RAM (~7.87 GB visible, ~1.0 GB available under normal desktop load).
- **Primary Disk (`C:`)**: 156.6 GB partition with **only ~10.25 GB free space**.
- **Secondary Disk (`D:`)**: 250.0 GB partition with **84.2 GB free space**.

### The Rule
> [!CAUTION]
> **Strict Prohibition of Local Docker Desktop**:
> Under no circumstances should Docker Desktop or WSL2 virtual machine disks (`ext4.vhdx`) be installed on the `C:` drive of this laptop. Pulling multi-container stacks (Dograh, Postgres, Redis) requires 10–15 GB of disk space and 4+ GB of RAM, which will fill `C:` to 0 bytes and cause system-wide Windows freezing and Out-Of-Memory (OOM) crashes.

### Developer Workflow on the Laptop
1. Run Next.js directly via standard Node.js:
   ```bash
   npm run dev
   ```
2. The Node process runs with Turbopack on Windows, consuming only **~400 MB RAM**.
3. Point `.env.local` to the remote development database (Supabase free tier or VPS `hms_dev`).

---

## 3. Database Architecture & Portability Protocol

### Zero Vendor Lock-In Standard
To guarantee that Apex HMS can run on Supabase during development and transition seamlessly to self-hosted PostgreSQL on the VPS without code changes:
1. **Drizzle ORM as Single Source of Truth**: All schemas, relations, indexes, and enums reside exclusively in `db/schema.ts`.
2. **Standard PostgreSQL SQL**: No reliance on Supabase-proprietary triggers, edge functions, or internal extensions.
3. **No Foreign Keys to Proprietary Schemas**: Never reference `auth.users(id)`. All user relationships link to `public.users(id)`.

### Multi-Database Isolation on VPS PostgreSQL
A single PostgreSQL 16 container running on the VPS hosts isolated logical databases:
```sql
-- Initialized on the VPS PostgreSQL instance
CREATE DATABASE hms_prod;    -- Production hospital records
CREATE DATABASE hms_dev;     -- Isolated developer database for laptop
CREATE DATABASE dograh_db;   -- Voice AI call session data
CREATE DATABASE wacrm_prod;  -- WhatsApp CRM marketing & messaging data
```

### Declarative Schema Migrations
Deploying or updating database tables never involves copying binary container volumes. It is driven by Drizzle Kit:
```bash
# Push schema changes to the target database
npx drizzle-kit push

# Or apply versioned migration files in production
npx drizzle-kit migrate
```

---

## 4. Authentication Architecture (Healthcare RBAC)

### Why Supabase Auth Is Not Used
Supabase Auth requires the GoTrue daemon and creates a dependency on the `auth.users` system table. Migrating away to standard PostgreSQL on a VPS breaks foreign key constraints unless you self-host GoTrue.

### Database-Native RBAC Specification
1. **Schema Definition (`db/schema.ts`)**:
   ```ts
   export const users = pgTable("users", {
     id: uuid("id").defaultRandom().primaryKey(),
     organizationId: uuid("organization_id").notNull(),
     email: varchar("email", { length: 255 }).notNull().unique(),
     passwordHash: varchar("password_hash", { length: 255 }).notNull(),
     fullName: varchar("full_name", { length: 255 }).notNull(),
     phone: varchar("phone", { length: 20 }),
     role: varchar("role", { length: 50 }).notNull().default("RECEPTIONIST"),
     isActive: boolean("is_active").default(true).notNull(),
     createdAt: timestamp("created_at").defaultNow().notNull(),
     updatedAt: timestamp("updated_at").defaultNow().notNull(),
   });
   ```
2. **Clinical Roles Supported**:
   - `SUPER_ADMIN`: Multi-branch hospital system administrator.
   - `HOSPITAL_ADMIN`: Hospital branch management, staff onboarding.
   - `DOCTOR`: OPD consultation, E-Prescriptions, IPD rounds, diagnosis.
   - `NURSE`: Vitals triage, IPD bed management, medication administration.
   - `RECEPTIONIST`: Patient registration, token queue, appointment scheduling.
   - `PHARMACIST`: Drug dispensing, inventory batch tracking, billing.
   - `LAB_TECHNICIAN`: Investigation orders, report upload, sample tracking.
   - `PATIENT`: Patient portal, appointment booking, report downloads.
3. **Session Management**:
   - **Online Session**: Secure, HTTP-Only, SameSite=Lax JWT cookie signed with server secret (`jose` / `lib/auth.ts`).
   - **Offline Fallback**: HMAC-SHA256 tamper-proof session verification (`lib/offline-auth.ts`) validating local cache in IndexedDB (`Dexie.js`) when internet connection drops.
4. **Portability Advantage**:
   Switching the database from Supabase dev to VPS production requires **zero lines of auth code changed**; only `DATABASE_URL` is swapped.

---

## 5. File Storage Architecture: Cloudflare R2

### Zero VPS Disk Bloat
To keep the 8 GB VPS lean and prevent storage exhaustion from high-resolution medical imaging:
- **No Local Files**: Never save uploads in `public/uploads` or on VPS local storage.
- **Direct S3-Compatible Upload**: Use AWS SDK S3 client configured for Cloudflare R2:
  ```env
  R2_ACCOUNT_ID="your_cloudflare_account_id"
  R2_ACCESS_KEY_ID="your_r2_access_key"
  R2_SECRET_ACCESS_KEY="your_r2_secret_key"
  R2_BUCKET_NAME="apex-hms-medical-records"
  R2_PUBLIC_DOMAIN="https://cdn-records.yourhospital.com"
  ```
- **Database Storage**: PostgreSQL only stores the resulting CDN URL string in text columns (`attachment_url`, `prescription_pdf_url`).
- **Cost**: 10 GB free forever, zero bandwidth egress fees.

---

## 6. Dograh Voice AI Deployment on VPS

### Operational Requirements
- **WebSockets & WebRTC**: Requires public IP address and unrestricted UDP ports (`10000-20000/udp`) for real-time audio streams.
- **Resource Footprint**: Consumes ~2.5 GB to 3.5 GB RAM on the VPS.
- **Connection to HMS**:
  - In HMS `.env.local` (or production `.env`):
    ```env
    DOGRAH_API_URL="https://voice.yourdomain.com/api"
    DOGRAH_WS_URL="wss://voice.yourdomain.com/ws"
    ```
  - When an incoming patient call triggers an appointment inquiry, Dograh queries HMS OPD slots via the authenticated internal API and books the slot atomically.

---

## 7. Secure Remote Networking (Laptop to VPS)

When connecting your local development laptop to `hms_dev` or Dograh on the VPS:

### Method 1: Tailscale Mesh Network (Recommended)
1. Install Tailscale on the VPS (`curl -fsSL https://tailscale.com/install.sh | sh`).
2. Install Tailscale on Windows.
3. Connect both devices to your private Tailscale network.
4. Access VPS PostgreSQL at the private Tailscale IP (e.g. `100.85.12.34:5432`):
   ```env
   DATABASE_URL="postgresql://postgres:secure_pass@100.85.12.34:5432/hms_dev"
   ```
5. **Security**: Port 5432 remains completely closed to the public internet.

### Method 2: SSH Port Forwarding Tunnel
Execute in PowerShell on your laptop:
```powershell
ssh -L 5432:localhost:5432 root@YOUR_VPS_IP
```
Then configure your local `.env.local`:
```env
DATABASE_URL="postgresql://postgres:secure_pass@localhost:5432/hms_dev"
```

---

## 8. VPS Sizing & Memory Budget Breakdown

### Running on a Single 8 GB VPS (e.g. Hetzner, Contabo, DigitalOcean, Linode)

| Component | RAM Allocation | Storage Footprint | Role |
| :--- | :--- | :--- | :--- |
| **Ubuntu 24.04 LTS + OS Kernel** | ~400 MB | ~3 GB (OS files) | Operating system base |
| **Nginx / Caddy Proxy** | ~100 MB | ~50 MB | SSL termination & reverse proxy |
| **PostgreSQL 16 Engine** | ~400 MB – 600 MB | ~2 GB (Data & WAL) | Central relational engine (all 4 DBs) |
| **Dograh Voice AI Container** | ~2.5 GB – 3.2 GB | ~5 GB (Docker image) | WebRTC telephony & voice AI runtime |
| **Apex HMS Next.js Runtime** | ~450 MB – 650 MB | ~1 GB (Node runtime) | Production EMR server |
| **WACRM Backend** | ~300 MB – 450 MB | ~500 MB (Container) | WhatsApp Meta Cloud API orchestrator |
| **Available Headroom / Buffer** | **~2.0 GB – 3.0 GB** | **40+ GB remaining** | Safety buffer for load spikes & OS cache |

---

## 9. Step-by-Step Go-Live Production Runbook

When development is finalized and you are ready to launch production:

### Phase 1: VPS Docker Compose Stack
Create `/opt/apex-stack/docker-compose.yml` on the VPS:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: apex-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /opt/apex-stack/postgres_data:/var/lib/postgresql/data
      - ./init-dbs.sh:/docker-entrypoint-initdb.d/init-dbs.sh
    ports:
      - "127.0.0.1:5432:5432"

  dograh:
    image: dograh/voice-engine:latest
    container_name: apex-dograh
    restart: always
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/dograh_db
    ports:
      - "8080:8080"
      - "10000-20000:10000-20000/udp"

  hms:
    image: apex-hms:latest
    container_name: apex-hms
    restart: always
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/hms_prod
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
    ports:
      - "127.0.0.1:3000:3000"
```

### Phase 2: Schema Deployment
From your laptop (or via CI/CD):
```bash
# Apply schema to production database
DATABASE_URL="postgresql://postgres:password@YOUR_VPS_IP:5432/hms_prod" npx drizzle-kit migrate
```

### Phase 3: Nginx SSL Reverse Proxy
Route `https://hms.yourhospital.com` to `127.0.0.1:3000` with automated Let's Encrypt certificates via Certbot.

---

## 10. Summary Checklist for Developers

- [x] **Laptop**: Run `npm run dev` with Node.js only. Never install Docker Desktop locally.
- [x] **Dev Database**: Connect `.env.local` to Supabase Free Tier, Neon, or VPS `hms_dev` via Tailscale.
- [x] **Auth**: Use Database-Native RBAC (`public.users`) with HTTP-Only cookies. Never use Supabase Auth.
- [x] **Files**: Upload all patient documents, scans, and PDFs to Cloudflare R2.
- [x] **Voice**: Keep Dograh hosted on the VPS with direct WebRTC ports.
- [x] **Production**: Deploy schemas to `hms_prod` via `drizzle-kit migrate`. Zero container disk copying.
