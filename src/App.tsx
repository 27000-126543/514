import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Layout } from './components/Layout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Zones } from './pages/Zones.js';
import { FryRelease } from './pages/FryRelease.js';
import { WaterQuality } from './pages/WaterQuality.js';
import { Warnings } from './pages/Warnings.js';
import { Feeding } from './pages/Feeding.js';
import { Harvest } from './pages/Harvest.js';
import { Traceability } from './pages/Traceability.js';
import { Finance } from './pages/Finance.js';
import { Messages } from './pages/Messages.js';
import { Users } from './pages/Users.js';
import { Settings } from './pages/Settings.js';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={
            <ProtectedRoute requiredRoles={['admin', 'farmer', 'technician', 'finance']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="zones" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <Zones />
            </ProtectedRoute>
          } />
          
          <Route path="fry-release" element={
            <ProtectedRoute requiredRoles={['admin', 'farmer']}>
              <FryRelease />
            </ProtectedRoute>
          } />
          
          <Route path="water-quality" element={
            <ProtectedRoute requiredRoles={['admin', 'technician']}>
              <WaterQuality />
            </ProtectedRoute>
          } />
          
          <Route path="warnings" element={
            <ProtectedRoute requiredRoles={['admin', 'technician', 'farmer']}>
              <Warnings />
            </ProtectedRoute>
          } />
          
          <Route path="feeding" element={
            <ProtectedRoute requiredRoles={['admin', 'farmer']}>
              <Feeding />
            </ProtectedRoute>
          } />
          
          <Route path="harvest" element={
            <ProtectedRoute requiredRoles={['admin', 'farmer']}>
              <Harvest />
            </ProtectedRoute>
          } />
          
          <Route path="traceability" element={
            <ProtectedRoute requiredRoles={['admin', 'farmer']}>
              <Traceability />
            </ProtectedRoute>
          } />
          
          <Route path="finance" element={
            <ProtectedRoute requiredRoles={['admin', 'finance']}>
              <Finance />
            </ProtectedRoute>
          } />
          
          <Route path="messages" element={
            <ProtectedRoute requiredRoles={['admin', 'farmer', 'technician', 'finance']}>
              <Messages />
            </ProtectedRoute>
          } />
          
          <Route path="users" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          } />
          
          <Route path="settings" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
