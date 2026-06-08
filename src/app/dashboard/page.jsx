'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // Tasks and filters state
  const [tasks, setTasks] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Alert banner state
  const [feedback, setFeedback] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  // Form fields state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState('PENDING');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');

  // Fetch Tasks from API
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      if (searchTerm) queryParams.append('search', searchTerm);

      const res = await fetch(`/api/v1/tasks?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      } else {
        showFeedback('error', 'Failed to retrieve tasks.');
      }
    } catch (err) {
      showFeedback('error', 'Network error retrieving tasks.');
    } finally {
      setTasksLoading(false);
    }
  }, [statusFilter, priorityFilter, searchTerm]);

  // Fetch Users (for Admins to assign tasks)
  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success && data.data?.users) {
        setSystemUsers(data.data.users);
      }
    } catch (err) {
      console.error('Failed fetching users:', err);
    }
  }, [user]);

  // Handle redirect if unauthorized
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user) {
      fetchTasks();
      fetchUsers();
    }
  }, [user, loading, router, fetchTasks, fetchUsers]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Open Modal for Creating
  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setSelectedTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('PENDING');
    setTaskPriority('MEDIUM');
    setTaskDueDate('');
    setTaskAssignee(user?.id || '');
    setIsModalOpen(true);
  };

  // Open Modal for Editing
  const handleOpenEditModal = (task) => {
    setModalMode('EDIT');
    setSelectedTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    
    // Format Date for Input Field (YYYY-MM-DD)
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      setTaskDueDate(date.toISOString().split('T')[0]);
    } else {
      setTaskDueDate('');
    }
    setTaskAssignee(task.userId);
    setIsModalOpen(true);
  };

  // Submit Modal Form (Create / Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      showFeedback('error', 'Task Title is required.');
      return;
    }

    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      status: taskStatus,
      priority: taskPriority,
      dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
      userId: taskAssignee || user.id
    };

    try {
      let res;
      if (modalMode === 'CREATE') {
        res = await fetch('/api/v1/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/v1/tasks/${selectedTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        showFeedback('success', `Task ${modalMode === 'CREATE' ? 'created' : 'updated'} successfully.`);
        setIsModalOpen(false);
        fetchTasks();
      } else {
        showFeedback('error', data.error?.message || 'Action failed.');
      }
    } catch (err) {
      showFeedback('error', 'Network error during save.');
    }
  };

  // Quick Toggle Status (e.g. cycle through PENDING -> IN_PROGRESS -> COMPLETED)
  const handleQuickToggleStatus = async (task) => {
    const statusCycle = {
      PENDING: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
      COMPLETED: 'PENDING'
    };
    const nextStatus = statusCycle[task.status] || 'PENDING';

    try {
      const res = await fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', `Task status updated to ${nextStatus.replace('_', ' ')}.`);
        fetchTasks();
      } else {
        showFeedback('error', data.error?.message || 'Failed to update status.');
      }
    } catch (err) {
      showFeedback('error', 'Network error changing status.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to permanently delete this task?')) return;
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', 'Task deleted successfully.');
        fetchTasks();
      } else {
        showFeedback('error', data.error?.message || 'Failed to delete task.');
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting task.');
    }
  };

  // Compute metrics for analytics cards
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length
  };

  if (loading || !user) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-muted)'
      }}>
        Loading session...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 5% 60px' }}>
      
      {/* Top Header */}
      <header className="glass" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 30px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '32px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Workspace console
          </span>
          <h2 style={{ fontSize: '1.4rem', marginTop: '4px' }}>
            Welcome back, {user.name}
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className={`badge ${user.role === 'ADMIN' ? 'badge-progress' : 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
            🛡️ {user.role}
          </span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Log Out
          </button>
        </div>
      </header>

      {/* Feedback Alert Banners */}
      {feedback && (
        <div className={`alert alert-${feedback.type}`} style={{ maxWidth: '600px', margin: '0 auto 25px' }}>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Quick Analytics Dashboard */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
          <span className="input-label">Total Assigned</span>
          <h3 style={{ fontSize: '2.2rem', marginTop: '10px', fontWeight: '700' }}>{stats.total}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--warning)' }}>
          <span className="input-label">Pending</span>
          <h3 style={{ fontSize: '2.2rem', marginTop: '10px', fontWeight: '700', color: 'var(--warning)' }}>{stats.pending}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--secondary)' }}>
          <span className="input-label">In Progress</span>
          <h3 style={{ fontSize: '2.2rem', marginTop: '10px', fontWeight: '700', color: 'var(--secondary)' }}>{stats.inProgress}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--success)' }}>
          <span className="input-label">Completed</span>
          <h3 style={{ fontSize: '2.2rem', marginTop: '10px', fontWeight: '700', color: 'var(--success)' }}>{stats.completed}</h3>
        </div>
      </section>

      {/* Task Filters & Control Bar */}
      <section className="glass" style={{
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '32px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search & Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', flex: 1, maxWidth: '800px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search title/description..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '10px 14px' }}
            />
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ padding: '10px 14px', background: 'rgba(17, 24, 39, 0.8)', cursor: 'pointer' }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field"
              style={{ padding: '10px 14px', background: 'rgba(17, 24, 39, 0.8)', cursor: 'pointer' }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
            </select>
          </div>

          <button onClick={fetchTasks} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
            Apply Filters
          </button>
        </div>

        {/* Action Button */}
        <div>
          <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
            + Create New Task
          </button>
        </div>
      </section>

      {/* Task Listing */}
      <main>
        {tasksLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Retrieving tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '15px' }}>
              No tasks found. Try adjusting filters or create a new task.
            </p>
            <button onClick={handleOpenCreateModal} className="btn btn-primary">
              Create First Task
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {tasks.map(task => (
              <div
                key={task.id}
                className="glass-card"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  borderTop: `2.5px solid ${
                    task.status === 'COMPLETED' ? 'var(--success)' : 'transparent'
                  }`
                }}
              >
                {/* Card Header (Priority Indicator & Badges) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={`priority-dot priority-${task.priority.toLowerCase()}`}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                      {task.priority} Priority
                    </span>
                  </div>
                  
                  <span
                    onClick={() => handleQuickToggleStatus(task)}
                    className={`badge badge-${
                      task.status === 'PENDING' ? 'pending' : task.status === 'IN_PROGRESS' ? 'progress' : 'completed'
                    }`}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to change status"
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Card Main Title / Body */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '8px', lineHeight: '1.4' }}>
                    {task.title}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {task.description || 'No description provided.'}
                  </p>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-color)' }}></div>

                {/* Card Footer (Metadata) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {task.dueDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Due Date:</span>
                      <span style={{ fontWeight: '500', color: new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'var(--danger)' : 'var(--text-main)' }}>
                        {new Date(task.dueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>
                  )}

                  {user.role === 'ADMIN' && task.user && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Assignee:</span>
                      <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                        {task.user.name} ({task.user.role})
                      </span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleOpenEditModal(task)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem' }}
                  >
                    Edit Task
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="btn btn-danger"
                    style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem' }}
                  >
                    Delete
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* Task Creation / Edit Overlay Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 12, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: 'var(--radius-lg)',
            padding: '35px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '24px' }}>
              {modalMode === 'CREATE' ? 'Add New Task' : 'Edit Task Parameters'}
            </h3>

            <form onSubmit={handleModalSubmit}>
              <div className="input-group">
                <label className="input-label">Task Title</label>
                <input
                  type="text"
                  placeholder="Review schema integration"
                  className="input-field"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description (Optional)</label>
                <textarea
                  placeholder="Detail exact specifications or ticket issues..."
                  className="input-field"
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>Status</label>
                  <select
                    className="input-field"
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    style={{ background: 'rgba(17, 24, 39, 0.8)' }}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>Priority</label>
                  <select
                    className="input-field"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    style={{ background: 'rgba(17, 24, 39, 0.8)' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Due Date (Optional)</label>
                <input
                  type="date"
                  className="input-field"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  style={{ background: 'rgba(17, 24, 39, 0.8)' }}
                />
              </div>

              {/* Admin-only Task Assignment Dropdown */}
              {user.role === 'ADMIN' && (
                <div className="input-group" style={{ marginBottom: '30px' }}>
                  <label className="input-label">Assignee (Admin Option)</label>
                  <select
                    className="input-field"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    style={{ background: 'rgba(17, 24, 39, 0.8)' }}
                  >
                    {systemUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {modalMode === 'CREATE' ? 'Save Task' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
