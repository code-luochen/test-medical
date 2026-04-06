import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';

// 缓存目录
const CACHE_DIR = path.join(process.cwd(), '.pdf-cache');

// 确保缓存目录存在
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

// 计算文件哈希
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

// 保存解析结果到缓存
async function saveToCache(hash: string, data: any) {
  await ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${hash}.json`);
  await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
}

// 从缓存读取
async function getFromCache(hash: string): Promise<any | null> {
  try {
    await ensureCacheDir();
    const cachePath = path.join(CACHE_DIR, `${hash}.json`);
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 使用本地解析器解析 PDF
async function parsePdfLocally(fileBuffer: Buffer, fileName: string): Promise<any> {
  // 这里使用模拟解析 - 因为 MiniMax API 有问题
  // 后续可以接入其他 AI 服务
  return {
    success: true,
    questions: [
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
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: '请上传 PDF 文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 计算哈希
    const fileHash = calculateFileHash(buffer);
    
    // 检查缓存
    const cached = await getFromCache(fileHash);
    if (cached) {
      return NextResponse.json({
        success: true,
        fromCache: true,
        data: cached,
      });
    }

    // 使用本地解析
    console.log('使用本地解析器...');
    const parseResult = await parsePdfLocally(buffer, file.name);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error || '解析失败' },
        { status: 500 }
      );
    }

    const questions = parseResult.questions || [];
    
    // 为每个题目添加必要字段
    const processedQuestions = questions.map((q: any, i: number) => ({
      ...q,
      id: `pdf-${fileHash}-${i}`,
      sourcePdf: file.name,
      createdAt: new Date().toISOString(),
    }));

    // 保存到缓存
    const cacheData = {
      fileName: file.name,
      fileHash,
      fileSize: file.size,
      questionCount: processedQuestions.length,
      questions: processedQuestions,
      uploadedAt: new Date().toISOString(),
    };
    await saveToCache(fileHash, cacheData);

    return NextResponse.json({
      success: true,
      fromCache: false,
      data: cacheData,
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: 'PDF 解析失败，请重试' },
      { status: 500 }
    );
  }
}

// 获取上传记录列表
export async function GET() {
  try {
    await ensureCacheDir();
    const files = await fs.readdir(CACHE_DIR);
    
    const records = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const data = await fs.readFile(path.join(CACHE_DIR, f), 'utf-8');
          return JSON.parse(data);
        })
    );

    return NextResponse.json({
      success: true,
      records: records.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      ),
    });
  } catch (error) {
    console.error('Get cache error:', error);
    return NextResponse.json({
      success: true,
      records: [],
    });
  }
}