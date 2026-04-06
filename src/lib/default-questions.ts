import questionsData from '../../data/questions.json';
import { Question } from '@/types';

export const defaultQuestions: Question[] = questionsData.map((q: any) => ({
  ...q,
  content: q.title
})) as Question[];
