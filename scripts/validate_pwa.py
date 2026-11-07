import os
import sys
import json

def validate_sw(sw_path):
    if not os.path.exists(sw_path):
        return False, f"Missing {sw_path}"
    with open(sw_path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'omnifeed-api-v3' not in content:
        return False, "Missing omnifeed-api-v3 cache bucket in sw.js"
    if 'fetch' not in content:
        return False, "No fetch handler in sw.js"
    if 'sync' not in content or 'sync-omnifeed-queue' not in content:
        return False, "Missing sync event listener or sync-omnifeed-queue tag in sw.js"
    if 'message' not in content or 'TRIGGER_QUEUE_REPLAY' not in content:
        return False, "Missing message event listener or TRIGGER_QUEUE_REPLAY command in sw.js"
    return True, "sw.js valid"

def validate_manifest(manifest_path):
    if not os.path.exists(manifest_path):
        return False, f"Missing {manifest_path}"
    with open(manifest_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            return False, f"Invalid JSON: {e}"
    if 'icons' not in data or len(data['icons']) < 2:
        return False, "Manifest missing required icon definitions"
    if data.get('display') != 'standalone':
        return False, "Manifest display should be standalone"
    if not data.get('start_url'):
        return False, "Manifest missing start_url"
    return True, "manifest.json valid"

def main():
    if len(sys.argv) < 3:
        print("Usage: python validate_pwa.py <sw_path> <manifest_path>")
        sys.exit(1)

    sw_ok, sw_msg = validate_sw(sys.argv[1])
    man_ok, man_msg = validate_manifest(sys.argv[2])

    if not sw_ok or not man_ok:
        print(f"FAILED: sw={sw_msg}, manifest={man_msg}")
        sys.exit(1)
    print("PWA Validation PASSED: Service worker background sync and Web Manifest are properly configured.")

if __name__ == '__main__':
    main()
