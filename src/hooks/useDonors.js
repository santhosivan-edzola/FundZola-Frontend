import { useContext } from 'react';
import { DonorContext } from '../context/DonorContext';

export function useDonors() {
  const context = useContext(DonorContext);
  if (!context) {
    throw new Error('useDonors must be used within a DonorProvider');
  }
  return context;
}

export default useDonors;
