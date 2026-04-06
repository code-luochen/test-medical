#!/usr/bin/env python3
"""
医学考试题 PDF 解析器 v2
基于实际 PDF 内容格式优化
"""

import re
import json
import sys
from typing import List, Dict, Any

try:
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams
except ImportError:
    print("需要安装 pdfminer.six")
    sys.exit(1)


def extract_text_from_pdf(pdf_path: str) -> str:
    """从 PDF 提取文本"""
    laparams = LAParams(
        line_margin=0.5,
        word_margin=0.1,
        char_margin=2.0
    )
    text = extract_text(pdf_path, laparams=laparams)
    return text


def parse_questions_v2(text: str) -> List[Dict[str, Any]]:
    """改进的题目解析算法"""
    questions = []
    
    # 清理文本，统一换行
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # 使用状态机解析
    lines = text.split('\n')
    
    current_q = None
    current_options = []
    current_answer = None
    current_explanation = None
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # 跳过空行和页码
        if not line:
            i += 1
            continue
        if re.match(r'^(?:第?\d+页|Page \d+)$', line):
            i += 1
            continue
        
        # 题目模式: "1." 或 "1)" 或 "1. " 后跟题目内容
        # 或者 "(1)" 如果是多选
        
        # 匹配题号和题目内容 - 扩展模式
        q_patterns = [
            r'^(?:【)?(\d+)(?:】)?[.、\)](.+)$',                     # 1. 题目内容
            r'^\((\d+)\)(.+)$',                                      # (1)题目内容
            r'^(\d+)、(.+)$',                                         # 1、题目内容
        ]
        
        is_new_question = False
        for pattern in q_patterns:
            match = re.match(pattern, line)
            if match:
                # 保存之前的题目
                if current_q and (current_options or current_answer):
                    q_type = 'multiple' if (current_options and len(current_options) > 0 and 
                              (isinstance(current_answer, list) or 
                               (isinstance(current_answer, str) and len(current_answer) > 1))) else 'single'
                    # 判断多选
                    if '（多选）' in current_q or '(多选)' in current_q or '多选' in current_q:
                        q_type = 'multiple'
                    # 判断题（只有两个选项）
                    if len(current_options) == 2:
                        if '正确' in ''.join(current_options) or '错误' in ''.join(current_options):
                            q_type = 'judge'
                    
                    questions.append({
                        'type': q_type,
                        'content': clean_question_content(current_q),
                        'options': current_options[:5] if current_options else [],  # 最多5个选项
                        'answer': current_answer,
                        'explanation': current_explanation or '',
                    })
                
                # 开始新题目
                current_q = match.group(2).strip() if match.group(2) else match.group(1).strip()
                current_options = []
                current_answer = None
                current_explanation = None
                is_new_question = True
                break
        
        if is_new_question:
            i += 1
            continue
        
        # 如果有当前题目，收集选项
        if current_q is not None:
            # 选项模式: A. B. C. D. E.
            opt_match = re.match(r'^([A-Ea-e])[.、\)](.+)$', line)
            if opt_match:
                opt_letter = opt_match.group(1).upper()
                opt_text = opt_match.group(2).strip()
                current_options.append(f"{opt_letter}. {opt_text}")
                i += 1
                continue
            
            # 检查是否是选项继续（没有字母前缀但看起来像选项内容）
            # 这种情况下跳过，因为选项应该以字母开头
            
            # 答案模式: "【答案】A" 或 "答案: A" 或 "【答案】AB"
            ans_match = re.match(r'^(?:【)?答案[：:]\s*([A-Ea-e,，]+)(?:[（(].*?[）)])?\s*(.*)$', line)
            if ans_match and not current_answer:
                ans_str = ans_match.group(1).upper().replace('，', ',')
                # 清理答案（去掉括号内的解析引用）
                ans_str = re.sub(r'[（(].*?[）)]', '', ans_str).strip()
                
                if len(ans_str) == 1:
                    current_answer = ans_str
                elif len(ans_str) > 1:
                    current_answer = [c for c in ans_str if c in 'ABCDE']
                
                # 解析（可能跟在答案后面）
                expl = ans_match.group(2).strip()
                if expl:
                    current_explanation = expl
                i += 1
                continue
            
            # 解析/说明模式
            if re.match(r'^(?:解析|分析|说明)[：:]', line):
                match = re.match(r'^(?:解析|分析|说明)[：:]\s*(.+)$', line)
                if match:
                    current_explanation = match.group(1).strip()
                    # 可能跨多行
                    j = i + 1
                    while j < len(lines):
                        next_line = lines[j].strip()
                        if not next_line:
                            j += 1
                            continue
                        if re.match(r'^(?:【)?\d+', next_line) or re.match(r'^\(', next_line):
                            break
                        # 如果看起来像新题目的开始
                        if any(re.match(p, next_line) for p in ['^(?:【)?\d+[.、\)](.+)$', r'^\d+、(.+)$']):
                            break
                        current_explanation += ' ' + next_line
                        j += 1
                    i = j if j > i + 1 else i + 1
                    continue
        
        i += 1
    
    # 保存最后一个题目
    if current_q and (current_options or current_answer):
        q_type = 'multiple' if isinstance(current_answer, list) else 'single'
        if '（多选）' in current_q or '(多选)' in current_q:
            q_type = 'multiple'
        if len(current_options) == 2:
            if '正确' in ''.join(current_options) or '错误' in ''.join(current_options):
                q_type = 'judge'
        
        questions.append({
            'type': q_type,
            'content': clean_question_content(current_q),
            'options': current_options[:5],
            'answer': current_answer,
            'explanation': current_explanation or '',
        })
    
    return questions


def clean_question_content(content: str) -> str:
    """清理题目内容"""
    # 移除多余空白
    content = re.sub(r'\s+', ' ', content).strip()
    # 可能需要移除题目类型标记
    content = re.sub(r'^\d+[.、\)]+', '', content)
    content = re.sub(r'^\([^)]+\)', '', content)
    return content


def main():
    if len(sys.argv) < 2:
        print("用法: python pdf_parser_v2.py <pdf文件>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    print(f"正在解���: {pdf_path}")
    
    text = extract_text_from_pdf(pdf_path)
    print(f"提取文本: {len(text)} 字符")
    
    # 先打印一些样本文本看格式
    print("\n--- 前 3000 字符 ---")
    print(text[:3000])
    print("--- 结束 ---\n")
    
    questions = parse_questions_v2(text)
    print(f"解析到 {len(questions)} 道题目")
    
    # 保存
    output = pdf_path.replace('.pdf', '_parsed.json')
    with open(output, 'w', encoding='utf-8') as f:
        json.dump({
            'total': len(questions),
            'questions': questions
        }, f, ensure_ascii=False, indent=2)
    
    print(f"已保存到: {output}")
    
    # 显示前3道
    for i, q in enumerate(questions[:3]):
        print(f"\n题目 {i+1}: {q['content'][:60]}...")
        print(f"  类型: {q['type']}")
        print(f"  选项: {q['options'][:3]}...")
        print(f"  答案: {q['answer']}")
        print(f"  解析: {q['explanation'][:60]}...")


if __name__ == '__main__':
    main()