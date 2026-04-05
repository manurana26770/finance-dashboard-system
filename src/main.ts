import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { RequestValidationPipe } from './common/pipes/request-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new RequestValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Finance Dashboard API')
    .setDescription(
      [
        'Comprehensive REST API documentation for the finance dashboard backend.',
        '',
        '## How To Read This Documentation',
        '- Every endpoint summary is followed by purpose, behavior, access rules, and usage flow.',
        '- Request and query DTO fields are documented with examples and validation constraints.',
        '- All secured endpoints use the `access-token` bearer scheme shown in the Authorize button.',
        '',
        '## Standard Response Envelope',
        '- Successful responses are wrapped as: `success`, `statusCode`, `path`, `timestamp`, `data`.',
        '- Error responses are wrapped as: `success`, `statusCode`, `path`, `timestamp`, `message`, and optional `errors`.',
        '',
        '## Primary Usage Flow',
        '1. Administrator invites a user with `POST /users/invite`.',
        '2. Invited user activates the account with `POST /users/accept-invite`.',
        '3. User signs in with `POST /auth/login`.',
        '4. Client uses `GET /auth/me` to confirm current identity and role.',
        '5. Role-specific users operate on records and dashboards using the secured endpoints.',
        '',
        '## Authentication Notes',
        '- Access tokens are required for protected endpoints.',
        '- Refresh tokens are exchanged through `POST /auth/refresh` and invalidated with `POST /auth/logout`.',
        '- Suspended, inactive, or expired sessions are rejected by JWT validation.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
