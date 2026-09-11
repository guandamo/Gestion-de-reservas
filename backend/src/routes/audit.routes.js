import { Router } from "express";
import * as audit from "../controllers/audit.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", asyncHandler(audit.listAudit));

export default router;
