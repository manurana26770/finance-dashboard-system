import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const { statusCode, message, errors } = this.normalizeHttpException(
        exception,
      );
      return this.reply(response, request, statusCode, message, errors);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { statusCode, message, errors } =
        this.normalizePrismaKnownRequestError(exception);
      return this.reply(response, request, statusCode, message, errors);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn(
        `Prisma validation error on ${request.method} ${request.url}: ${exception.message}`,
      );
      return this.reply(
        response,
        request,
        HttpStatus.BAD_REQUEST,
        'Database validation failed',
      );
    }

    const { statusCode, message, errors } = this.normalizeUnknownException(
      exception,
      request,
    );
    return this.reply(response, request, statusCode, message, errors);
  }

  private normalizeHttpException(exception: HttpException): {
    statusCode: number;
    message: string;
    errors?: unknown;
  } {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return { statusCode, message: exceptionResponse };
    }

    if (Array.isArray(exceptionResponse)) {
      return {
        statusCode,
        message: 'Request validation failed',
        errors: exceptionResponse,
      };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const errorResponse = exceptionResponse as Record<string, unknown>;
      const message = this.extractMessage(errorResponse.message);
      const errors = errorResponse.errors ?? errorResponse.error ?? undefined;

      return {
        statusCode,
        message,
        ...(errors !== undefined ? { errors } : {}),
      };
    }

    return {
      statusCode,
      message: exception.message || 'Request failed',
    };
  }

  private normalizePrismaKnownRequestError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    errors?: unknown;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A unique field value already exists',
          errors: {
            code: exception.code,
            meta: exception.meta,
          },
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Requested record was not found',
          errors: {
            code: exception.code,
            meta: exception.meta,
          },
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation reference',
          errors: {
            code: exception.code,
            meta: exception.meta,
          },
        };
      default:
        this.logger.error(
          `Prisma request error on ${exception.clientVersion} (${exception.code})`,
          exception.message,
        );
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database request failed',
          errors: {
            code: exception.code,
            meta: exception.meta,
          },
        };
    }
  }

  private normalizeUnknownException(
    exception: unknown,
    request: Request,
  ): {
    statusCode: number;
    message: string;
    errors?: unknown;
  } {
    if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception.stack,
      );

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
      };
    }

    this.logger.error(
      `Unknown non-error thrown on ${request.method} ${request.url}`,
      JSON.stringify(exception),
    );

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: typeof exception === 'object' ? exception : undefined,
    };
  }

  private extractMessage(message: unknown): string {
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      return message
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join(', ');
    }

    return 'Request failed';
  }

  private reply(
    response: Response,
    request: Request,
    statusCode: number,
    message: string,
    errors?: unknown,
  ) {
    return response.status(statusCode).json({
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      ...(errors !== undefined ? { errors } : {}),
    });
  }
}
