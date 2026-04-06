export type QuestionType = 'single' | 'multiple' | 'judge';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options: string[];
  answer: string | string[];
  explanation: string;
  category?: string;
  isFavorite?: boolean;
  sourcePdf?: string;
  createdAt?: Date;
}

export interface Exam {
  id: string;
  title: string;
  duration: number; // 分钟
  questions: Question[];
  startedAt: Date;
  submittedAt?: Date;
  answers?: Record<string, string | string[]>;
  score?: number;
}

export interface ExamResult {
  examId: string;
  totalQuestions: number;
  correctCount: number;
  wrongQuestions: Question[];
  score: number;
  completedAt: Date;
}

export interface WrongQuestion extends Question {
  wrongCount: number;
  lastReviewedAt: Date;
}

// PDF 上传相关类型
export interface PdfUploadRecord {
  id: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  uploadedAt: Date;
  questionCount: number;
  questions: Question[];
}

export interface ParsedQuestion {
  type: QuestionType;
  content: string;
  options: string[];
  answer: string | string[];
  explanation: string;
  category?: string;
}
