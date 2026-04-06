#!/usr/bin/env python3
"""
医学考试题 PDF 解析器
从 PDF 中提取题目、选项、答案和解析
"""

import re
import json
import sys
from typing import List, Dict, Any

try:
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams
except ImportError:
    print("正在安装 pdfminer.six...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfminer.six", "-q"])
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams


def extract_text_from_pdf(pdf_path: str) -> str:
    """从 PDF 提取文本"""
    laparams = LAParams(
        line_margin=0.5,
        word_margin=0.1,
        char_margin=2.0
    )
    text = extract_text(pdf_path, laparams=laparams)
    return text


def parse_questions(text: str) -> List[Dict[str, Any]]:
    """解析文本中的题目"""
    questions = []
    
    # 清理文本
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # 分割题目 - 查找题号模式 (1. , 1) , 【1】等)
    # 题目模式: 数字. 或 数字) 或 【数字】
    question_pattern = r'(?:^|\n)(?:【)?(\d+)(?:】)?[.、)](.*?)(?=(?:^|\n)(?:【)?(?:\d+)(?:】)?[.、)]|$)'
    
    # 简化处理：按行分析
    lines = text.split('\n')
    
    current_question = None
    current_options = []
    current_answer = None
    current_explanation = None
    question_start = None
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # 跳过空行和页码
        if not line or re.match(r'^\d+$', line) or line.startswith('第') and line.endswith('页'):
            i += 1
            continue
        
        # 检测题目开始 - 匹配 "1. " 或 "1)" 模式
        q_match = re.match(r'^(?:【)?(\d+)(?:】)?[.、)](.+)$', line)
        
        if q_match:
            # 保存之前的题目
            if current_question:
                questions.append({
                    'type': determine_question_type(current_options),
                    'content': current_question,
                    'options': current_options,
                    'answer': current_answer,
                    'explanation': current_explanation or '',
                })
            
            # 开始新题目
            question_num = q_match.group(1)
            current_question = q_match.group(2).strip()
            current_options = []
            current_answer = None
            current_explanation = None
            question_start = i
        elif current_question is not None:
            # 收集选项
            opt_match = re.match(r'^([A-Ea-e])[.、)](.+)$', line)
            if opt_match:
                option = f"{opt_match.group(1).upper()}. {opt_match.group(2).strip()}"
                current_options.append(option)
            
            # 检测答案 (常见格式: 答案: A, 正确答案: A, 答: A)
            elif re.match(r'^(?:正确)?答案[：:]\s*([A-Ea-e,，]+)$', line):
                ans_match = re.match(r'^(?:正确)?答案[：:]\s*([A-Ea-e,，]+)$', line)
                if ans_match:
                    ans = ans_match.group(1).upper().replace('，', ',')
                    # 可能是多选 "A,B" 或 "AB"
                    if len(ans) > 1:
                        current_answer = [c for c in ans if c in 'ABCDE']
                    else:
                        current_answer = ans
            
            # 检测解析 (常见格式: 解析: , 分析: , 说明: )
            elif re.match(r'^(?:解析|分析|说明)[：:]', line):
                expl_match = re.match(r'^(?:解析|分析|说明)[：:]\s*(.+)$', line)
                if expl_match:
                    current_explanation = expl_match.group(1).strip()
                else:
                    # 解析可能跨多行
                    j = i + 1
                    while j < len(lines):
                        expl_line = lines[j].strip()
                        if (re.match(r'^(?:正确)?答案', expl_line) or 
                            re.match(r'^(?:【)?\d+', expl_line) or
                            re.match(r'^【', expl_line)):
                            break
                        current_explanation = (current_explanation or '') + ' ' + expl_line
                        j += 1
                    i = j - 1 if j > i else i
        
        i += 1
    
    # 保存最后一个题目
    if current_question:
        questions.append({
            'type': determine_question_type(current_options),
            'content': current_question,
            'options': current_options,
            'answer': current_answer,
            'explanation': current_explanation or '',
        })
    
    return questions


def determine_question_type(options: List[str]) -> str:
    """根据选项判断题目类型"""
    if not options:
        return 'single'
    
    # 如果只有两个选项，可能是判断题
    if len(options) == 2:
        opt_text = ' '.join(options).lower()
        if '正确' in opt_text or '错误' in opt_text or 'true' in opt_text or 'false' in opt_text:
            return 'judge'
    
    # 如果答案包含多个选项，可能是多选
    return 'single'


def clean_content(content: str) -> str:
    """清理题目内容"""
    # 移除多余的空白
    content = re.sub(r'\s+', ' ', content).strip()
    # 移除题号前缀
    content = re.sub(r'^\d+[.、)\]]\s*', '', content)
    return content


def main():
    if len(sys.argv) < 2:
        print("用法: python pdf_parser.py <pdf文件路径>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    print(f"正在解析: {pdf_path}")
    
    try:
        text = extract_text_from_pdf(pdf_path)
        print(f"提取文本长度: {len(text)} 字符")
        
        # 打印前 2000 字符用于调试
        print("\n--- 文本前 2000 字符 ---")
        print(text[:2000])
        print("--- 文本结束 ---\n")
        
        questions = parse_questions(text)
        print(f"解析到 {len(questions)} 道题目")
        
        # 保存结果
        output_path = pdf_path.replace('.pdf', '_questions.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                'total': len(questions),
                'questions': questions
            }, f, ensure_ascii=False, indent=2)
        
        print(f"结果已保存到: {output_path}")
        
        # 打印前几道题目
        for i, q in enumerate(questions[:3]):
            print(f"\n题目 {i+1}: {q['content'][:80]}...")
            print(f"选项: {q['options']}")
            print(f"答案: {q['answer']}")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()