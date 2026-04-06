# 高考志愿填报助手 - Vercel部署指南

## 一、前置准备

### 1.1 注册Vercel账号
1. 访问 [https://vercel.com](https://vercel.com)
2. 点击 "Sign Up" 使用 GitHub 账号登录（推荐）
3. 授权 Vercel 访问你的 GitHub

### 1.2 安装 Vercel CLI（可选）
```bash
npm install -g vercel
```

---

## 二、项目文件结构

```
gaokao-assistant/
├── api/
│   └── index.js          # Express API服务
├── lib/
│   └── database.js       # 数据库操作模块
├── data/
│   └── gaokao.db         # SQLite数据库（17,890条数据）
├── package.json          # 依赖配置
└── vercel.json           # Vercel部署配置
```

---

## 三、部署方式

### 方式A：命令行部署（推荐）

```bash
# 1. 进入项目目录
cd gaokao-assistant

# 2. 安装依赖
npm install

# 3. 登录Vercel
vercel login

# 4. 部署到Vercel
vercel --prod

# 部署过程中会提示：
# - Scope: 选择你的账号
# - Link to existing project: No
# - Project name: gaokao-assistant（或自定义）
# - Directory: ./（直接回车）
```

### 方式B：GitHub自动部署

1. 将 `gaokao-assistant` 目录推送到 GitHub 仓库
2. 在 Vercel Dashboard 点击 "New Project"
3. 导入该 GitHub 仓库
4. 点击 "Deploy"

---

## 四、部署后验证

部署成功后，Vercel会分配一个域名，如：
```
https://gaokao-assistant.vercel.app
```

### 测试接口：

```bash
# 1. 健康检查
curl https://你的域名.vercel.app/api/health

# 2. 查询分数线
curl "https://你的域名.vercel.app/api/score/query?minRank=10000&maxRank=20000&limit=5"

# 3. 专业列表
curl "https://你的域名.vercel.app/api/major/list?category=工学&limit=10"
```

---

## 五、重要说明

### 5.1 数据库文件
- SQLite数据库文件 `data/gaokao.db` 会随代码一起部署
- Vercel Serverless函数可以读取该文件
- **注意**：Vercel文件系统是只读的，写入操作会失败（测评码保存功能需要调整）

### 5.2 测评码存储方案调整
由于Vercel Serverless环境文件系统只读，测评码存储建议：

**方案1**：使用 Vercel KV（Redis）
```bash
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
```

**方案2**：简化为Coze变量存储（推荐）
- 不使用后端存储测评码
- 所有数据通过Coze变量传递

---

## 六、自定义域名（可选）

1. 在 Vercel Dashboard 进入项目设置
2. 点击 "Domains"
3. 添加你的自定义域名
4. 按提示配置 DNS

---

## 七、环境变量（如需要）

```bash
# 添加环境变量
vercel env add DATABASE_PATH

# 或在 Vercel Dashboard -> Settings -> Environment Variables 中添加
```

---

## 八、常见问题

### Q1: 部署失败 "Function limit exceeded"
- Vercel免费版函数大小限制50MB
- 当前数据库约5MB，无此问题

### Q2: API返回空数据
- 检查数据库文件是否正确上传
- 查看Vercel函数日志：`vercel logs`

### Q3: 跨域问题
- 已在 `api/index.js` 中配置 `cors`
- 如需限制来源，修改 `cors()` 配置

---

## 九、下一步

部署完成后，将API域名告知我，我会帮你：
1. 配置Coze Bot的工作流节点
2. 设置API调用参数
3. 完成端到端测试
