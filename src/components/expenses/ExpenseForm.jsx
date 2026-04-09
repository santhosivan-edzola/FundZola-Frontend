import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../constants';
import { validateAmount, validateRequired } from '../../utils/validators';
import { usePrograms } from '../../hooks/usePrograms';
import { api } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function ExpenseForm({ initialData = {}, onSubmit, onCancel }) {
  const { programs } = usePrograms();

  const [form, setForm] = useState({
    programId:     initialData.program_id     || initialData.programId     || '',
    categoryId:    initialData.category_id    || initialData.categoryId    || '',
    description:   initialData.description    || '',
    amount:        initialData.amount         || '',
    date:          initialData.expense_date   || initialData.date || new Date().toISOString().split('T')[0],
    category:      initialData.category       || '',
    vendor:        initialData.vendor         || '',
    invoiceNumber: initialData.invoice_number || initialData.invoiceNumber || '',
    paymentMode:   initialData.payment_mode   || initialData.paymentMode   || '',
    approvedBy:    initialData.approved_by    || initialData.approvedBy    || '',
    notes:         initialData.notes          || '',
    expenseType:   initialData.expense_type   || initialData.expenseType   || 'Full',
    donationId:    initialData.donation_id    || initialData.donationId    || '',
  });
  const [errors, setErrors] = useState({});

  const [programCategories, setProgramCategories] = useState([]);
  const [openDonations, setOpenDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [allocations, setAllocations] = useState([]);

  // Load program categories when program changes
  useEffect(() => {
    if (!form.programId) { setProgramCategories([]); setOpenDonations([]); return; }
    api.get(`/programs/${form.programId}`).then(res => {
      if (res.success) setProgramCategories(res.data.allocations || []);
    }).catch(() => setProgramCategories([]));
  }, [form.programId]);

  // Load open donations when program + category selected
  const loadOpenDonations = useCallback(async (programId, categoryId) => {
    if (!programId || !categoryId) { setOpenDonations([]); setAllocations([]); return; }
    setLoadingDonations(true);
    try {
      const res = await api.get(`/expenses/open-donations?program_id=${programId}&category_id=${categoryId}`);
      const data = res.success ? res.data : [];
      setOpenDonations(data);
      setAllocations(data.map(d => ({
        donation_id:    d.id,
        receipt_number: d.receipt_number,
        donor_name:     d.donor_name,
        donation_amount: d.donation_amount,
        remaining:      d.remaining,
        amount:         '',
      })));
    } catch { setOpenDonations([]); setAllocations([]); }
    finally { setLoadingDonations(false); }
  }, []);

  useEffect(() => {
    loadOpenDonations(form.programId, form.categoryId);
  }, [form.programId, form.categoryId, loadOpenDonations]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(p => {
      const updated = { ...p, [name]: value };
      if (name === 'programId') { updated.categoryId = ''; updated.donationId = ''; }
      if (name === 'categoryId') { updated.donationId = ''; }
      return updated;
    });
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const expenseAmount  = parseFloat(form.amount) || 0;
  const splitOver      = form.expenseType === 'Split' && expenseAmount > 0 && Math.abs(totalAllocated - expenseAmount) > 0.01;

  const validate = () => {
    const errs = {};
    if (!form.description?.trim()) errs.description = 'Description is required';
    const av = validateAmount(form.amount);
    if (!av.valid) errs.amount = av.message;
    if (!form.date)     errs.date     = 'Date is required';
    if (!form.category) errs.category = 'Expense category is required';
    if (form.expenseType === 'Full' && !form.donationId) errs.donationId = 'Select a donation to link';
    if (form.expenseType === 'Split') {
      if (!allocations.some(a => parseFloat(a.amount) > 0)) errs.allocations = 'Allocate amount across at least one donation';
      else if (splitOver) errs.allocations = `Allocated ₹${totalAllocated.toLocaleString('en-IN')} must equal expense amount ₹${expenseAmount.toLocaleString('en-IN')}`;
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const validAllocs = allocations
      .filter(a => parseFloat(a.amount) > 0)
      .map(a => ({ donation_id: a.donation_id, amount: parseFloat(a.amount) }));

    onSubmit({
      ...form,
      program_id:   form.programId  || null,
      category_id:  form.categoryId || null,
      expense_type: form.expenseType,
      donation_id:  form.expenseType === 'Full' ? (form.donationId || null) : null,
      allocations:  form.expenseType === 'Split' ? validAllocs : undefined,
      expense_date: form.date,
    });
  };

  const isEdit = Boolean(initialData.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Step 1: Program & Category ── */}
      <div style={{ borderBottom: '1px solid #E8E0D8', paddingBottom: 14 }}>
        <p className="text-xs font-bold text-ez-dark mb-3 uppercase tracking-wide">Program & Category</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ez-label">Program <span className="text-ez-muted font-normal">(optional)</span></label>
            <select name="programId" value={form.programId} onChange={handle} className="ez-input w-full mt-1">
              <option value="">— No program —</option>
              {programs.filter(p => p.status === 'Active').map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ez-label">Budget Category <span className="text-ez-muted font-normal">(optional)</span></label>
            <select name="categoryId" value={form.categoryId} onChange={handle}
              className="ez-input w-full mt-1" disabled={!form.programId || !programCategories.length}>
              <option value="">— Select category —</option>
              {programCategories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
            {form.programId && !programCategories.length && (
              <p className="text-xs text-ez-muted mt-1">No categories in this program.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Step 2: Expense Details ── */}
      <div>
        <p className="text-xs font-bold text-ez-dark mb-3 uppercase tracking-wide">Expense Details</p>
        <Input label="Description" name="description" value={form.description} onChange={handle}
          error={errors.description} required placeholder="Brief description of the expense" />

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Input label="Amount (₹)" name="amount" type="number" value={form.amount} onChange={handle}
            error={errors.amount} required placeholder="0.00" min="1" step="0.01" />
          <Input label="Date" name="date" type="date" value={form.date} onChange={handle}
            error={errors.date} required />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Select label="Expense Category" name="category" value={form.category} onChange={handle}
            error={errors.category} required
            options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select category" />
          <Select label="Payment Mode" name="paymentMode" value={form.paymentMode} onChange={handle}
            options={PAYMENT_MODES.map(m => ({ value: m, label: m }))} placeholder="Select mode" />
        </div>
      </div>

      {/* ── Step 3: Open Donations (when program+category selected) ── */}
      {form.programId && form.categoryId && (
        <div style={{ borderTop: '1px solid #E8E0D8', paddingTop: 14 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-ez-dark uppercase tracking-wide">Link to Donation</p>
            {/* Expense type toggle */}
            <div className="flex gap-1 rounded-lg overflow-hidden border" style={{ borderColor: '#E8E0D8' }}>
              {['Full', 'Split'].map(type => (
                <button key={type} type="button"
                  onClick={() => setForm(p => ({ ...p, expenseType: type, donationId: '' }))}
                  className="px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    background: form.expenseType === type ? '#E8967A' : '#FAF7F4',
                    color:      form.expenseType === type ? '#fff'     : '#888',
                  }}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {loadingDonations ? (
            <p className="text-xs text-ez-muted">Loading open donations…</p>
          ) : openDonations.length === 0 ? (
            <div className="text-xs text-ez-muted p-3 rounded-lg text-center" style={{ background: '#FAF7F4', border: '1px dashed #E8E0D8' }}>
              No open donations found for this program &amp; category.
            </div>
          ) : form.expenseType === 'Full' ? (
            /* Full: pick one donation */
            <div className="space-y-1.5">
              <p className="text-xs text-ez-muted mb-2">Select the donation to link this expense to:</p>
              {errors.donationId && <p className="text-xs mb-2" style={{ color: '#E87A7A' }}>{errors.donationId}</p>}
              {openDonations.map(d => (
                <label key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${form.donationId == d.id ? '#E8967A' : '#E8E0D8'}`,
                    background: form.donationId == d.id ? '#FDF0EB' : '#FAF7F4',
                  }}>
                  <input type="radio" name="donationId" value={d.id}
                    checked={form.donationId == d.id}
                    onChange={handle}
                    className="accent-orange-400" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-ez-dark">{d.donor_name}</span>
                    <span className="text-xs text-ez-muted ml-2">#{d.receipt_number}</span>
                    <span className="text-xs text-ez-muted ml-2">· {formatDate(d.donation_date)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: '#E8967A' }}>Available: {formatCurrency(d.remaining)}</p>
                    <p className="text-xs text-ez-muted">Donation: {formatCurrency(d.donation_amount)}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            /* Split: distribute across donations */
            <div>
              <p className="text-xs text-ez-muted mb-2">Distribute expense across open donations:</p>
              {errors.allocations && <p className="text-xs mb-2" style={{ color: '#E87A7A' }}>{errors.allocations}</p>}
              {/* Progress bar */}
              {expenseAmount > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ez-muted">Allocated: <strong className="text-ez-dark">{formatCurrency(totalAllocated)}</strong></span>
                    <span style={{ color: splitOver ? '#E87A7A' : '#1A8A1A' }}>
                      {splitOver ? `Over by ${formatCurrency(totalAllocated - expenseAmount)}` : `Remaining: ${formatCurrency(expenseAmount - totalAllocated)}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E0D8' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, expenseAmount > 0 ? (totalAllocated / expenseAmount) * 100 : 0)}%`, background: splitOver ? '#E87A7A' : '#E8967A' }} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {allocations.map((a, i) => (
                  <div key={a.donation_id} className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: '#FAF7F4', border: '1px solid #E8E0D8' }}>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-ez-dark">{a.donor_name}</p>
                      <p className="text-xs text-ez-muted">#{a.receipt_number} · Available: {formatCurrency(a.remaining)}</p>
                    </div>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ez-muted">₹</span>
                      <input type="number" min="0" max={a.remaining} step="0.01"
                        value={a.amount}
                        onChange={e => setAllocations(p => p.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))}
                        className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1"
                        style={{ borderColor: '#E8E0D8', background: '#fff' }}
                        placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Optional Details ── */}
      <div style={{ borderTop: '1px solid #E8E0D8', paddingTop: 14 }}>
        <p className="text-xs font-bold text-ez-dark mb-3 uppercase tracking-wide">Additional Details</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Vendor" name="vendor" value={form.vendor} onChange={handle}
            placeholder="Vendor or payee name" />
          <Input label="Invoice Number" name="invoiceNumber" value={form.invoiceNumber} onChange={handle}
            placeholder="Invoice / Bill number" />
        </div>
        <Input label="Approved By" name="approvedBy" value={form.approvedBy} onChange={handle}
          placeholder="Name of approving authority" className="mt-3" />
        <Input label="Notes" name="notes" value={form.notes} onChange={handle}
          placeholder="Additional notes..." className="mt-3" />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          {isEdit ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}

export default ExpenseForm;
