import { promises as fs } from "node:fs";
import inquirer from "inquirer";
import { homedir } from "node:os";
import path from "node:path";
import type { AccessToken, GesAuthenticationToken } from "@/ges-api.js";
import { GesAPI } from "@/ges-api.js";
import type { GoogleConfig, GoogleCredentials, GoogleToken } from "@/google-calendar.js";
import { getGoogleAccessToken } from "@/google-calendar.js";

const config_path = path.resolve(homedir(), ".myges");

export interface Config {
  username?: string;
  access_token?: string;
  token_type?: string;
  expires?: number;
  google_api_credentials?: GoogleCredentials;
  google_api_token?: GoogleToken;
  google_calendar_id?: string;
}

export async function prompt_credentials(): Promise<AccessToken & { username: string }> {
  const { username, password } = await inquirer.prompt<{
    username: string;
    password: string;
  }>([
    {
      message: "Username: ",
      name: "username",
    },
    {
      message: "Password: ",
      name: "password",
      type: "password",
    },
  ]);

  const token = await GesAPI.generateAccessToken(username, password);

  if (!token) {
    throw new Error("Bad credentials");
  }

  return { username, ...token };
}

export async function prompt_google_credentials(): Promise<GoogleCredentials> {
  const { client_id, client_secret } = await inquirer.prompt<{
    client_id: string;
    client_secret: string;
  }>([
    {
      message: "Enter 'client_id' content from credentials.json file downloaded from Google : ",
      name: "client_id",
    },
    {
      message: "Enter 'client_secret' content from credentials.json file downloaded from Google : ",
      name: "client_secret",
    },
  ]);

  return {
    installed: {
      client_id,
      client_secret,
    },
  };
}

export async function prompt_google_calendar_id(): Promise<string> {
  const { calendar_id } = await inquirer.prompt<{ calendar_id: string }>([
    {
      message:
        "(WARNING !) Don't put calendar where you could have other personal events on it ! In that case this tool may erase them...\nEnter your calendar ID : ",
      name: "calendar_id",
    },
  ]);

  return calendar_id;
}

export async function save(config: Config) {
  await fs.writeFile(config_path, JSON.stringify(config));
}

function must_be_logged() {
  console.error("You must be logged in before using that command. (myges login)");
  return process.exit(1);
}

export async function load(exit_if_not_logged = false): Promise<GesAuthenticationToken> {
  try {
    const config = await fs.readFile(config_path, { encoding: "utf8" });
    const parsed = JSON.parse(config) as Config;

    if (
      exit_if_not_logged &&
      (!parsed.username || !parsed.access_token || !parsed.token_type || !parsed.expires)
    ) {
      return must_be_logged();
    }

    if (parsed.expires && Date.now() >= parsed.expires) {
      const { password } = await inquirer.prompt<{ password: string }>([
        {
          message: "Session expired - Enter your password: ",
          name: "password",
          type: "password",
        },
      ]);

      const info = await GesAPI.generateAccessToken(parsed.username ?? "", password);

      if (!info) {
        throw new Error("Bad credentials");
      }

      parsed.access_token = info.access_token;
      parsed.token_type = info.token_type;
      parsed.expires = Date.now() + parseInt(info.expires_in, 10) * 1000;

      await save(parsed);
    }

    return {
      access_token: parsed.access_token ?? null,
      token_type: parsed.token_type ?? null,
    };
  } catch {
    if (exit_if_not_logged) {
      return must_be_logged();
    }

    return {
      access_token: null,
      token_type: null,
    };
  }
}

export async function loadAll(): Promise<Config> {
  try {
    const config = await fs.readFile(config_path, { encoding: "utf8" });
    const parsed = JSON.parse(config) as Config;

    return parsed;
  } catch {
    console.error("Error while retrieving config");
    return process.exit(1);
  }
}

export async function setGoogleCredentials(parsed: Config): Promise<GoogleConfig> {
  return setGoogleAccessToken(parsed, await prompt_google_credentials());
}

async function setGoogleAccessToken(
  parsed: Config,
  credentials: GoogleCredentials,
): Promise<GoogleConfig> {
  const token = await getGoogleAccessToken(credentials);
  parsed.google_api_credentials = credentials;
  parsed.google_api_token = token;
  await save(parsed);
  return { google_api_credentials: credentials, google_api_token: token };
}

export async function loadGoogleCredentials(): Promise<GoogleConfig> {
  try {
    const config = await fs.readFile(config_path, { encoding: "utf8" });
    const parsed = JSON.parse(config) as Config;
    if (!parsed.google_api_credentials) {
      return await setGoogleCredentials(parsed);
    }
    if (!parsed.google_api_token) {
      // || (parsed.google_api_token.expiry_date && Date.now() >= parsed.google_api_token.expiry_date)
      return await setGoogleAccessToken(parsed, parsed.google_api_credentials);
    }
    return {
      google_api_credentials: parsed.google_api_credentials,
      google_api_token: parsed.google_api_token,
    };
  } catch (e) {
    console.error(`Cannot retrieve google credentials : ${String(e)}`);
    process.exit(1);
  }
}

export async function setGoogleCalendarId(parsed: Config): Promise<string> {
  parsed.google_calendar_id = await prompt_google_calendar_id();
  await save(parsed);
  return parsed.google_calendar_id;
}

export async function loadGoogleCalendarId(): Promise<string | null> {
  try {
    const config = await fs.readFile(config_path, { encoding: "utf8" });
    const parsed = JSON.parse(config) as Config;

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty calendar ID must prompt again
    if (!parsed.google_calendar_id) {
      parsed.google_calendar_id = await setGoogleCalendarId(parsed);
    }
    return parsed.google_calendar_id;
  } catch {
    return null;
  }
}

export async function erase() {
  await fs.writeFile(config_path, JSON.stringify({}));
}
