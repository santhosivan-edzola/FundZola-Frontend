import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDonations } from '../hooks/useDonations';
import { useDonors } from '../hooks/useDonors';
import { useExpenses } from '../hooks/useExpenses';
import { useOrg } from '../hooks/useOrg';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ViewSwitcher } from '../components/ui/ViewSwitcher';
import { CalendarGrid } from '../components/ui/CalendarGrid';
import { DonationForm } from '../components/donations/DonationForm';
import { DonationTable } from '../components/donations/DonationTable';
import { generateReceipt } from '../utils/pdfGenerator';
import { FUND_CATEGORIES, PAYMENT_MODES } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

const FUND_META = {
  Education:           { color: '#7ab8e8', bg: '#EBF4FD' },
  Healthcare:          { color: '#7ae87a', bg: '#EBF9EB' },
  Infrastructure:      { color: '#e8c07a', bg: '#FDF7EB' },
  'Relief Fund':       { color: '#E8967A', bg: '#FDF0EB' },
  Scholarship:         { color: '#b07ae8', bg: '#F5EBF9' },
  Research:            { color: '#8ECFCA', bg: '#E8F7F6' },
  Environment:         { color: '#7ae8b0', bg: '#EBF9F2' },
  'Women Empowerment': { color: '#e87ab0', bg: '#F9EBF2' },
  'Child Welfare':     { color: '#e8967a', bg: '#FDF0EB' },
  General:             { color: '#a0a0a0', bg: '#F5F5F5' },
};
const DEFAULT_FUND_META = { color: '#8ECFCA', bg: '#E8F7F6' };

// ── Donation Detail Panel ──────────────────────────────────────────────────────
function DonationDetailPanel({ donation, donor, expenses, onClose, onReceipt }) {
  const donationAmount = parseFloat(donation.amount) || 0;
  // Include both Full (direct donation_id) and Split (via allocations) expenses
  const taggedExpenses = expenses
    .filter(e => {
      if ((e.donationId && e.donationId === donation.id) || (e.donation_id && e.donation_id === donation.id)) return true;
      if (e.expense_type === 'Split' || e.expenseType === 'Split') {
        return (e.allocations || []).some(a => a.donation_id === donation.id || a.donation_id === String(donation.id));
      }
      return false;
    })
    .map(e => {
      // For Split, show only the allocation amount for this donation
      if (e.expense_type === 'Split' || e.expenseType === 'Split') {
        const alloc = (e.allocations || []).find(a => a.donation_id === donation.id || a.donation_id === String(donation.id));
        return { ...e, amount: alloc ? alloc.amount : 0 };
      }
      return e;
    });
  const totalExpenses = taggedExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const utilized = donationAmount > 0 ? Math.min((totalExpenses / donationAmount) * 100, 100) : 0;
  const barColor = utilized > 90 ? '#E87A7A' : utilized > 70 ? '#e8c07a' : '#8ECFCA';

  return (
    <div className="bg-white rounded-xl border border-cream-200 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200" style={{ backgroundColor: '#1A1A1A' }}>
        <div>
          <p className="font-mono text-xs font-semibold" style={{ color: '#E8967A' }}>{donation.receiptNumber || donation.receipt_number || '—'}</p>
          <h2 className="font-serif text-base text-white mt-0.5">Donation Details</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: '#FAE8DC' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div><p className="text-xs text-ez-muted mb-0.5">Donor</p><p className="text-sm font-semibold text-ez-dark">{donor?.name || donation.donorName || donation.donor_name || 'Unknown'}</p></div>
          <div><p className="text-xs text-ez-muted mb-0.5">Amount</p><p className="text-sm font-bold text-ez-dark">{formatCurrency(donation.amount)}</p></div>
          <div><p className="text-xs text-ez-muted mb-0.5">Date</p><p className="text-sm text-ez-dark">{formatDate(donation.date || donation.donation_date)}</p></div>
          <div><p className="text-xs text-ez-muted mb-0.5">Payment Mode</p><Badge variant="gray" size="sm">{donation.paymentMode || donation.payment_mode || '—'}</Badge></div>
          <div><p className="text-xs text-ez-muted mb-0.5">Fund Category</p><Badge variant="info" size="sm">{donation.fundCategory || donation.fund_category || 'General'}</Badge></div>
          <div><p className="text-xs text-ez-muted mb-0.5">80G Eligible</p><Badge variant={donation.is80G || donation.is_80g_eligible ? 'success' : 'gray'} size="sm">{donation.is80G || donation.is_80g_eligible ? 'Yes' : 'No'}</Badge></div>
          {donation.purpose && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-ez-muted mb-0.5">Purpose</p><p className="text-sm text-ez-dark">{donation.purpose}</p></div>}
        </div>
        <div className="rounded-lg border border-cream-200 p-4" style={{ backgroundColor: '#FAF7F4' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ez-dark">Fund Utilization</p>
            <p className="text-xs text-ez-muted">{utilized.toFixed(1)}% utilized</p>
          </div>
          <div className="w-full bg-cream-200 rounded-full h-2 mb-3">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${utilized}%`, backgroundColor: barColor }} />
          </div>
          <div className="flex justify-between text-xs text-ez-muted">
            <span>Donated: <span className="font-semibold text-ez-dark">{formatCurrency(donationAmount)}</span></span>
            <span>Spent: <span className="font-semibold text-ez-dark">{formatCurrency(totalExpenses)}</span></span>
            <span>Balance: <span className="font-semibold" style={{ color: '#8ECFCA' }}>{formatCurrency(donationAmount - totalExpenses)}</span></span>
          </div>
        </div>
        {/* Category breakdown from deal allocations */}
        {(donation.allocations || []).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ez-dark mb-3">Category Breakdown</h3>
            <div className="space-y-1.5">
              {donation.allocations.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                  style={{ background: '#FAF7F4', border: '1px solid #E8E0D8' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.category_color || '#E8967A' }} />
                    <span className="font-medium text-ez-dark">{a.category_name}</span>
                  </div>
                  <span className="font-semibold text-ez-dark">{formatCurrency(a.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-ez-dark mb-3">
            Tagged Expenses
            {taggedExpenses.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAE8DC', color: '#E8967A' }}>{taggedExpenses.length}</span>}
          </h3>
          {taggedExpenses.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-cream-200" style={{ backgroundColor: '#FAF7F4' }}>
              <p className="text-xs text-ez-muted">No expenses tagged against this donation yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-cream-200">
              <table className="w-full text-xs ez-table">
                <thead><tr><th className="text-left">Date</th><th className="text-left">Description</th><th className="text-left">Category</th><th className="text-left">Vendor</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {taggedExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td className="text-ez-muted">{formatDate(exp.date || exp.expense_date)}</td>
                      <td className="text-ez-dark font-medium">{exp.description || '—'}</td>
                      <td><Badge variant="gray" size="sm">{exp.category || '—'}</Badge></td>
                      <td className="text-ez-muted">{exp.vendor || '—'}</td>
                      <td className="text-right font-semibold text-ez-dark">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4} className="text-right text-xs font-semibold text-ez-muted py-2 pr-3">Total</td><td className="text-right font-bold text-ez-dark py-2">{formatCurrency(totalExpenses)}</td></tr></tfoot>
              </table>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2 border-t border-cream-200">
          {(donation.is80G || donation.is_80g_eligible) && (
            <Button variant="primary" size="sm" onClick={() => onReceipt(donation)}
              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
              Download 80G Receipt
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ── Donation Kanban (grouped by Fund Category, with Drag & Drop) ───────────────
function DonationKanban({ donations, donorMap, allFunds, onView, onEdit, onMove, canEdit }) {
  const draggedId = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (fund) => setCollapsed(p => ({ ...p, [fund]: !p[fund] }));

  const handleDragStart = (e, id) => { draggedId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, fund) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(fund); };
  const handleDrop = (e, fund) => {
    e.preventDefault(); setDragOverCol(null);
    if (draggedId.current !== null) { onMove(draggedId.current, fund); draggedId.current = null; }
  };

  return (
    <div style={{ padding: '12px 16px' }}>
    <div className="flex gap-3 pb-2" style={{ minHeight: '50vh', alignItems: 'stretch', width: '100%' }}>
      {allFunds.map(fund => {
        const cards = donations.filter(d => (d.fundCategory || d.fund_category || 'General') === fund);
        const total = cards.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        const meta = FUND_META[fund] || DEFAULT_FUND_META;
        const isOver = dragOverCol === fund;
        const isCollapsed = !!collapsed[fund];
        return (
          <div key={fund}
            className="flex flex-col rounded-xl overflow-hidden border transition-all"
            style={{ flex: '1 1 0', minWidth: isCollapsed ? 44 : 120, maxWidth: isCollapsed ? 80 : 'none',
              borderColor: isOver ? meta.color : '#E8E0D8', boxShadow: isOver ? `0 0 0 2px ${meta.color}44` : 'none',
              transition: 'max-width 0.2s ease, min-width 0.2s ease' }}
            onDragOver={e => handleDragOver(e, fund)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, fund)}>
            <div style={{ height: 20, backgroundColor: meta.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
              <button onClick={() => toggleCollapse(fund)} title={isCollapsed ? 'Expand' : 'Collapse'}
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
                style={{ backgroundColor: meta.bg, flex: 1 }} onClick={() => toggleCollapse(fund)}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: meta.color, color: '#fff' }}>{cards.length}</span>
                <span className="text-xs font-bold"
                  style={{ color: meta.color, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>{fund}</span>
              </div>
            ) : (
              <>
                <div className="px-3 pt-2 pb-2"
                  style={{ backgroundColor: isOver ? meta.color + '18' : meta.bg, borderBottom: `1px solid ${meta.color}55` }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-wide flex-1" style={{ color: meta.color }}>{fund}</span>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: meta.color, color: '#fff' }}>{cards.length}</span>
                  </div>
                  <p className="text-xs font-bold mt-1" style={{ color: meta.color }}>
                    {total > 0 ? formatCurrency(total) : <span style={{ color: meta.color + '55' }}>—</span>}
                  </p>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto transition-colors"
                  style={{ minHeight: '150px', backgroundColor: isOver ? meta.color + '11' : '#FAF7F4' }}>
                  {cards.map(don => {
                    const donor = donorMap[don.donorId || don.donor_id];
                    return (
                      <div key={don.id} draggable
                        onDragStart={e => handleDragStart(e, don.id)}
                        onDragEnd={() => { draggedId.current = null; setDragOverCol(null); }}
                        className="bg-white rounded-lg border p-3 space-y-1.5 group cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none"
                        style={{ borderColor: '#E8E0D8' }}>
                        <div className="flex items-start justify-between gap-1">
                          <button onClick={() => onView(don)} className="font-mono text-xs font-semibold truncate flex-1 text-left hover:underline" style={{ color: '#E8967A' }}>
                            {don.receiptNumber || don.receipt_number || '—'}
                          </button>
                          {canEdit && (
                            <button onClick={() => onEdit(don)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all flex-shrink-0" style={{ color: '#E8967A' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-ez-muted">{donor?.name || don.donorName || don.donor_name || '—'}</p>
                        <p className="text-sm font-bold text-ez-dark">{formatCurrency(don.amount)}</p>
                        <p className="text-xs text-ez-muted">{formatDate(don.date || don.donation_date)}</p>
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg text-xs text-ez-muted" style={{ borderColor: isOver ? meta.color : '#E8E0D8' }}>
                      {isOver ? 'Drop here' : 'No donations'}
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

// ── Main Donations Page ────────────────────────────────────────────────────────
export function Donations() {
  const { donations, addDonationAndReturn, updateDonation, deleteDonation } = useDonations();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('donations', 'can_create');
  const [addHovered, setAddHovered] = useState(false);
  const canEdit   = hasPermission('donations', 'can_edit');
  const canDelete = hasPermission('donations', 'can_delete');
  const { donors } = useDonors();
  const { expenses } = useExpenses();
  const { orgSettings } = useOrg();
  const toast = useToast();

  const [view, setView]             = useState('list');
  const [search, setSearch]         = useState('');
  const [fundFilter, setFundFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [g80Filter, setG80Filter]   = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editDonation, setEditDonation]     = useState(null);
  const [prefilledDate, setPrefilledDate]   = useState('');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const detailRef = useRef(null);
  const [overrides, setOverrides]           = useState({});
  const [filtersOpen, setFiltersOpen]       = useState(false);

  const donorMap = useMemo(() => { const m = {}; donors.forEach(d => { m[d.id] = d; }); return m; }, [donors]);

  const displayDonations = useMemo(() =>
    donations.map(d => overrides[d.id] ? { ...d, ...overrides[d.id] } : d),
    [donations, overrides]
  );

  const filtered = useMemo(() => {
    return displayDonations.filter(d => {
      const donor = donorMap[d.donorId || d.donor_id];
      const donorName = donor?.name || d.donor_name || d.donorName || '';
      const receiptNo = d.receiptNumber || d.receipt_number || '';
      const fundCat   = d.fundCategory || d.fund_category || '';
      const payMode   = d.paymentMode || d.payment_mode || '';
      const date      = d.date || d.donation_date || '';
      const is80G     = d.is80G || Boolean(d.is_80g_eligible);
      return (
        (!search || donorName.toLowerCase().includes(search.toLowerCase()) || receiptNo.toLowerCase().includes(search.toLowerCase()) || fundCat.toLowerCase().includes(search.toLowerCase())) &&
        (!fundFilter || fundCat === fundFilter) &&
        (!modeFilter || payMode === modeFilter) &&
        (!g80Filter || (g80Filter === 'yes' && is80G) || (g80Filter === 'no' && !is80G)) &&
        (!dateFrom || date >= dateFrom) &&
        (!dateTo || date <= dateTo)
      );
    }).sort((a, b) => new Date(b.date || b.donation_date) - new Date(a.date || a.donation_date));
  }, [displayDonations, donorMap, search, fundFilter, modeFilter, g80Filter, dateFrom, dateTo]);

  const totalAmount = useMemo(() => filtered.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0), [filtered]);
  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allFunds = useMemo(() => {
    const s = new Set(donations.map(d => d.fundCategory || d.fund_category || 'General'));
    FUND_CATEGORIES.forEach(f => s.add(f));
    return [...s];
  }, [donations]);

  const openAdd = (prefill = {}) => { setEditDonation(null); setPrefilledDate(prefill.date || ''); setModalOpen(true); };
  const handleEdit  = d => { setEditDonation(d); setPrefilledDate(''); setModalOpen(true); };
  const handleView  = d => { setSelectedDonation(d); };
  useEffect(() => {
    if (selectedDonation && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDonation]);

  const handleFormSubmit = async (data) => {
    try {
      if (editDonation) {
        await updateDonation(editDonation.id, data);
        toast.success('Donation updated');
        setModalOpen(false); setEditDonation(null);
      } else {
        const created = await addDonationAndReturn(data);
        toast.success('Donation recorded');
        setModalOpen(false);
        if ((data.is80G || data.is_80g_eligible) && created) {
          const donor = donorMap[data.donorId || data.donor_id] || { name: created.donor_name };
          if (donor) setTimeout(() => { generateReceipt(created, donor, orgSettings); toast.info('80G Receipt downloaded'); }, 500);
        }
      }
    } catch (err) { toast.error(err.message || 'Failed to save donation.'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteDonation(deleteTarget.id); toast.success('Donation deleted'); if (selectedDonation?.id === deleteTarget.id) setSelectedDonation(null); }
    catch (err) { toast.error(err.message || 'Failed to delete donation.'); }
    setDeleteTarget(null);
  };

  const handleReceipt = d => {
    const donor = donorMap[d.donorId || d.donor_id] || { name: d.donor_name };
    if (!donor) { toast.error('Donor not found'); return; }
    generateReceipt(d, donor, orgSettings);
    toast.success('Receipt downloaded');
  };

  // DnD: move donation to a different fund category column
  const handleMove = async (id, newFund) => {
    const don = donations.find(d => d.id === id);
    if (!don || (don.fundCategory || don.fund_category) === newFund) return;
    setOverrides(p => ({ ...p, [id]: { fundCategory: newFund, fund_category: newFund } }));
    try { await updateDonation(id, { ...don, fundCategory: newFund, fund_category: newFund }); toast.success(`Moved to ${newFund}`); }
    catch { toast.error('Failed to move donation'); }
    finally { setOverrides(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  // Calendar "+" click → open add modal with date pre-filled
  const handleDayClick = (dateStr) => openAdd({ date: dateStr });

  return (
    <div style={{ background: '#E8E2DB', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {selectedDonation && (
        <div ref={detailRef}>
          <DonationDetailPanel donation={selectedDonation} donor={donorMap[selectedDonation.donorId || selectedDonation.donor_id]}
            expenses={expenses} onClose={() => setSelectedDonation(null)} onReceipt={handleReceipt} />
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div onClick={() => setFiltersOpen(v => !v)} style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="13" height="13" fill="none" stroke="#aaa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" /></svg>
          <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          <svg width="14" height="14" fill="none" stroke="#aaa" viewBox="0 0 24 24" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {filtersOpen && <div style={{ padding: '14px 20px' }} className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search donor, receipt, fund..." className="w-64" />
            <Select name="fundFilter" value={fundFilter} onChange={e => { setFundFilter(e.target.value); setPage(1); }} options={FUND_CATEGORIES.map(f => ({ value: f, label: f }))} placeholder="All Funds" className="w-40" />
            <Select name="modeFilter" value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1); }} options={PAYMENT_MODES.map(m => ({ value: m, label: m }))} placeholder="All Modes" className="w-40" />
            <Select name="g80Filter" value={g80Filter} onChange={e => { setG80Filter(e.target.value); setPage(1); }} options={[{ value: 'yes', label: '80G: Yes' }, { value: 'no', label: '80G: No' }]} placeholder="80G: All" className="w-36" />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Input name="dateFrom" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-40" />
            <span className="text-ez-muted text-xs">to</span>
            <Input name="dateTo" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-40" />
            {(search || fundFilter || modeFilter || g80Filter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFundFilter(''); setModeFilter(''); setG80Filter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear filters</Button>
            )}
            <span className="text-xs text-ez-muted ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''} · {formatCurrency(totalAmount)}</span>
          </div>
        </div>}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.09)' }}>
        <div style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" fill="none" stroke="#aaa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Donation List</span>
            <span style={{ color: '#666', fontSize: 11, background: '#3D3D3D', borderRadius: 12, padding: '2px 10px' }}>{filtered.length} total</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canCreate && (
              <button onClick={() => openAdd()} onMouseEnter={() => setAddHovered(true)} onMouseLeave={() => setAddHovered(false)}
                title="Add Donation"
                style={{ background: '#E8967A', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {addHovered && <span style={{ whiteSpace: 'nowrap' }}>Add</span>}
              </button>
            )}
            <ViewSwitcher view={view} onChange={setView} />
          </div>
        </div>
        {view === 'kanban' ? (
          <DonationKanban donations={filtered} donorMap={donorMap} allFunds={allFunds} onView={handleView} onEdit={handleEdit} onMove={canEdit ? handleMove : () => {}} canEdit={canEdit} />
        ) : view === 'calendar' ? (
          <CalendarGrid
            items={filtered}
            getDate={d => (d.date || d.donation_date || '').slice(0, 10)}
            renderDot={d => {
              const fund = d.fundCategory || d.fund_category || 'General';
              const meta = FUND_META[fund] || DEFAULT_FUND_META;
              const donor = donorMap[d.donorId || d.donor_id];
              return { label: donor?.name || d.donorName || formatCurrency(d.amount), color: meta.color, bg: meta.bg };
            }}
            onItemClick={handleView}
            onDayClick={handleDayClick}
          />
        ) : (
          <DonationTable donations={paginated} donors={donors} onEdit={canEdit ? handleEdit : null} onDelete={canDelete ? d => setDeleteTarget(d) : null} onReceipt={handleReceipt} onView={handleView} />
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditDonation(null); setPrefilledDate(''); }}
        title={editDonation ? 'Edit Donation' : 'Record New Donation'} size="xl">
        <DonationForm
          initialData={editDonation || (prefilledDate ? { date: prefilledDate, donation_date: prefilledDate } : {})}
          onSubmit={handleFormSubmit}
          onCancel={() => { setModalOpen(false); setEditDonation(null); setPrefilledDate(''); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm}
        title="Delete Donation" message={`Delete this donation (${deleteTarget?.receiptNumber})? This cannot be undone.`}
        confirmText="Delete" variant="danger" />
    </div>
  );
}

export default Donations;
