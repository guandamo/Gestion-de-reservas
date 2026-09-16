import { Router } from "express";
import * as report from "../controllers/report.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", asyncHandler(report.getReports));
router.get("/export", asyncHandler(report.exportReports));

export default router;
