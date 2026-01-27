import type { UserRole } from "../auth/users";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      username: string;
      role: UserRole;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};

