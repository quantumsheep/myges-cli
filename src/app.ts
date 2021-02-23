#!/usr/bin/env node --no-warnings

import readline from 'readline';

import commander from 'commander';
import inquirer from 'inquirer';
import colors from 'colors';
import moment from 'moment';

import update_notifier from 'update-notifier';
const pkg = require('../package.json');

import * as configurator from './config';
import * as api from './ges-api';
import * as display from './display';
import { Config } from './config';

const notifier = update_notifier({
  pkg,
  shouldNotifyInNpmScript: true,
  // updateCheckInterval: 0,
});

notifier.notify({
  isGlobal: true,
});

const program = new commander.Command();
program.version(pkg.version);

program
  .command('login')
  .option('-d, --debug', 'debug mode')
  .description('sign in to an account')
  .action(async (options) => {
    try {
      const token = await configurator.prompt_credentials();

      await configurator.save({
        username: token.username,
        token_type: token.token_type,
        access_token: token.access_token,
        expires: Date.now() + (parseInt(token.expires_in, 10) * 1000),
      });

      console.log('Successfully logged in!');
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('logout')
  .option('-d, --debug', 'debug mode')
  .description('remove the saved auth informations')
  .action(async (options) => {
    try {
      await configurator.erase();

      console.log('Successfully logged out!');
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('absences [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list absences')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true);

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config),
          },
        ]);

        // eslint-disable-next-line no-param-reassign
        year = answers.year;
      }

      const absences = await api.request('GET', `/me/${year}/absences`, config);

      if (options.raw) {
        console.log(JSON.stringify(absences));
      } else if (!absences) {
        console.log('Nothing to display.');
      } else {
        display.table(absences.map((absence) => ({
          Year: absence.year,
          Date: moment(absence.date).format('DD/MM/YYYY, HH:mm'),
          'Course name': absence.course_name,
          Justified: absence.justified,
          Trimester: absence.trimester_name,
        })));
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('courses [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list courses')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true);

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config),
          },
        ]);

        // eslint-disable-next-line no-param-reassign
        year = answers.year;
      }

      const courses = await api.request('GET', `/me/${year}/courses`, config)

      if (options.raw) {
        console.log(JSON.stringify(courses));
      } else if (!courses) {
        console.log('Nothing to display.');
      } else {
        const trimesters = [...new Set(courses.map((course) => course.trimester))].sort();

        trimesters.forEach((trimester) => {
          const trimesterCourses = courses.filter((course) => course.trimester === trimester).map((course) => ({
            rc_id: course.rc_id,
            Year: course.year,
            Trimester: `${course.trimester} (${course.trimester_id})`,
            Name: course.name,
            'Student group': `${course.student_group_name} (${course.student_group_id})`,
            Teacher: `${course.teacher} (${course.teacher_id})`,
          }));

          display.table(trimesterCourses);
        });
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('grades [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list grades')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true);

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config),
          },
        ]);

        year = answers.year;
      }

      const grades = await api.request('GET', `/me/${year}/grades`, config);

      if (options.raw) {
        console.log(JSON.stringify(grades));
      } else if (!grades) {
        console.log('Nothing to display.');
      } else {
        const trimesters = [...new Set(grades.map((grade) => grade.trimester))].sort().map((trimester) => {
          const trimester_grades = grades.filter((grade) => grade.trimester === trimester);

          const cc = Math.max(...trimester_grades.map((grade) => grade.grades.length));

          const ccs = trimester_grades.map((grade) => [...Array(cc).keys()].reduce((o, i) => {
            o[`CC${i + 1}`] = grade.grades.length > i ? grade.grades[i] : null;
            return o;
          }, {}));

          const trimester_grades_formated = trimester_grades.map((grade, i) => {
            const average = (grade.average === null && grade.grades.length > 0) ? (grade.grades.reduce((a, b) => a + b, 0) / grade.grades.length) : grade.average;

            return {
              Year: grade.year,
              Trimester: `${grade.trimester_name} (${grade.trimester})`,
              Teacher: `${grade.teacher_civility} ${grade.teacher_last_name} ${grade.teacher_first_name}`,
              Course: grade.course,
              'Coef. / ECTS': grade.coef || grade.ects,
              ...ccs[i],
              Exam: grade.exam,
              Average: average !== null ? Math.floor(average * 100) / 100 : null,
            };
          });

          let count = 0;
          const averages = trimester_grades_formated.map((grade) => {
            if (grade.Average !== null) {
              const coef = parseFloat(grade['Coef. / ECTS']) || 1;

              count += coef;
              return grade.Average * coef;
            }

            return null;
          }).filter((average) => average !== null);

          const average = count > 0 ? ((averages.reduce((a, b) => a + b, 0) / count) || 0) : 0;
          trimester_grades_formated.push({
            Course: 'GLOBAL AVERAGE',
            Average: Math.floor(average * 100) / 100,
          });

          return trimester_grades_formated;
        });

        display.multiple(trimesters);
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('agenda [week]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .option('-i, --interactive', 'interactive mode')
  .description('fetch agenda')
  .action(async (week, options) => {
    try {
      const config = await configurator.load(true);

      const now = new Date();

      if (!week) {
        const middle = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 23);

        if (options.interactive) {
          /**
         * @param {Date} start
         */
          const to_range = (start) => {
            const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 23);

            const start_str = `${(`${start.getDate()}`).padStart(2, '0')}-${(`${start.getMonth() + 1}`).padStart(2, '0')}-${start.getFullYear()}`;
            const end_str = `${(`${end.getDate()}`).padStart(2, '0')}-${(`${end.getMonth() + 1}`).padStart(2, '0')}-${end.getFullYear()}`;

            return `${start_str} ${end_str}`;
          };

          const before = [...Array(9).keys()].map((i) => to_range(new Date(middle.getFullYear(), middle.getMonth(), middle.getDate() - (-(i + 1) * 7), 23))).reverse();
          const after = [...Array(9).keys()].map((i) => to_range(new Date(middle.getFullYear(), middle.getMonth(), middle.getDate() - ((i + 1) * 7), 23)));

          const middle_range = to_range(middle);

          const answers = await inquirer.prompt([
            {
              message: 'Choose a week',
              name: 'week',
              type: 'list',
              choices: [
                ...before,
                middle_range,
                ...after,
              ],
              default: middle_range,
            },
          ]);

          week = answers.week.split(' ')[0];
        } else {
          week = `${middle.getDate()}-${middle.getMonth() + 1}-${middle.getFullYear()}`;
        }
      }

      let agenda = [];
      let start = now;
      let end = now;

      let pass = +(week.split('+')[1] || 0);

      if (week.startsWith('today')) {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + pass, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + pass, 23);
      } else if (week.startsWith('tomorrow')) {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + pass, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + pass, 23);
      } else if (week.startsWith('yesterday')) {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 - pass, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 - pass, 23);
      } else {
        if (week.startsWith('week')) {
          pass *= 7;
          week = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
        }

        const [date, month = now.getMonth() + 1, year = now.getFullYear()] = week.split(/[\-\+]/g).map((v) => parseInt(v, 10));

        const selected = new Date(year, month - 1, date + pass, 23);

        start = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - selected.getDay(), 23);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 23);
      }

      if (start.toDateString() === end.toDateString()) {
        console.log(`Loading agenda for ${start.toDateString()}...`);
      } else {
        console.log(`Loading agenda from ${start.toDateString()} to ${end.toDateString()}...`);
      }

      agenda = await api.request('GET', `/me/agenda?start=${start.getTime()}&end=${end.getTime()}`, config);

      if (options.raw) {
        console.log(JSON.stringify(agenda));
      } else {
        if (agenda.length === 0) {
          console.log('Nothing to display in this dates range.');
        }

        const days = [...new Set(agenda.map((activity) => new Date(activity.start_date).toDateString()))];

        const trimesters = days.map((day) => agenda.filter((activity) => new Date(activity.start_date).toDateString() === day).map((activity) => {
          const activity_start = moment(activity.start_date);
          const activity_end = moment(activity.end_date);

          const mesure = moment('11:30', 'HH:mm').format('LT').length;

          return {
            Day: activity_start.format('ddd, LL'),
            Schedule: `${activity_start.format('LT').padStart(mesure, '0')} -> ${activity_end.format('LT').padStart(mesure, '0')}`,
            'Room(s)': (activity.rooms || []).reduce((str, room) => `${str ? `${str} - ` : ''}${room.campus} ${room.name} (${room.floor})`, ''),
            Name: activity.name,
            Teacher: activity.teacher,
          };
        }));

        display.multiple(trimesters);
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('request <method> <url>')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .option('-t, --table', 'output data in a table')
  .option('-b, --body <value>', 'add a body (must be a JSON)', '{}')
  .description('make a request to the API')
  .action(async (method, url, options) => {
    try {
      const config = await configurator.load(true);

      const result = await api.request(method, url, config, {
        data: options.body,
        headers: {
          'Content-type': 'application/json; charset=utf-8',
        },
      });

      if (options.raw) {
        console.log(JSON.stringify(result));
      } else if (options.table) {
        display.table(result);
      } else {
        console.log(result);
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('projects [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list projects')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true);

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config),
          },
        ]);

        year = answers.year;
      }

      const projects = await api.request('GET', `/me/${year}/projects`, config);

      if (options.raw) {
        console.log(JSON.stringify(projects));
      } else if (!projects) {
        console.log('Nothing to display.');
      } else {
        const { uid } = await api.request('GET', '/me/profile', config);

        display.table(projects.map((project) => {
          const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

          const group_infos: Partial<{
            Test: number,
            Group: string,
          }> = {};

          if (group) {
            if (project.project_id == 5301) {
              group_infos.Test = 5;
            }

            group_infos.Group = `${group.group_name} (${group.project_group_id})`;

            if (group.date_presentation > 0) {
              const date = new Date(group.date_presentation);

              group_infos['Presentation Date'] = `${date.toDateString()} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            }
          }

          return {
            ID: project.project_id,
            Name: project.name,
            ...group_infos,
          };
        }));
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('project [id] [action] [value]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .option('-y, --year', 'pre-select a year')
  .description("show a project's informations - possible actions: show, groups, join, quit")
  .action(async (id, action, value, options) => {
    try {
      const config = await configurator.load(true);

      let project = null;

      if (!id) {
        if (!options.year) {
          const answers = await inquirer.prompt([
            {
              message: 'Choose a year',
              name: 'year',
              type: 'list',
              choices: await api.get_years(config),
            },
          ]);

          options.year = answers.year;
        }

        const projects = await api.request('GET', `/me/${options.year}/projects`, config);

        const answers = await inquirer.prompt([
          {
            message: 'Choose a project',
            name: 'project',
            type: 'list',
            choices: projects.map((project) => ({
              name: project.name,
              value: project.project_id,
            })),
          },
        ]);

        id = answers.project;
        project = projects.find((project) => project.project_id === id);
      } else {
        project = await api.request('GET', `/me/projects/${id}`, config);
      }

      if (!project) {
        return console.error(`Project ${id} not found.`);
      }

      const { uid } = await api.request('GET', '/me/profile', config);

      if (!action || action === 'show') {
        if (options.raw) {
          console.log(JSON.stringify(project));
        } else {
          const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

          let group_infos = {};

          if (group) {
            group_infos = {
              Group: `${group.group_name} (${group.project_group_id})`,
            };

            if (group.date_presentation > 0) {
              const date = new Date(group.date_presentation);

              group_infos['Presentation Date'] = `${date.toDateString()} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            }
          }

          display.table([
            {
              Name: colors.cyan('ID'),
              Value: project.project_id,
            },
            {
              Name: colors.cyan('Name'),
              Value: project.name,
            },
            ...Object.keys(group_infos).map((key) => ({
              Name: colors.cyan(key),
              Value: group_infos[key],
            })),
          ], false);
        }
      } else if (action === 'join') {
        let group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

        if (group) {
          return console.error(`You already are in a group for this project (${group.group_name}).`);
        }

        if (!value) {
          const answers = await inquirer.prompt([
            {
              message: 'Select the group to join',
              name: 'group',
              type: 'list',
              choices: project.groups.map((group) => {
                const students = (group.project_group_students || []).map((student) => `${student.firstname} ${student.name}`);

                return {
                  name: group.group_name + (students.length > 0 ? `(${students.join(', ')})` : ''),
                  value: group.project_group_id,
                };
              }),
            },
          ]);

          value = answers.group;
        }

        value = parseInt(value);
        if (isNaN(value)) {
          return console.error('Incorrect group number.');
        }

        const groups = project.groups.sort((a, b) => a.project_group_id - b.project_group_id);

        if (value > groups.length) {
          group = groups.find((group) => group.project_group_id == value);
        } else {
          group = groups[value - 1];
        }

        if (!group) {
          return console.error('Choosen group not found.');
        }

        try {
          const res = await api.request('POST', `/me/courses/${project.rc_id}/projects/${project.project_id}/groups/${group.project_group_id}`, config);

          console.log('Successfully joined the group!');
        } catch (e) {
          if (options.debug) {
            console.error(e);
          } else {
            console.error("Failed to join the project's group.");
          }
        }
      } else if (action === 'quit') {
        const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

        if (!group) {
          return console.error('You are not actually in a group.');
        }

        const { confirm } = await inquirer.prompt([
          {
            message: `Do you really want to quit ${group.group_name}?`,
            name: 'confirm',
            type: 'confirm',
            default: false,
          },
        ]);

        if (confirm) {
          try {
            const res = await api.request('DELETE', `/me/courses/${project.rc_id}/projects/${project.project_id}/groups/${group.project_group_id}`, config);

            console.log('Successfully quitted the group!');
          } catch (e) {
            if (options.debug) {
              console.error(e.response.data);
            } else {
              console.error("Failed to quit the project's group.");
            }
          }
        }
      } else if (action === 'groups') {
        display.table(project.groups.map((group) => ({
          id: group.project_group_id,
          name: group.group_name,
          ...(group.project_group_students || []).map((student) => `${student.firstname} ${student.name}`).reduce((acc, v, i) => {
            acc[`Student ${i + 1}`] = v;
            return acc;
          }, {}),
        })));
      } else if (action === 'chat') {
        const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.once('SIGINT', () => {
          process.exit(0);
        });

        const messages = await api.request('GET', `/me/projectGroups/${group.project_group_id}/messages`, config);

        function display_message(message) {
          const date = new Date(message.date);
          const date_str = `${date.getDate().toString().padStart(2, '0')}/${date.getMonth().toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

          let prefix = '';

          if (message.uid === uid) {
            prefix = colors.grey(`[${date_str}] You`);
          } else {
            prefix = colors.cyan(`[${date_str}] ${message.firstname} ${message.name}`);
          }

          console.log(`${prefix}${colors.grey(':')} ${message.message}`);
        }

        messages.forEach(display_message);

        let timer = null;

        async function update_messages() {
          if (timer) {
            clearTimeout(timer);
          }

          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);

          const data = await api.request('GET', `/me/projectGroups/${group.project_group_id}/messages`, config);
          const new_messages = data.slice(messages.length);

          for (const message of new_messages) {
            display_message(message);
            messages.push(message);
          }

          timer = setTimeout(update_messages, 20000);
          rl.prompt();
        }

        rl.on('line', async (message) => {
          try {
            const messages = await api.request('POST', `/me/projectGroups/${group.project_group_id}/messages`, config, {
              data: {
                projectGroupId: group.project_group_id,
                message,
              },
            });

            await update_messages();
          } catch (e) {
            if (options.debug) {
              console.error(e);
            } else {
              console.error(e.message);
            }

            rl.prompt();
          }
        });

        await update_messages();
      }
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  });

program
  .command('contribute')
  .description('show useful links')
  .action(() => {
    display.table([
      {
        Name: colors.cyan('Réseau GES (GHG Network)'),
        Value: 'http://www.reseau-ges.fr',
      },
      {
        Name: colors.cyan('GitHub repository'),
        Value: 'https://github.com/quantumsheep/myges-cli',
      },
      {
        Name: colors.cyan('Issues'),
        Value: 'https://github.com/quantumsheep/myges-cli/issues',
      },
    ], false);
  });

program.action(async () => program.help());

if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}
