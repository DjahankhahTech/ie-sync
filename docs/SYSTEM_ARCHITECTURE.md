# IE-SYNC System Architecture Document

**Document Identifier:** IE-SYNC-SAD-2026-001
**Version:** 1.0
**Classification:** UNCLASSIFIED // FOUO
**Date:** 2026-02-22
**Prepared By:** DjahankhahTech Systems Architecture Division
**Approved By:** IO Cell Lead (Pending)
**Technology Readiness Level:** TRL 4 -- Component Validation in Laboratory Environment
**Doctrinal Basis:** JP 3-13 (Information Operations), JP 3-13.2 (MISO)
**Compliance Framework:** NIST SP 800-171 Rev. 2, CMMC Level 2

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Operational Context](#2-operational-context)
3. [Logical Architecture](#3-logical-architecture)
4. [Physical Architecture](#4-physical-architecture)
5. [Data Flow Model](#5-data-flow-model)
6. [Security Architecture](#6-security-architecture)
7. [Access Control Model](#7-access-control-model)
8. [Logging and Audit Architecture](#8-logging-and-audit-architecture)
9. [External Dependencies](#9-external-dependencies)
10. [Failure Modes and Resilience](#10-failure-modes-and-resilience)
11. [Scalability Considerations](#11-scalability-considerations)
12. [Compliance Alignment](#12-compliance-alignment-nist-800-171-references)

---

## 1. System Overview

### 1.1 Purpose

IE-SYNC (Information Environment -- Synchronization) is a web-based decision support system designed to provide United States Marine Corps (USMC) Information Operations (IO) planners with a common operational picture (COP) of the Information Environment (IE) across all six Geographic Combatant Commands (GCCs). The system aggregates open-source intelligence (OSINT) feeds, applies transparent relevance scoring, tracks adversary narrative operations, and generates doctrinal outputs aligned with JP 3-13.

### 1.2 Mission Need

IO planners require near-real-time visibility into adversary information activities, cross-source corroboration of intelligence, and a mechanism to produce assessment products that are transparent, auditable, and doctrinally grounded. IE-SYNC addresses this need by:

- Ingesting and scoring live RSS/OSINT feeds with a documented rubric
- Displaying Measures of Effectiveness (MOE) and Measures of Performance (MOP) with full evidence provenance
- Providing GCC-switchable tactical map overlays with threat entity tracking
- Enabling analyst triage, escalation, and Course of Action (COA) development workflows
- Maintaining an immutable audit trail of all operational decisions and state changes

### 1.3 System Identification

| Attribute | Value |
|-----------|-------|
| **System Name** | IE-SYNC |
| **Version** | 0.1.0 |
| **Repository** | github.com/DjahankhahTech/ie-sync (Private) |
| **Runtime** | Next.js 16.1.6 / React 19.2.3 / Node.js 22+ |
| **Language** | TypeScript 5.8.3 (strict mode) |
| **Codebase Size** | ~11,262 LOC across 31 TypeScript/TSX files |
| **API Endpoints** | 4 server-side route handlers |
| **UI Components** | 13 React components |
| **State Management** | Zustand 5.0.11 (atomic store) |
| **Authentication** | NextAuth.js 5.0.0-beta.30 (JWT) |

### 1.4 GCC Coverage

IE-SYNC provides independent operational contexts for all six GCCs, each with dedicated:

| GCC | AOR | HQ | Primary Threat Vectors |
|-----|-----|----|-----------------------|
| **INDOPACOM** | Indo-Pacific | Camp H.M. Smith, HI | PRC IO, DPRK Cyber, Gray Zone Ops |
| **CENTCOM** | Middle East / Central Asia | MacDill AFB, FL | Iran IO, Houthi Influence, ISIS Propaganda |
| **EUCOM** | Europe / Russia | Stuttgart, Germany | Russian IO, Dezinformatsiya, APT28/29 |
| **AFRICOM** | Africa | Stuttgart, Germany | Wagner IO, VEO Propaganda, Coup Narratives |
| **SOUTHCOM** | Latin America / Caribbean | Doral, FL | Venezuelan IO, Narco-IO, PRC Influence |
| **NORTHCOM** | North America / CONUS | Peterson SFB, CO | Election IO, PRC Espionage, Domestic Extremism IO |

---

## 2. Operational Context

### 2.1 Operational Environment

IE-SYNC operates within the context of USMC IO planning cells at the Marine Expeditionary Force (MEF) and Marine Information Group (MIG) echelons. The system is designed for use in garrison and deployed environments where analysts require a consolidated IE picture to inform the following doctrinal processes:

- **IO Running Estimate** -- Continuous assessment of the IE conditions (JP 3-13, Ch. III)
- **MOE/MOP Assessment** -- Quantitative and qualitative measurement of IO effectiveness (JP 3-13, Ch. IV)
- **COA Development** -- Development of information-related courses of action for the commander
- **Annex F Generation** -- Production of the IO annex to operational orders

### 2.2 User Roles and Personas

| Role | Persona | Primary Workflow |
|------|---------|-----------------|
| **IO Cell Lead** (ADMIN) | III MIG S3 / MEF IO Director | Command oversight, access management, COA approval |
| **IO Analyst** (ANALYST) | IO Planner, MISO Planner, Cyber Planner | Feed triage, threat assessment, metric analysis, escalation |
| **CDR Observer** (VIEWER) | Commander's staff, liaison officers | Read-only situational awareness, brief preparation |
| **System** (SYSTEM) | CI/CD pipelines, health probes | Automated health checks, monitoring |

### 2.3 Operational Workflow

```
                   OSINT FEEDS                     ANALYST WORKFLOW
                       |                                |
            [RSS/Atom Sources]                  [Authentication]
                       |                                |
                       v                                v
              +------------------+           +--------------------+
              |  /api/feeds      |---------->|  IE Overlay / COP  |
              |  (ingest, score, |           |  (TacticalMap,     |
              |   corroborate)   |           |   Threat Board,    |
              +------------------+           |   MOE Tiles,       |
                                             |   Live Feeds)      |
                                             +--------------------+
                                                      |
                                    +-----------------+-----------------+
                                    |                 |                 |
                                    v                 v                 v
                            [Escalation]     [COA Selection]   [Annex Generation]
                            [Triage]         [Assessment]      [Export]
                                    |                 |                 |
                                    v                 v                 v
                            +------------------------------------------+
                            |        IMMUTABLE AUDIT LOG               |
                            |  (every state change, every decision)    |
                            +------------------------------------------+
```

---

## 3. Logical Architecture

### 3.1 Layered Architecture Overview

IE-SYNC implements a four-tier logical architecture with security enforcement at the middleware boundary:

```
+===========================================================================+
|                         LAYER 0: SECURITY GATEWAY                         |
|  middleware.ts                                                            |
|  [Rate Limiting] [Account Lockout] [TLS Enforcement] [JWT Auth]          |
|  [RBAC Check] [CSRF Protection] [Audit Logging]                          |
+===========================================================================+
        |                    |                    |                    |
        v                    v                    v                    v
+---------------+  +-----------------+  +------------------+  +-------------+
|  LAYER 1:     |  |  LAYER 1:       |  |  LAYER 1:        |  |  LAYER 1:   |
|  PRESENTATION |  |  API ROUTES     |  |  SECURITY LIBS   |  |  STATE MGMT |
|               |  |                 |  |                  |  |             |
|  IEOverlay    |  |  /api/feeds     |  |  lib/auth.ts     |  |  ie-store   |
|  TacticalMap  |  |  /api/link-check|  |  lib/encryption  |  |  (Zustand)  |
|  RunningEst.  |  |  /api/health    |  |  lib/validation  |  |             |
|  SensorFusion |  |  /api/auth/     |  |  lib/audit-log   |  |             |
|  SIGMANMon.   |  |                 |  |  lib/immutable   |  |             |
|  COAEngine    |  |                 |  |                  |  |             |
|  AnnexGen.    |  |                 |  |                  |  |             |
+---------------+  +-----------------+  +------------------+  +-------------+
        |                    |                    |                    |
        v                    v                    v                    v
+===========================================================================+
|                         LAYER 2: DATA & DOMAIN                            |
|  lib/gcc-config.ts    lib/gcc-mock-data.ts    lib/mock-data.ts            |
|  lib/metric-contracts.ts    lib/source-links.ts    lib/utils.ts           |
+===========================================================================+
        |                    |
        v                    v
+===========================================================================+
|                    LAYER 3: EXTERNAL INTERFACES                           |
|  OSINT RSS Feeds (BBC, NYT, Reuters, DFRLab, Bellingcat, etc.)           |
|  Internet Archive Availability API                                        |
|  ESRI ArcGIS Tile Servers    CartoDB Tile Servers    Leaflet CDN          |
+===========================================================================+
```

### 3.2 Component Inventory

#### 3.2.1 Presentation Layer (13 Components)

| Component | File | Responsibility |
|-----------|------|----------------|
| AppShell | `components/layout/AppShell.tsx` | Primary layout container; module navigation |
| Header | `components/layout/Header.tsx` | Top navigation bar; GCC selector |
| Sidebar | `components/layout/Sidebar.tsx` | Module navigation sidebar |
| ClassificationBanner | `components/layout/ClassificationBanner.tsx` | NIST classification marking display |
| IEOverlay | `components/cop/IEOverlay.tsx` | Main COP dashboard (1,071 lines); operational status, alerts, MOE tiles, threat table, live feeds |
| TacticalMap | `components/cop/TacticalMap.tsx` | Leaflet-based tactical map (504 lines); threat markers, narrative zones, GCC-adaptive bounds |
| RunningEstimate | `components/running-estimate/RunningEstimate.tsx` | IO Running Estimate display |
| SensorFusion | `components/sensor-fusion/SensorFusion.tsx` | Multi-source sensor fusion display |
| SIGMANMonitor | `components/sigman/SIGMANMonitor.tsx` | Signature/anomaly monitoring |
| COAEngine | `components/coa/COAEngine.tsx` | Course of Action development |
| AnnexGenerator | `components/annex/AnnexGenerator.tsx` | Annex F document generation |
| GlossaryPanel | `components/ui/GlossaryPanel.tsx` | IO/military terminology reference |
| ErrorBoundary | `components/ErrorBoundary.tsx` | React error boundary (SI-11 compliance) |

#### 3.2.2 API Route Layer (4 Endpoints)

| Endpoint | Method | Authentication | Purpose |
|----------|--------|---------------|---------|
| `/api/auth/[...nextauth]` | GET, POST | Public | Authentication (login, session, CSRF token) |
| `/api/feeds` | GET | ANALYST, ADMIN | Live OSINT feed aggregation with transparent scoring |
| `/api/link-check` | GET, POST | ANALYST, ADMIN | URL health verification with SSRF protection |
| `/api/health` | GET | Public (SYSTEM) | System health probe for monitoring |

#### 3.2.3 Security Library Layer (6 Modules)

| Module | File | NIST Controls |
|--------|------|---------------|
| Authentication & RBAC | `lib/auth.ts` | AC-2, AC-3, AC-6, IA-2, IA-5, IA-8 |
| Audit Logger | `lib/audit-log.ts` | AU-2, AU-3, AU-6, AU-8, AU-12 |
| Immutable Audit Pipeline | `lib/immutable-log.ts` | AU-3, AU-6, AU-9, AU-11, AU-12 |
| AES-256-GCM Encryption | `lib/encryption.ts` | SC-13, SC-28 |
| Input Validation & SSRF | `lib/validation.ts` | SI-10, SC-7 |
| Middleware Gateway | `middleware.ts` | AC-3, AC-7, AC-11, AC-12, SC-5, SC-8, SC-23 |

#### 3.2.4 Domain Data Layer (6 Modules)

| Module | File | Purpose |
|--------|------|---------|
| GCC Configuration | `lib/gcc-config.ts` | AOR definitions, RSS feed sources, keywords, map parameters |
| GCC Mock Data | `lib/gcc-mock-data.ts` | Synthetic operational data per GCC |
| Core Mock Data | `lib/mock-data.ts` | Type definitions for sensor feeds, COAs, MOEs, threats |
| Metric Contracts | `lib/metric-contracts.ts` | MetricDefinition and MetricRun schemas; 36 MOE definitions across 6 GCCs |
| Source Links | `lib/source-links.ts` | Verified OSINT reference URLs (CISA, DOJ, MITRE, DFRLab) |
| Utilities | `lib/utils.ts` | Shared helper functions |

### 3.3 State Management Architecture

IE-SYNC employs Zustand 5.0.11 as a single atomic store (`store/ie-store.ts`, 301 lines) managing:

```
IEState {
  Navigation:     activeModule, activeGCC
  Live Feeds:     liveFeeds[], liveFeedsLoading, liveFeedsError, liveFeedsFetchedAt
  Static Feeds:   feeds[] (SensorFeed), anomalyCount
  COA:            coaOptions[], selectedCOA
  Metrics:        moeMetrics[], mopMetrics[]
  Intelligence:   threatEntities[], narrativeThreads[], signatureItems[]
  Assessment:     runningEstimate
  Alerts:         alerts[]
  Triage:         escalatedItems[]
  System:         lastRefresh, systemStatus, aiStatus, dataFusionStatus
}
```

All state-mutating actions (`setActiveGCC`, `setSelectedCOA`, `escalateFeedItem`, `addAlert`) emit audit log entries via `lib/audit-log.ts` for NIST AU-2/AU-12 compliance.

### 3.4 Metric Transparency Framework

Every metric displayed in IE-SYNC is backed by two contracts defined in `lib/metric-contracts.ts`:

1. **MetricDefinition** -- The immutable specification explaining what is measured, how it is computed, its units, window, cadence, inputs with source classification, confidence method, known failure modes, doctrinal basis, and thresholds.

2. **MetricRun** -- A timestamped computation record with evidence_refs[] trail, confidence level, inputs hash for reproducibility, sample size, and confidence intervals.

Source classifications distinguish between `public_osint`, `internal_system`, `classified_system`, and `reference_db` inputs. Internal/classified sources display system identifiers rather than URLs.

The system registers 36 MetricDefinitions across 6 GCCs (6 MOEs per GCC), each with documented failure modes, ensuring no metric is presented as a "magic number."

---

## 4. Physical Architecture

### 4.1 Current Deployment (TRL 4 -- Laboratory)

```
+-------------------------------------------------------------------+
|                      DEVELOPER WORKSTATION                         |
|                                                                    |
|  +-------------------------------------------------------------+  |
|  |                    Next.js 16.1.6 Runtime                    |  |
|  |                                                              |  |
|  |  +-------------+  +------------------+  +----------------+   |  |
|  |  | React SSR / |  | API Route        |  | Middleware      |   |  |
|  |  | Client      |  | Handlers         |  | (Security GW)  |   |  |
|  |  | Renderer    |  | (Server-side)    |  |                |   |  |
|  |  +-------------+  +------------------+  +----------------+   |  |
|  |        |                  |                     |            |  |
|  |  +---------------------------------------------------+      |  |
|  |  |              Zustand In-Memory Store               |      |  |
|  |  |          (No persistence -- ephemeral)             |      |  |
|  |  +---------------------------------------------------+      |  |
|  |                                                              |  |
|  +-------------------------------------------------------------+  |
|                              |                                     |
|  +-------------------------------------------------------------+  |
|  |              stdout (pino structured JSON logs)              |  |
|  +-------------------------------------------------------------+  |
|                              |                                     |
+-------------------------------------------------------------------+
           |                          |
           v                          v
  +------------------+     +--------------------+
  | OSINT RSS Feeds  |     | Tile Map Servers   |
  | (BBC, NYT, etc.) |     | (ESRI, CartoDB,    |
  | via HTTPS        |     |  OpenStreetMap)     |
  +------------------+     +--------------------+
```

### 4.2 Target Production Architecture

```
+---------------------------------------------------------------------+
|                        CLOUD INFRASTRUCTURE                          |
|                    (AWS GovCloud / Azure Gov)                         |
|                                                                      |
|  +-------------------------------+  +-----------------------------+  |
|  |       APPLICATION TIER        |  |      SECURITY TIER          |  |
|  |                               |  |                             |  |
|  |  +-------------------------+  |  |  +-----+ +------+ +------+ |  |
|  |  |  Next.js Containers     |  |  |  | WAF | | KMS  | | Vault| |  |
|  |  |  (ECS Fargate / AKS)    |  |  |  +-----+ +------+ +------+ |  |
|  |  |  - App + Middleware      |  |  |         |                  |  |
|  |  |  - Auto-scaling          |  |  |  +---------------------+  |  |
|  |  |  - Health checks         |  |  |  | SAML/OIDC/CAC      |  |  |
|  |  +-------------------------+  |  |  | Identity Provider   |  |  |
|  |             |                 |  |  +---------------------+  |  |
|  |  +-------------------------+  |  +-----------------------------+  |
|  |  |  ALB / Front Door       |  |                                   |
|  |  |  (TLS 1.2+ termination) |  |  +-----------------------------+  |
|  |  +-------------------------+  |  |      LOGGING TIER            |  |
|  |                               |  |                             |  |
|  +-------------------------------+  |  +-----+ +------+ +------+ |  |
|                                     |  | CW  | | S3   | | SIEM | |  |
|  +-------------------------------+  |  | Logs| | WORM | |      | |  |
|  |        DATA TIER              |  |  +-----+ +------+ +------+ |  |
|  |                               |  +-----------------------------+  |
|  |  +-----+ +--------+ +-----+  |                                   |
|  |  | RDS | | DynamoDB| | S3  |  |                                   |
|  |  | (enc)| | (audit) | |(sbom)|  |                                   |
|  |  +-----+ +--------+ +-----+  |                                   |
|  +-------------------------------+                                   |
+---------------------------------------------------------------------+
```

### 4.3 Network Architecture

| Zone | Components | Egress Policy |
|------|------------|---------------|
| **DMZ** | ALB/Front Door, WAF | TLS 1.2+ only; CSP-enforced origins |
| **Application** | Next.js containers | HTTPS egress to OSINT feeds, tile servers |
| **Data** | RDS, DynamoDB, S3 | No internet egress; VPC endpoints only |
| **Security** | KMS, Vault, IdP | No internet egress; private endpoints |
| **Logging** | CloudWatch, S3 WORM, SIEM | Append-only; no delete permissions |

### 4.4 Port and Protocol Inventory

| Service | Port | Protocol | Direction |
|---------|------|----------|-----------|
| Application HTTPS | 443 | TLS 1.2+ | Inbound |
| HTTP redirect | 80 | HTTP (301 to HTTPS) | Inbound |
| OSINT feed fetch | 443 | TLS 1.2+ | Outbound to RSS sources |
| Tile server fetch | 443 | TLS 1.2+ | Outbound to ESRI/CartoDB |
| Health probe | 3000 | HTTP (internal only) | Internal |

---

## 5. Data Flow Model

### 5.1 OSINT Feed Ingestion Pipeline

```
  EXTERNAL RSS SOURCES              API ROUTE                    CLIENT
  (BBC, NYT, Reuters,       /api/feeds?gcc={GCC_ID}          useLiveFeeds.ts
   DFRLab, Bellingcat,              |                              |
   Al Jazeera, etc.)                |                              |
        |                           v                              |
        |                  +------------------+                    |
        |    HTTPS/TLS     | 1. INPUT         |                    |
        |<---------------->|    VALIDATION    |                    |
        |                  |    (FeedQuerySchema)                  |
        |                  +------------------+                    |
        |                           |                              |
        |                           v                              |
        |                  +------------------+                    |
        |                  | 2. PARALLEL      |                    |
        |                  |    RSS FETCH     |                    |
        |                  |    (per GCC feed |                    |
        |                  |     config)      |                    |
        |                  +------------------+                    |
        |                           |                              |
        |                           v                              |
        |                  +------------------+                    |
        |                  | 3. TRANSPARENT   |                    |
        |                  |    SCORING       |                    |
        |                  | Geo: 0-30 pts    |                    |
        |                  | IO:  0-40 pts    |                    |
        |                  | Threat: 0-30 pts |                    |
        |                  | Total: 0-100     |                    |
        |                  +------------------+                    |
        |                           |                              |
        |                           v                              |
        |                  +------------------+                    |
        |                  | 4. CROSS-SOURCE  |                    |
        |                  |    CORROBORATION |                    |
        |                  | (title finger-   |                    |
        |                  |  printing, 6-word|   5-min polling    |
        |                  |  overlap check)  |<-------------------|
        |                  +------------------+                    |
        |                           |                              |
        |                           v                              |
        |                  +------------------+                    |
        |                  | 5. RESPONSE      |                    |
        |                  |    (sorted by    |----JSON----------->|
        |                  |     relevance,   |                    |
        |                  |     max 50 items)|                    |
        |                  +------------------+                    |
```

**Scoring Rubric Detail (Documented in `scoreFeedItem()`):**

| Signal | Max Points | Calculation | Limitations |
|--------|-----------|-------------|-------------|
| Geo/AOR Proximity | 30 | 10 pts per GCC keyword match | Keyword-only; no NLP/NER |
| IO Relevance | 40 | 8 pts per IO keyword hit | High false-positive rate |
| Threat Indicator | 30 | 10 pts per threat category | Cannot detect novel TTPs |
| **Confidence** | -- | HIGH: 3+ signal types; MEDIUM: 2; LOW: 1 | -- |

Every scored item includes a `basisNote` field providing plain-language explanation of what drove the score and explicit limitations.

### 5.2 Link Health Check Pipeline

```
  ANALYST REQUEST               API ROUTE                   EXTERNAL
  (single or batch)      /api/link-check                   SERVICES
        |                       |                              |
        v                       v                              |
  +----------+          +------------------+                   |
  | URL(s)   |--------->| 1. ZOD VALIDATE  |                   |
  | (max 20) |          |    (LinkCheck    |                   |
  +----------+          |     InputSchema) |                   |
                        +------------------+                   |
                                |                              |
                                v                              |
                        +------------------+                   |
                        | 2. SSRF CHECK    |                   |
                        |    isBlockedUrl()|                   |
                        | Blocks:          |                   |
                        | - localhost/*    |                   |
                        | - 10.*/172.16-31 |                   |
                        | - 192.168.*     |                   |
                        | - 169.254.169.254|                   |
                        | - metadata.google|                   |
                        | - non-HTTP(S)   |                   |
                        +------------------+                   |
                                |                              |
                        +-------+-------+                      |
                        |               |                      |
                    [BLOCKED]       [ALLOWED]                   |
                        |               |                      |
                    AUDIT LOG           v                      |
                    SSRF_BLOCKED  +------------------+         |
                                 | 3. HEALTH CHECK  |-------->|
                                 |    HEAD/GET       |<--------|
                                 |    with timeout   |         |
                                 +------------------+         |
                                        |                     |
                                 +------+------+              |
                                 |      |      |              |
                              [OK]  [DEAD] [REDIRECT]         |
                                        |                     |
                                        v                     |
                                 +------------------+         |
                                 | 4. ARCHIVE.ORG   |-------->|
                                 |    FALLBACK      |<--------|
                                 |    (dead links)  |         |
                                 +------------------+         |
```

### 5.3 Client-Side State Flow

```
  USER INTERACTION          ZUSTAND STORE             API LAYER
        |                       |                        |
        |  [GCC Switch]         |                        |
        |----setActiveGCC()---->|                        |
        |                       |--AUDIT LOG: gcc_switch |
        |                       |--reset all GCC data    |
        |                       |                        |
        |                       |  useLiveFeeds() hook   |
        |                       |----GET /api/feeds----->|
        |                       |<---JSON items----------|
        |                       |--setLiveFeeds()        |
        |                       |                        |
        |  [Escalate Item]      |                        |
        |--escalateFeedItem()-->|                        |
        |                       |--AUDIT LOG: escalate   |
        |                       |--add to escalatedItems |
        |                       |                        |
        |  [Select COA]         |                        |
        |--setSelectedCOA()---->|                        |
        |                       |--AUDIT LOG: coa_select |
        |                       |                        |
        |  [Add Alert]          |                        |
        |--addAlert()---------->|                        |
        |                       |--AUDIT LOG: alert_created
        |                       |--prepend to alerts[]   |
```

### 5.4 Data Classification at Rest and in Transit

| Data Category | Classification | Encryption at Rest | Encryption in Transit | Retention |
|--------------|---------------|-------------------|---------------------|-----------|
| Threat assessments, running estimates | CUI | AES-256-GCM (SC-13) | TLS 1.2+ (SC-8) | Per mission |
| MOE/MOP metrics, signatures | CUI | AES-256-GCM | TLS 1.2+ | Per mission |
| Authentication credentials | SENSITIVE | AES-256-GCM | TLS 1.2+ | Session only |
| Audit log entries | SENSITIVE | HMAC-SHA256 signed | TLS 1.2+ | PERMANENT (security events) |
| Configuration, env vars | SENSITIVE | Filesystem encryption | N/A | Deployment lifecycle |
| OSINT RSS feed content | PUBLIC | Plaintext allowed | TLS 1.2+ | 90 days |
| Application metadata | PUBLIC | Plaintext allowed | TLS 1.2+ | Deployment lifecycle |

---

## 6. Security Architecture

### 6.1 Defense-in-Depth Model

IE-SYNC implements seven layers of security, each independently enforceable:

```
+==================================================================+
| LAYER 7: CONTENT SECURITY POLICY (CSP)                          |
|   Restricts resource loading to whitelisted origins              |
|   Prevents XSS, clickjacking, data injection                    |
+==================================================================+
| LAYER 6: INPUT VALIDATION (Zod Schemas)                         |
|   All API inputs validated before processing                     |
|   SSRF blocklist prevents internal network access                |
+==================================================================+
| LAYER 5: CSRF PROTECTION                                        |
|   Origin header validation on all mutating requests              |
|   Blocks cross-origin POST/PUT/PATCH/DELETE                      |
+==================================================================+
| LAYER 4: ROLE-BASED ACCESS CONTROL (RBAC)                       |
|   JWT role extraction + permission matrix enforcement            |
|   Implicit deny: unlisted permissions are DENIED                 |
+==================================================================+
| LAYER 3: AUTHENTICATION (NextAuth.js JWT)                       |
|   Session tokens via signed JWT                                  |
|   30-minute idle timeout (AC-12)                                 |
|   MFA enforcement flag for privileged accounts (IA-2(1))         |
+==================================================================+
| LAYER 2: ACCOUNT LOCKOUT + RATE LIMITING                        |
|   60 requests/minute per IP (SC-5)                               |
|   5 failed logins -> 15-minute lockout (AC-7)                    |
|   Stale entry cleanup every 5 minutes                            |
+==================================================================+
| LAYER 1: TLS 1.2+ TRANSPORT ENCRYPTION                         |
|   HTTP -> HTTPS redirect (301) in production                     |
|   HSTS header: max-age=63072000; includeSubDomains; preload     |
+==================================================================+
```

### 6.2 Security Headers

Configured in `next.config.ts` and applied to all routes via `headers()`:

| Header | Value | NIST Control |
|--------|-------|-------------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | SC-8 |
| X-Content-Type-Options | nosniff | SC-18 |
| X-Frame-Options | DENY | SC-18 |
| X-XSS-Protection | 1; mode=block | SI-10 |
| Referrer-Policy | strict-origin-when-cross-origin | SC-8 |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | SC-7 |
| Content-Security-Policy | (see 6.3) | SC-18 |

### 6.3 Content Security Policy

```
default-src   'self'
script-src    'self' 'unsafe-eval' 'unsafe-inline'
style-src     'self' 'unsafe-inline' https://cdnjs.cloudflare.com
img-src       'self' data: https://*.tile.openstreetmap.org
              https://server.arcgisonline.com https://*.basemaps.cartocdn.com
              https://cdnjs.cloudflare.com
font-src      'self'
connect-src   'self' https:
frame-ancestors 'none'
```

**CSP Design Rationale:**
- `unsafe-eval` required by Next.js development mode; remove in production CSP
- `unsafe-inline` required for Tailwind CSS runtime injection
- `img-src` restricted to specific tile server domains used by TacticalMap
- `frame-ancestors: none` prevents clickjacking via iframe embedding
- `connect-src: https:` allows OSINT RSS feed fetching over HTTPS only

### 6.4 Cryptographic Architecture

#### 6.4.1 AES-256-GCM Encryption Module (`lib/encryption.ts`)

| Parameter | Value | Standard |
|-----------|-------|----------|
| Algorithm | AES-256-GCM | FIPS 197 |
| Key Length | 256 bits (32 bytes) | NIST SP 800-38D |
| IV Length | 96 bits (12 bytes) | NIST SP 800-38D |
| Auth Tag Length | 128 bits (16 bytes) | NIST SP 800-38D |
| Key Derivation | Environment variable (hex) | SC-13 |
| Key Rotation | Versioned key IDs (`kv` field) | SC-13 |

**Encryption Patterns Provided:**

1. **Direct Encryption** -- `encrypt(plaintext)` / `decrypt(payload)` using master key
2. **Envelope Encryption** -- `envelopeEncrypt(plaintext)` generates random DEK, wraps DEK with master key, encrypts data with DEK. Standard KMS-ready pattern.
3. **Field-Level Encryption** -- `encryptField(value)` / `decryptField(encrypted)` for database column storage
4. **Searchable Encryption** -- `hashForIndex(value)` using HMAC-SHA256 for indexed lookups without decryption

#### 6.4.2 HMAC Integrity (`lib/encryption.ts`, `lib/immutable-log.ts`)

- **HMAC-SHA256** signatures on all audit log entries using `AUDIT_HMAC_KEY`
- Constant-time comparison in `hmacVerify()` to prevent timing attacks
- Hash chain linking in immutable log pipeline for tamper detection

### 6.5 SSRF Protection (`lib/validation.ts`)

The `isBlockedUrl()` function enforces a deny-by-default policy on the link-check API:

| Blocked Category | Examples |
|-----------------|----------|
| Loopback addresses | localhost, 127.0.0.1, [::1], 0.0.0.0 |
| Cloud metadata endpoints | 169.254.169.254, metadata.google.internal |
| RFC 1918 private ranges | 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 |
| IPv6 private | fd (ULA), fe80 (link-local) |
| Non-HTTP protocols | file://, ftp://, gopher://, etc. |
| Numeric-only hostnames | Decimal IP encoding bypass attempts |

---

## 7. Access Control Model

### 7.1 Role Permission Matrix

Defined in `lib/auth.ts` with implicit deny (unlisted permissions are DENIED):

| Permission | ADMIN | ANALYST | VIEWER | SYSTEM |
|-----------|:-----:|:-------:|:------:|:------:|
| read | X | X | X | |
| write | X | X | | |
| export | X | X | | |
| admin | X | | | |
| api:feeds | X | X | X | |
| api:link-check | X | X | | |
| api:health | X | | | X |

### 7.2 Authentication Flow

```
  CLIENT                    MIDDLEWARE                 NEXTAUTH ROUTE
    |                           |                           |
    | POST /api/auth/signin     |                           |
    |-------------------------->|                           |
    |                           | 1. Rate limit check       |
    |                           | 2. Account lockout check  |
    |                           | 3. Pass (public path)     |
    |                           |-------------------------->|
    |                           |                           |
    |                           |   [Credentials Provider]  |
    |                           |   email + password match  |
    |                           |   MFA check (if enabled)  |
    |                           |   Audit: AUTH_SUCCESS     |
    |                           |   or AUTH_FAILURE         |
    |                           |                           |
    |<--JWT session cookie------|<--JWT with role claim-----|
    |   (30-min expiry)         |                           |
    |                           |                           |
    | GET /api/feeds?gcc=INDOPACOM                          |
    |-------------------------->|                           |
    |                           | 1. Rate limit check       |
    |                           | 2. JWT cookie present?    |
    |                           | 3. Extract role from JWT  |
    |                           | 4. hasPermission(role,    |
    |                           |    "api:feeds")?          |
    |                           | 5. CSRF check (if POST)   |
    |                           | 6. Audit: API_REQUEST     |
    |                           | 7. NextResponse.next()    |
    |                           |                           |
```

### 7.3 Session Management

| Parameter | Value | NIST Control |
|-----------|-------|-------------|
| Strategy | JWT (stateless) | IA-2 |
| Max Age | 30 minutes | AC-12 |
| Cookie Name | `next-auth.session-token` (dev) / `__Secure-next-auth.session-token` (prod) | SC-23 |
| Signing | NEXTAUTH_SECRET (32+ byte random) | SC-13 |
| Token Claims | `role`, `userId`, standard JWT fields | AC-3 |

### 7.4 Account Lockout Policy (AC-7)

| Parameter | Value |
|-----------|-------|
| Lockout Threshold | 5 consecutive failed attempts |
| Lockout Duration | 15 minutes |
| Tracking Scope | Per source IP address |
| Reset | Automatic after lockout period expires |
| Audit | `ACCESS_DENIED` event logged on every lockout |

### 7.5 Privileged Account Controls (AC-6(5))

Per `docs/ACCESS_REVIEW_POLICY.md`:

- ADMIN accounts require MFA when `MFA_REQUIRED=true`
- ADMIN accounts reviewed monthly (vs. quarterly for others)
- Maximum 2 concurrent ADMIN accounts per deployment
- ADMIN access requires explicit justification documented in access request

---

## 8. Logging and Audit Architecture

### 8.1 Two-Tier Audit System

IE-SYNC implements a two-tier audit logging architecture:

#### Tier 1: Base Audit Logger (`lib/audit-log.ts`)

- **Transport:** Pino structured JSON to stdout
- **Schema:** AuditEntry with 12 event types, 3 outcome states
- **Format:** `[AUDIT] {event}: {action}` with structured payload
- **Usage:** All middleware events, API errors, state changes

#### Tier 2: Immutable Audit Pipeline (`lib/immutable-log.ts`)

- **Transport:** Pino structured JSON to stdout with `immutable: true` marker
- **Schema:** ImmutableAuditRecord extending AuditEntry with:
  - Monotonic sequence numbers (gap detection)
  - SHA-256 hash chain (previous record linking)
  - HMAC-SHA256 signatures (tamper detection)
  - Retention classification
  - CUI/UNCLASSIFIED marking
- **Verification:** `verifyRecord()`, `verifyChain()`, `getChainState()` functions
- **Usage:** Security-critical events requiring tamper-evident storage

### 8.2 Audit Event Taxonomy

| Event Type | Description | Retention | Classification |
|-----------|------------|-----------|----------------|
| AUTH_SUCCESS | Successful authentication | 1 YEAR | UNCLASSIFIED |
| AUTH_FAILURE | Failed authentication attempt | 1 YEAR | UNCLASSIFIED |
| AUTH_LOGOUT | User session termination | 1 YEAR | UNCLASSIFIED |
| ACCESS_DENIED | Unauthorized access attempt | PERMANENT | UNCLASSIFIED |
| API_REQUEST | Standard API request | 90 DAYS | UNCLASSIFIED |
| API_ERROR | API processing error | 1 YEAR | UNCLASSIFIED |
| STATE_CHANGE | Operational state mutation | 1 YEAR | CUI |
| DATA_EXPORT | Data export action | PERMANENT | CUI |
| CONFIG_CHANGE | System configuration change | PERMANENT | CUI |
| RATE_LIMITED | Rate limit exceeded | 90 DAYS | UNCLASSIFIED |
| SSRF_BLOCKED | SSRF attempt blocked | PERMANENT | UNCLASSIFIED |
| VALIDATION_FAILURE | Input validation failure | 90 DAYS | UNCLASSIFIED |

### 8.3 Audit Record Schema (AU-3)

Every audit record captures the five W's:

| Field | Description | Example |
|-------|------------|---------|
| **Who** | userId, role | `analyst-01`, `ANALYST` |
| **What** | event, action | `STATE_CHANGE`, `gcc_switch: INDOPACOM to CENTCOM` |
| **When** | ISO 8601 timestamp | `2026-02-22T14:30:00.000Z` |
| **Where** | resource, ip | `/api/feeds`, `10.0.0.1` |
| **Outcome** | SUCCESS, FAILURE, DENIED | `SUCCESS` |

### 8.4 Hash Chain Integrity Model

```
  GENESIS BLOCK                    RECORD 1                    RECORD 2
  (hardcoded)                         |                            |
       |                              |                            |
  prevHash: GENESIS-000...    prevHash: SHA256(rec0)       prevHash: SHA256(rec1)
  seq: 0                      seq: 1                       seq: 2
                               entry: {...}                 entry: {...}
                               hmac: HMAC(record)           hmac: HMAC(record)
                               retention: 1_YEAR            retention: PERMANENT
                               classification: CUI          classification: UNCLASSIFIED
```

**Tamper Detection Mechanisms:**
1. **HMAC Verification** -- Each record's HMAC is recomputed and compared
2. **Chain Linking** -- Previous record hash must match stored `prevHash`
3. **Sequence Gaps** -- Non-consecutive sequence numbers indicate deleted records
4. **Timestamp Ordering** -- Records must have non-decreasing timestamps

### 8.5 Production SIEM Integration

In production, structured JSON logs are forwarded to enterprise SIEM via:

| Target | Method | Retention |
|--------|--------|-----------|
| AWS CloudWatch Logs | Container stdout capture | Configurable |
| AWS S3 (Object Lock / WORM) | Log driver or Lambda | PERMANENT |
| Splunk | HEC endpoint via Pino transport | Per SIEM policy |
| Elastic/OpenSearch | Filebeat sidecar | Per SIEM policy |

---

## 9. External Dependencies

### 9.1 Runtime Dependencies

| Package | Version | License | Purpose | Risk |
|---------|---------|---------|---------|------|
| next | 16.1.6 | MIT | Application framework | LOW -- Vercel maintained |
| react / react-dom | 19.2.3 | MIT | UI rendering | LOW -- Meta maintained |
| next-auth | 5.0.0-beta.30 | ISC | Authentication | MEDIUM -- Beta release |
| zustand | 5.0.11 | MIT | State management | LOW |
| zod | 4.3.6 | MIT | Input validation | LOW |
| pino | 10.3.1 | MIT | Structured logging | LOW |
| fast-xml-parser | 5.3.6 | MIT | RSS/Atom feed parsing | LOW |
| leaflet / react-leaflet | 1.9.4 / 5.0.0 | BSD-2 | Tactical mapping | LOW |
| recharts | 3.7.0 | MIT | Metric visualization | LOW |
| date-fns | 4.1.0 | MIT | Date/time operations | LOW |
| lucide-react | 0.575.0 | ISC | UI icons | LOW |
| clsx / tailwind-merge | 2.1.1 / 3.5.0 | MIT | CSS utilities | LOW |

### 9.2 External Services

| Service | URL Pattern | Data Direction | Sensitivity |
|---------|-------------|---------------|-------------|
| BBC RSS | feeds.bbci.co.uk | Inbound | PUBLIC |
| NYT RSS | rss.nytimes.com | Inbound | PUBLIC |
| Reuters RSS | feeds.reuters.com | Inbound | PUBLIC |
| DFRLab | atlanticcouncil.org | Inbound | PUBLIC |
| Bellingcat | bellingcat.com | Inbound | PUBLIC |
| ESRI Tiles | server.arcgisonline.com | Inbound | PUBLIC |
| CartoDB Tiles | *.basemaps.cartocdn.com | Inbound | PUBLIC |
| OpenStreetMap | *.tile.openstreetmap.org | Inbound | PUBLIC |
| Leaflet CDN | cdnjs.cloudflare.com | Inbound | PUBLIC |
| Internet Archive | web.archive.org | Inbound | PUBLIC |

### 9.3 Supply Chain Controls

| Control | Implementation | NIST |
|---------|---------------|------|
| SBOM Generation | CycloneDX via `npm run sbom` | SR-4 |
| Dependency Scanning | Dependabot (weekly, Mondays 06:00 ET) | SR-5, SI-2 |
| Vulnerability Audit | `npm audit --audit-level=high` in CI | RA-5 |
| License Compliance | GPL-2.0, GPL-3.0, AGPL-3.0 denied in PR reviews | SR-4 |
| Version Pinning | All dependencies pinned (no `^` prefix) | SR-5 |
| SAST | CodeQL (security-extended queries) | SA-11 |
| PR Dependency Review | GitHub dependency-review-action on every PR | SR-5 |
| Code Ownership | CODEOWNERS requires review for security-critical files | CM-5 |

### 9.4 CI/CD Pipeline

Three GitHub Actions workflows enforce security in the development lifecycle:

```
  PUSH TO MAIN / PR                    WEEKLY SCHEDULE
        |                                    |
        v                                    v
  +------------------+              +-----------------+
  | security.yml     |              | codeql.yml      |
  | 1. npm audit     |              | CodeQL SAST     |
  | 2. SBOM gen      |              | security-       |
  | 3. SBOM validate |              | extended        |
  | 4. tsc --noEmit  |              | queries         |
  | 5. ESLint        |              +-----------------+
  | 6. next build    |
  +------------------+
        |
  (on PR only)
        v
  +------------------+
  | dependency-      |
  | review.yml       |
  | Block critical/  |
  | high vulns +     |
  | banned licenses  |
  +------------------+
```

---

## 10. Failure Modes and Resilience

### 10.1 Failure Mode Analysis

| Component | Failure Mode | Impact | Detection | Mitigation |
|-----------|-------------|--------|-----------|------------|
| **RSS Feed Source** | Source offline or throttled | Degraded: Missing feeds for affected sources | `fetchRSSFeed()` catch block logs `API_ERROR` | Graceful degradation; 8-second timeout; 5-minute cache via `next.revalidate`; unaffected sources still return |
| **Tile Server** | ESRI/CartoDB unreachable | Degraded: Map renders without tiles | Browser console errors; CSP violation reports | Multiple tile layer providers; map still interactive |
| **NextAuth Session** | NEXTAUTH_SECRET missing | Critical: No authentication | Server startup warning; JWT signing failure | `.env.example` documents requirement; health check |
| **Encryption Key** | ENCRYPTION_MASTER_KEY missing | Critical: Cannot encrypt CUI | `getMasterKey()` throws with generation instructions | Startup validation; explicit error message |
| **Audit HMAC Key** | AUDIT_HMAC_KEY missing | Degraded: Audit logs unsigned | HMAC returns `hmac-not-configured` sentinel | Non-blocking; logs continue but without integrity |
| **Rate Limit Store** | In-memory map overflow | LOW: Memory growth | Stale entry cleanup runs every 5 minutes | Automatic cleanup; bounded by IP cardinality |
| **Zustand Store** | Browser refresh | Data loss: All state reset | Expected behavior (ephemeral store) | Re-fetch from API on mount; production requires persistence layer |
| **JWT Extraction** | Malformed JWT token | Access denied for user | `extractRoleFromJWT()` returns null; middleware denies | Graceful null handling; user re-authenticates |
| **SSRF Attempt** | Attacker sends internal URL | Blocked: Returns SSRF_BLOCKED | `isBlockedUrl()` + audit log | PERMANENT audit entry; 400 response |
| **Account Lockout** | Brute force attack | Account locked for 15 min | `ACCESS_DENIED` audit event | Auto-unlock after lockout period |

### 10.2 Error Handling Architecture

| Layer | Error Handling | NIST Control |
|-------|--------------|-------------|
| React UI | ErrorBoundary component catches render errors; safe fallback UI; no stack trace leakage | SI-11 |
| API Routes | try/catch with structured error responses; audit logging on failures | SI-11, AU-2 |
| Middleware | Explicit error codes (401, 403, 423, 429); audit logging on denials | AC-3, AU-2 |
| RSS Fetching | 8-second AbortSignal timeout; empty array fallback per feed | SI-11 |
| JWT Parsing | try/catch with null return; graceful degradation to unauthenticated | IA-2 |

### 10.3 Resilience Characteristics

| Characteristic | Current State | Production Target |
|---------------|--------------|-------------------|
| **Availability** | Single instance; no HA | Multi-AZ containers with auto-scaling |
| **Data Persistence** | Ephemeral (in-memory only) | RDS/DynamoDB with encryption at rest |
| **Session Persistence** | JWT (stateless, client-side) | JWT (stateless) -- no server-side session store needed |
| **Log Persistence** | stdout (ephemeral) | S3 Object Lock (WORM) + CloudWatch |
| **Recovery Time** | Container restart (~5s) | Health check + auto-restart (<30s) |
| **Graceful Degradation** | Per-feed isolation; partial results returned | Same + circuit breaker pattern |

---

## 11. Scalability Considerations

### 11.1 Current Bottlenecks

| Component | Constraint | Mitigation Path |
|-----------|-----------|-----------------|
| **In-memory rate limit map** | Single-process; lost on restart | Redis or DynamoDB for distributed rate limiting |
| **In-memory lockout map** | Single-process; lost on restart | Redis TTL keys for distributed lockout |
| **In-memory audit chain** | Sequence numbers reset on restart | Database-backed sequence generator |
| **RSS fetch parallelism** | 3-4 feeds per GCC; 8s timeout each | Connection pooling; background worker queue |
| **Zustand store** | Client-side only; no persistence | Server-side state with real-time sync (WebSocket/SSE) |
| **No database** | All data ephemeral | PostgreSQL/DynamoDB for persistence |

### 11.2 Horizontal Scaling Path

```
  CURRENT (TRL 4)                    TARGET (TRL 7+)
  Single Process                     Distributed

  +----------+                  +---> [Container 1] --+
  | Next.js  |                  |     [Container 2]   |---> [Redis Cluster]
  | (all-in- |    =========>    |     [Container N]   |     (rate limit,
  |  one)    |                  |          |          |      lockout, cache)
  +----------+                  |    [ALB / Ingress]  |
                                |          |          |---> [RDS / DynamoDB]
                                +---> [Background     |     (persistence,
                                       Workers]      |      audit chain)
                                      (RSS fetch,    |
                                       scoring)      +---> [S3 WORM]
                                                           (immutable logs)
```

### 11.3 Performance Envelope

| Metric | Current | Target |
|--------|---------|--------|
| Concurrent users | ~5 (single instance) | 100+ (scaled containers) |
| RSS fetch latency | 2-8s per feed (parallel) | <1s (cached + background refresh) |
| API response time (cached) | <100ms | <50ms |
| Rate limit capacity | 60 req/min per IP | Configurable per environment |
| Audit log throughput | ~100 entries/min (pino stdout) | 10,000+ entries/min (SIEM pipeline) |

---

## 12. Compliance Alignment (NIST 800-171 References)

### 12.1 Control Family Coverage Matrix

| Family | Control | Description | Implementation | Status |
|--------|---------|-------------|----------------|--------|
| **AC** | AC-2 | Account Management | NextAuth.js user accounts; `docs/ACCESS_REVIEW_POLICY.md` | IMPLEMENTED |
| | AC-2(3) | Disable Inactive Accounts | Policy: 90-day auto-disable | DOCUMENTED |
| | AC-2(4) | Automated Audit Actions | Audit log on account creation/modification/deletion | IMPLEMENTED |
| | AC-3 | Access Enforcement | Middleware RBAC + permission matrix | IMPLEMENTED |
| | AC-6 | Least Privilege | Explicit permission sets per role; implicit deny | IMPLEMENTED |
| | AC-6(5) | Privileged Account Controls | ADMIN MFA requirement; monthly review | IMPLEMENTED |
| | AC-7 | Unsuccessful Login Attempts | 5-attempt lockout, 15-minute duration | IMPLEMENTED |
| | AC-11 | Session Lock | 30-minute JWT expiry | IMPLEMENTED |
| | AC-12 | Session Termination | JWT maxAge: 1800s | IMPLEMENTED |
| **AU** | AU-2 | Auditable Events | 12 event types across all API routes and state changes | IMPLEMENTED |
| | AU-3 | Content of Audit Records | Who, what, when, where, outcome in every record | IMPLEMENTED |
| | AU-6 | Audit Review | Structured JSON output for SIEM consumption | IMPLEMENTED |
| | AU-8 | Time Stamps | ISO 8601 timestamps via pino | IMPLEMENTED |
| | AU-9 | Protection of Audit Information | HMAC-SHA256 signatures; hash chain integrity | IMPLEMENTED |
| | AU-11 | Audit Record Retention | PERMANENT/1_YEAR/90_DAYS retention classes | IMPLEMENTED |
| | AU-12 | Audit Generation | Audit calls in middleware, API routes, and store | IMPLEMENTED |
| **CM** | CM-3 | Configuration Change Control | Git version control; PR review required | IMPLEMENTED |
| | CM-5 | Access Restrictions for Change | CODEOWNERS; branch protection (pending GitHub Pro) | PARTIAL |
| **IA** | IA-2 | Identification and Authentication | NextAuth.js JWT credentials provider | IMPLEMENTED |
| | IA-2(1) | MFA for Privileged Accounts | MFA enforcement flag; TOTP placeholder | PARTIAL |
| | IA-5 | Authenticator Management | Env-var-based credentials; no hardcoded secrets in production | IMPLEMENTED |
| | IA-8 | Identification (Non-Org Users) | All users authenticated; no anonymous API access | IMPLEMENTED |
| **IR** | IR-1 | IR Policy | `docs/INCIDENT_RESPONSE.md` | DOCUMENTED |
| | IR-2 | Incident Categories | 6 categories defined | DOCUMENTED |
| | IR-4 | Incident Handling | 5-phase handling procedures | DOCUMENTED |
| | IR-5 | Incident Monitoring | Audit log review schedule with IOCs | DOCUMENTED |
| | IR-6 | Incident Reporting | POC chain, timelines, templates | DOCUMENTED |
| | IR-7 | IR Assistance | External support contacts | DOCUMENTED |
| | IR-8 | IR Plan Maintenance | Quarterly review schedule | DOCUMENTED |
| **PS** | PS-4 | Personnel Termination | 4-hour account disable requirement | DOCUMENTED |
| | PS-5 | Personnel Transfer | 24-hour access review requirement | DOCUMENTED |
| **RA** | RA-5 | Vulnerability Scanning | npm audit in CI; Dependabot weekly scans | IMPLEMENTED |
| **SA** | SA-11 | Developer Security Testing | CodeQL SAST; ESLint security rules | IMPLEMENTED |
| **SC** | SC-5 | Denial of Service Protection | Rate limiting: 60 req/min per IP | IMPLEMENTED |
| | SC-7 | Boundary Protection | SSRF blocklist; CSP; frame-ancestors: none | IMPLEMENTED |
| | SC-8 | Transmission Confidentiality | TLS 1.2+ enforcement; HSTS | IMPLEMENTED |
| | SC-13 | Cryptographic Protection | AES-256-GCM (FIPS 197); HMAC-SHA256 | IMPLEMENTED |
| | SC-18 | Mobile Code | CSP restricts script/style/img sources | IMPLEMENTED |
| | SC-23 | Session Authenticity | CSRF origin validation; signed JWT cookies | IMPLEMENTED |
| | SC-28 | Protection at Rest | AES-256-GCM field-level encryption; envelope encryption | IMPLEMENTED |
| **SI** | SI-2 | Flaw Remediation | Dependabot; npm audit; CodeQL | IMPLEMENTED |
| | SI-4 | System Monitoring | Health endpoint; structured audit logs | IMPLEMENTED |
| | SI-10 | Information Input Validation | Zod schemas on all API inputs | IMPLEMENTED |
| | SI-11 | Error Handling | ErrorBoundary; safe error responses; no stack traces | IMPLEMENTED |
| **SR** | SR-4 | Provenance | CycloneDX SBOM generation; license audit | IMPLEMENTED |
| | SR-5 | Acquisition Strategies | Pinned versions; banned license list; PR review | IMPLEMENTED |

### 12.2 Compliance Gap Analysis

| Gap | NIST Control | Remediation | Priority |
|-----|-------------|-------------|----------|
| No persistent database | SC-28 (full scope) | Deploy RDS/DynamoDB with encryption at rest | HIGH |
| MFA not enforced in development | IA-2(1) | Integrate TOTP library or CAC/PIV in production | HIGH |
| Branch protection requires GitHub Pro | CM-5 | Upgrade to GitHub Pro or Enterprise | MEDIUM |
| No network segmentation | SC-7 (network) | Deploy in VPC with public/private subnets | HIGH |
| Audit logs to stdout only | AU-9 (full scope) | Pipe to S3 Object Lock (WORM) | HIGH |
| No physical security controls | PE-* family | Deployment in FedRAMP-authorized facility | HIGH |
| No media protection | MP-* family | Full-disk encryption; secure disposal SOP | MEDIUM |
| Single developer | AC-5 (Separation of Duties) | Expand development team; enforce PR reviews | MEDIUM |
| No backup/recovery procedures | CP-9, CP-10 | Implement automated backup with RTO/RPO targets | HIGH |
| No penetration testing | CA-8 | Engage authorized penetration testing team | MEDIUM |
| test coverage at 0% | SA-11 (full scope) | Implement unit and integration test suites | MEDIUM |

### 12.3 Estimated Compliance Posture

| Category | Controls Addressed | Status |
|----------|-------------------|--------|
| Application-layer controls | ~40 of 110 | IMPLEMENTED or DOCUMENTED |
| Infrastructure controls (pending) | ~30 of 110 | Requires production deployment |
| Organizational/physical controls | ~40 of 110 | Requires facility and personnel policies |
| **Overall Estimated Coverage** | **~36%** | **Partial -- application-layer focus** |

---

## Appendix A: Document Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-02-22 | DjahankhahTech | Initial System Architecture Document |

## Appendix B: Abbreviations

| Abbreviation | Definition |
|-------------|------------|
| AOR | Area of Responsibility |
| CAC | Common Access Card |
| CIB | Coordinated Inauthentic Behavior |
| COA | Course of Action |
| COP | Common Operational Picture |
| CSP | Content Security Policy |
| CUI | Controlled Unclassified Information |
| DEK | Data Encryption Key |
| GCC | Geographic Combatant Command |
| HMAC | Hash-Based Message Authentication Code |
| HSTS | HTTP Strict Transport Security |
| IE | Information Environment |
| IO | Information Operations |
| JWT | JSON Web Token |
| MEF | Marine Expeditionary Force |
| MFA | Multi-Factor Authentication |
| MIG | Marine Information Group |
| MISO | Military Information Support Operations |
| MOE | Measure of Effectiveness |
| MOP | Measure of Performance |
| OSINT | Open-Source Intelligence |
| PIV | Personal Identity Verification |
| RBAC | Role-Based Access Control |
| SBOM | Software Bill of Materials |
| SIEM | Security Information and Event Management |
| SSRF | Server-Side Request Forgery |
| TLS | Transport Layer Security |
| TRL | Technology Readiness Level |
| WORM | Write Once Read Many |

## Appendix C: Referenced Documents

| Document | Identifier |
|----------|-----------|
| NIST SP 800-171 Rev. 2 | Protecting CUI in Nonfederal Systems |
| NIST SP 800-38D | Recommendation for Block Cipher Modes of Operation: GCM |
| NIST SP 800-53 Rev. 5 | Security and Privacy Controls |
| FIPS 197 | Advanced Encryption Standard (AES) |
| JP 3-13 | Information Operations |
| JP 3-13.2 | Military Information Support Operations |
| JP 3-12 | Cyberspace Operations |
| JP 3-16 | Multinational Operations |
| CMMC Model v2.0 | Cybersecurity Maturity Model Certification |
| IE-SYNC Incident Response Plan | `docs/INCIDENT_RESPONSE.md` |
| IE-SYNC Security Policy | `docs/SECURITY.md` |
| IE-SYNC Access Review Policy | `docs/ACCESS_REVIEW_POLICY.md` |
| IE-SYNC Data Classification Model | `docs/DATA_CLASSIFICATION.md` |

---

**END OF DOCUMENT**

**Classification:** UNCLASSIFIED // FOUO
**Distribution:** Limited to IE-SYNC development team and authorized reviewers.
