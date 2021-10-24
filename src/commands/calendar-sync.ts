import { Command } from 'commander';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../commands-base';
import * as configurator from '../config';
import * as api from '../ges-api';
import { AgendaItem } from '../interfaces/agenda.interface';
import { fr } from 'date-fns/locale';
import * as fs from 'fs';
import { google } from 'googleapis';
import * as readline from 'readline';

export function register(program: Command) {
  program
    .command('calendar-sync [days]')
    .description('sync myges calendar with Google Calendar')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  debug: boolean;
}

async function action(days: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);

    const now = new Date();

    if (!days) {
      const answers = await inquirer.prompt([
        {
          message: 'Choose a number of days',
          name: 'days',
          type: 'number',
          default: 7,
        },
      ]);

      days = answers.days;
    }

    const start = startOfDay(now);
    const end = endOfDay(addDays(start, Number.parseInt(days)));

    console.log(
      `Loading agenda from ${format(start, 'dd-MM-yyyy')} to ${format(
        end,
        'dd-MM-yyyy',
      )}...`,
    );

    let agenda = await api.request<AgendaItem[]>(
      'GET',
      `/me/agenda?start=${start.valueOf()}&end=${end.valueOf()}`,
      config,
    );

    if (agenda.length === 0) {
      console.log('Nothing to display in this dates range.');
      return;
    }

    agenda = agenda.sort((a, b) => a.start_date - b.start_date);

    for (const agendaItem of agenda) {
      const start = new Date(agendaItem.start_date);
      const end = new Date(agendaItem.end_date);
      const course = agendaItem.name;
      const teacher = agendaItem.teacher;
      const date = format(start, 'EEEE d MMMM yyyy', {
        locale: fr,
      });
      const startTime = format(start, 'kk:mm');
      const endTime = format(end, 'kk:mm');
      console.log(
        `Cours : ${course} | Intervenant : ${teacher} | Date : ${date} (${startTime} - ${endTime}) | Lieux : ${agendaItem.rooms?.map(
          (room) =>
            ` ${room.campus.toUpperCase()} ${room.name} ${room.latitude},${
              room.longitude
            }`,
        )}`,
      );
    }
    googleRead();
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}

const googleRead = () => {
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  const TOKEN_PATH = 'token.json';

  fs.readFile('credentials.json', (err, data) => {
    if (err) {
      return console.log('Error loading client secret file:', err);
    }
    authorize(JSON.parse(data.toString()), listEvents, TOKEN_PATH, SCOPES);
  });
};

const authorize = (credentials, callback, TOKEN_PATH, SCOPES) => {
  console.log('credentials', credentials);
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback, TOKEN_PATH, SCOPES);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    callback(oAuth2Client);
  });
};

const getAccessToken = (oAuth2Client, callback, TOKEN_PATH, SCOPES) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
};

const listEvents = (auth) => {
  const calendar = google.calendar({ version: 'v3', auth });
  calendar.events.list(
    {
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const events = res.data.items;
      if (events.length) {
        console.log('Upcoming 10 events:');
        events.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          console.log(`${start} - ${event.summary}`);
        });
      } else {
        console.log('No upcoming events found.');
      }
    },
  );
};
