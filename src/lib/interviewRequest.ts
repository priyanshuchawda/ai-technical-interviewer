import { z } from "zod";

export const missionSchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1).max(200),
  passed: z.boolean().optional(),
  skipped: z.boolean().optional(),
  attempts: z.number().int().nonnegative().optional(),
});

export const candidateSchema = z.object({
  member: z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    jobRole: z.string().min(1).max(200),
    yearsExperience: z.number().nonnegative().max(80),
    education: z.string().max(300),
    status: z.string().max(100),
  }),
  missions: z.array(missionSchema).min(1).max(50),
  signals: z.object({
    commitDays: z.number().nonnegative(),
    missionsCompleted: z.number().nonnegative(),
    missionsFirstTry: z.number().nonnegative(),
  }),
});

export const interviewRequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  candidate: candidateSchema.optional(),
  message: z.string().max(8000).optional(),
  codingSubmission: z.object({
    taskId: z.string().min(1).max(100),
    code: z.string().max(24000),
  }).optional(),
}).strict();

export type InterviewRequest = z.infer<typeof interviewRequestSchema>;
