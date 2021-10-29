import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { calendar_v3, google } from 'googleapis';
import readline from 'readline';
import { AgendaItem } from './interfaces/agenda.interface';
import { formatRFC3339 } from 'date-fns';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { getCampusLocation } from './campus-location';
import Calendar = calendar_v3.Calendar;
import { Credentials as GoogleToken } from 'google-auth-library';

import Schema$Events = calendar_v3.Schema$Events;
import Schema$Event = calendar_v3.Schema$Event;
import { Config } from './config';

export interface GoogleCredentials {
  installed: {
    client_secret: string;
    client_id: string;
    redirect_uris: string[];
  };
}

const multiBar = new cliProgress.MultiBar({
  format:
    ' {task} |' + colors.blue('{bar}') + '| {percentage}% || {value}/{total}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
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
  config: Pick<Config, 'google_api_credentials' | 'google_api_token'>,
) {
  const googleClient = getClient(
    config.google_api_credentials,
    config.google_api_token,
  );
  retrieveEvents(googleClient, calendarId, startTime, endTime, displayEvents);
}

export function removeEvents(
  startTime: Date,
  endTime: Date,
  calendarId: string,
  config: Pick<Config, 'google_api_credentials' | 'google_api_token'>,
) {
  const googleClient = getClient(
    config.google_api_credentials,
    config.google_api_token,
  );
  retrieveEvents(googleClient, calendarId, startTime, endTime, deleteEvents);
}

export function pushToCalendar(
  events: AgendaItem[],
  calendarId: string,
  config: Pick<Config, 'google_api_credentials' | 'google_api_token'>,
) {
  const googleClient = getClient(
    config.google_api_credentials,
    config.google_api_token,
  );
  const googleEvents = events.map((event) => createEvent(event));
  addEvents(googleClient, calendarId, googleEvents);
}

function retrieveEvents(
  auth: OAuth2Client,
  calendarId: string,
  startTime: Date,
  endTime: Date,
  callback,
) {
  const calendar: Calendar = google.calendar({
    version: 'v3',
    auth,
    http2: true,
  });
  calendar.events.list(
    {
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err, res) => callback(err, res, calendar),
  );
}

function addEvents(
  auth: OAuth2Client,
  calendarId: string,
  events: Schema$Event[],
) {
  const calendar: Calendar = google.calendar({
    version: 'v3',
    auth,
    http2: true,
  });
  eventAdded = false;
  const progressBar = multiBar.create(events.length, 0, {
    task: 'Adding new events  ',
  });
  const tasks = events.map(
    (event) =>
      new Promise((resolve, reject) => {
        calendar.events.insert(
          {
            calendarId,
            requestBody: event,
          },
          { http2: true },
          (err, res) => {
            progressBar.increment();
            setTimeout(() => {
              if (err) {
                console.error(err);
                reject(err);
              } else {
                resolve(res);
              }
            }, 100);
          },
        );
      }),
  );
  Promise.all(tasks).finally(() => {
    progressBar.stop();
    eventAdded = true;
    taskComplete();
  });
}

function displayEvents(err: Error, res: { data: Schema$Events }) {
  if (err) return console.log('The API returned an error: ' + err);
  const events = res.data.items;
  if (events.length) {
    events.map((event, i) => {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      console.log(`${start}->${end} - ${event.summary}`);
    });
  } else {
    console.log('No upcoming events found.');
  }
}

function deleteEvents(
  err: Error,
  res: { data: Schema$Events },
  calendar: Calendar,
  calendarId: string,
) {
  if (err) return console.error('The API returned an error: ' + err);
  const events = res.data.items;
  if (events.length) {
    eventRemoved = false;
    const progressBar = multiBar.create(events.length, 0, {
      task: 'Removing old events',
    });
    const tasks = events.map(
      (event) =>
        new Promise((resolve, reject) => {
          calendar.events.delete(
            {
              calendarId,
              eventId: event.id,
            },
            { http2: true },
            (err, res) => {
              progressBar.increment();
              setTimeout(() => {
                if (err) {
                  console.error(err);
                  reject(err);
                } else {
                  resolve(res);
                }
              }, 100);
            },
          );
        }),
    );

    Promise.all(tasks).finally(() => {
      progressBar.stop();
      eventRemoved = true;
      taskComplete();
    });
  } else {
    console.log('No events to delete found.');
  }
}

function getEventDescription(agendaItem: AgendaItem) {
  let description = '';
  if (agendaItem.teacher && agendaItem.teacher.length > 0) {
    description += `<span>Intervenant : ${agendaItem.teacher} </span><br>`;
  }
  if (agendaItem.rooms && agendaItem.rooms.length > 0) {
    description += `<span>Salle(s) :<ul>${agendaItem.rooms
      .map((room) => `<li>${room.campus} - ${room.name}</li>`)
      .join('')}</ul></span>`;
  }
  return description;
}

function getEventColorId(agendaItem: AgendaItem) {
  if (!agendaItem.rooms || agendaItem.rooms.length == 0) {
    return '11';
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
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: formatRFC3339(new Date(agendaItem.end_date)),
      timeZone: 'Europe/Paris',
    },
  };
}

function getClient(
  credentials: GoogleCredentials,
  token: GoogleToken,
): OAuth2Client {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

export function getGoogleAccessToken(
  credentials: GoogleCredentials,
): GoogleToken {
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let googleToken: GoogleToken;
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      googleToken = token;
    });
  });
  return googleToken;
}
