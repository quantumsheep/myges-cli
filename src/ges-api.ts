import type { AgendaItem } from "./interfaces/agenda.interface.js";
import type {
  Absence,
  Course,
  Grade,
  Profile,
  ProjectGroupMessage,
  Step,
} from "./interfaces/api.interface.js";
import type { Project } from "./interfaces/project.interface.js";

export interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: string;
  scope: string;
  uid: string;
}

export interface GesAuthenticationToken {
  token_type: string | null;
  access_token: string | null;
}

export interface RequestOptions {
  /** Request body. Strings are sent as-is, other values are sent as JSON. */
  data?: unknown;
  headers?: Record<string, string>;
}

/** Thrown when the API answers with a non-2xx status (same message as axios). */
export class HttpError extends Error {
  constructor(public response: { status: number; data: unknown }) {
    super(`Request failed with status code ${response.status}`);
    this.name = "HttpError";
  }
}

/**
 * fetch only says "fetch failed" on network errors: add the reason
 * (DNS, refused connection, TLS...) from its cause to the message.
 */
function withCause(e: unknown) {
  if (!(e instanceof Error) || !(e.cause instanceof Error)) {
    return e;
  }

  return new Error(`${e.message}: ${e.cause.message}`, { cause: e });
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class GesAPI {
  constructor(private credentials: GesAuthenticationToken) {}

  static async login(username: string, password: string) {
    const token = await GesAPI.generateAccessToken(username, password);

    if (!token) {
      throw new Error("Bad credentials");
    }

    return new GesAPI(token);
  }

  static async generateAccessToken(
    username: string,
    password: string,
  ): Promise<AccessToken | null> {
    const credentials = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

    let response: Response;

    try {
      /**
       * The server answers with a redirect to the comreseaugesskolae://
       * protocol. It is not followed: the token is read from its Location.
       */
      response = await fetch(
        "https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app",
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${credentials}`,
          },
          redirect: "manual",
        },
      );
    } catch {
      throw new Error("Bad password");
    }

    if (response.ok) {
      return null;
    }

    const location = response.headers.get("location");

    if (!location) {
      throw new Error("Bad password");
    }

    const hash = location.slice(location.indexOf("#") + 1);
    const properties = hash
      .split("&")
      .map((property) => property.split("="))
      .reduce<Record<string, string>>((acc, [name, value]) => ({ ...acc, [name]: value }), {});

    return {
      access_token: properties.access_token,
      token_type: properties.token_type,
      expires_in: properties.expires_in,
      scope: properties.scope,
      uid: properties.uid,
    };
  }

  getYears() {
    return this.get<number[]>("/me/years");
  }

  getProfile() {
    return this.get<Profile>("/me/profile");
  }

  getAgenda(start: Date, end: Date) {
    return this.get<AgendaItem[]>(`/me/agenda?start=${start.valueOf()}&end=${end.valueOf()}`);
  }

  getAbsences(year: string) {
    return this.get<Absence[] | null>(`/me/${year}/absences`);
  }

  getGrades(year: string) {
    return this.get<Grade[] | null>(`/me/${year}/grades`);
  }

  getCourses(year: string) {
    return this.get<Course[] | null>(`/me/${year}/courses`);
  }

  getProjects(year: string) {
    return this.get<Project[] | null>(`/me/${year}/projects`);
  }

  getProject(id: string) {
    return this.get<Project>(`/me/projects/${id}`);
  }

  joinProjectGroup(projectRcId: number, projectId: number, projectGroupId: number) {
    return this.post(`/me/courses/${projectRcId}/projects/${projectId}/groups/${projectGroupId}`);
  }

  quitProjectGroup(projectRcId: number, projectId: number, projectGroupId: number) {
    return this.delete(`/me/courses/${projectRcId}/projects/${projectId}/groups/${projectGroupId}`);
  }

  getProjectGroupMessages(projectGroupId: number) {
    return this.get<ProjectGroupMessage[]>(`/me/projectGroups/${projectGroupId}/messages`);
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
    return this.get<Step[]>("/me/nextProjectSteps");
  }

  async request<T = unknown>(
    method: string,
    url: string,
    { data, headers: extraHeaders }: RequestOptions = {},
  ): Promise<T> {
    const headers = new Headers({
      Accept: "application/json, text/plain, */*",
      ...extraHeaders,
      Authorization: `${String(this.credentials.token_type)} ${String(this.credentials.access_token)}`,
    });

    let body: string | undefined;
    // fetch refuses a body on GET and HEAD requests
    const canHaveBody = !["GET", "HEAD"].includes(method.toUpperCase());

    if (data !== undefined && canHaveBody) {
      if (typeof data === "string") {
        body = data;
      } else {
        body = JSON.stringify(data);
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
      }
    }

    let response: Response;

    try {
      response = await fetch(`https://api.kordis.fr${url}`, {
        method: method.toUpperCase(),
        headers,
        body,
      });
    } catch (e) {
      throw withCause(e);
    }

    const responseData = await readBody(response);

    if (!response.ok) {
      throw new HttpError({ status: response.status, data: responseData });
    }

    return (responseData as { result: T }).result;
  }

  private get<T = unknown>(url: string) {
    return this.request<T>("GET", url);
  }

  private post<T = unknown>(url: string, request_config: RequestOptions = {}) {
    return this.request<T>("POST", url, request_config);
  }

  private put<T = unknown>(url: string, request_config: RequestOptions = {}) {
    return this.request<T>("PUT", url, request_config);
  }

  private delete<T = unknown>(url: string) {
    return this.request<T>("DELETE", url);
  }
}
