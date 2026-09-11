/**
 * Error personalizado con código HTTP. Lanza desde servicios/controllers
 * y el middleware errorHandler los traduce a la respuesta JSON.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
