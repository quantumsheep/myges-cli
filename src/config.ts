import { promises as fs } from 'fs';
import inquirer from 'inquirer';
import { homedir } from 'os';
import path from 'path';
import { GesAPI } from '.';
import { AccessToken } from './ges-api';
import { getGoogleAccessToken, GoogleCredentials } from './google-calendar';
import { Credentials as GoogleToken } from 'google-auth-library';

const config_path = path.resolve(homedir(), '.myges');

export interface Config {
  username: string;
  access_token: string;
  token_type: string;
  expires: number;
  google_api_credentials?: GoogleCredentials;
  google_api_token?: GoogleToken;
  google_calendar_id?: string;
}

export async function prompt_credentials(): Promise<
  AccessToken & { username: string }
> {
  try {
    const { username, password } = await inquirer.prompt([
      {
        message: 'Username: ',
        name: 'username',
      },
      {
        message: 'Password: ',
        name: 'password',
        type: 'password',
      },
    ]);

    return {
      username,
      ...(await GesAPI.generateAccessToken(username, password)),
    };
  } catch (e) {
    if (e.isTtyError) {
      throw new Error(
        `Prompt couldn't be rendered in the current environment: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}

export async function prompt_google_credentials(): Promise<GoogleCredentials> {
  try {
    const { client_id, client_secret } = await inquirer.prompt([
      {
        message:
          "Enter 'client_id' content from credentials.json file downloaded from Google : ",
        name: 'client_id',
      },
      {
        message:
          "Enter 'client_secret' content from credentials.json file downloaded from Google : ",
        name: 'client_secret',
      },
    ]);

    return {
      installed: {
        client_id,
        client_secret,
      },
    };
  } catch (e) {
    if (e.isTtyError) {
      throw new Error(
        `Prompt couldn't be rendered in the current environment: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}

export async function prompt_google_calendar_id(): Promise<string> {
  try {
    const { calendar_id } = await inquirer.prompt([
      {
        message:
          "(WARNING !) Don't put calendar where you could have other personal events on it ! In that case this tool may erase them...\nEnter your calendar ID : ",
        name: 'calendar_id',
      },
    ]);

    return calendar_id;
  } catch (e) {
    if (e.isTtyError) {
      throw new Error(
        `Prompt couldn't be rendered in the current environment: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}

export async function save(config: Config) {
  return await fs.writeFile(config_path, JSON.stringify(config));
}

function must_be_logged() {
  console.error(
    'You must be logged in before using that command. (myges login)',
  );
  return process.exit(1);
}

export async function load(
  exit_if_not_logged = false,
): Promise<Pick<Config, 'access_token' | 'token_type'>> {
  try {
    const config = await fs.readFile(config_path, { encoding: 'utf8' });
    const parsed: Config = JSON.parse(config);

    if (
      exit_if_not_logged &&
      (!parsed.username ||
        !parsed.access_token ||
        !parsed.token_type ||
        !parsed.expires)
    ) {
      return must_be_logged();
    }

    if (parsed.expires && Date.now() >= parsed.expires) {
      const { password } = await inquirer.prompt([
        {
          message: 'Session expired - Enter your password: ',
          name: 'password',
          type: 'password',
        },
      ]);

      const info = await GesAPI.generateAccessToken(parsed.username, password);
      parsed.access_token = info.access_token;
      parsed.token_type = info.token_type;
      parsed.expires = Date.now() + parseInt(info.expires_in, 10) * 1000;

      await save(parsed);
    }

    return {
      access_token: parsed.access_token ?? null,
      token_type: parsed.token_type ?? null,
    };
  } catch (_) {
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
    const config = await fs.readFile(config_path, { encoding: 'utf8' });
    const parsed: Config = JSON.parse(config);

    return parsed;
  } catch (_) {
    console.error('Error while retrieving config');
    return process.exit(1);
  }
}

export async function setGoogleCredentials(parsed: Config): Promise<Config> {
  parsed.google_api_credentials = await prompt_google_credentials();
  parsed.google_api_token = await getGoogleAccessToken(
    parsed.google_api_credentials,
  );
  await save(parsed);
  return parsed;
}

async function setGoogleAccessToken(parsed: Config): Promise<Config> {
  parsed.google_api_token = await getGoogleAccessToken(
    parsed.google_api_credentials,
  );
  await save(parsed);
  return parsed;
}

export async function loadGoogleCredentials(): Promise<
  Pick<Config, 'google_api_credentials' | 'google_api_token'>
> {
  try {
    const config = await fs.readFile(config_path, { encoding: 'utf8' });
    let parsed: Config = JSON.parse(config);
    if (!parsed.google_api_credentials) {
      parsed = await setGoogleCredentials(parsed);
    } else if (!parsed.google_api_token) {
      // || (parsed.google_api_token.expiry_date && Date.now() >= parsed.google_api_token.expiry_date)
      parsed = await setGoogleAccessToken(parsed);
    }
    console.log(parsed);
    return {
      google_api_credentials: parsed.google_api_credentials ?? null,
      google_api_token: parsed.google_api_token ?? null,
    };
  } catch (_) {
    return {
      google_api_credentials: null,
      google_api_token: null,
    };
  }
}

export async function setGoogleCalendarId(parsed: Config): Promise<string> {
  parsed.google_calendar_id = await prompt_google_calendar_id();
  await save(parsed);
  return parsed.google_calendar_id;
}

export async function loadGoogleCalendarId(): Promise<string> {
  try {
    const config = await fs.readFile(config_path, { encoding: 'utf8' });
    const parsed: Config = JSON.parse(config);

    if (!parsed.google_calendar_id) {
      parsed.google_calendar_id = await setGoogleCalendarId(parsed);
    }
    return parsed.google_calendar_id;
  } catch (_) {
    return null;
  }
}

export async function erase() {
  return await fs.writeFile(config_path, JSON.stringify({}));
}
