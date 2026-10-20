import "server-only";
import { z } from "zod";

const answerField = z.string().trim().min(1).max(64);

export const entrySchema = z.object({
  stage1: answerField,
  stage2: answerField,
  stage3: answerField,
  name: z.string().trim().min(1).max(40).transform((value) => value.replace(/\s+/gu, " ")),
  email: z.string().trim().email().max(120).transform((value) => value.toLowerCase()),
  website: z.string().max(200).optional().default(""),
});

export const answerSchema = z.object({ answer: answerField });

export function readTextField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
