import { Router } from "express";
import {
  createPaymentPreference,
  receivePaymentWebhook,
  getPaymentStatus,
} from "../controllers/pago.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { limitarWebhookPago } from "../middlewares/limitarWebhookPago.js";

const router = Router();

// Aviso público; el servicio verifica el pago consultando la API.
router.post(
  "/webhook",
  limitarWebhookPago,
  asyncHandler(receivePaymentWebhook),
);

// El usuario necesita JWT para iniciar un pago.
router.post(
  "/preference",
  authenticate,
  asyncHandler(createPaymentPreference),
);

// Estado real del pago, confirmado contra la API de Mercado Pago.
// Lo consume la pantalla de retorno del checkout. Requiere JWT porque el
// resultado revela datos de una reserva concreta.
router.get(
  "/estado",
  authenticate,
  asyncHandler(getPaymentStatus),
);

export default router;