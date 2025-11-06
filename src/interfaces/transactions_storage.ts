
export type Transaction = {
    date: Date,
    tgid: string,
    type: "balance" | "membership",
    before: number,
    after: number,
    membership_month?: Date,
};

export type TransactionsFetchOptions = {
    limit?: number;
    order?: "asc" | "desc";

    from_date?: Date;
    to_date?: Date;

    type?: "balance" | "membership";

    balance_change?:{
        equals?: number;
        greater_than?: number;
        less_than?: number;
    }
};

export interface ITransactionsStorage {
    fetch_transactions(user_tg_id: string, 
        opts: TransactionsFetchOptions): Promise<Transaction[]>;
    add_transaction(e: Transaction): Promise<void>;
}