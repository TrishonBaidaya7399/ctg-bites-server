import { Router } from "express";
import * as authController from "@/controllers/auth.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { authLimiter, otpLimiter } from "@/middleware/rateLimiter";

const router = Router();

router.post("/register", authLimiter, authController.register);
router.post("/verify-otp", otpLimiter, authController.verifyOtp);
router.post("/resend-otp", otpLimiter, authController.resendOtp);
router.post("/login", authLimiter, authController.login);
router.post("/google", authLimiter, authController.google);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.get("/socket-token", requireAuth, authController.socketToken);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);

export default router;
