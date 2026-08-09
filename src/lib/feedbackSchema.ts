import { z } from "zod";

export const interviewFeedbackSchema = z.object({
  summary: z.string().min(10).max(2000),
  strengths: z.array(z.string().min(3).max(400)).min(1).max(8),
  gaps: z.array(z.string().min(3).max(400)).min(1).max(8),
  next: z.array(z.string().min(3).max(400)).min(1).max(8),
});
