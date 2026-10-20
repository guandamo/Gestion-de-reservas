import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// El endpoint /register se movió a ./registration.routes.js (verificación OTP).
router.post("/login", asyncHandler(auth.login));
router.get("/me", authenticate, asyncHandler(auth.me));
router.patch("/me", authenticate, asyncHandler(auth.updateMe));
router.patch("/me/password", authenticate, asyncHandler(auth.updateMyPassword));

export default router;