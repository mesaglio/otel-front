#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 v0.1.0"
  exit 1
fi

VERSION=$1
VERSION_NO_V=${VERSION#v}

echo "Updating Homebrew formula for version $VERSION"

# Download checksums
CHECKSUMS_URL="https://github.com/mesaglio/otel-viewer/releases/download/$VERSION/checksums.txt"
echo "Downloading checksums from $CHECKSUMS_URL"
curl -sL "$CHECKSUMS_URL" > /tmp/checksums.txt

# Extract SHA256 for each platform
DARWIN_ARM64_SHA=$(grep "otel-viewer-darwin-arm64.tar.gz" /tmp/checksums.txt | awk '{print $1}')
DARWIN_AMD64_SHA=$(grep "otel-viewer-darwin-amd64.tar.gz" /tmp/checksums.txt | awk '{print $1}')
LINUX_ARM64_SHA=$(grep "otel-viewer-linux-arm64.tar.gz" /tmp/checksums.txt | awk '{print $1}')
LINUX_AMD64_SHA=$(grep "otel-viewer-linux-amd64.tar.gz" /tmp/checksums.txt | awk '{print $1}')

echo "Checksums:"
echo "  Darwin ARM64: $DARWIN_ARM64_SHA"
echo "  Darwin AMD64: $DARWIN_AMD64_SHA"
echo "  Linux ARM64:  $LINUX_ARM64_SHA"
echo "  Linux AMD64:  $LINUX_AMD64_SHA"

# Update formula
FORMULA_FILE="homebrew/otel-viewer.rb"

# Update version
sed -i.bak "s/version \".*\"/version \"$VERSION_NO_V\"/" "$FORMULA_FILE"

# Update SHA256 hashes
sed -i.bak "s/PLACEHOLDER_ARM64_SHA256/$DARWIN_ARM64_SHA/" "$FORMULA_FILE"
sed -i.bak "s/PLACEHOLDER_AMD64_SHA256/$DARWIN_AMD64_SHA/" "$FORMULA_FILE"
sed -i.bak "s/PLACEHOLDER_LINUX_ARM64_SHA256/$LINUX_ARM64_SHA/" "$FORMULA_FILE"
sed -i.bak "s/PLACEHOLDER_LINUX_AMD64_SHA256/$LINUX_AMD64_SHA/" "$FORMULA_FILE"

# Remove backup file
rm -f "$FORMULA_FILE.bak"

echo "✅ Formula updated successfully"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff $FORMULA_FILE"
echo "2. Commit: git add $FORMULA_FILE && git commit -m 'chore: update homebrew formula to $VERSION'"
echo "3. Push: git push origin main"
echo ""
echo "Installation will be:"
echo "  brew tap mesaglio/otel-viewer"
echo "  brew install otel-viewer"

