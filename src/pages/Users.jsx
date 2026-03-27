import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CORAL = '#E8967A';
const TEAL  = '#8ECFCA';
const DARK  = '#1A1A1A';

const MODULES = [
  { key: 'donors',    label: 'Donors' },
  { key: 'deals',     label: 'Deals' },
  { key: 'donations', label: 'Donations' },
  { key: 'expenses',  label: 'Expenses' },
];

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete'];
const ACTION_LABEL = { can_view: 'View', can_create: 'Create', can_edit: 'Edit', can_delete: 'Delete' };

function blankPerms() {
  return MODULES.map(m => ({ module: m.key, can_view: true, can_create: false, can_edit: false, can_delete: false }));
}

function blankForm() {
  return { name: '', email: '', is_active: true, permissions: blankPerms() };
}

function TempPasswordModal({ password, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 32, width: 380, maxWidth: '90vw' }}>
        <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 16 }}>User Created</h3>
        <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 20px' }}>
          Share these credentials with the user. They will also receive an email if SMTP is configured.
        </p>
        <div style={{ background: '#FAE8DC', borderLeft: `4px solid ${CORAL}`, borderRadius: 6, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: DARK, fontWeight: 600 }}>Temporary Password</p>
          <p style={{ margin: '6px 0 0', fontSize: 18, fontFamily: 'monospace', color: DARK, letterSpacing: '0.1em' }}>{password}</p>
        </div>
        <p style={{ color: '#666', fontSize: 11, marginBottom: 20 }}>The user should change this after first login via Settings → Change Password.</p>
        <button onClick={onClose} style={{ background: CORAL, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 13, width: '100%' }}>
          Got it
        </button>
      </div>
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || blankForm());

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPerm = (module, action, val) => setForm(f => ({
    ...f,
    permissions: f.permissions.map(p => p.module === module ? { ...p, [action]: val } : p),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={labelStyle}>
          <span style={labelText}>Full Name *</span>
          <input value={form.name} onChange={e => set('name', e.target.value)} required style={inputStyle} placeholder="Jane Doe" />
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Email *</span>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required style={inputStyle} placeholder="jane@example.com" />
        </label>
      </div>

      {initial && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
            style={{ width: 14, height: 14, accentColor: CORAL }} />
          <span style={{ color: '#ccc', fontSize: 12 }}>Active</span>
        </label>
      )}

      {/* Module permissions */}
      <div>
        <p style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Module Permissions</p>
        <div style={{ border: '1px solid #333', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(4,1fr)', background: '#2a2a2a', padding: '8px 12px' }}>
            <span style={{ color: '#777', fontSize: 11, fontWeight: 600 }}>Module</span>
            {ACTIONS.map(a => <span key={a} style={{ color: '#777', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>{ACTION_LABEL[a]}</span>)}
          </div>
          {form.permissions.map(perm => (
            <div key={perm.module} style={{ display: 'grid', gridTemplateColumns: '140px repeat(4,1fr)', padding: '10px 12px', borderTop: '1px solid #2a2a2a', alignItems: 'center' }}>
              <span style={{ color: '#ddd', fontSize: 12 }}>{MODULES.find(m => m.key === perm.module)?.label}</span>
              {ACTIONS.map(action => (
                <div key={action} style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(perm[action])}
                    onChange={e => {
                      // If enabling create/edit/delete, ensure can_view is on
                      if (action !== 'can_view' && e.target.checked) setPerm(perm.module, 'can_view', true);
                      setPerm(perm.module, action, e.target.checked);
                    }}
                    style={{ width: 14, height: 14, accentColor: CORAL, cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button onClick={onCancel} style={{ background: 'none', border: '1px solid #444', color: '#aaa', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 12 }}>
          Cancel
        </button>
        <button onClick={() => onSave(form)} disabled={saving}
          style={{ background: CORAL, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : initial ? 'Update User' : 'Add User'}
        </button>
      </div>
    </div>
  );
}

export function Users() {
  const { user: me } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [panel, setPanel]       = useState(null); // null | 'add' | {user}
  const [saving, setSaving]     = useState(false);
  const [tempPwd, setTempPwd]   = useState('');
  const [error, setError]       = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/users');
    if (r.success) setUsers(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAdd(form) {
    setSaving(true); setError('');
    const r = await api.post('/users', form);
    setSaving(false);
    if (!r.success) { setError(r.message); return; }
    setPanel(null);
    setTempPwd(r.tempPassword);
    fetchUsers();
  }

  async function handleUpdate(form) {
    setSaving(true); setError('');
    const r = await api.put(`/users/${panel.id}`, form);
    setSaving(false);
    if (!r.success) { setError(r.message); return; }
    setPanel(null);
    fetchUsers();
  }

  async function handleDeactivate(u) {
    if (!window.confirm(`Deactivate ${u.name}?`)) return;
    await api.delete(`/users/${u.id}`);
    fetchUsers();
  }

  async function handleResetPwd(u) {
    if (!window.confirm(`Reset password for ${u.name}?`)) return;
    const r = await api.post(`/users/${u.id}/reset-password`, {});
    if (r.success) setTempPwd(r.newPassword);
  }

  function openEdit(u) {
    setError('');
    const perms = MODULES.map(m => {
      const found = u.permissions.find(p => p.module === m.key);
      return found
        ? { module: m.key, can_view: Boolean(found.can_view), can_create: Boolean(found.can_create), can_edit: Boolean(found.can_edit), can_delete: Boolean(found.can_delete) }
        : { module: m.key, can_view: false, can_create: false, can_edit: false, can_delete: false };
    });
    setPanel({ ...u, permissions: perms });
  }

  const roleTag = (role) => (
    <span style={{ background: role === 'admin' ? '#FAE8DC' : '#e8f4f3', color: role === 'admin' ? CORAL : TEAL, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {role}
    </span>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {tempPwd && <TempPasswordModal password={tempPwd} onClose={() => setTempPwd('')} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Users</h1>
          <p style={{ color: '#777', fontSize: 12, margin: '4px 0 0' }}>Manage portal access and module permissions</p>
        </div>
        <button
          onClick={() => { setError(''); setPanel('add'); }}
          style={{ background: CORAL, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add User
        </button>
      </div>

      {/* Add / Edit Panel */}
      {panel && (
        <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15 }}>
            {panel === 'add' ? 'Add New User' : `Edit — ${panel.name}`}
          </h3>
          {error && <div style={{ background: '#3a1a1a', border: '1px solid #c0392b', color: '#e74c3c', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>{error}</div>}
          <UserForm
            initial={panel === 'add' ? null : panel}
            onSave={panel === 'add' ? handleAdd : handleUpdate}
            onCancel={() => setPanel(null)}
            saving={saving}
          />
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#252525' }}>
                {['Name', 'Email', 'Role', 'Access', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ color: '#777', fontSize: 11, fontWeight: 600, padding: '10px 16px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #2a2a2a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'admin' ? CORAL : TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ color: '#ddd', fontSize: 13 }}>{u.name}</span>
                      {u.id === me?.id && <span style={{ color: '#555', fontSize: 10 }}>(you)</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#aaa', fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>{roleTag(u.role)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {u.role === 'admin' ? (
                      <span style={{ color: '#555', fontSize: 11 }}>All modules</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.permissions.filter(p => p.can_view).map(p => (
                          <span key={p.module} style={{ background: '#2a3a3a', color: TEAL, fontSize: 10, padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>{p.module}</span>
                        ))}
                        {!u.permissions.some(p => p.can_view) && <span style={{ color: '#555', fontSize: 11 }}>No access</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: u.is_active ? '#4caf50' : '#f44336', fontSize: 11, fontWeight: 600 }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={actionBtn('#333', '#ddd')}>Edit</button>
                      <button onClick={() => handleResetPwd(u)} style={actionBtn('#2a3a3a', TEAL)}>Reset Pwd</button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleDeactivate(u)} style={actionBtn('#3a1a1a', '#e74c3c')}>
                          {u.is_active ? 'Deactivate' : 'Deactivated'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>No users yet. Add one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelText  = { color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle = { background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 6, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const actionBtn  = (bg, color) => ({ background: bg, color, border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 });
