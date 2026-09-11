import { Router } from "express";
import * as court from "../controllers/court.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Listado público (para pantalla admin autenticada). La creación/edición es ADMIN.
router.use(authenticate);

router.get("/", asyncHandler(court.listCourts));
router.get("/:id", asyncHandler(court.getCourt));

router.post("/", authorize("ADMIN"), asyncHandler(court.createCourt));
router.patch("/:id", authorize("ADMIN"), asyncHandler(court.updateCourt));

export default router;
