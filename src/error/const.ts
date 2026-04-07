/**
 * Error codes used in APIs.
 */
export enum APIErrors {
  /**
   * Handles unexpected errors.
   */
  APIUnexpectedError = 101,
  /**
   * Bad input received.
   */
  APIBadInputError,
  /**
   * Resource not found.
   */
  APINotFoundError,
  /**
   * Request unauthorized.
   */
  APIUnauthorizedError,
  /**
   * Method not allowed.
   */
  APINotAllowedError,
  /**
   * Resource already exists.
   */
  APIAlreadyExistsError,
  /**
   * Unprocessable request.
   */
  APIUnprocessableError,
}

/**
 * Error codes used in Database.
 */
export enum DatabaseErrors {
  /**
   * Unexpected database error.
   */
  DatabaseUnexpectedError = 201,
}

/**
 * Error codes used in AWS Service.
 */
export enum AWSServiceErrors {
  /**
   * The file recieved from AWS S3 is empty.
   */
  S3FileEmptyError = 301,
  /**
   * Unable to delete the file from S3.
   */
  S3UnableToDeleteError,
  /**
   * Unexpected AWS error.
   */
  AWSUnexpectedError,
}

/**
 * Error codes for app.
 */
export const ErrorCodes = {
  ...APIErrors,
  ...DatabaseErrors,
  ...AWSServiceErrors,
};

/**
 * Type for error code.
 */
export type ErrorCode = APIErrors | DatabaseErrors | AWSServiceErrors;
