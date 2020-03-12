const fs = require('fs').promises
const path = require('path')
const inquirer = require('inquirer')

const root = path.dirname(require.main.filename)
const homedir = require('os').homedir()

const config_path = path.resolve(homedir, '.myges')

const token = require('./token')

/**
 * @typedef Config
 * @property {string} username 
 * @property {string} access_token 
 * @property {string} token_type 
 * @property {number} expires 
 */

/**
 * @returns {Promise<import('./token').AccessToken & { username: string }>} 
 */
async function prompt_credentials() {
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
    ])

    return {
      username,
      ...await token.authenticate(username, password),
    }
  } catch (e) {
    if (e.isTtyError) {
      throw new Error(`Prompt couldn't be rendered in the current environment: ${e.message}`)
    } else {
      throw new Error(e.message)
    }
  }
}

/** @type {Config} */
const model = {
  access_token: null,
  token_type: null,
}

/**
 * @param {Config} config 
 */
function save(config) {
  return fs.writeFile(config_path, JSON.stringify(config))
}

function must_be_logged() {
  console.error('You must be logged in before using that command. (myges login)')
  return process.exit(1)
}

/**
 * @returns {Promise<Config>} 
 */
async function load(exit_if_not_logged = false) {
  try {
    const config = await fs.readFile(config_path)
    /** @type {Config} */
    const parsed = JSON.parse(config)

    if (exit_if_not_logged && (!parsed.username || !parsed.access_token || !parsed.token_type || !parsed.expires)) {
      return must_be_logged()
    }

    if (parsed.expires && Date.now() >= parsed.expires) {
      const { password } = await inquirer.prompt([
        {
          message: 'Session expired - Enter your password: ',
          name: 'password',
          type: 'password',
        },
      ])

      const { access_token, token_type } = await token.authenticate(parsed.username, password)
      parsed.access_token = access_token
      parsed.token_type = token_type

      save(parsed)
    }

    return Object.keys(model).reduce((o, k) => {
      o[k] = parsed[k] || model[k]
      return o
    }, {})
  } catch (_) {
    if (exit_if_not_logged) {
      return must_be_logged()
    }

    return model
  }
}

function erase() {
  return fs.writeFile(config_path, JSON.stringify({}))
}

module.exports = {
  prompt_credentials,
  save,
  laod,
  erase,
}
