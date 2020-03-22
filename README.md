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
  -h, --help                        output usage information

Commands:
  login [options]                   sign in to an account
  logout [options]                  remove the saved auth informations
  absences [options] [year]         list absences
  courses [options] [year]          list courses
  grades [options] [year]           list grades
  agenda [options] [week]           fetch agenda
  request [options] <method> <url>  make a request to the API
  contribute                        show useful links
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
