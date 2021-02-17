import NhostAuth from "./Auth";
import NhostStorage from "./Storage";
import UserSession from "./UserSession";
import * as types from "./types";

export default class NhostClient {
  private baseURL: string;
  private useCookies: boolean;
  private refreshIntervalTime: number | null;
  private clientStorage: types.ClientStorage;
  private clientStorageType: string;
  private ssr: boolean;
  private autoLogin: boolean;
  private session: UserSession

  auth: NhostAuth;
  storage: NhostStorage;

  constructor(config: types.UserConfig) {
    if (!config.baseURL)
      throw "Please specify a baseURL. More information at https://docs.nhost.io/libraries/nhost-js-sdk#setup.";

    this.baseURL = config.baseURL;
    this.ssr = config.ssr ?? typeof window === "undefined";
    this.session = new UserSession(); 
    this.refreshIntervalTime = config.refreshIntervalTime || null; // 10 minutes (600 seconds)

    this.clientStorage = this.ssr
      ? {}
      : config.clientStorage || window.localStorage;

    this.clientStorageType = config.clientStorageType
      ? config.clientStorageType
      : "web";

    this.useCookies = config.useCookies ?? false;
    this.autoLogin = config.autoLogin ?? true;

    const authConfig = {
      baseURL: this.baseURL,
      useCookies: this.useCookies,
      refreshIntervalTime: this.refreshIntervalTime,
      clientStorage: this.clientStorage,
      clientStorageType: this.clientStorageType,
      ssr: this.ssr,
      autoLogin: this.autoLogin,
    };
    // this.auth = new NhostAuth(authConfig, this.JWTMemory);
    this.auth = new NhostAuth(authConfig, this.session);

    const storageConfig = {
      baseURL: this.baseURL,
      useCookies: this.useCookies,
    };

    this.storage = new NhostStorage(storageConfig, this.session);
  }
}
