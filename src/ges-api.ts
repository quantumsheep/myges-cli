import axios, { AxiosRequestConfig } from 'axios';
import { Config } from './config';

export async function request<T = any>(
  method: AxiosRequestConfig['method'],
  url: string,
  config: Pick<Config, 'access_token' | 'token_type'>,
  request_config: AxiosRequestConfig = {},
) {
  const { headers, ...others } = request_config;

  const { data } = await axios.request<{ result: T }>({
    url: `https://api.kordis.fr${url}`,
    method,
    headers: {
      ...headers,
      Authorization: `${config.token_type} ${config.access_token}`,
    },
    ...others,
  });

  return data.result;
}

export async function get_years(config) {
  return await request('GET', '/me/years', config);
}
