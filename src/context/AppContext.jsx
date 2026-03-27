import { OrgProvider } from './OrgContext';
import { DonorProvider } from './DonorContext';
import { DonationProvider } from './DonationContext';
import { ExpenseProvider } from './ExpenseContext';
import { DealProvider } from './DealContext';
import { ProgramProvider } from './ProgramContext';
import { useAuth } from './AuthContext';

function DataProviders({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return children;
  return (
    <OrgProvider>
      <ProgramProvider>
        <DonorProvider>
          <DealProvider>
            <DonationProvider>
              <ExpenseProvider>
                {children}
              </ExpenseProvider>
            </DonationProvider>
          </DealProvider>
        </DonorProvider>
      </ProgramProvider>
    </OrgProvider>
  );
}

export function AppProviders({ children }) {
  return <DataProviders>{children}</DataProviders>;
}
