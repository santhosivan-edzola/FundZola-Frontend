import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePrograms } from '../hooks/usePrograms';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { api } from '../utils/api';

const STATUS_COLORS = {
  Active:    { bg: '#D1FAE5', text: '#065F46' },
  Completed: { bg: '#DBEAFE', text: '#1E40AF' },
  'On Hold': { bg: '#FEF3C7', text: '#92400E' },
  Cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

const DEAL_STAGE_COLORS = {
  Prospect:  '#8B5CF6',
  Contacted: '#3B82F6',
  Pledged:   '#F59E0B',
  Confirmed: '#10B981',
  Received:  '#E8967A',
  'Closed Lost': '#EF4444',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function ProgressBar({ value, max, color = '#E8967A', height = 8 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="rounded-full overflow-hidden" style={{ background: '#2a2a2a', height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Budget Allocation Modal ───────────────────────────────────────────────────
function AllocationModal({ program, categories, onSave, onClose }) {
  const [amounts, setAmounts] = useState(() => {
    const map = {};
    (program.allocations || []).forEach(a => { map[a.category_id] = { amount: a.allocated_amount, notes: a.notes || '' }; });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const totalAllocated = categories.reduce((s, c) => s + Number(amounts[c.id]?.amount || 0), 0);
  const remaining = Number(program.estimated_budget ?? program.estimatedBudget ?? 0) - totalAllocated;
  const budget = Number(program.estimated_budget ?? program.estimatedBudget ?? 0);

  function setAmt(catId, val) {
    setAmounts(prev => ({ ...prev, [catId]: { ...prev[catId], amount: val, notes: prev[catId]?.notes || '' } }));
  }
  function setNote(catId, val) {
    setAmounts(prev => ({ ...prev, [catId]: { ...prev[catId], notes: val, amount: prev[catId]?.amount || '' } }));
  }

  async function handleSave() {
    setErr('');
    if (totalAllocated > budget) {
      setErr(`Total allocation ${fmt(totalAllocated)} exceeds program budget ${fmt(budget)}.`);
      return;
    }
    setSaving(true);
    try {
      const allocations = categories
        .map(c => ({ category_id: c.id, allocated_amount: Number(amounts[c.id]?.amount || 0), notes: amounts[c.id]?.notes || null }))
        .filter(a => a.allocated_amount > 0);
      await onSave(allocations);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ background: '#1E1E1E', border: '1px solid #333', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <h2 className="font-semibold text-sm" style={{ color: '#eee' }}>Manage Budget Allocations</h2>
          <button onClick={onClose} style={{ color: '#666', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {/* Budget status bar */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span style={{ color: '#888' }}>Total Program Budget</span>
            <span className="font-semibold" style={{ color: '#eee' }}>{fmt(budget)}</span>
          </div>
          <ProgressBar value={totalAllocated} max={budget} color="#8ECFCA" height={6} />
          <div className="flex items-center justify-between text-xs mt-1.5">
            <span style={{ color: '#8ECFCA' }}>Allocated: {fmt(totalAllocated)}</span>
            <span style={{ color: remaining < 0 ? '#EF4444' : '#555' }}>
              {remaining < 0 ? `Over by ${fmt(Math.abs(remaining))}` : `Remaining: ${fmt(remaining)}`}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {err && <p className="text-xs rounded-lg px-3 py-2" style={{ background: '#3B1212', color: '#FCA5A5' }}>{err}</p>}
          {categories.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: '#555' }}>No active categories. Ask an admin to add categories first.</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="rounded-lg p-4" style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color || '#6366F1' }} />
                <span className="text-xs font-semibold" style={{ color: '#eee' }}>{cat.name}</span>
                {cat.description && <span className="text-xs ml-1" style={{ color: '#555' }}> — {cat.description}</span>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#777' }}>Allocated Amount (₹)</label>
                  <input type="number" min="0" step="0.01"
                    value={amounts[cat.id]?.amount || ''}
                    onChange={e => setAmt(cat.id, e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1"
                    style={{ background: '#1E1E1E', borderColor: '#333', color: '#eee' }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#777' }}>Notes</label>
                  <input type="text"
                    value={amounts[cat.id]?.notes || ''}
                    onChange={e => setNote(cat.id, e.target.value)}
                    placeholder="Optional note…"
                    className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1"
                    style={{ background: '#1E1E1E', borderColor: '#333', color: '#eee' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #2a2a2a' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs"
            style={{ background: '#2a2a2a', color: '#aaa', border: '1px solid #333' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || totalAllocated > budget} className="flex-1 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#E8967A', color: '#1A1A1A', opacity: (saving || totalAllocated > budget) ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Allocations'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Category Master Modal (admin) ─────────────────────────────────────────────
function CategoryMasterModal({ categories, onAdd, onUpdate, onToggle, onDelete, onClose }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366F1' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function startEdit(cat) {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', color: cat.color || '#6366F1' });
    setErr('');
  }
  function cancelEdit() { setEditingId(null); setForm({ name: '', description: '', color: '#6366F1' }); setErr(''); }

  async function handleSave() {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setSaving(true);
    setErr('');
    try {
      if (editingId) await onUpdate(editingId, form);
      else await onAdd(form);
      cancelEdit();
    } catch (ex) { setErr(ex.message); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1';
  const style0 = { background: '#141414', borderColor: '#333', color: '#eee' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-xl mx-4 flex flex-col" style={{ background: '#1E1E1E', border: '1px solid #333', maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <h2 className="font-semibold text-sm" style={{ color: '#eee' }}>Manage Program Categories</h2>
          <button onClick={onClose} style={{ color: '#666', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {/* Add / Edit form */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#888' }}>{editingId ? 'Edit Category' : 'Add Category'}</p>
          {err && <p className="text-xs rounded px-3 py-2 mb-2" style={{ background: '#3B1212', color: '#FCA5A5' }}>{err}</p>}
          <div className="flex gap-2">
            <input className={inputCls} style={style0} placeholder="Category name *" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input className={inputCls} style={style0} placeholder="Description" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              className="rounded border h-7 w-10 flex-shrink-0 cursor-pointer" style={{ borderColor: '#333', background: '#141414' }} title="Pick color" />
            {editingId && (
              <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
                style={{ background: '#2a2a2a', color: '#aaa', border: '1px solid #333' }}>×</button>
            )}
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: '#E8967A', color: '#1A1A1A', opacity: saving ? 0.7 : 1 }}>
              {saving ? '…' : (editingId ? 'Update' : 'Add')}
            </button>
          </div>
        </div>

        {/* Category list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {categories.length === 0 && <p className="text-xs text-center py-6" style={{ color: '#555' }}>No categories yet.</p>}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color || '#6366F1' }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium" style={{ color: cat.is_active ? '#eee' : '#555' }}>{cat.name}</span>
                {cat.description && <span className="text-xs ml-2" style={{ color: '#555' }}>{cat.description}</span>}
              </div>
              {!cat.is_active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#2a2a2a', color: '#555' }}>Inactive</span>}
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => startEdit(cat)} className="px-2.5 py-1 rounded text-xs"
                  style={{ background: '#2a2a2a', color: '#aaa' }}>Edit</button>
                <button onClick={() => onToggle(cat.id)} className="px-2.5 py-1 rounded text-xs"
                  style={{ background: '#2a2a2a', color: cat.is_active ? '#F59E0B' : '#10B981' }}>
                  {cat.is_active ? 'Disable' : 'Enable'}</button>
                <button onClick={() => onDelete(cat.id)} className="px-2.5 py-1 rounded text-xs"
                  style={{ background: '#2a2a2a', color: '#EF4444' }}>Del</button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #2a2a2a' }}>
          <button onClick={onClose} className="w-full py-2 rounded-lg text-xs font-medium"
            style={{ background: '#2a2a2a', color: '#aaa', border: '1px solid #333' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────
export function ProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categories, saveAllocations, updateProgram,
    addCategory, updateCategory, toggleCategory, deleteCategory,
    fetchCategories } = usePrograms();
  const { isAdmin, hasPermission } = useAuth();
  const { showToast } = useToast();

  const [program, setProgram] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [showAlloc, setShowAlloc] = useState(false);
  const [showCatMaster, setShowCatMaster] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/programs/${id}`);
      if (res.success) setProgram(res.data);
    } catch { /* ignore */ }
    finally { setLoadingDetail(false); }
  }, [id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // when admin opens category master, fetch all (including inactive)
  function openCatMaster() { fetchCategories(true); setShowCatMaster(true); }

  if (loadingDetail) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: '#555' }}>Loading program…</div>
  );
  if (!program) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: '#EF4444' }}>Program not found.</div>
  );

  const budget = Number(program.estimated_budget ?? 0);
  const collected = Number(program.collected_amount ?? 0);
  const totalAllocated = (program.allocations || []).reduce((s, a) => s + Number(a.allocated_amount), 0);
  const unallocated = budget - totalAllocated;
  const collectedPct = budget > 0 ? Math.min(100, Math.round((collected / budget) * 100)) : 0;
  const sc = STATUS_COLORS[program.status] || STATUS_COLORS.Active;

  async function handleSaveAllocations(allocations) {
    await saveAllocations(program.id, allocations);
    await loadDetail();
    showToast('Budget allocations saved.', 'success');
  }

  const canEdit = hasPermission('programs', 'can_edit');

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back nav */}
      <button onClick={() => navigate('/programs')}
        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
        style={{ color: '#8ECFCA', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Programs
      </button>

      {/* Program header card */}
      <div className="rounded-xl p-6" style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono" style={{ color: '#8ECFCA' }}>{program.program_code}</span>
              <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                style={{ background: sc.bg, color: sc.text }}>{program.status}</span>
            </div>
            <h1 className="text-xl font-bold leading-snug" style={{ color: '#eee' }}>{program.title}</h1>
            {program.description && <p className="text-sm mt-1.5" style={{ color: '#777' }}>{program.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: '#666' }}>
              {program.start_date && (
                <span>Start: <span style={{ color: '#aaa' }}>{new Date(program.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
              )}
              {program.end_date && (
                <span>End: <span style={{ color: '#aaa' }}>{new Date(program.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {isAdmin && (
              <button onClick={openCatMaster}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#2a2a2a', color: '#8ECFCA', border: '1px solid #333' }}>
                Manage Categories
              </button>
            )}
            {canEdit && (
              <button onClick={() => setShowAlloc(true)}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#2a2a2a', color: '#E8967A', border: '1px solid #333' }}>
                Budget Allocations
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Budget overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Estimated Budget', value: fmt(budget), color: '#eee' },
          { label: 'Collected', value: fmt(collected), color: '#E8967A' },
          { label: 'Allocated', value: fmt(totalAllocated), color: '#8ECFCA' },
          { label: 'Unallocated', value: fmt(unallocated), color: unallocated < 0 ? '#EF4444' : '#555' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}>
            <p className="text-xs mb-1" style={{ color: '#555' }}>{s.label}</p>
            <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Collection progress */}
      <div className="rounded-xl p-5" style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-medium" style={{ color: '#aaa' }}>Collection Progress</span>
          <span className="font-bold text-sm" style={{ color: '#E8967A' }}>{collectedPct}%</span>
        </div>
        <ProgressBar value={collected} max={budget} height={10} />
        <div className="flex items-center justify-between text-xs mt-2" style={{ color: '#555' }}>
          <span>{fmt(collected)} collected</span>
          <span>target {fmt(budget)}</span>
        </div>
      </div>

      {/* Budget Allocations by Category */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#eee' }}>Budget Allocations</h2>
          <span className="text-xs" style={{ color: '#555' }}>{(program.allocations || []).length} categor{(program.allocations || []).length !== 1 ? 'ies' : 'y'}</span>
        </div>
        {(program.allocations || []).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs mb-3" style={{ color: '#555' }}>No budget allocated to categories yet.</p>
            {canEdit && (
              <button onClick={() => setShowAlloc(true)} className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: '#E8967A', color: '#1A1A1A' }}>Allocate Budget</button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#2a2a2a' }}>
            {program.allocations.map(a => {
              const pct = budget > 0 ? Math.round((Number(a.allocated_amount) / budget) * 100) : 0;
              return (
                <div key={a.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.category_color || '#6366F1' }} />
                      <span className="text-xs font-medium truncate" style={{ color: '#eee' }}>{a.category_name}</span>
                      {a.notes && <span className="text-xs hidden sm:block truncate" style={{ color: '#555' }}>{a.notes}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-semibold" style={{ color: '#8ECFCA' }}>{fmt(a.allocated_amount)}</span>
                      <span className="text-xs w-10 text-right" style={{ color: '#555' }}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar value={Number(a.allocated_amount)} max={budget} color={a.category_color || '#6366F1'} height={4} />
                </div>
              );
            })}
            {/* Unallocated row */}
            {unallocated > 0 && (
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs" style={{ color: '#555' }}>Unallocated</span>
                <span className="text-xs font-medium" style={{ color: '#555' }}>{fmt(unallocated)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Linked Deals */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1E1E1E', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#eee' }}>Linked Deals</h2>
          <span className="text-xs" style={{ color: '#555' }}>{(program.deals || []).length} deal{(program.deals || []).length !== 1 ? 's' : ''}</span>
        </div>
        {(program.deals || []).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs" style={{ color: '#555' }}>No deals linked to this program yet. When creating a deal, select this program.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {['Deal Title', 'Donor', 'Amount', 'Stage', 'Expected Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-semibold" style={{ color: '#666' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {program.deals.map(deal => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: '#eee' }}>{deal.title}</td>
                    <td className="px-5 py-3" style={{ color: '#888' }}>{deal.donor_name}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: '#E8967A' }}>{fmt(deal.amount)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${DEAL_STAGE_COLORS[deal.stage] || '#666'}22`, color: DEAL_STAGE_COLORS[deal.stage] || '#666' }}>
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ color: '#666' }}>
                      {deal.expected_date ? new Date(deal.expected_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation Modal */}
      {showAlloc && (
        <AllocationModal
          program={program}
          categories={categories.filter(c => c.is_active)}
          onSave={handleSaveAllocations}
          onClose={() => setShowAlloc(false)} />
      )}

      {/* Category Master Modal (admin) */}
      {showCatMaster && (
        <CategoryMasterModal
          categories={categories}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onToggle={toggleCategory}
          onDelete={async (catId) => {
            try { await deleteCategory(catId); showToast('Category deleted.', 'success'); }
            catch (ex) { showToast(ex.message, 'error'); }
          }}
          onClose={() => { setShowCatMaster(false); fetchCategories(); }} />
      )}
    </div>
  );
}

export default ProgramDetail;
