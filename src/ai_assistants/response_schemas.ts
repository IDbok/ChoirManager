import * as z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const TransactionTypeSchema = z.enum(["balance", "membership"]);

export const BalanceChangeSchema = z.object({
  equals: z.number().finite().optional(),
  greater_than: z.number().finite().optional(),
  less_than: z.number().finite().optional(),
})
  // equal does not combine with greater/less
  .refine(o => o.equals === undefined || (o.greater_than === undefined && o.less_than === undefined), {
    message: "balance_change.equal does not combine with greater/less",
  });

const IsoDateTimeAsDate = z.string().datetime().transform((s, ctx) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date-time" });
    return z.NEVER;
  }
  return d;
});

export const TransactionFetchOptionsSchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  from_date: IsoDateTimeAsDate.optional(),
  to_date: IsoDateTimeAsDate.optional(),
  type: TransactionTypeSchema.optional(),
  balance_change: BalanceChangeSchema.optional(),
})
  // from_date <= to_date
  .refine(o =>
    !o.from_date || !o.to_date || new Date(o.from_date) <= new Date(o.to_date),
    { message: "from_date must be less than or equal to to_date", path: ["to_date"] }
  );

export const ResponseSchema = z.discriminatedUnion("what", [
  z.object({ what: z.literal("message"), text: z.string().min(1) }),
  z.object({ what: z.literal("download_scores"), filename: z.string().min(1) }),
  z.object({ what: z.literal("scores_list") }),
  z.object({ what: z.literal("get_deposit_info") }),
  z.object({ what: z.literal("already_paid") }),
  z.object({
    what: z.literal("top_up"),
    amount: z.number().positive(),
    original_message: z.string().min(1),
  }),
  z.object({
    what: z.literal("feedback"),
    details: z.string().min(1).optional(),
  }),
  z.object({
    what: z.literal("get_transactions"),
    filters: TransactionFetchOptionsSchema.optional(),
  }),
]);

export type Response = z.infer<typeof ResponseSchema>;
export type TransactionsFetchOptions = z.infer<typeof TransactionFetchOptionsSchema>;

/** Safely parse a response */
export function safeParseResponse(raw: unknown) {
  try {
    const json = typeof raw === "string" ? JSON.parse(raw) : raw;
    const parsed = ResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true as const, value: parsed.data as Response }
      : { ok: false as const, error: parsed.error.format() };
  } catch (e) {
    return { ok: false as const, error: "JSON parse error" };
  }
}

/** Get the JSON schema for a response  */
export function getResponseJsonSchema() {
  return zodToJsonSchema(ResponseSchema, "Response");
}
