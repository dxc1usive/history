const { google } = require('googleapis');
const fs = require('fs');

// This script syncs events from a Google Calendar to a Google Sheet so the
// assignments page can automatically reflect calendar entries.
//
// Before running the script you must create a Google Cloud project and enable
// the Google Calendar API and Google Sheets API.  Download a service account
// key JSON file and set the path in the GOOGLE_APPLICATION_CREDENTIALS
// environment variable.
//
// Usage:
//   node syncCalendarToSheet.js
//
// The script will read upcoming events from the specified calendar and append
// new rows to the spreadsheet in the format:
//   Title | Description | Due Date | Due Time
//
// Adjust CALENDAR_ID, SPREADSHEET_ID and SHEET_NAME to match your setup.

const CALENDAR_ID = 'b265b20f1b20ebb155592898ade23a53ff62ed0aecc35e8777cd2ba64fdfa0f8@group.calendar.google.com';
const SPREADSHEET_ID = '15hOYG6EFCCQQ7Qx';
const SHEET_NAME = 'HISTORYwithMRH';

async function authorize() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  return await auth.getClient();
}

async function fetchEvents(calendar, timeMin) {
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin,
    singleEvents: true,
    orderBy: 'startTime'
  });
  return res.data.items || [];
}

async function appendRows(sheets, rows) {
  if (!rows.length) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:D`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });
}

async function main() {
  const authClient = await authorize();
  const calendar = google.calendar({ version: 'v3', auth: authClient });
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Fetch events from today forward
  const now = new Date().toISOString();
  const events = await fetchEvents(calendar, now);

  const rows = events.map(evt => {
    const start = evt.start.dateTime || evt.start.date; // all-day events
    const date = start.substring(0, 10);
    const time = evt.start.dateTime ? start.substring(11, 16) : '';
    return [evt.summary || '', evt.description || '', date, time];
  });

  await appendRows(sheets, rows);

  console.log(`Synced ${rows.length} event(s) to the spreadsheet.`);
}

main().catch(err => {
  console.error('Error syncing calendar to sheet:', err.message);
  process.exit(1);
});