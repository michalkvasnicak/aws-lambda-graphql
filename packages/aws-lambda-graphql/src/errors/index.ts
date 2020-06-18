/**
 * Base Error class for all custom errors
 */
export class ExtendableError extends Error {
  constructor(message?: string) {
    super(message);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConnectionNotFoundError extends ExtendableError {}
