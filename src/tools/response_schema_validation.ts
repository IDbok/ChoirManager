import { Response, safeParseResponse } from "@src/ai_assistants/response_schemas"

const correct_response = `{"what":"get_transactions", "filters": { 
        "limit":1, 
        "order":"desc", 
        "from_date":"2024-01-01T00:00:00Z", "to_date":"2024-12-31T23:59:59Z", 
        "type":["balance","membership"], 
        "balance_change": { "greater": 5.0, "less":20.0}
    }}`;
// const incorrect_response = `{"what":"get_transactions", "filters": { 
//         "limit": "1", 
//         "order":"desc", 
//         "from_date":"2024-01-01T00:00:00Z", "to_date":"2024-12-31T23:59:59Z",  
//         "type":["change","membership"], 
//         "balance_change": { "equal": 5.0, "greater": 5.0, "less":20.0}
//     }}`;

async function main() {
    const raw_response = correct_response;
    const validation = safeParseResponse(raw_response);
    if (validation.ok) {
        const response: Response = validation.value;
        console.log("Parsed response:", response);
    } else {
        console.error("Failed to parse response:", validation.error);
    }
}

main().catch(error => {
  console.error("Unexpected error:", error);
  process.exit(1);
});