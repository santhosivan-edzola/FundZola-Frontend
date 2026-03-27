import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { DONOR_TYPES } from '../../constants';
import { validateEmail, validatePhone, validatePAN, validateRequired } from '../../utils/validators';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  pan: '',
  donorType: '',
};

export function DonorForm({ initialData = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    ...emptyForm,
    name:      initialData.name      || '',
    email:     initialData.email     || '',
    phone:     initialData.phone     || '',
    address:   initialData.address   || '',
    pan:       initialData.pan       || initialData.pan_number  || initialData.panNumber  || '',
    donorType: initialData.donorType || initialData.donor_type  || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const nameV = validateRequired(form.name, 'Name');
    if (!nameV.valid) newErrors.name = nameV.message;

    const emailV = validateEmail(form.email);
    if (!emailV.valid) newErrors.email = emailV.message;

    const phoneV = validatePhone(form.phone);
    if (!phoneV.valid) newErrors.phone = phoneV.message;

    if (form.pan) {
      const panV = validatePAN(form.pan);
      if (!panV.valid) newErrors.pan = panV.message;
    }

    const typeV = validateRequired(form.donorType, 'Donor Type');
    if (!typeV.valid) newErrors.donorType = typeV.message;

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({ ...form, pan: form.pan.toUpperCase() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        error={errors.name}
        required
        placeholder="Enter donor name"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          required
          placeholder="donor@example.com"
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="9876543210"
        />
      </div>
      <Input
        label="Address"
        name="address"
        value={form.address}
        onChange={handleChange}
        error={errors.address}
        placeholder="Street, City, State"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="PAN Number"
          name="pan"
          value={form.pan}
          onChange={handleChange}
          error={errors.pan}
          placeholder="ABCDE1234F"
          hint="Required for 80G receipts"
          className="uppercase"
        />
        <Select
          label="Donor Type"
          name="donorType"
          value={form.donorType}
          onChange={handleChange}
          error={errors.donorType}
          required
          options={DONOR_TYPES.map((t) => ({ value: t, label: t }))}
          placeholder="Select type"
        />
      </div>
      <div className="flex justify-end gap-3 pt-3 mt-2 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData.id ? 'Update Donor' : 'Add Donor'}
        </Button>
      </div>
    </form>
  );
}

export default DonorForm;
