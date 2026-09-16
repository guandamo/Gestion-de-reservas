/**
 * Envuelve un handler async para que cualquier error rechazado caiga
 * en el middleware de errores de Express.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
