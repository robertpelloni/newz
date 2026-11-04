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
