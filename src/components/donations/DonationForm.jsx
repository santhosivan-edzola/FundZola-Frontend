import React, { useState, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { PAYMENT_MODES, FUND_CATEGORIES } from '../../constants';
import { validateAmount, validateRequired } from '../../utils/validators';
import { useDonors } from '../../hooks/useDonors';

const emptyForm = {
  donorId: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  paymentMode: '',
  chequeNumber: '',
  bankName: '',
  fundCategory: '',
  purpose: '',
  is80G: true,
  notes: '',
};

const chequeOrDD = ['Cheque', 'Demand Draft'];
const bankModes = ['Cheque', 'Demand Draft', 'NEFT/RTGS', 'Online Transfer'];

export function DonationForm({ initialData = {}, onSubmit, onCancel }) {
  const { donors } = useDonors();
  const [form, setForm] = useState({ ...emptyForm, ...initialData });
  const [errors, setErrors] = useState({});
  const [donorSearch, setDonorSearch] = useState('');

  const activeDonors = useMemo(
    () => donors.filter((d) => d.isActive !== false),
    [donors]
  );

  const filteredDonors = useMemo(() => {
    if (!donorSearch) return activeDonors;
    const q = donorSearch.toLowerCase();
    return activeDonors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.pan && d.pan.toLowerCase().includes(q))
    );
  }, [activeDonors, donorSearch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const donorV = validateRequired(form.donorId, 'Donor');
    if (!donorV.valid) newErrors.donorId = donorV.message;

    const amountV = validateAmount(form.amount);
    if (!amountV.valid) newErrors.amount = amountV.message;

    const dateV = validateRequired(form.date, 'Date');
    if (!dateV.valid) newErrors.date = dateV.message;

    const modeV = validateRequired(form.paymentMode, 'Payment Mode');
    if (!modeV.valid) newErrors.paymentMode = modeV.message;

    const fundV = validateRequired(form.fundCategory, 'Fund Category');
    if (!fundV.valid) newErrors.fundCategory = fundV.message;

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

  const selectedDonor = activeDonors.find((d) => d.id === form.donorId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Donor Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Donor <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Search donor by name, email, or PAN..."
          value={donorSearch}
          onChange={(e) => setDonorSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
        />
        {selectedDonor && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700 font-medium">{selectedDonor.name}</span>
            {selectedDonor.pan && (
              <span className="text-xs text-blue-500">({selectedDonor.pan})</span>
            )}
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, donorId: '' }))}
              className="ml-auto text-blue-400 hover:text-blue-600 text-xs"
            >
              Change
            </button>
          </div>
        )}
        {!selectedDonor && (
          <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto bg-white shadow-sm">
            {filteredDonors.length === 0 ? (
              <p className="p-3 text-sm text-gray-400 text-center">No donors found</p>
            ) : (
              filteredDonors.slice(0, 10).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, donorId: d.id }));
                    setDonorSearch('');
                    if (errors.donorId) setErrors((prev) => ({ ...prev, donorId: '' }));
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-800">{d.name}</span>
                  {d.pan && <span className="ml-2 text-gray-400 text-xs">{d.pan}</span>}
                  {d.email && <span className="ml-2 text-gray-400 text-xs">{d.email}</span>}
                </button>
              ))
            )}
          </div>
        )}
        {errors.donorId && <p className="mt-1 text-xs text-red-600">{errors.donorId}</p>}
      </div>

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
          label="Payment Mode"
          name="paymentMode"
          value={form.paymentMode}
          onChange={handleChange}
          error={errors.paymentMode}
          required
          options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))}
          placeholder="Select mode"
        />
        <Select
          label="Fund Category"
          name="fundCategory"
          value={form.fundCategory}
          onChange={handleChange}
          error={errors.fundCategory}
          required
          options={FUND_CATEGORIES.map((f) => ({ value: f, label: f }))}
          placeholder="Select fund"
        />
      </div>

      {chequeOrDD.includes(form.paymentMode) && (
        <Input
          label="Cheque / DD Number"
          name="chequeNumber"
          value={form.chequeNumber}
          onChange={handleChange}
          placeholder="Enter cheque or DD number"
        />
      )}

      {bankModes.includes(form.paymentMode) && (
        <Input
          label="Bank Name"
          name="bankName"
          value={form.bankName}
          onChange={handleChange}
          placeholder="Enter bank name"
        />
      )}

      <Input
        label="Purpose"
        name="purpose"
        value={form.purpose}
        onChange={handleChange}
        placeholder="Purpose or description of donation"
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is80G"
          name="is80G"
          checked={form.is80G}
          onChange={handleChange}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="is80G" className="text-sm text-gray-700 font-medium">
          Eligible for 80G Tax Deduction
        </label>
      </div>

      <Input
        label="Notes"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        placeholder="Any additional notes..."
      />

      <div className="flex justify-end gap-3 pt-3 mt-2 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData.id ? 'Update Donation' : 'Add Donation'}
        </Button>
      </div>
    </form>
  );
}

export default DonationForm;
