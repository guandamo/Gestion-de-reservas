import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendTestEmail,
  setForceEmailFailureHandler,
  peekOtpHandler,
  clearOtpHandler,
} from "../controllers/devEmail.controller.js";

const router = Router();

router.post("/email-test", asyncHandler(sendTestEmail));
router.post("/force-email-failure", asyncHandler(setForceEmailFailureHandler));
router.get("/peek-otp", asyncHandler(peekOtpHandler));
router.delete("/peek-otp", asyncHandler(clearOtpHandler));

export default router;