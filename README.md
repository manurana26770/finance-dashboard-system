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

## Test Users

These accounts are created by the Prisma seed script and are ready for login:

| Role | Email | Password |
| --- | --- | --- |
| ADMINISTRATOR | admin@test.dev | Admin@12345 |
| ORCHESTRATOR | orchestrator@test.dev | Orchestrator@12345 |
| CONTROLLER_APPROVER | controller@test.dev | Controller@12345 |
| CLERK_SUBMITTER | clerk@test.dev | Clerk@12345 |
| ANALYST | analyst@test.dev | Analyst@12345 |

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
