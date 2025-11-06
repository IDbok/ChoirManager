import path from "node:path";
import fs from "node:fs";
import { GoogleAuth } from "@src/api/google_auth.js";
import { FirestoreTransactionsStorage } from "@src/adapters/transactions_storage/google_firestore_transactions.js";
import type { Transaction } from "@src/interfaces/transactions_storage.js";
import { Status } from "@src/status.js";
// import { promises as fs } from "node:fs";
import { TransactionStorageConfig } from "@src/adapters/transactions_storage/factory";

type TransactionSeed = Omit<Transaction, "date" | "membership_month"> & {
    date: string;
    membership_month?: string;
};

async function loadSeedTransactions(seedPath: string): Promise<Transaction[]> {
    const raw = fs.readFileSync(seedPath, "utf8");
    const data = JSON.parse(raw) as TransactionSeed[];
    if (!Array.isArray(data)) {
        throw new Error("Seed file must contain an array");
    }
    return data.map((r, idx) => {
        const date = new Date(r.date);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`Invalid date at index ${idx}: ${r.date}`);
        }
        const membership_month = r.membership_month
            ? new Date(r.membership_month)
            : undefined;
        if (r.membership_month && Number.isNaN(membership_month!.getTime())) {
            throw new Error(`Invalid membership_month at index ${idx}: ${r.membership_month}`);
        }
        const tx: Transaction = {
            date,
            tgid: r.tgid,
            type: r.type,
            before: r.before,
            after: r.after
        };
        if (membership_month) {
            tx.membership_month = membership_month;
        }
        return tx;
    });
}

function loadTransactionStorageConfig(configPath: string): TransactionStorageConfig {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const cfg = parsed?.transaction_storage;

  if (!isTransactionStorageConfig(cfg)) {
    throw new Error("config.transaction_storage отсутствует или неверно сконфигурирован");
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

async function main(): Promise<Status> {
    console.log("Starting Firestore seed tool...");
    const cfgfile = path.join(process.cwd(), "config", "botcfg_local.json");
    const txCfg = loadTransactionStorageConfig(cfgfile);

    // Авторизация по ключу GCP (как в updater'ах)
    const google_cloud_key_file = "./config/google_cloud_key.json";
    const auth = await GoogleAuth.authenticate(google_cloud_key_file);
    if (!auth.ok()) return auth;

    const isDryRun = false;
    const storage = isDryRun ? null : new FirestoreTransactionsStorage(txCfg);
    
    if (isDryRun) {
        console.log("DRY RUN MODE: No transactions will be added to database");
    }

    const seedPath = process.argv[2]
        ? path.resolve(process.argv[2])
        : path.join(process.cwd(), "src", "tools", "transactions.seed.json");
    const seed = await loadSeedTransactions(seedPath);

    for (const t of seed) {
        await storage?.add_transaction(t);
        console.log(`Inserting transaction: date=${t.date.toISOString()}, tgid=${t.tgid}, type=${t.type}, before=${t.before}, after=${t.after}`);
    }

    console.log(`Seed inserted: ${seed.length} transactions`);
    return Status.ok();
}

main().catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
});