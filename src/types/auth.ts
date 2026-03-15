export type Role = "STUDENT" | "TEACHER" | "ORGANIZATION";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}
