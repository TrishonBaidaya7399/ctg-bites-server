import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/appError";

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err && typeof err === "object" && "name" in err && err.name === "ValidationError") {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
}
