# PiAQ Setup Guide

This app has two separate pieces:

1. `backend/` is the Node + PostgreSQL API.
2. `frontend/` is the Vite React UI.

If `npm run migrate` fails with `Error: connect ECONNREFUSED ::1:5432`, the backend could not reach PostgreSQL on your machine. In practice that usually means one of these:

- PostgreSQL is not running yet.
- `DB_HOST=localhost` resolved to IPv6 `::1`, but Postgres is only listening on IPv4.
- The database or credentials in `backend/.env` do not match your local Postgres setup.

## Local setup

### 1. Start PostgreSQL first

Make sure PostgreSQL is installed and running before you touch migrations.

You need a database with these default values unless you intentionally changed them:

- host: `127.0.0.1`
- port: `5432`
- database: `piaq`
- user: `postgres`
- password: your local Postgres password

If the `piaq` database does not exist yet, create it in `psql`:

```sql
CREATE DATABASE piaq;
```

### 2. Configure backend env vars

From `backend/`, copy `.env.example` to `.env` if you have not already, then confirm these values:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=piaq
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
```

Notes:

- Keep `DB_SSL=false` for a normal local Postgres install.
- Use `127.0.0.1` instead of `localhost` to avoid `::1` surprises on Windows.

### 3. Install backend dependencies

```powershell
cd backend
npm install
```

### 4. Run migrations

```powershell
npm run migrate
```

This creates the core tables:

- `devices`
- `sensor_readings`
- `alert_rules`
- `alerts`
- `device_sync_state`

### 5. Seed demo data (optional but useful)

```powershell
npm run seed:demo
```

This loads demo devices like `pi-demo-101` and `pi-demo-202`.

### 6. Start the backend

```powershell
npm run dev
```

Or for a plain Node start:

```powershell
npm start
```

### 7. Verify the backend

Quick health checks:

- `GET /health`
- `GET /system/health`

Example local URLs:

- `http://localhost:5000/health`
- `http://localhost:5000/system/health`
- `http://localhost:5000/devices/pi-demo-101/latest`

## Frontend local setup

The frontend is independent from the backend install.

```powershell
cd frontend
npm install
npm run dev
```

The frontend's own env file is `frontend/.env.example`. That file is for frontend secrets like `GEMINI_API_KEY`, not the Postgres connection.

## Deployment setup

For a deployed backend, the order is:

1. Provision PostgreSQL.
2. Create the backend env vars in the host.
3. Deploy backend dependencies.
4. Run `npm run migrate`.
5. Start the backend with `npm start`.

Set these backend environment variables in the deployment platform:

```env
PORT=5000
DB_HOST=<your-managed-postgres-host>
DB_PORT=5432
DB_NAME=<your-database-name>
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
DB_SSL=true
```

Deployment notes:

- Do not use `localhost` for deployed Postgres unless the database is truly running on the same machine.
- Hosted Postgres usually needs `DB_SSL=true`.
- This codebase currently reads individual `DB_*` variables, not a single `DATABASE_URL`.

## Exact command order to remember

For local backend work:

```powershell
cd backend
npm install
npm run migrate
npm run seed:demo
npm run dev
```

But the hidden step before all of that is:

```text
Start PostgreSQL and make sure the piaq database exists.
```

## Troubleshooting

### `ECONNREFUSED ::1:5432`

Meaning: Node tried to connect to PostgreSQL on IPv6 localhost and nothing answered.

Try:

1. Start PostgreSQL.
2. Change `DB_HOST` to `127.0.0.1`.
3. Confirm the `piaq` database exists.
4. Confirm `DB_USER` and `DB_PASSWORD` are correct.

### Migrations run but the app still shows DB errors

Check `GET /system/health`. That endpoint reports whether the API can still reach the database live.

### Seed script fails

Run `npm run migrate` first. The seed script expects the schema to already exist.
