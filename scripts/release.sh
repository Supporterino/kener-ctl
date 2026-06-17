#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: scripts/release.sh <version>"
  echo ""
  echo "  version  New semver version (e.g. 0.2.0)"
  echo ""
  echo "Bumps the version in package.json, commits, tags, and pushes to origin."
  echo "Pushing the version tag triggers the release workflow."
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must match x.y.z (e.g. 0.2.0)"
  exit 1
fi

echo "Bumping version to $VERSION …"

# Update package.json version field using a temporary file (macOS sed compatibility)
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json

echo "Committing and tagging …"

git add package.json
git commit -m "chore: bump version to v$VERSION"

git tag -a "v$VERSION" -m "v$VERSION"

echo "Pushing to origin …"

git push origin HEAD
git push origin "v$VERSION"

echo "Done. Release workflow will trigger for v$VERSION."
