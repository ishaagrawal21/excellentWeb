import bcrypt from "bcryptjs";

export type UserRole = "admin" | "user";

export interface UserRecord {
  id: string;
  username: string;
  // hashed password
  passwordHash: string;
  role: UserRole;
}

// Password for all users below is "password".
const plainPassword = "password";
const passwordHash = bcrypt.hashSync(plainPassword, 8);

export const users: UserRecord[] = [
  {
    id: "admin1",
    username: "admin",
    passwordHash,
    role: "admin",
  },
  {
    id: "user1",
    username: "alice",
    passwordHash,
    role: "user",
  },
  {
    id: "user2",
    username: "bob",
    passwordHash,
    role: "user",
  },
];

export function findUserByUsername(username: string): UserRecord | undefined {
  return users.find((u) => u.username === username);
}

