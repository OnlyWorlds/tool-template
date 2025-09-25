/**
 * Result pattern for type-safe API error handling
 */

export type ApiError =
  | { type: 'AUTHENTICATION_ERROR'; message: string }
  | { type: 'NETWORK_ERROR'; message: string; statusCode?: number }
  | { type: 'VALIDATION_ERROR'; field: string; message: string }
  | { type: 'RESOURCE_NOT_FOUND'; resourceType: string; resourceId?: string }
  | { type: 'SDK_ERROR'; message: string; originalError?: unknown }
  | { type: 'UNKNOWN_ERROR'; message: string; originalError?: unknown };

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// Helper constructors
export const ApiSuccess = <T>(data: T): ApiResult<T> => ({
  success: true,
  data
});

export const ApiError = {
  auth: (message: string): ApiResult<never> => ({
    success: false,
    error: { type: 'AUTHENTICATION_ERROR', message }
  }),

  network: (message: string, statusCode?: number): ApiResult<never> => ({
    success: false,
    error: { type: 'NETWORK_ERROR', message, statusCode }
  }),

  validation: (field: string, message: string): ApiResult<never> => ({
    success: false,
    error: { type: 'VALIDATION_ERROR', field, message }
  }),

  notFound: (resourceType: string, resourceId?: string): ApiResult<never> => ({
    success: false,
    error: { type: 'RESOURCE_NOT_FOUND', resourceType, resourceId }
  }),

  sdk: (message: string, originalError?: unknown): ApiResult<never> => ({
    success: false,
    error: { type: 'SDK_ERROR', message, originalError }
  }),

  unknown: (message: string, originalError?: unknown): ApiResult<never> => ({
    success: false,
    error: { type: 'UNKNOWN_ERROR', message, originalError }
  })
};

// Utility functions for working with ApiResults
export const isSuccess = <T>(result: ApiResult<T>): result is { success: true; data: T } =>
  result.success;

export const isError = <T>(result: ApiResult<T>): result is { success: false; error: ApiError } =>
  !result.success;

// Pattern matching helper for handling all error cases
export const matchApiResult = <T, R>(
  result: ApiResult<T>,
  handlers: {
    success: (data: T) => R;
    authError: (message: string) => R;
    networkError: (message: string, statusCode?: number) => R;
    validationError: (field: string, message: string) => R;
    notFound: (resourceType: string, resourceId?: string) => R;
    sdkError: (message: string, originalError?: unknown) => R;
    unknownError: (message: string, originalError?: unknown) => R;
  }
): R => {
  if (result.success) {
    return handlers.success(result.data);
  }

  switch (result.error.type) {
    case 'AUTHENTICATION_ERROR':
      return handlers.authError(result.error.message);
    case 'NETWORK_ERROR':
      return handlers.networkError(result.error.message, result.error.statusCode);
    case 'VALIDATION_ERROR':
      return handlers.validationError(result.error.field, result.error.message);
    case 'RESOURCE_NOT_FOUND':
      return handlers.notFound(result.error.resourceType, result.error.resourceId);
    case 'SDK_ERROR':
      return handlers.sdkError(result.error.message, result.error.originalError);
    case 'UNKNOWN_ERROR':
      return handlers.unknownError(result.error.message, result.error.originalError);
  }
};