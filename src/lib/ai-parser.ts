import { promises as fs } from 'fs';
import path from 'path';

// MiniMax API 配置
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_API_BASE = 'https://api.minimax.chat/v1/text/chatcompletion_pro';

// 解析请求类型
interface ParseRequest {
  content: string; // PDF 文件的 Base64 编码内容
  fileName: string;
}

// 解析响应类型
interface ParseResponse {
  success: boolean;
  questions?: any[];
  error?: string;
}

// 调用 MiniMax API 进行解析
export async function parsePdfWithMiniMax(content: string, fileName: string): Promise<ParseResponse> {
  if (!MINIMAX_API_KEY) {
    return {
      success: false,
      error: '未配置 MiniMax API Key',
    };
  }

  const prompt = `你是一个医学考试题目解析助手。请从以下 PDF 内容中提取所有题目，解析为结构化的 JSON 格式。

解析要求：
1. 识别题目类型：单选题(single)、多选题(multiple)、判断题(judge)
2. 提取题目内容、选项(A-E)、正确答案、详细解析
3. 如果 PDF 内容不是题目，返回空数组

请直接返回 JSON 数组，不要包含任何其他内容。格式如下：
[
  {
    "type": "single|multiple|judge",
    "content": "题目内容",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4", "E. 选项5"],
    "answer": "A" 或 ["A", "B"],
    "explanation": "解析内容",
    "category": "科目分类"
  }
]

PDF 内容：
${content.slice(0, 50000)}`;

  try {
    const response = await fetch(MINIMAX_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个医学考试题目解析助手，擅长从 PDF 中提取和解析医学题目。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      
      // 提取 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          questions,
        };
      }
    }

    return {
      success: false,
      error: '无法解析 AI 返回的内容',
    };
  } catch (error) {
    console.error('MiniMax API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

// 本地解析（用于开发测试）
export function parsePdfLocally(content: string, fileName: string): ParseResponse {
  // 这里可以实现本地解析逻辑
  // 对于测试，可以生成模拟题目
  const mockQuestions = [
    {
      type: 'single',
      content: `来自 ${fileName} - 下列关于心脏听诊的描述，正确的是？`,
      options: ['A. 心尖区第一心音增强见于二尖瓣狭窄', 'B. 奔马律提示心功能不全', 'C. 开瓣音见于二尖瓣关闭不全', 'D. 心包摩擦音在吸气末增强'],
      answer: 'B',
      explanation: '奔马律是心功能不全的重要体征，提示心肌损害。',
      category: '诊断学',
    },
    {
      type: 'multiple',
      content: `来自 ${fileName} - 下列哪些是糖尿病的慢性并发症？`,
      options: ['A. 糖尿病肾病', 'B. 糖尿病视网膜病变', 'C. 糖尿病神经病变', 'D. 糖尿病足'],
      answer: ['A', 'B', 'C', 'D'],
      explanation: '糖尿病的慢性并发症包括糖尿病肾病、视网膜病变、神经病变和糖尿病足等。',
      category: '内科学',
    },
  ];

  return {
    success: true,
    questions: mockQuestions,
  };
}
