const axios = require('axios').default

/**
 * @typedef AccessToken 
 * @property {string} access_token 
 * @property {string} token_type 
 * @property {string} expires_in 
 * @property {string} scope 
 * @property {string} uid 
 */

/**
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<AccessToken | null>} 
 */
exports.authenticate = async (username, password) => {
  try {
    const credentials = Buffer.from(`${username}:${password}`, 'utf8').toString('base64')

    /**
     * This will activate comreseaugesskolae:// protocol, thus throwing an exception
     */
    const res = await axios.get('https://authentication.reseau-ges.fr/oauth/authorize?response_type=token&client_id=skolae-app', {
      headers: {
        'Authorization': `Basic ${credentials}`
      },
    })

    return null
  } catch (e) {
    if (!e.request._options || !e.request._options.hash) {
      throw new Error('Bad password')
    }

    /** @type {string} */
    const hash = e.request._options.hash
    const res = hash.slice(1).split('&').map(v => v.split('=')).reduce((o, v) => {
      o[v[0]] = v[1]
      return o
    }, {})

    return res
  }
}
