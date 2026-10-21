import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(auth.login));
router.post("/register", asyncHandler(auth.register));
// Read-only: ¿ya existe un usuario con este email? Usado por el frontend
// antes de abrir el modal de simulación de verificación. No expone PII.
router.get("/existe-email", asyncHandler(auth.existeEmail));
router.get("/me", authenticate, asyncHandler(auth.me));
router.patch("/me", authenticate, asyncHandler(auth.updateMe));
router.patch("/me/password", authenticate, asyncHandler(auth.updateMyPassword));

export default router;
