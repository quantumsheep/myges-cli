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
