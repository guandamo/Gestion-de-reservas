import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(auth.login));
router.post("/register", asyncHandler(auth.register));
router.get("/me", authenticate, asyncHandler(auth.me));
router.patch("/me", authenticate, asyncHandler(auth.updateMe));
router.patch("/me/password", authenticate, asyncHandler(auth.updateMyPassword));

export default router;
