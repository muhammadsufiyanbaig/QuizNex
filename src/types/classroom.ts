export interface Classroom {
  id: string;
  teacherId: string;
  name: string;
  description: string | null;
  subject: string | null;
  joinKey: string;
  isArchived: boolean;
  createdAt: Date;
}

export interface ClassroomWithStats extends Classroom {
  studentCount: number;
  quizCount: number;
  teacherName: string;
}

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
  quizzesAttempted: number;
  averageScore: number | null;
}
