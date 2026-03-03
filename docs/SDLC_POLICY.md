# IE-SYNC Secure Software Development Lifecycle (SDLC) Policy

**Document Identifier:** IE-SYNC-SDLC-2026-001
**Version:** 1.0
**Classification:** UNCLASSIFIED // FOUO
**Date:** 2026-02-22
**Prepared By:** DjahankhahTech Security Engineering
**Approved By:** IO Cell Lead (Pending)
**Compliance Framework:** NIST SP 800-171 Rev. 2, NIST SP 800-218 (SSDF), CMMC Level 2
**Review Cadence:** Semi-Annual (next review: 2026-08-22)

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Normative References](#2-normative-references)
3. [SDLC Phase Model](#3-sdlc-phase-model)
4. [Code Governance](#4-code-governance)
5. [AI-Generated Code Review Controls](#5-ai-generated-code-review-controls)
6. [Dependency Management](#6-dependency-management)
7. [Static and Dynamic Analysis Requirements](#7-static-and-dynamic-analysis-requirements)
8. [CI/CD Security Gates](#8-cicd-security-gates)
9. [SBOM Generation Process](#9-sbom-generation-process)
10. [Vulnerability Remediation Workflow](#10-vulnerability-remediation-workflow)
11. [Developer Access Control](#11-developer-access-control)
12. [Insider Threat Mitigation](#12-insider-threat-mitigation)
13. [Secure Coding Standards](#13-secure-coding-standards)
14. [Training and Awareness](#14-training-and-awareness)
15. [Policy Enforcement and Exceptions](#15-policy-enforcement-and-exceptions)
16. [Compliance Mapping](#16-compliance-mapping)

---

## 1. Purpose and Scope

### 1.1 Purpose

This policy establishes the Secure Software Development Lifecycle (SDLC) for IE-SYNC, an Information Environment Decision Support System handling Controlled Unclassified Information (CUI). It defines mandatory security controls, quality gates, and governance procedures that shall be followed at every phase of development, from requirements through deployment and maintenance.

This policy ensures that:

- All code changes are reviewed, tested, and traceable to an authorized developer
- AI-generated code is subject to enhanced review controls
- Third-party dependencies are vetted, inventoried, and continuously monitored
- Security vulnerabilities are detected early and remediated within defined SLAs
- The software supply chain is transparent and verifiable via SBOM
- Insider threat risk is mitigated through separation of duties and audit trails

### 1.2 Scope

This policy applies to:

| In Scope | Description |
|----------|-------------|
| All application source code | TypeScript, TSX, configuration files, CI/CD workflows |
| All developers and contributors | Including contractors, AI coding assistants, and automated tooling |
| All development environments | Local workstations, CI/CD runners, staging, production |
| All third-party dependencies | npm packages, GitHub Actions, CDN resources, external APIs |
| All deployment artifacts | Container images, SBOM files, build outputs |

### 1.3 Enforcement

Violations of this policy shall be escalated to the IO Cell Lead. Repeated or willful violations shall result in access revocation per Section 11.5 (Access Revocation Procedures).

---

## 2. Normative References

| Standard | Title | Relevance |
|----------|-------|-----------|
| NIST SP 800-171 Rev. 2 | Protecting CUI in Nonfederal Systems | Primary compliance framework |
| NIST SP 800-218 | Secure Software Development Framework (SSDF) v1.1 | SDLC security practices |
| NIST SP 800-53 Rev. 5 | Security and Privacy Controls | Supplementary controls (SA family) |
| CMMC v2.0 Level 2 | Cybersecurity Maturity Model Certification | Certification target |
| EO 14028 | Improving the Nation's Cybersecurity | SBOM and supply chain requirements |
| OWASP SAMM | Software Assurance Maturity Model | Development process maturity |
| CWE/SANS Top 25 | Most Dangerous Software Weaknesses | Secure coding baseline |
| JP 3-13 | Information Operations | Operational doctrine |

---

## 3. SDLC Phase Model

IE-SYNC follows a security-integrated SDLC where security activities are embedded in every phase, not bolted on at the end.

```
 PHASE 1         PHASE 2         PHASE 3         PHASE 4         PHASE 5
 PLAN            DEVELOP         VERIFY          RELEASE         OPERATE
    |                |               |               |               |
    v                v               v               v               v
+----------+   +----------+   +----------+   +----------+   +----------+
| Threat   |   | Secure   |   | SAST     |   | SBOM Gen |   | Vuln     |
| Modeling |   | Coding   |   | (CodeQL) |   | Artifact |   | Monitor  |
|          |   |          |   |          |   | Sign     |   | (Dep-bot)|
| Security |   | AI Code  |   | SCA      |   |          |   |          |
| Reqs     |   | Review   |   | (npm aud)|   | Deploy   |   | Incident |
|          |   |          |   |          |   | Gates    |   | Response |
| Data     |   | Unit     |   | Dep      |   |          |   |          |
| Class    |   | Tests    |   | Review   |   | Prod     |   | Patch    |
|          |   |          |   |          |   | Verify   |   | Mgmt     |
| Access   |   | Peer     |   | Type     |   |          |   |          |
| Model    |   | Review   |   | Check    |   | Health   |   | Audit    |
|          |   |          |   |          |   | Check    |   | Review   |
+----------+   +----------+   +----------+   +----------+   +----------+
    |                |               |               |               |
    v                v               v               v               v
  GATE 0          GATE 1          GATE 2          GATE 3          GATE 4
  Design         Code             Security         Release          Ops
  Review         Review           Scan Pass        Approval         Review
```

### 3.1 Phase Gate Requirements

| Gate | Name | Required Approvals | Blocking Criteria |
|------|------|--------------------|-------------------|
| **G0** | Design Review | IO Cell Lead or Security POC | Incomplete threat model; missing data classification |
| **G1** | Code Review | CODEOWNERS-designated reviewer | Unreviewed code; AI code without human validation |
| **G2** | Security Scan Pass | Automated (CI pipeline) | Critical/high vulnerabilities; TypeScript errors; banned licenses |
| **G3** | Release Approval | IO Cell Lead | Failed build; missing SBOM; unresolved security findings |
| **G4** | Operational Review | Security POC (quarterly) | Unpatched critical vulnerabilities; expired access reviews |

---

## 4. Code Governance

### 4.1 Repository Configuration

| Control | Setting | NIST Control |
|---------|---------|-------------|
| **Repository Visibility** | Private | AC-22 |
| **Default Branch** | `main` (protected) | CM-3 |
| **Direct Commits to Main** | PROHIBITED | CM-5 |
| **Force Push to Main** | PROHIBITED | CM-3 |
| **Branch Deletion (main)** | PROHIBITED | CM-3 |
| **Linear History** | REQUIRED (no merge commits) | AU-10 |
| **Conversation Resolution** | REQUIRED before merge | CM-3 |

### 4.2 Branch Protection Rules

As defined in `scripts/setup-branch-protection.sh`:

```
Branch: main
  Required status checks (strict):
    - Security Audit & SBOM
    - CodeQL Analysis
    - Dependency Review
  Required pull request reviews:
    - Minimum 1 approving review
    - Dismiss stale reviews on new push
    - Require CODEOWNERS review
  Enforce for administrators: YES
  Allow force pushes: NO
  Allow deletions: NO
  Required conversation resolution: YES
```

### 4.3 Code Ownership (CODEOWNERS)

As defined in `.github/CODEOWNERS`, the following files require explicit security review:

| File Pattern | Required Reviewer | Rationale |
|-------------|-------------------|-----------|
| `*` (default) | @DjahankhahTech | All changes reviewed |
| `middleware.ts` | @DjahankhahTech | Security gateway -- rate limiting, auth, RBAC |
| `lib/auth.ts` | @DjahankhahTech | RBAC permission matrix |
| `lib/audit-log.ts` | @DjahankhahTech | Audit trail integrity |
| `lib/validation.ts` | @DjahankhahTech | Input validation, SSRF protection |
| `lib/encryption.ts` | @DjahankhahTech | AES-256-GCM cryptographic module |
| `lib/immutable-log.ts` | @DjahankhahTech | Immutable audit chain |
| `app/api/auth/**` | @DjahankhahTech | Authentication handlers |
| `.github/workflows/**` | @DjahankhahTech | CI/CD pipeline configuration |
| `next.config.ts` | @DjahankhahTech | Security headers, CSP |
| `docs/**` | @DjahankhahTech | Security policies and compliance documentation |

### 4.4 Commit Standards

| Requirement | Detail |
|-------------|--------|
| **Commit Signing** | All commits SHOULD be GPG-signed (REQUIRED when team >1 developer) |
| **Commit Message Format** | `<type>(<scope>): <description>` (e.g., `fix(auth): patch JWT role extraction`) |
| **Allowed Types** | `feat`, `fix`, `security`, `refactor`, `test`, `docs`, `deps`, `ci`, `perf` |
| **Security-Sensitive Commits** | MUST use `security` type prefix; triggers enhanced review |
| **Prohibited Content** | No secrets, credentials, API keys, or PII in any commit |

### 4.5 Pull Request Requirements

Every code change to `main` MUST be submitted as a Pull Request with:

1. **Title** -- Concise description under 72 characters
2. **Description** -- What changed, why, and how it was tested
3. **Security Impact Assessment** -- One of:
   - `[SECURITY: NONE]` -- No security-relevant changes
   - `[SECURITY: LOW]` -- Minor security improvement; no new attack surface
   - `[SECURITY: MEDIUM]` -- New input handling, configuration change, or dependency update
   - `[SECURITY: HIGH]` -- Authentication, authorization, encryption, or audit changes
   - `[SECURITY: CRITICAL]` -- Vulnerability fix; incident response
4. **Testing Evidence** -- Description of manual or automated testing performed
5. **CODEOWNERS Approval** -- At least one designated reviewer must approve
6. **All CI Checks Passing** -- See Section 8 (CI/CD Security Gates)

---

## 5. AI-Generated Code Review Controls

### 5.1 Policy Statement

AI coding assistants (including but not limited to Claude Code, GitHub Copilot, ChatGPT, and similar tools) are PERMITTED for use in IE-SYNC development under the controls specified in this section. AI-generated code is treated as untrusted input and is subject to the same -- or greater -- scrutiny as third-party code contributions.

### 5.2 Acceptable Use

| Permitted Use | Prohibited Use |
|--------------|----------------|
| Code generation with human review | Autonomous commits without review |
| Refactoring assistance | Generation of authentication or cryptographic logic without expert validation |
| Documentation drafting | Processing or ingestion of CUI data into AI prompts |
| Test case generation | Sharing proprietary architecture details with public AI services |
| Boilerplate and scaffolding | Disabling security controls based on AI suggestion |
| Security analysis and threat modeling | Using AI to bypass code review requirements |

### 5.3 AI Code Identification

All code that is wholly or substantially generated by an AI assistant MUST be identified in the commit record:

```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

or

```
Co-Authored-By: GitHub Copilot <noreply@github.com>
```

### 5.4 Enhanced Review Controls for AI-Generated Code

AI-generated code changes MUST undergo the following enhanced review before merge:

| Control | Requirement | Rationale |
|---------|-------------|-----------|
| **R1: Human Comprehension** | Reviewer MUST demonstrate understanding of every line; no rubber-stamp approvals | AI may generate plausible but incorrect logic |
| **R2: Security Pattern Verification** | Verify AI-generated code does not introduce: hardcoded secrets, disabled security checks, overly permissive access, insecure defaults | AI may optimize for functionality over security |
| **R3: Dependency Introduction Check** | Any new `import` or `require` introduced by AI MUST be validated against approved dependency list | AI may suggest unmaintained or vulnerable packages |
| **R4: Input Validation Preservation** | Verify AI-generated code does not remove or weaken existing Zod schema validation | AI may simplify validation for brevity |
| **R5: Audit Log Preservation** | Verify AI-generated code does not remove or bypass audit logging calls | AI may remove logging for "cleaner" code |
| **R6: SSRF Protection Preservation** | Verify AI-generated code does not bypass `isBlockedUrl()` checks in link-check paths | AI may suggest "simpler" URL handling |
| **R7: Error Handling Verification** | Verify AI-generated code includes proper try/catch, does not leak stack traces, and logs errors via audit system | AI may generate insufficient error handling |
| **R8: Type Safety Check** | AI-generated TypeScript MUST compile with `--strict --noEmit`; no `any` type assertions without justification | AI frequently generates loose types |

### 5.5 AI Code Review Checklist

For every PR containing AI-generated code, the reviewer SHALL complete the following checklist in the PR description:

```markdown
## AI-Generated Code Review Checklist
- [ ] AI assistant identified in commit (Co-Authored-By)
- [ ] Every line reviewed and understood by human reviewer
- [ ] No hardcoded secrets, tokens, or credentials introduced
- [ ] No security controls disabled or weakened
- [ ] No new dependencies introduced without approval
- [ ] Input validation (Zod schemas) preserved or strengthened
- [ ] Audit logging calls preserved or added
- [ ] SSRF protection preserved in URL-handling code
- [ ] Error handling includes try/catch with audit logging
- [ ] TypeScript compiles with --strict --noEmit
- [ ] No CUI or sensitive data was shared with AI service
```

### 5.6 AI Tool Data Handling

| Requirement | Detail |
|-------------|--------|
| **CUI Prohibition** | CUI data, classified information, or operational intelligence SHALL NOT be used as input to any AI service |
| **Architecture Disclosure** | Full system architecture details SHOULD NOT be shared with public AI services; use locally hosted or air-gapped AI tools for architecture-level assistance when possible |
| **Prompt Logging** | AI prompts containing IE-SYNC code SHALL be considered development artifacts and retained per CM-3 |
| **Model Selection** | AI tools used MUST have clear data handling policies; tools that retain training data from user prompts are DISCOURAGED for security-critical code |

---

## 6. Dependency Management

### 6.1 Dependency Governance Principles

1. **Minimize Dependencies** -- Every dependency increases attack surface. Prefer standard library solutions when feasible.
2. **Pin Exact Versions** -- All production and development dependencies SHALL be pinned to exact versions (no `^` or `~` prefix) in `package.json`.
3. **License Compliance** -- Dependencies MUST carry permissive licenses compatible with government use.
4. **Continuous Monitoring** -- All dependencies are continuously scanned for known vulnerabilities.

### 6.2 Current Dependency Inventory

#### 6.2.1 Production Dependencies (16 packages, pinned)

| Package | Version | License | Security Criticality |
|---------|---------|---------|---------------------|
| @cyclonedx/cyclonedx-npm | 4.1.2 | Apache-2.0 | LOW -- Build tool |
| clsx | 2.1.1 | MIT | LOW -- CSS utility |
| date-fns | 4.1.0 | MIT | LOW -- Date formatting |
| fast-xml-parser | 5.3.6 | MIT | HIGH -- Parses untrusted RSS XML |
| leaflet | 1.9.4 | BSD-2-Clause | LOW -- Map rendering |
| lucide-react | 0.575.0 | ISC | LOW -- Icons |
| next | 16.1.6 | MIT | CRITICAL -- Application framework |
| next-auth | 5.0.0-beta.30 | ISC | CRITICAL -- Authentication |
| pino | 10.3.1 | MIT | MEDIUM -- Audit logging |
| react | 19.2.3 | MIT | HIGH -- UI framework |
| react-dom | 19.2.3 | MIT | HIGH -- UI rendering |
| react-leaflet | 5.0.0 | Hippocratic-2.1 | LOW -- Map integration |
| recharts | 3.7.0 | MIT | LOW -- Charting |
| tailwind-merge | 3.5.0 | MIT | LOW -- CSS utility |
| zod | 4.3.6 | MIT | HIGH -- Input validation |
| zustand | 5.0.11 | MIT | MEDIUM -- State management |

#### 6.2.2 Development Dependencies (8 packages, pinned)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @tailwindcss/postcss | 4.1.4 | MIT | CSS processing |
| @types/leaflet | 1.9.21 | MIT | Type definitions |
| @types/node | 20.17.50 | MIT | Type definitions |
| @types/pino | 7.0.4 | MIT | Type definitions |
| @types/react | 19.1.6 | MIT | Type definitions |
| @types/react-dom | 19.1.6 | MIT | Type definitions |
| eslint | 9.28.0 | MIT | Linting |
| eslint-config-next | 16.1.6 | MIT | Linting rules |
| tailwindcss | 4.1.4 | MIT | CSS framework |
| typescript | 5.8.3 | Apache-2.0 | Language |

### 6.3 Banned Licenses

The following licenses are DENIED for any dependency in IE-SYNC:

| License | Reason |
|---------|--------|
| GPL-2.0 | Copyleft; incompatible with government distribution |
| GPL-3.0 | Copyleft; incompatible with government distribution |
| AGPL-3.0 | Network copyleft; requires source disclosure |
| SSPL | Server-side copyleft |
| BSL | Business source; may restrict government use |
| Proprietary (unlicensed) | No usage rights established |

Enforcement: `dependency-review-action` in CI blocks PRs introducing banned licenses.

### 6.4 Dependency Addition Procedure

To add a new dependency:

1. **Justification** -- Document why the dependency is necessary and why a standard library solution is insufficient
2. **Security Assessment** -- Review:
   - Package age, download count, and maintenance activity
   - Known vulnerabilities via `npm audit` and Snyk database
   - License compatibility per Section 6.3
   - Transitive dependency count (prefer packages with fewer transitive deps)
   - Maintainer count (bus factor assessment)
3. **Approval** -- Dependency addition MUST be approved by CODEOWNERS reviewer
4. **Pinning** -- Add exact version (no `^` or `~`) to `package.json`
5. **SBOM Update** -- Regenerate SBOM via `npm run sbom` and include in the PR
6. **Commit** -- Use `deps(<package>): add <package>@<version> for <reason>` commit format

### 6.5 Automated Dependency Scanning

As configured in `.github/dependabot.yml`:

| Scanner | Schedule | Scope | Action |
|---------|----------|-------|--------|
| **Dependabot** (npm) | Weekly (Monday 06:00 ET) | Production + dev dependencies | Creates PRs for updates |
| **Dependabot** (Actions) | Weekly (Monday) | GitHub Actions workflow versions | Creates PRs for updates |
| **npm audit** | Every push/PR to main + weekly | All dependencies | Fails pipeline on `high`/`critical` |
| **Dependency Review** | Every PR to main | Newly introduced dependencies | Blocks PR on `high`+ vulnerabilities or banned licenses |

### 6.6 Dependency Update Policy

| Update Type | Policy | Review Required |
|-------------|--------|----------------|
| **Security patch** (any severity) | Merge within SLA per Section 10.3 | Expedited review; 1 approval |
| **Patch version** (non-security) | Grouped PR; merge within 14 days | Standard review |
| **Minor version** | Grouped PR; merge within 30 days | Standard review; test verification |
| **Major version** | Individual PR; full regression test | Enhanced review; IO Cell Lead approval |

---

## 7. Static and Dynamic Analysis Requirements

### 7.1 Static Application Security Testing (SAST)

#### 7.1.1 CodeQL Analysis

As configured in `.github/workflows/codeql.yml`:

| Parameter | Setting |
|-----------|---------|
| **Tool** | GitHub CodeQL |
| **Language** | `javascript-typescript` |
| **Query Suite** | `security-extended` (includes DoD-relevant patterns) |
| **Trigger** | Every push to main; every PR to main; weekly cron (Monday 06:30 ET) |
| **Timeout** | 15 minutes |
| **Detection Scope** | Injection flaws, XSS, path traversal, insecure cryptography, prototype pollution, command injection, regex DoS |

#### 7.1.2 ESLint Security Rules

As configured in `.github/workflows/security.yml` (sast-security job):

| Rule | Severity | Detection |
|------|----------|-----------|
| `no-eval` | ERROR | Direct `eval()` usage |
| `no-implied-eval` | ERROR | Implicit eval (setTimeout with string) |
| `no-new-func` | ERROR | `new Function()` constructor |
| Next.js security rules | WARN | Via `eslint-config-next` |
| TypeScript strict mode | ERROR | Unsafe `any`, missing types |

#### 7.1.3 TypeScript Type Safety

TypeScript is configured in strict mode (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true
  }
}
```

`npx tsc --noEmit` runs in CI and MUST pass with zero errors before merge.

### 7.2 Software Composition Analysis (SCA)

| Tool | Trigger | Severity Threshold | Action on Failure |
|------|---------|-------------------|-------------------|
| `npm audit` | Push/PR to main + weekly | `high` | Pipeline fails; merge blocked |
| Dependency Review Action | PR to main | `high` | PR blocked; vulnerability report posted |
| Dependabot Alerts | Continuous | All severities | Alerts created; PRs for patches |

### 7.3 Dynamic Application Security Testing (DAST)

| Requirement | Current Status | Target |
|-------------|---------------|--------|
| Authenticated endpoint scanning | NOT IMPLEMENTED | Implement OWASP ZAP in CI for staging |
| API fuzzing | NOT IMPLEMENTED | Implement REST API fuzzing with custom Zod-aware harness |
| Runtime error monitoring | PARTIAL (ErrorBoundary + audit logs) | Add Sentry or equivalent APM |
| Penetration testing | NOT IMPLEMENTED | Engage authorized pen test team quarterly |

### 7.4 Analysis Requirements by Code Criticality

| File Category | SAST Required | SCA Required | DAST Required | Manual Review |
|--------------|:------------:|:------------:|:------------:|:-------------:|
| Security-critical (`middleware.ts`, `lib/auth.ts`, `lib/encryption.ts`, `lib/validation.ts`, `lib/audit-log.ts`, `lib/immutable-log.ts`) | YES | YES | YES | YES (enhanced) |
| API routes (`app/api/**`) | YES | YES | YES | YES |
| UI components (`components/**`) | YES | N/A | NO | YES |
| Configuration (`.github/**`, `next.config.ts`) | YES | N/A | NO | YES (CODEOWNERS) |
| Documentation (`docs/**`) | NO | NO | NO | YES |
| Test files (`__tests__/**`) | YES | N/A | NO | YES |

---

## 8. CI/CD Security Gates

### 8.1 Pipeline Architecture

```
                     DEVELOPER PUSHES CODE
                              |
                              v
                   +--------------------+
                   |   GitHub Actions    |
                   |   Trigger:          |
                   |   push/PR to main   |
                   +--------------------+
                              |
               +--------------+--------------+
               |              |              |
               v              v              v
      +--------------+ +-----------+ +---------------+
      | security-    | | codeql-   | | dependency-   |
      | audit        | | analysis  | | review        |
      | (parallel)   | | (parallel)| | (PR only)     |
      +--------------+ +-----------+ +---------------+
      | 1. npm ci    | | 1. Init   | | 1. Checkout   |
      | 2. npm audit | | 2. Build  | | 2. Review     |
      | 3. SBOM gen  | | 3. Analyze| |    new deps   |
      | 4. SBOM      | |           | | 3. Block on   |
      |    validate  | |           | |    high vuln  |
      | 5. tsc check | |           | | 4. Block on   |
      | 6. ESLint    | |           | |    banned lic |
      +--------------+ +-----------+ +---------------+
               |              |              |
               v              v              v
      +--------------+ +-----------+
      | sast-        | | build-    |
      | security     | | verify    |
      | (parallel)   | | (depends  |
      +--------------+ |  on audit)|
      | Security-    | +-----------+
      | focused      | | 1. npm ci |
      | ESLint rules | | 2. next   |
      |              | |    build  |
      +--------------+ +-----------+
               |              |
               v              v
          ALL GATES MUST PASS
               |
               v
      +--------------------+
      | PR Review Required |
      | (CODEOWNERS)       |
      +--------------------+
               |
               v
         MERGE TO MAIN
```

### 8.2 Gate Definitions

#### Gate 1: Security Audit & SBOM (`security.yml > security-audit`)

| Check | Command | Failure Action |
|-------|---------|---------------|
| Dependency install | `npm ci` | Pipeline fails |
| Vulnerability scan | `npm audit --audit-level=high` | **PIPELINE FAILS** -- merge blocked |
| SBOM generation | `npx @cyclonedx/cyclonedx-npm --output-file sbom.json --output-reproducible` | Pipeline fails |
| SBOM validation | Node script verifying `bomFormat`, `specVersion`, component count >0 | Pipeline fails |
| SBOM artifact upload | `actions/upload-artifact@v4` (365-day retention) | Warning only |
| TypeScript check | `npx tsc --noEmit` | **PIPELINE FAILS** -- merge blocked |
| ESLint | `npm run lint` | Warning (non-blocking, transitional) |

#### Gate 2: CodeQL SAST (`codeql.yml`)

| Check | Command | Failure Action |
|-------|---------|---------------|
| CodeQL init | `codeql-action/init@v3` (security-extended) | Pipeline fails |
| Autobuild | `codeql-action/autobuild@v3` | Pipeline fails |
| CodeQL analyze | `codeql-action/analyze@v3` | **Security alerts created in GitHub Security tab** |

#### Gate 3: Dependency Review (`dependency-review.yml`, PR only)

| Check | Command | Failure Action |
|-------|---------|---------------|
| New dependency review | `dependency-review-action@v4` | **PR BLOCKED** on high/critical vulnerabilities |
| License check | `deny-licenses: GPL-2.0, GPL-3.0, AGPL-3.0` | **PR BLOCKED** on banned licenses |
| PR comment | `comment-summary-in-pr: always` | Vulnerability report posted to PR |

#### Gate 4: SAST Security Lint (`security.yml > sast-security`)

| Check | Command | Failure Action |
|-------|---------|---------------|
| Security ESLint rules | `no-eval`, `no-implied-eval`, `no-new-func` | Warning (transitional to blocking) |

#### Gate 5: Production Build Verification (`security.yml > build-verify`)

| Check | Command | Failure Action |
|-------|---------|---------------|
| Production build | `npm run build` | **PIPELINE FAILS** -- ensures deployable artifact |

### 8.3 Weekly Scheduled Scans

In addition to PR-triggered gates, the following scans run on a weekly schedule:

| Scan | Schedule | Workflow |
|------|----------|----------|
| Security Audit & SBOM | Monday 06:00 ET | `security.yml` |
| CodeQL Deep Scan | Monday 06:30 ET | `codeql.yml` |
| Dependabot (npm) | Monday 06:00 ET | `dependabot.yml` |
| Dependabot (Actions) | Monday | `dependabot.yml` |

### 8.4 Pipeline Secrets Management

| Secret | Purpose | Storage |
|--------|---------|---------|
| `GITHUB_TOKEN` | CI/CD authentication | GitHub-provided (automatic) |
| `NEXTAUTH_SECRET` (build) | Build verification only | Hardcoded non-secret value in CI (`ci-build-secret-not-for-production`) |
| Production secrets | NOT stored in CI | Managed via deployment infrastructure (KMS/Vault) |

**Rule:** Production secrets (ENCRYPTION_MASTER_KEY, AUDIT_HMAC_KEY, DEMO_*_PASSWORD) SHALL NEVER appear in CI/CD configuration, workflow files, or build logs.

---

## 9. SBOM Generation Process

### 9.1 SBOM Standard

IE-SYNC generates Software Bill of Materials in **CycloneDX v1.6** JSON format, per EO 14028 requirements and NTIA minimum elements.

### 9.2 Generation Process

| Step | Command | Output |
|------|---------|--------|
| 1. Install dependencies | `npm ci` | `node_modules/` |
| 2. Generate SBOM | `npx @cyclonedx/cyclonedx-npm --output-file sbom.json --output-reproducible` | `sbom.json` |
| 3. Validate SBOM | Node script: verify `bomFormat`, `specVersion`, component count | Pass/fail |
| 4. Archive SBOM | `actions/upload-artifact@v4` | GitHub artifact (365-day retention) |

Local generation: `npm run sbom`

### 9.3 SBOM Content Requirements

Each SBOM SHALL include the following NTIA minimum elements:

| Element | Field | Source |
|---------|-------|--------|
| Supplier name | `component.publisher` | npm registry |
| Component name | `component.name` | package.json |
| Version | `component.version` | package.json (exact, pinned) |
| Unique identifier | `component.purl` | Package URL specification |
| Dependency relationship | `dependencies[]` | npm dependency tree |
| Author of SBOM data | `metadata.tools` | CycloneDX generator |
| Timestamp | `metadata.timestamp` | Generation time |

### 9.4 SBOM Lifecycle

| Event | SBOM Action |
|-------|-------------|
| Every push to `main` | Regenerated, validated, archived |
| Every PR to `main` | Dependency review checks new components |
| Weekly (Monday 06:00 ET) | Scheduled regeneration + freshness check |
| Dependency update merged | Regenerated with new component versions |
| Release candidate | SBOM included as release artifact |
| Production deployment | SBOM archived alongside deployment record |
| Customer/assessor request | SBOM provided within 24 hours |

### 9.5 SBOM Storage and Access

| Location | Retention | Access |
|----------|-----------|--------|
| GitHub Actions artifact | 365 days | Repository collaborators |
| Repository (`sbom.json`) | Git history (permanent) | Listed in `.gitignore` (generated artifact not committed) |
| Production deployment record | Per deployment lifecycle | Authorized personnel only |

---

## 10. Vulnerability Remediation Workflow

### 10.1 Vulnerability Sources

| Source | Detection Method | Notification |
|--------|-----------------|-------------|
| Dependabot alerts | Continuous monitoring of npm advisory database | GitHub notification + email |
| `npm audit` (CI) | Pipeline execution on push/PR | Pipeline failure |
| CodeQL findings | SAST on push/PR + weekly scan | GitHub Security tab alerts |
| Dependency Review | PR-triggered new dependency analysis | PR comment + block |
| External report | `docs/SECURITY.md` disclosure process | Email to security POC |
| Penetration test | Quarterly (target) | Formal report |

### 10.2 Vulnerability Severity Classification

| Severity | CVSS Score | Examples |
|----------|-----------|---------|
| **CRITICAL** | 9.0 -- 10.0 | RCE, authentication bypass, cryptographic key exposure |
| **HIGH** | 7.0 -- 8.9 | SQL injection, XSS with data exfiltration, privilege escalation |
| **MEDIUM** | 4.0 -- 6.9 | Reflected XSS, information disclosure, DoS |
| **LOW** | 0.1 -- 3.9 | Minor information leak, verbose error messages |
| **INFORMATIONAL** | 0.0 | Best practice recommendation, code quality |

### 10.3 Remediation SLAs

| Severity | Acknowledgment | Triage | Remediation | Verification |
|----------|---------------|--------|-------------|-------------|
| **CRITICAL** | 4 hours | 8 hours | 24 hours | Same day |
| **HIGH** | 24 hours | 48 hours | 7 calendar days | Within 3 days of fix |
| **MEDIUM** | 72 hours | 5 business days | 30 calendar days | Within 7 days of fix |
| **LOW** | 5 business days | 10 business days | 90 calendar days | Next scheduled review |
| **INFORMATIONAL** | N/A | Next sprint | Best effort | N/A |

### 10.4 Remediation Workflow

```
  VULNERABILITY DETECTED
          |
          v
  +------------------+
  | 1. TRIAGE        |
  |   - Classify     |
  |     severity     |
  |   - Assess       |
  |     exploitability|
  |   - Determine    |
  |     affected     |
  |     components   |
  +------------------+
          |
     +----+----+
     |         |
     v         v
  [Patch    [No Patch
  Available] Available]
     |         |
     v         v
  +--------+ +------------------+
  |2a.PATCH| |2b. MITIGATE      |
  | Apply  | | Implement        |
  | vendor | | workaround       |
  | update | | (WAF rule, input |
  +--------+ | filter, config)  |
     |       +------------------+
     |         |
     v         v
  +------------------+
  | 3. VERIFY        |
  |   - Re-scan with |
  |     same tool    |
  |   - Run full CI  |
  |     pipeline     |
  |   - Regression   |
  |     test         |
  +------------------+
          |
          v
  +------------------+
  | 4. DOCUMENT      |
  |   - Audit log    |
  |     entry        |
  |   - SBOM update  |
  |   - Update threat|
  |     model if     |
  |     applicable   |
  +------------------+
          |
          v
  +------------------+
  | 5. DEPLOY        |
  |   - Merge to main|
  |   - Full CI gate |
  |     pass         |
  |   - Deploy to    |
  |     production   |
  +------------------+
          |
          v
  +------------------+
  | 6. POST-MORTEM   |
  |   (CRITICAL/HIGH |
  |    only)         |
  |   - Root cause   |
  |   - Timeline     |
  |   - Process      |
  |     improvement  |
  +------------------+
```

### 10.5 Exception Process

When a vulnerability cannot be remediated within the SLA:

1. **Risk Acceptance Request** -- Developer documents: vulnerability, affected component, exploitability assessment, compensating controls, and proposed extended timeline
2. **Approval** -- IO Cell Lead approves risk acceptance with maximum 90-day extension
3. **Compensating Controls** -- Documented and implemented (e.g., WAF rule, input restriction, feature disable)
4. **Tracking** -- Exception logged in vulnerability register with expiration date
5. **Re-evaluation** -- Exception reviewed at each quarterly security review

---

## 11. Developer Access Control

### 11.1 Access Tiers

| Tier | Role | Repository Access | CI/CD Access | Production Access |
|------|------|------------------|-------------|------------------|
| **Tier 1: Admin** | IO Cell Lead | Admin (full control) | Full pipeline access | Read-only (emergency break-glass) |
| **Tier 2: Developer** | IO Developer | Write (push, PR, merge with approval) | View pipeline results | NONE |
| **Tier 3: Reviewer** | Security Reviewer | Read + PR review | View pipeline results | NONE |
| **Tier 4: Observer** | Auditor, assessor | Read only | View pipeline results | NONE |
| **Tier 5: CI/CD** | GitHub Actions | Read + write (automated) | Self | NONE |

### 11.2 Access Requirements

| Requirement | Mandatory | NIST Control |
|-------------|:---------:|-------------|
| GitHub account with MFA enabled | YES | IA-2(1) |
| SSH key or personal access token (PAT) for authentication | YES | IA-5 |
| Access request approved by IO Cell Lead | YES | AC-2 |
| Background check (for CUI access) | YES | PS-3 |
| Annual security awareness training | YES | AT-2 |
| Signed acceptable use agreement | YES | PL-4 |

### 11.3 Access Provisioning Procedure

1. **Request** -- New developer submits access request with justification and sponsoring supervisor
2. **Background Verification** -- Verify background check status and clearance level
3. **Approval** -- IO Cell Lead approves role assignment and access tier
4. **Account Creation** -- Add to GitHub repository with minimum necessary permissions
5. **MFA Verification** -- Confirm MFA is enabled on GitHub account
6. **Onboarding** -- Complete security awareness training and review this SDLC policy
7. **Audit Log** -- Access provisioning logged as `CONFIG_CHANGE: developer_access_granted`

### 11.4 Access Review Schedule

Per `docs/ACCESS_REVIEW_POLICY.md`:

| Review Type | Frequency | Scope | Owner |
|-------------|-----------|-------|-------|
| Admin account review | Monthly | Tier 1 accounts | IO Cell Lead |
| Full access review | Quarterly | All tiers | Security POC |
| CI/CD service account review | Quarterly | Tier 5 accounts | System Administrator |
| Repository collaborator review | Quarterly | All GitHub collaborators | Development Lead |
| Post-incident access review | On-demand | Triggered by security event | Incident Commander |

### 11.5 Access Revocation Procedures

| Trigger | Timeline | Actions |
|---------|----------|---------|
| Personnel separation | 4 hours | Remove from repository; revoke PATs; rotate shared secrets if applicable |
| Role change | 24 hours | Adjust permissions to new role; remove excess access |
| Security incident | Immediate | Suspend account; preserve audit trail; begin investigation |
| Failed background check | Immediate | Revoke all access; notify IO Cell Lead |
| Inactivity (90 days) | Automatic | Disable account; require re-approval for reactivation |

---

## 12. Insider Threat Mitigation

### 12.1 Threat Profile

| Threat Actor | Motivation | Capability | Relevant Scenarios |
|-------------|------------|------------|-------------------|
| Disgruntled developer | Sabotage, data theft | Full code access, knowledge of security architecture | Backdoor insertion, audit log manipulation, credential exfiltration |
| Compromised developer | Coercion, financial incentive | Authenticated repository access | Dependency poisoning, data exfiltration via code change |
| Negligent developer | Carelessness, ignorance | Inadvertent exposure of secrets or CUI | Credential commit, insecure configuration, disabled controls |
| Malicious AI-assisted code | AI prompt injection, training data poisoning | Code generation capability | Subtle vulnerability introduction, security control bypass |

### 12.2 Technical Controls

| Control | Implementation | Detects/Prevents |
|---------|---------------|-----------------|
| **Mandatory Code Review** | CODEOWNERS + branch protection; no direct commits to main | Backdoor insertion; unauthorized changes |
| **Separation of Duties** | Code author cannot approve their own PR | Single-actor compromise |
| **Commit Signing** | GPG-signed commits (recommended; required when team >1) | Impersonation; unauthorized commits |
| **Secret Scanning** | CI pipeline + git pre-commit hooks (target) | Credential leakage in commits |
| **Audit Logging** | All API requests, state changes, and authentication events logged with HMAC signatures | Unauthorized data access; privilege abuse |
| **Immutable Audit Chain** | Hash-linked, sequence-numbered audit records with HMAC | Audit log tampering; evidence destruction |
| **Least Privilege Access** | RBAC with implicit deny; Tier-based developer access | Privilege abuse; lateral movement |
| **Dependency Review** | Automated scanning + manual approval for new dependencies | Supply chain poisoning |
| **AI Code Review Controls** | Enhanced review checklist; human comprehension requirement | AI-assisted vulnerability insertion |
| **Session Timeout** | 30-minute JWT expiry | Session hijacking; unattended terminal |
| **Account Lockout** | 5 failed attempts, 15-minute lock | Brute force; credential stuffing |
| **Rate Limiting** | 60 req/min per IP | Data exfiltration via API abuse |

### 12.3 Procedural Controls

| Control | Implementation | Frequency |
|---------|---------------|-----------|
| **Security Awareness Training** | SDLC policy review; secure coding practices | Annual + onboarding |
| **Quarterly Access Reviews** | Review all access against personnel roster | Quarterly |
| **Code Review Culture** | No shame in finding issues; constructive feedback | Continuous |
| **Incident Reporting** | Clear reporting chain per `docs/INCIDENT_RESPONSE.md` | As needed |
| **Exit Procedures** | 4-hour access revocation; secret rotation assessment | On separation |
| **Background Checks** | Required for CUI access | Pre-access + periodic |

### 12.4 Behavioral Indicators

The following behaviors SHALL trigger enhanced monitoring per the IO Cell Lead's discretion:

| Indicator | Detection Method |
|-----------|-----------------|
| Unusual off-hours repository access | GitHub audit log review |
| Large code deletions in security-critical files | PR diff analysis |
| Repeated attempts to disable CI security gates | Workflow modification tracking |
| Introduction of obfuscated code | Code review + SAST |
| Anomalous API request patterns (high volume, unusual endpoints) | Audit log analysis |
| Attempts to access production secrets from development environment | Environment variable access logging |
| Downloading large portions of the repository | Git clone/fetch monitoring |
| Disabling or weakening security controls without documented justification | CODEOWNERS review + audit trail |

### 12.5 Insider Threat Response Procedure

1. **Detection** -- Behavioral indicator identified via audit log, code review, or peer report
2. **Assessment** -- Security POC evaluates severity and determines if activity is malicious or inadvertent
3. **Containment** -- If malicious: suspend account immediately; preserve audit trail; notify IO Cell Lead
4. **Investigation** -- Review full audit history; examine all recent code contributions; check for unauthorized changes
5. **Remediation** -- Revert any unauthorized changes; rotate affected secrets; update access controls
6. **Reporting** -- Per `docs/INCIDENT_RESPONSE.md` (Incident Category 6: Insider Threat)
7. **Post-Incident** -- Conduct lessons-learned review; update this policy if gaps identified

---

## 13. Secure Coding Standards

### 13.1 Language-Specific Requirements

| Requirement | Implementation | Enforcement |
|-------------|---------------|-------------|
| TypeScript strict mode | `"strict": true` in `tsconfig.json` | `tsc --noEmit` in CI |
| No `any` without justification | Review-enforced; document reason in comment | Code review |
| Input validation on all API endpoints | Zod schemas (`lib/validation.ts`) | Code review + SAST |
| No `eval()`, `new Function()`, `setTimeout(string)` | ESLint rules: `no-eval`, `no-implied-eval`, `no-new-func` | CI (SAST Security Lint) |
| Error handling with audit logging | try/catch + `audit()` call | Code review |
| No secrets in source code | Environment variables only | Secret scanning |
| Safe error responses (no stack traces) | ErrorBoundary + structured error JSON | Code review |

### 13.2 Security-Critical Code Patterns

| Pattern | Required In | Example |
|---------|------------|---------|
| Zod validation before processing | All API route handlers | `FeedQuerySchema.safeParse(input)` |
| SSRF check before outbound fetch | `/api/link-check` | `isBlockedUrl(url)` |
| Audit logging on all security events | Middleware, auth handler, API errors | `audit({ event: "ACCESS_DENIED", ... })` |
| RBAC check before data access | Middleware | `hasPermission(role, permission)` |
| HMAC verification for audit integrity | Immutable log pipeline | `hmacVerify(data, signature)` |
| AES-256-GCM for CUI at rest | Field-level encryption | `encryptField(value)` |

### 13.3 Prohibited Patterns

| Pattern | Risk | Alternative |
|---------|------|------------|
| `eval()` or `new Function()` | Code injection | Static code paths |
| Hardcoded credentials | Credential exposure | Environment variables |
| `console.log()` for security events | No structured audit trail | `audit()` function |
| Uncaught exceptions in API routes | Information disclosure | try/catch + safe error response |
| `any` type assertion | Type safety bypass | Explicit interface definition |
| Direct `fetch()` to user-supplied URL without SSRF check | SSRF | `isBlockedUrl()` + validated URL |
| Disabling TypeScript strict mode | Type safety degradation | PROHIBITED |
| `// @ts-ignore` without documented justification | Hides type errors | Fix the underlying type issue |

---

## 14. Training and Awareness

### 14.1 Required Training

| Training | Audience | Frequency | Content |
|----------|----------|-----------|---------|
| SDLC Policy Review | All developers | Annual + onboarding | This document |
| OWASP Top 10 | All developers | Annual | Current web security threats |
| Secure TypeScript Development | All developers | Annual | Language-specific security patterns |
| NIST 800-171 Awareness | All developers | Annual | CUI handling requirements |
| AI Code Review Procedures | All developers | Semi-annual | AI-specific security risks; review controls |
| Insider Threat Awareness | All developers | Annual | Behavioral indicators; reporting procedures |
| Incident Response | IO Cell Lead, Security POC | Annual | IR procedures per `docs/INCIDENT_RESPONSE.md` |

### 14.2 Training Records

Training completion records SHALL be maintained by the IO Cell Lead and reviewed during quarterly access reviews. Developers who fail to complete required training within 30 days of the due date SHALL have their repository access suspended until training is completed.

---

## 15. Policy Enforcement and Exceptions

### 15.1 Automated Enforcement

| Control | Enforcement Mechanism | Bypass Possible? |
|---------|----------------------|:----------------:|
| Branch protection | GitHub branch protection rules | NO (enforced for admins) |
| CI security gates | Required status checks for merge | NO |
| Dependency license check | `dependency-review-action` | NO |
| Vulnerability threshold | `npm audit --audit-level=high` | NO |
| Type safety | `tsc --noEmit` | NO |
| Code review requirement | CODEOWNERS + required reviews | NO |

### 15.2 Exception Process

Exceptions to this policy MUST follow this procedure:

1. **Request** -- Developer documents the specific policy section, the exception needed, compensating controls, and duration
2. **Risk Assessment** -- Security POC evaluates the risk of the exception
3. **Approval** -- IO Cell Lead approves or denies; CRITICAL security exceptions require written justification
4. **Documentation** -- Exception recorded with: date, approver, scope, compensating controls, expiration
5. **Review** -- All active exceptions reviewed at quarterly security review
6. **Expiration** -- Exceptions automatically expire at their stated duration; renewal requires new request

### 15.3 Violation Response

| Severity | Example | Response |
|----------|---------|----------|
| **Minor** | Missing security impact label on PR | Coaching; require update before merge |
| **Moderate** | Committing without AI code review checklist | PR rejected; developer resubmits with checklist |
| **Major** | Disabling CI security gates; committing credentials | Access suspended pending review; incident logged |
| **Critical** | Deliberate introduction of vulnerability; CUI exfiltration | Immediate access revocation; insider threat response initiated |

---

## 16. Compliance Mapping

### 16.1 NIST SP 800-171 Controls

| Control | Description | SDLC Section |
|---------|-------------|-------------|
| AC-2 | Account Management | 11 (Developer Access Control) |
| AC-5 | Separation of Duties | 4.5, 12.2 (Code review; no self-approval) |
| AC-6 | Least Privilege | 11.1 (Tiered access) |
| AT-2 | Security Awareness Training | 14 (Training) |
| AU-2 | Auditable Events | 8 (CI/CD audit trail), 12.2 (Audit logging) |
| AU-12 | Audit Generation | 12.2 (Immutable audit chain) |
| CA-8 | Penetration Testing | 7.3 (DAST requirements) |
| CM-2 | Baseline Configuration | 6.2 (Dependency inventory) |
| CM-3 | Configuration Change Control | 4 (Code governance), 8 (CI/CD gates) |
| CM-5 | Access Restrictions for Change | 4.3 (CODEOWNERS), 11 (Access control) |
| CM-8 | System Component Inventory | 9 (SBOM) |
| IA-2 | Identification and Authentication | 11.2 (MFA required) |
| IA-2(1) | MFA for Privileged Access | 11.2 (GitHub MFA) |
| IA-5 | Authenticator Management | 11.2 (SSH keys, PATs) |
| PL-4 | Rules of Behavior | 5.2 (AI acceptable use) |
| PS-3 | Personnel Screening | 11.2 (Background checks) |
| PS-4 | Personnel Termination | 11.5 (4-hour revocation) |
| PS-5 | Personnel Transfer | 11.5 (Role change procedures) |
| RA-5 | Vulnerability Scanning | 7 (SAST/SCA), 10 (Remediation) |
| SA-3 | System Development Life Cycle | 3 (Phase model) |
| SA-4 | Acquisition Process | 6 (Dependency management) |
| SA-8 | Security Engineering Principles | 13 (Secure coding standards) |
| SA-10 | Developer Configuration Management | 4 (Code governance) |
| SA-11 | Developer Security Testing | 7 (Analysis requirements), 8 (CI gates) |
| SA-15 | Development Process | 3 (SDLC phase model) |
| SI-2 | Flaw Remediation | 10 (Vulnerability remediation) |
| SI-10 | Information Input Validation | 13.2 (Zod validation) |
| SR-3 | Supply Chain Controls | 6 (Dependency management), 9 (SBOM) |
| SR-4 | Provenance | 9 (SBOM generation) |
| SR-5 | Acquisition Strategies | 6.4 (Dependency addition procedure) |

### 16.2 NIST SP 800-218 (SSDF) Mapping

| SSDF Practice | Description | SDLC Section |
|--------------|-------------|-------------|
| PO.1 | Define Security Requirements | 3 (Phase model, Gate 0) |
| PS.1 | Protect All Forms of Code | 4 (Code governance), 11 (Access control) |
| PS.2 | Provide Secure Development Environment | 11 (Developer access), 8.4 (Secrets management) |
| PS.3 | Produce Well-Secured Software | 7 (Analysis), 13 (Coding standards) |
| PW.1 | Design Software to Meet Security Requirements | 3 (Phase 1: Plan) |
| PW.2 | Review the Software Design | 3 (Gate 0: Design review) |
| PW.4 | Reuse Existing Well-Secured Software | 6 (Dependency management) |
| PW.5 | Create Source Code with Minimal Vulnerabilities | 13 (Secure coding standards), 5 (AI controls) |
| PW.6 | Configure Software to Be Secure | 4.1 (Repository configuration) |
| PW.7 | Review and/or Analyze Human-Readable Code | 4.5 (PR requirements), 5.4 (AI review) |
| PW.8 | Test Executable Code | 7.3 (DAST), 8 (CI gates) |
| PW.9 | Configure Deployment Environment Securely | 8.4 (Pipeline secrets) |
| RV.1 | Identify and Confirm Vulnerabilities | 10.1 (Vulnerability sources) |
| RV.2 | Assess, Prioritize, and Remediate Vulnerabilities | 10.2-10.4 (Classification, SLAs, workflow) |
| RV.3 | Analyze Vulnerabilities to Identify Root Causes | 10.4 (Post-mortem for CRITICAL/HIGH) |

---

## Appendix A: Quick Reference -- Developer Checklist

```markdown
## Before Every Commit
- [ ] No secrets, credentials, or API keys in code
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] ESLint passes: `npm run lint`
- [ ] Input validation present on any new API input
- [ ] Audit logging added for new security-relevant actions
- [ ] Error handling includes try/catch with safe responses

## Before Every PR
- [ ] Security impact label: [SECURITY: NONE|LOW|MEDIUM|HIGH|CRITICAL]
- [ ] Description explains what, why, and how tested
- [ ] AI code identified with Co-Authored-By (if applicable)
- [ ] AI code review checklist completed (if applicable)
- [ ] No new dependencies added without justification
- [ ] SBOM regenerated if dependencies changed: `npm run sbom`

## Before Every Release
- [ ] All CI gates passing (security audit, CodeQL, dependency review, build)
- [ ] No critical/high vulnerabilities in npm audit
- [ ] SBOM artifact archived
- [ ] Threat model updated if architecture changed
- [ ] Release notes include security-relevant changes
```

## Appendix B: Document Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-02-22 | DjahankhahTech | Initial SDLC Policy |

---

**END OF DOCUMENT**

**Classification:** UNCLASSIFIED // FOUO
**Distribution:** Mandatory reading for all IE-SYNC developers, contributors, and security reviewers.
