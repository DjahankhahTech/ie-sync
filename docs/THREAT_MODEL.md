# IE-SYNC STRIDE Threat Model

**Document Identifier:** IE-SYNC-TM-2026-001
**Version:** 1.0
**Classification:** UNCLASSIFIED // FOUO
**Date:** 2026-02-22
**Methodology:** STRIDE (Microsoft Threat Modeling Framework)
**Scope:** IE-SYNC Application Layer (TRL 4 -- Laboratory Environment)
**Compliance Alignment:** NIST SP 800-171 Rev. 2, CMMC Level 2
**Reference Architecture:** IE-SYNC-SAD-2026-001 (System Architecture Document)

---

## Table of Contents

1. [Threat Model Scope and Boundaries](#1-threat-model-scope-and-boundaries)
2. [System Decomposition for Threat Analysis](#2-system-decomposition-for-threat-analysis)
3. [STRIDE Risk Matrix](#3-stride-risk-matrix)
   - 3.1 [Spoofing](#31-spoofing)
   - 3.2 [Tampering](#32-tampering)
   - 3.3 [Repudiation](#33-repudiation)
   - 3.4 [Information Disclosure](#34-information-disclosure)
   - 3.5 [Denial of Service](#35-denial-of-service)
   - 3.6 [Elevation of Privilege](#36-elevation-of-privilege)
4. [Consolidated Risk Register](#4-consolidated-risk-register)
5. [Threat Actor Profiles](#5-threat-actor-profiles)
6. [Recommendations and Remediation Priority](#6-recommendations-and-remediation-priority)

---

## 1. Threat Model Scope and Boundaries

### 1.1 In Scope

| Component | Trust Boundary |
|-----------|---------------|
| Next.js middleware (security gateway) | Network edge to application |
| NextAuth.js authentication (JWT sessions) | Client to server |
| API route handlers (/api/feeds, /api/link-check, /api/health, /api/auth) | Authenticated API surface |
| Zustand client-side state store | Browser to application |
| AES-256-GCM encryption module | Data at rest |
| Immutable audit log pipeline | Application to log storage |
| OSINT RSS feed ingestion | External internet to application |
| Leaflet tactical map (tile servers) | External CDN to client |
| GitHub CI/CD pipeline | Developer to production |

### 1.2 Out of Scope

| Component | Reason |
|-----------|--------|
| Network infrastructure (VPC, firewalls, load balancers) | Not yet deployed |
| Physical security of hosting facilities | Organizational control |
| Operating system hardening | Infrastructure-layer concern |
| Database security (no database yet) | Not implemented at TRL 4 |
| CAC/PIV/SAML/OIDC integration | Placeholder; not implemented |
| Mobile clients | Not supported |

### 1.3 Trust Boundaries

```
+==============================================================+
|  TRUST BOUNDARY 1: External Internet                          |
|  [RSS Feeds] [Tile Servers] [Archive.org] [Attacker]         |
+=======================|=======================================+
                        | HTTPS / TLS 1.2+
+=======================|=======================================+
|  TRUST BOUNDARY 2: Middleware Security Gateway                |
|  [Rate Limit] [Lockout] [TLS Check] [Auth] [RBAC] [CSRF]    |
+=======================|=======================================+
                        | Authenticated request
+=======================|=======================================+
|  TRUST BOUNDARY 3: Application Logic                          |
|  [API Routes] [Validation] [Scoring] [State Management]      |
+=======================|=======================================+
                        | Encrypted / signed
+=======================|=======================================+
|  TRUST BOUNDARY 4: Data Layer                                 |
|  [Zustand Store] [Audit Logs] [Encryption Module]             |
+==============================================================+
```

---

## 2. System Decomposition for Threat Analysis

### 2.1 Data Flow Diagram (DFD) Elements

| ID | Element | Type | Description |
|----|---------|------|-------------|
| E1 | IO Analyst | External Entity | Authenticated user with ANALYST role |
| E2 | IO Cell Lead | External Entity | Authenticated user with ADMIN role |
| E3 | CDR Observer | External Entity | Authenticated user with VIEWER role |
| E4 | Attacker | External Entity | Unauthenticated hostile actor |
| E5 | RSS Feed Sources | External Entity | BBC, NYT, DFRLab, etc. |
| E6 | Tile Map Servers | External Entity | ESRI, CartoDB, OSM |
| P1 | Middleware | Process | Security gateway (middleware.ts) |
| P2 | Auth Handler | Process | NextAuth.js (/api/auth) |
| P3 | Feeds API | Process | RSS aggregation (/api/feeds) |
| P4 | Link-Check API | Process | URL verification (/api/link-check) |
| P5 | Health API | Process | System probe (/api/health) |
| P6 | Client Renderer | Process | React/Zustand in browser |
| D1 | JWT Session | Data Store | Signed JWT in cookie |
| D2 | Zustand Store | Data Store | In-memory client state |
| D3 | Audit Log Stream | Data Store | Pino JSON stdout |
| D4 | Rate Limit Map | Data Store | In-memory IP counters |
| D5 | Lockout Map | Data Store | In-memory login failure counters |

---

## 3. STRIDE Risk Matrix

### Rating Scale

| Rating | Likelihood | Description |
|--------|-----------|-------------|
| 5 | Almost Certain | Expected to occur; trivial to exploit |
| 4 | Likely | Will probably occur; low skill required |
| 3 | Possible | Could occur; moderate skill required |
| 2 | Unlikely | Conceivable but unlikely; high skill required |
| 1 | Rare | Extremely unlikely; requires extraordinary access |

| Rating | Impact | Description |
|--------|--------|-------------|
| 5 | Critical | Loss of CUI; complete system compromise; mission failure |
| 4 | High | Unauthorized access to operational data; partial mission impact |
| 3 | Moderate | Service degradation; limited data exposure |
| 2 | Low | Nuisance; no operational data compromised |
| 1 | Negligible | No meaningful impact |

**Risk Score = Likelihood x Impact** (1-25 scale)

| Risk Level | Score Range | Action Required |
|-----------|------------|-----------------|
| CRITICAL | 20-25 | Immediate remediation |
| HIGH | 12-19 | Remediation within 30 days |
| MEDIUM | 6-11 | Remediation within 90 days |
| LOW | 1-5 | Accept or remediate at next release |

---

### 3.1 SPOOFING

*Threats targeting identity verification -- can an attacker pretend to be someone they are not?*

#### S-1: JWT Session Token Forgery

| Field | Detail |
|-------|--------|
| **ID** | S-1 |
| **Threat** | Attacker forges or replays a JWT session token to impersonate an authenticated user |
| **Attack Vector** | Attacker obtains or guesses `NEXTAUTH_SECRET`, crafts a valid JWT with an elevated role claim (e.g., `role: "ADMIN"`), and injects it as a session cookie |
| **Affected Component** | P1 (Middleware), P2 (Auth Handler), D1 (JWT Session) |
| **Likelihood** | 2 (Unlikely) -- Requires secret exfiltration; 32+ byte random key |
| **Impact** | 5 (Critical) -- Full system access with ADMIN privileges; access to all CUI data |
| **Risk Score** | **10 (MEDIUM)** |
| **Existing Mitigation** | NEXTAUTH_SECRET loaded from environment variable, not hardcoded; JWT signed with HS256; 30-minute token expiry (AC-12); `.env.example` documents secure generation command |
| **Residual Risk** | MEDIUM -- Secret stored as environment variable, not in HSM/KMS. Development fallback credentials reduce security posture in non-production environments. JWT algorithm not pinned (potential algorithm confusion). No token revocation mechanism (stateless JWT). |
| **Recommended Actions** | Migrate to RS256 with asymmetric keys; store signing key in KMS/Vault; implement token revocation via short-lived tokens + refresh tokens; add `jti` claim for replay detection |

#### S-2: Credential Stuffing Against Demo Accounts

| Field | Detail |
|-------|--------|
| **ID** | S-2 |
| **Threat** | Attacker uses known demo credentials (`admin-demo-only`, `analyst-demo-only`, `viewer-demo-only`) to authenticate in a misconfigured production deployment |
| **Attack Vector** | Demo credentials are hardcoded in source code for development mode. If `NODE_ENV` is incorrectly set or environment passwords are not configured, these credentials are active |
| **Affected Component** | P2 (Auth Handler) |
| **Likelihood** | 3 (Possible) -- Source code is in private repo, but hardcoded credentials are a known anti-pattern; misconfiguration risk is non-trivial |
| **Impact** | 5 (Critical) -- Full ADMIN access if admin-demo-only credential is used |
| **Risk Score** | **15 (HIGH)** |
| **Existing Mitigation** | Demo credentials only load when `NODE_ENV=development` AND environment passwords are not set; production requires `DEMO_ADMIN_PASSWORD` etc. from env; audit log entry: `CONFIG_CHANGE: demo_credentials_loaded` warns when fallback is used |
| **Residual Risk** | HIGH -- Defense relies on correct `NODE_ENV` configuration. No password complexity enforcement. No account lockout integration at the auth handler level (only at middleware IP level). |
| **Recommended Actions** | Remove hardcoded demo credentials entirely; use seed script for development; add startup health check that fails if demo credentials are detected in production; enforce password complexity via Zod schema |

#### S-3: IP Spoofing to Bypass Rate Limiting

| Field | Detail |
|-------|--------|
| **ID** | S-3 |
| **Threat** | Attacker spoofs `X-Forwarded-For` header to rotate apparent IP addresses, bypassing per-IP rate limiting and account lockout |
| **Attack Vector** | Middleware extracts IP from `x-forwarded-for` header. Without a trusted reverse proxy stripping/overwriting this header, an attacker can set arbitrary IP values per request |
| **Affected Component** | P1 (Middleware), D4 (Rate Limit Map), D5 (Lockout Map) |
| **Likelihood** | 4 (Likely) -- Trivial to execute; single-header manipulation |
| **Impact** | 3 (Moderate) -- Bypasses rate limiting and account lockout; enables brute-force attacks |
| **Risk Score** | **12 (HIGH)** |
| **Existing Mitigation** | Rate limiting (60 req/min); account lockout (5 failures, 15-min lock); audit logging on rate limit events |
| **Residual Risk** | HIGH -- No trusted proxy configuration to validate `X-Forwarded-For`. In direct-access deployment, header is fully attacker-controlled. |
| **Recommended Actions** | Deploy behind ALB/reverse proxy that overwrites `X-Forwarded-For`; use `request.ip` from trusted proxy chain; implement API key or session-based rate limiting in addition to IP-based |

#### S-4: RSS Feed Source Impersonation

| Field | Detail |
|-------|--------|
| **ID** | S-4 |
| **Threat** | Attacker compromises or impersonates an RSS feed source (DNS hijack, BGP hijack, or domain expiration) to inject adversary-crafted content into the IE-SYNC feed pipeline |
| **Attack Vector** | Man-in-the-middle attack or DNS poisoning redirects RSS feed URL to attacker-controlled server serving crafted XML with fabricated intelligence |
| **Affected Component** | P3 (Feeds API), E5 (RSS Feed Sources) |
| **Likelihood** | 2 (Unlikely) -- Requires DNS/BGP compromise of major news organizations; TLS certificate validation provides defense |
| **Impact** | 4 (High) -- Poisoned intelligence feeds could mislead operational decisions |
| **Risk Score** | **8 (MEDIUM)** |
| **Existing Mitigation** | HTTPS-only feed fetching (TLS certificate validation); 5-minute cache reduces window of exposure; cross-source corroboration detects single-source anomalies; all feeds marked `UNVERIFIED` by default; analyst review required before operational use |
| **Residual Risk** | MEDIUM -- No certificate pinning for feed sources. No feed content integrity validation (e.g., PGP-signed feeds). Compromised major source would pass TLS checks. |
| **Recommended Actions** | Implement feed content hash tracking for anomaly detection; add certificate pinning for critical sources; configure alerting when feed content structure changes unexpectedly |

---

### 3.2 TAMPERING

*Threats targeting data integrity -- can an attacker modify data they should not?*

#### T-1: Zustand Store Manipulation via Browser DevTools

| Field | Detail |
|-------|--------|
| **ID** | T-1 |
| **Threat** | Attacker with local browser access manipulates the Zustand store directly via browser developer tools, altering operational state (threat entities, MOE metrics, alerts, escalated items) |
| **Attack Vector** | Zustand store is a JavaScript object in the browser's memory. Any user with DevTools access can invoke store actions or directly mutate state, potentially altering the displayed threat picture |
| **Affected Component** | D2 (Zustand Store), P6 (Client Renderer) |
| **Likelihood** | 3 (Possible) -- Requires physical/remote access to authenticated browser session |
| **Impact** | 3 (Moderate) -- Altered operational picture could mislead the analyst; however, changes are local to that browser session only (no server persistence) |
| **Risk Score** | **9 (MEDIUM)** |
| **Existing Mitigation** | All state changes emit audit log entries (GCC switch, COA selection, escalation, alert creation); no server-side persistence means tampering is ephemeral; refreshing browser resets to server-sourced data |
| **Residual Risk** | MEDIUM -- Client-side state has no server-side integrity verification. Audit logs for client-side state changes are generated client-side and could be suppressed. |
| **Recommended Actions** | Implement server-side state persistence with integrity checks; add server-side audit logging for critical state mutations; implement state signing for critical operational data |

#### T-2: Audit Log Tampering (Pre-SIEM)

| Field | Detail |
|-------|--------|
| **ID** | T-2 |
| **Threat** | Attacker with server access modifies or deletes audit log entries from stdout before they reach the SIEM, destroying evidence of unauthorized activity |
| **Attack Vector** | In current TRL 4 deployment, audit logs are emitted to stdout (pino). An attacker with process-level access could redirect stdout, filter log entries, or kill the process to prevent logging |
| **Affected Component** | D3 (Audit Log Stream) |
| **Likelihood** | 3 (Possible) -- Requires server access; single-process deployment makes this feasible |
| **Impact** | 5 (Critical) -- Loss of audit trail violates AU-9; enables covering tracks after compromise |
| **Risk Score** | **15 (HIGH)** |
| **Existing Mitigation** | HMAC-SHA256 signatures on immutable audit records detect post-hoc tampering; hash chain linking detects deleted entries; sequence numbers detect gaps; `verifyChain()` function validates chain integrity |
| **Residual Risk** | HIGH -- All mitigations are application-level. An attacker with process access can intercept logs before they are written. No out-of-band log forwarding. No write-once storage. |
| **Recommended Actions** | Deploy to environment with append-only log storage (S3 Object Lock / WORM); implement sidecar log forwarder that writes independently of application process; add out-of-band heartbeat monitoring that detects log gaps in real-time |

#### T-3: Man-in-the-Middle on RSS Feed Content

| Field | Detail |
|-------|--------|
| **ID** | T-3 |
| **Threat** | Attacker intercepts and modifies RSS feed content in transit, injecting or altering articles to manipulate relevance scoring and mislead analyst assessments |
| **Attack Vector** | TLS stripping or certificate authority compromise allows interception of RSS feed HTTPS connections; attacker modifies XML content before it reaches the parser |
| **Affected Component** | P3 (Feeds API), E5 (RSS Feed Sources) |
| **Likelihood** | 1 (Rare) -- Requires TLS compromise; major news sites use robust certificate management |
| **Impact** | 4 (High) -- Poisoned feed content could influence operational decisions |
| **Risk Score** | **4 (LOW)** |
| **Existing Mitigation** | HTTPS/TLS 1.2+ for all feed fetches; `connect-src 'self' https:` CSP restricts to HTTPS; cross-source corroboration reduces single-source impact; all items marked `UNVERIFIED` by default |
| **Residual Risk** | LOW -- Standard TLS protections are adequate for current threat level. |
| **Recommended Actions** | Monitor for certificate transparency log anomalies on feed source domains; implement content hash tracking for feed integrity validation |

#### T-4: CSRF Bypass via Missing Origin Header

| Field | Detail |
|-------|--------|
| **ID** | T-4 |
| **Threat** | Attacker crafts a cross-origin request that omits the `Origin` header, bypassing CSRF validation in middleware, to execute mutating API calls (POST/PUT/PATCH/DELETE) |
| **Attack Vector** | Middleware CSRF check only triggers when both `Origin` and `Host` headers are present. Some browsers/tools may omit Origin on certain request types. Attacker-controlled form submission or XMLHttpRequest could exploit this gap |
| **Affected Component** | P1 (Middleware) |
| **Likelihood** | 3 (Possible) -- Known bypass technique; depends on browser behavior |
| **Impact** | 3 (Moderate) -- Could execute link-check requests from attacker context; limited by authentication requirement |
| **Risk Score** | **9 (MEDIUM)** |
| **Existing Mitigation** | Authentication required for all non-public API endpoints; CSRF check applies to POST/PUT/PATCH/DELETE; session cookie required |
| **Residual Risk** | MEDIUM -- CSRF protection is defense-in-depth but has a known gap when Origin header is absent. |
| **Recommended Actions** | Implement double-submit CSRF token pattern (NextAuth.js CSRF token); reject mutating requests that lack Origin header entirely; add `SameSite=Strict` cookie attribute |

---

### 3.3 REPUDIATION

*Threats targeting accountability -- can an attacker deny their actions?*

#### R-1: Client-Side Audit Log Suppression

| Field | Detail |
|-------|--------|
| **ID** | R-1 |
| **Threat** | A malicious insider (authenticated analyst) suppresses client-side audit log calls by modifying JavaScript in browser, performing operational actions (GCC switches, escalations, COA selections) without audit trail |
| **Attack Vector** | Zustand store audit calls execute in the browser. A user with DevTools can override `audit()` function, prevent network requests, or block the calls entirely |
| **Affected Component** | D2 (Zustand Store), D3 (Audit Log Stream) |
| **Likelihood** | 3 (Possible) -- Any user with browser DevTools access |
| **Impact** | 4 (High) -- Operational decisions made without audit trail; violates AU-2/AU-12 |
| **Risk Score** | **12 (HIGH)** |
| **Existing Mitigation** | Server-side middleware logs all API requests (independent of client); immutable audit pipeline with HMAC signatures on server-side events |
| **Residual Risk** | HIGH -- Client-side state mutations (GCC switch, COA selection, escalation) are only audit-logged client-side. Server has no visibility into these actions unless they trigger an API call. |
| **Recommended Actions** | Move all critical state mutations to server-side API endpoints with server-side audit logging; treat client-side audit as supplementary, not authoritative; implement server-sent events (SSE) heartbeat that detects client-side audit gaps |

#### R-2: Shared Account Usage

| Field | Detail |
|-------|--------|
| **ID** | R-2 |
| **Threat** | Multiple analysts share the same credentials (e.g., `analyst@ie-sync.mil`), making it impossible to attribute specific operational actions to individual users |
| **Attack Vector** | Current authentication system has fixed demo accounts (admin-01, analyst-01, viewer-01). In practice, multiple users could share these credentials, especially in a watch floor environment |
| **Affected Component** | P2 (Auth Handler), D1 (JWT Session) |
| **Likelihood** | 4 (Likely) -- Demo system has only 3 accounts; operational use by IO cell would require sharing |
| **Impact** | 4 (High) -- Repudiation of any specific action; impossible to attribute operational decisions to individuals |
| **Risk Score** | **16 (HIGH)** |
| **Existing Mitigation** | Audit logs include userId and role; session JWT includes user identity; access review policy requires individual accounts |
| **Residual Risk** | HIGH -- Architecture supports individual accounts but only 3 demo accounts exist. No individual user provisioning workflow. |
| **Recommended Actions** | Implement user provisioning (SAML/OIDC integration with CAC/PIV); enforce unique accounts per individual; add IP + user-agent correlation to detect shared usage patterns |

---

### 3.4 INFORMATION DISCLOSURE

*Threats targeting confidentiality -- can an attacker access data they should not?*

#### I-1: CUI Data Exposure in Client-Side State

| Field | Detail |
|-------|--------|
| **ID** | I-1 |
| **Threat** | CUI-classified data (threat assessments, running estimates, MOE metrics, signature items) is loaded into the Zustand client-side store in plaintext, accessible via browser DevTools memory inspection |
| **Attack Vector** | Attacker with physical access to an authenticated workstation inspects browser memory, Local Storage, or JavaScript heap to extract operational data |
| **Affected Component** | D2 (Zustand Store), P6 (Client Renderer) |
| **Likelihood** | 3 (Possible) -- Requires access to authenticated browser session |
| **Impact** | 4 (High) -- Exposure of CUI threat assessments and operational metrics |
| **Risk Score** | **12 (HIGH)** |
| **Existing Mitigation** | 30-minute session timeout (AC-12); no persistent client-side storage (data lost on tab close); classification banner warns users; VIEWER role has read-only access with limited data scope |
| **Residual Risk** | HIGH -- While data is not persisted to disk, it exists in browser memory for the duration of the session. No screen lock enforcement. No data-loss prevention (DLP) controls. |
| **Recommended Actions** | Implement session lock after inactivity (AC-11 with screen lock); enforce endpoint security (MDM/EDR); implement server-side rendering for CUI data to reduce client-side exposure; add data-at-rest encryption for any client-side caching |

#### I-2: Environment Variable Leakage

| Field | Detail |
|-------|--------|
| **ID** | I-2 |
| **Threat** | Sensitive environment variables (NEXTAUTH_SECRET, ENCRYPTION_MASTER_KEY, AUDIT_HMAC_KEY, demo passwords) are exposed through process listing, error messages, or misconfigured health endpoints |
| **Attack Vector** | Server-side error with stack trace leaks env vars; `ps aux` shows environment; health endpoint inadvertently includes process info; container image inspection reveals build-time secrets |
| **Affected Component** | P5 (Health API), all server processes |
| **Likelihood** | 2 (Unlikely) -- Health endpoint was hardened to remove NODE_ENV/memory/uptime info; env vars loaded at runtime |
| **Impact** | 5 (Critical) -- NEXTAUTH_SECRET exposure enables JWT forgery; ENCRYPTION_MASTER_KEY exposure enables CUI decryption |
| **Risk Score** | **10 (MEDIUM)** |
| **Existing Mitigation** | Health endpoint returns only `{status, version, timestamp}`; env vars loaded from `.env.local` (gitignored); `.env.example` tracked without secrets; ErrorBoundary suppresses stack traces (SI-11) |
| **Residual Risk** | MEDIUM -- Environment variables stored in plaintext on filesystem. No secrets management service (KMS/Vault). Container images could retain build-time secrets. |
| **Recommended Actions** | Migrate to secrets management service (AWS Secrets Manager, HashiCorp Vault); scan container images for embedded secrets; implement runtime secret rotation; add secret detection to CI pipeline (e.g., gitleaks) |

#### I-3: Scoring Rubric Reveals Collection Priorities

| Field | Detail |
|-------|--------|
| **ID** | I-3 |
| **Threat** | The transparent scoring rubric (IO_KEYWORDS, THREAT_INDICATORS, GCC keywords) visible in the API response reveals US intelligence collection priorities and keyword watchlists to any authenticated user |
| **Attack Vector** | Analyst (or compromised account) examines `matchedKeywords`, `scoring.basisNote`, and `threatIndicators` fields in feed API response to reverse-engineer the exact keyword watchlists used for IO relevance scoring |
| **Affected Component** | P3 (Feeds API) |
| **Likelihood** | 4 (Likely) -- Data is returned in every feed API response by design |
| **Impact** | 2 (Low) -- Keywords are based on publicly known IO terminology; the rubric is intentionally transparent per design requirement. However, aggregated keyword lists could reveal specific focus areas |
| **Risk Score** | **8 (MEDIUM)** |
| **Existing Mitigation** | Keywords drawn from public IO literature (JP 3-13, DFRLab); scoring transparency is a design requirement; access requires authentication |
| **Residual Risk** | LOW -- This is an accepted risk per the system's transparency requirements. The rubric explicitly documents that it uses publicly available terminology. |
| **Recommended Actions** | Document this as an accepted risk; ensure keyword lists do not include classified collection indicators; implement role-based field filtering (VIEWER sees scores but not keyword breakdown) |

#### I-4: Source Code Exposure via Error Messages

| Field | Detail |
|-------|--------|
| **ID** | I-4 |
| **Threat** | Unhandled server-side exceptions expose source code paths, library versions, or internal architecture details in error responses |
| **Attack Vector** | Malformed requests or edge-case inputs trigger unhandled exceptions that leak stack traces, file paths, or dependency information |
| **Affected Component** | P3 (Feeds API), P4 (Link-Check API), P1 (Middleware) |
| **Likelihood** | 2 (Unlikely) -- ErrorBoundary and try/catch blocks in all API routes; Next.js production mode suppresses stack traces |
| **Impact** | 2 (Low) -- Internal paths and library versions aid reconnaissance but do not directly compromise data |
| **Risk Score** | **4 (LOW)** |
| **Existing Mitigation** | ErrorBoundary component with safe fallback UI (SI-11); all API routes wrapped in try/catch; health endpoint returns minimal info; Next.js production mode sanitizes errors |
| **Residual Risk** | LOW -- Standard error handling is in place. Development mode may expose more information. |
| **Recommended Actions** | Audit all error paths for information leakage; implement global error handler that sanitizes all responses; ensure `NODE_ENV=production` in all non-development deployments |

---

### 3.5 DENIAL OF SERVICE

*Threats targeting availability -- can an attacker prevent legitimate use?*

#### D-1: Rate Limit Bypass via Distributed Attack

| Field | Detail |
|-------|--------|
| **ID** | D-1 |
| **Threat** | Attacker launches distributed denial of service (DDoS) from many source IPs, each staying under the per-IP rate limit of 60 req/min, overwhelming the application |
| **Attack Vector** | Botnet sends 59 requests/minute from each of 1,000+ IPs, totaling 59,000+ req/min against a single Next.js instance |
| **Affected Component** | P1 (Middleware), D4 (Rate Limit Map) |
| **Likelihood** | 3 (Possible) -- Standard DDoS technique; no WAF or CDN in current deployment |
| **Impact** | 4 (High) -- Application becomes unavailable; IO planners lose access during critical operations |
| **Risk Score** | **12 (HIGH)** |
| **Existing Mitigation** | Per-IP rate limiting (60 req/min); stale entry cleanup every 5 minutes; `Retry-After` header in 429 responses |
| **Residual Risk** | HIGH -- Single-instance deployment with no WAF, CDN, or network-layer DDoS protection. In-memory rate limit map grows linearly with unique attacker IPs. |
| **Recommended Actions** | Deploy behind WAF (AWS WAF, Cloudflare) with DDoS protection; implement global (not per-IP) request ceiling; add circuit breaker pattern; deploy auto-scaling container fleet; implement IP reputation filtering |

#### D-2: RSS Feed Fetch Resource Exhaustion

| Field | Detail |
|-------|--------|
| **ID** | D-2 |
| **Threat** | Attacker triggers excessive RSS feed fetches by rapidly switching GCCs or calling `/api/feeds` repeatedly, causing the server to open many outbound HTTPS connections to feed sources simultaneously |
| **Attack Vector** | Authenticated user (or compromised session) rapidly calls `GET /api/feeds?gcc=INDOPACOM`, then `gcc=CENTCOM`, etc., each triggering 3-4 parallel feed fetches with 8-second timeouts |
| **Affected Component** | P3 (Feeds API), E5 (RSS Feed Sources) |
| **Likelihood** | 3 (Possible) -- Requires authentication but straightforward to execute |
| **Impact** | 3 (Moderate) -- Server resources consumed by outbound connections; potential for Node.js event loop blocking |
| **Risk Score** | **9 (MEDIUM)** |
| **Existing Mitigation** | Rate limiting (60 req/min); 8-second AbortSignal timeout per feed; 5-minute Next.js revalidation cache (`next: { revalidate: 300 }`); max 15 items per feed |
| **Residual Risk** | MEDIUM -- 5-minute cache mitigates repeated fetches for same GCC, but switching between 6 GCCs in rapid succession could exhaust connections. |
| **Recommended Actions** | Implement feed-level caching (Redis) shared across instances; add per-user rate limit in addition to per-IP; implement background feed refresh worker instead of on-demand fetching; add connection pool limits for outbound HTTPS |

#### D-3: In-Memory Map Exhaustion

| Field | Detail |
|-------|--------|
| **ID** | D-3 |
| **Threat** | Attacker floods the rate limit or lockout in-memory Maps with entries from many unique IPs, consuming server memory until OOM crash |
| **Attack Vector** | Attacker sends one request from each of millions of spoofed IPs, creating an entry in `ipHits` Map for each. 5-minute cleanup interval is too slow to prevent growth |
| **Affected Component** | D4 (Rate Limit Map), D5 (Lockout Map) |
| **Likelihood** | 3 (Possible) -- Requires header spoofing (see S-3) and high request volume |
| **Impact** | 3 (Moderate) -- OOM crash causes service restart; temporary loss of availability |
| **Risk Score** | **9 (MEDIUM)** |
| **Existing Mitigation** | Stale entry cleanup every 5 minutes; rate limit entries expire after 60 seconds; lockout entries expire after 15 minutes |
| **Residual Risk** | MEDIUM -- No maximum map size enforcement. Cleanup runs on request cadence, not guaranteed timer. |
| **Recommended Actions** | Implement LRU cache with maximum size for rate limit/lockout maps; move to Redis-backed rate limiting with TTL; add memory usage monitoring and alerting; implement IP reputation deny-list at network layer |

---

### 3.6 ELEVATION OF PRIVILEGE

*Threats targeting authorization -- can an attacker gain more access than permitted?*

#### E-1: JWT Role Claim Tampering

| Field | Detail |
|-------|--------|
| **ID** | E-1 |
| **Threat** | Attacker modifies the `role` claim in a JWT token from `VIEWER` to `ADMIN`, gaining full administrative access |
| **Attack Vector** | If attacker can forge JWT (see S-1) or if JWT signature is not properly validated, they can alter the role claim. The `extractRoleFromJWT()` function in middleware parses the JWT payload directly without cryptographic verification |
| **Affected Component** | P1 (Middleware), D1 (JWT Session) |
| **Likelihood** | 2 (Unlikely) -- `extractRoleFromJWT()` decodes the token for role extraction; actual authentication is validated by NextAuth.js session cookie verification. However, the middleware function does base64 decode without HMAC verification |
| **Impact** | 5 (Critical) -- ADMIN access grants: user management, all API endpoints, export capability, full CUI data access |
| **Risk Score** | **10 (MEDIUM)** |
| **Existing Mitigation** | NextAuth.js validates JWT signature server-side during session callbacks; middleware checks cookie presence but does independent role extraction; role values are validated against allowed list `["ADMIN", "ANALYST", "VIEWER", "SYSTEM"]` |
| **Residual Risk** | MEDIUM -- The `extractRoleFromJWT()` helper performs base64 decode without signature verification. If the NextAuth session cookie and the decoded JWT diverge, the role extraction could be spoofed. This is a defense-in-depth gap. |
| **Recommended Actions** | Use `getServerSession()` from NextAuth.js in middleware instead of manual JWT parsing; validate JWT signature before extracting role claims; implement server-side session lookup as authoritative role source |

#### E-2: Path Traversal in Permission Mapping

| Field | Detail |
|-------|--------|
| **ID** | E-2 |
| **Threat** | Attacker crafts API request paths that bypass `permissionForPath()` mapping, accessing endpoints without proper RBAC check |
| **Attack Vector** | `permissionForPath()` uses `startsWith` matching: `/api/feeds`, `/api/link-check`, `/api/health`. An attacker could potentially craft paths like `/api/feeds/../admin` or use URL encoding to bypass the prefix check |
| **Affected Component** | P1 (Middleware), `lib/auth.ts` |
| **Likelihood** | 1 (Rare) -- Next.js normalizes URL paths before they reach middleware; path traversal in URL is mitigated by the framework |
| **Impact** | 4 (High) -- Bypass of RBAC enforcement; access to unauthorized API endpoints |
| **Risk Score** | **4 (LOW)** |
| **Existing Mitigation** | Next.js URL normalization removes path traversal sequences; `permissionForPath()` returns `null` for unmapped paths (no special access granted); middleware only matches `/api/:path*` |
| **Residual Risk** | LOW -- Next.js framework provides adequate path normalization. |
| **Recommended Actions** | Add explicit path validation/canonicalization before permission check; implement deny-by-default for unmapped API paths; add integration tests for path traversal attempts |

#### E-3: VIEWER Role Escalation via Direct API Call

| Field | Detail |
|-------|--------|
| **ID** | E-3 |
| **Threat** | VIEWER-role user bypasses UI restrictions by directly calling `/api/link-check` (which requires ANALYST permission), exploiting any gaps between UI-level and middleware-level enforcement |
| **Attack Vector** | VIEWER user uses `curl`, Postman, or browser fetch to call `POST /api/link-check` directly, including their session cookie. If middleware RBAC check is inconsistent with UI restrictions, access is granted |
| **Affected Component** | P1 (Middleware), P4 (Link-Check API) |
| **Likelihood** | 2 (Unlikely) -- Middleware RBAC check is implemented and enforced independently of UI |
| **Impact** | 3 (Moderate) -- VIEWER gains ability to probe external URLs via link-check; potential SSRF reconnaissance |
| **Risk Score** | **6 (MEDIUM)** |
| **Existing Mitigation** | Middleware extracts JWT role and checks `hasPermission(role, "api:link-check")` before forwarding to route handler; VIEWER role permission set only includes `["read", "api:feeds"]` -- does NOT include `api:link-check`; middleware returns 403 with audit log entry |
| **Residual Risk** | LOW -- RBAC enforcement is correctly implemented at the middleware layer, independent of UI. The residual risk is in the JWT role extraction accuracy (see E-1). |
| **Recommended Actions** | Add integration tests verifying VIEWER cannot access link-check endpoint; implement defense-in-depth with route-level role validation in addition to middleware |

#### E-4: SSRF to Internal Service Access

| Field | Detail |
|-------|--------|
| **ID** | E-4 |
| **Threat** | Attacker uses `/api/link-check` as an SSRF oracle to probe internal network services, metadata endpoints, or cloud infrastructure |
| **Attack Vector** | Authenticated user submits internal URLs (e.g., `http://169.254.169.254/latest/meta-data`, `http://10.0.0.1:8080/admin`) to the link-check API, using the server as a proxy to reach internal services |
| **Affected Component** | P4 (Link-Check API) |
| **Likelihood** | 2 (Unlikely) -- Comprehensive SSRF blocklist implemented; requires authentication |
| **Impact** | 5 (Critical) -- Cloud metadata exfiltration could yield IAM credentials; internal service access could compromise infrastructure |
| **Risk Score** | **10 (MEDIUM)** |
| **Existing Mitigation** | `isBlockedUrl()` blocklist covers: localhost, 127.0.0.1, 0.0.0.0, [::1], 169.254.169.254, metadata.google.internal, all RFC 1918 ranges, IPv6 ULA/link-local, numeric-only hostnames, non-HTTP protocols; audit log: `SSRF_BLOCKED` with `PERMANENT` retention |
| **Residual Risk** | MEDIUM -- Blocklist may not cover all possible bypass techniques (e.g., DNS rebinding, IPv6 mapped addresses, decimal/octal IP encoding beyond current checks, HTTP redirects to internal addresses after initial check passes). |
| **Recommended Actions** | Implement DNS resolution check (resolve hostname, verify resolved IP is not internal BEFORE making request); add redirect-following with post-redirect SSRF check; implement allowlist approach (only permit known-good domains) in addition to blocklist; add IPv6 mapped IPv4 address detection |

---

## 4. Consolidated Risk Register

| ID | Category | Threat | Likelihood | Impact | Risk Score | Risk Level | Status |
|----|----------|--------|:----------:|:------:|:----------:|:----------:|--------|
| **S-2** | Spoofing | Credential stuffing (demo accounts) | 3 | 5 | **15** | HIGH | OPEN |
| **R-2** | Repudiation | Shared account usage | 4 | 4 | **16** | HIGH | OPEN |
| **T-2** | Tampering | Audit log tampering (pre-SIEM) | 3 | 5 | **15** | HIGH | OPEN |
| **S-3** | Spoofing | IP spoofing (rate limit bypass) | 4 | 3 | **12** | HIGH | OPEN |
| **D-1** | DoS | Distributed rate limit bypass | 3 | 4 | **12** | HIGH | OPEN |
| **I-1** | Disclosure | CUI in client-side state | 3 | 4 | **12** | HIGH | OPEN |
| **R-1** | Repudiation | Client-side audit suppression | 3 | 4 | **12** | HIGH | OPEN |
| **S-1** | Spoofing | JWT token forgery | 2 | 5 | **10** | MEDIUM | OPEN |
| **E-1** | EoP | JWT role claim tampering | 2 | 5 | **10** | MEDIUM | OPEN |
| **I-2** | Disclosure | Environment variable leakage | 2 | 5 | **10** | MEDIUM | OPEN |
| **E-4** | EoP | SSRF to internal services | 2 | 5 | **10** | MEDIUM | OPEN |
| **T-1** | Tampering | Zustand store manipulation | 3 | 3 | **9** | MEDIUM | OPEN |
| **T-4** | Tampering | CSRF bypass (missing Origin) | 3 | 3 | **9** | MEDIUM | OPEN |
| **D-2** | DoS | RSS fetch resource exhaustion | 3 | 3 | **9** | MEDIUM | OPEN |
| **D-3** | DoS | In-memory map exhaustion | 3 | 3 | **9** | MEDIUM | OPEN |
| **S-4** | Spoofing | RSS feed impersonation | 2 | 4 | **8** | MEDIUM | OPEN |
| **I-3** | Disclosure | Scoring rubric reveals priorities | 4 | 2 | **8** | MEDIUM | ACCEPTED |
| **E-3** | EoP | VIEWER role escalation | 2 | 3 | **6** | MEDIUM | OPEN |
| **E-2** | EoP | Path traversal in permissions | 1 | 4 | **4** | LOW | OPEN |
| **T-3** | Tampering | MITM on RSS feeds | 1 | 4 | **4** | LOW | OPEN |
| **I-4** | Disclosure | Source code in error messages | 2 | 2 | **4** | LOW | OPEN |

### 4.1 Risk Distribution Summary

| Risk Level | Count | Percentage |
|-----------|:-----:|:----------:|
| CRITICAL (20-25) | 0 | 0% |
| HIGH (12-19) | 7 | 33% |
| MEDIUM (6-11) | 11 | 52% |
| LOW (1-5) | 3 | 14% |
| **Total Identified Threats** | **21** | **100%** |

---

## 5. Threat Actor Profiles

| Actor | Capability | Motivation | Relevant Threats |
|-------|-----------|------------|-----------------|
| **Nation-State APT (PRC/Russia)** | HIGH -- Sophisticated tooling, zero-days, supply chain attacks | Disrupt US IO assessment capability; exfiltrate collection priorities; poison intelligence feeds | S-4, T-2, T-3, I-1, I-3, E-4 |
| **Insider Threat (Disgruntled Analyst)** | MEDIUM -- Authenticated access, knowledge of system internals | Sabotage operational assessments; exfiltrate CUI; cover tracks | T-1, R-1, R-2, I-1, E-1 |
| **Hacktivists** | LOW-MEDIUM -- Publicly available tools, web attacks | Disrupt military systems; embarrass DoD | D-1, D-2, D-3, S-3 |
| **Opportunistic Attacker** | LOW -- Automated scanning, credential stuffing | Exploit exposed services; cryptocurrency mining | S-2, S-3, D-1, I-4 |
| **Supply Chain Compromise** | MEDIUM -- Dependency injection, package takeover | Inject backdoor via npm dependency | Not directly modeled (CI/CD layer) |

---

## 6. Recommendations and Remediation Priority

### 6.1 Immediate (0-30 Days) -- Address HIGH Risks

| Priority | Action | Addresses | Effort |
|----------|--------|-----------|--------|
| P1 | Remove hardcoded demo credentials; implement env-only user provisioning | S-2 | LOW |
| P2 | Deploy behind reverse proxy that validates/overwrites X-Forwarded-For | S-3, D-1 | MEDIUM |
| P3 | Implement out-of-band log forwarding to append-only storage | T-2 | MEDIUM |
| P4 | Replace `extractRoleFromJWT()` with NextAuth `getServerSession()` | E-1, E-3 | LOW |
| P5 | Implement individual user accounts (SAML/OIDC integration path) | R-2 | HIGH |

### 6.2 Short-Term (30-90 Days) -- Address MEDIUM Risks

| Priority | Action | Addresses | Effort |
|----------|--------|-----------|--------|
| P6 | Implement server-side state persistence for critical operational data | T-1, R-1, I-1 | HIGH |
| P7 | Migrate secrets to KMS/Vault; add secret scanning to CI | I-2 | MEDIUM |
| P8 | Implement double-submit CSRF token pattern | T-4 | LOW |
| P9 | Add DNS resolution pre-check and redirect-following SSRF protection | E-4 | MEDIUM |
| P10 | Implement LRU cache with size limits for rate limit/lockout maps | D-3 | LOW |
| P11 | Deploy WAF with DDoS protection | D-1 | MEDIUM |
| P12 | Implement background feed refresh worker with Redis caching | D-2 | MEDIUM |

### 6.3 Long-Term (90+ Days) -- Harden for Production

| Priority | Action | Addresses | Effort |
|----------|--------|-----------|--------|
| P13 | Implement CAC/PIV authentication for DoD environment | S-1, S-2, R-2 | HIGH |
| P14 | Implement certificate pinning for critical RSS sources | S-4, T-3 | MEDIUM |
| P15 | Deploy in FedRAMP-authorized environment with network segmentation | D-1, E-4 | HIGH |
| P16 | Engage penetration testing team for comprehensive assessment | ALL | HIGH |
| P17 | Implement data-loss prevention (DLP) controls for CUI | I-1 | HIGH |

---

## Appendix A: Methodology Notes

This threat model was generated using the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) applied to the IE-SYNC system architecture as documented in IE-SYNC-SAD-2026-001.

**Scope Limitations:**
- Analysis is limited to the application layer at TRL 4
- Infrastructure-layer threats (network, OS, physical) are out of scope
- Supply chain threats are partially addressed via CI/CD analysis but not exhaustively modeled
- Social engineering vectors against users are not modeled

**Review Cadence:**
- This threat model shall be reviewed quarterly or upon any major architectural change
- New threats identified during development or incident response shall be added to the risk register
- Risk scores shall be re-evaluated after mitigation implementation

---

## Appendix B: Document Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-02-22 | DjahankhahTech | Initial STRIDE threat model |

---

**END OF DOCUMENT**

**Classification:** UNCLASSIFIED // FOUO
**Distribution:** Limited to IE-SYNC development team, security reviewers, and authorized assessors.
