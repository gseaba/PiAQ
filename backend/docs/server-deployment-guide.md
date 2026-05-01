# PiAQ Server Deployment Guide

This guide assumes one Linux server will host:

- PostgreSQL
- the Node backend
- the built frontend

The Raspberry Pi does not run on the server. The Pi keeps running its own Python code and sends data to the backend over HTTP.

## What runs where

### On the server

- `backend/`
- `frontend/`
- PostgreSQL
- a reverse proxy such as Nginx

### On each Raspberry Pi

- `raspberryPi/`

## Important repo-specific notes

1. The backend depends on PostgreSQL and uses `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_SSL`.
2. The Raspberry Pi uploader already targets the backend API routes:
- `POST /devices/register`
- `POST /devices/:deviceId/heartbeat`
- `POST /ingest/batch`
3. The frontend is not fully wired to the backend yet. Right now `frontend/src/services/airQualityService.ts` still returns mock data instead of calling the real API.
4. `raspberryPi/config.py` currently points to `http://10.0.0.1:5001`, so that URL must be changed to your real server address before deployment.

## 1. Install PostgreSQL on the server

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Create the database and app user

```bash
sudo -u postgres psql
```

Then run:

```sql
CREATE DATABASE piaq;
CREATE USER piaq_app WITH ENCRYPTED PASSWORD 'change_this_password';
GRANT ALL PRIVILEGES ON DATABASE piaq TO piaq_app;
\q
```

### Grant schema privileges after migrations create tables

If you want the app user to fully manage tables created in `public`, run:

```bash
sudo -u postgres psql -d piaq
```

```sql
GRANT ALL ON SCHEMA public TO piaq_app;
ALTER SCHEMA public OWNER TO piaq_app;
\q
```

## 2. Install Node.js on the server

Use the Node version your project expects. Then verify:

```bash
node -v
npm -v
```

## 3. Configure backend env vars on the server

In `backend/.env`, use server-local Postgres values if Postgres is installed on the same machine:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=piaq
DB_USER=piaq_app
DB_PASSWORD=change_this_password
DB_SSL=false
```

If the database is hosted elsewhere, use that external host and usually `DB_SSL=true`.

## 4. Install backend dependencies and run migrations

Yes, the backend setup is almost the same as local, with one extra prerequisite: PostgreSQL must already be installed and running.

```bash
cd backend
npm install
npm run migrate
npm run seed:demo
npm start
```

Notes:

- `npm run seed:demo` is optional.
- `npm start` is better than `npm run dev` on a server.
- For production, do not leave the backend tied to a live shell session. Use `systemd`, `pm2`, or another process manager.

## 5. Run the backend as a service

Example `systemd` service:

```ini
[Unit]
Description=PiAQ backend
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/path/to/PiAQ/backend
ExecStart=/usr/bin/npm start
Restart=always
User=your_linux_user
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save as:

```text
/etc/systemd/system/piaq-backend.service
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable piaq-backend
sudo systemctl start piaq-backend
sudo systemctl status piaq-backend
```

## 6. Build and host the frontend

The frontend can be built into static files and served by Nginx.

```bash
cd frontend
npm install
npm run build
```

This creates `frontend/dist`.

Then point Nginx at that folder.

## 7. Put Nginx in front of frontend and backend

Typical setup:

- Nginx serves the frontend at `/`
- Nginx proxies backend requests to the Node app on `127.0.0.1:5000`

Example Nginx site:

```nginx
server {
    listen 80;
    server_name your-domain-or-server-ip;

    root /path/to/PiAQ/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Important:

- The backend routes in this repo are `/devices`, `/ingest`, `/system`, and `/health`.
- If you proxy under `/api/`, the frontend must call `/api/...`.
- If you proxy the backend directly at `/`, make sure route handling does not conflict with the frontend.

## 8. Update the Raspberry Pi to point at the server

In `raspberryPi/config.py`, update:

```python
SERVER_URL = "http://10.0.0.1:5001"
```

to your real backend URL, for example:

```python
SERVER_URL = "https://your-domain.com/api"
```

or if you expose the backend without the `/api` prefix:

```python
SERVER_URL = "https://your-domain.com"
```

The exact value depends on your Nginx routing.

## 9. Verify each layer

### Verify PostgreSQL

```bash
sudo -u postgres psql -d piaq -c "\dt"
```

### Verify backend directly

From the server:

```bash
curl http://127.0.0.1:5000/health
curl http://127.0.0.1:5000/system/health
```

### Verify through Nginx

```bash
curl http://your-domain-or-server-ip/
curl http://your-domain-or-server-ip/api/health
curl http://your-domain-or-server-ip/api/system/health
```

### Verify Raspberry Pi connectivity

Once the Pi points at the new URL, it should be able to:

- register itself
- send heartbeats
- upload summarized sensor windows

## 10. Current limitation in this repo

The backend and Raspberry Pi are aligned.

The frontend is not fully aligned yet because `frontend/src/services/airQualityService.ts` still returns mock data. That means:

- hosting the frontend will work
- hosting the backend will work
- the Pi can send live data to the backend
- but the current frontend will not automatically show real backend data until that service is wired to your API

## Short answer to "is the server setup the same as local?"

Mostly yes for the backend:

```bash
cd backend
npm install
npm run migrate
npm start
```

But on the server you also need:

1. PostgreSQL installed and running first
2. the database and app user created first
3. backend env vars configured
4. a process manager so the backend stays alive
5. Nginx or another web server for the frontend
6. the Raspberry Pi `SERVER_URL` changed to the hosted backend URL
