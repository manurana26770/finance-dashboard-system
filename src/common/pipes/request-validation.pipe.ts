import {
  BadRequestException,
  Injectable,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

@Injectable()
export class RequestValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const errors = validationErrors.flatMap((error) =>
          this.buildValidationErrors(error),
        );

        return new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      },
    });
  }

  private buildValidationErrors(
    error: ValidationError,
    parentPath = '',
  ): Array<{ field: string; message: string }> {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const fieldLabel = currentPath || 'request';

    const currentErrors = Object.values(error.constraints || {}).map(
      (message) => ({
        field: fieldLabel,
        message,
      }),
    );

    const childErrors = (error.children || []).flatMap(
      (child: ValidationError) =>
        this.buildValidationErrors(child, currentPath),
    );

    return [...currentErrors, ...childErrors];
  }
}
