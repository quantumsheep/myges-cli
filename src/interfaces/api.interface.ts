export interface Profile {
  uid: number;
}

export interface Absence {
  year: number;
  date: number;
  course_name: string;
  justified: boolean;
  trimester_name: string;
}

export interface Grade {
  year: number;
  trimester: number;
  trimester_name: string;
  teacher_civility: string;
  teacher_last_name: string;
  teacher_first_name: string;
  course: string;
  coef: string | number | null;
  ects: string | number | null;
  grades: number[];
  exam: number | null;
  average: number | null;
}

export interface Course {
  rc_id: number;
  year: number;
  trimester: string;
  trimester_id: number;
  name: string;
  student_group_name: string;
  student_group_id: number;
  teacher: string;
  teacher_id: number;
}

export interface Step {
  course_name: string;
  group_id: number;
  pro_id: number;
  pro_name: string;
  psp_desc: string;
  psp_id: number;
  psp_limit_date: number;
  psp_number: number;
  psp_type: string;
  type: string;
}

export interface ProjectGroupMessage {
  uid: number;
  date: number;
  firstname: string;
  name: string;
  message: string;
}
