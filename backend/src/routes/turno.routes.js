import { Router } from "express";
import * as turno from "../controllers/turno.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/availability/:idCancha", asyncHandler(turno.getDisponibilidad));

export default router;
