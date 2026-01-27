import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../auth/users";

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

