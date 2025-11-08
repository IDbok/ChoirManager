// ResponseJSONSchema.safe.ts — версия ТОЛЬКО для OpenAI structured outputs
export const ResponseJSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    what: {
      type: "string",
      enum: [
        "message",
        "download_scores",
        "scores_list",
        "get_deposit_info",
        "already_paid",
        "top_up",
        "feedback",
        "get_transactions"
      ]
    },

    // message
    text: { type: "string" },

    // download_scores
    filename: { type: "string" },

    // top_up
    amount: { type: "number" },
    original_message: { type: "string" },

    // feedback
    details: { type: "string" },

    // get_transactions
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 500 },
        order: { type: "string", enum: ["asc", "desc"] },
        from_date: { type: "string", format: "date-time" },
        to_date:   { type: "string", format: "date-time" },

        // ВАЖНО: только массив, без "строка или массив"
        type: {
          type: "array",
          items: { type: "string", enum: ["deposit","payment","refund","adjustment"] }, // подставь свои
          minItems: 1
        },

        balance_change: {
          type: "object",
          additionalProperties: false,
          properties: {
            equal:   { type: "number" },
            greater: { type: "number" },
            less:    { type: "number" }
          }
        }
      }
    }
  },

  // Корневые требования — только то, что не ломает union-логику
  required: ["what"]
} as const;
