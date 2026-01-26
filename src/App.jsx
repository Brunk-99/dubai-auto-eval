import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { RequireAuth, RequireAdmin } from './components/RoleGuard';
import AccessGate from './pages/AccessGate';
import Dashboard from './pages/Dashboard';
import VehicleDetails from './pages/VehicleDetails';
import VehicleForm from './pages/VehicleForm';
import Settings from './pages/Settings';
import QuickCalc from './pages/QuickCalc';
import CurrencyConverter from './pages/CurrencyConverter';
import DesignTest from './pages/DesignTest';
import { isAuthenticated } from './lib/auth';
import { migrateVehicles } from './lib/storage';
import { getExchangeRate } from './lib/exchangeRate';

function App() {
  // useLocation forces re-render on navigation
  const location = useLocation();
  const authed = isAuthenticated();

  // Run migration and fetch exchange rate on app start
  useEffect(() => {
    migrateVehicles();
    // Pre-fetch exchange rate so it's cached for calculations
    getExchangeRate();
  }, []);

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/"
        element={
          authed ? <Navigate to="/dashboard" replace /> : <AccessGate />
        }
      />

      {/* Protected routes - All users */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/vehicle/:id"
        element={
          <RequireAuth>
            <VehicleDetails />
          </RequireAuth>
        }
      />

      {/* Protected routes - Admin only */}
      <Route
        path="/vehicle/new"
        element={
          <RequireAuth>
            <RequireAdmin>
              <VehicleForm />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/vehicle/:id/edit"
        element={
          <RequireAuth>
            <RequireAdmin>
              <VehicleForm />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/settings"
        element={
          <RequireAuth>
            <RequireAdmin>
              <Settings />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/quick-calc"
        element={
          <RequireAuth>
            <RequireAdmin>
              <QuickCalc />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/currency"
        element={
          <RequireAuth>
            <RequireAdmin>
              <CurrencyConverter />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/design-test"
        element={
          <RequireAuth>
            <RequireAdmin>
              <DesignTest />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
