import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDonors } from '../hooks/useDonors';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ViewSwitcher } from '../components/ui/ViewSwitcher';
import { CalendarGrid } from '../components/ui/CalendarGrid';
import { DONOR_TYPES } from '../constants';
import { validateEmail, validatePhone, validatePAN, validateAadhaar, validateRequired } from '../utils/validators';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

const TYPE_META = {
  Individual:  { color: '#E8967A', bg: '#FDF0EB', textColor: '#A8452A' },
  Corporate:   { color: '#7ab8e8', bg: '#EBF4FD', textColor: '#1F6FA3' },
  Trust:       { color: '#8ECFCA', bg: '#E8F7F6', textColor: '#1E7A74' },
  Society:     { color: '#e8c07a', bg: '#FDF7EB', textColor: '#9A6B10' },
  Foundation:  { color: '#b07ae8', bg: '#F5EBF9', textColor: '#6B28B0' },
  Other:       { color: '#a0a0a0', bg: '#F5F5F5', textColor: '#555555' },
};
const DEFAULT_TYPE_META = { color: '#E8967A', bg: '#FDF0EB', textColor: '#A8452A' };

// ── Inline Add/Edit Form ───────────────────────────────────────────────────────
function DonorFormPanel({ initialData = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name:      initialData.name        || '',
    email:     initialData.email       || '',
    phone:     initialData.phone       || '',
    address:   initialData.address     || '',
    pan:       initialData.pan         || initialData.pan_number   || '',
    aadhaar:   initialData.aadhaar     || initialData.aadhaar_number || '',
    donorType: initialData.donorType   || initialData.donor_type  || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    const nameV = validateRequired(form.name, 'Name');
    if (!nameV.valid) errs.name = nameV.message;
    const emailV = validateEmail(form.email);
    if (!emailV.valid) errs.email = emailV.message;
    if (form.phone) { const phoneV = validatePhone(form.phone); if (!phoneV.valid) errs.phone = phoneV.message; }
    if (form.pan) { const panV = validatePAN(form.pan); if (!panV.valid) errs.pan = panV.message; }
    if (form.aadhaar) { const aadhaarV = validateAadhaar(form.aadhaar); if (!aadhaarV.valid) errs.aadhaar = aadhaarV.message; }
    const typeV = validateRequired(form.donorType, 'Donor Type');
    if (!typeV.valid) errs.donorType = typeV.message;
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({ ...form, pan: form.pan ? form.pan.toUpperCase() : '', aadhaar: form.aadhaar ? form.aadhaar.replace(/\s/g, '') : '' });
  };

  return (
    <div className="bg-white rounded-xl border border-cream-200 shadow-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-lg text-ez-dark">{initialData.id ? 'Edit Donor' : 'Add New Donor'}</h2>
        <button onClick={onCancel} className="text-ez-muted hover:text-ez-dark transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" name="name" value={form.name} onChange={handleChange} error={errors.name} required placeholder="Enter full name" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required placeholder="donor@example.com" />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="9876543210" />
        </div>
        <Input label="Address" name="address" value={form.address} onChange={handleChange} placeholder="Street, City, State" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="PAN Number" name="pan" value={form.pan} onChange={handleChange} error={errors.pan} placeholder="ABCDE1234F" hint="Required for 80G receipts" />
          <Input label="Aadhaar Number" name="aadhaar" value={form.aadhaar} onChange={handleChange} error={errors.aadhaar} placeholder="1234 5678 9012" hint="12-digit Aadhaar number" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Donor Type" name="donorType" value={form.donorType} onChange={handleChange} error={errors.donorType} required
            options={DONOR_TYPES.map(t => ({ value: t, label: t }))} placeholder="Select type" />
</div>
        <div className="flex gap-3 pt-2 border-t border-cream-200 sticky bottom-0 bg-white pb-1">
          <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : initialData.id ? 'Update Donor' : 'Add Donor'}</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

// ── Donor Kanban (grouped by Type, with Drag & Drop) ──────────────────────────
function DonorKanban({ donors, onEdit, onView, onMove, canEdit }) {
  const draggedId = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (type) => setCollapsed(p => ({ ...p, [type]: !p[type] }));

  const handleDragStart = (e, id) => { draggedId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, type) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(type); };
  const handleDrop = (e, type) => {
    e.preventDefault(); setDragOverCol(null);
    if (draggedId.current !== null) { onMove(draggedId.current, type); draggedId.current = null; }
  };

  return (
    <div style={{ padding: '12px 16px' }}>
    <div className="flex gap-3 pb-2" style={{ minHeight: '50vh', alignItems: 'stretch', width: '100%' }}>
      {DONOR_TYPES.map(type => {
        const cards = donors.filter(d => (d.donorType || d.donor_type || 'Other') === type);
        const meta = TYPE_META[type] || DEFAULT_TYPE_META;
        const isOver = dragOverCol === type;
        const isCollapsed = !!collapsed[type];
        return (
          <div key={type}
            className="flex flex-col rounded-xl overflow-hidden border transition-all"
            style={{ flex: '1 1 0', minWidth: isCollapsed ? 44 : 120, maxWidth: isCollapsed ? 80 : 'none',
              borderColor: isOver ? meta.color : '#E8E0D8', boxShadow: isOver ? `0 0 0 2px ${meta.color}44` : 'none',
              transition: 'max-width 0.2s ease, min-width 0.2s ease' }}
            onDragOver={e => handleDragOver(e, type)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, type)}>
            <div style={{ height: 20, backgroundColor: meta.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
              <button onClick={() => toggleCollapse(type)} title={isCollapsed ? 'Expand' : 'Collapse'}
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
                style={{ backgroundColor: meta.bg, flex: 1 }} onClick={() => toggleCollapse(type)}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: meta.textColor, color: '#fff' }}>{cards.length}</span>
                <span className="text-xs font-bold"
                  style={{ color: meta.textColor, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>{type}</span>
              </div>
            ) : (
              <>
                <div className="px-3 pt-2 pb-2"
                  style={{ backgroundColor: isOver ? meta.color + '18' : meta.bg, borderBottom: `1px solid ${meta.color}55` }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-wide flex-1" style={{ color: meta.textColor }}>{type}</span>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: meta.textColor, color: '#fff' }}>{cards.length}</span>
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto transition-colors"
                  style={{ minHeight: '150px', backgroundColor: isOver ? meta.color + '11' : '#FAF7F4' }}>
                  {cards.map(donor => {
                    const isActive = donor.isActive !== undefined ? donor.isActive : Boolean(donor.is_active);
                    return (
                      <div key={donor.id} draggable
                        onDragStart={e => handleDragStart(e, donor.id)}
                        onDragEnd={() => { draggedId.current = null; setDragOverCol(null); }}
                        className="bg-white rounded-lg border p-3 space-y-1.5 group cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none"
                        style={{ borderColor: '#E8E0D8' }}>
                        <div className="flex items-start justify-between gap-1">
                          <button onClick={() => onView(donor)} className="text-xs font-semibold leading-snug flex-1 text-left hover:underline truncate" style={{ color: '#E8967A' }}>{donor.name}</button>
                          {canEdit && (
                            <button onClick={() => onEdit(donor)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all flex-shrink-0" style={{ color: '#E8967A' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-ez-muted truncate">{donor.email || '—'}</p>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: isActive !== false ? '#E8F7F6' : '#F5F5F5', color: isActive !== false ? '#8ECFCA' : '#a0a0a0' }}>
                          {isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg text-xs text-ez-muted" style={{ borderColor: isOver ? meta.color : '#E8E0D8' }}>
                      {isOver ? 'Drop here' : 'No donors'}
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

// ── Main Donors Page ───────────────────────────────────────────────────────────
export function Donors() {
  const { donors, addDonor, updateDonor, deleteDonor, loading } = useDonors();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('donors', 'can_create');
  const [addHovered, setAddHovered] = useState(false);
  const canEdit   = hasPermission('donors', 'can_edit');
  const canDelete = hasPermission('donors', 'can_delete');
  const toast = useToast();
  const navigate = useNavigate();

  const [view, setView]               = useState('list');
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [showForm, setShowForm]       = useState(false);
  const [editDonor, setEditDonor]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]           = useState(false);
  // optimistic overrides for DnD
  const [overrides, setOverrides]     = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const displayDonors = useMemo(() =>
    donors.map(d => overrides[d.id] ? { ...d, ...overrides[d.id] } : d),
    [donors, overrides]
  );

  const filtered = useMemo(() => {
    return displayDonors.filter(d => {
      const pan       = d.pan || d.pan_number || '';
      const donorType = d.donorType || d.donor_type || '';
      const isActive  = d.isActive !== undefined ? d.isActive : Boolean(d.is_active);
      const matchSearch = !search ||
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
        pan.toLowerCase().includes(search.toLowerCase());
      const matchType   = !typeFilter || donorType === typeFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && isActive !== false) ||
        (statusFilter === 'inactive' && isActive === false);
      return matchSearch && matchType && matchStatus;
    });
  }, [displayDonors, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd  = (prefill = {}) => { setEditDonor(prefill); setShowForm(true); };
  const openEdit = (d) => { setEditDonor(d); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditDonor(null); };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editDonor?.id) { await updateDonor(editDonor.id, data); toast.success('Donor updated'); }
      else { await addDonor(data); toast.success('Donor added'); }
      closeForm();
    } catch (err) { toast.error(err.message || 'Failed to save donor'); }
    finally { setSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteDonor(deleteTarget.id); toast.success('Donor deactivated'); }
    catch (err) { toast.error(err.message || 'Failed to deactivate donor'); }
    setDeleteTarget(null);
  };

  // Drag & drop: move donor to a different type column
  const handleMove = async (id, newType) => {
    const donor = donors.find(d => d.id === id);
    if (!donor || (donor.donorType || donor.donor_type) === newType) return;
    setOverrides(p => ({ ...p, [id]: { donorType: newType, donor_type: newType } }));
    try {
      await updateDonor(id, { ...donor, donorType: newType, donor_type: newType });
      toast.success(`Moved to ${newType}`);
    } catch {
      toast.error('Failed to update donor type');
    } finally {
      setOverrides(p => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  // Calendar: click "+" on a day → open add form (no date field for donors, just open form)
  const handleDayClick = () => openAdd();

  const activeDonorCount = donors.filter(d => d.isActive !== undefined ? d.isActive : Boolean(d.is_active)).length;

  return (
    <div style={{ background: '#E8E2DB', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>


      {/* ── Add / Edit Form ─────────────────────────────────────── */}
      <Modal isOpen={showForm} onClose={closeForm} title={editDonor?.id ? 'Edit Donor' : 'Add New Donor'} size="lg">
        <DonorFormPanel initialData={editDonor || {}} onSubmit={handleSubmit} onCancel={closeForm} loading={saving} />
      </Modal>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div onClick={() => setFiltersOpen(v => !v)} style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="13" height="13" fill="none" stroke="#aaa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" /></svg>
          <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          <svg width="14" height="14" fill="none" stroke="#aaa" viewBox="0 0 24 24" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {filtersOpen && <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email or PAN..." className="w-64" />
          <Select name="typeFilter" value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            options={DONOR_TYPES.map(t => ({ value: t, label: t }))} placeholder="All Types" className="w-36" />
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #D8D0C8', fontSize: 12 }}>
            {[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'all', label: 'All' }].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                style={{ padding: '7px 14px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: statusFilter === opt.value ? '#E8967A' : '#F7F4F1', color: statusFilter === opt.value ? '#fff' : '#555' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: '#999', background: '#F0EDE9', borderRadius: 20, padding: '4px 10px', fontWeight: 600 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.09)' }}>
        <div style={{ background: '#2D2D2D', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" fill="none" stroke="#aaa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
            <span style={{ color: '#aaa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Donor List</span>
            <span style={{ color: '#666', fontSize: 11, background: '#3D3D3D', borderRadius: 12, padding: '2px 10px' }}>{filtered.length} total</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canCreate && (
              <button onClick={() => openAdd()} onMouseEnter={() => setAddHovered(true)} onMouseLeave={() => setAddHovered(false)}
                title="Add Donor"
                style={{ background: '#E8967A', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {addHovered && <span style={{ whiteSpace: 'nowrap' }}>Add</span>}
              </button>
            )}
            <ViewSwitcher view={view} onChange={setView} />
          </div>
        </div>
        {loading && !donors.length ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#999', fontSize: 14 }}>
            Loading donors…
          </div>
        ) : filtered.length === 0 && view === 'list' ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <p style={{ fontWeight: 600, color: '#1A1A1A', margin: '0 0 6px' }}>No donors found</p>
            <p style={{ color: '#999', fontSize: 13, margin: '0 0 20px' }}>{donors.length === 0 ? 'Add your first donor to get started' : 'Try adjusting filters'}</p>
            {donors.length === 0 && !showForm && canCreate && <Button variant="primary" onClick={() => openAdd()}>Add First Donor</Button>}
          </div>
        ) : view === 'kanban' ? (
          <DonorKanban donors={filtered} onEdit={openEdit} onView={d => navigate(`/donors/${d.id}`)} onMove={canEdit ? handleMove : () => {}} canEdit={canEdit} />
        ) : view === 'calendar' ? (
          <CalendarGrid
            items={filtered}
            getDate={d => d.createdAt ? String(d.createdAt).slice(0, 10) : null}
            renderDot={d => { const meta = TYPE_META[d.donorType || d.donor_type] || DEFAULT_TYPE_META; return { label: d.name, color: meta.color, bg: meta.bg }; }}
            onItemClick={d => navigate(`/donors/${d.id}`)}
            onDayClick={handleDayClick}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F7F4F1', borderBottom: '2px solid #E8E0D8' }}>
                    {['Name', 'Email', 'Phone', 'PAN', 'Type', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: i === 6 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((donor, idx) => {
                    const isActive = donor.isActive !== undefined ? donor.isActive : Boolean(donor.is_active);
                    return (
                      <tr key={donor.id}
                        style={{ background: idx % 2 === 0 ? '#fff' : '#FDFAF8', borderBottom: '1px solid #F0EDE9', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FDF0EB'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#FDFAF8'}>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => navigate(`/donors/${donor.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#E8967A', fontSize: 13, padding: 0 }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                            {donor.name}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>{donor.email || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>{donor.phone || '—'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#888' }}>{donor.pan || donor.pan_number || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><Badge variant="info" size="sm">{donor.donorType || donor.donor_type || '—'}</Badge></td>
                        <td style={{ padding: '12px 16px' }}><Badge variant={isActive !== false ? 'success' : 'gray'} size="sm">{isActive !== false ? 'Active' : 'Inactive'}</Badge></td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <button onClick={() => navigate(`/donors/${donor.id}`)} title="View"
                              style={{ padding: '5px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#999' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#F0EDE9'; e.currentTarget.style.color = '#555'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999'; }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {canEdit && (
                              <button onClick={() => openEdit(donor)} title="Edit"
                                style={{ padding: '5px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#E8967A' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FDF0EB'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            {canDelete && isActive !== false && (
                              <button onClick={() => setDeleteTarget(donor)} title="Deactivate"
                                style={{ padding: '5px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#f87171' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
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
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm}
        title="Deactivate Donor" message={`Deactivate "${deleteTarget?.name}"? Their donation history will be preserved.`}
        confirmText="Deactivate" variant="danger" />
    </div>
  );
}

export default Donors;
