export interface AgendaRoom {
  room_id: number;
  name: string;
  floor: string;
  campus: string;
  color: string;
  latitude: string;
  longitude: string;
}

export interface AgendaDiscipline {
  coef?: any;
  ects?: any;
  name: string;
  teacher: string;
  trimester: string;
  year?: number;
  has_documents?: any;
  has_grades?: any;
  nb_students: number;
  rc_id?: number;
  school_id?: number;
  student_group_id?: number;
  student_group_name: string;
  syllabus_id?: any;
  teacher_id: number;
  trimester_id?: number;
}

export interface AgendaItem {
  reservation_id: number;
  rooms: AgendaRoom[];
  type: string;
  modality: string;
  author: number;
  create_date?: number;
  start_date: number;
  end_date: number;
  state: string;
  comment?: any;
  classes?: any;
  name: string;
  discipline: AgendaDiscipline;
  teacher: string;
  promotion: string;
  prestation_type: number;
  is_electronic_signature: boolean;
}
