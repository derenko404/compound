/**
 * A failure the caller should see: a bad input (400), something missing (404), or not allowed (403).
 * Services throw it, and the HTTP layer turns it into `{ error }` with the status.
 */
export class AppError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const fail = (status: number, message: string): never => {
  throw new AppError(status, message)
}
