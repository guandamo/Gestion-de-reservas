import { Router } from "express";
import {
  createPaymentPreference,
  receivePaymentWebhook,
} from "../controllers/pago.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Mercado Pago se autentica mediante la firma de la notificación.
router.post(
  "/webhook",
  asyncHandler(receivePaymentWebhook),
);

// El usuario necesita JWT para iniciar un pago.
router.post(
  "/preference",
  authenticate,
  asyncHandler(createPaymentPreference),
);

export default router;