/**
 * 数据库操作模块 - 使用sql.js（Vercel Serverless兼容）
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/gaokao.db');
let db = null;
let SQL = null;

/**
 * 初始化数据库
 */
async function initDb() {
  if (!db) {
    SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  }
  return db;
}

/**
 * 查询高校列表
 */
async function queryUniversities(options = {}) {
  const { keyword, province, limit = 50, offset = 0 } = options;
  const database = await initDb();
  
  let sql = 'SELECT * FROM university WHERE 1=1';
  const params = [];
  
  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY code LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const result = database.exec(sql, params);
  return result.length > 0 ? result[0].values.map(row => {
    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];
}

/**
 * 查询专业录取分数线
 */
async function queryMajorScores(options = {}) {
  const database = await initDb();
  const {
    minRank,
    maxRank,
    minScore,
    maxScore,
    universityCode,
    universityName,
    majorName,
    limit = 100,
    offset = 0
  } = options;
  
  let sql = `
    SELECT ms.*, u.level, u.type
    FROM major_score ms
    LEFT JOIN university u ON ms.university_code = u.code
    WHERE 1=1
  `;
  const params = [];
  
  if (minRank !== undefined && minRank !== null) {
    sql += ' AND ms.min_rank >= ?';
    params.push(minRank);
  }
  
  if (maxRank !== undefined && maxRank !== null) {
    sql += ' AND ms.min_rank <= ?';
    params.push(maxRank);
  }
  
  if (minScore !== undefined && minScore !== null) {
    sql += ' AND ms.min_score >= ?';
    params.push(minScore);
  }
  
  if (maxScore !== undefined && maxScore !== null) {
    sql += ' AND ms.min_score <= ?';
    params.push(maxScore);
  }
  
  if (universityCode) {
    sql += ' AND ms.university_code = ?';
    params.push(universityCode);
  }
  
  if (universityName) {
    sql += ' AND ms.university_name LIKE ?';
    params.push(`%${universityName}%`);
  }
  
  if (majorName) {
    sql += ' AND ms.major_name LIKE ?';
    params.push(`%${majorName}%`);
  }
  
  sql += ' ORDER BY ms.min_rank ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const result = database.exec(sql, params);
  return result.length > 0 ? result[0].values.map(row => {
    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];
}

/**
 * 查询专业信息
 */
async function queryMajors(options = {}) {
  const database = await initDb();
  const { keyword, category, hollandCode, employmentDifficulty, civilServantFit, limit = 100 } = options;
  
  let sql = 'SELECT * FROM major WHERE employment_difficulty IS NOT NULL';
  const params = [];
  
  if (keyword) {
    sql += ' AND name LIKE ?';
    params.push(`%${keyword}%`);
  }
  
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  
  if (hollandCode) {
    sql += ' AND holland_code LIKE ?';
    params.push(`%${hollandCode}%`);
  }
  
  if (employmentDifficulty) {
    sql += ' AND employment_difficulty = ?';
    params.push(employmentDifficulty);
  }
  
  if (civilServantFit) {
    sql += ' AND civil_servant_fit = ?';
    params.push(civilServantFit);
  }
  
  sql += ' ORDER BY name LIMIT ?';
  params.push(limit);
  
  const result = database.exec(sql, params);
  return result.length > 0 ? result[0].values.map(row => {
    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];
}

/**
 * 查询职业洞察
 */
async function queryCareerInsight(majorName) {
  const database = await initDb();
  const sql = 'SELECT * FROM career_insight WHERE major_name = ?';
  const result = database.exec(sql, [majorName]);
  
  if (result.length > 0 && result[0].values.length > 0) {
    const columns = result[0].columns;
    const row = result[0].values[0];
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    
    return {
      ...obj,
      core_courses: obj.core_courses ? JSON.parse(obj.core_courses) : [],
      employment_direction: obj.employment_direction ? JSON.parse(obj.employment_direction) : [],
      pain_points: obj.pain_points ? JSON.parse(obj.pain_points) : []
    };
  }
  return null;
}

/**
 * 生成推荐志愿列表
 */
async function generateRecommendations(params) {
  const database = await initDb();
  const {
    score,
    rank,
    hollandCode,
    employmentPreference,
    civilServantPlan,
    mathScore,
    limit = 80
  } = params;
  
  let sql = `
    SELECT 
      ms.*,
      m.holland_code,
      m.employment_difficulty,
      m.civil_servant_fit,
      m.category as major_category,
      m.subject_requirement,
      u.level,
      u.type
    FROM major_score ms
    LEFT JOIN major m ON ms.major_name LIKE '%' || m.name || '%'
    LEFT JOIN university u ON ms.university_code = u.code
    WHERE 1=1
  `;
  const queryParams = [];
  
  if (rank) {
    sql += ' AND ms.min_rank BETWEEN ? AND ?';
    queryParams.push(rank - 10000, rank + 10000);
  }
  
  const result = database.exec(sql, queryParams);
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  let results = result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
  
  results = results.map(r => ({
    universityCode: r.university_code,
    universityName: r.university_name,
    majorName: r.major_name,
    minScore: r.min_score,
    minRank: r.min_rank,
    planCount: r.plan_count,
    hollandCode: r.holland_code,
    employmentDifficulty: r.employment_difficulty,
    civilServantFit: r.civil_servant_fit,
    majorCategory: r.major_category,
    matchScore: 0
  }));
  
  results = results.map(r => {
    let matchScore = 100;
    
    if (hollandCode && r.hollandCode) {
      const commonCodes = hollandCode.split('').filter(c => r.hollandCode.includes(c));
      matchScore += commonCodes.length * 10;
    }
    
    if (employmentPreference === 'work' && r.employmentDifficulty === '高') {
      matchScore -= 30;
    }
    
    if (civilServantPlan && r.civilServantFit === '低') {
      matchScore -= 25;
    }
    
    if (mathScore === 'poor' || mathScore === 'average') {
      const mathIntensiveMajors = ['计算机', '软件', '数学', '统计', '金融', '人工智能'];
      if (mathIntensiveMajors.some(m => r.majorName.includes(m))) {
        matchScore -= 20;
      }
    }
    
    return { ...r, matchScore };
  });
  
  results.sort((a, b) => b.matchScore - a.matchScore);
  
  return results.slice(0, limit);
}

/**
 * 保存测评码（Vercel Serverless环境无法写入文件，返回模拟成功）
 */
async function saveAssessmentCode(code, hollandCode, hollandScores) {
  // 在Serverless环境中，测评码存储需要使用外部服务（如Redis）
  // 这里返回成功，实际存储由Coze变量处理
  return true;
}

/**
 * 获取测评码信息
 */
async function getAssessmentCode(code) {
  // 在Serverless环境中，测评码存储需要使用外部服务
  return null;
}

module.exports = {
  initDb,
  queryUniversities,
  queryMajorScores,
  queryMajors,
  queryCareerInsight,
  generateRecommendations,
  saveAssessmentCode,
  getAssessmentCode
};