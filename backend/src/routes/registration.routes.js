import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  iniciarRegistro,
  verificarCodigo,
  reenviarCodigo,
  obtenerEstado,
} from "../controllers/registration.controller.js";

const router = Router();

// Sustituye al antiguo POST /auth/register: ahora devuelve requiresVerification
// y NO crea el usuario definitivo. El usuario se crea al verificar el OTP.
router.post("/register", asyncHandler(iniciarRegistro));

// Verificación del código OTP.
router.post("/verify-otp", asyncHandler(verificarCodigo));

// Reenvío del código (90 s de cooldown, 5 reenvíos máximo).
router.post("/resend-otp", asyncHandler(reenviarCodigo));

// Estado actual de una solicitud (consulta sin efectos).
router.get("/registration/:token/status", asyncHandler(obtenerEstado));

export default router;