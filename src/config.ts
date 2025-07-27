import { readFileSync, writeFileSync } from "fs"
import { User } from "./types/user";

interface JSONConfig {
  discord: {
    bot_token: string;
    admin_user_id: string;
    admin_dm_channel: string;
  };
  truelayer: {
    app_client_id: string;
    app_client_ip: string;
    app_client_secret: string;
  };
  users: User[];
}

class Config {
  public jsonConfig: JSONConfig;
  constructor() {
    this.jsonConfig = JSON.parse(readFileSync("./config.json", "utf-8"));
  }

  save() {
    writeFileSync('./config.json', JSON.stringify(this.jsonConfig, null, 2));
  }
}

export const config = new Config();