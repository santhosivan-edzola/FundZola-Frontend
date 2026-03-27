import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export const ExpenseContext = createContext(null);

/** Normalize DB snake_case columns to the camelCase shape the components expect */
function normalizeExpense(e) {
  return {
    ...e,
    donationId: e.donation_id ?? e.donationId,
    fundCategory: e.fund_category ?? e.fundCategory,
    invoiceNumber: e.invoice_number ?? e.invoiceNumber,
    paymentMode: e.payment_mode ?? e.paymentMode,
    approvedBy: e.approved_by ?? e.approvedBy,
    receiptNumber: e.receipt_number ?? e.receiptNumber,
    date: e.expense_date ?? e.date,
    createdAt: e.created_at ?? e.createdAt,
    updatedAt: e.updated_at ?? e.updatedAt,
  };
}

export function ExpenseProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/expenses');
      if (res.success) {
        setExpenses(res.data.map(normalizeExpense));
      } else {
        setError(res.message || 'Failed to load expenses.');
      }
    } catch (err) {
      setError('Network error: could not reach the server.');
      console.error('[ExpenseContext] fetchExpenses error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load expenses on mount
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  /** Map camelCase form fields → snake_case API fields */
  const toApiPayload = (data) => ({
    donation_id:    data.donation_id    ?? data.donationId    ?? null,
    fund_category:  data.fund_category  ?? data.fundCategory,
    description:    data.description,
    amount:         data.amount,
    expense_date:   data.expense_date   ?? data.date,
    category:       data.category,
    vendor:         data.vendor         ?? null,
    invoice_number: data.invoice_number ?? data.invoiceNumber ?? null,
    payment_mode:   data.payment_mode   ?? data.paymentMode   ?? null,
    approved_by:    data.approved_by    ?? data.approvedBy    ?? null,
    notes:          data.notes          ?? null,
  });

  const addExpense = useCallback(async (data) => {
    const res = await api.post('/expenses', toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to add expense.');
    await fetchExpenses();
    return res.data;
  }, [fetchExpenses]);

  const updateExpense = useCallback(async (id, data) => {
    const res = await api.put(`/expenses/${id}`, toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to update expense.');
    await fetchExpenses();
    return res.data;
  }, [fetchExpenses]);

  const deleteExpense = useCallback(async (id) => {
    const res = await api.delete(`/expenses/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete expense.');
    await fetchExpenses();
  }, [fetchExpenses]);

  const getExpensesByFund = useCallback((fundCategory) => {
    return expenses.filter(
      (e) => e.fund_category === fundCategory || e.fundCategory === fundCategory
    );
  }, [expenses]);

  const getExpensesByDonation = useCallback((donationId) => {
    return expenses.filter(
      (e) => e.donation_id === donationId || e.donationId === donationId
    );
  }, [expenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        loading,
        error,
        addExpense,
        updateExpense,
        deleteExpense,
        getExpensesByFund,
        getExpensesByDonation,
        fetchExpenses,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}
