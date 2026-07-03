import '../styles/pages/UsersPage.css';
import React, { useEffect, useState, useCallback } from "react";
import {
  PageHeader, Card, DataTable, TR, TD,
  Btn, SearchInput, Field, TextInput, Select, Toast, StatCard,
} from "../components/ui";
import { userService, UserRecord, UserRole, CreateUserPayload } from "../services/userService";
import { authService } from "../services/authService";

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<UserRole, { color: string; bg: string }> = {
  ADMIN:   { color: "#1e40af", bg: "#dbeafe" },
  MANAGER: { color: "#065f46", bg: "#d1fae5" },
  STAFF:   { color: "#92400e", bg: "#fef3c7" },
};

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const cfg = ROLE_CFG[role] ?? { color: "var(--ink-60)", bg: "var(--ink-5)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 50,
      fontSize: 11.5, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      letterSpacing: "0.02em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {role}
    </span>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────

const ActiveBadge: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 10px", borderRadius: 50, fontSize: 11.5, fontWeight: 700,
    color:      enabled ? "#065f46"  : "#991b1b",
    background: enabled ? "#d1fae5" : "#fee2e2",
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: enabled ? "#10b981" : "#ef4444" }} />
    {enabled ? "Active" : "Disabled"}
  </span>
);

// ── Modal overlay ─────────────────────────────────────────────────────────────

const Overlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}
  >
    <div onClick={e => e.stopPropagation()} style={{
      background: "var(--white)",
      borderRadius: "var(--radius-xl)",
      width: "100%", maxWidth: 480,
      maxHeight: "90vh", overflowY: "auto",
      boxShadow: "var(--shadow-lg)",
      animation: "fadeUp 0.2s ease",
    }}>
      {children}
    </div>
  </div>
);

// ── Delete confirm ────────────────────────────────────────────────────────────

const DeleteConfirm: React.FC<{
  user: UserRecord;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ user, onConfirm, onCancel, loading }) => (
  <Overlay onClose={onCancel}>
    <div style={{ padding: "28px 28px 24px" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "var(--radius-lg)",
        background: "#fee2e2", display: "flex", alignItems: "center",
        justifyContent: "center", marginBottom: 16,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </div>
      <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>
        Delete User
      </h3>
      <p style={{ fontSize: 13.5, color: "var(--ink-60)", marginBottom: 24, lineHeight: 1.6 }}>
        Are you sure you want to delete <strong style={{ color: "var(--ink)" }}>{user.fullName ?? user.username}</strong>?
        This action cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting…" : "Delete User"}
        </Btn>
      </div>
    </div>
  </Overlay>
);

// ── User form (create / edit) ─────────────────────────────────────────────────

interface FormState {
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  password: string;
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  username: "", fullName: "", email: "",
  role: "STAFF", password: "", enabled: true,
};

const UserForm: React.FC<{
  mode: "create" | "edit";
  initial?: FormState;
  onSubmit: (f: FormState) => void;
  onClose: () => void;
  loading: boolean;
  error: string;
}> = ({ mode, initial = EMPTY_FORM, onSubmit, onClose, loading, error }) => {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: "22px 28px 18px",
        borderBottom: "1px solid var(--ink-10)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>
            {mode === "create" ? "Create User" : "Edit User"}
          </h2>
          <p style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 2 }}>
            {mode === "create" ? "Add a new system user" : "Update user details"}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: "var(--radius-md)",
            border: "none", background: "var(--ink-5)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-60)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-md)",
            background: "var(--danger-bg)", border: "1px solid #fca5a5",
            fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Row: Full name + Username */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Full Name" required>
            <TextInput value={form.fullName} onChange={set("fullName")} placeholder="e.g. John Smith" />
          </Field>
          <Field label="Username" required>
            <TextInput
              value={form.username} onChange={set("username")}
              placeholder="e.g. jsmith"
            />
          </Field>
        </div>

        {/* Email */}
        <Field label="Email">
          <TextInput value={form.email} onChange={set("email")} placeholder="john@example.com" type="email" />
        </Field>

        {/* Row: Role + Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Role" required>
            <Select value={form.role} onChange={v => set("role")(v as UserRole)}>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.enabled ? "active" : "disabled"} onChange={v => set("enabled")(v === "active")}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </Select>
          </Field>
        </div>

        {/* Password */}
        <Field label="Password" required={mode === "create"}>
          <TextInput
            value={form.password} onChange={set("password")}
            placeholder={mode === "edit" ? "Leave blank to keep current" : "Min 6 characters"}
            type="password"
          />
        </Field>

        {/* Role description */}
        <div style={{
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          background: "var(--ink-5)", border: "1px solid var(--ink-10)",
        }}>
          <p style={{ fontSize: 12, color: "var(--ink-60)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--ink)" }}>ADMIN</strong> — Full access including user management · &nbsp;
            <strong style={{ color: "var(--ink)" }}>MANAGER</strong> — Access to upload, day-end approval · &nbsp;
            <strong style={{ color: "var(--ink)" }}>STAFF</strong> — View and basic operations only
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "16px 28px",
        borderTop: "1px solid var(--ink-10)",
        display: "flex", gap: 10, justifyContent: "flex-end",
      }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onSubmit(form)} disabled={loading}>
          {loading
            ? (mode === "create" ? "Creating…" : "Saving…")
            : (mode === "create" ? "Create User" : "Save Changes")}
        </Btn>
      </div>
    </Overlay>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const UsersPage: React.FC = () => {
  const [users, setUsers]               = useState<UserRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("ALL");

  const [showCreate, setShowCreate]     = useState(false);
  const [editUser, setEditUser]         = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser]     = useState<UserRecord | null>(null);

  const [formLoading, setFormLoading]   = useState(false);
  const [formError, setFormError]       = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toast ──────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.username.toLowerCase().includes(q)
      || (u.fullName ?? "").toLowerCase().includes(q)
      || (u.email ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const total    = users.length;
  const admins   = users.filter(u => u.role === "ADMIN").length;
  const managers = users.filter(u => u.role === "MANAGER").length;
  const staff    = users.filter(u => u.role === "STAFF").length;
  const active   = users.filter(u => u.enabled).length;

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (form: FormState) => {
    if (!form.fullName.trim()) { setFormError("Full name is required"); return; }
    if (!form.username.trim()) { setFormError("Username is required"); return; }
    if (form.password.length < 6) { setFormError("Password must be at least 6 characters"); return; }

    setFormLoading(true);
    setFormError("");
    try {
      const payload: CreateUserPayload = {
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      await userService.create(payload);
      // Close modal first so the toast renders over the page, not the overlay
      setShowCreate(false);
      showToast(`User "${form.fullName.trim() || form.username.trim()}" created successfully`, "success");
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = async (form: FormState) => {
    if (!editUser) return;
    if (!form.fullName.trim()) { setFormError("Full name is required"); return; }

    setFormLoading(true);
    setFormError("");
    try {
      await userService.update(editUser.id, {
        fullName: form.fullName.trim(),
        email:    form.email.trim() || undefined,
        role:     form.role,
        enabled:  form.enabled,
        password: form.password || undefined,
      });
      setEditUser(null);
      showToast(`User "${form.fullName.trim() || editUser.username}" updated successfully`, "success");
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await userService.remove(deleteUser.id);
      setDeleteUser(null);
      showToast(`User "${deleteUser.username}" deleted`, "success");
      load();
    } catch {
      showToast("Failed to delete user", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-up">

      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        title="User Management"
        subtitle="Manage system users and their access roles"
        action={isAdmin ? (
          <Btn variant="primary" onClick={() => { setFormError(""); setShowCreate(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add User
          </Btn>
        ) : undefined}
      />

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }} className="stagger">
        <StatCard label="Total Users"  value={total}    color="var(--brand)"  colorBg="var(--brand-light)" icon={<UsersIcon />} />
        <StatCard label="Active"       value={active}   color="#0d7a4e"       colorBg="#d1fae5"            icon={<CheckIcon />} />
        <StatCard label="Admins"       value={admins}   color="#1e40af"       colorBg="#dbeafe"            icon={<ShieldIcon />} />
        <StatCard label="Managers"     value={managers} color="#065f46"       colorBg="#d1fae5"            icon={<BriefcaseIcon />} />
        <StatCard label="Staff"        value={staff}    color="#92400e"       colorBg="#fef3c7"            icon={<PersonIcon />} />
      </div>

      {/* ── Toolbar ── */}
      <Card style={{ marginBottom: 16 }} padding="14px 18px">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, username, email…"
            width="280px"
          />
          <Select value={roleFilter} onChange={setRoleFilter} style={{ minWidth: 140 }}>
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
          </Select>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-40)" }}>
            {filtered.length} of {total} users
          </span>
        </div>
      </Card>

      {/* ── Table ── */}
      <DataTable
        headers={["User", "Username", "Email", "Role", "Status", "Created", ...(isAdmin ? ["Actions"] : [])]}
        empty={!loading && filtered.length === 0}
        emptyText={search || roleFilter !== "ALL" ? "No users match your filters" : "No users found"}
        loading={loading}
      >
        {filtered.map(user => (
          <TR key={user.id}>
            {/* User avatar + name */}
            <TD>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: ROLE_CFG[user.role]?.bg ?? "var(--ink-5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  color: ROLE_CFG[user.role]?.color ?? "var(--ink-60)",
                }}>
                  {(user.fullName ?? user.username).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13.5 }}>
                    {user.fullName ?? "—"}
                  </div>
                  {user.fullName && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-40)", marginTop: 1 }}>
                      ID: {user.id}
                    </div>
                  )}
                </div>
              </div>
            </TD>
            <TD><code style={{ fontSize: 12.5, color: "var(--ink-80)" }}>{user.username}</code></TD>
            <TD style={{ color: "var(--ink-60)" }}>{user.email ?? "—"}</TD>
            <TD><RoleBadge role={user.role} /></TD>
            <TD><ActiveBadge enabled={user.enabled} /></TD>
            <TD style={{ fontSize: 12.5, color: "var(--ink-40)" }}>
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—"}
            </TD>
            {isAdmin && (
              <TD>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn
                    size="sm" variant="secondary"
                    onClick={() => {
                      setFormError("");
                      setEditUser(user);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </Btn>
                  {user.id !== (currentUser?.userId ?? -1) && (
                    <Btn size="sm" variant="danger" onClick={() => setDeleteUser(user)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                      Delete
                    </Btn>
                  )}
                </div>
              </TD>
            )}
          </TR>
        ))}
      </DataTable>

      {/* ── Create modal ── */}
      {showCreate && (
        <UserForm
          mode="create"
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={formLoading}
          error={formError}
        />
      )}

      {/* ── Edit modal ── */}
      {editUser && (
        <UserForm
          mode="edit"
          initial={{
            username: editUser.username,
            fullName: editUser.fullName ?? "",
            email:    editUser.email ?? "",
            role:     editUser.role,
            password: "",
            enabled:  editUser.enabled,
          }}
          onSubmit={handleEdit}
          onClose={() => setEditUser(null)}
          loading={formLoading}
          error={formError}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteUser && (
        <DeleteConfirm
          user={deleteUser}
          onConfirm={handleDelete}
          onCancel={() => setDeleteUser(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default UsersPage;
