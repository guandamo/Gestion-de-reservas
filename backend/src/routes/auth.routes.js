import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(auth.login));
router.post("/register", asyncHandler(auth.register));

export default router;
