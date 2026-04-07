/**
 * 数据库模块 - Vercel Serverless兼容版
 */
const path = require('path');
const fs = require('fs');

// 使用sqlite3的异步API
let dbInstance = null;

async function initDb() {
  if (!dbInstance) {
    try {
      const sqlite3 = require('sqlite3').verbose();
      const { Database, OPEN_READONLY } = sqlite3;
      
      // 数据库文件路径
      const dbPath = path.join(process.cwd(), 'data', 'gaokao.db');
      
      if (!fs.existsSync(dbPath)) {
        throw new Error(`数据库文件不存在: ${dbPath}`);
      }
      
      // 创建Promise包装的数据库连接
      dbInstance = await new Promise((resolve, reject) => {
        const db = new Database(dbPath, OPEN_READONLY, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('SQLite数据库连接成功');
            resolve(db);
          }
        });
      });
    } catch (error) {
      console.error('SQLite加载失败:', error.message);
      throw error;
    }
  }
  return dbInstance;
}

async function query(sql, params = []) {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('查询失败:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
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
