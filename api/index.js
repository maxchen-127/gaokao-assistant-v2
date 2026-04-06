/**
 * 高考志愿填报助手 - API服务
 */
const express = require('express');
const cors = require('cors');
const db = require('../lib/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    await db.initDb();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * 测评结果保存
 * POST /api/assessment/save
 * Body: { code, hollandCode, hollandScores }
 */
app.post('/api/assessment/save', async (req, res) => {
  try {
    const { code, hollandCode, hollandScores } = req.body;
    
    if (!code || !hollandCode) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const success = await db.saveAssessmentCode(code, hollandCode, hollandScores);
    res.json({ success, code, hollandCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 测评结果获取
 * GET /api/assessment/get?code=XXXXX
 */
app.get('/api/assessment/get', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: '缺少测评码' });
    }
    
    const result = await db.getAssessmentCode(code);
    
    if (!result) {
      return res.status(404).json({ error: '测评码不存在或已过期' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 智能推荐接口
 * POST /api/recommend
 * Body: { score, rank, hollandCode, employmentPreference, civilServantPlan, mathScore }
 */
app.post('/api/recommend', async (req, res) => {
  try {
    const params = req.body;
    
    if (!params.score && !params.rank) {
      return res.status(400).json({ error: '需要提供分数或位次' });
    }
    
    const recommendations = await db.generateRecommendations(params);
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 分数线查询
 * GET /api/score/query?minRank=10000&maxRank=20000&majorName=计算机
 */
app.get('/api/score/query', async (req, res) => {
  try {
    const options = {
      minRank: req.query.minRank ? parseInt(req.query.minRank) : undefined,
      maxRank: req.query.maxRank ? parseInt(req.query.maxRank) : undefined,
      minScore: req.query.minScore ? parseInt(req.query.minScore) : undefined,
      maxScore: req.query.maxScore ? parseInt(req.query.maxScore) : undefined,
      universityName: req.query.universityName,
      majorName: req.query.majorName,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const results = await db.queryMajorScores(options);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 职业洞察
 * GET /api/insight?majorName=计算机科学与技术
 */
app.get('/api/insight', async (req, res) => {
  try {
    const { majorName } = req.query;
    
    if (!majorName) {
      return res.status(400).json({ error: '需要提供专业名称' });
    }
    
    const insight = await db.queryCareerInsight(majorName);
    
    if (!insight) {
      return res.status(404).json({ error: '暂无该专业的职业洞察数据' });
    }
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 专业列表查询
 * GET /api/major/list?category=工学&employmentDifficulty=低
 */
app.get('/api/major/list', async (req, res) => {
  try {
    const options = {
      category: req.query.category,
      employmentDifficulty: req.query.employmentDifficulty,
      civilServantFit: req.query.civilServantFit,
      hollandCode: req.query.hollandCode,
      keyword: req.query.keyword,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const results = await db.queryMajors(options);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 高校列表查询
 * GET /api/university/list?keyword=浙江
 */
app.get('/api/university/list', async (req, res) => {
  try {
    const options = {
      keyword: req.query.keyword,
      province: req.query.province,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    
    const results = await db.queryUniversities(options);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 API服务已启动: http://localhost:${PORT}`);
    console.log(`📋 API文档:`);
    console.log(`   POST /api/assessment/save   - 保存测评结果`);
    console.log(`   GET  /api/assessment/get    - 获取测评结果`);
    console.log(`   POST /api/recommend         - 智能推荐`);
    console.log(`   GET  /api/score/query       - 分数线查询`);
    console.log(`   GET  /api/insight           - 职业洞察`);
    console.log(`   GET  /api/major/list        - 专业列表`);
    console.log(`   GET  /api/university/list   - 高校列表`);
  });
}

module.exports = app;