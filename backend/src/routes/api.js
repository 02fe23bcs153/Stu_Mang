const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to format date matching the screenshot exactly: e.g., "20 May 2024, 10:30 AM"
function getFormattedTimestamp() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

// Helper to log recent activities
async function logActivity(text, iconType) {
  try {
    const timestamp = getFormattedTimestamp();
    await db.run(
      'INSERT INTO activities (text, icon_type, timestamp) VALUES ($1, $2, $3)',
      [text, iconType, timestamp]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * GET /api/dashboard/stats
 * Aggregates statistics for the dashboard cards, pie chart, and recent activities.
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // 1. Stat cards counts
    const totalRes = await db.query('SELECT COUNT(*) as count FROM students');
    const maleRes = await db.query("SELECT COUNT(*) as count FROM students WHERE gender = 'Male'");
    const femaleRes = await db.query("SELECT COUNT(*) as count FROM students WHERE gender = 'Female'");
    
    const totalStudents = totalRes[0] ? parseInt(totalRes[0].count) : 0;
    const maleStudents = maleRes[0] ? parseInt(maleRes[0].count) : 0;
    const femaleStudents = femaleRes[0] ? parseInt(femaleRes[0].count) : 0;
    
    const STANDARD_COURSES = ['B.Tech', 'BCA', 'B.Sc', 'B.Com', 'MBA'];
    const totalCourses = STANDARD_COURSES.length;

    // 2. Course distribution for Donut Chart
    const distRes = await db.query('SELECT course, COUNT(*) as count FROM students GROUP BY course');
    const countsMap = {};
    distRes.forEach(row => {
      countsMap[row.course] = parseInt(row.count);
    });

    const courseDistribution = STANDARD_COURSES.map(course => {
      const count = countsMap[course] || 0;
      return {
        course,
        count,
        percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count); // Sort descending

    // 3. Recent Students (latest 5)
    const recentStudents = await db.query('SELECT id, name, email, course, date_added FROM students ORDER BY id DESC LIMIT 5');

    // 4. Recent Activities (latest 5)
    const recentActivities = await db.query('SELECT id, text, icon_type, timestamp FROM activities ORDER BY id DESC LIMIT 5');

    res.json({
      success: true,
      stats: {
        totalStudents,
        maleStudents,
        femaleStudents,
        totalCourses
      },
      courseDistribution,
      recentStudents,
      recentActivities
    });
  } catch (error) {
    console.error('Dashboard stats fetch error:', error);
    res.status(500).json({ success: false, message: 'Database error fetching stats' });
  }
});

/**
 * GET /api/students
 * Retrieve all students with optional search/filtering.
 */
router.get('/students', async (req, res) => {
  try {
    const { search, course } = req.query;
    let sql = 'SELECT * FROM students';
    const params = [];

    if (search || course) {
      sql += ' WHERE ';
      const conditions = [];
      if (search) {
        conditions.push('(name LIKE $1 OR email LIKE $2)');
        params.push(`%${search}%`, `%${search}%`);
      }
      if (course) {
        conditions.push(`course = $${params.length + 1}`);
        params.push(course);
      }
      sql += conditions.join(' AND ');
    }

    sql += ' ORDER BY id DESC';

    const students = await db.query(sql, params);
    res.json({ success: true, students });
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ success: false, message: 'Database error fetching students' });
  }
});

/**
 * GET /api/students/:id
 * Fetch a single student's details.
 */
router.get('/students/:id', async (req, res) => {
  try {
    const student = await db.query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, student: student[0] });
  } catch (error) {
    console.error('Fetch student details error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

/**
 * POST /api/students
 * Register a new student.
 */
router.post('/students', async (req, res) => {
  try {
    const { name, email, course, gender } = req.body;
    
    if (!name || !email || !course || !gender) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields' });
    }

    // Check for duplicate student email registration
    const existingStudent = await db.query('SELECT * FROM students WHERE email = $1', [email]);
    if (existingStudent.length > 0) {
      return res.status(400).json({ success: false, message: 'This student registration already exists' });
    }

    const dateAdded = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); // "20 May 2024"

    const result = await db.run(
      'INSERT INTO students (name, email, course, date_added, gender) VALUES ($1, $2, $3, $4, $5)',
      [name, email, course, dateAdded, gender]
    );

    await logActivity(`New student ${name} has been added.`, 'add');

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      studentId: result.lastID
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Database error creating student' });
  }
});

/**
 * PUT /api/students/:id
 * Update existing student information.
 */
router.put('/students/:id', async (req, res) => {
  try {
    const { name, email, course, gender } = req.body;
    const studentId = req.params.id;

    if (!name || !email || !course || !gender) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields' });
    }

    const checkStudent = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (checkStudent.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if the email belongs to another student
    const duplicateEmail = await db.query('SELECT * FROM students WHERE email = $1 AND id != $2', [email, studentId]);
    if (duplicateEmail.length > 0) {
      return res.status(400).json({ success: false, message: 'A student with this email is already registered' });
    }

    await db.run(
      'UPDATE students SET name = $1, email = $2, course = $3, gender = $4 WHERE id = $5',
      [name, email, course, gender, studentId]
    );

    await logActivity(`Student ${name} information has been updated.`, 'update');

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Database error updating student' });
  }
});

/**
 * DELETE /api/students/:id
 * Remove a student registration.
 */
router.delete('/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;

    const checkStudent = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (checkStudent.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentName = checkStudent[0].name;
    await db.run('DELETE FROM students WHERE id = $1', [studentId]);

    await logActivity(`Student ID ${studentId} has been deleted.`, 'delete');

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Database error deleting student' });
  }
});

/**
 * GET /api/activities
 * Retrieve recent system activities.
 */
router.get('/activities', async (req, res) => {
  try {
    const activities = await db.query('SELECT * FROM activities ORDER BY id DESC LIMIT 50');
    res.json({ success: true, activities });
  } catch (error) {
    console.error('Fetch activities error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

/**
 * POST /api/auth/register
 * Register a new administrative user.
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password' });
    }

    // Check if user already exists
    const existing = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    await db.run(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      [username, password]
    );

    await logActivity(`New admin user registered: ${username}`, 'add');

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
      user: { username }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Database error during registration' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate administrative user.
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password' });
    }

    const user = await db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (user.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: { username: user[0].username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Database error during authentication' });
  }
});

module.exports = router;
