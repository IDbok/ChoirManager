import { TransactionsFetchOptions } from "@src/ai_assistants/response_schemas";

export type Transaction = {
    date: Date,
    tgid: string,
    type: "balance" | "membership",
    before: number,
    after: number,
    membership_month?: Date,
};

export interface ITransactionsStorage {
    fetch_transactions(user_tg_id: string, 
        opts: TransactionsFetchOptions): Promise<Transaction[]>;
    add_transaction(e: Transaction): Promise<void>;
}