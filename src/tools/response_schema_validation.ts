import { getResponseJsonSchema} from "@src/ai_assistants/response_schemas"


async function main() {
    
        console.log("Response JSON Schema:");
        console.log(JSON.stringify(schemaToTypes(JSON.stringify(getResponseJsonSchema().definitions))));
    // const raw_response = correct_response;
    // const validation = safeParseResponse(raw_response);
    // if (validation.ok) {
    //     const response: Response = validation.value;
    //     console.log("Parsed response:", response);
    // } else {
    //     console.error("Failed to parse response:", validation.error);
    // }
}

main().catch(error => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

type JSONSchema = any;

export function schemaToTypes(schemaText: string, rootTypeName = "Response"): string {
  const root = JSON.parse(schemaText) as JSONSchema;

  // 1) Найдём «корневую» схему для типа Response
  const schema = root[rootTypeName] ?? root;

  // 2) Главная функция
  function toTs(s: JSONSchema, indent = 0): string {
    if (!s) return "any";
    if (s.$ref) return toTs(resolveRef(s.$ref), indent);
    if (s.anyOf) return s.anyOf.map((x: JSONSchema) => toTs(x, indent)).join(" | ");

    if (s.type === "object" || s.properties || s.required) {
      const props = s.properties ?? {};
      const req: string[] = Array.isArray(s.required) ? s.required : [];
      const lines: string[] = [];

      for (const key of Object.keys(props)) {
        const prop = props[key];
        const optional = req.includes(key) ? "" : "?";
        lines.push(`${pad(indent + 2)}${escapeKey(key)}${optional}: ${toTs(prop, indent + 2)};`);
      }

      // additionalProperties: false → ничего не добавляем
      // если true или объект — можно расширить при желании

      return `{\n${lines.join("\n")}\n${pad(indent)}}`;
    }

    // Примитивы, литералы, enum
    if (s.const !== undefined) return literal(s.const);
    if (s.enum) return s.enum.map(literal).join(" | ");

    switch (s.type) {
      case "string":
        if (s.format === "date-time") return "Date";
        return "string";
      case "number":
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "null":
        return "null";
      case "array":
        return `${toTs(s.items ?? {}, indent)}[]`;
      default:
        return "any";
    }
  }

  function resolveRef(ref: string): JSONSchema {
    if (!ref.startsWith("#/")) throw new Error("Only local $ref supported");
    const parts = ref.slice(2).split("/").map(unescapeJsonPointer);
    let cur: any = root;
    for (const p of parts) cur = cur?.[p];
    return cur;
  }

  function literal(v: any): string {
    return typeof v === "string" ? JSON.stringify(v) :
           typeof v === "number" ? String(v) :
           typeof v === "boolean" ? String(v) : "any";
  }

  function pad(n: number) { return " ".repeat(n); }
  function unescapeJsonPointer(s: string) { return s.replace(/~1/g, "/").replace(/~0/g, "~"); }
  function needsQuoting(k: string) { return !/^[$A-Z_][0-9A-Z_$]*$/i.test(k); }
  function escapeKey(k: string) { return needsQuoting(k) ? JSON.stringify(k) : k; }

  // Если у «Response» лежит anyOf — сделаем type alias
  const body = toTs(schema, 0);
  return body.startsWith("{") || body.includes("|")
    ? `type ${rootTypeName} = ${body};`
    : `type ${rootTypeName} = ${body};`;
}
