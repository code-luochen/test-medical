# 医考题库助手

执业医师考试题库助手 - 做题、模拟考试、错题本

## 功能特性

### MVP（已完成）
- ✅ 做题 - 支持单选题、多选题、判断题
- ✅ 模拟考试 - 自定义题量、时长、倒计时、交卷
- ✅ 答案解析 - 正确答案和详细解析
- ✅ 错题本 - 自动收录错题、复习强化
- ✅ 收藏 - 收藏重点题目
- ✅ 数据持久化 - localStorage 自动保存

### 后续版本
- [ ] PDF 解析 - 上传 PDF AI 生成题库
- [ ] 题库搜索 - 关键词搜索、筛选
- [ ] PDF 缓存 - 避免重复解析

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
```

访问 http://localhost:3001

## 项目结构

```
├── src/
│   ├── app/           # Next.js 页面
│   ├── components/     # React 组件
│   ├── lib/           # 状态管理
│   └── types/         # TypeScript 类型
├── package.json
└── README.md
```

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand (状态管理)

## 开发者

少爷 - 罗春