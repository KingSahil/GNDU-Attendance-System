export interface Student {
  id: string;
  name: string;
  father: string;
  class_group_no: string;
  lab_group_no: string;
}

export interface AttendanceSession {
  sessionId: string;
  date: string;
  day: string;
  timeSlot: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  secretCode: string;
  expiryTime: string;
  isExpired: boolean;
  createdAt?: any;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  markedAt: any;
  sessionId: string;
  rollNumber?: number;
}

export interface Resource {
  id: string;
  title: string;
  author?: string;
  url: string;
  type: 'notes' | 'pyqs' | 'videos' | 'books';
  year?: string;
  category?: string;
  description?: string;
  subjectCode: string;
  createdAt: any;
}

export interface Subject {
  code: string;
  name: string;
}

export const SUBJECTS: Subject[] = [
  { code: "CEL1020", name: "Engineering Mechanics" },
  { code: "MEL1021", name: "Engineering Graphics & Drafting" },
  { code: "MTL1001", name: "Mathematics I" },
  { code: "PHL1083", name: "Physics" },
  { code: "PBL1021", name: "Punjabi (Compulsory)" },
  { code: "PBL1022", name: "Basic Punjabi" },
  { code: "HSL4000", name: "Punjab History & Culture" }
];

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export const GNDU_COORDINATES: LocationCoords = {
  latitude: 31.648496,
  longitude: 74.817549
};

export const MAX_DISTANCE_METERS = 1000;