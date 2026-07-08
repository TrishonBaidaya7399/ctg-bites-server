import { Router } from "express";
import { featureFlags } from "@/config/featureFlags";

const router = Router();

router.get("/public", (_req, res) => {
  res.json({
    cod: featureFlags.cod,
    bkash: featureFlags.bkash,
    stripe: featureFlags.stripe,
  });
});

export default router;
