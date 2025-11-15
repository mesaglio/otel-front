# Release Process

## Overview

This project uses GitHub Actions with **native runners** for each platform to ensure reliable builds with CGO (required by DuckDB).

## Workflow Architecture

```
Frontend Build (1 job)
    ↓
Build Matrix (4 parallel jobs)
    - macOS ARM64 (macos-latest)
    - macOS AMD64 (macos-13)
    - Linux AMD64 (ubuntu-latest)
    - Linux ARM64 (ubuntu-latest + cross-compile)
    ↓
Release (1 job)
    - Combine artifacts
    - Create GitHub Release
    - Update Homebrew tap
```

## First-Time Setup

### 1. Rename Repository

Go to: https://github.com/mesaglio/otel-viewer/settings
- Change repository name from `otel-viewer` to `otel-front`

Update local remote:
```bash
git remote set-url origin https://github.com/mesaglio/otel-front.git
```

### 2. Create Homebrew Tap Repository

```bash
gh repo create homebrew-otel-front --public --description "Homebrew tap for otel-front"
cd homebrew-otel-front

# Copy template
cp ~/path/to/otel-front/homebrew-tap-template/README.md .
cp ~/path/to/otel-front/homebrew-tap-template/otel-front.rb .

git add .
git commit -m "Initial tap setup"
git push origin main
```

### 3. Create GitHub Token

1. Go to: https://github.com/settings/tokens/new
2. Token name: `HOMEBREW_TAP_GITHUB_TOKEN`
3. Select scopes: `repo` + `workflow`
4. Generate and copy token

### 4. Add Token as Secret

```bash
gh secret set HOMEBREW_TAP_GITHUB_TOKEN
# Paste the token when prompted
```

## Making a Release

### Test Release (No actual release)

```bash
gh workflow run release.yml -f test_mode=true
gh run watch
```

### Production Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will automatically:
- Build frontend once
- Build binaries for all platforms (parallel)
- Create GitHub Release with archives
- Update Homebrew tap with checksums

## Installation for Users

After release, users can install with:

```bash
brew tap mesaglio/otel-front
brew install otel-front
```

## Troubleshooting

### Build Fails

Check specific platform logs in GitHub Actions:
- macOS builds: Native runners, should work out of the box
- Linux ARM64: Uses cross-compilation with gcc-aarch64-linux-gnu

### Tap Doesn't Update

- Verify `HOMEBREW_TAP_GITHUB_TOKEN` is set: `gh secret list`
- Check workflow logs for "Update Homebrew Tap" step
- Ensure tap repository exists and is public

### Frontend Build Fails

Test locally:
```bash
cd frontend
npm ci
npm run build
```

## Local Development

### Build for Current Platform

```bash
make release
./bin/otel-front --version
```

### Snapshot with GoReleaser

```bash
make release-snapshot
ls -lh dist/
```

## Notes

- **CGO**: All builds use CGO_ENABLED=1 (required for DuckDB)
- **Native Runners**: macOS and Linux AMD64 use native runners
- **Linux ARM64**: Uses cross-compilation (works well with DuckDB)
- **Tap Updates**: Custom script, not GoReleaser (more reliable)

## Files

- `.github/workflows/release.yml` - Main release workflow
- `.goreleaser.yml` - For local testing only
- `homebrew-tap-template/` - Template files for tap setup
