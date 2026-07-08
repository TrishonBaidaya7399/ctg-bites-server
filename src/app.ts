import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "@/config/env";
import routes from "@/routes";
import { errorHandler, notFound } from "@/middleware/errorHandler";

const STATIC_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001"];

export function createApp() {
  const app = express();

  const envOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
  const allowedOrigins = Array.from(new Set([...STATIC_DEV_ORIGINS, ...envOrigins]));

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
