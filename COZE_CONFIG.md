# 高考志愿填报助手 - Coze Bot配置指南

## 一、Bot基本信息

| 配置项 | 推荐值 |
|-------|-------|
| Bot名称 | 浙江高考志愿填报助手 |
| 描述 | 基于智能算法，为浙江高三考生提供志愿填报决策支持 |
| 图标 | 教育类图标，或自定义上传 |
| 模式 | 单Agent（单聊模式） |

---

## 二、人设与提示词

### 系统提示词

```
你是浙江省高考志愿填报助手，专门为浙江省高三考生及家长提供志愿填报决策支持。

## 你的职责
1. 通过对话了解考生的成绩、性格特点、职业倾向、家庭经济状况等信息
2. 基于霍兰德职业兴趣理论进行测评分析
3. 结合考生约束条件（本科就业/考研、考公计划等）筛选适合的专业
4. 根据高考位次推荐匹配的高校和专业组合
5. 提供专业的职业洞察，帮助考生了解专业前景
6. 最终生成结构化的志愿填报推荐报告

## 交互规则
- 家长主导决策，学生配合测评
- 使用变量存储用户信息，支持跨会话继续
- 分步骤收集信息，不要一次性问太多问题
- 输出结构清晰，使用表格和列表组织信息
- 保持专业但亲切的语气

## 数据范围
- 覆盖浙江省2025年高考第一段平行投档数据
- 17890条专业录取分数线
- 1291所高校信息

## 约束条件处理
- 如果考生计划本科后就业，需要标注哪些专业本科就业困难（如药学、生物科学等）
- 如果考生计划考公务员，需要优先推荐公务员岗位多的专业（如法学、计算机、会计等）
- 如果考生数学成绩一般，需要提示避开数学要求高的专业（如软件开发、算法等）
```

---

## 三、变量配置

| 变量名 | 类型 | 说明 | 初始值 |
|-------|------|------|-------|
| `student_name` | String | 考生姓名 | 空 |
| `student_score` | Number | 高考分数 | 0 |
| `student_rank` | Number | 高考位次（预估） | 0 |
| `holland_code` | String | 霍兰德职业兴趣码 | 空 |
| `holland_scores` | Object | 霍兰德各维度得分 | {} |
| `employment_pref` | String | 就业偏好（work/grad_school） | 空 |
| `civil_servant` | Boolean | 是否计划考公 | false |
| `math_level` | String | 数学成绩等级（excellent/good/average/poor） | 空 |
| `budget` | String | 家庭经济预算（低/中/高） | 空 |
| `assessment_code` | String | 测评码（用于恢复数据） | 空 |
| `recommendations` | Array | 推荐结果缓存 | [] |

---

## 四、工作流节点配置

### 节点1：信息收集工作流

**触发条件**：用户首次对话或输入"开始"

**工作流设计**：
```
开始节点
    ↓
条件判断：变量student_name是否为空？
    ├─ 是 → 提问节点："您好！我是浙江高考志愿填报助手。请问考生的姓名是？"
    └─ 否 → 条件判断：变量student_score是否为0？
              ├─ 是 → 提问节点："请输入考生最近一次大考的分数（满分750）："
              └─ 否 → 条件判断：变量holland_code是否为空？
                        ├─ 是 → 跳转到测评工作流
                        └─ 否 → 跳转到推荐工作流
```

### 节点2：霍兰德测评工作流

**触发条件**：变量holland_code为空且student_score已填写

**工作流设计**：
```
开始节点
    ↓
表单卡片：展示测评说明
    ↓
循环提问：从题库中随机抽取10道题
    ↓
计算得分：统计RIASEC六个维度的得分
    ↓
生成霍兰德码：取前2-3个高分字母组合
    ↓
变量赋值：holland_code, holland_scores
    ↓
输出节点：展示测评结果和职业倾向说明
    ↓
继续收集：提问约束条件（就业偏好、考公计划）
```

**表单卡片JSON配置**：
```json
{
  "type": "form",
  "title": "霍兰德职业兴趣测评",
  "description": "请根据你的真实想法选择最符合的选项",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "question": "你更喜欢哪种工作方式？",
      "options": [
        {"label": "独立研究和解决技术难题", "value": "R"},
        {"label": "进行科学实验和分析数据", "value": "I"},
        {"label": "创作艺术作品或设计方案", "value": "A"},
        {"label": "帮助他人解决心理问题", "value": "S"},
        {"label": "组织团队完成项目目标", "value": "E"},
        {"label": "处理财务数据和制作报表", "value": "C"}
      ]
    }
  ]
}
```

### 节点3：推荐算法工作流

**触发条件**：所有必要变量已填写

**工作流设计**：
```
开始节点
    ↓
HTTP请求节点：POST {API_BASE_URL}/api/recommend
    Body: {
        "score": {{student_score}},
        "rank": {{student_rank}},
        "hollandCode": "{{holland_code}}",
        "employmentPreference": "{{employment_pref}}",
        "civilServantPlan": {{civil_servant}},
        "mathScore": "{{math_level}}"
    }
    ↓
变量赋值：recommendations = 响应数据
    ↓
输出节点：展示推荐结果（按匹配度排序）
```

### 节点4：分数线查询工作流

**触发条件**：用户询问某高校或专业的分数线

**工作流设计**：
```
开始节点
    ↓
意图识别：提取高校名称/专业名称/位次范围
    ↓
HTTP请求节点：GET {API_BASE_URL}/api/score/query
    Query: ?universityName=XX&majorName=XX&minRank=XX&maxRank=XX
    ↓
格式化输出：表格展示查询结果
```

### 节点5：职业洞察工作流

**触发条件**：用户点击某专业详情

**工作流设计**：
```
开始节点
    ↓
HTTP请求节点：GET {API_BASE_URL}/api/insight
    Query: ?majorName={{选中的专业名称}}
    ↓
格式化输出：职业洞察卡片
```

### 节点6：报告生成工作流

**触发条件**：用户确认推荐结果

**工作流设计**：
```
开始节点
    ↓
内容聚合：收集所有变量和推荐结果
    ↓
LLM节点：生成结构化报告
    Prompt: 根据以下信息生成志愿填报推荐报告...
    ↓
输出节点：展示完整报告
    ↓
保存功能：生成测评码（使用变量缓存）
```

---

## 五、API调用配置

### 环境变量设置

在Coze Bot的「设置」→「环境变量」中添加：

| 变量名 | 值 | 说明 |
|-------|---|------|
| `API_BASE_URL` | `https://你的域名.vercel.app` | 部署后的API地址 |

### HTTP请求节点示例

**智能推荐接口**：
```
方法: POST
URL: {{API_BASE_URL}}/api/recommend
Headers:
  Content-Type: application/json
Body:
{
  "score": {{student_score}},
  "rank": {{student_rank}},
  "hollandCode": "{{holland_code}}",
  "employmentPreference": "{{employment_pref}}",
  "civilServantPlan": {{civil_servant}},
  "mathScore": "{{math_level}}"
}
```

**分数线查询接口**：
```
方法: GET
URL: {{API_BASE_URL}}/api/score/query?minRank={{min_rank}}&maxRank={{max_rank}}&limit=20
```

**职业洞察接口**：
```
方法: GET
URL: {{API_BASE_URL}}/api/insight?majorName={{major_name}}
```

---

## 六、数据库表结构参考

用于理解API返回的数据结构：

### major_score 表（录取分数）
| 字段 | 类型 | 说明 |
|-----|------|------|
| university_code | String | 高校代号 |
| university_name | String | 高校名称 |
| major_name | String | 专业名称 |
| min_score | Number | 最低分数线 |
| min_rank | Number | 最低位次 |
| plan_count | Number | 招生计划数 |

### career_insight 表（职业洞察）
| 字段 | 类型 | 说明 |
|-----|------|------|
| major_name | String | 专业名称 |
| overview | String | 专业概述 |
| employment_difficulty | String | 就业难度（低/中/高） |
| civil_servant_fit | String | 考公适配度（低/中/高） |
| salary_fresh | String | 应届薪资范围 |
| workload_overtime | String | 加班情况 |

---

## 七、测试用例

### 测试场景1：完整流程
```
用户输入："开始"
Bot响应："您好！我是浙江高考志愿填报助手。请问考生的姓名是？"

用户输入："张三"
Bot响应："好的，张三同学。请输入最近一次大考的分数（满分750）："

用户输入："580"
Bot响应："收到，580分。是否了解预估高考位次？（如有请输入，无请输入'跳过'）"

用户输入："45000"
Bot响应："好的，现在让我们开始职业兴趣测评..."

[测评完成后]

Bot响应："测评完成！你的霍兰德码是：SEC（社会型-企业型-常规型）"

[继续收集约束条件]

Bot响应："请问张三同学是否有以下计划？
1. 本科毕业后直接就业
2. 准备考研深造"

用户输入："1"
Bot响应："是否计划报考公务员？"
用户输入："是"

Bot响应："好的，正在为你生成推荐..."

[展示推荐结果]
```

### 测试场景2：恢复数据
```
用户输入："我的测评码是ABC123"
Bot响应："正在恢复你的测评数据..."
[调用API获取数据并恢复变量]
Bot响应："欢迎回来，张三同学！上次我们进行到推荐环节，是否继续？"
```

---

## 八、发布与部署

### 8.1 发布Bot
1. 在Coze平台完成所有节点配置
2. 点击「测试」进行调试
3. 测试通过后点击「发布」
4. 选择发布渠道（Web预览链接/飞书/微信公众号等）

### 8.2 Web预览链接
- 发布后在Bot详情页获取预览链接
- 可直接分享给用户访问
- 支持嵌入到网页中

---

## 九、常见问题

### Q1: 如何处理测评码存储？
由于Vercel Serverless环境文件系统只读，建议：
- 在Coze中使用变量存储
- 或者使用Vercel KV（Redis）

### Q2: 如何更新数据库？
- 本地修改 `data/gaokao.db` 文件
- 重新执行 `vercel --prod` 部署

### Q3: 如何监控API调用？
- 在Vercel Dashboard查看函数日志
- 使用 `vercel logs` 命令查看实时日志
