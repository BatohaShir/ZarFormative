/**
 * Centralized error handling utility
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Нэвтрэх шаардлагатай") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Хандах эрх байхгүй") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Олдсонгүй") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Format error for API response
 */
export function formatError(error: unknown) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  return {
    message: "Тодорхойгүй алдаа гарлаа",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}

/**
 * Log error (replace with your logging service)
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  // In production, send to error tracking service (Sentry, LogRocket, etc.)
  console.error("Error:", error, "Context:", context);

  // TODO: Implement error tracking
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Safe async error handler
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  errorMessage?: string
): Promise<[null, T] | [Error, null]> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    logError(error, { errorMessage });
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}
