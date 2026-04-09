import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrg } from '../hooks/useOrg';
import { useToast } from '../components/ui/Toast';
import { useZoho } from '../hooks/useZoho';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { validateEmail, validatePhone } from '../utils/validators';

export function Settings() {
  const { orgSettings, updateOrgSettings } = useOrg();
  const toast    = useToast();
  const location = useLocation();
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <ZohoBooksSection toast={toast} location={location} />
    </div>
  );
}

// Parses MySQL DATETIME strings (no tz info) as UTC, formats in IST
function toIST(val) {
  if (!val) return 'Never';
  // MySQL returns "2024-01-17 10:30:00" — append Z so JS treats it as UTC
  const normalized = typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')
    ? val.trim().replace(' ', 'T') + 'Z'
    : val;
  const d = new Date(normalized);
  if (isNaN(d)) return String(val);
  return d.toLocaleString('en-IN', {
    timeZone:  'Asia/Kolkata',
    day:       '2-digit',
    month:     'short',
    year:      'numeric',
    hour:      '2-digit',
    minute:    '2-digit',
    hour12:    true,
  });
}

// ── Zoho Books Integration Section ───────────────────────────────────────────
function ZohoBooksSection({ toast, location }) {
  const { status, loading, syncing, fetchStatus, saveCredentials, getAuthUrl, exchangeCode, fetchZohoOrgs, saveOrgId, fetchLogDetails, manualSync, toggleSync, disconnect } = useZoho();
  const [credsForm, setCredsForm]     = useState({ client_id: '', client_secret: '', dc_region: 'IN' });
  const [authCode, setAuthCode]       = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [exchanging, setExchanging]   = useState(false);
  const [showSecret, setShowSecret]   = useState(false);
  const [zohoOrgs, setZohoOrgs]           = useState([]);
  const [loadingOrgs, setLoadingOrgs]     = useState(false);
  const [manualOrgId, setManualOrgId]     = useState('');
  const [savingOrgId, setSavingOrgId]     = useState(false);
  const [expandedLog, setExpandedLog]     = useState(null);
  const [logDetails, setLogDetails]       = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Handle redirect back from Zoho OAuth
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const zohoStatus = params.get('zoho');
    if (zohoStatus === 'connected') {
      toast.success('Zoho Books connected successfully!');
      fetchStatus();
    } else if (zohoStatus === 'error') {
      toast.error('Zoho connection failed: ' + (params.get('msg') || 'unknown error'));
    }
  }, [location.search]); // eslint-disable-line

  const handleSaveCreds = async (e) => {
    e.preventDefault();
    if (!credsForm.client_id || !credsForm.client_secret) {
      toast.error('Client ID and Client Secret are required.');
      return;
    }
    setSavingCreds(true);
    try {
      await saveCredentials(credsForm);
      toast.success('Credentials saved. Now click "Connect with Zoho Books".');
      fetchStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to save credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleConnect = async () => {
    try {
      const url = await getAuthUrl();
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || 'Could not generate auth URL. Save credentials first.');
    }
  };

  const handleFetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const orgs = await fetchZohoOrgs();
      setZohoOrgs(orgs);
      if (orgs.length === 1) {
        await saveOrgId(orgs[0].organization_id);
        toast.success(`Org ID saved: ${orgs[0].name}`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not fetch organizations.');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleExpandLog = async (logId) => {
    if (expandedLog === logId) { setExpandedLog(null); return; }
    setExpandedLog(logId);
    if (logDetails[logId]) return;
    setLoadingDetail(logId);
    try {
      const details = await fetchLogDetails(logId);
      setLogDetails(prev => ({ ...prev, [logId]: details }));
    } catch (err) {
      toast.error('Could not load details: ' + err.message);
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleSaveOrgId = async () => {
    if (!manualOrgId.trim()) { toast.error('Enter a Zoho Org ID.'); return; }
    setSavingOrgId(true);
    try {
      await saveOrgId(manualOrgId.trim());
      setManualOrgId('');
      toast.success('Zoho Org ID saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingOrgId(false);
    }
  };

  const handleExchangeCode = async () => {
    if (!authCode.trim()) { toast.error('Paste the authorization code from Zoho.'); return; }
    setExchanging(true);
    try {
      await exchangeCode(authCode.trim());
      setAuthCode('');
      toast.success('Connected to Zoho Books successfully!');
    } catch (err) {
      toast.error(err.message || 'Code exchange failed. The code may have expired (valid for 1 min).');
    } finally {
      setExchanging(false);
    }
  };

  const handleSync = async () => {
    try {
      const result = await manualSync();
      toast.success(`Sync complete — pushed ${result?.pushed ?? 0}, pulled ${result?.pulled ?? 0} records.`);
    } catch (err) {
      toast.error(err.message || 'Sync failed.');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Zoho Books? Existing synced data will remain.')) return;
    try {
      await disconnect();
      toast.success('Disconnected from Zoho Books.');
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect.');
    }
  };

  const cfg = status?.config;
  const logs = status?.recentLogs || [];

  const statusBadge = cfg?.is_connected
    ? <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>Connected</span>
    : <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>Not Connected</span>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, background: '#E8F5FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">Zoho Books Integration</h2>
            <p className="text-xs text-gray-500">Bi-directional sync of Donors, Donations & Expenses · auto-runs every hour</p>
          </div>
        </div>
        {!loading && statusBadge}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          {/* Credentials form — shown when not connected */}
          {!cfg?.is_connected && (
            <div className="space-y-5">
              {/* Step 1 — credentials */}
              <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '14px 16px' }}>
                <p className="text-xs font-bold text-blue-700 mb-1">Step 1 — Save API Credentials</p>
                <p className="text-xs text-gray-500 mb-3">
                  Go to <a href="https://api-console.zoho.in" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">api-console.zoho.in</a> → Self Client → copy Client ID &amp; Secret.
                </p>
                <form onSubmit={handleSaveCreds} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="ez-label">Client ID</label>
                      <input className="ez-input w-full mt-1" placeholder="1000.XXXX..."
                        value={credsForm.client_id} onChange={e => setCredsForm(p => ({ ...p, client_id: e.target.value }))} />
                    </div>
                    <div>
                      <label className="ez-label">Client Secret</label>
                      <div className="relative mt-1">
                        <input className="ez-input w-full pr-10"
                          type={showSecret ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={credsForm.client_secret}
                          onChange={e => setCredsForm(p => ({ ...p, client_secret: e.target.value }))} />
                        <button type="button" onClick={() => setShowSecret(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showSecret
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                            }
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ maxWidth: 180 }}>
                    <label className="ez-label">Region</label>
                    <select className="ez-input w-full mt-1"
                      value={credsForm.dc_region} onChange={e => setCredsForm(p => ({ ...p, dc_region: e.target.value }))}>
                      <option value="IN">India (zoho.in)</option>
                      <option value="COM">Global (zoho.com)</option>
                      <option value="EU">Europe (zoho.eu)</option>
                      <option value="AU">Australia (zoho.com.au)</option>
                    </select>
                  </div>
                  <Button type="submit" variant="secondary" disabled={savingCreds}>
                    {savingCreds ? 'Saving…' : 'Save Credentials'}
                  </Button>
                </form>
              </div>

              {/* Step 2 — get auth code from Self Client console */}
              {cfg && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 16px' }}>
                  <p className="text-xs font-bold text-yellow-700 mb-1">Step 2 — Generate Authorization Code</p>
                  <p className="text-xs text-gray-600 mb-2">
                    In the Zoho API Console → Self Client → <strong>Generate Code</strong> tab, enter these scopes and click Generate:
                  </p>
                  <div style={{ background: '#1E1E1E', borderRadius: 6, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <code style={{ fontSize: 11, color: '#86EFAC', wordBreak: 'break-all', flex: 1 }}>
                      ZohoBooks.contacts.CREATE,ZohoBooks.contacts.READ,ZohoBooks.contacts.UPDATE,ZohoBooks.customerpayments.CREATE,ZohoBooks.customerpayments.READ,ZohoBooks.expenses.CREATE,ZohoBooks.expenses.READ,ZohoBooks.invoices.CREATE,ZohoBooks.invoices.READ
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('ZohoBooks.contacts.CREATE,ZohoBooks.contacts.READ,ZohoBooks.contacts.UPDATE,ZohoBooks.customerpayments.CREATE,ZohoBooks.customerpayments.READ,ZohoBooks.expenses.CREATE,ZohoBooks.expenses.READ,ZohoBooks.invoices.CREATE,ZohoBooks.invoices.READ');
                        toast.success('Scopes copied!');
                      }}
                      style={{ background: '#3D3D3D', border: 'none', borderRadius: 4, padding: '3px 8px', color: '#ccc', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Set <strong>Time Duration</strong> to <strong>10 minutes</strong>, then paste the code below immediately.</p>
                  <div className="flex gap-2 items-center">
                    <input className="ez-input flex-1" placeholder="Paste authorization code here…"
                      value={authCode} onChange={e => setAuthCode(e.target.value)} />
                    <Button variant="primary" onClick={handleExchangeCode} disabled={exchanging || !authCode.trim()}>
                      {exchanging ? 'Connecting…' : 'Connect →'}
                    </Button>
                  </div>
                  <p className="text-xs text-red-500 mt-1">⚠ The code expires in ~1 minute — paste and connect quickly.</p>
                </div>
              )}
            </div>
          )}

          {/* Connected state */}
          {cfg?.is_connected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg p-3 border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500">Zoho Org ID</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{cfg.zoho_org_id || '—'}</p>
                </div>
                <div className="rounded-lg p-3 border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500">Region</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{cfg.dc_region}</p>
                </div>
                <div className="rounded-lg p-3 border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500">Last Sync</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {toIST(cfg.last_sync_at)}
                  </p>
                </div>
              </div>

              {/* Org ID picker — shown when missing */}
              {!cfg.zoho_org_id && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px' }}>
                  <p className="text-xs font-bold text-yellow-700 mb-1">Zoho Books Org ID required</p>
                  <p className="text-xs text-gray-600 mb-3">Click "Fetch from Zoho" to auto-load your organizations, or enter the ID manually.</p>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button variant="secondary" onClick={handleFetchOrgs} disabled={loadingOrgs}>
                      {loadingOrgs ? 'Fetching…' : 'Fetch from Zoho'}
                    </Button>
                    {zohoOrgs.length > 1 && (
                      <select className="ez-input"
                        onChange={e => e.target.value && saveOrgId(e.target.value).then(() => toast.success('Org ID saved.'))}>
                        <option value="">— Select organization —</option>
                        {zohoOrgs.map(o => (
                          <option key={o.organization_id} value={o.organization_id}>{o.name} ({o.organization_id})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 items-center">
                    <input className="ez-input flex-1" placeholder="Or paste Org ID manually…"
                      value={manualOrgId} onChange={e => setManualOrgId(e.target.value)} />
                    <Button variant="primary" onClick={handleSaveOrgId} disabled={savingOrgId || !manualOrgId.trim()}>
                      {savingOrgId ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Auto-sync toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto-sync (hourly)</p>
                  <p className="text-xs text-gray-400">Automatically sync every hour in the background</p>
                </div>
                <button
                  onClick={() => toggleSync(!cfg.sync_enabled)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: cfg.sync_enabled ? '#E8967A' : '#D1D5DB',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, left: cfg.sync_enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              <div className="flex gap-3">
                <Button variant="primary" onClick={handleSync} disabled={syncing}>
                  {syncing ? 'Syncing…' : '↻ Sync Now'}
                </Button>
                <Button variant="secondary" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {/* Sync logs */}
          {logs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Sync History</h3>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                {logs.map((log, i) => (
                  <div key={log.id} style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}>
                    {/* Log row */}
                    <div className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleExpandLog(log.id)}>
                      <span style={{ fontSize: 11, color: '#6B7280', minWidth: 130 }}>{toIST(log.started_at)}</span>
                      <span style={{ fontSize: 11, color: '#6B7280', minWidth: 70, textTransform: 'capitalize' }}>{log.sync_type}</span>
                      <span style={{
                        background: log.status === 'success' ? '#D1FAE5' : log.status === 'error' ? '#FEE2E2' : '#FEF3C7',
                        color:      log.status === 'success' ? '#065F46' : log.status === 'error' ? '#991B1B' : '#92400E',
                        borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      }}>{log.status}</span>
                      <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>
                        ↑ {log.records_pushed} pushed &nbsp;·&nbsp; ↓ {log.records_pulled} pulled
                      </span>
                      <svg width="12" height="12" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"
                        style={{ transform: expandedLog === log.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Expanded detail */}
                    {expandedLog === log.id && (
                      <div style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', padding: '0 0 8px' }}>
                        {loadingDetail === log.id ? (
                          <p className="text-xs text-gray-400 px-4 py-3">Loading details…</p>
                        ) : (logDetails[log.id] || []).length === 0 ? (
                          <p className="text-xs text-gray-400 px-4 py-3">No detail records found.</p>
                        ) : (
                          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '14%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '28%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '22%' }} />
                            </colgroup>
                            <thead>
                              <tr style={{ background: '#F3F4F6' }}>
                                <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Module</th>
                                <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Direction</th>
                                <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Record</th>
                                <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Action</th>
                                <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Status</th>
                                <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(logDetails[log.id] || []).map(d => (
                                <React.Fragment key={d.id}>
                                  <tr style={{
                                    borderTop: '1px solid #F3F4F6',
                                    background: d.status === 'error' ? '#FFF5F5' : 'transparent',
                                  }}>
                                    <td className="px-3 py-1.5 capitalize" style={{ color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.module}</td>
                                    <td className="px-3 py-1.5">
                                      <span style={{
                                        background: d.direction === 'push' ? '#EFF6FF' : '#F0FDF4',
                                        color:      d.direction === 'push' ? '#1D4ED8' : '#15803D',
                                        borderRadius: 20, padding: '1px 6px', fontWeight: 700, whiteSpace: 'nowrap',
                                      }}>{d.direction === 'push' ? '↑ Push' : '↓ Pull'}</span>
                                    </td>
                                    <td className="px-3 py-1.5" title={d.zoho_id ? `Zoho ID: ${d.zoho_id}` : undefined}
                                      style={{ color: d.status === 'error' ? '#B91C1C' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: d.status === 'error' ? 600 : 400 }}>
                                      {d.record_name || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 capitalize" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>{d.action}</td>
                                    <td className="px-3 py-1.5">
                                      <span style={{
                                        background: d.status === 'success' ? '#D1FAE5' : '#FEE2E2',
                                        color:      d.status === 'success' ? '#065F46' : '#991B1B',
                                        borderRadius: 20, padding: '1px 6px', fontWeight: 700,
                                      }}>{d.status}</span>
                                    </td>
                                    <td className="px-3 py-1.5"
                                      style={{ color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {d.status !== 'error' ? (d.note || '') : ''}
                                    </td>
                                  </tr>
                                  {d.status === 'error' && d.note && (
                                    <tr style={{ background: '#FFF0F0', borderTop: '1px dashed #FECACA' }}>
                                      <td colSpan={6} className="px-3 py-1.5" style={{ color: '#B91C1C', fontSize: 11, lineHeight: 1.5 }}>
                                        <span style={{ fontWeight: 700, marginRight: 6 }}>✕ Error:</span>{d.note}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Settings;
