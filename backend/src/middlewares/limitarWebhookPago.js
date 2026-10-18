// Límite global por instancia del backend.
const VENTANA_MS = 60_000;
const MAX_SOLICITUDES = 120;

let inicioVentana = Date.now();
let solicitudes = 0;

export function limitarWebhookPago(_req, res, next) {
  const ahora = Date.now();

  if (ahora - inicioVentana >= VENTANA_MS) {
    inicioVentana = ahora;
    solicitudes = 0;
  }

  if (solicitudes >= MAX_SOLICITUDES) {
    const segundos = Math.max(
      1,
      Math.ceil((inicioVentana + VENTANA_MS - ahora) / 1000),
    );

    res.set("Retry-After", String(segundos));

    return res.status(429).json({
      error: "Demasiadas notificaciones. Reintentá más tarde.",
    });
  }

  solicitudes += 1;
  return next();
}