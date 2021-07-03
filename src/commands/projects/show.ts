import colors from 'colors';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../../commands-base';
import * as configurator from '../../config';
import * as display from '../../display';
import * as api from '../../ges-api';

export function register(program: Command) {
  program
    .command('show [id]')
    .option('-r, --raw', 'output the raw data')
    .option('-y, --year <year>', 'pre-select a year')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw: boolean;
  year?: string;
}

async function action(id: string, options: CommandOptions) {
  const config = await configurator.load(true);
  const project = await getProject(id, options);

  if (options.raw) {
    console.log(JSON.stringify(project));
  } else {
    const { uid } = await api.request('GET', '/me/profile', config);

    const group = project.groups.find(
      (group) =>
        !!(group.project_group_students || []).find(
          (student) => student.u_id === uid,
        ),
    );

    let group_infos = {};

    if (group) {
      group_infos = {
        Group: `${group.group_name} (${group.project_group_id})`,
      };

      if (group.date_presentation > 0) {
        const date = new Date(group.date_presentation);

        group_infos['Presentation Date'] = `${date.toDateString()} at ${date
          .getHours()
          .toString()
          .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    display.table(
      [
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
      ],
      false,
    );
  }
}

export interface ProjectGroupStudent {
  name: string;
  firstname: string;
  promotion: string;
  option: string;
  classe: string;
  u_id: number;
}

export interface ProjectGroup {
  group_name: string;
  date_presentation?: number;
  project_group_id: number;
  project_id: number;
  subject_id: number;
  subject_validated: boolean;
  teacher_comment?: string;
  teacher_intern_comment?: string;
  project_group_students: ProjectGroupStudent[];
}

export interface ProjectFile {
  psf_id: number;
  psf_desc: string;
  psf_begin_upload: number;
  psf_end_upload: number;
  psf_file: string;
  psf_role_user: string;
  psf_file_size: number;
  psf_file_hash: string;
  psf_file_type: string;
  psp_id: number;
  pgr_id: number;
  u_id: number;
  psf_name: string;
}

export interface ProjectStep {
  psp_id: number;
  psp_type: string;
  psp_desc: string;
  psp_limit_date: number;
  pro_id: number;
  psp_number: number;
  files: ProjectFile[];
}

export interface ProjectFile {
  pf_id: number;
  pf_title: string;
  pf_file: string;
  pf_crea_date: number;
  pro_id: number;
}

export interface ProjectGroupLog {
  pgl_id: number;
  pgl_author: string;
  pgl_role_user: string;
  pgl_describe: string;
  pgl_date: number;
  pgl_type_action: string;
  user_id: number;
  pgr_id: number;
}

export interface Project {
  project_id: number;
  teacher_id: number;
  author: string;
  name: string;
  update_date: number;
  update_user: string;
  course_name: string;
  discipline_id: number;
  groups: ProjectGroup[];
  steps: ProjectStep[];
  project_files: ProjectFile[];
  project_group_logs: ProjectGroupLog[];
  is_draft: boolean;
  project_type_id: number;
  project_computing_tools: string;
  project_create_date: number;
  project_detail_plan: string;
  project_hearing_presentation: string;
  project_max_student_group: number;
  project_min_student_group: number;
  project_personal_work: number;
  project_presentation_duration: number;
  project_ref_books: string;
  project_teaching_goals: string;
  project_type_group: string;
  project_type_presentation: string;
  project_type_presentation_details: string;
  project_type_subject: string;
  rc_id: number;
  trimester_id: number;
  year: number;
}

export async function getProject(id?: string, options?: { year?: string }) {
  const config = await configurator.load(true);

  let project: Project = null;

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

    const projects = await api.request(
      'GET',
      `/me/${options.year}/projects`,
      config,
    );

    if (!projects) {
      throw new Error(`No projects found for year ${options.year}.`);
    }

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
    project = await api.request<Project>('GET', `/me/projects/${id}`, config);
  }

  if (!project) {
    throw new Error(`Project ${id} not found.`);
  }

  return project;
}
