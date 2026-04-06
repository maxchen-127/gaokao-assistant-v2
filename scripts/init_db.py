#!/usr/bin/env python3
"""
高考志愿填报助手 - 数据库初始化脚本
"""
import sqlite3
import pandas as pd
import json
import os

# 配置
DB_PATH = 'data/gaokao.db'
EXCEL_PATH = '../浙江省2025年普通高校招生普通类第一段平行投档分数线表.xls'

def create_tables(conn):
    """创建数据库表"""
    cursor = conn.cursor()
    
    # 高校信息表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS university (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(20) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            province VARCHAR(20) DEFAULT '浙江',
            city VARCHAR(50),
            level VARCHAR(20),
            type VARCHAR(20),
            tuition_min INTEGER,
            tuition_max INTEGER,
            website VARCHAR(200),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 专业信息表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS major (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(20),
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            subcategory VARCHAR(50),
            duration INTEGER DEFAULT 4,
            degree VARCHAR(20),
            subject_requirement VARCHAR(100),
            holland_code VARCHAR(10),
            employment_difficulty VARCHAR(10) DEFAULT '中',
            civil_servant_fit VARCHAR(10) DEFAULT '中',
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 专业录取分数表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS major_score (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            university_code VARCHAR(20) NOT NULL,
            major_code VARCHAR(20),
            university_name VARCHAR(100) NOT NULL,
            major_name VARCHAR(100) NOT NULL,
            year INTEGER NOT NULL DEFAULT 2025,
            plan_count INTEGER,
            min_score DECIMAL(5,2),
            min_rank INTEGER,
            avg_score DECIMAL(5,2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 测评码表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assessment_code (
            code VARCHAR(6) PRIMARY KEY,
            holland_code VARCHAR(10) NOT NULL,
            holland_scores TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            used_count INTEGER DEFAULT 1,
            last_used_at DATETIME
        )
    ''')
    
    # 职业洞察表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS career_insight (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            major_name VARCHAR(100) NOT NULL UNIQUE,
            overview TEXT,
            core_courses TEXT,
            employment_direction TEXT,
            salary_fresh VARCHAR(50),
            salary_3year VARCHAR(50),
            salary_5year VARCHAR(50),
            workload_overtime VARCHAR(20),
            workload_travel VARCHAR(20),
            employment_difficulty VARCHAR(10),
            civil_servant_fit VARCHAR(10),
            pain_points TEXT,
            suitable_traits TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_university_code ON university(code)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_major_name ON major(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_major_holland ON major(holland_code)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_score_university ON major_score(university_code)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_score_rank ON major_score(min_rank)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_score_score ON major_score(min_score)')
    
    conn.commit()
    print("✅ 数据库表创建完成")

def import_excel_data(conn):
    """导入Excel数据"""
    print("📥 开始导入Excel数据...")
    df = pd.read_excel(EXCEL_PATH)
    
    cursor = conn.cursor()
    
    # 提取唯一高校信息
    universities = df[['学校代号', '学校名称']].drop_duplicates()
    universities.columns = ['code', 'name']
    
    for _, row in universities.iterrows():
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO university (code, name)
                VALUES (?, ?)
            ''', (str(row['code']), row['name']))
        except Exception as e:
            pass
    
    conn.commit()
    print(f"  ✅ 导入高校: {len(universities)} 所")
    
    # 导入录取分数数据
    for _, row in df.iterrows():
        try:
            cursor.execute('''
                INSERT INTO major_score 
                (university_code, major_code, university_name, major_name, plan_count, min_score, min_rank, year)
                VALUES (?, ?, ?, ?, ?, ?, ?, 2025)
            ''', (
                str(row['学校代号']),
                str(row['专业代号']),
                row['学校名称'],
                row['专业名称'],
                int(row['计划数']) if pd.notna(row['计划数']) else None,
                int(row['分数线']) if pd.notna(row['分数线']) else None,
                int(row['位次']) if pd.notna(row['位次']) else None
            ))
        except Exception as e:
            pass
    
    conn.commit()
    print(f"  ✅ 导入录取数据: {len(df)} 条")
    
    # 提取唯一专业名称（用于后续补充信息）
    majors = df[['专业名称']].drop_duplicates()
    majors.columns = ['name']
    
    for _, row in majors.iterrows():
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO major (name)
                VALUES (?)
            ''', (row['name'],))
        except Exception as e:
            pass
    
    conn.commit()
    print(f"  ✅ 导入专业名称: {len(majors)} 个")

def import_seed_data(conn):
    """导入种子数据（就业难度、考公适配度等）"""
    print("📊 导入种子数据...")
    
    # 就业难度和考公适配度标注数据
    employment_data = {
        # 高就业难度（本科难就业，建议考研）
        '药学': {'employment_difficulty': '高', 'civil_servant_fit': '中', 'category': '医学', 'holland_code': 'IRC'},
        '生物科学': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '理学', 'holland_code': 'IR'},
        '生物医学工程': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '工学', 'holland_code': 'RI'},
        '材料科学与工程': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '工学', 'holland_code': 'RI'},
        '基础医学': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '医学', 'holland_code': 'IR'},
        '应用心理学': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '理学', 'holland_code': 'SI'},
        '材料化学': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '工学', 'holland_code': 'IR'},
        '生物技术': {'employment_difficulty': '高', 'civil_servant_fit': '低', 'category': '理学', 'holland_code': 'IR'},
        
        # 低就业难度（本科易就业）
        '计算机科学与技术': {'employment_difficulty': '低', 'civil_servant_fit': '高', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '软件工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '电子信息工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '电气工程及其自动化': {'employment_difficulty': '低', 'civil_servant_fit': '高', 'category': '工学', 'holland_code': 'RC', 'subject_requirement': '物理'},
        '机械工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RC', 'subject_requirement': '物理'},
        '自动化': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '通信工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '土木工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RC', 'subject_requirement': '物理'},
        '会计学': {'employment_difficulty': '低', 'civil_servant_fit': '高', 'category': '管理学', 'holland_code': 'CE'},
        '护理学': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '医学', 'holland_code': 'SC'},
        '财务管理': {'employment_difficulty': '低', 'civil_servant_fit': '高', 'category': '管理学', 'holland_code': 'CE'},
        '金融学': {'employment_difficulty': '低', 'civil_servant_fit': '高', 'category': '经济学', 'holland_code': 'EC'},
        '数据科学与大数据技术': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '人工智能': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '物联网工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '网络工程': {'employment_difficulty': '低', 'civil_servant_fit': '中', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        '信息安全': {'employment_difficulty': '低', 'civil_servant_fit': '高', 'category': '工学', 'holland_code': 'RI', 'subject_requirement': '物理'},
        
        # 中等就业难度
        '法学': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '法学', 'holland_code': 'ES'},
        '临床医学': {'employment_difficulty': '中', 'civil_servant_fit': '中', 'category': '医学', 'holland_code': 'IS'},
        '汉语言文学': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '文学', 'holland_code': 'AS'},
        '英语': {'employment_difficulty': '中', 'civil_servant_fit': '中', 'category': '文学', 'holland_code': 'AS'},
        '工商管理': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '管理学', 'holland_code': 'EC'},
        '行政管理': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '管理学', 'holland_code': 'EC'},
        '新闻学': {'employment_difficulty': '中', 'civil_servant_fit': '中', 'category': '文学', 'holland_code': 'AE'},
        '经济学': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '经济学', 'holland_code': 'EC'},
        '国际经济与贸易': {'employment_difficulty': '中', 'civil_servant_fit': '中', 'category': '经济学', 'holland_code': 'EC'},
        '人力资源管理': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '管理学', 'holland_code': 'EC'},
        '公共事业管理': {'employment_difficulty': '中', 'civil_servant_fit': '高', 'category': '管理学', 'holland_code': 'EC'},
    }
    
    cursor = conn.cursor()
    updated_count = 0
    
    for major_name, data in employment_data.items():
        cursor.execute('''
            UPDATE major 
            SET employment_difficulty = ?, 
                civil_servant_fit = ?, 
                category = ?,
                holland_code = ?,
                subject_requirement = COALESCE(?, subject_requirement)
            WHERE name LIKE ?
        ''', (
            data['employment_difficulty'],
            data['civil_servant_fit'],
            data['category'],
            data['holland_code'],
            data.get('subject_requirement'),
            f'%{major_name}%'
        ))
        updated_count += cursor.rowcount
    
    conn.commit()
    print(f"  ✅ 更新专业标注: {updated_count} 条")
    
    # 插入职业洞察数据
    career_insights = [
        {
            'major_name': '计算机科学与技术',
            'overview': '计算机科学与技术是研究计算机系统及其应用的基础学科，涵盖软件、硬件、理论和应用等多个方向。',
            'core_courses': json.dumps(['程序设计基础', '数据结构与算法', '计算机组成原理', '操作系统', '计算机网络', '数据库原理', '软件工程', '人工智能导论'], ensure_ascii=False),
            'employment_direction': json.dumps(['软件开发工程师', '算法工程师', '测试工程师', '产品经理', '公务员'], ensure_ascii=False),
            'salary_fresh': '8-15K/月',
            'salary_3year': '15-25K/月',
            'salary_5year': '25-40K/月',
            'workload_overtime': '一般',
            'workload_travel': '较少',
            'employment_difficulty': '低',
            'civil_servant_fit': '高',
            'pain_points': json.dumps(['35岁危机', '技术迭代快', '部分公司加班严重'], ensure_ascii=False),
            'suitable_traits': '逻辑思维强、喜欢钻研技术、能接受持续学习'
        },
        {
            'major_name': '软件工程',
            'overview': '软件工程是研究软件开发、维护和管理的工程学科，注重软件质量和开发效率。',
            'core_courses': json.dumps(['软件工程导论', '面向对象程序设计', 'Web开发技术', '软件测试', '软件项目管理', '数据库应用开发', '移动应用开发'], ensure_ascii=False),
            'employment_direction': json.dumps(['前端工程师', '后端工程师', '全栈工程师', '测试工程师', '项目经理'], ensure_ascii=False),
            'salary_fresh': '8-14K/月',
            'salary_3year': '14-22K/月',
            'salary_5year': '22-35K/月',
            'workload_overtime': '一般',
            'workload_travel': '较少',
            'employment_difficulty': '低',
            'civil_servant_fit': '中',
            'pain_points': json.dumps(['加班较多', '需求变更频繁', '技术更新快'], ensure_ascii=False),
            'suitable_traits': '逻辑思维强、善于沟通、注重细节'
        },
        {
            'major_name': '电子信息工程',
            'overview': '电子信息工程是研究电子设备与信息系统设计、开发、应用的工程学科。',
            'core_courses': json.dumps(['电路分析', '模拟电子技术', '数字电子技术', '信号与系统', '数字信号处理', '通信原理', '微机原理', '嵌入式系统'], ensure_ascii=False),
            'employment_direction': json.dumps(['硬件工程师', '嵌入式开发工程师', '通信工程师', '芯片设计工程师'], ensure_ascii=False),
            'salary_fresh': '7-13K/月',
            'salary_3year': '13-20K/月',
            'salary_5year': '20-32K/月',
            'workload_overtime': '一般',
            'workload_travel': '较少',
            'employment_difficulty': '低',
            'civil_servant_fit': '中',
            'pain_points': json.dumps(['硬件调试繁琐', '知识面广难精', '部分岗位需倒班'], ensure_ascii=False),
            'suitable_traits': '动手能力强、逻辑思维好、有耐心'
        },
    ]
    
    for insight in career_insights:
        cursor.execute('''
            INSERT OR REPLACE INTO career_insight
            (major_name, overview, core_courses, employment_direction, salary_fresh, salary_3year, salary_5year,
             workload_overtime, workload_travel, employment_difficulty, civil_servant_fit, pain_points, suitable_traits)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', tuple(insight.values()))
    
    conn.commit()
    print(f"  ✅ 导入职业洞察: {len(career_insights)} 条")

def main():
    """主函数"""
    print("=" * 50)
    print("高考志愿填报助手 - 数据库初始化")
    print("=" * 50)
    
    # 确保数据目录存在
    os.makedirs('data', exist_ok=True)
    
    # 删除旧数据库
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("🗑️  删除旧数据库")
    
    # 创建数据库连接
    conn = sqlite3.connect(DB_PATH)
    
    try:
        create_tables(conn)
        import_excel_data(conn)
        import_seed_data(conn)
        
        # 验证数据
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM university')
        uni_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM major_score')
        score_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM major')
        major_count = cursor.fetchone()[0]
        
        print("\n" + "=" * 50)
        print("✅ 数据库初始化完成")
        print(f"   高校数量: {uni_count}")
        print(f"   专业数量: {major_count}")
        print(f"   录取数据: {score_count}")
        print(f"   数据库路径: {DB_PATH}")
        print("=" * 50)
        
    finally:
        conn.close()

if __name__ == '__main__':
    main()
