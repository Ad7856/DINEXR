import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]{3,60}$/);
const code = z.string().regex(/^[a-z0-9-]{2,30}$/);

export const lineSchema = z.object({
  dishId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  customizationIds: z.array(z.string().uuid()).max(20).transform((a) => [...new Set(a)]),
  instructions: z.string().trim().max(200).optional(),
});

export const quoteSchema = z.object({
  restaurantSlug: slug,
  tableCode: code,
  lines: z.array(lineSchema).min(1).max(40),
});

export const orderSchema = quoteSchema.extend({
  idempotencyKey: z.string().uuid(),
  mode: z.literal("dine_in"),
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number").optional(),
  notes: z.string().trim().max(300).optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
