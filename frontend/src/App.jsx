import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import BlockedSites from './pages/BlockedSites';
import History from './pages/History';
import Settings from './pages/Settings';
import Devices from './pages/Devices';
import NetworkSetup from './pages/NetworkSetup';
import Privacy from './pages/Privacy';
import { useSocketConnection } from './hooks/useSocket';

const queryClient = new QueryClient();

function AppContent() {
  useSocketConnection();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="rules" element={<Rules />} />
        <Route path="devices" element={<Devices />} />
        <Route path="blocked" element={<BlockedSites />} />
        <Route path="history" element={<History />} />
        <Route path="network" element={<NetworkSetup />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;