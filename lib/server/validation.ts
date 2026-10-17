import "server-only";
import { z } from "zod";

const answerField = z.string().trim().min(1).max(64);

export const entrySchema = z.object({
  stage1: answerField,
  stage2: answerField,
  stage3: answerField,
  name: z.string().trim().max(40).optional().default(""),
  contact: z.string().trim().min(1).max(120),
  website: z.string().max(200).optional().default(""),
});

export const answerSchema = z.object({ answer: answerField });

export function readTextField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
