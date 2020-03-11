const axios = require('axios').default

/**
 * @param {string} method 
 * @param {string} url 
 * @param {import('./config').Config} config 
 * @param {{ [key: string]: any }} request_config 
 */
async function request(method, url, config, request_config = {}) {
  const { headers, ...others } = request_config

  const { data } = await axios.request({
    url: `https://services.reseau-ges.fr${url}`,
    method,
    headers: {
      ...headers,
      'Authorization': `${config.token_type} ${config.access_token}`,
    },
    ...others,
  })

  return data.result
}

/**
 * @param {Config} config 
 */
function get_years(config) {
  return request('GET', '/me/years', config)
}

module.exports = {
  request,
  get_years,
}
