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
    const res = await axios({
      method: 'GET',
      url: 'https://authentication.reseau-ges.fr/oauth/authorize?response_type=token&client_id=skolae-app',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      maxRedirects: 0,
    });

    return null;
  } catch (e) {
    if (!e.request?.res?.headers?.location) {
      throw new Error('Bad password');
    }

    const { location }: Record<string, string> = e.request.res.headers;

    const hash = location.slice(location.indexOf('#'));
    const properties = hash.split('&')
      .map(property => property.split('='))
      .reduce<Record<string, string>>((acc, [name, value]) => ({ ...acc, [name]: value }), {});

    return {
      access_token: properties.access_token,
      token_type: properties.token_type,
      expires_in: properties.expires_in,
      scope: properties.scope,
      uid: properties.uid,
    };
  }
}
