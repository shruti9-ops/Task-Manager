import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
const [dashData, setDashData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper to get current user id from token
  const getUserId = () => {
    try {
      const token = localStorage.getItem("token");
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id || payload._id;
    } catch {
      return null;
    }
  };
  const currentUserId = getUserId();

  // Add project modal
  const [showModal, setShowModal] = useState(false);
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

const fetchAll = async () => {
    try {
      const [dashRes, projRes, tasksRes] = await Promise.all([
        API.get("/dashboard/", { headers }),
        API.get("/projects/getProject", { headers }),
        API.get("/tasks/myTasks", { headers }),
      ]);
      setDashData(dashRes.data);
      setProjects(projRes.data.projects || []);
      setMyTasks(tasksRes.data.tasks || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleCreateProject = async () => {
    if (!projName.trim()) return setCreateError("Project name is required");
    setCreating(true);
    setCreateError("");
    try {
      await API.post("/projects/create", { name: projName, description: projDesc }, { headers });
      setProjName("");
      setProjDesc("");
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

const getCount = (status) => {
    // First try to get from backend data
    if (dashData?.statusStats) {
      const found = dashData.statusStats.find((s) => s._id && s._id.toUpperCase() === status.toUpperCase());
      if (found) return found.count;
    }
    // Fallback: count from myTasks
    return myTasks.filter(t => t.status && t.status.toUpperCase() === status.toUpperCase()).length;
  };

  return (
    <div className="dash-bg">
      <nav className="dash-nav">
        <div className="nav-logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">TaskFlow</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </nav>

      <main className="dash-main">
        <div className="dash-header">
          <h1>Dashboard</h1>
          <p>Your task overview at a glance</p>
        </div>

        {loading && <div className="dash-loading">Loading...</div>}
        {error && <div className="dash-error">{error}</div>}

{dashData && (
          <>
            <div className="section-label">Total Tasks</div>
            <div className="total-card">
              <span className="total-num">{dashData.totalTasks}</span>
              <span className="total-sub">tasks assigned to you</span>
            </div>

            <div className="section-label">Tasks by Status</div>
            <div className="stats-row">
              {[
                { label: "Todo",        key: "TODO",        color: "blue"   },
                { label: "In Progress", key: "IN_PROGRESS", color: "yellow" },
                { label: "Done",        key: "DONE",        color: "green"  },
              ].map((s) => (
                <div className={`stat-card accent-${s.color}`} key={s.key}>
                  <span className="stat-num">{getCount(s.key)}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="section-label">Status Breakdown</div>
            <div className="table-card">
              {dashData.statusStats.length === 0 ? (
                <div className="empty">No tasks found</div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr><th>Status</th><th>Count</th><th>Progress</th></tr>
                  </thead>
                  <tbody>
                    {dashData.statusStats.map((s) => (
                      <tr key={s._id}>
                        <td><span className={`badge badge-${s._id?.toLowerCase()}`}>{s._id}</span></td>
                        <td className="count-cell">{s.count}</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.round((s.count / dashData.totalTasks) * 100)}%` }} />
                          </div>
                          <span className="progress-pct">{Math.round((s.count / dashData.totalTasks) * 100)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="section-label">Overdue Tasks</div>
{(function() {
              const overdueCount = dashData?.overdueCount ?? myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;
              return (
                <div className={`overdue-card ${overdueCount > 0 ? "has-overdue" : ""}`}>
                  <div className="overdue-left">
                    <span className="overdue-num">{overdueCount}</span>
                    <span className="overdue-sub">
                      {overdueCount === 0 ? "You're all caught up!" : "tasks are past due date"}
                    </span>
                  </div>
                  <div className="overdue-icon">{overdueCount > 0 ? "⚠" : "✓"}</div>
                </div>
              );
            })()}

            {/* My Tasks List */}
            <div className="section-label">My Tasks</div>
            {myTasks.length === 0 ? (
              <div className="empty">No tasks assigned yet</div>
            ) : (
              <div className="task-list-card">
                {myTasks.map((task) => (
                  <div className="dash-task-row" key={task._id}>
                    <div className="dash-task-info">
                      <div className="dash-task-title">{task.title}</div>
                      <div className="dash-task-desc">{task.description || "No description"}</div>
                    </div>
                    <div className="dash-task-meta">
                      <span className={`badge badge-${task.status?.toLowerCase()}`}>{task.status}</span>
                      <span className={`badge badge-${task.priority?.toLowerCase()}`}>{task.priority}</span>
                      {task.dueDate && (
                        <span className="dash-task-due">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Projects ── */}
        <div className="section-header">
          <div className="section-label" style={{ margin: 0 }}>My Projects</div>
          <button className="add-proj-btn" onClick={() => setShowModal(true)}>+ New Project</button>
        </div>

        {!loading && projects.length === 0 && (
          <div className="empty-projects">No projects yet. Create one!</div>
        )}

        <div className="projects-grid">
          {projects.map((proj) => (
            <div className="proj-card" key={proj._id} onClick={() => navigate(`/project/${proj._id}`, { state: { project: proj } })}>
              <div className="proj-top">
                <div className="proj-icon">{proj.name?.charAt(0).toUpperCase()}</div>
                <div className="proj-info">
                  <div className="proj-name">{proj.name}</div>
                  <div className="proj-desc">{proj.description || "No description"}</div>
                </div>
              </div>
              <div className="proj-meta">
                <div className="proj-badge">
                  <span className="meta-label">Members</span>
                  <span className="meta-val">{proj.Members?.length || 0}</span>
                </div>
<div className="proj-badge">
                  <span className="meta-label">Role</span>
                  <span className="meta-val admin-dot">
                    {(function() {
                      const adminId = typeof proj.Admin === "object" ? proj.Admin?._id : proj.Admin;
                      const adminIdStr = (adminId || "").toString().trim();
                      const currentUserIdStr = (currentUserId || "").toString().trim();
                      return adminIdStr === currentUserIdStr ? "Owner" : "Member";
                    })()}
                  </span>
                </div>
              </div>
              <div className="proj-arrow">→</div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Create Project Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {createError && <div className="dash-error">{createError}</div>}
            <div className="input-group">
              <label>Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Task Manager App"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea
                placeholder="What is this project about?"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-create" onClick={handleCreateProject} disabled={creating}>
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
