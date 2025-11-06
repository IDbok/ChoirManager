import { Transaction, TransactionsFetchOptions } from "@src/interfaces/transactions_storage.js";
import { ITransactionsStorage } from "@src/interfaces/transactions_storage.js";
import { GoogleAuth } from "@src/api/google_auth.js";
import {  Firestore,  CollectionReference, } from "@google-cloud/firestore";
import { TransactionStorageConfig } from "./factory.js";


export class FirestoreTransactionsStorage implements ITransactionsStorage {
    private db: Firestore;
    private readonly collection: CollectionReference;

    constructor(private config: TransactionStorageConfig) {
        this.db = GoogleAuth.get_firestore(this.config.database_id);
        this.collection = this.db.collection(this.config.collection_name) as CollectionReference;
    }

    public async add_transaction(e: Transaction) {
        if (this.config.read_only){ // todo: implement read-only mode / log
            return;
        }
        e.tgid = e.tgid.trim().toLowerCase();
        await this.collection.add(e);
    }

    public async fetch_transactions( 
    tgid: string,
    opts: TransactionsFetchOptions = {}
    ): Promise<Transaction[]> {
        const order = opts.order ?? "desc";

        let query = this.collection.where("tgid", "==", tgid.trim().toLowerCase())
            .orderBy("date", order);

        if (opts.from_date) {
            query = query.where("date", ">=", opts.from_date);
        }

        if (opts.to_date) {
            query = query.where("date", "<=", opts.to_date);
        }

        if (opts.limit) {
            query = query.limit(opts.limit);
        }

        if (opts.type) {
            query = query.where("type", "==", opts.type);
        }

        const response = await query.get();
        const result: Transaction[] = [];        
        
        response.forEach((doc) => {

            if (opts.balance_change) {
                const changed_amount = doc.data().after - doc.data().before;
                if (opts.balance_change.equals !== undefined 
                    && changed_amount !== opts.balance_change.equals) {
                    return;
                }
                if (opts.balance_change.greater_than !== undefined 
                    && changed_amount <= opts.balance_change.greater_than) {
                    return;
                }
                if (opts.balance_change.less_than !== undefined 
                    && changed_amount >= opts.balance_change.less_than) {
                    return;
                }
            }

            result.push({
                date: new Date(doc.data().date._seconds * 1000),
                tgid: doc.data().tgid,
                type: doc.data().type,
                before: doc.data().before,
                after: doc.data().after,
                membership_month: doc.data().membership_month 
                    ? new Date(doc.data().membership_month._seconds * 1000) 
                    : undefined
            });
        });

        return result;
    }
}

