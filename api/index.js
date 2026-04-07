/**
 * 高考志愿填报助手 - API服务 (Vercel Serverless兼容版)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 数据库模块
const db = require('../lib/database');

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    await db.initDb();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      dbStatus: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      cwd: process.cwd(),
      dataDirExists: fs.existsSync(path.join(process.cwd(), 'data')),
      dbFileExists: fs.existsSync(path.join(process.cwd(), 'data', 'gaokao.db'))
    });
  }
});

// 根路径
app.get('/', (req, res) => {
  res.json({ 
    message: '高考志愿填报助手API',
    version: '1.0.0',
    endpoints: [
      'GET  /api/health - 健康检查',
      'POST /api/recommend - 智能推荐',
      'GET  /api/score/query - 分数线查询',
      'GET  /api/insight - 职业洞察',
      'GET  /api/major/list - 专业列表',
      'GET  /api/university/list - 高校列表'
    ]
  });
});

/**
 * 智能推荐接口
 * POST /api/recommend
 */
app.post('/api/recommend', async (req, res) => {
  try {
    const { score, rank, hollandCode, employmentPreference, civilServantPlan, mathScore, limit = 80 } = req.body;
    
    if (!score && !rank) {
      return res.status(400).json({ error: '需要提供分数或位次' });
    }
    
    let results = [];
    
    if (rank) {
      results = await db.getMajorScoreByRank(rank, limit);
    } else if (score) {
      results = await db.getMajorScoreByScore(score, limit);
    }
    
    // 计算匹配分数
    const scoredResults = results.map(r => {
      let matchScore = 100;
      
      // 霍兰德代码匹配（简化版）
      if (hollandCode) {
        // 这里可以扩展更复杂的霍兰德匹配算法
        matchScore += 5; // 基础分
      }
      
      // 就业难度过滤
      if (employmentPreference === 'work') {
        // 这里可以连接专业表获取就业难度数据
        // 暂时简化处理
      }
      
      // 公务员适配性
      if (civilServantPlan) {
        // 这里可以连接专业表获取公务员适配数据
        // 暂时简化处理
      }
      
      // 数学能力过滤
      if (mathScore === 'poor' || mathScore === 'average') {
        const mathIntensiveMajors = ['计算机', '软件', '数学', '统计', '金融', '人工智能'];
        if (mathIntensiveMajors.some(m => r.major_name.includes(m))) {
          matchScore -= 20;
        }
      }
      
      return { ...r, matchScore };
    });
    
    // 按匹配分数排序
    scoredResults.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json({
      success: true,
      count: scoredResults.length,
      data: scoredResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 分数线查询
 * GET /api/score/query
 */
app.get('/api/score/query', async (req, res) => {
  try {
    const params = {
      minRank: req.query.minRank ? parseInt(req.query.minRank) : null,
      maxRank: req.query.maxRank ? parseInt(req.query.maxRank) : null,
      minScore: req.query.minScore ? parseInt(req.query.minScore) : null,
      maxScore: req.query.maxScore ? parseInt(req.query.maxScore) : null,
      universityName: req.query.universityName || null,
      majorName: req.query.majorName || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const data = await db.searchMajorScore(params);
    
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 职业洞察
 * GET /api/insight
 */
app.get('/api/insight', async (req, res) => {
  try {
    const { majorName } = req.query;
    
    if (!majorName) {
      return res.status(400).json({ error: '需要提供专业名称' });
    }
    
    const insight = await db.getCareerInsight(majorName);
    
    if (!insight) {
      return res.status(404).json({ error: '暂无该专业的职业洞察数据' });
    }
    
    // 解析JSON字段
    const data = {
      ...insight,
      core_courses: insight.core_courses ? JSON.parse(insight.core_courses) : [],
      employment_direction: insight.employment_direction ? JSON.parse(insight.employment_direction) : [],
      pain_points: insight.pain_points ? JSON.parse(insight.pain_points) : []
    };
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 专业列表查询
 * GET /api/major/list
 */
app.get('/api/major/list', async (req, res) => {
  try {
    const params = {
      category: req.query.category || null,
      employmentDifficulty: req.query.employmentDifficulty || null,
      civilServantFit: req.query.civilServantFit || null,
      keyword: req.query.keyword || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const data = await db.searchMajor(params);
    
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 高校列表查询
 * GET /api/university/list
 */
app.get('/api/university/list', async (req, res) => {
  try {
    const params = {
      keyword: req.query.keyword || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    
    const data = await db.searchUniversity(params);
    
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// 导出给Vercel Serverless
module.exports = app;
