import { z } from "zod";

export const createClassroomSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().max(1000).optional(),
  subject: z.string().max(255).optional(),
});

export const inviteStudentsSchema = z.object({
  emails: z
    .array(z.string().email("Invalid email"))
    .min(1, "At least one email required")
    .max(50, "Maximum 50 invitations at once"),
  classroomId: z.string().uuid(),
});

export const joinClassroomSchema = z.object({
  joinKey: z
    .string()
    .min(5, "Invalid join key")
    .max(20, "Invalid join key")
    .toUpperCase(),
});

export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;
export type InviteStudentsInput = z.infer<typeof inviteStudentsSchema>;
export type JoinClassroomInput = z.infer<typeof joinClassroomSchema>;
