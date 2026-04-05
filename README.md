# Finance Dashboard System - Backend

A simple NestJS backend for a finance dashboard with role-based access control.

## Project Structure

```text
src/
   administrator/
      dto/
         create-user.dto.ts
         update-user.dto.ts
      administrator-users.controller.ts
      administrator-users.service.ts
      administrator.module.ts
   common/
      filters/
         global-exception.filter.ts
      interceptors/
         api-response.interceptor.ts
      pipes/
         parse-positive-int.pipe.ts
         request-validation.pipe.ts
      prisma.service.ts
   app.controller.ts
   app.module.ts
   app.service.ts
   main.ts
prisma/
   schema.prisma
```

## Setup

1. Install dependencies.

```bash
npm install
```

1. Configure environment variables.

```bash
copy .env.example .env
```

1. Run Prisma migrations.

```bash
npm run prisma:migrate:dev
```

1. Seed test users for all roles.

```bash
npx prisma db seed
```

1. Start the application.

```bash
npm run start:dev
```

## Docker Setup

This repo can run as a full containerized stack with:

- NestJS API
- PostgreSQL
- Redis

### Files Added For Containerization

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `docker/api-entrypoint.sh`
- `.env.docker.example`

### Container Startup Behavior

- The API container waits for PostgreSQL and Redis through Compose health checks.
- On boot, the API container applies committed Prisma migrations before starting Nest.
- The container runs `npx prisma migrate deploy`.
- A real Prisma migration history is now committed under `prisma/migrations`.

This is the correct deployment path for production. The container no longer falls back to `prisma db push`.

### Run The Full Stack

1. Copy the Docker environment template.

```bash
cp .env.docker.example .env.docker
```

Windows PowerShell:

```powershell
Copy-Item .env.docker.example .env.docker
```

1. Build and start all services.

```bash
docker compose up --build
```

1. Open the API and docs.

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

### Seed Demo Data In Docker

Run the seed profile in a separate command:

```bash
docker compose --profile seed up seed
```

That uses `prisma/seed.ts` and creates the demo users and sample records.

### Stop The Stack

```bash
docker compose down
```

To also remove named volumes:

```bash
docker compose down -v
```

## Test Users

These accounts are the testing users used to validate the role-based flows.
Use them to log in, create additional users, and test approval and dashboard behavior.

| Role | Email | Password |
| --- | --- | --- |
| ADMINISTRATOR | admin@test.dev | Admin@12345 |
| ORCHESTRATOR | orchestrator@test.dev | Admin@12345 |
| CONTROLLER_APPROVER | controller@test.dev | Admin@12345 |
| CLERK_SUBMITTER | clerk@test.dev | Admin@12345 |
| ANALYST | analyst@test.dev | Admin@12345 |

Notes:
- The administrator account is the primary entry point for testers.
- In the current test database setup, the non-admin role users were inserted with the same password hash as the administrator for convenience.
- If you later run the fixed seed flow, these passwords may be reset to role-specific values from `prisma/seed.ts`.

## Administrator User APIs

- `POST /administrator/users`
- `GET /administrator/users`
- `GET /administrator/users/:id`
- `PATCH /administrator/users/:id`
- `DELETE /administrator/users/:id`

## API Handling

- Global input validation for all requests
- Standard success and error response shape
- Proper HTTP status codes for invalid input, conflicts, and missing resources
- Protection against invalid operations like removing the last active administrator
