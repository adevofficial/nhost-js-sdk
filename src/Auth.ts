import axios, { AxiosInstance } from "axios";
import * as types from "./types";
import JWTMemory from "./JWTMemory";

export default class Auth {
  private http_client: AxiosInstance;
  private auth_changed_functions: Function[];
  private login_state: boolean | null;
  private refresh_interval: any;
  private use_cookies: boolean;
  private refresh_interval_time: number;
  private client_storage: types.ClientStorage;
  private JWTMemory: JWTMemory;

  constructor(config: types.Config, JWTMemory: JWTMemory) {
    const {
      base_url,
      use_cookies,
      refresh_interval_time,
      client_storage,
    } = config;

    this.http_client = axios.create({
      baseURL: `${base_url}/auth`,
      timeout: 10000,
      withCredentials: true,
    });

    this.use_cookies = use_cookies;
    this.refresh_interval_time = refresh_interval_time;
    this.client_storage = client_storage;
    this.login_state = null;
    this.auth_changed_functions = [];
    this.refresh_interval;
    this.JWTMemory = JWTMemory;

    this.autoLogin();
  }

  private autoLogin() {
    this.refreshToken();
  }

  private setLoginState(state: boolean, jwt_token: string = ""): void {
    // set new jwt_token
    if (jwt_token) {
      this.JWTMemory.setJWT(jwt_token);
    }

    // early exit
    if (this.login_state === state) return;

    // State has changed!

    // set new login_state
    this.login_state = state;

    if (this.login_state) {
      // start refresh token interval
      this.refresh_interval = setInterval(this.refreshToken.bind(this), 30000);
    } else {
      // stop refresh interval
      clearInterval(this.refresh_interval);
    }

    // call auth state change functions
    this.authStateChanged(this.login_state);
  }

  public async register(
    email: string,
    password: string,
    register_data?: any
  ): Promise<void> {
    try {
      await this.http_client.post("/register", {
        email,
        password,
        // user_data: register_data,
      });
    } catch (error) {
      throw error;
    }
  }

  public async login(
    email: string,
    password: string
  ): Promise<types.LoginData> {
    let res;
    try {
      res = await this.http_client.post("/login", {
        email,
        password,
        cookie: this.use_cookies,
      });
    } catch (error) {
      throw error;
    }

    if ("mfa" in res.data) {
      return res.data;
    }

    this.setLoginState(true, res.data.jwt_token);

    console.log("use cookie, save refresh token?");

    // set refresh token
    if (!this.use_cookies) {
      this.client_storage.setItem("refresh_token", res.data.refresh_token);
    }

    return {};
  }

  public async logout(all: boolean = false): Promise<void> {
    try {
      await this.http_client.post("/logout", {
        all,
        refresh_token: this.client_storage.getItem("refresh_token"),
      });
    } catch (error) {
      // throw error;
      // noop
    }

    this.JWTMemory.clearJWT();
    this.client_storage.removeItem("refresh_token");
    this.setLoginState(false);
  }

  public onAuthStateChanged(fn: Function): void {
    this.auth_changed_functions.push(fn);
  }

  public isAuthenticated(): boolean | null {
    return this.login_state;
  }

  public getJWTToken(): string {
    return this.JWTMemory.getJWT();
  }

  public getClaim(claim: string): string {
    return this.JWTMemory.getClaim(claim);
  }

  private async refreshToken(): Promise<void> {
    let res;
    try {
      res = await this.http_client.get("/token/refresh", {
        params: {
          refresh_token: this.client_storage.getItem("refresh_token"),
        },
      });
    } catch (error) {
      return this.setLoginState(false);
    }

    // set refresh token
    if (!this.use_cookies) {
      this.client_storage.setItem("refresh_token", res.data.refresh_token);
    }

    this.setLoginState(true, res.data.jwt_token);
  }

  private authStateChanged(state: boolean): void {
    for (const authChangedFunction of this.auth_changed_functions) {
      authChangedFunction(state);
    }
  }

  public async activate(ticket: string): Promise<void> {
    await this.http_client.post("/activate", {
      ticket,
    });
  }

  public async changeEmail(new_email: string): Promise<void> {
    await this.http_client.post("/change-email", {
      new_email,
    });
  }

  public async changeEmailRequest(new_email: string): Promise<void> {
    await this.http_client.post("/change-email/request", {
      new_email,
    });
  }

  public async changeEmailChange(ticket: string): Promise<void> {
    await this.http_client.post("/change-email/change", {
      ticket,
    });
  }

  public async changePassword(
    old_password: string,
    new_password: string
  ): Promise<void> {
    const jwt_token = this.JWTMemory.getJWT();

    await this.http_client.post(
      "/change-password",
      {
        old_password,
        new_password,
      },
      {
        headers: {
          Authorization: `Bearer ${jwt_token}`,
        },
      }
    );
  }

  public async changePasswordRequest(email: string): Promise<void> {
    await this.http_client.post("/change-password/request", {
      email,
    });
  }

  public async changePasswordChange(
    new_password: string,
    ticket: string
  ): Promise<void> {
    await this.http_client.post("/change-password/change", {
      new_password,
      ticket,
    });
  }

  public async MFAGenerate(): Promise<void> {
    const res = await this.http_client.post("/mfa/generate");
    return res.data;
  }

  public async MFAEnable(code: string): Promise<void> {
    await this.http_client.post("/mfa/enable", {
      code,
    });
  }

  public async MFADisable(code: string): Promise<void> {
    await this.http_client.post("/mfa/disable", {
      code,
    });
  }

  public async MFATotp(code: string, ticket: string): Promise<void> {
    const res = await this.http_client.post("/mfa/totp", {
      code,
      ticket,
    });
    this.setLoginState(true, res.data.jwt_token);
  }
}
