import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(auth.login));

export default router;
