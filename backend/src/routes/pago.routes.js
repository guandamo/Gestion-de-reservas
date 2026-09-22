import { Router } from "express";
import { createPaymentPreference } from "../controllers/pago.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/preference",
  authenticate,
  asyncHandler(createPaymentPreference),
);

export default router;