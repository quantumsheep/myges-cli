const fs = require('fs').promises
const path = require('path')
const inquirer = require('inquirer')

const root = path.dirname(require.main.filename)
const config_path = path.resolve(root, '..', 'config.json')

const token = require('./token')

/**
 * @typedef Config
 * @property {string} access_token 
 * @property {string} token_type 
 */

/**
 * @returns {Promise<import('./token').AccessToken>} 
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

    return await token.authenticate(username, password)
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

function must_be_logged() {
  console.error('You must be logged before using that command. (myges login)')
  return process.exit(1)
}

/**
 * @returns {Promise<Config>} 
 */
async function load(exit_if_not_logged = false) {
  try {
    const config = await fs.readFile(config_path)
    const parsed = JSON.parse(config)

    if (exit_if_not_logged && (!parsed.access_token || !parsed.token_type)) {
      return must_be_logged()
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

/**
 * @param {Config} config 
 */
function save(config) {
  return fs.writeFile(config_path, JSON.stringify(config))
}

module.exports = {
  prompt_credentials,
  load,
  save,
}
