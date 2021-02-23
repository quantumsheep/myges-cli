import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { homedir } from 'os';

import * as token from './token';
import { AccessToken } from './token';

const config_path = path.resolve(homedir(), '.myges');

export interface Config {
  username: string;
  access_token: string;
  token_type: string;
  expires: number;
}

export async function prompt_credentials(): Promise<AccessToken & { username: string }> {
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
      ...await token.authenticate(username, password),
    };
  } catch (e) {
    if (e.isTtyError) {
      throw new Error(`Prompt couldn't be rendered in the current environment: ${e.message}`);
    } else {
      throw new Error(e.message);
    }
  }
}

/**
 * @param {Config} config
 */
export function save(config) {
  return fs.writeFile(config_path, JSON.stringify(config));
}

function must_be_logged() {
  console.error('You must be logged in before using that command. (myges login)');
  return process.exit(1);
}

/**
 * @returns {Promise<Config>}
 */
export async function load(exit_if_not_logged = false) : Promise<Pick<Config, 'access_token' | 'token_type'>> {
  try {
    const config = await fs.readFile(config_path, { encoding: 'utf8' });
    const parsed: Config = JSON.parse(config);

    if (exit_if_not_logged && (!parsed.username || !parsed.access_token || !parsed.token_type || !parsed.expires)) {
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

      const info = await token.authenticate(parsed.username, password);
      parsed.access_token = info.access_token;
      parsed.token_type = info.token_type;
      parsed.expires = Date.now() + (parseInt(info.expires_in, 10) * 1000);

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

export function erase() {
  return fs.writeFile(config_path, JSON.stringify({}));
}
