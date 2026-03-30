import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDeals } from '../hooks/useDeals';
import { useDonors } from '../hooks/useDonors';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CalendarGrid } from '../components/ui/CalendarGrid';
import { formatCurrency, formatDate } from '../utils/formatters';

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGES = ['Prospect', 'Contacted', 'Pledged', 'Confirmed', 'Received', 'Closed Lost'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const STAGE_META = {
  Prospect:     { color: '#8ECFCA', bg: '#E8F7F6', label: 'Prospect' },
  Contacted:    { color: '#E8967A', bg: '#FDF0EB', label: 'Contacted' },
  Pledged:      { color: '#e8c07a', bg: '#FDF7EB', label: 'Pledged' },
  Confirmed:    { color: '#7ab8e8', bg: '#EBF4FD', label: 'Confirmed' },
  Received:     { color: '#7ae87a', bg: '#EBF9EB', label: 'Received' },
  'Closed Lost':{ color: '#b0b0b0', bg: '#F5F5F5', label: 'Closed Lost' },
};

const PRIORITY_META = {
  Low:    { color: '#8ECFCA', label: 'Low' },
  Medium: { color: '#e8c07a', label: 'Medium' },
  High:   { color: '#E8967A', label: 'High' },
};

const VIEWS = [
  { id: 'kanban',   label: 'Kanban',   icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
  { id: 'list',     label: 'List',     icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

const emptyForm = { donorId: '', title: '', amount: '', stage: 'Prospect', priority: 'Medium', notes: '', expectedDate: '' };

// ── Deal Form ──────────────────────────────────────────────────────────────────
function DealForm({ initialData = {}, donors, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    donorId:      initialData.donorId      || initialData.donor_id || '',
    title:        initialData.title        || '',
    amount:       initialData.amount       || '',
    stage:        initialData.stage        || 'Prospect',
    priority:     initialData.priority     || 'Medium',
    notes:        initialData.notes        || '',
    expectedDate: initialData.expectedDate || initialData.expected_date || '',
  });
  const [errors, setErrors] = useState({});

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.donorId) errs.donorId = 'Donor is required';
    if (!form.title?.trim()) errs.title = 'Title is required';
    return errs;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ ...form, amount: parseFloat(form.amount) || 0 });
  };

  const isEdit = Boolean(initialData.id);

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select label="Donor" name="donorId" value={form.donorId} onChange={handle}
        error={errors.donorId} required
        options={donors.map(d => ({ value: d.id, label: d.name }))}
        placeholder="Select donor" />

      <Input label="Deal Title" name="title" value={form.title} onChange={handle}
        error={errors.title} required placeholder="e.g. Annual pledge from Ravi Kumar" />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Expected Amount (₹)" name="amount" type="number" value={form.amount}
          onChange={handle} placeholder="0" />
        <Input label="Expected Date" name="expectedDate" type="date" value={form.expectedDate}
          onChange={handle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Stage" name="stage" value={form.stage} onChange={handle}
          options={STAGES.map(s => ({ value: s, label: s }))} />
        <Select label="Priority" name="priority" value={form.priority} onChange={handle}
          options={PRIORITIES.map(p => ({ value: p, label: p }))} />
      </div>

      <div>
        <label className="ez-label">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handle} rows={3}
          placeholder="Any context, follow-up notes..."
          className="ez-input w-full mt-1 resize-none" />
      </div>

      <div className="flex gap-3 pt-2 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Deal' : 'Add Deal'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Deal Card (Kanban) ─────────────────────────────────────────────────────────
function DealCard({ deal, onEdit, onDelete, onStageChange }) {
  const meta = STAGE_META[deal.stage] || STAGE_META.Prospect;
  const pMeta = PRIORITY_META[deal.priority] || PRIORITY_META.Medium;
  const isOverdue = deal.expectedDate && new Date(deal.expectedDate) < new Date() && deal.stage !== 'Received' && deal.stage !== 'Closed Lost';

  return (
    <div className="bg-white rounded-lg border shadow-sm p-3 space-y-2 group"
      style={{ borderColor: '#E8E0D8', cursor: onEdit ? 'pointer' : 'default' }}
      onClick={() => onEdit && onEdit(deal)}>

      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-ez-dark leading-snug flex-1">{deal.title}</p>
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(deal); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:text-red-600 transition-all flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-xs text-ez-muted">{deal.donorName || '—'}</p>

      {deal.amount > 0 && (
        <p className="text-sm font-bold" style={{ color: '#E8967A' }}>{formatCurrency(deal.amount)}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: pMeta.color + '22', color: pMeta.color }}>
          {deal.priority}
        </span>
        {deal.expectedDate && (
          <span className="text-xs" style={{ color: isOverdue ? '#E87A7A' : '#888' }}>
            {isOverdue ? '⚠ ' : ''}{formatDate(deal.expectedDate)}
          </span>
        )}
      </div>

      {/* Quick stage move buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        {STAGES.indexOf(deal.stage) > 0 && (
          <button onClick={() => onStageChange(deal, STAGES[STAGES.indexOf(deal.stage) - 1])}
            className="text-xs px-1.5 py-0.5 rounded border transition-colors"
            style={{ borderColor: '#E8E0D8', color: '#888' }}>
            ← Back
          </button>
        )}
        {STAGES.indexOf(deal.stage) < STAGES.length - 1 && (
          <button onClick={() => onStageChange(deal, STAGES[STAGES.indexOf(deal.stage) + 1])}
            className="text-xs px-1.5 py-0.5 rounded border transition-colors"
            style={{ borderColor: '#E8967A', color: '#E8967A' }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Kanban View (with Drag & Drop) ────────────────────────────────────────────
function KanbanView({ deals, onEdit, onDelete, onStageChange }) {
  const draggedId = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (e, id) => { draggedId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, stage) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(stage); };
  const handleDrop = (e, stage) => {
    e.preventDefault(); setDragOverCol(null);
    if (draggedId.current !== null) {
      const deal = deals.find(d => d.id === draggedId.current);
      if (deal && deal.stage !== stage) onStageChange(deal, stage);
      draggedId.current = null;
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {STAGES.map(stage => {
        const cards = deals.filter(d => d.stage === stage);
        const meta = STAGE_META[stage];
        const total = cards.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        const isOver = dragOverCol === stage;
        return (
          <div key={stage}
            className="flex-shrink-0 w-56 flex flex-col rounded-xl overflow-hidden border transition-all"
            style={{ borderColor: isOver ? meta.color : '#E8E0D8', boxShadow: isOver ? `0 0 0 2px ${meta.color}44` : 'none' }}
            onDragOver={e => handleDragOver(e, stage)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, stage)}>
            <div className="px-3 py-2.5 flex items-center justify-between"
              style={{ backgroundColor: isOver ? meta.color + '33' : meta.bg, borderBottom: `2px solid ${meta.color}` }}>
              <div>
                <p className="text-xs font-bold" style={{ color: meta.color }}>{stage}</p>
                {total > 0 && <p className="text-xs text-ez-muted">{formatCurrency(total)}</p>}
              </div>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: meta.color + '33', color: meta.color }}>{cards.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto transition-colors"
              style={{ minHeight: '200px', backgroundColor: isOver ? meta.color + '11' : '#FAF7F4' }}>
              {cards.map(deal => (
                <div key={deal.id}
                  draggable
                  onDragStart={e => handleDragStart(e, deal.id)}
                  onDragEnd={() => { draggedId.current = null; setDragOverCol(null); }}>
                  <DealCard deal={deal} onEdit={onEdit} onDelete={onDelete} onStageChange={onStageChange} />
                </div>
              ))}
              {cards.length === 0 && (
                <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg text-xs text-ez-muted"
                  style={{ borderColor: isOver ? meta.color : '#E8E0D8' }}>
                  {isOver ? 'Drop here' : 'No deals'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List View ──────────────────────────────────────────────────────────────────
function ListView({ deals, onEdit, onDelete, onStageChange }) {
  if (!deals.length) return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.09)', textAlign: 'center', padding: '64px 0' }}>
      <p className="font-semibold text-ez-dark">No deals found</p>
      <p className="text-ez-muted text-sm mt-1">Add your first deal to get started</p>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.09)' }}>
      <div style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deal List</span>
        <span style={{ color: '#666', fontSize: 11, background: '#3D3D3D', borderRadius: 12, padding: '2px 10px' }}>{deals.length} total</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-sm ez-table">
          <thead>
            <tr>
              <th className="text-left">Title</th>
              <th className="text-left">Donor</th>
              <th className="text-left">Amount</th>
              <th className="text-left">Stage</th>
              <th className="text-left">Priority</th>
              <th className="text-left">Expected Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.map(deal => {
              const meta = STAGE_META[deal.stage] || STAGE_META.Prospect;
              const pMeta = PRIORITY_META[deal.priority] || PRIORITY_META.Medium;
              const isOverdue = deal.expectedDate && new Date(deal.expectedDate) < new Date()
                && deal.stage !== 'Received' && deal.stage !== 'Closed Lost';
              return (
                <tr key={deal.id}>
                  <td>
                    <button onClick={() => onEdit(deal)}
                      className="font-medium hover:underline text-left"
                      style={{ color: '#E8967A' }}>
                      {deal.title}
                    </button>
                    {deal.notes && <p className="text-xs text-ez-muted truncate max-w-48">{deal.notes}</p>}
                  </td>
                  <td className="text-ez-dark">{deal.donorName || '—'}</td>
                  <td className="font-semibold text-ez-dark">{deal.amount > 0 ? formatCurrency(deal.amount) : '—'}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {deal.stage}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: pMeta.color + '22', color: pMeta.color }}>
                      {deal.priority}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: isOverdue ? '#E87A7A' : '#888' }}>
                    {isOverdue ? '⚠ ' : ''}{deal.expectedDate ? formatDate(deal.expectedDate) : '—'}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button onClick={() => onEdit(deal)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors"
                          style={{ color: '#E8967A' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onStageChange && STAGES.indexOf(deal.stage) < STAGES.length - 1 && (
                        <button onClick={() => onStageChange(deal, STAGES[STAGES.indexOf(deal.stage) + 1])}
                          title="Move to next stage"
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-500 hover:text-teal-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(deal)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// CalendarView for deals is handled by the shared CalendarGrid component below.

// ── Main Deals Page ────────────────────────────────────────────────────────────
export function Deals() {
  const { deals, loading, addDeal, updateDeal, updateDealStage, deleteDeal } = useDeals();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('deals', 'can_create');
  const canEdit   = hasPermission('deals', 'can_edit');
  const canDelete = hasPermission('deals', 'can_delete');
  const { donors } = useDonors();
  const toast = useToast();

  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return deals.filter(d => {
      const matchSearch = !search ||
        (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.donorName || '').toLowerCase().includes(search.toLowerCase());
      const matchStage = !stageFilter || d.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [deals, search, stageFilter]);

  const totalPipeline = useMemo(() =>
    deals.filter(d => d.stage !== 'Closed Lost').reduce((s, d) => s + (parseFloat(d.amount) || 0), 0),
    [deals]
  );
  const totalReceived = useMemo(() =>
    deals.filter(d => d.stage === 'Received').reduce((s, d) => s + (parseFloat(d.amount) || 0), 0),
    [deals]
  );

  const openAdd = (prefill = {}) => { setEditDeal(null); setPrefilledDate(prefill.expectedDate || ''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openEdit = (deal) => { setEditDeal(deal); setPrefilledDate(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const closeForm = () => { setShowForm(false); setEditDeal(null); setPrefilledDate(''); };
  const handleDayClick = (dateStr) => openAdd({ expectedDate: dateStr });

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editDeal) {
        await updateDeal(editDeal.id, data);
        toast.success('Deal updated');
      } else {
        await addDeal(data);
        toast.success('Deal added');
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (deal, newStage) => {
    try {
      await updateDealStage(deal.id, newStage);
      toast.success(`Moved to ${newStage}`);
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDeal(deleteTarget.id);
      toast.success('Deal deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete deal');
    }
    setDeleteTarget(null);
  };

  return (
    <div style={{ background: '#E8E2DB', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #E8967A 0%, #d4806a 100%)', borderRadius: 14, padding: '18px 24px', boxShadow: '0 4px 16px rgba(232,150,122,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'serif' }}>Deals</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '3px 0 0' }}>
            {deals.filter(d => d.stage !== 'Closed Lost').length} active · Pipeline {formatCurrency(totalPipeline)} · Received {formatCurrency(totalReceived)}
          </p>
        </div>
        {!showForm && canCreate && (
          <button onClick={openAdd} style={{ background: '#fff', color: '#E8967A', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Deal
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '2px solid #E8967A', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg, #FDF0EB, #fff)', borderBottom: '1px solid #F0E8E4', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#E8967A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{editDeal ? '✎ Edit Deal' : '＋ New Deal'}</p>
            <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <DealForm initialData={editDeal || (prefilledDate ? { expectedDate: prefilledDate } : {})} donors={donors} onSubmit={handleSubmit} onCancel={closeForm} loading={saving} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div onClick={() => setFiltersOpen(v => !v)} style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="13" height="13" fill="none" stroke="#aaa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" /></svg>
          <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          <svg width="14" height="14" fill="none" stroke="#aaa" viewBox="0 0 24 24" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {filtersOpen && <div style={{ padding: '14px 20px' }}>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ez-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search deals or donor..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-cream-300 bg-cream-50 focus:outline-none focus:ring-2 w-52"
                style={{ '--tw-ring-color': '#E8967A' }} />
            </div>

            {/* Stage filter */}
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-50 focus:outline-none text-ez-dark">
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {(search || stageFilter) && (
              <button onClick={() => { setSearch(''); setStageFilter(''); }}
                className="text-xs text-ez-muted hover:text-ez-dark transition-colors">
                Clear
              </button>
            )}

            <span className="text-xs text-ez-muted ml-auto">{filtered.length} deal{filtered.length !== 1 ? 's' : ''}</span>

            {/* View switcher */}
            <div className="flex rounded-lg border border-cream-300 overflow-hidden">
              {VIEWS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  title={v.label}
                  className="p-2 transition-colors"
                  style={{
                    backgroundColor: view === v.id ? '#E8967A' : '#fff',
                    color: view === v.id ? '#1A1A1A' : '#888',
                  }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={v.icon} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>}
      </div>

      {/* Stage summary pills */}
      <div className="flex gap-2 flex-wrap">
        {STAGES.map(stage => {
          const count = deals.filter(d => d.stage === stage).length;
          const meta = STAGE_META[stage];
          return (
            <button key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                backgroundColor: stageFilter === stage ? meta.color : meta.bg,
                color: stageFilter === stage ? '#fff' : meta.color,
                borderColor: meta.color,
              }}>
              {stage}
              <span className="font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* View content */}
      {loading && !deals.length ? (
        <div className="text-center py-12 text-ez-muted text-sm">Loading deals...</div>
      ) : view === 'kanban' ? (
        <KanbanView deals={filtered} onEdit={canEdit ? openEdit : null} onDelete={canDelete ? setDeleteTarget : null} onStageChange={canEdit ? handleStageChange : () => {}} />
      ) : view === 'list' ? (
        <ListView deals={filtered} onEdit={canEdit ? openEdit : null} onDelete={canDelete ? setDeleteTarget : null} onStageChange={canEdit ? handleStageChange : () => {}} />
      ) : (
        <CalendarGrid
          items={filtered}
          getDate={d => d.expectedDate ? String(d.expectedDate).slice(0, 10) : null}
          renderDot={d => { const meta = STAGE_META[d.stage] || STAGE_META.Prospect; return { label: d.title, color: meta.color, bg: meta.bg }; }}
          onItemClick={openEdit}
          onDayClick={handleDayClick}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Deal"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

export default Deals;
