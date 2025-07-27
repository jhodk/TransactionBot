import { Transaction } from "./transaction";

export interface Account {
  name: string;
  id: string;
  type: "credit" | "debit";
  last_transaction_date: string;
  latest_transactions: Transaction[];
  truelayer_token_index: number;
}