import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms } from '../hooks/usePrograms';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

const STATUS_COLORS = {
  Active:    { bg: '#D1FAE5', text: '#065F46' },
  Completed: { bg: '#DBEAFE', text: '#1E40AF' },
  'On Hold': { bg: '#FEF3C7', text: '#92400E' },
  Cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

const STATUS_TABS = ['All', 'Active', 'Completed', 'On Hold', 'Cancelled'];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function ProgramForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    estimated_budget: initial?.estimatedBudget ?? initial?.estimated_budget ?? '',
    start_date: initial?.startDate ?? initial?.start_date ?? '',
    end_date: initial?.endDate ?? initial?.end_date ?? '',
    status: initial?.status ?? 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    if (!form.estimated_budget || Number(form.estimated_budget) <= 0) { setErr('Estimated budget must be greater than 0.'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ez-accent';
  const labelCls = 'block text-xs font-medium mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style={{ background: '#1E1E1E', border: '1px solid #333' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <h2 className="font-semibold text-sm" style={{ color: '#eee' }}>{initial ? 'Edit Program' : 'New Program'}</h2>
          <button onClick={onClose} style={{ color: '#666', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <p className="text-xs rounded-lg px-3 py-2" style={{ background: '#3B1212', color: '#FCA5A5' }}>{err}</p>}

          <div>
            <label className={labelCls} style={{ color: '#aaa' }}>Program Title <span style={{ color: '#E8967A' }}>*</span></label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. School Infrastructure Drive 2026"
              style={{ background: '#141414', borderColor: '#333', color: '#eee' }} />
          </div>

          <div>
            <label className={labelCls} style={{ color: '#aaa' }}>Description</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the program…"
              style={{ background: '#141414', borderColor: '#333', color: '#eee', resize: 'vertical' }} />
          </div>

          <div>
            <label className={labelCls} style={{ color: '#aaa' }}>Estimated Budget (₹) <span style={{ color: '#E8967A' }}>*</span></label>
            <input type="number" min="1" step="0.01" className={inputCls} value={form.estimated_budget}
              onChange={e => set('estimated_budget', e.target.value)}
              placeholder="0.00"
              style={{ background: '#141414', borderColor: '#333', color: '#eee' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: '#aaa' }}>Start Date</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)}
                style={{ background: '#141414', borderColor: '#333', color: '#eee' }} />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#aaa' }}>End Date</label>
              <input type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)}
                style={{ background: '#141414', borderColor: '#333', color: '#eee' }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: '#aaa' }}>Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}
              style={{ background: '#141414', borderColor: '#333', color: '#eee' }}>
              {['Active', 'Completed', 'On Hold', 'Cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{ background: '#2a2a2a', color: '#aaa', border: '1px solid #333' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#E8967A', color: '#1A1A1A', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : (initial ? 'Update Program' : 'Create Program')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color = '#E8967A' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function ProgramCard({ program, onEdit, onDelete }) {
  const navigate = useNavigate();
  const pct = program.estimatedBudget > 0
    ? Math.min(100, Math.round((program.collectedAmount / program.estimatedBudget) * 100))
    : 0;
  const sc = STATUS_COLORS[program.status] || STATUS_COLORS.Active;

  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-all hover:scale-[1.01]"
      style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}
      onClick={() => navigate(`/programs/${program.id}`)}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono font-medium" style={{ color: '#8ECFCA' }}>{program.programCode}</span>
        <span className="text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
          style={{ background: sc.bg, color: sc.text }}>{program.status}</span>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold leading-snug" style={{ color: '#eee' }}>{program.title}</h3>
        {program.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: '#666' }}>{program.description}</p>
        )}
      </div>

      {/* Budget progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: '#888' }}>Collected</span>
          <span className="font-semibold" style={{ color: '#E8967A' }}>{pct}%</span>
        </div>
        <ProgressBar value={program.collectedAmount} max={program.estimatedBudget} />
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: '#666' }}>{fmt(program.collectedAmount)}</span>
          <span style={{ color: '#555' }}>of {fmt(program.estimatedBudget)}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs pt-1" style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
        <span style={{ color: '#666' }}>
          <span className="font-semibold" style={{ color: '#aaa' }}>{program.totalDeals}</span> deal{program.totalDeals !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#666' }}>
          <span className="font-semibold" style={{ color: '#aaa' }}>{program.allocationCount}</span> categor{program.allocationCount !== 1 ? 'ies' : 'y'}
        </span>
        {program.endDate && (
          <span className="ml-auto" style={{ color: '#555' }}>
            Ends {new Date(program.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(program)}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: '#2a2a2a', color: '#aaa', border: '1px solid #333' }}>Edit</button>
        <button onClick={() => onDelete(program)}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: '#2a2a2a', color: '#EF4444', border: '1px solid #3B1212' }}>Delete</button>
      </div>
    </div>
  );
}

export function Programs() {
  const { programs, loading, error, addProgram, updateProgram, deleteProgram } = usePrograms();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return programs.filter(p => {
      const matchTab = activeTab === 'All' || p.status === activeTab;
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.programCode?.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [programs, activeTab, search]);

  function handleEdit(program) { setEditing(program); setShowForm(true); }
  function handleCloseForm() { setShowForm(false); setEditing(null); }

  async function handleSave(data) {
    if (editing) {
      await updateProgram(editing.id, data);
      showToast('Program updated successfully.', 'success');
    } else {
      await addProgram(data);
      showToast('Program created successfully.', 'success');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteProgram(confirmDelete.id);
      showToast('Program deleted.', 'success');
      setConfirmDelete(null);
    } catch (ex) {
      showToast(ex.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  const canCreate = hasPermission('programs', 'can_create');

  return (
    <div style={{ background: '#E8E2DB', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page header */}
      <div style={{ background: 'linear-gradient(135deg, #E8967A 0%, #d4806a 100%)', borderRadius: 14, padding: '18px 24px', boxShadow: '0 4px 16px rgba(232,150,122,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'serif' }}>Programs</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '3px 0 0' }}>Fundraising programs with budget planning and deal tracking</p>
        </div>
        {canCreate && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ background: '#fff', color: '#E8967A', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Program
          </button>
        )}
      </div>

      {/* Search + status tabs */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div onClick={() => setFiltersOpen(v => !v)} style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="13" height="13" fill="none" stroke="#aaa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" /></svg>
          <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          <svg width="14" height="14" fill="none" stroke="#aaa" viewBox="0 0 24 24" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {filtersOpen && <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search programs…"
              className="rounded-lg border px-3 py-2 text-xs w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-ez-accent"
              style={{ background: '#F5F0EB', borderColor: '#D5CFC8', color: '#1A1A1A' }} />
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={activeTab === tab
                    ? { background: '#E8967A', color: '#fff' }
                    : { background: '#F0EBE5', color: '#666', border: '1px solid #D5CFC8' }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>}
      </div>

      {/* Summary bar */}
      {programs.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: '#2D2D2D', padding: '10px 20px' }}>
            <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Summary</span>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Programs', value: programs.length },
                { label: 'Active', value: programs.filter(p => p.status === 'Active').length },
                { label: 'Total Budget', value: fmt(programs.reduce((s, p) => s + p.estimatedBudget, 0)) },
                { label: 'Total Collected', value: fmt(programs.reduce((s, p) => s + p.collectedAmount, 0)) },
              ].map(s => (
                <div key={s.label} className="rounded-lg px-4 py-3" style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}>
                  <p className="text-xs" style={{ color: '#666' }}>{s.label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: '#eee' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="text-center py-16 text-xs" style={{ color: '#555' }}>Loading programs…</div>
      )}
      {error && (
        <div className="rounded-lg px-4 py-3 text-xs" style={{ background: '#3B1212', color: '#FCA5A5' }}>{error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium" style={{ color: '#555' }}>
            {search || activeTab !== 'All' ? 'No programs match your filters.' : 'No programs yet.'}
          </p>
          {canCreate && !search && activeTab === 'All' && (
            <button onClick={() => setShowForm(true)}
              className="mt-4 px-5 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#E8967A', color: '#1A1A1A' }}>
              Create First Program
            </button>
          )}
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Programs</span>
            <span style={{ color: '#666', fontSize: 11, background: '#3D3D3D', borderRadius: 12, padding: '2px 10px' }}>{filtered.length} total</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => (
                <ProgramCard key={p.id} program={p}
                  onEdit={handleEdit}
                  onDelete={prog => setConfirmDelete(prog)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <ProgramForm initial={editing} onSave={handleSave} onClose={handleCloseForm} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm mx-4" style={{ background: '#1E1E1E', border: '1px solid #333' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#eee' }}>Delete Program?</h3>
            <p className="text-xs mb-5" style={{ color: '#888' }}>
              "<span style={{ color: '#eee' }}>{confirmDelete.title}</span>" and all its budget allocations will be permanently deleted. Linked deals will remain but lose their program association.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg text-xs"
                style={{ background: '#2a2a2a', color: '#aaa', border: '1px solid #333' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{ background: '#EF4444', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Programs;
