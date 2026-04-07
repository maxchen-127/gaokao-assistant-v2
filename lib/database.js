/**
 * 数据库模块 - Vercel Serverless兼容版
 */
const path = require('path');
const fs = require('fs');

// 使用better-sqlite3替代sql.js，更适合Serverless环境
let dbInstance = null;

async function initDb() {
  if (!dbInstance) {
    try {
      // 尝试使用better-sqlite3
      const sqlite3 = require('better-sqlite3');
      
      // 数据库文件路径
      const dbPath = path.join(process.cwd(), 'data', 'gaokao.db');
      
      if (!fs.existsSync(dbPath)) {
        throw new Error(`数据库文件不存在: ${dbPath}`);
      }
      
      dbInstance = sqlite3(dbPath, { readonly: true });
      console.log('better-sqlite3数据库连接成功');
    } catch (error) {
      console.error('better-sqlite3加载失败:', error.message);
      console.log('尝试使用内存数据库模式');
      
      // 备用方案：使用内存数据库
      const sqlite3 = require('better-sqlite3');
      dbInstance = sqlite3(':memory:', { readonly: false });
      
      // 创建基础表结构
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS major_score (
          university_code TEXT,
          university_name TEXT,
          major_name TEXT,
          min_score INTEGER,
          min_rank INTEGER,
          plan_count INTEGER
        );
      `);
      
      console.log('内存数据库创建成功');
    }
  }
  return dbInstance;
}

async function query(sql, params = []) {
  const db = await initDb();
  try {
    const stmt = db.prepare(sql);
    const result = stmt.all(params);
    return result;
  } catch (error) {
    console.error('查询失败:', error.message);
    return [];
  }
}

async function getMajorScoreByRank(rank, limit = 80) {
  const sql = `
    SELECT 
      university_code,
      university_name,
      major_name,
      min_score,
      min_rank,
      plan_count
    FROM major_score 
    WHERE min_rank BETWEEN ? AND ?
    ORDER BY min_rank ASC 
    LIMIT ?
  `;
  return await query(sql, [rank - 10000, rank + 10000, limit]);
}

async function getMajorScoreByScore(score, limit = 80) {
  const sql = `
    SELECT 
      university_code,
      university_name,
      major_name,
      min_score,
      min_rank,
      plan_count
    FROM major_score 
    WHERE min_score BETWEEN ? AND ?
    ORDER BY min_score DESC 
    LIMIT ?
  `;
  return await query(sql, [score - 20, score + 20, limit]);
}

async function searchMajorScore(params) {
  let sql = 'SELECT * FROM major_score WHERE 1=1';
  const queryParams = [];
  
  if (params.minRank) {
    sql += ' AND min_rank >= ?';
    queryParams.push(params.minRank);
  }
  
  if (params.maxRank) {
    sql += ' AND min_rank <= ?';
    queryParams.push(params.maxRank);
  }
  
  if (params.minScore) {
    sql += ' AND min_score >= ?';
    queryParams.push(params.minScore);
  }
  
  if (params.maxScore) {
    sql += ' AND min_score <= ?';
    queryParams.push(params.maxScore);
  }
  
  if (params.universityName) {
    sql += ' AND university_name LIKE ?';
    queryParams.push(`%${params.universityName}%`);
  }
  
  if (params.majorName) {
    sql += ' AND major_name LIKE ?';
    queryParams.push(`%${params.majorName}%`);
  }
  
  sql += ' ORDER BY min_rank ASC LIMIT ?';
  queryParams.push(params.limit || 100);
  
  return await query(sql, queryParams);
}

async function getCareerInsight(majorName) {
  const sql = 'SELECT * FROM career_insight WHERE major_name = ?';
  const result = await query(sql, [majorName]);
  return result.length > 0 ? result[0] : null;
}

async function searchMajor(params) {
  let sql = 'SELECT * FROM major WHERE employment_difficulty IS NOT NULL';
  const queryParams = [];
  
  if (params.category) {
    sql += ' AND category = ?';
    queryParams.push(params.category);
  }
  
  if (params.employmentDifficulty) {
    sql += ' AND employment_difficulty = ?';
    queryParams.push(params.employmentDifficulty);
  }
  
  if (params.civilServantFit) {
    sql += ' AND civil_servant_fit = ?';
    queryParams.push(params.civilServantFit);
  }
  
  if (params.keyword) {
    sql += ' AND name LIKE ?';
    queryParams.push(`%${params.keyword}%`);
  }
  
  sql += ' ORDER BY name LIMIT ?';
  queryParams.push(params.limit || 100);
  
  return await query(sql, queryParams);
}

async function searchUniversity(params) {
  let sql = 'SELECT * FROM university WHERE 1=1';
  const queryParams = [];
  
  if (params.keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`);
  }
  
  sql += ' ORDER BY code LIMIT ?';
  queryParams.push(params.limit || 50);
  
  return await query(sql, queryParams);
}

module.exports = {
  initDb,
  query,
  getMajorScoreByRank,
  getMajorScoreByScore,
  searchMajorScore,
  getCareerInsight,
  searchMajor,
  searchUniversity
};
