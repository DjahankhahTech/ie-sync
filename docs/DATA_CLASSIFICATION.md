# IE-SYNC Data Classification Model

**NIST 800-171 Controls:** AC-4, MP-2, MP-4, SC-7, SC-8, SC-13, SC-28
**CMMC Level 2:** SC.L2-3.13.8, SC.L2-3.13.11, SC.L2-3.13.16, MP.L2-3.8.1
**Classification:** CUI // FOUO
**Last Updated:** 2026-02-22
**Review Cadence:** Semi-annual

---

## 1. Purpose

This document establishes the data classification model for the IE-SYNC system, defining how different categories of data are identified, labeled, handled, stored, transmitted, and destroyed. It ensures appropriate protection controls are applied based on data sensitivity.

---

## 2. Classification Levels

### Level 1: CUI (Controlled Unclassified Information)
**Marking:** `CUI // FOUO` or `CUI // SP-CTI` (Controlled Technical Information)
**Description:** Information that requires safeguarding per NIST SP 800-171.

| Data Type | Examples | Storage | Transmission | Retention |
|-----------|----------|---------|-------------|-----------|
| Threat assessments | Threat entity profiles, attribution data | AES-256 encrypted | TLS 1.2+ required | 5 years |
| Running estimates | IO recommendations, COA analysis | AES-256 encrypted | TLS 1.2+ required | 3 years |
| Escalated intelligence | Analyst triage notes, tagged feed items | AES-256 encrypted | TLS 1.2+ required | 3 years |
| MOE/MOP metrics | Operational effectiveness measurements | AES-256 encrypted | TLS 1.2+ required | 3 years |
| Signature data | IO signatures, pattern analysis | AES-256 encrypted | TLS 1.2+ required | 5 years |
| Source identities | RSS source URLs, collection methods | AES-256 encrypted | TLS 1.2+ required | 1 year |

### Level 2: SENSITIVE (Internal Use Only)
**Marking:** `SENSITIVE` or no special marking
**Description:** Information that is not CUI but requires reasonable protection.

| Data Type | Examples | Storage | Transmission | Retention |
|-----------|----------|---------|-------------|-----------|
| User credentials | Hashed passwords, session tokens | AES-256 encrypted | TLS 1.2+ required | Account lifetime |
| Audit logs | Security events, access records | HMAC-signed, immutable | TLS 1.2+ required | Per retention class |
| Configuration | API keys, secrets, env vars | Encrypted at rest | Never in URLs | Rotated quarterly |
| SBOM | Dependency inventory | Plaintext (signed) | TLS 1.2+ | Per release |

### Level 3: PUBLIC
**Marking:** None
**Description:** Information safe for public disclosure.

| Data Type | Examples | Storage | Transmission | Retention |
|-----------|----------|---------|-------------|-----------|
| RSS feed data | Published news articles (pre-scoring) | Plaintext cache | TLS 1.2+ | 24 hours |
| Application metadata | Version, health status | Plaintext | TLS 1.2+ | Current |
| Open-source code | Public repo (if applicable) | Git | HTTPS | Indefinite |

---

## 3. Data Flow Boundaries

```
EXTERNAL (PUBLIC)                    IE-SYNC BOUNDARY (CUI)
                                     ┌────────────────────────────┐
  RSS Feeds ──── TLS 1.2+ ─────────>│  /api/feeds                │
  (PUBLIC)                           │  Score + classify = CUI     │
                                     │                            │
  Link Check ── TLS 1.2+ ─────────>│  /api/link-check            │
  (PUBLIC URLs)                      │  Results = SENSITIVE        │
                                     │                            │
  Auth ──────── TLS 1.2+ ─────────>│  /api/auth                  │
  (Credentials)                      │  Tokens = SENSITIVE         │
                                     │                            │
                                     │  ┌─────────────────────┐  │
                                     │  │ Zustand Store (CUI)  │  │
                                     │  │ - Threat entities    │  │
                                     │  │ - Running estimates  │  │
                                     │  │ - MOE/MOP metrics    │  │
                                     │  │ - Escalated items    │  │
                                     │  └─────────────────────┘  │
                                     │                            │
                                     │  ┌─────────────────────┐  │
                                     │  │ Audit Logs (SENS.)   │  │
                                     │  │ HMAC-signed chain    │──┼──> SIEM (TLS 1.2+)
                                     │  └─────────────────────┘  │
                                     └────────────────────────────┘
```

### Boundary Rules
1. **Ingress:** All external data enters via HTTPS (TLS 1.2+) only
2. **Processing:** Public data becomes CUI when enriched with IO scoring/analyst notes
3. **Egress:** CUI data never transmitted without TLS 1.2+ encryption
4. **Cross-boundary:** No CUI data in URL parameters, error messages, or logs visible to unauthorized users

---

## 4. Encryption Requirements (SC-13, SC-28)

### 4.1 At Rest (SC-28)
| Classification | Encryption | Algorithm | Key Management |
|---------------|-----------|-----------|----------------|
| CUI | Required | AES-256-GCM | `ENCRYPTION_MASTER_KEY` env var; KMS in production |
| SENSITIVE | Required | AES-256-GCM | Same master key with key versioning |
| PUBLIC | Not required | N/A | N/A |

### 4.2 In Transit (SC-8)
| Classification | Minimum | Protocol | Certificate |
|---------------|---------|----------|-------------|
| CUI | TLS 1.2 | HTTPS only | CA-signed; HSTS enforced |
| SENSITIVE | TLS 1.2 | HTTPS only | CA-signed; HSTS enforced |
| PUBLIC | TLS 1.2 | HTTPS preferred | CA-signed |

### 4.3 Field-Level Encryption
For CUI data stored in a database (future):
```typescript
import { encryptField, decryptField } from "@/lib/encryption";

// Store: encryptField("SSN: 123-45-6789") → JSON blob
// Retrieve: decryptField(blob) → "SSN: 123-45-6789"
// Search: hashForIndex("123-45-6789") → deterministic hash
```

---

## 5. Data Handling Procedures

### 5.1 Data Labeling (MP-4)
- All API responses containing CUI include classification header:
  ```
  X-Data-Classification: CUI
  ```
- Audit log entries include `classification: "CUI" | "UNCLASSIFIED"` field
- UI components display classification banner per data source

### 5.2 Data Export (DATA_EXPORT events)
- All data exports are audit-logged with immutable chain
- CUI exports require ADMIN or ANALYST role
- Export format includes classification metadata
- No CUI data in clipboard without audit event

### 5.3 Data Destruction
| Classification | Method | Verification |
|---------------|--------|-------------|
| CUI | Cryptographic erasure (key deletion) | Audit log confirmation |
| SENSITIVE | Overwrite + delete | Audit log confirmation |
| PUBLIC | Standard delete | None required |

---

## 6. Incident Classification Impact

When a security incident occurs, data classification determines response:

| Data at Risk | Response Level | Notification Required |
|-------------|---------------|---------------------|
| CUI compromised | CAT-1/CAT-2 (CRITICAL) | MC-CIRT within 24 hours |
| SENSITIVE compromised | CAT-3 (HIGH) | IO Cell Lead within 4 hours |
| PUBLIC only | CAT-5 (MEDIUM) | Standard incident response |

---

## 7. Compliance Mapping

| Requirement | NIST 800-171 | CMMC Level 2 | Implementation |
|------------|-------------|--------------|----------------|
| Information flow enforcement | AC-4 | AC.L2-3.1.3 | Middleware boundary checks |
| Media protection | MP-2 | MP.L2-3.8.1 | Encryption at rest |
| Media marking | MP-4 | MP.L2-3.8.4 | Classification headers/fields |
| Boundary protection | SC-7 | SC.L2-3.13.1 | SSRF blocklist, CSP |
| Transmission confidentiality | SC-8 | SC.L2-3.13.8 | TLS 1.2+, HSTS |
| Cryptographic protection | SC-13 | SC.L2-3.13.11 | AES-256-GCM |
| Protection at rest | SC-28 | SC.L2-3.13.16 | Field-level encryption |

---

## 8. Policy Maintenance

- Reviewed semi-annually (next review: 2026-08-22)
- Updated when new data types are added to IE-SYNC
- Updated after any CUI-related incident
- Approved by IO Cell Lead and Security POC
