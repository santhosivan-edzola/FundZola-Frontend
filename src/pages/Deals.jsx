import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDeals } from '../hooks/useDeals';
import { useDonors } from '../hooks/useDonors';
import { usePrograms } from '../hooks/usePrograms';
import { useDonations } from '../hooks/useDonations';
import { useToast } from '../components/ui/Toast';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { CalendarGrid } from '../components/ui/CalendarGrid';
import { formatCurrency, formatDate } from '../utils/formatters';

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGES = ['Prospect', 'Contacted', 'Pledged', 'Confirmed', 'Received', 'Closed Lost'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const STAGE_META = {
  Prospect:     { color: '#8ECFCA', bg: '#E8F7F6', textColor: '#1E7A74', label: 'Prospect',    probability: 10  },
  Contacted:    { color: '#E8967A', bg: '#FDF0EB', textColor: '#A8452A', label: 'Contacted',   probability: 25  },
  Pledged:      { color: '#e8c07a', bg: '#FDF7EB', textColor: '#9A6B10', label: 'Pledged',     probability: 50  },
  Confirmed:    { color: '#7ab8e8', bg: '#EBF4FD', textColor: '#1F6FA3', label: 'Confirmed',   probability: 75  },
  Received:     { color: '#7ae87a', bg: '#EBF9EB', textColor: '#1A8A1A', label: 'Received',    probability: 100 },
  'Closed Lost':{ color: '#b0b0b0', bg: '#F5F5F5', textColor: '#555555', label: 'Closed Lost', probability: 0   },
};

const PRIORITY_META = {
  Low:    { color: '#8ECFCA', textColor: '#1E7A74', label: 'Low' },
  Medium: { color: '#e8c07a', textColor: '#9A6B10', label: 'Medium' },
  High:   { color: '#E8967A', textColor: '#A8452A', label: 'High' },
};

const VIEWS = [
  { id: 'kanban',   label: 'Kanban',   icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
  { id: 'list',     label: 'List',     icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

const emptyForm = { donorId: '', title: '', amount: '', stage: 'Prospect', priority: 'Medium', notes: '', expectedDate: '', dealType: 'Full' };

// ── Deal Form ──────────────────────────────────────────────────────────────────
function DealForm({ initialData = {}, donors, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    donorId:      initialData.donorId      || initialData.donor_id    || '',
    programId:    initialData.programId    || initialData.program_id  || '',
    title:        initialData.title        || '',
    amount:       initialData.amount       || '',
    stage:        initialData.stage        || 'Prospect',
    priority:     initialData.priority     || 'Medium',
    notes:        initialData.notes        || '',
    expectedDate: initialData.expectedDate || initialData.expected_date || '',
    dealType:     initialData.dealType     || initialData.deal_type   || 'Full',
  });
  const [errors, setErrors] = useState({});

  // Allocation subform state
  const [programAllocations, setProgramAllocations] = useState([]); // program's own category splits
  const [allocations, setAllocations] = useState(              // deal-level amounts
    (initialData.allocations || []).map(a => ({
      category_id:   String(a.category_id),
      category_name: a.category_name || '',
      category_color:a.category_color || '#E8967A',
      amount:        String(a.amount ?? ''),
      notes:         a.notes || '',
    }))
  );
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [programBudget, setProgramBudget] = useState(null);

  const dealAmount = parseFloat(form.amount) || 0;
  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const overAllocation = dealAmount > 0 && totalAllocated > dealAmount;

  // Proportionally distribute deal amount across program allocations
  const computeProportional = useCallback((progAllocs, amount) => {
    const total = progAllocs.reduce((s, a) => s + Number(a.allocated_amount), 0);
    if (!total || !amount) return progAllocs.map(a => ({ ...a, amount: '' }));
    return progAllocs.map(a => ({
      ...a,
      amount: String(Math.round((Number(a.allocated_amount) / total) * amount * 100) / 100),
    }));
  }, []);

  // Fetch program allocations when program changes
  useEffect(() => {
    if (!form.programId) {
      setProgramAllocations([]);
      setAllocations([]);
      setProgramBudget(null);
      return;
    }
    setLoadingProgram(true);
    api.get(`/programs/${form.programId}`)
      .then(res => {
        if (res.success) {
          const budget = Number(res.data.estimated_budget ?? res.data.estimatedBudget ?? 0);
          setProgramBudget(budget || null);
          if (res.data.allocations?.length) {
            const progAllocs = res.data.allocations.map(a => ({
              category_id:    String(a.category_id),
              category_name:  a.category_name,
              category_color: a.category_color || '#E8967A',
              allocated_amount: Number(a.allocated_amount),
              notes: '',
            }));
            setProgramAllocations(progAllocs);
            // Only auto-populate if not editing with existing deal allocations
            if (!initialData.allocations?.length) {
              setAllocations(computeProportional(progAllocs, dealAmount));
            }
          } else {
            setProgramAllocations([]);
            setAllocations([]);
          }
        } else {
          setProgramAllocations([]);
          setAllocations([]);
          setProgramBudget(null);
        }
      })
      .catch(() => { setProgramAllocations([]); setAllocations([]); setProgramBudget(null); })
      .finally(() => setLoadingProgram(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.programId]);

  // Recompute proportions when deal amount changes (only if program is selected)
  const prevAmount = useRef(dealAmount);
  useEffect(() => {
    if (!programAllocations.length) return;
    if (prevAmount.current === dealAmount) return;
    prevAmount.current = dealAmount;
    setAllocations(computeProportional(programAllocations, dealAmount));
  }, [dealAmount, programAllocations, computeProportional]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const setAllocRow = (i, key, val) =>
    setAllocations(p => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const validate = () => {
    const errs = {};
    if (!form.donorId) errs.donorId = 'Donor is required';
    if (!form.title?.trim()) errs.title = 'Title is required';
    if (form.programId && programBudget && dealAmount > programBudget) {
      errs.amount = `Amount cannot exceed program budget of ₹${programBudget.toLocaleString('en-IN')}`;
    }
    if (overAllocation) errs.allocations = `Allocated total (₹${totalAllocated.toLocaleString('en-IN')}) exceeds expected amount.`;
    return errs;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const validAllocs = allocations
      .filter(a => a.category_id && parseFloat(a.amount) > 0)
      .map(a => ({ category_id: a.category_id, amount: parseFloat(a.amount), notes: a.notes }));
    onSubmit({
      ...form,
      programId: form.programId || null,
      program_id: form.programId || null,
      deal_type: form.dealType,
      amount: parseFloat(form.amount) || 0,
      allocations: validAllocs,
    });
  };

  const isEdit = Boolean(initialData.id);

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select label="Donor" name="donorId" value={form.donorId} onChange={handle}
        error={errors.donorId} required
        options={donors.map(d => ({ value: d.id, label: d.name }))}
        placeholder="Select donor" />

      {/* Program selector */}
      <div>
        <label className="ez-label">Program <span className="text-ez-muted text-xs font-normal">(optional)</span></label>
        <ProgramSelect value={form.programId} onChange={val => setForm(p => ({ ...p, programId: val }))} />
      </div>

      <Input label="Deal Title" name="title" value={form.title} onChange={handle}
        error={errors.title} required placeholder="e.g. Annual pledge from Ravi Kumar" />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={programBudget ? `Expected Amount (₹) — max ₹${programBudget.toLocaleString('en-IN')}` : 'Expected Amount (₹)'}
          name="amount" type="number" value={form.amount}
          onChange={handle} placeholder="0"
          max={programBudget || undefined}
          error={errors.amount}
        />
        <Input label="Expected Date" name="expectedDate" type="date" value={form.expectedDate}
          onChange={handle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Stage" name="stage" value={form.stage} onChange={handle}
          options={STAGES.map(s => ({ value: s, label: s }))} />
        <Select label="Priority" name="priority" value={form.priority} onChange={handle}
          options={PRIORITIES.map(p => ({ value: p, label: p }))} />
      </div>

      {/* Deal Type */}
      <div>
        <label className="ez-label">Deal Type</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {[
            { type: 'Full',    desc: 'Single donation auto-created on receive', icon: '💰' },
            { type: 'Partial', desc: 'Collect in multiple tranches',             icon: '📦' },
          ].map(({ type, desc, icon }) => {
            const isSelected = form.dealType === type;
            return (
              <label key={type} className="cursor-pointer flex flex-col">
                <input type="radio" name="dealType" value={type}
                  checked={isSelected} onChange={handle} className="sr-only" />
                <div className="rounded-lg p-3 border-2 transition-all h-full"
                  style={{
                    borderColor:     isSelected ? '#1A1A1A' : '#E8E0D8',
                    background:      isSelected ? '#EEF2F8' : '#FAFAF9',
                    boxShadow:       isSelected ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none',
                    minHeight:       72,
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-semibold"
                      style={{ color: isSelected ? '#1A1A1A' : '#1A1A1A' }}>{type}</span>
                    {isSelected && (
                      <span className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#1A1A1A' }}>
                        <svg width="8" height="8" fill="none" stroke="#fff" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#888' }}>{desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="ez-label">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handle} rows={2}
          placeholder="Any context, follow-up notes..."
          className="ez-input w-full mt-1 resize-none" />
      </div>

      {/* ── Budget Allocation Subform ── */}
      {form.programId && (
        <div style={{ borderTop: '1px solid #E8E0D8', paddingTop: 14 }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-ez-dark">Budget Allocation</p>
              <p className="text-xs text-ez-muted">Amounts pre-filled proportionally from program categories</p>
            </div>
            {dealAmount > 0 && (
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: overAllocation ? '#E87A7A' : '#8ECFCA' }}>
                  {overAllocation ? '⚠ Over by' : 'Remaining'}: ₹{Math.abs(dealAmount - totalAllocated).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-ez-muted">Allocated: ₹{totalAllocated.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          {dealAmount > 0 && totalAllocated > 0 && (
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: '#F0EDE9' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalAllocated / dealAmount) * 100)}%`, background: overAllocation ? '#E87A7A' : '#E8967A' }} />
            </div>
          )}

          {errors.allocations && (
            <p className="text-xs mb-2" style={{ color: '#E87A7A' }}>{errors.allocations}</p>
          )}

          {loadingProgram ? (
            <p className="text-xs text-ez-muted">Loading categories…</p>
          ) : allocations.length === 0 ? (
            <p className="text-xs text-ez-muted">No budget categories defined for this program.</p>
          ) : (
            <div className="space-y-2">
              {allocations.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.category_color }} />
                    <span className="text-xs text-ez-dark truncate">{row.category_name}</span>
                  </div>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ez-muted">₹</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={row.amount}
                      onChange={e => setAllocRow(i, 'amount', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1"
                      style={{ borderColor: '#E8E0D8', background: '#FAF7F4' }}
                    />
                  </div>
                  <input
                    value={row.notes}
                    onChange={e => setAllocRow(i, 'notes', e.target.value)}
                    placeholder="notes…"
                    className="w-28 px-2 py-1.5 text-xs rounded-lg border focus:outline-none"
                    style={{ borderColor: '#E8E0D8', background: '#FAF7F4' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Deal' : 'Add Deal'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// Program picker sub-component — loads programs from context
function ProgramSelect({ value, onChange }) {
  const { programs } = usePrograms();
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="ez-input w-full mt-1"
      style={{ fontSize: 13 }}>
      <option value="">— No program —</option>
      {programs.filter(p => p.status === 'Active').map(p => (
        <option key={p.id} value={p.id}>{p.title}</option>
      ))}
    </select>
  );
}

// ── Deal Donations Modal (Partial deals) ───────────────────────────────────────
function DealDonationsModal({ deal, onClose, onAdd, onSuccess }) {
  const PAYMENT_MODES = ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Online'];
  const [donations, setDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [form, setForm] = useState({
    amount: '',
    donation_date: new Date().toISOString().slice(0, 10),
    payment_mode: 'Cash',
    fund_category: 'General',
    is_80g_eligible: true,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { getDealDonations } = useDeals();

  // Category split allocations (editable)
  const [allocations, setAllocations] = useState([]);

  const totalReceived = donations.reduce((s, d) => s + Number(d.amount), 0);
  const remaining = Number(deal.amount) - totalReceived;

  const loadDonations = useCallback(async () => {
    setLoadingDonations(true);
    try {
      const data = await getDealDonations(deal.id);
      setDonations(data);
    } catch { /* ignore */ }
    finally { setLoadingDonations(false); }
  }, [deal.id, getDealDonations]);

  useEffect(() => { loadDonations(); }, [loadDonations]);

  // Recompute proportional splits whenever amount changes
  useEffect(() => {
    const amt = parseFloat(form.amount) || 0;
    const dealAllocs = deal.allocations || [];
    if (!dealAllocs.length || !amt) { setAllocations([]); return; }
    const dealTotal = Number(deal.amount) || 0;
    if (!dealTotal) { setAllocations([]); return; }
    setAllocations(dealAllocs.map(a => ({
      category_id:    a.category_id,
      category_name:  a.category_name,
      category_color: a.category_color || '#E8967A',
      amount: String(Math.round((Number(a.amount) / dealTotal) * amt * 100) / 100),
    })));
  }, [form.amount, deal.allocations, deal.amount]);

  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const amt = parseFloat(form.amount) || 0;
  const allocOver = amt > 0 && Math.abs(totalAllocated - amt) > 0.01;

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    const trancheAmt = parseFloat(form.amount);
    if (!trancheAmt || trancheAmt <= 0) { setFormError('Amount must be greater than 0'); return; }
    if (trancheAmt > remaining) { setFormError(`Amount exceeds remaining balance of ₹${remaining.toLocaleString('en-IN')}`); return; }
    if (allocations.length && allocOver) { setFormError('Category split total must equal the tranche amount'); return; }
    setSaving(true);
    const validAllocs = allocations
      .filter(a => parseFloat(a.amount) > 0)
      .map(a => ({ category_id: a.category_id, amount: parseFloat(a.amount) }));
    try {
      await onAdd(deal.id, {
        ...form,
        amount: trancheAmt,
        is_80g_eligible: form.is_80g_eligible ? 1 : 0,
        allocations: validAllocs.length ? validAllocs : undefined,
      });
      await onSuccess();
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to add donation');
    } finally { setSaving(false); }
  };

  const pct = deal.amount > 0 ? Math.min(100, (totalReceived / Number(deal.amount)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="p-3 rounded-lg" style={{ background: '#FAF7F4', border: '1px solid #E8E0D8' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-ez-dark">Collection Progress</span>
          <span className="text-xs font-bold" style={{ color: '#E8967A' }}>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: '#E8E0D8' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#E8967A' }} />
        </div>
        <div className="flex justify-between text-xs text-ez-muted">
          <span>Received: <strong className="text-ez-dark">{formatCurrency(totalReceived)}</strong></span>
          <span>Remaining: <strong style={{ color: remaining > 0 ? '#E8967A' : '#1A8A1A' }}>{formatCurrency(remaining)}</strong></span>
          <span>Total: <strong className="text-ez-dark">{formatCurrency(deal.amount)}</strong></span>
        </div>
      </div>

      {/* Existing tranches */}
      <div>
        <p className="text-xs font-semibold text-ez-dark mb-2">Tranches Received</p>
        {loadingDonations ? (
          <p className="text-xs text-ez-muted">Loading…</p>
        ) : donations.length === 0 ? (
          <p className="text-xs text-ez-muted">No donations yet.</p>
        ) : (
          <div className="space-y-1.5">
            {donations.map(d => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                style={{ background: '#F5F2EE', border: '1px solid #E8E0D8' }}>
                <div>
                  <span className="font-semibold text-ez-dark">{formatCurrency(d.amount)}</span>
                  <span className="text-ez-muted ml-2">{d.payment_mode}</span>
                  {d.notes && <span className="text-ez-muted ml-2">· {d.notes}</span>}
                </div>
                <div className="text-ez-muted">{formatDate(d.donation_date)} · #{d.receipt_number}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add tranche form */}
      {remaining > 0 && (
        <div style={{ borderTop: '1px solid #E8E0D8', paddingTop: 14 }}>
          <p className="text-xs font-semibold text-ez-dark mb-3">Add Tranche</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ez-label">Amount (₹) <span className="text-ez-muted font-normal">max {formatCurrency(remaining)}</span></label>
                <input type="number" min="1" max={remaining} step="0.01"
                  value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="ez-input w-full mt-1" placeholder="0" required />
              </div>
              <div>
                <label className="ez-label">Date</label>
                <input type="date" value={form.donation_date}
                  onChange={e => setForm(p => ({ ...p, donation_date: e.target.value }))}
                  className="ez-input w-full mt-1" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ez-label">Payment Mode</label>
                <select value={form.payment_mode} onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}
                  className="ez-input w-full mt-1">
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="ez-label">Fund Category</label>
                <input value={form.fund_category} onChange={e => setForm(p => ({ ...p, fund_category: e.target.value }))}
                  className="ez-input w-full mt-1" placeholder="General" />
              </div>
            </div>
            <div>
              <label className="ez-label">Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="ez-input w-full mt-1" placeholder="Optional note" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.is_80g_eligible}
                onChange={e => setForm(p => ({ ...p, is_80g_eligible: e.target.checked }))}
                className="accent-orange-400 w-4 h-4" />
              <span className="text-xs font-medium text-ez-dark">Eligible for 80G Tax Deduction</span>
            </label>

            {/* Category split subform */}
            {allocations.length > 0 && (
              <div style={{ borderTop: '1px solid #E8E0D8', paddingTop: 10 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-ez-dark">Category Split</p>
                  {amt > 0 && (
                    <span className="text-xs font-medium" style={{ color: allocOver ? '#E87A7A' : '#1A8A1A' }}>
                      {allocOver
                        ? `Over by ₹${Math.abs(totalAllocated - amt).toLocaleString('en-IN')}`
                        : `✓ Balanced`}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {allocations.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.category_color }} />
                        <span className="text-xs text-ez-dark truncate">{a.category_name}</span>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ez-muted">₹</span>
                        <input type="number" min="0" step="0.01"
                          value={a.amount}
                          onChange={e => setAllocations(p => p.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))}
                          className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border focus:outline-none"
                          style={{ borderColor: '#E8E0D8', background: '#FAF7F4' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formError && <p className="text-xs" style={{ color: '#E87A7A' }}>{formError}</p>}
            <div className="flex gap-3 pt-1">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Adding…' : 'Add Donation'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            </div>
          </form>
        </div>
      )}
      {remaining <= 0 && (
        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      )}
    </div>
  );
}

// ── Deal Card (Kanban) ─────────────────────────────────────────────────────────
function DealCard({ deal, onEdit, onDelete, onStageChange, onViewDonations }) {
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
          style={{ backgroundColor: pMeta.color + '33', color: pMeta.textColor }}>
          {deal.priority}
        </span>
        {deal.expectedDate && (
          <span className="text-xs" style={{ color: isOverdue ? '#E87A7A' : '#888' }}>
            {isOverdue ? '⚠ ' : ''}{formatDate(deal.expectedDate)}
          </span>
        )}
      </div>

      {/* Partial deal badge */}
      {deal.dealType === 'Partial' && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: '#EBF4FD', color: '#1F6FA3', border: '1px solid #7ab8e8' }}>
            Partial
          </span>
          {onViewDonations && (
            <button onClick={e => { e.stopPropagation(); onViewDonations(deal); }}
              className="text-xs px-1.5 py-0.5 rounded border font-medium transition-colors"
              style={{ borderColor: '#7ab8e8', color: '#1F6FA3' }}>
              Donations
            </button>
          )}
        </div>
      )}

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
function KanbanView({ deals, onEdit, onDelete, onStageChange, onViewDonations }) {
  const draggedId = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = (stage) => setCollapsed(p => ({ ...p, [stage]: !p[stage] }));

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
    <div style={{ padding: '12px 16px', flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
    <div className="flex gap-3 pb-2" style={{ alignItems: 'stretch', width: '100%' }}>
      {STAGES.map(stage => {
        const cards = deals.filter(d => d.stage === stage);
        const meta = STAGE_META[stage];
        const total = cards.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        const expected = Math.round(total * meta.probability / 100);
        const isOver = dragOverCol === stage;
        const isCollapsed = !!collapsed[stage];
        return (
          <div key={stage}
            className="flex flex-col rounded-xl overflow-hidden border transition-all"
            style={{
              flex: '1 1 0',
              minWidth: isCollapsed ? 44 : 140,
              maxWidth: isCollapsed ? 80 : 'none',
              borderColor: isOver ? meta.color : '#E8E0D8',
              boxShadow: isOver ? `0 0 0 2px ${meta.color}44` : 'none',
              transition: 'max-width 0.2s ease, min-width 0.2s ease',
            }}
            onDragOver={e => handleDragOver(e, stage)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, stage)}>
            {/* Accent bar with toggle always top-right */}
            <div style={{ height: 20, backgroundColor: meta.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
              <button onClick={() => toggleCollapse(stage)} title={isCollapsed ? 'Expand' : 'Collapse'}
                style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '1px 3px', borderRadius: 3, background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
                </svg>
              </button>
            </div>

            {isCollapsed ? (
              /* ── Collapsed: vertical pill ── */
              <div className="flex flex-col items-center gap-2 py-3 cursor-pointer select-none"
                style={{ backgroundColor: meta.bg, flex: 1 }}
                onClick={() => toggleCollapse(stage)}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: meta.textColor, color: '#fff' }}>{cards.length}</span>
                <span className="text-xs font-bold"
                  style={{ color: meta.textColor, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>{stage}</span>
              </div>
            ) : (
              <>
                <div className="px-3 pt-2 pb-2"
                  style={{ backgroundColor: isOver ? meta.color + '18' : meta.bg, borderBottom: `1px solid ${meta.color}55` }}>
                  {/* Row 1: stage name · count · probability */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-wide flex-1" style={{ color: meta.textColor }}>{stage}</span>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: meta.textColor, color: '#fff' }}>{cards.length}</span>
                    <span className="text-xs" style={{ color: meta.textColor + 'AA' }}>·</span>
                    <span className="text-xs font-semibold" style={{ color: meta.textColor + 'CC' }}>{meta.probability}%</span>
                  </div>
                  {/* Row 2: total value + expected */}
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: meta.textColor + '88' }}>Total</p>
                      <p className="text-xs font-bold" style={{ color: meta.textColor }}>
                        {total > 0 ? formatCurrency(total) : <span style={{ color: meta.textColor + '55' }}>—</span>}
                      </p>
                    </div>
                    {meta.probability > 0 && meta.probability < 100 && (
                      <div className="text-right">
                        <p className="text-xs" style={{ color: meta.textColor + '88' }}>Expected</p>
                        <p className="text-xs font-bold" style={{ color: meta.textColor + 'BB' }}>
                          {expected > 0 ? formatCurrency(expected) : '—'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 transition-colors"
                  style={{ minHeight: '200px', backgroundColor: isOver ? meta.color + '11' : '#FAF7F4' }}>
                  {cards.map(deal => (
                    <div key={deal.id}
                      draggable
                      onDragStart={e => handleDragStart(e, deal.id)}
                      onDragEnd={() => { draggedId.current = null; setDragOverCol(null); }}>
                      <DealCard deal={deal} onEdit={onEdit} onDelete={onDelete} onStageChange={onStageChange} onViewDonations={onViewDonations} />
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg text-xs text-ez-muted"
                      style={{ borderColor: isOver ? meta.color : '#E8E0D8' }}>
                      {isOver ? 'Drop here' : 'No deals'}
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

// ── List View ──────────────────────────────────────────────────────────────────
function ListView({ deals, onEdit, onDelete, onStageChange, onViewDonations }) {
  if (!deals.length) return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.09)', textAlign: 'center', padding: '64px 0' }}>
      <p className="font-semibold text-ez-dark">No deals found</p>
      <p className="text-ez-muted text-sm mt-1">Add your first deal to get started</p>
    </div>
  );

  return (
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
                  <td className="font-semibold text-ez-dark">
                    <div>{deal.amount > 0 ? formatCurrency(deal.amount) : '—'}</div>
                    {deal.dealType === 'Partial' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: '#EBF4FD', color: '#1F6FA3', border: '1px solid #7ab8e8' }}>
                        Partial
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: meta.bg, color: meta.textColor }}>
                      {deal.stage}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: pMeta.color + '33', color: pMeta.textColor }}>
                      {deal.priority}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: isOverdue ? '#E87A7A' : '#888' }}>
                    {isOverdue ? '⚠ ' : ''}{deal.expectedDate ? formatDate(deal.expectedDate) : '—'}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {onViewDonations && deal.dealType === 'Partial' && (
                        <button onClick={() => onViewDonations(deal)} title="View Donations"
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{ color: '#1F6FA3' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </button>
                      )}
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
  );
}

// CalendarView for deals is handled by the shared CalendarGrid component below.

// ── Main Deals Page ────────────────────────────────────────────────────────────
export function Deals() {
  const { deals, loading, addDeal, updateDeal, updateDealStage, deleteDeal, receiveDeal, addDealDonation, fetchDeals } = useDeals();

  useEffect(() => {
    fetchDeals();
  }, []);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('deals', 'can_create');
  const canEdit   = hasPermission('deals', 'can_edit');
  const canDelete = hasPermission('deals', 'can_delete');
  const { donors } = useDonors();
  const { fetchDonations } = useDonations();
  const toast = useToast();

  const [view, setView] = useState('kanban');
  const [addHovered, setAddHovered] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveForm, setReceiveForm] = useState({ payment_mode: 'Cash', donation_date: '', is_80g_eligible: true });
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [donationsTarget, setDonationsTarget] = useState(null);

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

  const openAdd = (prefill = {}) => { setEditDeal(null); setPrefilledDate(prefill.expectedDate || ''); setShowForm(true); };
  const openEdit = (deal) => { setEditDeal(deal); setPrefilledDate(''); setShowForm(true); };
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
    if (newStage === 'Received' && deal.dealType === 'Full') {
      // Open receive confirmation modal for Full deals
      setReceiveForm({
        payment_mode: 'Cash',
        donation_date: new Date().toISOString().slice(0, 10),
        is_80g_eligible: true,
      });
      setReceiveTarget({ deal, newStage });
      return;
    }
    try {
      await updateDealStage(deal.id, newStage);
      toast.success(`Moved to ${newStage}`);
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleReceiveConfirm = async (e) => {
    e.preventDefault();
    if (!receiveTarget) return;
    setReceiveSaving(true);
    try {
      await receiveDeal(receiveTarget.deal.id, receiveForm);
      await fetchDonations();
      toast.success('Deal received & donation created');
      setReceiveTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to receive deal');
    } finally {
      setReceiveSaving(false);
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
    <div style={{ background: '#E8E2DB', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>


      {/* Deal form modal */}
      <Modal isOpen={showForm} onClose={closeForm} title={editDeal ? 'Edit Deal' : 'New Deal'} size="lg">
        <DealForm initialData={editDeal || (prefilledDate ? { expectedDate: prefilledDate } : {})} donors={donors} onSubmit={handleSubmit} onCancel={closeForm} loading={saving} />
      </Modal>

      {/* Receive Full Deal modal */}
      <Modal isOpen={!!receiveTarget} onClose={() => setReceiveTarget(null)} title="Receive Deal" size="sm">
        {receiveTarget && (
          <form onSubmit={handleReceiveConfirm} className="space-y-4">
            <div className="p-3 rounded-lg text-xs" style={{ background: '#FAF7F4', border: '1px solid #E8E0D8' }}>
              <p className="font-semibold text-ez-dark">{receiveTarget.deal.title}</p>
              <p className="text-ez-muted mt-0.5">{receiveTarget.deal.donorName} · {formatCurrency(receiveTarget.deal.amount)}</p>
              <p className="mt-2 text-ez-muted">A donation of <strong className="text-ez-dark">{formatCurrency(receiveTarget.deal.amount)}</strong> will be auto-created and this deal will be marked as Received.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ez-label">Donation Date</label>
                <input type="date" value={receiveForm.donation_date}
                  onChange={e => setReceiveForm(p => ({ ...p, donation_date: e.target.value }))}
                  className="ez-input w-full mt-1" required />
              </div>
              <div>
                <label className="ez-label">Payment Mode</label>
                <select value={receiveForm.payment_mode}
                  onChange={e => setReceiveForm(p => ({ ...p, payment_mode: e.target.value }))}
                  className="ez-input w-full mt-1">
                  {['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Online'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="ez-label">Notes <span className="text-ez-muted font-normal">(optional)</span></label>
              <input value={receiveForm.notes || ''} onChange={e => setReceiveForm(p => ({ ...p, notes: e.target.value }))}
                className="ez-input w-full mt-1" placeholder="Any notes for this donation" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!receiveForm.is_80g_eligible}
                onChange={e => setReceiveForm(p => ({ ...p, is_80g_eligible: e.target.checked }))}
                className="accent-orange-400 w-4 h-4" />
              <span className="text-xs font-medium text-ez-dark">Eligible for 80G Tax Deduction</span>
            </label>
            <div className="flex gap-3 pt-2 border-t border-cream-200">
              <Button type="submit" variant="primary" disabled={receiveSaving}>
                {receiveSaving ? 'Processing…' : 'Confirm & Receive'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setReceiveTarget(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Partial Deal Donations modal */}
      <Modal isOpen={!!donationsTarget} onClose={() => setDonationsTarget(null)}
        title={donationsTarget ? `Donations — ${donationsTarget.title}` : ''} size="lg">
        {donationsTarget && (
          <DealDonationsModal
            deal={donationsTarget}
            onClose={() => setDonationsTarget(null)}
            onAdd={addDealDonation}
            onSuccess={async () => {
              await fetchDonations();
              toast.success('Tranche donation added');
            }}
          />
        )}
      </Modal>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div onClick={() => setFiltersOpen(v => !v)} style={{ background: '#1A1A1A', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="13" height="13" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" /></svg>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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
          </div>
        </div>}
      </div>

      {/* Content Header + View Switcher */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#1A1A1A', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '14px 14px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deal List</span>
            <span style={{ color: '#fff', fontSize: 11, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 10px' }}>{filtered.length} total</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canCreate && (
              <button onClick={openAdd} onMouseEnter={() => setAddHovered(true)} onMouseLeave={() => setAddHovered(false)}
                title="Add Deal"
                style={{ background: '#E8967A', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {addHovered && <span style={{ whiteSpace: 'nowrap' }}>Add</span>}
              </button>
            )}
            <div className="flex rounded-lg border border-gray-600 overflow-hidden">
              {VIEWS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  title={v.label}
                  className="p-2 transition-colors"
                  style={{
                    backgroundColor: view === v.id ? '#E8967A' : '#3D3D3D',
                    color: view === v.id ? '#fff' : '#aaa',
                  }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={v.icon} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stage summary pills — only in Kanban */}
        {view === 'kanban' && <div style={{ padding: '10px 20px', borderBottom: '1px solid #F0EBE5' }} className="flex gap-2 flex-wrap">
          {STAGES.map(stage => {
            const count = deals.filter(d => d.stage === stage).length;
            const meta = STAGE_META[stage];
            return (
              <button key={stage}
                onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  backgroundColor: stageFilter === stage ? meta.color : meta.bg,
                  color: stageFilter === stage ? '#fff' : meta.textColor,
                  borderColor: meta.color,
                }}>
                {stage}
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>}

        {/* View content */}
        {loading && !deals.length ? (
          <div className="text-center py-12 text-ez-muted text-sm">Loading deals...</div>
        ) : view === 'kanban' ? (
          <KanbanView deals={filtered} onEdit={canEdit ? openEdit : null} onDelete={canDelete ? setDeleteTarget : null} onStageChange={canEdit ? handleStageChange : () => {}} onViewDonations={setDonationsTarget} />
        ) : view === 'list' ? (
          <ListView deals={filtered} onEdit={canEdit ? openEdit : null} onDelete={canDelete ? setDeleteTarget : null} onStageChange={canEdit ? handleStageChange : () => {}} onViewDonations={setDonationsTarget} />
        ) : (
          <CalendarGrid
            items={filtered}
            getDate={d => d.expectedDate ? String(d.expectedDate).slice(0, 10) : null}
            renderDot={d => { const meta = STAGE_META[d.stage] || STAGE_META.Prospect; return { label: d.title, color: meta.color, bg: meta.bg }; }}
            onItemClick={openEdit}
            onDayClick={handleDayClick}
          />
        )}
      </div>

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
