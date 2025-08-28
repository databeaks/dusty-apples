# Node.js + FastAPI Hello World App

A simple hello world template that demonstrates how to build full-stack applications using Node.js (React) frontend with FastAPI backend for Databricks Apps.

## Architecture

```
Nextjs Frontend (TypeScript + Tailwind + Shadcn + Zustand)
    ↓ API calls
FastAPI Backend (Python)
    ↓ Serves static files + API
Databricks Apps
```

## Setup

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Install Node.js dependencies:**
```bash
npm install
```

## Environment Variables

The application uses a two-tier environment configuration system:
- **`.env`** - Production/base configuration
- **`.env.local`** - Local development overrides (gitignored)

See `env-example.md` for detailed configuration examples.

### Local Development

Create a `.env.local` file in the project root:

```bash
# Environment mode
ENVIRONMENT=local

# Database configuration for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

### Production Deployment

Create a `.env` file in the project root:

```bash
# Environment mode
ENVIRONMENT=production

# Databricks database configuration
DATABRICKS_INSTANCE_NAME=your_instance_name
DATABRICKS_USER_NAME=your.email@company.com

# Databricks authentication
DATABRICKS_HOST=https://your-workspace-url/
DATABRICKS_TOKEN=your-access-token
```

### Databricks Authentication

The Databricks SDK uses default authentication methods in the following order:
1. Databricks CLI configuration (`~/.databrickscfg`)
2. Environment variables (`DATABRICKS_HOST`, `DATABRICKS_TOKEN`, etc.)
3. Azure CLI (for Azure Databricks)
4. Service Principal authentication
5. Google Cloud authentication (for GCP Databricks)

For explicit authentication, you can also set:

```bash
# Token-based authentication
DATABRICKS_HOST=https://your-workspace-url/
DATABRICKS_TOKEN=your-access-token

# Or Service Principal authentication
DATABRICKS_HOST=https://your-workspace-url/
DATABRICKS_CLIENT_ID=your-service-principal-id
DATABRICKS_CLIENT_SECRET=your-service-principal-secret
```

**Note:** In production mode, the application will automatically:
- Connect to your Databricks workspace using the configured authentication
- Get database instance details using `get_database_instance()`
- Generate fresh database credentials using `generate_database_credential()`
- Use SSL-required connections (`sslmode=require`)

## Development

1. **Start FastAPI backend:**
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

2. **In another terminal, start React dev server:**
```bash
npm run dev
```

- Frontend: http://localhost:5173 (with API proxy)
- Backend API docs: http://localhost:8000/docs

## Production

Build and run:
```bash
npm run build
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Databricks Apps Deployment

Configured for Databricks Apps with `app.yaml`. Uses `DATABRICKS_APP_PORT` environment variable automatically.

Create the Databricks App in the Databricks UI and follow the instructions after the app is created. 

The Databricks App Deployment consumes the .env.production file and must not include the NEXT_PUBLIC_API_URL

```bash
npm run build
databricks sync --watch . /Workspace/Users/tony.bo@databricks.com/{{Databricks App Here}}
databricks apps deploy {{Databricks App Here}} --source-code-path /Workspace/Users/tony.bo@databricks.com//{{Databricks App Here}}
```

The npm run build will place the static files in the backend folder.

## API

- `GET /api/hello` - Hello world message
- `GET /api/health` - Health check endpoint  
- `GET /api/db-test` - Test database connection and return version info
- `GET /api/env-info` - Show environment configuration (no secrets)
- `GET /docs` - FastAPI interactive documentation