import { Router } from "express";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import menuRoutes from "./menu.routes";
import recipesRoutes from "./recipes.routes";
import configRoutes from "./config.routes";
import ordersRoutes from "./orders.routes";
import couponsRoutes from "./coupons.routes";
import reportsRoutes from "./reports.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/menu", menuRoutes);
router.use("/recipes", recipesRoutes);
router.use("/config", configRoutes);
router.use("/orders", ordersRoutes);
router.use("/coupons", couponsRoutes);
router.use("/reports", reportsRoutes);

export default router;
