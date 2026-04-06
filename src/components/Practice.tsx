'use client';

import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { appStore } from '@/lib/store';

export default observer(function Practice() {
  const {
    questions,
    currentCategoryQuestions,
    categories,
    selectedCategory,
    setSelectedCategory,
    currentQuestionIndex,
    answers,
    showAnswer,
    setAnswer,
    setShowAnswer,
    nextQuestion,
    prevQuestion,
    toggleFavorite,
    favoriteQuestions,
    setCurrentQuestionIndex,
  } = appStore;

  // 组件内部状态 - 用于多选确认
  const [multipleConfirmed, setMultipleConfirmed] = useState(false);

  const question = currentCategoryQuestions[currentQuestionIndex];
  const isFavorite = favoriteQuestions.includes(question.id);

  // 切换题目时重置多选确认状态
  useEffect(() => {
    setMultipleConfirmed(false);
  }, [currentQuestionIndex]);

  // 从选项提取字母
  const getOptionLetter = (option: string) => {
    // 如果是单个字母 A/B/C/D
    if (/^[A-E]$/.test(option)) return option;

    const match = option.match(/^[A-Z]\./);
    if (match) return match[0].charAt(0);
    return option.charAt(0);
  };

  // 获取当前题目的用户答案
  const getCurrentAnswer = () => {
    
    return answers[question.id];
  };

  // 检查是否选对
  const checkAnswer = (userAnswer: string | string[], questionItem = question): boolean => {
    const correctAnswer = questionItem.answer;
    if (Array.isArray(correctAnswer)) {
      if (!Array.isArray(userAnswer)) return false;
      return correctAnswer.length === userAnswer.length && 
        correctAnswer.every(a => userAnswer.includes(a));
    }
    if (questionItem.type === 'judge' && typeof userAnswer === 'string') {
      const optionText = userAnswer.replace(/^[A-Z]\.\s*/, '').trim();
      return optionText === correctAnswer || userAnswer === correctAnswer;
    }
    return userAnswer === correctAnswer;
  };

  // 统计当前分类做题记录
  const getStats = () => {
    let attempted = 0;
    let correct = 0;

    currentCategoryQuestions.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer && (Array.isArray(userAnswer) ? userAnswer.length > 0 : true)) {
        attempted++;
        if (checkAnswer(userAnswer, q)) {
          correct++;
        }
      }
    });

    return { attempted, correct, total: currentCategoryQuestions.length };
  };
  const stats = getStats();

  // ========== 单选题处理 ==========
  const handleSingleSelect = (option: string) => {
    if (showAnswer) return;

    const optionLetter = getOptionLetter(option);
    setAnswer(question.id, optionLetter);
    setShowAnswer(true);

    // 检查是否正确
    const isCorrect = checkAnswer(optionLetter);
    if (isCorrect) {
      // 正确：1秒后自动跳转
      setTimeout(() => {
        setShowAnswer(false);
        if (currentQuestionIndex < currentCategoryQuestions.length - 1) {
          nextQuestion();
        }
      }, 1000);
    }
    // 错误：停留在当前页面，展示错误状态和答案
  };

  // ========== 判断题处理 ==========
  const handleJudgeSelect = (option: string) => {
    if (showAnswer) return;

    const optionText = option.replace(/^[A-Z]\.\s*/, '').trim();
    const optionKey = optionText === '正确' ? '正确' : (optionText === '错误' ? '错误' : getOptionLetter(option));
    
    setAnswer(question.id, optionKey);
    setShowAnswer(true);

    const correctAnswer = question.answer as string;
    const isCorrect = optionKey === correctAnswer || optionText === correctAnswer;
    
    if (isCorrect) {
      setTimeout(() => {
        setShowAnswer(false);
        if (currentQuestionIndex < currentCategoryQuestions.length - 1) {
          nextQuestion();
        }
      }, 1000);
    }
  };

  // ========== 多选题处理 ==========
  const handleMultipleSelect = (option: string) => {
    if (showAnswer || multipleConfirmed) return;

    const optionLetter = getOptionLetter(option);
    const currentAnswers = (answers[question.id] as string[]) || [];
    const newAnswers = currentAnswers.includes(optionLetter)
      ? currentAnswers.filter((a) => a !== optionLetter)
      : [...currentAnswers, optionLetter];

    setAnswer(question.id, newAnswers);
  };

  // 多选题确认答案
  const handleMultipleConfirm = () => {
    const userAnswer = answers[question.id];
    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) return;

    setMultipleConfirmed(true);
    setShowAnswer(true);

    const isCorrect = checkAnswer(userAnswer);
    if (isCorrect) {
      // 正确：2秒后跳转
      setTimeout(() => {
        setMultipleConfirmed(false);
        setShowAnswer(false);
        if (currentQuestionIndex < currentCategoryQuestions.length - 1) {
          nextQuestion();
        }
      }, 2000);
    }
  };

  // 多选题重新选择
  const handleMultipleRetry = () => {
    setMultipleConfirmed(false);
    setShowAnswer(false);
  };

  // ========== 获取选项状态 ==========
  const getOptionState = (option: string) => {
    const optionLetter = getOptionLetter(option);
    const correctAnswer = question.answer;
    const userAnswer = getCurrentAnswer();

    // 判断题特殊处理
    let isCorrectOption = false;
    if (question.type === 'judge') {
      const optionText = option.replace(/^[A-Z]\.\s*/, '').trim();
      isCorrectOption = optionText === correctAnswer || optionLetter === correctAnswer;
    } else {
      if (Array.isArray(correctAnswer)) {
        isCorrectOption = correctAnswer.includes(optionLetter);
      } else {
        isCorrectOption = optionLetter === correctAnswer;
      }
    }

    // 用户是否选择了这个选项
    let isSelected = false;
    if (Array.isArray(userAnswer)) {
      isSelected = userAnswer.includes(optionLetter);
    } else if (userAnswer) {
      if (question.type === 'judge') {
        const userText = userAnswer.replace(/^[A-Z]\.\s*/, '').trim();
        isSelected = userText === option.replace(/^[A-Z]\.\s*/, '').trim() || userAnswer === optionLetter;
      } else {
        isSelected = userAnswer === optionLetter;
      }
    }

    return { isCorrect: isCorrectOption, isSelected };
  };

  // ========== 获取选项样式 ==========
  const getOptionClass = (option: string) => {
    const { isCorrect, isSelected } = getOptionState(option);

    if (!showAnswer) {
      // 未查看答案时
      if (isSelected) {
        return 'border-primary-500 bg-primary-50';
      }
      return 'border-gray-200 hover:border-gray-300 hover:shadow-sm';
    }

    // 查看答案后
    if (isCorrect) {
      return 'border-green-500 bg-green-50';
    }
    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-50';
    }
    return 'border-gray-200 opacity-50';
  };

  // ========== 点击处理 ==========
  const handleOptionClick = (option: string) => {
    if (question.type === 'single') {
      handleSingleSelect(option);
    } else if (question.type === 'judge') {
      handleJudgeSelect(option);
    } else {
      handleMultipleSelect(option);
    }
  };

  // ========== 渲染 ==========
  return (
    <div className="space-y-6">
      {/* Category selector and Stats */}
      <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">题库分类筛选</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto block select select-bordered border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm py-2 px-3 shadow-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => {
              if(window.confirm('确定要清空所有刷题记录、分类进度并完全重新开始吗？无法撤销哦！')) {
                appStore.resetAllProgress();
              }
            }}
            className="w-full sm:w-auto px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
          >
            🔄 重新开始
          </button>
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg w-full sm:w-auto text-center sm:text-right border border-gray-100">
          <div className="font-medium mb-1">当前分类做题记录</div>
          已做 <span className="font-bold text-primary-600 text-lg">{stats.attempted}</span> 题 / 
          答对 <span className="font-bold text-green-600 text-lg">{stats.correct}</span> 题 / 
          共 {stats.total} 题
        </div>
      </div>

      {question && (
        <>
          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                题目 {currentQuestionIndex + 1} / {currentCategoryQuestions.length}
              </span>
              <button
                onClick={() => toggleFavorite(question.id)}
                className={clsx(
              'text-sm px-2 py-1 rounded transition-colors',
              isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'
            )}
          >
            {isFavorite ? '⭐ 已收藏' : '☆ 收藏'}
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className={clsx(
            'px-2 py-0.5 text-xs rounded',
            question.type === 'single' && 'bg-blue-100 text-blue-700',
            question.type === 'multiple' && 'bg-purple-100 text-purple-700',
            question.type === 'judge' && 'bg-orange-100 text-orange-700'
          )}>
            {question.type === 'single' && '单选题'}
            {question.type === 'multiple' && '多选题'}
            {question.type === 'judge' && '判断题'}
          </span>
          {question.category && (
            <span className="text-xs text-gray-400">{question.category}</span>
          )}
        </div>

        <h2 className="text-lg font-medium text-gray-900 mb-6">{question.content}</h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const { isCorrect, isSelected } = getOptionState(option);

            return (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                disabled={showAnswer && question.type === 'multiple' && !multipleConfirmed}
                className={clsx(
                  'w-full text-left p-4 rounded-lg border-2 transition-all',
                  getOptionClass(option),
                  !showAnswer && 'hover:shadow-sm cursor-pointer',
                  (showAnswer || (question.type === 'multiple' && multipleConfirmed)) && 'cursor-not-allowed'
                )}
              >
                <span className="font-medium">{option}</span>
                {showAnswer && isCorrect && (
                  <span className="ml-2 text-green-600 text-sm">✓ 正确答案</span>
                )}
                {showAnswer && isSelected && !isCorrect && (
                  <span className="ml-2 text-red-600 text-sm">✗ 错误</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Answer & Explanation */}
        {showAnswer && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <span className="font-medium text-gray-700">正确答案：</span>
              <span className="text-green-600 font-medium">
                {Array.isArray(question.answer) ? question.answer.join('、') : question.answer}
              </span>
            </div>
            {question.explanation && (
              <div>
                <span className="font-medium text-gray-700">解析：</span>
                <p className="text-gray-600 mt-1 text-sm">{question.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            prevQuestion();
          }}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一题
        </button>

        <div className="space-x-2">
          {/* 多选题操作按钮 */}
          {question.type === 'multiple' && !multipleConfirmed && (
            <>
              <button
                onClick={handleMultipleConfirm}
                disabled={!answers[question.id] || (answers[question.id] as string[]).length === 0}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认答案
              </button>
              <button
                onClick={() => {
                  setShowAnswer(true);
                  setMultipleConfirmed(true);
                }}
                disabled={!answers[question.id]}
                className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                查看答案
              </button>
            </>
          )}

          {question.type === 'multiple' && multipleConfirmed && (
            <>
              <button
                onClick={handleMultipleRetry}
                className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                重新选择
              </button>
              <button
                onClick={() => {
                  setMultipleConfirmed(false);
                  setShowAnswer(false);
                  if (currentQuestionIndex < currentCategoryQuestions.length - 1) {
                    nextQuestion();
                  }
                }}
                className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                {currentQuestionIndex < currentCategoryQuestions.length - 1 ? '下一题' : '完成'}
              </button>
            </>
          )}

          {/* 单选题/判断题操作按钮 */}
          {(question.type === 'single' || question.type === 'judge') && !showAnswer && (
            <button
              onClick={() => setShowAnswer(true)}
              disabled={!answers[question.id]}
              className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              查看答案
            </button>
          )}

          {(question.type === 'single' || question.type === 'judge') && showAnswer && (
            <button
              onClick={() => {
                setShowAnswer(false);
                if (currentQuestionIndex < currentCategoryQuestions.length - 1) {
                  nextQuestion();
                }
              }}
              className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              {currentQuestionIndex < currentCategoryQuestions.length - 1 ? '下一题' : '完成'}
            </button>
          )}
        </div>

        <button
          onClick={() => {
            if (currentQuestionIndex < currentCategoryQuestions.length - 1) {
              nextQuestion();
            }
          }}
          disabled={currentQuestionIndex === currentCategoryQuestions.length - 1}
          className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一题
        </button>
      </div>

      {/* 答题卡 (Question Grid) */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h3 className="text-sm font-medium text-gray-700">答题记录与快速跳转面板</h3>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-50 border border-green-500"></span> 答对</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-50 border border-red-500"></span> 答错</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-white border border-gray-200"></span> 未答</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm ring-2 ring-primary-500"></span> 当前</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
          {currentCategoryQuestions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const hasAnswered = userAnswer && (Array.isArray(userAnswer) ? userAnswer.length > 0 : true);
            let btnClass = "border-gray-200 text-gray-400 bg-white hover:bg-gray-50";
            
            if (hasAnswered) {
              const isCorrect = checkAnswer(userAnswer, q);
              btnClass = isCorrect ? "border-green-500 bg-green-50 text-green-700 font-medium" : "border-red-500 bg-red-50 text-red-700 font-medium";
            }
            
            if (idx === currentQuestionIndex) {
              btnClass += " ring-2 ring-primary-500 ring-offset-1";
            }

            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentQuestionIndex(idx);
                }}
                className={clsx(
                  "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded border text-sm transition-all outline-none",
                  btnClass
                )}
                title={hasAnswered ? (checkAnswer(userAnswer, q) ? "回答正确" : "回答错误") : "尚未作答"}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      </>
      )}
    </div>
  );
});
