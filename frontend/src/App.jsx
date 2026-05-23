import React, { useState, useEffect } from 'react';

const API_BASE_URL = (window.location.hostname === 'localhost' && window.location.port !== '3000')
  ? 'http://localhost:5000/api'
  : '/api';

const COURSE_COLORS = {
  'B.Tech': '#3b82f6', // blue
  'BCA': '#10b981',    // green
  'B.Sc': '#f59e0b',   // orange/gold
  'B.Com': '#ef4444',  // red
  'MBA': '#8b5cf6',    // purple
  'Other': '#6b7280'   // grey
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('sms_logged_in') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('sms_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    stats: { totalStudents: 0, maleStudents: 0, femaleStudents: 0, totalCourses: 0 },
    courseDistribution: [],
    recentStudents: [],
    recentActivities: []
  });
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State (for View Students tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  
  // Add/Edit Student Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: 'B.Tech',
    gender: 'Male'
  });
  
  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Registration inline error state
  const [formError, setFormError] = useState('');

  if (!isLoggedIn) {
    return (
      <LoginView 
        onLoginSuccess={(userData) => {
          setIsLoggedIn(true);
          setUser(userData);
          localStorage.setItem('sms_logged_in', 'true');
          localStorage.setItem('sms_user', JSON.stringify(userData));
        }}
      />
    );
  }

  // Fetch dashboard stats and all students
  const fetchData = async () => {
    try {
      setLoading(true);
      const statsRes = await fetch(`${API_BASE_URL}/dashboard/stats`);
      const statsJson = await statsRes.json();
      if (statsJson.success) {
        setDashboardData(statsJson);
      }
      
      const studentsRes = await fetch(`${API_BASE_URL}/students`);
      const studentsJson = await studentsRes.json();
      if (studentsJson.success) {
        setAllStudents(studentsJson.students);
      }
    } catch (error) {
      console.error('Error fetching data from API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Form Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Register Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setFormError('');

    // ── Client-side duplicate check (instant, works even before Docker rebuild) ──
    const emailLower = formData.email.trim().toLowerCase();
    const duplicate = allStudents.find(
      s => s.email.trim().toLowerCase() === emailLower
    );
    if (duplicate) {
      setFormError(
        `This student registration already exists! "${duplicate.name}" is already enrolled with this email address.`
      );
      return; // Stop — do NOT call the API
    }

    try {
      const res = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setFormError('');
        setFormData({ name: '', email: '', course: 'B.Tech', gender: 'Male' });
        await fetchData();
        setActiveTab('dashboard'); // Redirect to dashboard after success
      } else {
        // Catch any server-side duplicate or validation error
        setFormError(data.message || 'Failed to add student. Please try again.');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      setFormError('Could not reach the server. Please check your connection.');
    }
  };

  // Open Edit Modal
  const openEditModal = (student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  // Submit Edit Student
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStudent)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditingStudent(null);
        await fetchData();
      } else {
        alert(data.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student registration?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(data.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <svg viewBox="0 0 24 24">
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3M12 5.18L18.82 9L12 12.82L5.18 9L12 5.18M5 11.45V15.79L12 19.6L19 15.79V11.45L12 15.27L5 11.45Z"/>
          </svg>
          Student Management System
        </div>
        <div className="nav-profile">
          <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user ? user.username : 'Admin'}`} alt="Admin Avatar" />
          <span>{user ? user.username : 'Admin'}</span>
          <svg viewBox="0 0 24 24">
            <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
          </svg>
        </div>
      </nav>

      <div className="layout-wrapper">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-menu">
            <div 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span>Dashboard</span>
            </div>
            
            <div 
              className={`sidebar-item ${activeTab === 'view_students' ? 'active' : ''}`}
              onClick={() => setActiveTab('view_students')}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span>Students</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'add_student' ? 'active' : ''}`}
              onClick={() => setActiveTab('add_student')}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span>Add Student</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z" />
              </svg>
              <span>Reports</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
              <span>Settings</span>
            </div>
          </div>
          
          <div 
            className="sidebar-item"
            onClick={() => {
              if (window.confirm('Are you sure you want to log out of the console?')) {
                setIsLoggedIn(false);
                setUser(null);
                localStorage.removeItem('sms_logged_in');
                localStorage.removeItem('sms_user');
              }
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span>Logout</span>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', fontSize: '16px', fontWeight: '600' }}>
              Loading resources...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView 
                  data={dashboardData} 
                  onViewAllStudents={() => setActiveTab('view_students')} 
                />
              )}
              {activeTab === 'view_students' && (
                <ViewStudentsView 
                  allStudents={allStudents}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterCourse={filterCourse}
                  setFilterCourse={setFilterCourse}
                  onEdit={openEditModal}
                  onDelete={handleDeleteStudent}
                />
              )}
              {activeTab === 'add_student' && (
                <AddStudentView 
                  formData={formData}
                  onInputChange={(e) => { setFormError(''); handleInputChange(e); }}
                  onSubmit={handleAddStudent}
                  formError={formError}
                />
              )}
              {activeTab === 'reports' && <ReportsView allStudents={allStudents} />}
              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        © 2026 Student Management System. All rights reserved.
      </footer>

      {/* Edit Student Modal */}
      {showModal && editingStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Student Information</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateStudent}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Course</label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={editingStudent.course}
                      onChange={(e) => setEditingStudent({ ...editingStudent, course: e.target.value })}
                    >
                      <option value="B.Tech">B.Tech</option>
                      <option value="BCA">BCA</option>
                      <option value="B.Sc">B.Sc</option>
                      <option value="B.Com">B.Com</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      value={editingStudent.gender}
                      onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------
// VIEW COMPONENTS
// -----------------------------------------------------------

function DashboardView({ data, onViewAllStudents }) {
  const { stats, courseDistribution, recentStudents, recentActivities } = data;

  // Custom SVG Donut Calculation
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159
  let accumulatedPercent = 0;

  // Find dynamic leading course (sorted from backend)
  const leadingCourse = courseDistribution && courseDistribution[0];
  const leadingPct = leadingCourse ? leadingCourse.percentage : 0;
  const leadingName = leadingCourse && leadingCourse.count > 0 ? `${leadingCourse.course} Lead` : 'No Data';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Cards Row */}
      <section className="cards-grid">
        <div className="stat-card card-blue">
          <div className="card-icon-container">
            <svg viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <div className="card-details">
            <span className="card-title">Total Students</span>
            <span className="card-value">{stats.totalStudents}</span>
            <span className="card-subtitle">All Registered Students</span>
          </div>
        </div>

        <div className="stat-card card-green">
          <div className="card-icon-container">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <div className="card-details">
            <span className="card-title">Male Students</span>
            <span className="card-value">{stats.maleStudents}</span>
            <span className="card-subtitle">Male Students</span>
          </div>
        </div>

        <div className="stat-card card-red">
          <div className="card-icon-container">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <div className="card-details">
            <span className="card-title">Female Students</span>
            <span className="card-value">{stats.femaleStudents}</span>
            <span className="card-subtitle">Female Students</span>
          </div>
        </div>

        <div className="stat-card card-gold">
          <div className="card-icon-container">
            <svg viewBox="0 0 24 24">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3M12 5.18L18.82 9L12 12.82L5.18 9L12 5.18M5 11.45V15.79L12 19.6L19 15.79V11.45L12 15.27L5 11.45Z"/>
            </svg>
          </div>
          <div className="card-details">
            <span className="card-title">Total Courses</span>
            <span className="card-value">{stats.totalCourses}</span>
            <span className="card-subtitle">Available Courses</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Table & Donut Chart */}
      <div className="dashboard-grid">
        {/* Table Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg viewBox="0 0 24 24">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              Recent Students
            </h2>
            <button className="btn-secondary" onClick={onViewAllStudents}>View All</button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="student-id">{student.id}</td>
                    <td className="student-name">{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      <span className="student-course-badge">{student.course}</span>
                    </td>
                    <td>{student.date_added}</td>
                  </tr>
                ))}
                {recentStudents.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No student registrations recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut Chart Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg viewBox="0 0 24 24" style={{ strokeWidth: 0, fill: 'var(--text-main)' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L11 15v5c.67 0 1.34-.03 2-.07zm1.79-1.21L13 14.5V9h5.5c.3 1.62.1 3.29-.71 4.72zM12.5 7V3.07c3.95.49 7 3.85 7 7.93 0 .62-.08 1.21-.21 1.79L14 9V7h-1.5z" />
              </svg>
              Students by Course
            </h2>
          </div>
          <div className="chart-container">
            {/* Donut SVG */}
            {courseDistribution.length > 0 ? (
              <svg className="donut-chart-svg" viewBox="0 0 120 120">
                <circle className="donut-hole" cx="60" cy="60" r={radius} />
                {courseDistribution.map((item) => {
                  const percentage = item.percentage;
                  const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
                  const dashOffset = -((accumulatedPercent / 100) * circumference);
                  accumulatedPercent += percentage;
                  
                  return (
                    <circle
                      key={item.course}
                      className="donut-segment"
                      cx="60"
                      cy="60"
                      r={radius}
                      stroke={COURSE_COLORS[item.course] || COURSE_COLORS['Other']}
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                    />
                  );
                })}
                {/* Text overlay */}
                <g transform="translate(60, 65)">
                  <text className="donut-label">{leadingPct}%</text>
                  <text className="donut-sublabel" y="10">{leadingName}</text>
                </g>
              </svg>
            ) : (
              <div style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '8px solid #f4f6fc', color: '#a3aed0', fontSize: '11px', fontWeight: '700' }}>No Data</div>
            )}

            {/* Legends */}
            <div className="chart-legends">
              {courseDistribution.map((item) => (
                <div className="legend-item" key={item.course}>
                  <div className="legend-info">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: COURSE_COLORS[item.course] || COURSE_COLORS['Other'] }}
                    ></span>
                    <span>{item.course}</span>
                  </div>
                  <span className="legend-pct">{item.percentage}%</span>
                </div>
              ))}
              {courseDistribution.length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enroll students to build analytics.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Log Row */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Recent Activities
          </h2>
        </div>
        <div className="activity-timeline">
          {recentActivities.map((activity) => (
            <div className="activity-item" key={activity.id}>
              <span className={`activity-node activity-node-${activity.icon_type}`}></span>
              <div className="activity-content">
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{activity.timestamp}</span>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <span style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '14px' }}>No system logs generated yet.</span>
          )}
        </div>
      </section>
    </>
  );
}

function AddStudentView({ formData, onInputChange, onSubmit, formError }) {
  return (
    <div className="form-panel panel">
      <div className="page-header" style={{ marginBottom: '10px' }}>
        <h1 className="page-title">Register New Student</h1>
      </div>

      {/* Inline duplicate / error banner */}
      {formError && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          background: 'var(--danger-bg)',
          border: '1.5px solid rgba(239,68,68,0.3)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '4px',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', fill: 'var(--danger)', flexShrink: 0, marginTop: '1px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>Duplicate Registration Detected</span>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--danger)' }}>{formError}</span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Rahul Sharma"
              className="form-input"
              value={formData.name}
              onChange={onInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. rahul@gmail.com"
              className="form-input"
              style={formError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 4px var(--danger-bg)' } : {}}
              value={formData.email}
              onChange={onInputChange}
              required
            />
            {formError && (
              <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: '600', marginTop: '-4px' }}>
                ⚠ This email is already registered in the system.
              </span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course Program</label>
              <select
                name="course"
                className="filter-select"
                style={{ width: '100%' }}
                value={formData.course}
                onChange={onInputChange}
              >
                <option value="B.Tech">B.Tech</option>
                <option value="BCA">BCA</option>
                <option value="B.Sc">B.Sc</option>
                <option value="B.Com">B.Com</option>
                <option value="MBA">MBA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gender Identification</label>
              <select
                name="gender"
                className="filter-select"
                style={{ width: '100%' }}
                value={formData.gender}
                onChange={onInputChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '10px', opacity: formError ? 0.6 : 1, transition: 'opacity 0.2s' }}
          >
            Register Enrollment
          </button>
        </div>
      </form>
    </div>
  );
}

function ViewStudentsView({ allStudents, searchQuery, setSearchQuery, filterCourse, setFilterCourse, onEdit, onDelete }) {
  // Client-side dynamic filtering
  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(student.id).includes(searchQuery);
    const matchesCourse = filterCourse === '' ? true : student.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Students Registry</h1>
      </div>

      <div className="panel">
        {/* Filters and Searches */}
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Search by student name, email, or registry ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="">All Course Streams</option>
            <option value="B.Tech">B.Tech</option>
            <option value="BCA">BCA</option>
            <option value="B.Sc">B.Sc</option>
            <option value="B.Com">B.Com</option>
            <option value="MBA">MBA</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Registry ID</th>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Course</th>
                <th>Gender</th>
                <th>Date Added</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="student-id">{student.id}</td>
                  <td className="student-name">{student.name}</td>
                  <td>{student.email}</td>
                  <td>
                    <span className="student-course-badge">{student.course}</span>
                  </td>
                  <td>{student.gender}</td>
                  <td>{student.date_added}</td>
                  <td>
                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                      <button 
                        className="btn-icon btn-edit" 
                        title="Edit Info"
                        onClick={() => onEdit(student)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        title="Deregister"
                        onClick={() => onDelete(student.id)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    No students match the selected search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ReportsView({ allStudents }) {
  // Aggregate statistics for the report page
  const total = allStudents.length;
  const btech = allStudents.filter(s => s.course === 'B.Tech').length;
  const bca = allStudents.filter(s => s.course === 'BCA').length;
  const bsc = allStudents.filter(s => s.course === 'B.Sc').length;
  const bcom = allStudents.filter(s => s.course === 'B.Com').length;
  const mba = allStudents.filter(s => s.course === 'MBA').length;
  const male = allStudents.filter(s => s.gender === 'Male').length;
  const female = allStudents.filter(s => s.gender === 'Female').length;

  const downloadReport = () => {
    // Generate simple mock CSV export
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Registry ID,Student Name,Email,Course,Gender,Date Added\n";
    allStudents.forEach(student => {
      csvContent += `${student.id},"${student.name}",${student.email},${student.course},${student.gender},"${student.date_added}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Student_Registry_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Reports & Metrics</h1>
      </div>

      <div className="panel" style={{ gap: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>System Demographics Summary</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Real-time database counts and stream allocations.</p>
          </div>
          <button className="btn-primary" onClick={downloadReport} style={{ padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: '#ffffff' }}>
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
            </svg>
            Export Student Dataset (.csv)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ border: '1.5px solid var(--border-color)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Enrollments By Course</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>B.Tech:</span> <span>{btech}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>BCA:</span> <span>{bca}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>B.Sc:</span> <span>{bsc}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>B.Com:</span> <span>{bcom}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>MBA:</span> <span>{mba}</span></div>
            </div>
          </div>

          <div style={{ border: '1.5px solid var(--border-color)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Gender Ratio Breakdown</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                  <span>Male ({male})</span>
                  <span>{total > 0 ? Math.round((male/total)*100) : 0}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${total > 0 ? (male/total)*100 : 0}%`, height: '100%', backgroundColor: 'var(--success)' }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                  <span>Female ({female})</span>
                  <span>{total > 0 ? Math.round((female/total)*100) : 0}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${total > 0 ? (female/total)*100 : 0}%`, height: '100%', backgroundColor: 'var(--danger)' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ border: '1.5px solid var(--border-color)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
            <span style={{ fontSize: '42px', fontWeight: '800', color: 'var(--primary)' }}>{total}</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Active Registrations</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Currently saved in database storage</span>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsView() {
  const [devMode, setDevMode] = useState(true);
  const [autosave, setAutosave] = useState(true);
  
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Branding & Settings</h1>
      </div>

      <div className="panel" style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '5px' }}>Application Configurations</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1.5px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>DevOps Database Sync Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Auto-fallbacks between SQLite (local) and Postgres (Docker).</div>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', fontSize: '12px', fontWeight: '700' }}>Active (Hybrid)</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1.5px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Mock Developer Seeding</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Preloads student dataset Rahul Sharma, Priya Singh etc. on empty DB.</div>
            </div>
            <button 
              onClick={() => setDevMode(!devMode)} 
              style={{ 
                width: '46px', 
                height: '24px', 
                backgroundColor: devMode ? 'var(--primary)' : '#cbd5e1', 
                borderRadius: '12px', 
                position: 'relative', 
                transition: 'background-color 0.2s ease',
                cursor: 'pointer' 
              }}
            >
              <span style={{ 
                width: '18px', 
                height: '18px', 
                backgroundColor: '#ffffff', 
                borderRadius: '50%', 
                position: 'absolute', 
                top: '3px', 
                left: devMode ? '25px' : '3px',
                transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
              }}></span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Docker Status Logging</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Write container actions directly to Nginx & Node server logs.</div>
            </div>
            <button 
              onClick={() => setAutosave(!autosave)} 
              style={{ 
                width: '46px', 
                height: '24px', 
                backgroundColor: autosave ? 'var(--primary)' : '#cbd5e1', 
                borderRadius: '12px', 
                position: 'relative', 
                transition: 'background-color 0.2s ease',
                cursor: 'pointer' 
              }}
            >
              <span style={{ 
                width: '18px', 
                height: '18px', 
                backgroundColor: '#ffffff', 
                borderRadius: '50%', 
                position: 'absolute', 
                top: '3px', 
                left: autosave ? '25px' : '3px',
                transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
              }}></span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function LoginView({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters long');
        return;
      }
    }

    setSubmitting(true);

    // Artificial premium latency delay for high fidelity feedback
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        if (mode === 'login') {
          onLoginSuccess(data.user);
        } else {
          // Successfully registered, toggle back to login mode and show success/instructions
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          alert('Registration successful! You can now sign in with your new credentials.');
        }
      } else {
        setError(data.message || 'An error occurred. Please try again.');
      }
    } catch (err) {
      console.error('Authentication request failed:', err);
      setError('Connection refused. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3M12 5.18L18.82 9L12 12.82L5.18 9L12 5.18M5 11.45V15.79L12 19.6L19 15.79V11.45L12 15.27L5 11.45Z"/>
          </svg>
          Stu_Mang Admin
        </div>

        <div className="login-header-text">
          <h2 className="login-title">
            {mode === 'login' ? 'Sign In to Console' : 'Register Administrator'}
          </h2>
          <span className="login-subtitle">
            {mode === 'login' 
              ? 'Enter your administrative credentials to manage student registry' 
              : 'Create a new administrative account for devops credentials database'
            }
          </span>
        </div>

        {error && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor', flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              placeholder="e.g. rahul or admin"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={submitting}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="form-input"
                style={{ width: '100%', paddingRight: '48px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                autoComplete="current-password"
              />
              <span 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M11.83 9L15 12.17V12a3 3 0 0 0-3-3h-.17zM2.81 2.81L1.39 4.22l2.3 2.3A12.87 12.87 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5a11.9 11.9 0 0 0 5.09-1.12l2.69 2.69 1.41-1.41L2.81 2.81zM12 17c-2.76 0-5-2.24-5-5a4.8 4.8 0 0 1 .18-1.25L9.9 13.5a3 3 0 0 0 4.1 4.1l1.25.18c-.46.14-.94.22-1.25.22zm10.25-5a12.87 12.87 0 0 0-2.3-3.18l-1.42 1.42A10.14 10.14 0 0 1 21 12a10.06 10.06 0 0 1-7 5.5v-1.77l-2-2v-1.2a3 3 0 0 0-3-3h-1.2l-2-2V4.5c2.3-.92 4.87-1.5 7-1.5 5 0 9.27 3.11 11 7.5a11.79 11.79 0 0 1-1.75 3.58l1.42 1.42A12.87 12.87 0 0 0 22.25 12z"/>
                  </svg>
                )}
              </span>
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group animate-slide">
              <label className="form-label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
                autoComplete="new-password"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="login-options">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Console
              </label>
              <span className="forgot-password" style={{ cursor: 'pointer' }} onClick={() => alert('Default passwords are admin/admin or rahul/rahul. Or register a new account!')}>
                Need Help?
              </span>
            </div>
          )}

          <button 
            type="submit" 
            className={`btn-primary ${submitting ? 'btn-primary-loading' : ''}`}
            style={{ marginTop: '10px' }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner"></span>
                <span>Processing Request...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In Administrative Portal' : 'Register New Administrator'}</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              New to this DevOps project?{' '}
              <span 
                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setMode('register'); setError(''); }}
              >
                Register admin here
              </span>
            </>
          ) : (
            <>
              Already have an admin account?{' '}
              <span 
                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setMode('login'); setError(''); }}
              >
                Sign in instead
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
