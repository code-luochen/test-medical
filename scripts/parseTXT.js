const fs = require('fs');

const content = fs.readFileSync('data/4_医学基础知识真题模拟题精选（不断更新）.txt', 'utf8');

const categories = [
  { name: '生物学', keywords: ['遗传', '基因', '分子', 'DNA', 'RNA', '细菌', '病毒', '染色体', '细胞膜', '细胞器', '蛋白质'] },
  { name: '系统解剖学', keywords: ['解剖', '骨', '动脉', '静脉', '神经', '脑', '脊髓', '脏器', '肌肉', '膀胱', '尿道', '肾', '输尿管', '上中下', '内外面', '前后面', '血管'] },
  { name: '生理学', keywords: ['生理', '滤过', '代谢', '血压', '心率', '反射', '细胞内液', '渗透压', '兴奋', '动作电位', '内环境', '稳态', '激素', '分泌', '循环'] },
  { name: '病理学', keywords: ['病理', '炎症', '坏死', '肿瘤', '动脉粥样硬化', '血栓', '综合征', '结节', '风湿', '样变', '增生', '萎缩', '病变'] },
  { name: '药理学', keywords: ['药', '阿司匹林', '麻醉', '受体', '剂量', '副作用', '毒性', '抗生素', '普萘洛尔', '胺碘酮', '奎尼丁', '不良反应'] },
  { name: '诊断学', keywords: ['检查', '诊断', '体征', '症状', '影像', 'X线', '超声', '叩诊', '触诊', '黄疸', '杂音', '听诊', '实验室', '血清'] },
  { name: '医学伦理学', keywords: ['伦理', '医德', '道德', '权利', '义务', '患者', '同意', '保密', '隐私'] },
  { name: '医学常识', keywords: ['常识', '执业', '注册', '灭菌', '消毒', '法', '条例', '事故', '卫生', '传染病'] }
];

function classify(text) {
  for (let c of categories) {
    for (let k of c.keywords) {
      if (text.includes(k)) return c.name;
    }
  }
  return '未分类综合';
}

const parts = content.split(/(?=【答案】)/);

let qs = parts.map(() => ({ title: '', options: [], answer: '', explanation: '' }));

// handle first chunk title/options
let lines0 = parts[0].split('\n').map(l => l.replace(/^[\u0000-\u001F\u007F-\u009F\u200B\f]+/, '').trim());
let title0 = [], ops0 = [];
let inOps = false;
for(let l of lines0) {
   if(l.match(/^[A-H][\.\u3001 ]/)) inOps = true;
   if(inOps) { if(l) ops0.push(l); }
   else { if(l) title0.push(l); }
}
qs[0].title = title0.join('\n');
qs[0].options = ops0;

for (let k = 1; k < parts.length; k++) {
    let lines = parts[k].split('\n').map(l => l.replace(/^[\u0000-\u001F\u007F-\u009F\u200B\f]+/, '').trim());
    
    let firstLine = lines[0] || '';
    let ansMatch = firstLine.match(/^【?答案】?\s*[:：]?\s*([A-H]+|正确|错误)/);
    qs[k-1].answer = ansMatch ? ansMatch[1] : '';
    
    let prefixLines = [];
    let optionsLines = [];
    let foundOps = false;
    for(let i=0; i<lines.length; i++) {
        if(lines[i].match(/^[A-H][\.\u3001 ]/)) foundOps = true;
        if(foundOps) {
            if (lines[i]) optionsLines.push(lines[i]);
        } else {
            prefixLines.push(lines[i]);
        }
    }
    
    if (k < parts.length - 1) { 
       while(prefixLines.length > 0 && prefixLines[prefixLines.length-1] === '') prefixLines.pop();
       while(prefixLines.length > 0 && prefixLines[0] === '') prefixLines.shift();
       let lastEmpty = -1;
       for(let i=prefixLines.length-1; i>=1; i--) {
           if(prefixLines[i] === '') { lastEmpty = i; break; }
       }
       
       let expLines = [];
       let titleLines = [];
       if (lastEmpty !== -1) {
           expLines = prefixLines.slice(0, lastEmpty);
           titleLines = prefixLines.slice(lastEmpty + 1);
       } else {
           let splitPos = 1; 
           for(let i=prefixLines.length-1; i>=1; i--) {
               if(prefixLines[i].match(/[。！？]$/)) { splitPos = i+1; break; }
           }
           if (splitPos >= prefixLines.length) splitPos = Math.max(1, prefixLines.length - 1); 
           expLines = prefixLines.slice(0, splitPos);
           titleLines = prefixLines.slice(splitPos);
       }
       
       let rawExp = expLines.join('\n');
       rawExp = rawExp.replace(/^【?答案】?\s*[:：]?\s*([A-H]+|正确|错误)。?解析：?/, '')
                      .replace(/^【?答案】?\s*[:：]?\s*([A-H]+|正确|错误)。?/, '');
                      
       qs[k-1].explanation = rawExp.trim();
       
       qs[k].title = titleLines.filter(x => x).join('\n');
       qs[k].options = optionsLines;
    } else {
       let rawExp = prefixLines.join('\n');
       rawExp = rawExp.replace(/^【?答案】?\s*[:：]?\s*([A-H]+|正确|错误)。?解析：?/, '')
                      .replace(/^【?答案】?\s*[:：]?\s*([A-H]+|正确|错误)。?/, '');
       qs[k-1].explanation = rawExp.trim();
    }
}

// Format properly
let finalQuestions = [];
let idx = 1;
for(let item of qs) {
    if (!item.title) continue;
    let type = 'single';
    if (item.title.includes('多选')) type = 'multiple';
    else if (item.answer && item.answer.length > 1) type = 'multiple';
    else if (item.options.length <= 2 && (item.options.some(o => o.includes('正确') || o.includes('对')) || item.answer === '正确' || item.answer === '错误')) type = 'judge';
    
    let cat = classify(item.title + ' ' + item.explanation);
    
    finalQuestions.push({
      id: "q_auto_" + idx,
      category: cat,
      title: item.title,
      type: type,
      options: item.options.map(o => o.trim()),
      answer: type === 'multiple' ? item.answer.replace(/[^A-H]/g, '').split('') : (item.answer || 'A'),
      explanation: item.explanation
    });
    idx++;
}

console.log('Successfully generated complete questions:', finalQuestions.length);
fs.writeFileSync('data/questions.json', JSON.stringify(finalQuestions, null, 2));
