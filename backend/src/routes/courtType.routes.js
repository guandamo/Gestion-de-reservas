import { Router } from "express";
import * as ct from "../controllers/courtType.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(ct.listCourtTypes));

router.post("/", authorize("ADMIN"), asyncHandler(ct.createCourtType));
router.patch("/:id", authorize("ADMIN"), asyncHandler(ct.updateCourtType));

export default router;
