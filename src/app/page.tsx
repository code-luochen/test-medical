'use client';

import { useState } from 'react';
import { appStore } from '@/lib/store';
import { useEffect } from 'react';
import Practice from '@/components/Practice';

type Tab = 'practice';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('practice');
  useEffect(() => {
    appStore.init();
  }, []);
  
  const { questions, examHistory } = appStore;

  const tabs = [
    { id: 'practice', label: '进行练习', icon: '📝' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">医考题库助手</h1>
          <p className="text-sm text-gray-500 mt-1">
            执业医师考试 · {questions.length} 道题目 · 已完成 {examHistory.length} 次考试
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'practice' && <Practice />}
      </main>
    </div>
  );
}
