import React, { useState, useEffect } from 'react';
import { useOrg } from '../hooks/useOrg';
import { useToast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { validateEmail, validatePhone } from '../utils/validators';

export function Settings() {
  const { orgSettings, updateOrgSettings } = useOrg();
  const toast = useToast();
  const [form, setForm] = useState({ ...orgSettings });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm({ ...orgSettings });
  }, [orgSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.orgName || form.orgName.trim() === '') {
      newErrors.orgName = 'Organization name is required';
    }
    if (form.email) {
      const emailV = validateEmail(form.email);
      if (!emailV.valid) newErrors.email = emailV.message;
    }
    if (form.phone) {
      const phoneV = validatePhone(form.phone);
      if (!phoneV.valid) newErrors.phone = phoneV.message;
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      await updateOrgSettings(form);
      toast.success('Organization settings saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your organization details for receipts and reports</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Identity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100">
            Organization Identity
          </h2>
          <Input
            label="Organization Name"
            name="orgName"
            value={form.orgName || ''}
            onChange={handleChange}
            error={errors.orgName}
            required
            placeholder="Your Foundation / Trust Name"
          />
          <Input
            label="Address"
            name="address"
            value={form.address || ''}
            onChange={handleChange}
            placeholder="Street address, area"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              name="city"
              value={form.city || ''}
              onChange={handleChange}
              placeholder="City"
            />
            <Input
              label="State"
              name="state"
              value={form.state || ''}
              onChange={handleChange}
              placeholder="State"
            />
            <Input
              label="PIN Code"
              name="pincode"
              value={form.pincode || ''}
              onChange={handleChange}
              placeholder="400001"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={form.phone || ''}
              onChange={handleChange}
              error={errors.phone}
              placeholder="+91-22-12345678"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email || ''}
              onChange={handleChange}
              error={errors.email}
              placeholder="info@foundation.org"
            />
          </div>
        </div>

        {/* Registration & Tax */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100">
            Registration & Tax Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registration Number"
              name="registrationNumber"
              value={form.registrationNumber || ''}
              onChange={handleChange}
              placeholder="REG/2020/001234"
            />
            <Input
              label="80G Registration Number (PAN)"
              name="pan80G"
              value={form.pan80G || ''}
              onChange={handleChange}
              placeholder="AAATM1234A"
              hint="Your organization's PAN for 80G exemption"
            />
          </div>
        </div>

        {/* Signatory */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100">
            Authorized Signatory
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Signatory Name"
              name="signatory"
              value={form.signatory || ''}
              onChange={handleChange}
              placeholder="Dr. A. Kumar"
            />
            <Input
              label="Signatory Designation"
              name="signatoryDesignation"
              value={form.signatoryDesignation || ''}
              onChange={handleChange}
              placeholder="Secretary / Trustee"
            />
          </div>
          <p className="text-xs text-gray-400">
            This name and designation will appear on all 80G receipts generated by Fundzola.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setForm({ ...orgSettings })}>
            Reset
          </Button>
          <Button type="submit" variant="primary">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
