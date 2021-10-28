import { GesAPI } from './ges-api';

export function authenticate(username: string, password: string) {
  return GesAPI.generateAccessToken(username, password);
}
