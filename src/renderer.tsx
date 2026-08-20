import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Customers } from '@/pages/Customers';
import { Products } from '@/pages/Products';
import { Rates } from '@/pages/Rates';
import { SalesHistory } from '@/pages/SalesHistory';
import { ShopSettings } from '@/pages/ShopSettings';
import { TaxSettings } from '@/pages/TaxSettings';
import { PaymentMethods } from '@/pages/PaymentMethods';
import { Backup } from '@/pages/Backup';
import { Templates } from '@/pages/Templates';
import { AuditLog } from '@/pages/AuditLog';
import { NewBill } from '@/pages/NewBill';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (state.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-bill" element={<NewBill />} />
        <Route path="/sales-history" element={<SalesHistory />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/products" element={<Products />} />
        <Route path="/rates" element={<Rates />} />
        <Route path="/settings/shop" element={<ShopSettings />} />
        <Route path="/settings/templates" element={<Templates />} />
        <Route path="/settings/tax" element={<TaxSettings />} />
        <Route path="/settings/payments" element={<PaymentMethods />} />
        <Route path="/settings/backup" element={<Backup />} />
        <Route path="/audit" element={<AuditLog />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}