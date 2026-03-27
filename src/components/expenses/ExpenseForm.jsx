import React, { useState, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { EXPENSE_CATEGORIES, PAYMENT_MODES, FUND_CATEGORIES } from '../../constants';
import { validateAmount, validateRequired } from '../../utils/validators';
import { useDonations } from '../../hooks/useDonations';
import { formatCurrency, formatDate } from '../../utils/formatters';

const emptyForm = {
  fundCategory: '',
  donationId: '',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  category: '',
  vendor: '',
  invoiceNumber: '',
  paymentMode: '',
  approvedBy: '',
  notes: '',
};

export function ExpenseForm({ initialData = {}, onSubmit, onCancel }) {
  const { donations } = useDonations();
  const [form, setForm] = useState({ ...emptyForm, ...initialData });
  const [errors, setErrors] = useState({});

  const fundOptions = useMemo(() => {
    const cats = [...new Set(donations.map((d) => d.fundCategory).filter(Boolean))];
    if (cats.length === 0) return FUND_CATEGORIES.map((f) => ({ value: f, label: f }));
    return cats.map((c) => ({ value: c, label: c }));
  }, [donations]);

  const linkedDonationOptions = useMemo(() => {
    if (!form.fundCategory) return [];
    return donations
      .filter((d) => d.fundCategory === form.fundCategory)
      .map((d) => ({
        value: d.id,
        label: `${d.receiptNumber} — ${formatCurrency(d.amount)} (${formatDate(d.date)})`,
      }));
  }, [donations, form.fundCategory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'fundCategory') updated.donationId = '';
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const fundV = validateRequired(form.fundCategory, 'Fund Category');
    if (!fundV.valid) newErrors.fundCategory = fundV.message;

    const descV = validateRequired(form.description, 'Description');
    if (!descV.valid) newErrors.description = descV.message;

    const amountV = validateAmount(form.amount);
    if (!amountV.valid) newErrors.amount = amountV.message;

    const dateV = validateRequired(form.date, 'Date');
    if (!dateV.valid) newErrors.date = dateV.message;

    const catV = validateRequired(form.category, 'Category');
    if (!catV.valid) newErrors.category = catV.message;

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Fund Category"
          name="fundCategory"
          value={form.fundCategory}
          onChange={handleChange}
          error={errors.fundCategory}
          required
          options={fundOptions}
          placeholder="Select fund"
        />
        <Select
          label="Linked Donation (Optional)"
          name="donationId"
          value={form.donationId}
          onChange={handleChange}
          options={linkedDonationOptions}
          placeholder={form.fundCategory ? 'Select donation' : 'Select fund first'}
          disabled={!form.fundCategory || linkedDonationOptions.length === 0}
        />
      </div>

      <Input
        label="Description"
        name="description"
        value={form.description}
        onChange={handleChange}
        error={errors.description}
        required
        placeholder="Brief description of the expense"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (₹)"
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          error={errors.amount}
          required
          placeholder="0.00"
          min="1"
          step="0.01"
        />
        <Input
          label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
          error={errors.date}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          name="category"
          value={form.category}
          onChange={handleChange}
          error={errors.category}
          required
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          placeholder="Select category"
        />
        <Select
          label="Payment Mode"
          name="paymentMode"
          value={form.paymentMode}
          onChange={handleChange}
          options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))}
          placeholder="Select mode"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Vendor"
          name="vendor"
          value={form.vendor}
          onChange={handleChange}
          placeholder="Vendor or payee name"
        />
        <Input
          label="Invoice Number"
          name="invoiceNumber"
          value={form.invoiceNumber}
          onChange={handleChange}
          placeholder="Invoice / Bill number"
        />
      </div>

      <Input
        label="Approved By"
        name="approvedBy"
        value={form.approvedBy}
        onChange={handleChange}
        placeholder="Name of approving authority"
      />

      <Input
        label="Notes"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        placeholder="Additional notes..."
      />

      <div className="flex justify-end gap-3 pt-3 mt-2 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData.id ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}

export default ExpenseForm;
