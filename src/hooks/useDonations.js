import { useContext } from 'react';
import { DonationContext } from '../context/DonationContext';

export function useDonations() {
  const context = useContext(DonationContext);
  if (!context) {
    throw new Error('useDonations must be used within a DonationProvider');
  }
  return context;
}

export default useDonations;
