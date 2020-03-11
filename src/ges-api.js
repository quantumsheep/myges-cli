const axios = require('axios').default

/**
 * @param {string} method 
 * @param {string} url 
 * @param {import('./config').Config} config 
 * @param {{ [key: string]: any }} request_config 
 */
async function request(method, url, config, request_config = {}) {
  const { headers, ...others } = request_config

  const { data } = await axios.request({
    url: `https://services.reseau-ges.fr${url}`,
    method,
    headers: {
      ...headers,
      'Authorization': `${config.token_type} ${config.access_token}`,
    },
    ...others,
  })

  return data.result
}

/**
 * @param {Config} config 
 */
function get_years(config) {
  return request('GET', '/me/years', config)
}

module.exports = {
  request,
  get_years,
}


/**
 * -- Routes --
 *
 * AbsenceService
 * GET      /me/{year}/absences
 *
 * AgendaService
 * GET      /me/agenda?start=0&end=0
 *
 * DisciplinesService
 * GET      /me/{rcId}/files
 * GET      /me/{year}/courses
 * GET      /me/{rcId}/files/{ocId}
 * GET      /me/{rcId}/syllabus
 *
 * GradeService
 * GET      /me/{year}/grades
 *
 * MincrosoftGraphService
 * GET      /mailFolders/inbox/messages
 *
 * POST     /token
 *
 * NewsService
 * GET      /me/news
 * GET      /me/news/banners
 *
 * NotificationService
 * GET      /me/notificationsDelays
 *
 * POST     /me/notificationsDelays
 *
 * ProfileService
 * GET      /me
 * GET      /documents/internalrules
 * GET      /me/minimumVersion
 * GET      /me/profile
 * GET      /me/{year}/classes
 * GET      /me/{year}/students
 * GET      /me/classes/{puid}/students/{year}
 * GET      /me/{year}/teachers
 * GET      /me/trimesterYears
 * GET      /me/years
 *
 * POST     /me/profile
 *
 * ProjectService
 * GET      /me/projectGroups/{projectGroupId}/messages
 * GET      /me/nextProjectSteps
 * GET      /me/courses/{rcId}/practicals
 * GET      /me/{year}/practicals
 * GET      /me/projects/{projectId}
 * GET      /me/projectFiles/{pfId}
 * GET      /me/projectStepFiles/{psfId}
 * GET      /me/courses/{rcId}/projects
 * GET      /me/{year}/projects
 *
 * POST     /me/projectGroups/{projectGroupId}/messages
 *  - private String message;
 *  - private Integer projectGroupId;
 *
 * POST     /me/courses/{rcId}/projects/{projectId}/groups/{projectGroupId}
 *
 * ScolarLifeService
 * GET      /me/annualDocuments/{id}
 * GET      /me/{year}/annualDocuments
 * GET      /me/partners
 *
 * POST     /me/suggestion
 */
