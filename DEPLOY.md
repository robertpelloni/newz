# DEPLOY

Latest, highly detailed deployment and environment setup instructions.

1. Ensure Docker and Docker Compose are installed.
2. Start the database containers and run migrations:
   ```bash
   ./deploy_db.sh
   ```
3. For the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
4. For the worker:
   ```bash
   cd worker
   pip install -r requirements.txt
   celery -A celery_app worker --loglevel=info
   ```
5. For the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Offline & PWA Distribution Build

Omnifeed features a zero-dependency local SQLite fallback and client-side offline execution capabilities:

### 1. Automated PWA Distribution Build
Run the unified offline distribution build script from the repository root:
```bash
./scripts/build_offline_distribution.sh
```
This script:
- Verifies PWA manifest prerequisites (`frontend/public/manifest.json`, `sw.js`, and 192/512 icon assets).
- Compiles the Next.js production bundle.
- Runs the PWA compliance test suite to ensure service worker cache buckets (`omnifeed-api-v2` and static caches) are valid.

### 2. Native Desktop Shell (Tauri v2)
To compile or run the native desktop shell embedding the frontend:
```bash
cd frontend
npm run tauri:dev   # For live development with native window
npm run tauri:build # For release binaries
```

### 3. Offline Architecture & Sync Mechanics
- **API Cache Layer:** `sw.js` caches all `/api/` GET requests using a Network-First, Cache-Fallback strategy into bucket `omnifeed-api-v3`.
- **LocalStorage Fallback:** Feed topics, custom feed catalogue, individual topic cluster deep-dives, and user bookmarks are automatically mirrored into `omnifeed_cached_topics`, `omnifeed_sources_cache`, `omnifeed_topic_detail_<id>`, and `omnifeed_bookmarks`.
- **Background Sync & Offline Queue:** Ingestion sync requests triggered while disconnected are queued into `omnifeed_sync_queue`. The application registers a Service Worker Background Sync event (`sync-omnifeed-queue`) which triggers automated queue replay when network connectivity is re-established, backed by window `online` listeners for browsers lacking the SyncManager API.
- **Service Worker Messaging:** The service worker coordinates state updates via `TRIGGER_QUEUE_REPLAY` and `BACKGROUND_SYNC_COMPLETED` messages, prompting automatic dashboard refresh without user intervention.
- **Platform Detection:** The dashboard identifies whether it is running as a Tauri desktop shell (`window.__TAURI__`), an installed PWA (`display-mode: standalone`), or standard web browser.
