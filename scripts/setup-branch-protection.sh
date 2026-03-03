#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# IE-SYNC Branch Protection Setup
# NIST 800-171: CM-3 (Configuration Change Control), CM-5 (Access Restrictions)
#
# Requires: GitHub Pro/Enterprise for private repos, or public repo.
# Run: bash scripts/setup-branch-protection.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

OWNER="DjahankhahTech"
REPO="ie-sync"
BRANCH="main"

echo "=== IE-SYNC Branch Protection Setup ==="
echo "Repository: ${OWNER}/${REPO}"
echo "Branch:     ${BRANCH}"
echo ""

# 1. Verify repo is private (NIST AC-22)
PRIVATE=$(gh repo view "${OWNER}/${REPO}" --json isPrivate -q '.isPrivate')
if [ "$PRIVATE" = "true" ]; then
  echo "[OK] Repository is PRIVATE"
else
  echo "[WARN] Repository is PUBLIC — consider making it private for CUI"
fi

# 2. Enable vulnerability alerts (NIST RA-5, SI-2)
echo ""
echo "Enabling Dependabot vulnerability alerts..."
gh api -X PUT "repos/${OWNER}/${REPO}/vulnerability-alerts" 2>/dev/null && \
  echo "[OK] Vulnerability alerts enabled" || \
  echo "[SKIP] Vulnerability alerts (may require admin)"

# 3. Enable automated security fixes (NIST SI-2)
echo ""
echo "Enabling Dependabot automated security fixes..."
gh api -X PUT "repos/${OWNER}/${REPO}/automated-security-fixes" 2>/dev/null && \
  echo "[OK] Automated security fixes enabled" || \
  echo "[SKIP] Automated security fixes (may require admin)"

# 4. Set branch protection (requires GitHub Pro for private repos)
echo ""
echo "Setting branch protection rules for '${BRANCH}'..."
gh api -X PUT "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  --input - <<'EOF' 2>/dev/null && echo "[OK] Branch protection configured" || echo "[SKIP] Branch protection requires GitHub Pro for private repos"
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Security Audit & SBOM",
      "CodeQL Analysis",
      "Dependency Review"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF

# 5. Create CODEOWNERS file
echo ""
echo "Verifying CODEOWNERS file..."
if [ -f ".github/CODEOWNERS" ]; then
  echo "[OK] CODEOWNERS exists"
else
  echo "[CREATE] Writing .github/CODEOWNERS"
  mkdir -p .github
  cat > .github/CODEOWNERS <<'CODEOWNERS'
# IE-SYNC Code Owners — NIST CM-5 (Access Restrictions for Change)
# These owners are required reviewers for all PRs.

# Default owners for everything
*       @DjahankhahTech

# Security-critical files require security lead review
middleware.ts                     @DjahankhahTech
lib/auth.ts                       @DjahankhahTech
lib/audit-log.ts                  @DjahankhahTech
lib/validation.ts                 @DjahankhahTech
lib/encryption.ts                 @DjahankhahTech
app/api/auth/**                   @DjahankhahTech
.github/workflows/**              @DjahankhahTech
next.config.ts                    @DjahankhahTech
docs/INCIDENT_RESPONSE.md         @DjahankhahTech
docs/SECURITY.md                  @DjahankhahTech
CODEOWNERS
  echo "[OK] CODEOWNERS created"
fi

# 6. Enforce MFA check
echo ""
echo "Checking org/user MFA status..."
MFA=$(gh api user --jq '.two_factor_authentication // false' 2>/dev/null)
if [ "$MFA" = "true" ]; then
  echo "[OK] MFA is enabled on your GitHub account"
else
  echo "[CRITICAL] MFA is NOT enabled — enable at https://github.com/settings/security"
  echo "           NIST IA-2(1) requires MFA for privileged access"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Manual steps required:"
echo "  1. Enable GitHub MFA:     https://github.com/settings/security"
echo "  2. Upgrade to Pro (if private repo needs branch protection)"
echo "  3. Enable code scanning:  https://github.com/${OWNER}/${REPO}/settings/security_analysis"
echo "  4. Review Dependabot:     https://github.com/${OWNER}/${REPO}/security/dependabot"
