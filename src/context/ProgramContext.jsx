import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export const ProgramContext = createContext(null);

function normalizeProgram(p) {
  return {
    ...p,
    estimatedBudget: Number(p.estimated_budget ?? p.estimatedBudget ?? 0),
    collectedAmount: Number(p.collected_amount ?? p.collectedAmount ?? 0),
    startDate: p.start_date ?? p.startDate ?? null,
    endDate: p.end_date ?? p.endDate ?? null,
    createdAt: p.created_at ?? p.createdAt,
    updatedAt: p.updated_at ?? p.updatedAt,
    programCode: p.program_code ?? p.programCode,
    totalDeals: Number(p.total_deals ?? p.totalDeals ?? 0),
    allocationCount: Number(p.allocation_count ?? p.allocationCount ?? 0),
  };
}

export function ProgramProvider({ children }) {
  const [programs, setPrograms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrograms = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await api.get(`/programs${params}`);
      if (res.success) setPrograms(res.data.map(normalizeProgram));
      else setError(res.message || 'Failed to load programs.');
    } catch {
      setError('Network error: could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async (all = false) => {
    try {
      const res = await api.get(`/program-categories${all ? '?all=1' : ''}`);
      if (res.success) setCategories(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPrograms();
    fetchCategories();
  }, [fetchPrograms, fetchCategories]);

  const toApiPayload = (data) => ({
    title: data.title,
    description: data.description ?? null,
    estimated_budget: data.estimated_budget ?? data.estimatedBudget ?? 0,
    start_date: data.start_date ?? data.startDate ?? null,
    end_date: data.end_date ?? data.endDate ?? null,
    status: data.status ?? 'Active',
  });

  const addProgram = useCallback(async (data) => {
    const res = await api.post('/programs', toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to add program.');
    await fetchPrograms();
    return res.data;
  }, [fetchPrograms]);

  const updateProgram = useCallback(async (id, data) => {
    const res = await api.put(`/programs/${id}`, toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to update program.');
    await fetchPrograms();
    return res.data;
  }, [fetchPrograms]);

  const deleteProgram = useCallback(async (id) => {
    const res = await api.delete(`/programs/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete program.');
    setPrograms(prev => prev.filter(p => p.id !== id));
  }, []);

  const saveAllocations = useCallback(async (programId, allocations) => {
    const res = await api.put(`/programs/${programId}/allocations`, { allocations });
    if (!res.success) throw new Error(res.message || 'Failed to save allocations.');
    await fetchPrograms();
    return res.data;
  }, [fetchPrograms]);

  // Category master (admin)
  const addCategory = useCallback(async (data) => {
    const res = await api.post('/program-categories', data);
    if (!res.success) throw new Error(res.message || 'Failed to add category.');
    await fetchCategories(true);
    return res.data;
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id, data) => {
    const res = await api.put(`/program-categories/${id}`, data);
    if (!res.success) throw new Error(res.message || 'Failed to update category.');
    await fetchCategories(true);
    return res.data;
  }, [fetchCategories]);

  const toggleCategory = useCallback(async (id) => {
    const res = await api.patch(`/program-categories/${id}/toggle`, {});
    if (!res.success) throw new Error(res.message || 'Failed to toggle category.');
    await fetchCategories(true);
    return res.data;
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id) => {
    const res = await api.delete(`/program-categories/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete category.');
    await fetchCategories(true);
  }, [fetchCategories]);

  return (
    <ProgramContext.Provider value={{
      programs, categories, loading, error,
      fetchPrograms, fetchCategories,
      addProgram, updateProgram, deleteProgram,
      saveAllocations,
      addCategory, updateCategory, toggleCategory, deleteCategory,
    }}>
      {children}
    </ProgramContext.Provider>
  );
}
