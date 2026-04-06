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

// 数据库初始化（延迟加载）
let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    
    // Vercel环境中，数据库文件路径
    const dbPath = path.join(process.cwd(), 'data', 'gaokao.db');
    
    if (!fs.existsSync(dbPath)) {
      throw new Error(`数据库文件不存在: ${dbPath}`);
    }
    
    const buffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(buffer);
  }
  return dbInstance;
}

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
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
      files: fs.existsSync(path.join(process.cwd(), 'data')) ? fs.readdirSync(path.join(process.cwd(), 'data')) : 'data目录不存在'
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
    
    const db = await getDb();
    
    let sql = `
      SELECT 
        ms.university_code,
        ms.university_name,
        ms.major_name,
        ms.min_score,
        ms.min_rank,
        ms.plan_count,
        m.holland_code,
        m.employment_difficulty,
        m.civil_servant_fit,
        m.category as major_category
      FROM major_score ms
      LEFT JOIN major m ON ms.major_name LIKE '%' || m.name || '%'
      WHERE 1=1
    `;
    const params = [];
    
    if (rank) {
      sql += ' AND ms.min_rank BETWEEN ? AND ?';
      params.push(rank - 10000, rank + 10000);
    }
    
    sql += ' ORDER BY ms.min_rank ASC LIMIT ?';
    params.push(limit);
    
    const result = db.exec(sql, params);
    
    if (result.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }
    
    const columns = result[0].columns;
    let results = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    
    // 计算匹配分数
    results = results.map(r => {
      let matchScore = 100;
      
      if (hollandCode && r.holland_code) {
        const commonCodes = hollandCode.split('').filter(c => r.holland_code.includes(c));
        matchScore += commonCodes.length * 10;
      }
      
      if (employmentPreference === 'work' && r.employment_difficulty === '高') {
        matchScore -= 30;
      }
      
      if (civilServantPlan && r.civil_servant_fit === '低') {
        matchScore -= 25;
      }
      
      if (mathScore === 'poor' || mathScore === 'average') {
        const mathIntensiveMajors = ['计算机', '软件', '数学', '统计', '金融', '人工智能'];
        if (mathIntensiveMajors.some(m => r.major_name.includes(m))) {
          matchScore -= 20;
        }
      }
      
      return { ...r, matchScore };
    });
    
    results.sort((a, b) => b.matchScore - a.matchScore);
    
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
 * 分数线查询
 * GET /api/score/query
 */
app.get('/api/score/query', async (req, res) => {
  try {
    const db = await getDb();
    
    let sql = 'SELECT * FROM major_score WHERE 1=1';
    const params = [];
    
    if (req.query.minRank) {
      sql += ' AND min_rank >= ?';
      params.push(parseInt(req.query.minRank));
    }
    
    if (req.query.maxRank) {
      sql += ' AND min_rank <= ?';
      params.push(parseInt(req.query.maxRank));
    }
    
    if (req.query.minScore) {
      sql += ' AND min_score >= ?';
      params.push(parseInt(req.query.minScore));
    }
    
    if (req.query.maxScore) {
      sql += ' AND min_score <= ?';
      params.push(parseInt(req.query.maxScore));
    }
    
    if (req.query.universityName) {
      sql += ' AND university_name LIKE ?';
      params.push(`%${req.query.universityName}%`);
    }
    
    if (req.query.majorName) {
      sql += ' AND major_name LIKE ?';
      params.push(`%${req.query.majorName}%`);
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    sql += ' ORDER BY min_rank ASC LIMIT ?';
    params.push(limit);
    
    const result = db.exec(sql, params);
    
    if (result.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }
    
    const columns = result[0].columns;
    const data = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    
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
    
    const db = await getDb();
    const result = db.exec('SELECT * FROM career_insight WHERE major_name = ?', [majorName]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '暂无该专业的职业洞察数据' });
    }
    
    const columns = result[0].columns;
    const row = result[0].values[0];
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    
    res.json({
      success: true,
      data: {
        ...obj,
        core_courses: obj.core_courses ? JSON.parse(obj.core_courses) : [],
        employment_direction: obj.employment_direction ? JSON.parse(obj.employment_direction) : [],
        pain_points: obj.pain_points ? JSON.parse(obj.pain_points) : []
      }
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
    const db = await getDb();
    
    let sql = 'SELECT * FROM major WHERE employment_difficulty IS NOT NULL';
    const params = [];
    
    if (req.query.category) {
      sql += ' AND category = ?';
      params.push(req.query.category);
    }
    
    if (req.query.employmentDifficulty) {
      sql += ' AND employment_difficulty = ?';
      params.push(req.query.employmentDifficulty);
    }
    
    if (req.query.civilServantFit) {
      sql += ' AND civil_servant_fit = ?';
      params.push(req.query.civilServantFit);
    }
    
    if (req.query.keyword) {
      sql += ' AND name LIKE ?';
      params.push(`%${req.query.keyword}%`);
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    sql += ' ORDER BY name LIMIT ?';
    params.push(limit);
    
    const result = db.exec(sql, params);
    
    if (result.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }
    
    const columns = result[0].columns;
    const data = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    
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
    const db = await getDb();
    
    let sql = 'SELECT * FROM university WHERE 1=1';
    const params = [];
    
    if (req.query.keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${req.query.keyword}%`, `%${req.query.keyword}%`);
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    sql += ' ORDER BY code LIMIT ?';
    params.push(limit);
    
    const result = db.exec(sql, params);
    
    if (result.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }
    
    const columns = result[0].columns;
    const data = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    
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
