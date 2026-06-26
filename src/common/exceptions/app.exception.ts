import { HttpStatus } from '@nestjs/common';

export class AppException extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;

  constructor(statusCode: number, errorCode: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string, identifier?: string) {
    const msg = identifier
      ? `${resource} with identifier '${identifier}' was not found`
      : `${resource} was not found`;
    super(HttpStatus.NOT_FOUND, `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`, msg);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'You do not have permission to perform this action') {
    super(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication is required') {
    super(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
  }
}

export class ConflictException extends AppException {
  constructor(resource: string, field: string, value: string) {
    super(
      HttpStatus.CONFLICT,
      `${resource.toUpperCase()}_CONFLICT`,
      `${resource} with ${field} '${value}' already exists`,
    );
  }
}

export class ValidationException extends AppException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', message, details);
  }
}

export class BadRequestException extends AppException {
  constructor(message: string, errorCode = 'BAD_REQUEST') {
    super(HttpStatus.BAD_REQUEST, errorCode, message);
  }
}

export class InternalServerException extends AppException {
  constructor(message = 'An unexpected error occurred') {
    super(HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', message);
  }
}
