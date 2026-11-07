#!/usr/bin/env bash
# ==============================================================================
# Omnifeed (Newz) - PWA & Offline Distribution Build Script
# Validates manifest, service worker caching, and compiles production bundles.
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Omnifeed Offline Distribution Build ==="
cd "$REPO_ROOT"

echo "1. Checking PWA asset prerequisites..."
if [ ! -f "$REPO_ROOT/frontend/public/manifest.json" ]; then
    echo "ERROR: Missing manifest.json in frontend/public/"
    exit 1
fi

if [ ! -f "$REPO_ROOT/frontend/public/sw.js" ]; then
    echo "ERROR: Missing sw.js in frontend/public/"
    exit 1
fi

if [ ! -f "$REPO_ROOT/frontend/public/icon-512.png" ]; then
    echo "ERROR: Missing icon-512.png in frontend/public/"
    exit 1
fi

if [ ! -f "$REPO_ROOT/frontend/public/icon-192.png" ]; then
    echo "ERROR: Missing icon-192.png in frontend/public/"
    exit 1
fi

echo "2. Validating PWA manifest JSON structure..."
python3 -c "
import json
with open('frontend/public/manifest.json', 'r') as f:
    data = json.load(f)
assert data['short_name'] == 'Omnifeed'
assert data['display'] == 'standalone'
assert len(data['icons']) >= 2
print('Manifest valid: ' + data['name'] + ' (' + data['display'] + ')')
"

echo "3. Building Frontend for offline distribution..."
cd "$REPO_ROOT/frontend"
npm run build

echo "4. Validating Tauri desktop configuration and icons..."
cd "$REPO_ROOT"
python3 -c "
import json, os
with open('frontend/src-tauri/tauri.conf.json', 'r') as f:
    conf = json.load(f)
assert conf['productName'] == 'Omnifeed'
assert conf['version'] == '0.7.2'
assert os.path.exists('frontend/src-tauri/icons/icon.png')
print('Tauri config valid: ' + conf['productName'] + ' v' + conf['version'])
"

echo "5. Running PWA compliance checks..."
cd "$REPO_ROOT"
python3 "$REPO_ROOT/scripts/validate_pwa.py" frontend/public/sw.js frontend/public/manifest.json

echo "=== PWA & Tauri Desktop Offline Distribution Ready ==="
