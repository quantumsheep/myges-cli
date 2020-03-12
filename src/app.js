#!/usr/bin/env node --no-warnings

const commander = require('commander')
const inquirer = require('inquirer')

const configurator = require('./config')
const api = require('./ges-api')

const program = new commander.Command()
program.version('1.1.1')

program
  .command('login')
  .option('-d, --debug', 'debug mode')
  .description('sign in to an account')
  .action(async () => {
    try {
      /** @type {Config} */
      const config = await configurator.load() || {}

      const token = await configurator.prompt_credentials()

      config.username = token.username
      config.token_type = token.token_type
      config.access_token = token.access_token
      config.expires = Date.now() + (parseInt(token.expires_in, 10) * 1000)

      await configurator.save(config)
      console.log('Successfully logged in!')
    } catch (e) {
      if (options.debug) {
        console.error(e)
      } else {
        console.error(e.message)
      }
    }
  })

program
  .command('absences [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list absences')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true)

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config)
          }
        ])

        year = answers.year
      }

      const absences = await api.request('GET', `/me/${year}/absences`, config)

      if (options.raw) {
        console.log(JSON.stringify(absences))
      } else {
        console.table(absences.map(absence => ({
          'Year': absence.year,
          'Date': new Date(absence.date).toLocaleString(),
          'Course name': absence.course_name,
          'Justified': absence.justified,
          'Trimester': absence.trimester_name,
        })))
      }
    } catch (e) {
      if (options.debug) {
        console.error(e)
      } else {
        console.error(e.message)
      }
    }
  })

program
  .command('courses [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list courses')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true)

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config)
          }
        ])

        year = answers.year
      }

      const courses = await api.request('GET', `/me/${year}/courses`, config)

      if (options.raw) {
        console.log(JSON.stringify(courses))
      } else {
        const trimesters = [...new Set(courses.map(course => course.trimester))].sort()

        trimesters.forEach(trimester => {
          console.table(courses.filter(course => course.trimester === trimester).map(course => ({
            'rc_id': course.rc_id,
            'Year': course.year,
            'Trimester': `${course.trimester} (${course.trimester_id})`,
            'Name': course.name,
            'Student group': `${course.student_group_name} (${course.student_group_id})`,
            'Teacher': `${course.teacher} (${course.teacher_id})`,
          })))
        })
      }
    } catch (e) {
      if (options.debug) {
        console.error(e)
      } else {
        console.error(e.message)
      }
    }
  })


program
  .command('grades [year]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .description('list grades')
  .action(async (year, options) => {
    try {
      const config = await configurator.load(true)

      if (!year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config)
          }
        ])

        year = answers.year
      }

      const grades = await api.request('GET', `/me/${year}/grades`, config)

      if (options.raw) {
        console.log(JSON.stringify(grades))
      } else {
        const trimesters = [...new Set(grades.map(grade => grade.trimester))].sort()

        trimesters.forEach(trimester => {
          const trimester_grades = grades.filter(grade => grade.trimester === trimester)

          const cc = Math.max(...trimester_grades.map(grade => grade.grades.length))

          const ccs = trimester_grades.map(grade => [...Array(cc).keys()].reduce((o, i) => {
            o[`CC${i + 1}`] = grade.grades.length > i ? grade.grades[i] : null
            return o
          }, {}))

          const trimester_grades_formated = trimester_grades.map((grade, i) => {
            const average = (grade.average === null && grade.grades.length > 0) ? (grade.grades.reduce((a, b) => a + b, 0) / grade.grades.length) : grade.average

            return {
              "rc_id": grade.rc_id,
              "Year": grade.year,
              "Trimester": `${grade.trimester_name} (${grade.trimester})`,
              "Teacher": `${grade.teacher_civility} ${grade.teacher_last_name} ${grade.teacher_first_name}`,
              "Course": grade.course,
              "Coef. / ECTS": grade.coef || grade.ects,
              ...ccs[i],
              "Exam": grade.exam,
              "Average": average !== null ? Math.floor(average * 100) / 100 : null,
            }
          })

          let count = 0
          const averages = trimester_grades_formated.map(grade => {
            if (grade['Average'] !== null) {
              const coef = parseFloat(grade['Coef. / ECTS']) || 1

              count += coef
              return grade['Average'] * coef
            }

            return null
          }).filter(average => average !== null)

          const average = count > 0 ? ((averages.reduce((a, b) => a + b, 0) / count) || 0) : 0
          trimester_grades_formated.push({
            'Course': 'GLOBAL AVERAGE',
            'Average': Math.floor(average * 100) / 100,
          })

          console.table(trimester_grades_formated)
        })
      }
    } catch (e) {
      if (options.debug) {
        console.error(e)
      } else {
        console.error(e.message)
      }
    }
  })

program
  .command('agenda [week]')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .option('-i, --interactive', 'interactive mode')
  .description('list courses')
  .action(async (week, options) => {
    try {
      const config = await configurator.load(true)

      if (!week) {
        const now = new Date()
        const middle = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 23)

        if (options.interactive) {
          /**
         * @param {Date} start 
         */
          const to_range = start => {
            const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 23)

            const start_str = `${('' + start.getDate()).padStart(2, '0')}-${('' + (start.getMonth() + 1)).padStart(2, '0')}-${start.getFullYear()}`
            const end_str = `${('' + end.getDate()).padStart(2, '0')}-${('' + (end.getMonth() + 1)).padStart(2, '0')}-${end.getFullYear()}`

            return `${start_str} ${end_str}`
          }

          const before = [...Array(9).keys()].map(i => to_range(new Date(middle.getFullYear(), middle.getMonth(), middle.getDate() - (-(i + 1) * 7), 23))).reverse()
          const after = [...Array(9).keys()].map(i => to_range(new Date(middle.getFullYear(), middle.getMonth(), middle.getDate() - ((i + 1) * 7), 23)))

          const middle_range = to_range(middle)

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
            }
          ])

          week = answers.week.split(' ')[0]
        } else {
          week = `${middle.getDate()}-${middle.getMonth() + 1}-${middle.getFullYear()}`
        }
      }

      const [date, month, year] = week.split('-').map(v => parseInt(v, 10))

      const selected = new Date(year, month - 1, date, 23)

      const start = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - selected.getDay(), 23)
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 23)

      console.log(`Loading agenda from ${start.toDateString()} to ${end.toDateString()}...`)

      const agenda = await api.request('GET', `/me/agenda?start=${start.getTime()}&end=${end.getTime()}`, config)

      if (options.raw) {
        console.log(JSON.stringify(agenda))
      } else {
        if (agenda.length === 0) {
          console.log('Nothing to display in this dates range.')
        }

        const days = [...new Set(agenda.map(activity => new Date(activity.start_date).toDateString()))]

        days.forEach(day => {
          const activities = agenda.filter(activity => new Date(activity.start_date).toDateString() === day).map(activity => {
            const activity_start = new Date(activity.start_date)
            const activity_end = new Date(activity.end_date)

            return {
              'Day': activity_start.toDateString(),
              'Start': activity_start.toTimeString(),
              'End': activity_end.toTimeString(),
              'Rooms': (activity.rooms || []).reduce((str, room) => {
                return `${str ? `${str} - ` : ''}${room.campus} ${room.name} (${room.floor})`
              }, ''),
              'Name': activity.name,
              'Teacher': activity.teacher,
            }
          })

          console.table(activities)
        })
      }
    } catch (e) {
      if (options.debug) {
        console.error(e)
      } else {
        console.error(e.message)
      }
    }
  })

program
  .command('request <method> <url>')
  .option('-d, --debug', 'debug mode')
  .option('-r, --raw', 'output the raw data')
  .option('-t, --table', 'output data in a table')
  .option('-b, --body <value>', 'add a body (must be a JSON)', '{}')
  .description('make a request to the API url')
  .action(async (method, url, options) => {
    try {
      const config = await configurator.load(true)

      const result = await api.request(method, url, config, {
        body: options.body,
        headers: {
          'Content-type': 'application/json; charset=utf-8',
        },
      })

      if (options.raw) {
        console.log(JSON.stringify(result))
      } else if (options.table) {
        console.table(result)
      } else {
        console.log(result)
      }
    } catch (e) {
      if (options.debug) {
        console.error(e)
      } else {
        console.error(e.message)
      }
    }
  })

program.action(async () => program.help())

if (process.argv.length < 3) {
  program.help()
} else {
  program.parse(process.argv)
}
