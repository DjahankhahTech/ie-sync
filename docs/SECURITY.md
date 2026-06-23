# IE-SYNC Security Policy

**Last Updated:** 2026-02-22

---

## Scope

This security policy applies to the IE-SYNC application and its associated infrastructure, including:
- The Next.js web application and all API routes
- npm dependencies and supply chain
- CI/CD pipeline and deployment infrastructure
- Documentation and configuration files

---

## Reporting Vulnerabilities

If you discover a security vulnerability in IE-SYNC, please report it responsibly.

### How to Report
- **Email:** [security contact TBD]
- **Subject line:** [IE-SYNC SECURITY] Brief description
- **Include:**
  - Description of the vulnerability
  - Steps to reproduce
  - Potential impact assessment
  - Suggested remediation (if any)

### Do NOT
- Publicly disclose the vulnerability before it is remediated
- Access or modify data belonging to other users
- Perform denial-of-service testing against production systems

---

## Response SLA

| Action | Timeline |
|--------|----------|
| Acknowledgment of report | 24 hours |
| Initial triage and severity assessment | 72 hours |
| Remediation plan communicated to reporter | 7 days |
| Fix deployed (Critical/High) | 14 days |
| Fix deployed (Medium/Low) | 30 days |

---

## Safe Harbor

We consider security research conducted in good faith to be authorized activity. We will not pursue legal action against researchers who:
- Act in good faith to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts they own or with explicit permission
- Report vulnerabilities through the designated channel
- Allow reasonable time for remediation before any disclosure

---

## Security Measures

### Authentication & Access Control
- Role-based access control (RBAC) with ADMIN, ANALYST, VIEWER, SYSTEM roles
- JWT session tokens with 30-minute expiration
- Rate limiting on all API endpoints (60 req/min per IP)

### Input Validation
- Zod schema validation on all API inputs
- SSRF protection blocking internal/private network addresses
- URL allowlist for link health checking

### Transport Security
- HSTS with 2-year max-age, includeSubDomains, preload
- Content Security Policy restricting script and resource origins
- X-Frame-Options DENY preventing clickjacking

### Audit Logging
- Structured JSON audit logs for all authentication, authorization, and state change events
- NIST 800-171 AU-family compliant event taxonomy

### Supply Chain
- CycloneDX SBOM generated on every CI run
- Weekly automated npm audit
- Pinned dependency versions

---

## Compliance

IE-SYNC is designed to align with:
- **NIST SP 800-171** Rev. 2 (Protecting CUI in Nonfederal Systems)
- **NIST SP 800-53** (Security and Privacy Controls) - selected controls
- **CMMC Level 2** requirements (partial)

---

## Contact

For security inquiries, contact the IE-SYNC development team through the designated security reporting channel.
