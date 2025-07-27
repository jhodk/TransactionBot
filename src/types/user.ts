import { Account } from "./account";

export interface User {
  name: string;
  discord_user_id: string;
  splitwise_api_token: string;
  splitwise_group_id: string;
  truelayer: {access_tokens: string[]; refresh_tokens: string[]};
  accounts: Account[];
}