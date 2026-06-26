#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# branch-setup.sh — Creates all day branches and pushes to GitHub
#
# Usage:
#   bash branch-setup.sh
#
# Prerequisites:
#   git remote add origin https://github.com/YOUR_USERNAME/backend-enterprise-onboarding.git
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC}  $*"; }

BRANCHES=(
  "feature/day-0-engineering-culture"
  "feature/day-1-git-workflow"
  "feature/day-2-nestjs-architecture"
  "feature/day-3-dtos-validation-swagger"
  "feature/day-4-request-pipeline-guards"
  "feature/day-5-database-prisma-multitenancy"
  "feature/day-6-auth-rbac"
  "feature/day-7-observability-logging"
  "feature/day-8-advanced-queries-redis-jobs"
  "feature/day-9-testing-strategy"
  "feature/day-10-docker-containerisation"
  "feature/day-11-ci-cd"
  "feature/day-12-14-enterprise-capstone"
)

# Ensure we're on main
git checkout main 2>/dev/null || git checkout -b main

for branch in "${BRANCHES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    info "Branch already exists: $branch"
  else
    git checkout -b "$branch"
    git checkout main
    info "Created branch: $branch"
  fi
done

info "All branches created. To push all branches:"
echo "  git push origin --all"
