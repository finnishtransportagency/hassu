#!/usr/bin/env bash
# Contains code generated or recommended by Amazon Q
#
# Extracts the GitHub App installation token from CodeBuild's git credentials.
#
# Background:
# CodeBuild uses AWS CodeConnections (GitHub App) to authenticate with GitHub.
# The connection provides source cloning, webhooks, and build status reporting
# automatically. Internally, CodeBuild calls the codeconnections:GetConnectionToken
# IAM action (a permission-only action, not a public API) to obtain a short-lived
# GitHub App installation token, which it stores in the build environment's git
# credential helper.
#
# Problem:
# CodeBuild does not expose this token as an environment variable. Tools like
# semantic-release require a GITHUB_TOKEN env var to create GitHub Releases and
# push git tags via the GitHub API. Without it, git operations work (the remote
# is already authenticated), but GitHub API calls fail.
#
# Solution:
# This script reads the token from git's credential helper using "git credential fill",
# or as a fallback, parses it from the authenticated remote URL. This is the standard
# way to retrieve credentials that git stores — not a hack, but a gap in CodeBuild's
# env var surface.
#
# Usage: eval $(./deployment/bin/getGitHubAppToken.sh)

set -euo pipefail

TOKEN=""

# Try git credential helper first
TOKEN=$(echo "host=github.com
protocol=https" | git credential fill 2>/dev/null | grep "^password=" | cut -d= -f2- || true)

# Fall back to extracting token from the git remote URL
if [ -z "$TOKEN" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
  TOKEN=$(echo "$REMOTE_URL" | sed -n 's|https://x-access-token:\([^@]*\)@github.com.*|\1|p' || true)
fi

if [ -z "$TOKEN" ]; then
  echo "Failed to extract GitHub token from CodeBuild environment" >&2
  exit 1
fi

echo "export GITHUB_TOKEN=${TOKEN}"
