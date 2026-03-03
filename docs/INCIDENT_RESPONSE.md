# IE-SYNC Incident Response Plan

**NIST 800-171 Controls:** IR-1 through IR-8
**Classification:** CUI // FOUO
**Last Updated:** 2026-02-22
**Review Cadence:** Quarterly (IR-8)

---

## 1. Purpose & Scope (IR-1)

This plan establishes procedures for detecting, analyzing, containing, eradicating, and recovering from security incidents affecting the IE-SYNC Information Environment Decision Support system.

### In Scope
- Unauthorized access to IE-SYNC application or APIs
- Data exfiltration of CUI or operationally sensitive information
- Coordinated inauthentic behavior (CIB) targeting the tool itself
- Supply chain compromise of dependencies
- Denial of service against IE-SYNC infrastructure
- Insider threat activity

### Out of Scope
- Physical security incidents (refer to host installation SOP)
- Incidents in adjacent systems not directly connected to IE-SYNC

---

## 2. Roles & Responsibilities (IR-1)

| Role | Responsibility | Contact |
|------|---------------|---------|
| **IO Cell Lead** | Incident Commander; makes containment decisions | [TBD] |
| **System Administrator** | Technical response; log analysis; system recovery | [TBD] |
| **Security POC** | Coordinates with higher HQ; manages reporting | [TBD] |
| **Development Lead** | Code-level investigation; patch deployment | [TBD] |

---

## 3. Incident Categories (IR-2)

| Category | Severity | Example |
|----------|----------|---------|
| **CAT-1: Unauthorized Access** | CRITICAL | Unauthenticated API access, credential compromise |
| **CAT-2: Data Exfiltration** | CRITICAL | CUI extracted via API, unauthorized data export |
| **CAT-3: CIB Against Tool** | HIGH | Adversary feeding poisoned data to influence IO decisions |
| **CAT-4: Supply Chain** | HIGH | Compromised npm dependency, malicious code injection |
| **CAT-5: Denial of Service** | MEDIUM | Rate limit exhaustion, resource exhaustion attack |
| **CAT-6: Insider Threat** | HIGH | Analyst misuse, unauthorized COA modification |

---

## 4. Incident Handling Procedures (IR-4)

### Phase 1: Detection
- Monitor structured audit logs (pino JSON output) for anomalous patterns
- Review AUTH_FAILURE, ACCESS_DENIED, SSRF_BLOCKED, RATE_LIMITED events
- Check npm audit results from CI pipeline weekly
- Monitor GitHub Security Advisories for dependency vulnerabilities

### Phase 2: Analysis
- Correlate audit log entries across time window
- Identify affected users, IPs, resources from audit trail
- Determine scope: which GCC data may be compromised
- Assess operational impact on IO decision-making

### Phase 3: Containment
- **Immediate:** Rotate NEXTAUTH_SECRET and ENCRYPTION_MASTER_KEY, invalidate all sessions
- **Short-term:** Block offending IPs via middleware rate limiter / account lockout
- **Credential compromise:** Rotate all env-var passwords (DEMO_*_PASSWORD), force re-authentication
- **If supply chain:** Pin affected dependency, audit package-lock.json, regenerate SBOM
- **If CIB:** Isolate affected sensor feeds, mark as REFUTED in triage
- **Verify audit chain integrity:** Run `verifyChain()` on immutable audit logs to detect tampering

### Phase 4: Eradication
- Patch vulnerable code or dependency
- Rebuild and redeploy from clean source (verified via git hash)
- Regenerate SBOM to confirm clean dependency tree
- Clear any compromised cached data

### Phase 5: Recovery
- Restore service with patched codebase
- Re-enable rate limits and auth enforcement
- Validate data integrity of MOE metrics and threat entity sources
- Resume normal operations with enhanced monitoring (72hr window)

---

## 5. Incident Monitoring (IR-5)

### Audit Log Review Schedule
| Frequency | Review | Owner |
|-----------|--------|-------|
| Real-time | CRITICAL/AUTH_FAILURE alerts | Automated |
| Daily | SSRF_BLOCKED, RATE_LIMITED, ACCESS_DENIED | Security POC |
| Weekly | All STATE_CHANGE events, npm audit results | System Admin |
| Monthly | Full audit log analysis, trend review | IO Cell Lead |

### Key Indicators of Compromise (IOCs)
- Repeated AUTH_FAILURE from same IP (brute force) — triggers account lockout at 5 attempts
- SSRF_BLOCKED events targeting cloud metadata endpoints
- STATE_CHANGE events outside normal working hours
- Unexpected GCC context switches (lateral movement)
- API_ERROR spike (fuzzing/scanning activity)
- CSRF origin mismatch events (cross-site attack attempt)
- RBAC ACCESS_DENIED for VIEWER accessing analyst endpoints (privilege escalation attempt)
- Immutable audit log chain breaks (seq gaps or HMAC failures = evidence tampering)
- HTTP-to-HTTPS redirect events in production (TLS downgrade attempt)

---

## 6. Incident Reporting (IR-6)

### Reporting Timeline
| Action | Timeline |
|--------|----------|
| Initial detection acknowledgment | 1 hour |
| Preliminary assessment to IO Cell Lead | 4 hours |
| Incident report to higher HQ (if CAT-1/2) | 24 hours |
| After-action report | 72 hours post-recovery |

### Report Template
```
INCIDENT REPORT - IE-SYNC
Date/Time Detected:
Category: CAT-[1-6]
Severity: CRITICAL / HIGH / MEDIUM
Affected Systems:
Affected Data:
Detection Method:
Containment Actions Taken:
Root Cause (if known):
Operational Impact:
Recommendations:
```

---

## 7. External Assistance (IR-7)

| Resource | Contact | When |
|----------|---------|------|
| CISA | cisa.gov/report | Supply chain, nation-state activity |
| GitHub Security | security@github.com | Repository compromise |
| npm Security | security@npmjs.com | Package compromise |
| MC-CIRT | [TBD - Marine Corps Cyber Incident Response Team] | All CAT-1/2 |

---

## 8. Plan Maintenance (IR-8)

- **Quarterly Review:** Validate contact information, update procedures
- **Post-Incident:** Update plan based on lessons learned within 30 days
- **Dependency Update:** Review when major dependencies change
- **Exercise:** Tabletop exercise annually; walk-through semi-annually

---

## Appendix: Audit Event Quick Reference

| Event | Meaning | Response |
|-------|---------|----------|
| AUTH_SUCCESS | Successful login | Normal |
| AUTH_FAILURE | Failed login attempt | Monitor for brute force |
| ACCESS_DENIED | Unauthenticated API access | Investigate source IP |
| RATE_LIMITED | Rate limit exceeded | Check for DoS |
| SSRF_BLOCKED | Internal network probe attempt | Investigate immediately |
| VALIDATION_FAILURE | Malformed input | Check for fuzzing |
| STATE_CHANGE | Operational action (GCC switch, COA select) | Normal; review patterns |
| API_ERROR | Unhandled error | Investigate root cause |
