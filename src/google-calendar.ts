import type { Auth } from "googleapis";
import { calendar_v3, google } from "googleapis";
import type { AgendaItem } from "./interfaces/agenda.interface.js";
import { formatRFC3339 } from "date-fns";
import cliProgress from "cli-progress";
import { styleText } from "node:util";
import { getCampusLocation } from "./campus-location.js";
import { randomBytes } from "node:crypto";
import http from "node:http";
import type { AddressInfo, Socket } from "node:net";
import Calendar = calendar_v3.Calendar;

import Schema$Events = calendar_v3.Schema$Events;
import Schema$Event = calendar_v3.Schema$Event;

type OAuth2Client = Auth.OAuth2Client;
export type GoogleToken = Auth.Credentials;

export interface GoogleCredentials {
  installed: {
    client_secret: string;
    client_id: string;
  };
}

export interface GoogleConfig {
  google_api_credentials: GoogleCredentials;
  google_api_token: GoogleToken;
}

type EventsCallback = (
  err: Error | null,
  res: { data: Schema$Events } | null | undefined,
  calendar: Calendar,
  calendarId: string,
) => void;

const multiBar = new cliProgress.MultiBar({
  format: " {task} |" + styleText("blue", "{bar}") + "| {percentage}% || {value}/{total}",
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u2591",
  hideCursor: true,
});
let eventAdded = true;
let eventRemoved = true;
const taskComplete = () => {
  if (eventAdded && eventRemoved) {
    multiBar.stop();
  }
};

export function readEvents(
  startTime: Date,
  endTime: Date,
  calendarId: string,
  config: GoogleConfig,
) {
  const googleClient = getClient(config.google_api_credentials, config.google_api_token);
  retrieveEvents(googleClient, calendarId, startTime, endTime, displayEvents);
}

export function removeEvents(
  startTime: Date,
  endTime: Date,
  calendarId: string,
  config: GoogleConfig,
) {
  const googleClient = getClient(config.google_api_credentials, config.google_api_token);
  retrieveEvents(googleClient, calendarId, startTime, endTime, deleteEvents);
}

export function pushToCalendar(events: AgendaItem[], calendarId: string, config: GoogleConfig) {
  const googleClient = getClient(config.google_api_credentials, config.google_api_token);
  const googleEvents = events.map((event) => createEvent(event));
  addEvents(googleClient, calendarId, googleEvents);
}

function retrieveEvents(
  auth: OAuth2Client,
  calendarId: string,
  startTime: Date,
  endTime: Date,
  callback: EventsCallback,
) {
  const calendar: Calendar = google.calendar({
    version: "v3",
    auth,
    http2: true,
  });
  calendar.events.list(
    {
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    },
    (err, res) => {
      callback(err, res, calendar, calendarId);
    },
  );
}

function addEvents(auth: OAuth2Client, calendarId: string, events: Schema$Event[]) {
  const calendar: Calendar = google.calendar({
    version: "v3",
    auth,
    http2: true,
  });
  eventAdded = false;
  const progressBar = multiBar.create(events.length, 0, {
    task: "Adding new events  ",
  });
  const tasks = events.map(
    (event, i) =>
      new Promise((resolve, reject) => {
        setTimeout(
          () => {
            calendar.events.insert(
              {
                calendarId,
                requestBody: event,
              },
              { http2: true },
              (err, res) => {
                progressBar.increment();
                if (err) {
                  console.error(err);
                  reject(err);
                } else {
                  resolve(res);
                }
              },
            );
          },
          500 * (i + 1),
        );
      }),
  );
  void Promise.all(tasks).finally(() => {
    // progressBar.stop();
    eventAdded = true;
    taskComplete();
  });
}

function displayEvents(err: Error | null, res: { data: Schema$Events } | null | undefined) {
  if (err) {
    console.log(`The API returned an error: ${String(err)}`);
    return;
  }
  const events = res?.data.items ?? [];
  if (events.length) {
    events.forEach((event) => {
      const start = event.start?.dateTime ?? event.start?.date;
      const end = event.end?.dateTime ?? event.end?.date;
      console.log(`${String(start)}->${String(end)} - ${String(event.summary)}`);
    });
  } else {
    console.log("No upcoming events found.");
  }
}

function deleteEvents(
  errP: Error | null,
  resP: { data: Schema$Events } | null | undefined,
  calendar: Calendar,
  calendarId: string,
) {
  if (errP) {
    console.error(`The API returned an error: ${String(errP)}`);
    return;
  }
  const events = resP?.data.items ?? [];
  if (events.length) {
    eventRemoved = false;
    const progressBar = multiBar.create(events.length, 0, {
      task: "Removing old events",
    });
    const tasks = events.map(
      (event, i) =>
        new Promise((resolve, reject) => {
          setTimeout(
            () => {
              calendar.events.delete(
                {
                  calendarId,
                  eventId: event.id ?? undefined,
                },
                { http2: true },
                (err, res) => {
                  progressBar.increment();
                  if (err) {
                    console.error(err);
                    reject(err);
                  } else {
                    resolve(res);
                  }
                },
              );
            },
            500 * (i + 1),
          );
        }),
    );

    void Promise.all(tasks).finally(() => {
      // progressBar.stop();
      eventRemoved = true;
      taskComplete();
    });
  } else {
    console.log("No events to delete found.");
  }
}

function getEventDescription(agendaItem: AgendaItem) {
  let description = "";
  if (agendaItem.teacher && agendaItem.teacher.length > 0) {
    description += `<span>Intervenant : ${agendaItem.teacher} </span><br>`;
  }
  if (agendaItem.rooms && agendaItem.rooms.length > 0) {
    description += `<span>Salle(s) :<ul>${agendaItem.rooms
      .map((room) => `<li>${room.campus} - ${room.name}</li>`)
      .join("")}</ul></span>`;
  }
  return description;
}

function getEventColorId(agendaItem: AgendaItem) {
  if (!agendaItem.rooms || agendaItem.rooms.length === 0) {
    return "11";
  }
  return getCampusLocation(agendaItem.rooms[0].campus)[1];
}

function getEventLocation(agendaItem: AgendaItem) {
  if (!agendaItem.rooms || agendaItem.rooms.length === 0) {
    return undefined;
  }
  return getCampusLocation(agendaItem.rooms[0].campus)[0];
}

function createEvent(agendaItem: AgendaItem): Schema$Event {
  return {
    summary: agendaItem.name,
    description: getEventDescription(agendaItem),
    colorId: getEventColorId(agendaItem),
    location: getEventLocation(agendaItem),
    start: {
      dateTime: formatRFC3339(new Date(agendaItem.start_date)),
      timeZone: "Europe/Paris",
    },
    end: {
      dateTime: formatRFC3339(new Date(agendaItem.end_date)),
      timeZone: "Europe/Paris",
    },
  };
}

function getClient(credentials: GoogleCredentials, token: GoogleToken): OAuth2Client {
  const { client_secret, client_id } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2({
    clientId: client_id,
    clientSecret: client_secret,
  });

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

/**
 * Starts a local HTTP server and waits for Google to redirect the user's
 * browser to it with the authorization code (loopback OAuth flow, required
 * since Google deprecated the out-of-band flow).
 */
function waitForAuthorizationCode(server: http.Server, state: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sockets = new Set<Socket>();
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });

    const timeout = setTimeout(
      () => {
        server.close();
        sockets.forEach((socket) => socket.destroy());
        reject(new Error("Google authorization timed out after 5 minutes"));
      },
      5 * 60 * 1000,
    );

    server.on("request", (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const returnedState = url.searchParams.getAll("state");

      if (returnedState.length !== 1 || returnedState[0] !== state) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Authorization failed: invalid state.");
      } else if (error) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Authorization failed: ${error}`);
        clearTimeout(timeout);
        server.close();
        reject(new Error(`Google authorization failed: ${error}`));
      } else if (code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>Authorization received!</h1><p>You can close this tab and go back to the terminal.</p>",
        );
        clearTimeout(timeout);
        server.close();
        resolve(code);
      } else {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Authorization failed.</h1><p>Go back to the terminal and try again.</p>");
      }
    });
  });
}

export async function getGoogleAccessToken(credentials: GoogleCredentials): Promise<GoogleToken> {
  const SCOPES = ["https://www.googleapis.com/auth/calendar"];
  const { client_secret, client_id } = credentials.installed;
  const state = randomBytes(32).toString("hex");

  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  const oAuth2Client = new google.auth.OAuth2({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: `http://localhost:${port}`,
  });

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
  });

  console.log(
    "Authorize this app by visiting this url (the authorization code will be retrieved automatically) :\n'" +
      authUrl +
      "'\nWaiting for authorization...",
  );

  try {
    const code = await waitForAuthorizationCode(server, state);
    const { tokens } = await oAuth2Client.getToken(code);
    return tokens;
  } catch (e) {
    server.close();
    throw new Error(`Google authorization failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
