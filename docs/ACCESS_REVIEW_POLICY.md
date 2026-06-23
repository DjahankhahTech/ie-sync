# IE-SYNC Access Review Policy

**NIST 800-171 Controls:** AC-2, AC-2(3), AC-2(4), AC-6, AC-6(5), PS-4, PS-5
**CMMC Level 2:** AC.L2-3.1.1, AC.L2-3.1.2, AC.L2-3.1.5, AC.L2-3.1.6
**Classification:** CUI // FOUO
**Last Updated:** 2026-02-22
**Review Cadence:** Quarterly

---

## 1. Purpose

This policy establishes procedures for managing, reviewing, and auditing user access to the IE-SYNC system to ensure compliance with the principle of least privilege (AC-6) and account management requirements (AC-2).

---

## 2. Scope

This policy applies to all accounts accessing IE-SYNC, including:
- Application user accounts (ADMIN, ANALYST, VIEWER)
- System/service accounts (SYSTEM)
- CI/CD pipeline service accounts
- Repository access (GitHub)
- Infrastructure access (deployment environments)

---

## 3. Role Definitions (AC-6: Least Privilege)

| Role | Access Level | Permitted Actions | Assignment Authority |
|------|-------------|-------------------|---------------------|
| **ADMIN** | Full | Read, write, export, admin, all APIs, user management | IO Cell Lead |
| **ANALYST** | Standard | Read, write, export, feeds API, link-check API | IO Cell Lead or ADMIN |
| **VIEWER** | Read-only | Read, feeds API only | Any ADMIN |
| **SYSTEM** | Service | Health API only | Automated (CI/CD) |

### Privileged Account Controls (AC-6(5))
- ADMIN accounts require MFA (IA-2(1))
- ADMIN accounts are reviewed monthly (not quarterly)
- ADMIN access requires explicit justification documented in access request
- Maximum of 2 concurrent ADMIN accounts per deployment

---

## 4. Account Lifecycle

### 4.1 Account Creation (AC-2)
1. Access request submitted by user's supervisor
2. IO Cell Lead approves role assignment
3. Account created with minimum necessary permissions
4. MFA enrollment required for ADMIN accounts
5. Audit log entry generated: `CONFIG_CHANGE: account_created`

### 4.2 Account Modification (AC-2)
1. Role change request submitted with justification
2. Approved by IO Cell Lead
3. Previous role permissions revoked before new role applied
4. Audit log entry generated: `CONFIG_CHANGE: role_changed`

### 4.3 Account Termination (PS-4)
1. Upon personnel separation: account disabled within 4 hours
2. Session tokens invalidated (rotate NEXTAUTH_SECRET if needed)
3. Access review conducted to identify any data exfiltration
4. Audit log entry generated: `CONFIG_CHANGE: account_disabled`

### 4.4 Personnel Transfer (PS-5)
1. Access reviewed within 24 hours of transfer notification
2. Role adjusted to match new duties (may be downgraded)
3. Audit trail maintained showing access changes

---

## 5. Periodic Access Reviews

### 5.1 Review Schedule

| Review Type | Frequency | Scope | Owner |
|-------------|-----------|-------|-------|
| Privileged account review | Monthly | ADMIN accounts only | IO Cell Lead |
| Full access review | Quarterly | All accounts | Security POC |
| Service account review | Quarterly | SYSTEM accounts, CI/CD | System Administrator |
| Repository access review | Quarterly | GitHub collaborators | Development Lead |
| Emergency access review | On-demand | Triggered by incident | Incident Commander |

### 5.2 Review Procedure
1. Generate current access list from system configuration
2. Cross-reference with authorized personnel roster
3. Verify each account:
   - Is the user still active and assigned to IE-SYNC?
   - Is the role appropriate for current duties?
   - Has the account been used in the last 90 days?
   - Is MFA enabled (required for ADMIN)?
4. Document findings and remediation actions
5. Disable accounts not used in 90+ days (AC-2(3))
6. Sign-off by IO Cell Lead

### 5.3 Inactive Account Policy (AC-2(3))
- Accounts inactive for 30 days: warning notification sent
- Accounts inactive for 60 days: flagged for review
- Accounts inactive for 90 days: automatically disabled
- Disabled accounts retained for 180 days, then deleted

---

## 6. GitHub Repository Access

### 6.1 Access Levels
| Level | Permissions | Assigned To |
|-------|------------|------------|
| Admin | Full repo control | IO Cell Lead only |
| Write | Push, merge PRs | Development team |
| Read | Clone, view code | Extended IO cell |

### 6.2 Requirements
- All GitHub accounts must have MFA enabled
- Branch protection requires PR review before merge
- CODEOWNERS file enforces security-critical file review
- Dependabot alerts must be triaged within 72 hours

---

## 7. Audit Trail Requirements

All access management actions generate audit log entries:
- Account creation, modification, deletion
- Role changes
- Failed access attempts
- Periodic review completion

Audit logs are retained per the Immutable Log retention policy:
- Security events (ACCESS_DENIED): PERMANENT
- Configuration changes: PERMANENT
- Standard API requests: 90 DAYS
- Authentication events: 1 YEAR

---

## 8. Compliance Mapping

| Policy Section | NIST 800-171 | CMMC Level 2 |
|---------------|-------------|--------------|
| Account lifecycle | AC-2 | AC.L2-3.1.1 |
| Periodic review | AC-2(3), AC-2(4) | AC.L2-3.1.1 |
| Least privilege | AC-6 | AC.L2-3.1.5 |
| Privileged accounts | AC-6(5) | AC.L2-3.1.6 |
| Personnel termination | PS-4 | PS.L2-3.9.2 |
| Personnel transfer | PS-5 | PS.L2-3.9.2 |

---

## 9. Policy Maintenance

- This policy is reviewed quarterly (next review: 2026-05-22)
- Updated within 30 days of any access-related incident
- Approved by IO Cell Lead
- Version history maintained in git
