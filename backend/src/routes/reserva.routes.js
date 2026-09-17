import { Router } from "express";
import * as reserva from "../controllers/reserva.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router = Router();

// Todas las rutas requieren JWT
router.use(authenticate);

// Mis reservas
router.get("/my", asyncHandler(reserva.getMyReservations));

// Listado completo (solo ADMIN)
router.get("/", authorize("ADMIN"), asyncHandler(reserva.getAllReservations));

// Detalle por ID (chequea ownership en service)
router.get("/:id", asyncHandler(reserva.getReservationById));

// Crear pre-reserva
router.post("/", asyncHandler(reserva.createReservation));

export default router;
