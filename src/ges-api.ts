import axios, { AxiosRequestConfig } from 'axios';
import { AgendaItem } from './interfaces/agenda.interface';
import { Project } from './interfaces/project.interface';

export interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: string;
  scope: string;
  uid: string;
}

export type GesAuthenticationToken = {
  token_type: string;
  access_token: string;
};

export class GesAPI {
  constructor(private credentials: GesAuthenticationToken) {}

  static async login(username: string, password: string) {
    const token = await GesAPI.generateAccessToken(username, password);

    if (!token) {
      throw new Error('Bad credentials');
    }

    return new GesAPI(token);
  }

  static async generateAccessToken(
    username: string,
    password: string,
  ): Promise<AccessToken | null> {
    try {
      const credentials = Buffer.from(
        `${username}:${password}`,
        'utf8',
      ).toString('base64');

      /**
       * This will activate comreseaugesskolae:// protocol, thus throwing an exception
       */
      await axios({
        method: 'GET',
        url: 'https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app',
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

      const hash = location.slice(location.indexOf('#') + 1);
      const properties = hash
        .split('&')
        .map((property) => property.split('='))
        .reduce<Record<string, string>>(
          (acc, [name, value]) => ({ ...acc, [name]: value }),
          {},
        );

      return {
        access_token: properties.access_token,
        token_type: properties.token_type,
        expires_in: properties.expires_in,
        scope: properties.scope,
        uid: properties.uid,
      };
    }
  }

  getYears() {
    return this.get('/me/years');
  }

  getProfile() {
    return this.get('/me/profile');
  }

  getAgenda(start: Date, end: Date) {
    return this.get<AgendaItem[]>(
      `/me/agenda?start=${start.valueOf()}&end=${end.valueOf()}`,
    );
  }

  getAbsences(year: string) {
    return this.get(`/me/${year}/absences`);
  }

  getGrades(year: string) {
    return this.get(`/me/${year}/grades`);
  }

  getCourses(year: string) {
    return this.get(`/me/${year}/courses`);
  }

  getProjects(year: string) {
    return this.get(`/me/${year}/projects`);
  }

  getProject(id: string) {
    return this.get<Project>(`/me/projects/${id}`);
  }

  joinProjectGroup(
    projectRcId: number,
    projectId: number,
    projectGroupId: number,
  ) {
    return this.post(
      `/me/courses/${projectRcId}/projects/${projectId}/groups/${projectGroupId}`,
    );
  }

  quitProjectGroup(
    projectRcId: number,
    projectId: number,
    projectGroupId: number,
  ) {
    return this.delete(
      `/me/courses/${projectRcId}/projects/${projectId}/groups/${projectGroupId}`,
    );
  }

  getProjectGroupMessages(projectGroupId: number) {
    return this.get(`/me/projectGroups/${projectGroupId}/messages`);
  }

  sendProjectGroupMessage(projectGroupId: number, message: string) {
    return this.post(`/me/projectGroups/${projectGroupId}/messages`, {
      data: {
        projectGroupId,
        message,
      },
    });
  }

  getNextProjectSteps() {
    return this.get('/me/nextProjectSteps');
  }

  async request<T = any>(
    method: AxiosRequestConfig['method'],
    url: string,
    request_config: AxiosRequestConfig = {},
  ) {
    const { headers, ...others } = request_config;

    const { data } = await axios.request<{ result: T }>({
      url: `https://api.kordis.fr${url}`,
      method,
      headers: {
        ...headers,
        Authorization: `${this.credentials.token_type} ${this.credentials.access_token}`,
      },
      ...others,
    });

    return data.result;
  }

  private get<T = any>(url: string) {
    return this.request<T>('GET', url);
  }

  private post<T = any>(url: string, request_config: AxiosRequestConfig = {}) {
    return this.request<T>('POST', url, request_config);
  }

  private put<T = any>(url: string, request_config: AxiosRequestConfig = {}) {
    return this.request<T>('PUT', url, request_config);
  }

  private delete<T = any>(url: string) {
    return this.request<T>('DELETE', url);
  }
}
