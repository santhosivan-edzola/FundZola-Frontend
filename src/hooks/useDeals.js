import { useContext } from 'react';
import { DealContext } from '../context/DealContext';

export function useDeals() {
  const context = useContext(DealContext);
  if (!context) throw new Error('useDeals must be used within a DealProvider');
  return context;
}

export default useDeals;
