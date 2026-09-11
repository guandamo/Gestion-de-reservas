import { Router } from "express";
import * as user from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Todas las rutas de usuarios requieren auth y rol ADMIN
router.use(authenticate, authorize("ADMIN"));

router.get("/", asyncHandler(user.listUsers));
router.get("/:id", asyncHandler(user.getUser));
router.patch("/:id", asyncHandler(user.updateUser));
router.patch("/:id/status", asyncHandler(user.updateUserStatus));

export default router;
