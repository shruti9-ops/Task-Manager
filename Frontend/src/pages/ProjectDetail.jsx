import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./projectdetail.css";

// decode JWT to get current user id
function getUserId() {
  try {
    const token = localStorage.getItem("token");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload._id;
  } catch {
    return null;
  }
}

function ProjectDetail() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [project, setProject] = useState(state?.project || null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

// Add member
  const [memberUserId, setMemberUserId] = useState("");
  const [memberMsg, setMemberMsg] = useState({ text: "", type: "" });
  const [addingMember, setAddingMember] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Remove member confirm
  const [removingId, setRemovingId] = useState(null);

// Create task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "", priority: "MEDIUM" });
  const [taskError, setTaskError] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskUserSearch, setTaskUserSearch] = useState("");
  const [showTaskUserDropdown, setShowTaskUserDropdown] = useState(false);

  // Update task status
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const currentUserId = getUserId();
  const isAdmin = project?.Admin === currentUserId || project?.Admin?._id === currentUserId || project?.Admin?.toString() === currentUserId;

useEffect(() => {
    // Fetch fresh project data with populated members
    const fetchProject = async () => {
      try {
        const res = await API.get(`/projects/${projectId}`, { headers });
        setProject(res.data.project);
        setProjectMembers(res.data.project.Members || []);
        // Also fetch all users
        fetchAllUsers();
      } catch (err) {
        console.error("Failed to fetch project", err);
      }
    };
    fetchProject();
    fetchTasks();
  }, [projectId]);

const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/tasks/getTasks?projectId=${projectId}`, { headers });
      setTasks(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

const fetchAllUsers = async () => {
    try {
      // Fetch all users for the dropdown
      const res = await API.get("/users/getUsers", { headers });
      setAllUsers(res.data?.users || []);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

const handleAddMember = async () => {
    if (!memberUserId.trim()) return;
    setAddingMember(true);
    setMemberMsg({ text: "", type: "" });
    try {
      await API.post("/projects/addmember", { projectId, userId: memberUserId }, { headers });
      setMemberMsg({ text: "Member added successfully!", type: "success" });
      setMemberUserId("");
      // Refresh project to get updated members list
      const res = await API.get(`/projects/${projectId}`, { headers });
      setProject(res.data.project);
      setProjectMembers(res.data.project.Members || []);
      // Refresh all users to get updated member details
      fetchAllUsers();
    } catch (err) {
      setMemberMsg({ text: err.response?.data?.message || "Failed to add member", type: "error" });
    } finally {
      setAddingMember(false);
    }
  };

const handleRemoveMember = async (userId) => {
    setRemovingId(userId);
    try {
      await API.post("/projects/removemember", { projectId, userId }, { headers });
      // Refresh project to get updated members list
      const res = await API.get(`/projects/${projectId}`, { headers });
      setProject(res.data.project);
      setProjectMembers(res.data.project.Members || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return setTaskError("Title is required");
    if (!taskForm.assignedTo.trim()) return setTaskError("Assigned user ID is required");
    setCreatingTask(true);
    setTaskError("");
    try {
      await API.post("/tasks/create", { ...taskForm, projectId }, { headers });
      setShowTaskModal(false);
      setTaskForm({ title: "", description: "", assignedTo: "", dueDate: "", priority: "MEDIUM" });
      fetchTasks();
    } catch (err) {
      setTaskError(err.response?.data?.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateStatus = async (taskId, status) => {
    setUpdatingTaskId(taskId);
    try {
      await API.post("/tasks/update", { taskId, status }, { headers });
      setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status } : t));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const priorityColor = (p) => ({ HIGH: "red", MEDIUM: "yellow", LOW: "green" }[p] || "blue");
  const statusColor  = (s) => ({ TODO: "blue", IN_PROGRESS: "yellow", DONE: "green" }[s] || "blue");

  return (
    <div className="pd-bg">
      <nav className="pd-nav">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← Back</button>
        <div className="nav-logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">TaskFlow</span>
        </div>
        <div style={{ width: 80 }} />
      </nav>

      <main className="pd-main">
        {/* Header */}
        <div className="pd-header">
          <div className="pd-proj-icon">{project?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className="pd-title">{project?.name || "Project"}</h1>
            <p className="pd-desc">{project?.description || "No description"}</p>
          </div>
          {isAdmin && (
            <span className="admin-badge">Admin</span>
          )}
        </div>

        {error && <div className="pd-error">{error}</div>}

        <div className="pd-grid">
          {/* ── LEFT: Tasks ── */}
          <div className="pd-left">
            <div className="section-header">
              <div className="section-label">Tasks</div>
              {isAdmin && (
                <button className="add-task-btn" onClick={() => setShowTaskModal(true)}>+ Add Task</button>
              )}
            </div>

            {loading && <div className="pd-loading">Loading tasks...</div>}

            {!loading && tasks.length === 0 && (
              <div className="empty-box">No tasks in this project yet.</div>
            )}

            <div className="task-list">
              {tasks.map((task) => (
                <div className="task-card" key={task._id}>
                  <div className="task-top">
                    <div className="task-title">{task.title}</div>
                    <span className={`tag tag-priority-${priorityColor(task.priority)}`}>{task.priority}</span>
                  </div>
                  {task.description && <div className="task-desc">{task.description}</div>}
<div className="task-bottom">
                    <span className={`tag tag-status-${statusColor(task.status)}`}>{task.status}</span>
                    {/* Show assignee name */}
                    <span className="assignee-name">
                      {(allUsers.find(u => u._id === task.assignedTo) || projectMembers.find(u => (u._id || u) === task.assignedTo))?.name || "Unassigned"}
                    </span>
                    {task.dueDate && (
                      <span className="due-date">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
{task.assignedTo === currentUserId && (
                      <select
                        className="status-select"
                        value={task.status}
                        disabled={updatingTaskId === task._id}
                        onChange={(e) => handleUpdateStatus(task._id, e.target.value)}
                      >
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Members ── */}
          <div className="pd-right">
            <div className="section-label">Members ({project?.Members?.length || 0})</div>

<div className="member-list">
              {(function() {
                const members = [...(project?.Members || [])].sort((a, b) => {
                  const aId = (a._id || a).toString();
                  const bId = (b._id || b).toString();
                  if (aId === project?.Admin?.toString()) return -1;
                  if (bId === project?.Admin?.toString()) return 1;
                  return 0;
                });
                return members.map((member) => {
                  const id = member._id || member;
                  const userData = allUsers.find(u => u._id === id) || member;
                  const name = userData.name || userData.email || "User";
                  const email = userData.email || "";
                  return (
                    <div className="member-row" key={id}>
                      <div className="member-avatar">{name.charAt(0).toUpperCase()}</div>
                      <div className="member-info">
                        <div className="member-name">{name}</div>
                        {email && <div className="member-email">{email}</div>}
                      </div>
                      {isAdmin && id !== currentUserId && (
                        <button
                          className="remove-btn"
                          disabled={removingId === id}
                          onClick={() => handleRemoveMember(id)}
                        >
                          {removingId === id ? "..." : "Remove"}
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

{/* Add Member — only for admin */}
            {isAdmin && (
              <div className="add-member-box">
                <div className="section-label" style={{ marginTop: 0 }}>Add Member</div>
                {memberMsg.text && (
                  <div className={`msg ${memberMsg.type}`}>{memberMsg.text}</div>
                )}
                <div className="user-dropdown-container">
                  <div className="user-search-box" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                    {memberUserId ? (
                      <div className="selected-user">
                        {allUsers.find(u => u._id === memberUserId)?.name || allUsers.find(u => u._id === memberUserId)?.email || "Select User"}
                      </div>
                    ) : (
                      <span className="placeholder">Select a user...</span>
                    )}
                    <span className="dropdown-arrow">{showUserDropdown ? "▲" : "▼"}</span>
                  </div>
                  {showUserDropdown && (
                    <div className="user-dropdown-list">
                      <input
                        type="text"
                        className="user-search-input"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
{/* Filter out users who are already members */}
                      {allUsers
                        .filter(u => {
                          const memberIds = projectMembers.map(m => (m._id || m).toString());
                          return memberIds.includes(u._id.toString()) === false;
                        })
                        .filter(u => 
                          u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map(user => (
                          <div
                            key={user._id}
                            className="user-option"
                            onClick={() => {
                              setMemberUserId(user._id);
                              setShowUserDropdown(false);
                              setUserSearch("");
                            }}
                          >
                            <div className="user-option-name">{user.name}</div>
                            <div className="user-option-email">{user.email}</div>
                          </div>
                        ))}
                      {allUsers.filter(u => {
                          const memberIds = projectMembers.map(m => (m._id || m).toString());
                          return memberIds.includes(u._id.toString()) === false;
                        }).filter(u => 
                        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="no-users">No users found</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="add-member-btn"
                  onClick={handleAddMember}
                  disabled={addingMember || !memberUserId}
                >
                  {addingMember ? "..." : "Add Member"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Create Task Modal ── */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Task</h2>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            {taskError && <div className="pd-error">{taskError}</div>}
            <div className="input-group">
              <label>Title *</label>
              <input type="text" placeholder="Task title" value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea rows={2} placeholder="Details..." value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
<div className="input-group">
              <label>Assign to *</label>
              <div className="user-dropdown-container">
<div className="user-search-box" onClick={() => setShowTaskUserDropdown(!showTaskUserDropdown)}>
                  {taskForm.assignedTo ? (
                    <div className="selected-user">
                      {/* Search in allUsers first, then projectMembers */}
                      {(allUsers.find(u => u._id === taskForm.assignedTo) || projectMembers.find(u => (u._id || u) === taskForm.assignedTo))?.name || "Select User"}
                    </div>
                  ) : (
                    <span className="placeholder">Select a user...</span>
                  )}
                  <span className="dropdown-arrow">{showTaskUserDropdown ? "▲" : "▼"}</span>
                </div>
                {showTaskUserDropdown && (
                  <div className="user-dropdown-list">
                    <input
                      type="text"
                      className="user-search-input"
                      placeholder="Search users..."
                      value={taskUserSearch}
                      onChange={(e) => setTaskUserSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
{/* For task assignment, show only project members */}
                    {(projectMembers.length > 0 ? projectMembers : allUsers)
                      .filter(u => 
                        u.name?.toLowerCase().includes(taskUserSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(taskUserSearch.toLowerCase())
                      )
                      .map(user => (
                        <div
                          key={user._id || user}
                          className="user-option"
                          onClick={() => {
                            setTaskForm({ ...taskForm, assignedTo: user._id || user });
                            setShowTaskUserDropdown(false);
                            setTaskUserSearch("");
                          }}
                        >
                          <div className="user-option-name">{user.name || "User"}</div>
                          <div className="user-option-email">{user.email || ""}</div>
                        </div>
                      ))}
                    {(projectMembers.length > 0 ? projectMembers : allUsers).filter(u => 
                      u.name?.toLowerCase().includes(taskUserSearch.toLowerCase()) ||
                      u.email?.toLowerCase().includes(taskUserSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="no-users">No users found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label>Due Date</label>
                <input type="date" value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Priority</label>
                <select value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button className="btn-create" onClick={handleCreateTask} disabled={creatingTask}>
                {creatingTask ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
