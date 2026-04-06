import { makeAutoObservable, runInAction, action } from 'mobx';
import type { Question, Exam, ExamResult, WrongQuestion } from '@/types';
import { defaultQuestions } from './default-questions';

// 使用 createContext + useContext 方式不如直接用 singleton
// 所以我们确保 MobX 正确追踪 answers

class AppStore {
  currentQuestionIndex = 0;
  answers: Record<string, string | string[]> = {};
  showAnswer = false;
  
  currentExam: Exam | null = null;
  examHistory: ExamResult[] = [];
  wrongQuestions: WrongQuestion[] = [];
  favoriteQuestions: string[] = [];
  questions: Question[] = defaultQuestions;
  multipleConfirmed = false;
  selectedCategory = '全部';
  categoryIndices: Record<string, number> = {};
  
  constructor() {
    // 使用 makeAutoObservable 自动追踪所有属性
    makeAutoObservable(this, {
      // 显式指定 answers 需要被追踪
      answers: true,
    }, { autoBind: true });
  }
  
  loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('medical-exam-store');
      if (saved) {
        const data = JSON.parse(saved);
        runInAction(() => {
          this.currentQuestionIndex = data.currentQuestionIndex || 0;
          this.categoryIndices = data.categoryIndices || {};
          this.selectedCategory = data.selectedCategory || '全部';
          this.answers = data.answers || {};
          this.examHistory = data.examHistory || [];
          this.wrongQuestions = data.wrongQuestions || [];
          this.favoriteQuestions = data.favoriteQuestions || [];
          this.questions = data.questions && data.questions.length > 0 ? data.questions : defaultQuestions;
        });
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }
  
  saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('medical-exam-store', JSON.stringify({
        currentQuestionIndex: this.currentQuestionIndex,
        categoryIndices: this.categoryIndices,
        selectedCategory: this.selectedCategory,
        answers: this.answers,
        examHistory: this.examHistory,
        wrongQuestions: this.wrongQuestions,
        favoriteQuestions: this.favoriteQuestions,
        questions: this.questions,
      }));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }
  
  // 使用 action 包装方法
  setQuestions(questions: Question[]) {
    this.questions = questions;
    this.saveToStorage();
  }

  get categories() {
    const cats = new Set(this.questions.map(q => q.category).filter(Boolean));
    return ['全部', ...Array.from(cats)] as string[];
  }

  get currentCategoryQuestions() {
    if (this.selectedCategory === '全部') {
      return this.questions;
    }
    return this.questions.filter(q => q.category === this.selectedCategory);
  }

  updateQuestionState() {
    const q = this.currentCategoryQuestions[this.currentQuestionIndex];
    if (!q) return;
    
    const ans = this.answers[q.id];
    const hasAnswered = ans && (Array.isArray(ans) ? ans.length > 0 : true);
    
    if (hasAnswered) {
      this.showAnswer = true;
      if (q.type === 'multiple') {
        this.multipleConfirmed = true;
      }
    } else {
      this.showAnswer = false;
      this.multipleConfirmed = false;
    }
  }

  setSelectedCategory(category: string) {
    this.categoryIndices[this.selectedCategory] = this.currentQuestionIndex;
    this.selectedCategory = category;
    this.currentQuestionIndex = this.categoryIndices[category] || 0;
    this.updateQuestionState();
    this.saveToStorage();
  }
  
  toggleFavorite(questionId: string) {
    if (this.favoriteQuestions.includes(questionId)) {
      this.favoriteQuestions = this.favoriteQuestions.filter(id => id !== questionId);
    } else {
      this.favoriteQuestions.push(questionId);
    }
    this.saveToStorage();
  }
  
  setCurrentQuestionIndex(index: number) {
    this.currentQuestionIndex = index;
    this.categoryIndices[this.selectedCategory] = index;
    this.updateQuestionState();
    this.saveToStorage();
  }
  
  // 关键：确保 answers 被正确设置
  setAnswer(questionId: string, answer: string | string[]) {
    // 确保 answers 对象存在
    const newAnswers = { ...this.answers, [questionId]: answer };
    this.answers = newAnswers;
  }
  
  setShowAnswer(show: boolean) {
    this.showAnswer = show;
  }
  
  setMultipleConfirmed(confirmed: boolean) {
    this.multipleConfirmed = confirmed;
  }
  
  nextQuestion() {
    if (this.currentQuestionIndex < this.currentCategoryQuestions.length - 1) {
      this.currentQuestionIndex++;
      this.categoryIndices[this.selectedCategory] = this.currentQuestionIndex;
      this.updateQuestionState();
    }
    this.saveToStorage();
  }
  
  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.categoryIndices[this.selectedCategory] = this.currentQuestionIndex;
      this.updateQuestionState();
    }
    this.saveToStorage();
  }
  
  resetAllProgress() {
    this.answers = {};
    this.categoryIndices = {};
    this.currentQuestionIndex = 0;
    this.showAnswer = false;
    this.multipleConfirmed = false;
    this.saveToStorage();
  }
  
  startExam(exam: Exam) {
    this.currentExam = exam;
    this.answers = {};
    this.currentQuestionIndex = 0;
    this.showAnswer = false;
  }
  
  submitExam(): ExamResult | null {
    if (!this.currentExam) return null;
    
    let correctCount = 0;
    const wrongQuestions: Question[] = [];
    
    this.currentExam.questions.forEach((q) => {
      const userAnswer = this.answers[q.id];
      let isCorrect = false;
      
      if (q.type === 'multiple') {
        const correctAnswers = Array.isArray(q.answer) ? q.answer : [q.answer];
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        isCorrect = correctAnswers.length === userAnswers.length && 
          correctAnswers.every(a => userAnswers.includes(a));
      } else {
        isCorrect = userAnswer === q.answer;
      }
      
      if (isCorrect) {
        correctCount++;
      } else {
        wrongQuestions.push(q);
      }
    });
    
    const score = Math.round((correctCount / this.currentExam.questions.length) * 100);
    
    const result: ExamResult = {
      examId: this.currentExam.id,
      totalQuestions: this.currentExam.questions.length,
      correctCount,
      wrongQuestions,
      score,
      completedAt: new Date(),
    };
    
    this.examHistory.push(result);
    this.saveToStorage();
    return result;
  }
  
  clearExam() {
    this.currentExam = null;
    this.answers = {};
    this.currentQuestionIndex = 0;
    this.showAnswer = false;
  }
  
  addToWrongQuestions(question: Question) {
    const existing = this.wrongQuestions.find(q => q.id === question.id);
    if (existing) {
      existing.wrongCount++;
      existing.lastReviewedAt = new Date();
    } else {
      this.wrongQuestions.push({
        ...question,
        wrongCount: 1,
        lastReviewedAt: new Date(),
      });
    }
    this.saveToStorage();
  }
  
  removeFromWrongQuestions(questionId: string) {
    this.wrongQuestions = this.wrongQuestions.filter(q => q.id !== questionId);
    this.saveToStorage();
  }
  
  clearWrongQuestions() {
    this.wrongQuestions = [];
    this.saveToStorage();
  }
  
  addQuestionsFromPdf(newQuestions: Question[]) {
    const existingIds = new Set(this.questions.map(q => q.id));
    const uniqueNewQuestions = newQuestions.filter(q => !existingIds.has(q.id));
    this.questions = [...this.questions, ...uniqueNewQuestions];
    this.saveToStorage();
  }
  
  init() {
    this.loadFromStorage();
  }
}

export const appStore = new AppStore();
