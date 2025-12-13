export enum View {
  HOME = 'HOME',
  PRACTICE = 'PRACTICE',
  RECORDINGS = 'RECORDINGS',
}

export enum QuestionCategory {
  UX_DESIGN = 'UX Design',
  DATA_ANALYTICS = 'Data Analytics',
  PROJECT_MANAGEMENT = 'Project Management',
  DIGITAL_MARKETING = 'Digital Marketing',
  IT_SUPPORT = 'IT Support',
  CYBERSECURITY = 'Cybersecurity',
  GENERAL = 'General',
}

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  type: 'Background' | 'Situational' | 'Technical';
}

export interface Recording {
  id: string;
  questionId: string;
  questionText: string;
  date: Date;
  transcript: string;
  type: 'Video' | 'Audio' | 'Text';
  durationSeconds?: number;
}