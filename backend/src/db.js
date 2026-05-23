const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let dbInstance = null;
let pgPool = null;

// Initialize connection
if (DB_TYPE === 'postgres') {
  console.log('Connecting to PostgreSQL database...');
  pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'student_db',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
} else {
  console.log('Connecting to local SQLite database...');
  const dbPath = path.resolve(__dirname, '../database.sqlite');
  dbInstance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('SQLite database opened successfully at:', dbPath);
    }
  });
}

// Convert PostgreSQL style placeholder ($1, $2) to SQLite style (?)
function translateQuery(sql) {
  if (DB_TYPE === 'postgres') {
    return sql;
  }
  // Replace $1, $2, ... with ?
  return sql.replace(/\$\d+/g, '?');
}

/**
 * Executes a query and returns all rows
 */
function query(sql, params = []) {
  const translatedSql = translateQuery(sql);
  
  if (DB_TYPE === 'postgres') {
    return pgPool.query(translatedSql, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      dbInstance.all(translatedSql, params, (err, rows) => {
        if (err) {
          console.error('SQLite query error:', err, 'SQL:', translatedSql);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

/**
 * Executes a query that doesn't return rows (INSERT/UPDATE/DELETE)
 */
function run(sql, params = []) {
  const translatedSql = translateQuery(sql);

  if (DB_TYPE === 'postgres') {
    return pgPool.query(translatedSql, params).then(res => {
      return {
        changes: res.rowCount,
        lastID: res.rows && res.rows[0] ? res.rows[0].id : null
      };
    });
  } else {
    return new Promise((resolve, reject) => {
      dbInstance.run(translatedSql, params, function (err) {
        if (err) {
          console.error('SQLite run error:', err, 'SQL:', translatedSql);
          reject(err);
        } else {
          resolve({
            changes: this.changes,
            lastID: this.lastID
          });
        }
      });
    });
  }
}

/**
 * Initialize Database Tables & Seed Mock Data
 */
async function initializeDatabase() {
  try {
    if (DB_TYPE === 'postgres') {
      // Create tables for PostgreSQL
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          course VARCHAR(100) NOT NULL,
          date_added VARCHAR(50) NOT NULL,
          gender VARCHAR(10) NOT NULL
        );
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          icon_type VARCHAR(20) NOT NULL,
          timestamp VARCHAR(50) NOT NULL
        );
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL
        );
      `);
      
      // Check if students table is empty to seed
      const countRes = await pgPool.query('SELECT COUNT(*) FROM students');
      const count = parseInt(countRes.rows[0].count);
      
      if (count === 0) {
        console.log('Seeding PostgreSQL database with default dashboard dataset...');
        await seedData();
      }

      // Check if users table is empty to seed
      const userCountRes = await pgPool.query('SELECT COUNT(*) FROM users');
      const userCount = parseInt(userCountRes.rows[0].count);
      if (userCount === 0) {
        console.log('Seeding PostgreSQL database with default admin users...');
        await seedUsers();
      }
    } else {
      // Create tables for SQLite
      await new Promise((resolve, reject) => {
        dbInstance.serialize(() => {
          dbInstance.run(`
            CREATE TABLE IF NOT EXISTS students (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL,
              course TEXT NOT NULL,
              date_added TEXT NOT NULL,
              gender TEXT NOT NULL
            );
          `);

          dbInstance.run(`
            CREATE TABLE IF NOT EXISTS activities (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              text TEXT NOT NULL,
              icon_type TEXT NOT NULL,
              timestamp TEXT NOT NULL
            );
          `);

          dbInstance.run(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL
            );
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      // Check if students table is empty to seed
      const rows = await query('SELECT COUNT(*) as count FROM students');
      const count = rows[0].count;
      
      if (count === 0) {
        console.log('Seeding SQLite database with default dashboard dataset...');
        await seedData();
      }

      // Check if users table is empty to seed
      const userRows = await query('SELECT COUNT(*) as count FROM users');
      const userCount = userRows[0].count;
      
      if (userCount === 0) {
        console.log('Seeding SQLite database with default admin users...');
        await seedUsers();
      }
    }
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

async function seedData() {
  // Seed Students
  const students = [
    [101, 'Rahul Sharma', 'rahul@gmail.com', 'B.Tech', '20 May 2024', 'Male'],
    [102, 'Priya Singh', 'priya@gmail.com', 'BCA', '20 May 2024', 'Female'],
    [103, 'Amit Kumar', 'amit@gmail.com', 'B.Sc', '19 May 2024', 'Male'],
    [104, 'Neha Verma', 'neha@gmail.com', 'B.Com', '19 May 2024', 'Female'],
    [105, 'Vikram Patel', 'vikram@gmail.com', 'B.Tech', '18 May 2024', 'Male']
  ];

  for (const student of students) {
    await run(
      'INSERT INTO students (id, name, email, course, date_added, gender) VALUES ($1, $2, $3, $4, $5, $6)',
      student
    );
  }

  // Seed Activities
  const activities = [
    ['New student Rahul Sharma has been added.', 'add', '20 May 2024, 10:30 AM'],
    ['Student Priya Singh information has been updated.', 'update', '20 May 2024, 09:15 AM'],
    ['Student ID 105 has been deleted.', 'delete', '19 May 2024, 04:45 PM']
  ];

  for (const activity of activities) {
    await run(
      'INSERT INTO activities (text, icon_type, timestamp) VALUES ($1, $2, $3)',
      activity
    );
  }
}

async function seedUsers() {
  const users = [
    ['admin', 'admin'],
    ['rahul', 'rahul']
  ];

  for (const user of users) {
    try {
      await run(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        user
      );
    } catch (e) {
      console.error('Failed to seed user:', user[0], e.message);
    }
  }
}

module.exports = {
  query,
  run,
  initializeDatabase,
  DB_TYPE
};
