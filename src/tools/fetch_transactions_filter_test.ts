import path from "node:path";
import fs from "node:fs";
import { FirestoreTransactionsStorage } from "@src/adapters/transactions_storage/google_firestore_transactions.js";
import { TransactionStorageConfig } from "@src/adapters/transactions_storage/factory";
import { GoogleAuth } from "@src/api/google_auth.js";

type CliOptions = {
    tgid?: string;
    limit?: number;
    from_date?: Date;
    to_date?: Date;
    balance_equals?: number;
    balance_greater_than?: number;
    balance_less_than?: number;
};

function printUsage(): void {
  console.log(`Usage:
  node dist/src/tools/fetch_transactions_filter_test.js --tgid <id> --limit <n> --from <YYYY-MM-DD> --to <YYYY-MM-DD> --balance_equals <n> --balance_greater_than <n> --balance_less_than <n>

Env vars:
  TX_TGID, TX_LIMIT, TX_FROM, TX_TO, TX_BALANCE_EQUALS, TX_BALANCE_GREATER_THAN, TX_BALANCE_LESS_THAN

Examples:
  node dist/src/tools/fetch_transactions_filter_test.js --tgid 12345 --limit 25 --from 2024-06-01 --to 2024-12-31 --balance_equals 100 --balance_greater_than 50 --balance_less_than 200
  set TX_LIMIT=5 && set TX_FROM=2025-01-01 && set TX_TO=2025-10-31 && set TX_BALANCE_EQUALS=100 && set TX_BALANCE_GREATER_THAN=50 && set TX_BALANCE_LESS_THAN=200 && node dist/src/tools/fetch_transactions_filter_test.js
`);
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseNumber(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
}

function parseCliOptions(argv: string[]): CliOptions {
  console.log("Parsing CLI options:", argv);
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.includes("=") ? a.split("=", 2) : [a, argv[i + 1]];
      const key = k.replace(/^--/, "");
      if (v && !v.startsWith("--")) {
        map.set(key, v);
        if (!a.includes("=")) i++;
      } else {
        map.set(key, "true");
      }
    } else if (a === "-h" || a === "--help") {
      map.set("help", "true");
    }
  }

  if (map.get("help") === "true") {
    printUsage();
    process.exit(0);
  }

  const env = process.env;
  const tgid = map.get("tgid") ?? env.TX_TGID;
  const limit = parseNumber(map.get("limit") ?? env.TX_LIMIT);
  const from_date = parseDate(map.get("from") ?? env.TX_FROM);
  const to_date = parseDate(map.get("to") ?? env.TX_TO);
  const balance_equals = parseNumber(map.get("balance_equals") ?? env.TX_BALANCE_EQUALS);
  const balance_greater_than = parseNumber(map.get("balance_greater_than") ?? env.TX_BALANCE_GREATER_THAN);
  const balance_less_than = parseNumber(map.get("balance_less_than") ?? env.TX_BALANCE_LESS_THAN);

  return { tgid, limit, from_date, to_date, balance_equals, balance_greater_than, balance_less_than };
}

function loadTransactionStorageConfig(configPath: string): TransactionStorageConfig {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const cfg = parsed?.transaction_storage;

  if (!isTransactionStorageConfig(cfg)) {
    throw new Error("config.transaction_storage is not a valid TransactionStorageConfig");
  }
  return cfg;
}

function isTransactionStorageConfig(x: any): x is TransactionStorageConfig {
  return !!x
    && x.type === "google_firestore"
    && typeof x.read_only === "boolean"
    && typeof x.database_id === "string"
    && typeof x.collection_name === "string";
}

async function main(): Promise<void> {
    console.log("Transaction fetch/filter test tool");
    
    const opts = parseCliOptions(process.argv.slice(2));

    const cfgfile = path.join(process.cwd(), "config", "botcfg_local.json");
    const txCfg = loadTransactionStorageConfig(cfgfile);

    const google_cloud_key_file = "./config/google_cloud_key.json";
    const auth = await GoogleAuth.authenticate(google_cloud_key_file);
    if (!auth.ok()) {
        console.error("Authentication failed:", auth);
        return;
    }

    const storage = new FirestoreTransactionsStorage(txCfg);

    const tgid = opts.tgid ?? "some-user-tgid";
    const limit = opts.limit ?? undefined;
    const from_date = opts.from_date ?? undefined;
    const to_date = opts.to_date ?? undefined;

    console.log("Using filters:", { tgid, limit, 
        from_date: from_date?.toISOString().slice(0,10), 
        to_date: to_date?.toISOString().slice(0,10) });

    const transactions = await storage.fetch_transactions(
        tgid, {
        limit: limit,
        from_date: from_date,
        to_date: to_date
    });

    console.log(`Fetched ${transactions.length} transactions:`);

    for (const tx of transactions) {
        console.log(tx);
    }

}

main().catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
});