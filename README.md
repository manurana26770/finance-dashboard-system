# Finance Dashboard System Backend

NestJS backend for a finance dashboard with JWT authentication, role-based access control, dashboard aggregation, record workflows, Redis-backed caching, and PostgreSQL persistence through Prisma.

## Live URLs

- Local API: `http://localhost:3000/api/v1`
- Local Swagger docs: `http://localhost:3000/api/docs`
- Public/live deployment: not defined in this repository

If you have a deployed API URL, replace the public/live entry above with the actual production endpoint.

## Core Features

- JWT access and refresh token authentication
- Role-based access for `ADMINISTRATOR`, `ORCHESTRATOR`, `CONTROLLER_APPROVER`, `CLERK_SUBMITTER`, and `ANALYST`
- User invitation and invite-acceptance onboarding flow
- Personal profile and password management endpoints
- Financial record CRUD with role-aware permissions
- Personal and administrative dashboard endpoints
- Redis caching for dashboard responses
- Swagger documentation at `/api/docs`
- Dockerized local stack with API, PostgreSQL, and Redis

## Project Structure

```text
src/
  auth/
    dto/
    strategies/
    types/
    auth.controller.ts
    auth.module.ts
    auth.service.ts
  common/
    cache/
    decorators/
    dto/
    filters/
    guards/
    interceptors/
    pipes/
    services/
    swagger/
    prisma.service.ts
  dashboard/
    administrative/
    dto/
    personal/
    dashboard-cache.service.ts
    dashboard.module.ts
    dashboard.service.ts
    dashboard.types.ts
  transactions/
    dto/
    transactions.controller.ts
    transactions.module.ts
    transactions.service.ts
  users/
    administrative/
    personal/
    users.controller.ts
    users.module.ts
    users.service.ts
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
prisma/
  migrations/
  schema.prisma
  seed.ts
docker/
  api-entrypoint.sh
test/
  jest-e2e.json
  records-permissions.e2e-spec.ts
```

## Environment Variables

Copy the template and fill in real values:

```powershell
Copy-Item .env.example .env
```

Important variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `FRONTEND_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `PORT`
- `NODE_ENV`

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env` from the example file.

```powershell
Copy-Item .env.example .env
```

3. Generate the Prisma client.

```bash
npm run prisma:generate
```

4. Apply database migrations.

```bash
npm run prisma:migrate:dev
```

5. Seed demo users and sample financial records.

```bash
npx prisma db seed
```

6. Start the API in development mode.

```bash
npm run start:dev
```

## Docker Setup

The Docker stack starts:

- NestJS API
- PostgreSQL
- Redis

### Start the stack

1. Create the Docker environment file.

```powershell
Copy-Item .env.docker.example .env.docker
```

2. Build and start all services.

```bash
docker compose up --build
```

3. Open:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

### Seed demo data in Docker

```bash
docker compose --profile seed up seed
```

### Stop the stack

```bash
docker compose down
```

Remove named volumes too:

```bash
docker compose down -v
```

## Seeded Test Users

These accounts are created by `prisma/seed.ts`:

| Role | Email | Password |
| --- | --- | --- |
| ADMINISTRATOR | admin@test.dev | Admin@12345 |
| ORCHESTRATOR | orchestrator@test.dev | Orchestrator@12345 |
| CONTROLLER_APPROVER | controller@test.dev | Controller@12345 |
| CLERK_SUBMITTER | clerk@test.dev | Clerk@12345 |
| ANALYST | analyst@test.dev | Analyst@12345 |

The seed also inserts sample financial records for dashboard and permission testing.

## Main API Routes

Base path: `/api/v1`

### Health

- `GET /`

### Authentication

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### User onboarding and management

- `POST /users/invite`
- `POST /users/accept-invite`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/status`
- `PUT /users/:id/role`
- `GET /users/me`
- `PATCH /users/me`
- `PUT /users/me/password`

### Dashboard

- `GET /dashboard/administrative/overview`
- `GET /dashboard/administrative/activity`
- `GET /dashboard/me/overview`
- `GET /dashboard/me/activity`

### Financial records

- `POST /records`
- `GET /records`
- `GET /records/:id`
- `PATCH /records/:id`
- `DELETE /records/:id`

## Runtime Behavior

- Global validation pipe on all requests
- Standard success/error response envelope
- Global exception filter for API-safe errors
- Throttling configured through NestJS Throttler
- Swagger generated from controller decorators
- Dashboard responses cached with Redis when configured

## Scripts

```bash
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```
