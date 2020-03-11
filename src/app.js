#!/usr/bin/env node --no-warnings

const commander = require('commander')
const inquirer = require('inquirer')

const configurator = require('./config')
const api = require('./ges-api')

const program = new commander.Command()
program.version('1.0.0')

program
  .command('login')
  .option('-d, --debug', 'debug mode')
  .description('sign in to an account')
  .action(async () => {
    try {
      const config = await configurator.load()

      const { token_type, access_token } = await configurator.prompt_credentials()

      config.token_type = token_type
      config.access_token = access_token

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

program.action(async () => program.help())

program.parse(process.argv)
