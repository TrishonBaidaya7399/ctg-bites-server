import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "@/utils/appError";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(result.error.issues[0]?.message ?? "Invalid request body", 400));
      return;
    }
    req.body = result.data;
    next();
  };
}
