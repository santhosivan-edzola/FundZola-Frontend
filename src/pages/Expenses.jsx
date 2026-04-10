import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../hooks/useExpenses';
import { useDonations } from '../hooks/useDonations';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ViewSwitcher } from '../components/ui/ViewSwitcher';
import { CalendarGrid } from '../components/ui/CalendarGrid';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseTable } from '../components/expenses/ExpenseTable';
import { EXPENSE_CATEGORIES, FUND_CATEGORIES } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

const CAT_META = {
  Salaries:          { color: '#E8967A', bg: '#FDF0EB' },
  Operations:        { color: '#7ab8e8', bg: '#EBF4FD' },
  Events:            { color: '#e8c07a', bg: '#FDF7EB' },
  Infrastructure:    { color: '#8ECFCA', bg: '#E8F7F6' },
  'Medical Aid':     { color: '#7ae87a', bg: '#EBF9EB' },
  'Educational Aid': { color: '#b07ae8', bg: '#F5EBF9' },
  Administrative:    { color: '#a0a0a0', bg: '#F5F5F5' },
  Travel:            { color: '#e87ab0', bg: '#F9EBF2' },
  Equipment:         { color: '#7ae8b0', bg: '#EBF9F2' },
  Other:             { color: '#b0b0b0', bg: '#F5F5F5' },
};
const DEFAULT_CAT_META = { color: '#8ECFCA', bg: '#E8F7F6' };

// ── Expense Kanban (grouped by Category, with Drag & Drop) ────────────────────
function ExpenseKanban({ expenses, allCats, onEdit, onMove, canEdit }) {
  const draggedId = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (cat) => setCollapsed(p => ({ ...p, [cat]: !p[cat] }));

  const handleDragStart = (e, id) => { draggedId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, cat) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(cat); };
  const handleDrop = (e, cat) => {
    e.preventDefault(); setDragOverCol(null);
    if (draggedId.current !== null) { onMove(draggedId.current, cat); draggedId.current = null; }
  };

  return (
    <div style={{ padding: '12px 16px' }}>
    <div className="flex gap-3 pb-2" style={{ minHeight: '50vh', alignItems: 'stretch', width: '100%' }}>
      {allCats.map(cat => {
        const cards = expenses.filter(e => (e.category || 'Other') === cat);
        const total = cards.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const meta = CAT_META[cat] || DEFAULT_CAT_META;
        const isOver = dragOverCol === cat;
        const isCollapsed = !!collapsed[cat];
        return (
          <div key={cat}
            className="flex flex-col rounded-xl overflow-hidden border transition-all"
            style={{ flex: '1 1 0', minWidth: isCollapsed ? 44 : 120, maxWidth: isCollapsed ? 80 : 'none',
              borderColor: isOver ? meta.color : '#E8E0D8', boxShadow: isOver ? `0 0 0 2px ${meta.color}44` : 'none',
              transition: 'max-width 0.2s ease, min-width 0.2s ease' }}
            onDragOver={e => handleDragOver(e, cat)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, cat)}>
            <div style={{ height: 20, backgroundColor: meta.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
              <button onClick={() => toggleCollapse(cat)} title={isCollapsed ? 'Expand' : 'Collapse'}
                style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '1px 3px', borderRadius: 3, background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
                </svg>
              </button>
            </div>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2 py-3 cursor-pointer select-none"
                style={{ backgroundColor: meta.bg, flex: 1 }} onClick={() => toggleCollapse(cat)}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: meta.color, color: '#fff' }}>{cards.length}</span>
                <span className="text-xs font-bold"
                  style={{ color: meta.color, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>{cat}</span>
              </div>
            ) : (
              <>
                <div className="px-3 pt-2 pb-2"
                  style={{ backgroundColor: isOver ? meta.color + '18' : meta.bg, borderBottom: `1px solid ${meta.color}55` }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-wide flex-1" style={{ color: meta.color }}>{cat}</span>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: meta.color, color: '#fff' }}>{cards.length}</span>
                  </div>
                  <p className="text-xs font-bold mt-1" style={{ color: meta.color }}>
                    {total > 0 ? formatCurrency(total) : <span style={{ color: meta.color + '55' }}>—</span>}
                  </p>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto transition-colors"
                  style={{ minHeight: '150px', backgroundColor: isOver ? meta.color + '11' : '#FAF7F4' }}>
                  {cards.map(exp => (
                    <div key={exp.id} draggable
                      onDragStart={e => handleDragStart(e, exp.id)}
                      onDragEnd={() => { draggedId.current = null; setDragOverCol(null); }}
                      className="bg-white rounded-lg border p-3 space-y-1.5 group cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none"
                      style={{ borderColor: '#E8E0D8' }}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-ez-dark leading-snug flex-1 truncate">{exp.description || '—'}</p>
                        {canEdit && (
                          <button onClick={() => onEdit(exp)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all flex-shrink-0" style={{ color: '#E8967A' }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                      </div>
                      {exp.vendor && <p className="text-xs text-ez-muted">{exp.vendor}</p>}
                      <p className="text-sm font-bold text-ez-dark">{formatCurrency(exp.amount)}</p>
                      <p className="text-xs text-ez-muted">{formatDate(exp.date || exp.expense_date)}</p>
                      {(exp.fundCategory || exp.fund_category) && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#E8F7F6', color: '#8ECFCA' }}>
                          {exp.fundCategory || exp.fund_category}
                        </span>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg text-xs text-ez-muted" style={{ borderColor: isOver ? meta.color : '#E8E0D8' }}>
                      {isOver ? 'Drop here' : 'No expenses'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}

// ── Main Expenses Page ─────────────────────────────────────────────────────────
export function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense, fetchExpenses } = useExpenses();

  useEffect(() => {
    fetchExpenses();
  }, []);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('expenses', 'can_create');
  const canEdit   = hasPermission('expenses', 'can_edit');
  const canDelete = hasPermission('expenses', 'can_delete');
  const { donations } = useDonations();
  const toast = useToast();

  const [view, setView]             = useState('list');
  const [addHovered, setAddHovered] = useState(false);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [fundFilter, setFundFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editExpense, setEditExpense]       = useState(null);
  const [prefilledDate, setPrefilledDate]   = useState('');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [overrides, setOverrides]           = useState({});
  const [filtersOpen, setFiltersOpen]       = useState(false);

  const fundBalanceMap = useMemo(() => {
    const map = {};
    donations.forEach(d => { const cat = d.fundCategory || d.fund_category || 'General'; map[cat] = (map[cat] || 0) + (parseFloat(d.amount) || 0); });
    expenses.forEach(e => { const cat = e.fundCategory || e.fund_category || 'General'; map[cat] = (map[cat] || 0) - (parseFloat(e.amount) || 0); });
    return map;
  }, [donations, expenses]);

  const displayExpenses = useMemo(() =>
    expenses.map(e => overrides[e.id] ? { ...e, ...overrides[e.id] } : e),
    [expenses, overrides]
  );

  const filtered = useMemo(() => {
    return displayExpenses.filter(e => {
      const invoiceNo = e.invoiceNumber || e.invoice_number || '';
      const fundCat = e.fundCategory || e.fund_category || '';
      const date = e.date || e.expense_date || '';
      return (
        (!search || (e.description || '').toLowerCase().includes(search.toLowerCase()) || (e.vendor || '').toLowerCase().includes(search.toLowerCase()) || invoiceNo.toLowerCase().includes(search.toLowerCase())) &&
        (!catFilter || e.category === catFilter) &&
        (!fundFilter || fundCat === fundFilter) &&
        (!dateFrom || date >= dateFrom) &&
        (!dateTo || date <= dateTo)
      );
    }).sort((a, b) => new Date(b.date || b.expense_date) - new Date(a.date || a.expense_date));
  }, [displayExpenses, search, catFilter, fundFilter, dateFrom, dateTo]);

  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0), [filtered]);
  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allCats = useMemo(() => {
    const s = new Set(expenses.map(e => e.category || 'Other'));
    EXPENSE_CATEGORIES.forEach(c => s.add(c));
    return [...s];
  }, [expenses]);

  const availableFunds = useMemo(() => {
    const cats = [...new Set(donations.map(d => d.fundCategory || d.fund_category).filter(Boolean))];
    return cats.length > 0 ? cats : FUND_CATEGORIES;
  }, [donations]);

  const openEdit = (e, prefillDate = '') => { setEditExpense(e); setPrefilledDate(prefillDate); setModalOpen(true); };
  const openAdd  = (prefill = {})         => { setEditExpense(null); setPrefilledDate(prefill.date || ''); setModalOpen(true); };

  const handleFormSubmit = async (data) => {
    const amount = parseFloat(data.amount) || 0;
    const fundCat = data.fundCategory || data.fund_category || 'General';
    const fundBal = fundBalanceMap[fundCat] || 0;
    const editingOldAmount = editExpense ? (parseFloat(editExpense.amount) || 0) : 0;
    const projectedBalance = editExpense ? fundBal + editingOldAmount - amount : fundBal - amount;
    if (projectedBalance < 0) toast.warning(`Warning: Exceeds fund balance for "${fundCat}". Recorded anyway.`);
    try {
      if (editExpense) { await updateExpense(editExpense.id, data); toast.success('Expense updated'); }
      else { await addExpense(data); toast.success('Expense recorded'); }
      setModalOpen(false); setEditExpense(null); setPrefilledDate('');
    } catch (err) { toast.error(err.message || 'Failed to save expense.'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteExpense(deleteTarget.id); toast.success('Expense deleted'); }
    catch (err) { toast.error(err.message || 'Failed to delete expense.'); }
    setDeleteTarget(null);
  };

  // DnD: move expense to a different category column
  const handleMove = async (id, newCat) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp || exp.category === newCat) return;
    setOverrides(p => ({ ...p, [id]: { category: newCat } }));
    try { await updateExpense(id, { ...exp, category: newCat, fund_category: exp.fundCategory || exp.fund_category || null }); toast.success(`Moved to ${newCat}`); }
    catch { toast.error('Failed to move expense'); }
    finally { setOverrides(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  // Calendar "+" click → open add modal with date pre-filled
  const handleDayClick = (dateStr) => openAdd({ date: dateStr });

  return (
    <div style={{ background: '#E8E2DB', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>


      {/* Fund Balance Cards */}
      {Object.keys(fundBalanceMap).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: '#1A1A1A', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fund Balances</span>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(fundBalanceMap).map(([fund, balance]) => (
                <div key={fund} className="bg-white rounded-xl border p-3 shadow-card"
                  style={{ borderColor: balance < 0 ? '#E87A7A' : '#E8E0D8', backgroundColor: balance < 0 ? '#FDF0EB' : '#fff' }}>
                  <p className="text-xs text-ez-muted font-medium truncate">{fund}</p>
                  <p className="text-base font-bold mt-1" style={{ color: balance >= 0 ? '#8ECFCA' : '#E87A7A' }}>{formatCurrency(balance)}</p>
                  <p className="text-xs text-ez-muted">{balance >= 0 ? 'balance' : 'overspent'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div onClick={() => setFiltersOpen(v => !v)} style={{ background: '#1A1A1A', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="13" height="13" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" /></svg>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {filtersOpen && <div style={{ padding: '14px 20px' }} className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search description, vendor..." className="w-64" />
            <Select name="catFilter" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="All Categories" className="w-44" />
            <Select name="fundFilter" value={fundFilter} onChange={e => { setFundFilter(e.target.value); setPage(1); }} options={availableFunds.map(f => ({ value: f, label: f }))} placeholder="All Funds" className="w-40" />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Input name="dateFrom" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-40" />
            <span className="text-ez-muted text-xs">to</span>
            <Input name="dateTo" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-40" />
            {(search || catFilter || fundFilter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCatFilter(''); setFundFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear filters</Button>
            )}
            <span className="text-xs text-ez-muted ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''} · {formatCurrency(totalAmount)}</span>
          </div>
        </div>}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.09)' }}>
        <div style={{ background: '#1A1A1A', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Expense List</span>
            <span style={{ color: '#fff', fontSize: 11, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 10px' }}>{filtered.length} total</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canCreate && (
              <button onClick={() => openAdd()} onMouseEnter={() => setAddHovered(true)} onMouseLeave={() => setAddHovered(false)}
                title="Add Expense"
                style={{ background: '#E8967A', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {addHovered && <span style={{ whiteSpace: 'nowrap' }}>Add</span>}
              </button>
            )}
            <ViewSwitcher view={view} onChange={setView} />
          </div>
        </div>
        {view === 'kanban' ? (
          <ExpenseKanban expenses={filtered} allCats={allCats} onEdit={e => openEdit(e)} onMove={canEdit ? handleMove : () => {}} canEdit={canEdit} />
        ) : view === 'calendar' ? (
          <CalendarGrid
            items={filtered}
            getDate={e => (e.date || e.expense_date || '').slice(0, 10)}
            renderDot={e => { const meta = CAT_META[e.category] || DEFAULT_CAT_META; return { label: e.description || e.category || '—', color: meta.color, bg: meta.bg }; }}
            onItemClick={e => openEdit(e)}
            onDayClick={handleDayClick}
          />
        ) : (
          <ExpenseTable expenses={paginated} donations={donations} onEdit={canEdit ? e => openEdit(e) : null} onDelete={canDelete ? e => setDeleteTarget(e) : null} />
        )}
      </div>

      {view === 'list' && (
        <div style={{ background: '#FEF9C3', borderRadius: 14, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #FDE047' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#713F12' }}>Page <strong>{page}</strong> of {totalPages} · {filtered.length} records</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ fontSize: 11, border: '1px solid #FDE047', borderRadius: 6, padding: '3px 6px', background: '#fff', color: '#713F12', fontWeight: 600, cursor: 'pointer' }}>
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} per page</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditExpense(null); setPrefilledDate(''); }}
        title={editExpense ? 'Edit Expense' : 'Record New Expense'} size="xl">
        <ExpenseForm
          initialData={editExpense || (prefilledDate ? { date: prefilledDate, expense_date: prefilledDate } : {})}
          onSubmit={handleFormSubmit}
          onCancel={() => { setModalOpen(false); setEditExpense(null); setPrefilledDate(''); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm}
        title="Delete Expense" message={`Delete expense "${deleteTarget?.description}"? This cannot be undone.`}
        confirmText="Delete" variant="danger" />
    </div>
  );
}

export default Expenses;
