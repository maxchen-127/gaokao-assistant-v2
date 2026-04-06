# 浙江高考志愿填报助手

基于智能算法的高考志愿填报决策辅助工具，为浙江省高三考生及家长提供精准的志愿推荐服务。

## 功能特点

- 📊 **数据驱动**：覆盖浙江省2025年高考第一段平行投档数据（17,890条录取记录）
- 🧠 **智能匹配**：基于霍兰德职业兴趣测评 + 约束条件筛选 + 位次匹配算法
- 💼 **职业洞察**：提供专业的就业前景、薪资水平、工作强度等深度分析
- 📄 **报告生成**：自动生成结构化的志愿填报推荐报告

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite
- **部署**：Vercel Serverless
- **前端**：Coze Bot

## 快速部署

### 方式1：Vercel一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/gaokao-assistant)

### 方式2：手动部署

1. Fork 本仓库
2. 访问 [vercel.com](https://vercel.com) 并登录
3. 点击 "New Project"
4. 导入你 Fork 的仓库
5. 点击 "Deploy"

## API接口

| 接口 | 方法 | 说明 |
|-----|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/recommend` | POST | 智能推荐 |
| `/api/score/query` | GET | 分数线查询 |
| `/api/insight` | GET | 职业洞察 |
| `/api/major/list` | GET | 专业列表 |
| `/api/assessment/save` | POST | 保存测评结果 |
| `/api/assessment/get` | GET | 获取测评结果 |

## 项目结构

```
gaokao-assistant/
├── api/
│   └── index.js          # Express API服务
├── lib/
│   └── database.js       # 数据库操作模块
├── data/
│   └── gaokao.db         # SQLite数据库
├── package.json          # 依赖配置
└── vercel.json           # Vercel部署配置
```

## 数据说明

- **高校数量**：1,291 所
- **专业数量**：2,877 个
- **录取数据**：17,890 条（浙江省2025年第一段）

## License

MIT
