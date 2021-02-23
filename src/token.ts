import axios from 'axios';

export interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: string;
  scope: string;
  uid: string;
}

export async function authenticate(username: string, password: string): Promise<AccessToken | null> {
  try {
    const credentials = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

    /**
     * This will activate comreseaugesskolae:// protocol, thus throwing an exception
     */
    const res = await axios.get('https://authentication.reseau-ges.fr/oauth/authorize?response_type=token&client_id=skolae-app', {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    return null;
  } catch (e) {
    if (!e.request._options || !e.request._options.hash) {
      throw new Error('Bad password');
    }

    /** @type {string} */
    const { hash } = e.request._options;
    const res = hash.slice(1).split('&').map((v) => v.split('=')).reduce((o, v) => {
      o[v[0]] = v[1];
      return o;
    }, {});

    return res;
  }
}
