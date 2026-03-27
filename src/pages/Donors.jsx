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
import { Badge } from '../components/ui/Badge';
import { ViewSwitcher } from '../components/ui/ViewSwitcher';
import { CalendarGrid } from '../components/ui/CalendarGrid';
import { DONOR_TYPES } from '../constants';
import { validateEmail, validatePhone, validatePAN, validateRequired } from '../utils/validators';

const PAGE_SIZE = 10;

const TYPE_META = {
  Individual:  { color: '#E8967A', bg: '#FDF0EB' },
  Corporate:   { color: '#7ab8e8', bg: '#EBF4FD' },
  Trust:       { color: '#8ECFCA', bg: '#E8F7F6' },
  Society:     { color: '#e8c07a', bg: '#FDF7EB' },
  Foundation:  { color: '#b07ae8', bg: '#F5EBF9' },
  Other:       { color: '#a0a0a0', bg: '#F5F5F5' },
};
const DEFAULT_TYPE_META = { color: '#E8967A', bg: '#FDF0EB' };

// ── Inline Add/Edit Form ───────────────────────────────────────────────────────
function DonorFormPanel({ initialData = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name:      initialData.name      || '',
    email:     initialData.email     || '',
    phone:     initialData.phone     || '',
    address:   initialData.address   || '',
    pan:       initialData.pan       || initialData.pan_number  || '',
    donorType: initialData.donorType || initialData.donor_type  || '',
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
    const typeV = validateRequired(form.donorType, 'Donor Type');
    if (!typeV.valid) errs.donorType = typeV.message;
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({ ...form, pan: form.pan ? form.pan.toUpperCase() : '' });
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

  const handleDragStart = (e, id) => {
    draggedId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(type);
  };
  const handleDrop = (e, type) => {
    e.preventDefault();
    setDragOverCol(null);
    if (draggedId.current !== null) {
      onMove(draggedId.current, type);
      draggedId.current = null;
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '50vh' }}>
      {DONOR_TYPES.map(type => {
        const cards = donors.filter(d => (d.donorType || d.donor_type || 'Other') === type);
        const meta = TYPE_META[type] || DEFAULT_TYPE_META;
        const isOver = dragOverCol === type;
        return (
          <div key={type}
            className="flex-shrink-0 w-52 flex flex-col rounded-xl overflow-hidden border transition-all"
            style={{ borderColor: isOver ? meta.color : '#E8E0D8', boxShadow: isOver ? `0 0 0 2px ${meta.color}44` : 'none' }}
            onDragOver={e => handleDragOver(e, type)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, type)}>
            <div className="px-3 py-2.5 flex items-center justify-between"
              style={{ backgroundColor: isOver ? meta.color + '33' : meta.bg, borderBottom: `2px solid ${meta.color}` }}>
              <p className="text-xs font-bold" style={{ color: meta.color }}>{type}</p>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: meta.color + '33', color: meta.color }}>{cards.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto transition-colors"
              style={{ minHeight: '150px', backgroundColor: isOver ? meta.color + '11' : '#FAF7F4' }}>
              {cards.map(donor => {
                const isActive = donor.isActive !== undefined ? donor.isActive : Boolean(donor.is_active);
                return (
                  <div key={donor.id}
                    draggable
                    onDragStart={e => handleDragStart(e, donor.id)}
                    onDragEnd={() => { draggedId.current = null; setDragOverCol(null); }}
                    className="bg-white rounded-lg border p-3 space-y-1.5 group cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none"
                    style={{ borderColor: '#E8E0D8' }}>
                    <div className="flex items-start justify-between gap-1">
                      <button onClick={() => onView(donor)}
                        className="text-xs font-semibold text-ez-dark leading-snug flex-1 text-left hover:underline truncate"
                        style={{ color: '#E8967A' }}>
                        {donor.name}
                      </button>
                      {canEdit && (
                        <button onClick={() => onEdit(donor)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all flex-shrink-0"
                          style={{ color: '#E8967A' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-ez-muted truncate">{donor.email || '—'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: isActive !== false ? '#E8F7F6' : '#F5F5F5', color: isActive !== false ? '#8ECFCA' : '#a0a0a0' }}>
                        {isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg text-xs text-ez-muted"
                  style={{ borderColor: isOver ? meta.color : '#E8E0D8' }}>
                  {isOver ? 'Drop here' : 'No donors'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Donors Page ───────────────────────────────────────────────────────────
export function Donors() {
  const { donors, addDonor, updateDonor, deleteDonor, loading } = useDonors();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('donors', 'can_create');
  const canEdit   = hasPermission('donors', 'can_edit');
  const canDelete = hasPermission('donors', 'can_delete');
  const toast = useToast();
  const navigate = useNavigate();

  const [view, setView]               = useState('list');
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage]               = useState(1);
  const [showForm, setShowForm]       = useState(false);
  const [editDonor, setEditDonor]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]           = useState(false);
  // optimistic overrides for DnD
  const [overrides, setOverrides]     = useState({});

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd  = (prefill = {}) => { setEditDonor(prefill); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openEdit = (d) => { setEditDonor(d); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl text-ez-dark">Donors</h1>
          <p className="text-xs text-ez-muted mt-0.5">{activeDonorCount} active donors</p>
        </div>
        {!showForm && canCreate && (
          <Button variant="primary" onClick={() => openAdd()}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>}>
            Add Donor
          </Button>
        )}
      </div>

      {showForm && (
        <DonorFormPanel initialData={editDonor || {}} onSubmit={handleSubmit} onCancel={closeForm} loading={saving} />
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email or PAN..." className="w-64" />
          <Select name="typeFilter" value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            options={DONOR_TYPES.map(t => ({ value: t, label: t }))} placeholder="All Types" className="w-36" />
          <div className="flex rounded-lg border border-cream-300 overflow-hidden text-xs">
            {[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'all', label: 'All' }].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className="px-3 py-2 font-medium transition-colors"
                style={{ backgroundColor: statusFilter === opt.value ? '#E8967A' : '#fff', color: statusFilter === opt.value ? '#1A1A1A' : '#6b6b6b' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-ez-muted">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          <div className="ml-auto"><ViewSwitcher view={view} onChange={setView} /></div>
        </div>
      </div>

      {/* Content */}
      {loading && !donors.length ? (
        <div className="text-center py-12 text-ez-muted text-sm">Loading donors...</div>
      ) : filtered.length === 0 && view === 'list' ? (
        <div className="text-center py-16 bg-white rounded-xl border border-cream-200 shadow-card">
          <div className="text-5xl mb-3">👤</div>
          <p className="font-semibold text-ez-dark">No donors found</p>
          <p className="text-ez-muted text-sm mt-1 mb-4">{donors.length === 0 ? 'Add your first donor to get started' : 'Try adjusting filters'}</p>
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
        <>
          <div className="bg-white rounded-xl border border-cream-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm ez-table">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-left">Email</th>
                    <th className="text-left">Phone</th>
                    <th className="text-left">PAN</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(donor => {
                    const isActive = donor.isActive !== undefined ? donor.isActive : Boolean(donor.is_active);
                    return (
                      <tr key={donor.id}>
                        <td>
                          <button onClick={() => navigate(`/donors/${donor.id}`)} className="font-medium hover:underline text-left" style={{ color: '#E8967A' }}>{donor.name}</button>
                        </td>
                        <td className="text-ez-muted">{donor.email || '—'}</td>
                        <td className="text-ez-muted">{donor.phone || '—'}</td>
                        <td className="font-mono text-xs text-ez-muted">{donor.pan || donor.pan_number || '—'}</td>
                        <td><Badge variant="info" size="sm">{donor.donorType || donor.donor_type || '—'}</Badge></td>
                        <td><Badge variant={isActive !== false ? 'success' : 'gray'} size="sm">{isActive !== false ? 'Active' : 'Inactive'}</Badge></td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/donors/${donor.id}`)} title="View" className="p-1.5 rounded-lg hover:bg-cream-100 text-ez-muted hover:text-ez-dark transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {canEdit && (
                              <button onClick={() => openEdit(donor)} title="Edit" className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors" style={{ color: '#E8967A' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            {canDelete && isActive !== false && (
                              <button onClick={() => setDeleteTarget(donor)} title="Deactivate" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
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
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ez-muted">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm}
        title="Deactivate Donor" message={`Deactivate "${deleteTarget?.name}"? Their donation history will be preserved.`}
        confirmText="Deactivate" variant="danger" />
    </div>
  );
}

export default Donors;
