export interface ErrorDetail {
  param: string;
  message: string;
}

/** Every non-2xx response uses this one envelope, so clients (and tests) can rely on a single shape. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR',
    message: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
  }

  toBody() {
    return { error: { status: this.status, code: this.code, message: this.message, details: this.details } };
  }
}

export const validationError = (details: ErrorDetail[], message = 'One or more query parameters are invalid.') =>
  new ApiError(400, 'VALIDATION_ERROR', message, details);

export const notFound = (message: string) => new ApiError(404, 'NOT_FOUND', message);
