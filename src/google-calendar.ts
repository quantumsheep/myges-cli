import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { calendar_v3, google } from 'googleapis';
import readline from 'readline';
import Calendar = calendar_v3.Calendar;

export const googleRead = () => {
  fs.readFile('credentials.json', (err, data) => {
    if (err) {
      return console.log('Error loading client secret file:', err);
    }
    const googleClient = getClient(JSON.parse(data.toString()));
    listEvents(googleClient);
  });
};

export const getClient = (credentials): OAuth2Client => {
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  const TOKEN_PATH = 'token.json';

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  // Check if we have previously stored a token.
  const buffer = fs.readFileSync(TOKEN_PATH);
  if (!buffer) return getAccessToken(oAuth2Client, TOKEN_PATH, SCOPES);
  oAuth2Client.setCredentials(JSON.parse(buffer.toString()));
  return oAuth2Client;
};

export const getAccessToken = (
  oAuth2Client: OAuth2Client,
  TOKEN_PATH,
  SCOPES,
): OAuth2Client => {
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
    });
  });
  return oAuth2Client;
};

export const listEvents = (auth: OAuth2Client) => {
  const calendar: Calendar = google.calendar({ version: 'v3', auth });
  calendar.events.list(
    {
      calendarId: process.env.CALENDAR_ID,
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const events = res.data.items;
      if (events.length) {
        console.log('Upcoming 5 events:');
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
