

# MyGES CLI

A Command Line Interface replacement for MyGES ([Réseau GES](http://www.reseau-ges.fr/)' Extranet).

# How to install
You need to have [npm](https://www.npmjs.com/get-npm) installed.
```bash
npm i -g myges
```

# Usage
**Authenticate with `myges login`** (only needed once).
```bash
myges help
```
```
Usage: myges [options] [command]

Options:
  -V, --version                     output the version number
  -d, --debug                       debug mode
  -h, --help                        display help for command

Commands:
  absences [options] [year]         list absences
  agenda [options] [week]           fetch agenda
  calendar-sync [days]              sync myges calendar with Google Calendar
  contribute                        show useful links
  courses [options] [year]          list courses
  grades [options] [year]           list grades
  login [options]                   sign in to an account
  logout [options]                  remove the saved auth informations
  projects                          manage projects
  request [options] <method> <url>  make a request to the API
```

## Agenda
The `agenda` command is a little special since it offers diverse options in order to ease its use.

### Listing weeks
You can list and select the week to display by using the `-i` option (alias of `--interactive`).

### Manual week selection
It's possible to manually specify the wanted week. Here's some possibilities:
- `myges agenda 19-03-2020` -> Shows the week from last Sunday to next Sunday of the date `19-03-2020`
- `myges agenda 19-03` -> Shows the week from last Sunday to next Sunday of `March 19` of the current year
- `myges agenda 19` -> Shows the week from last Sunday to next Sunday of the day `19` of the current month and year
- `myges agenda today` -> Displays today's agenda
- `myges agenda tomorrow` -> Displays tomorrow's agenda
- `myges agenda yesterday` -> Displays yesterday's agenda

A shifting can be added to the specified week:
- `myges agenda today+2` -> Shows the agenda of 2 days from today
- `myges agenda today+-2` -> Shows the agenda of 2 days ago from today

Those shifts can be applied to any manual week input using the same format (`+n`).

## Project management
Using the CLI, you can list available projects and project groups.
You can also join or quit a project group.

- `myges projects` -> List available projects
- `myges project <id>` -> Give information about the selected project (replace *`<id>`* by the actual group's id given in the projects list)
- `myges project <id> groups` -> List available groups for the specified project
- `myges project <id> join [group]` -> Join a group. You can specify the group by replacing the optional *`[group]`* argument, else it will prompt a selector
- `myges project <id> quit` -> Quit the current group you're in. A confirmation will be required before executing the request

## Calendar Sync

This command allows you to syncronize your calendar on goocle calendar (and thus no longer use the myges planning!)

You need to setup few things before using this script.

### Setup Google API

To make the script work, you need to create a google calendar API and save its information like this :

* Go to [https://developers.google.com/calendar/quickstart/php](https://developers.google.com/calendar/quickstart/php)
* Create a Google Calendar API project

|                                           |                                           |
| ----------------------------------------- | ----------------------------------------- |
| ![image](https://i.imgur.com/xZkQC03.png) | ![image](https://i.imgur.com/QVQ6vH2.png) |
| ![image](https://i.imgur.com/AmHIOfb.png) |                                           |

* Save the `credentials.json` file at the root of the project:

![image](https://i.imgur.com/XxVO6z5.png)

### Create new Google Calendar

> :warning: Be sure to create a calendar dedicated ONLY to your schedule! Otherwise the script will delete the other events present in your calendar ...

To retrieve your calendar id:

* Go to https://calendar.google.com
* Go to "Settings and sharing" of the calendar dedicated to your planning
* Go to "Settings and sharing" of the calendar dedicated to your planning
![image](https://i.imgur.com/QAZPssf.png)
* You will find the id of your diary in the section "Integrate the calendar"
![image](https://i.imgur.com/1p0Ra2q.png)
* Save this id in `.env` file at the root fo the project
![image-20211029113735571](https://i.imgur.com/FiwiajB.png)
