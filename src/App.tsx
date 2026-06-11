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
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="zones" element={<Zones />} />
          
          <Route path="fry-release" element={<FryRelease />} />
          
          <Route path="water-quality" element={<WaterQuality />} />
          
          <Route path="warnings" element={<Warnings />} />
          
          <Route path="feeding" element={<Feeding />} />
          
          <Route path="harvest" element={<Harvest />} />
          
          <Route path="traceability" element={<Traceability />} />
          
          <Route path="finance" element={<Finance />} />
          
          <Route path="messages" element={<Messages />} />
          
          <Route path="users" element={<Users />} />
          
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
