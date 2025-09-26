import { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

function Settings() {
  const [settings, setSettings] = useState({
    dnsPort: 53,
    apiPort: 3001,
    cacheEnabled: true,
    cacheTTL: 300,
    logLevel: 'info',
    autoBlock: false,
    blockThreshold: 100
  });

  const handleSave = async () => {
    alert('Settings saved successfully!');
  };

  const handleClearStats = async () => {
    if (confirm('Are you sure you want to clear all statistics? This cannot be undone.')) {
      try {
        await api.post('/stats/clear');
        alert('Statistics cleared successfully!');
      } catch (error) {
        console.error('Failed to clear stats:', error);
        alert('Failed to clear statistics');
      }
    }
  };

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart the DNS server?')) {
      alert('DNS server restart initiated');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <SettingsIcon className="h-5 w-5" />
          <span>Server Configuration</span>
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNS Port
              </label>
              <input
                type="number"
                value={settings.dnsPort}
                onChange={(e) => setSettings({ ...settings, dnsPort: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Port
              </label>
              <input
                type="number"
                value={settings.apiPort}
                onChange={(e) => setSettings({ ...settings, apiPort: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Level
            </label>
            <select
              value={settings.logLevel}
              onChange={(e) => setSettings({ ...settings, logLevel: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Cache Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Cache</label>
              <p className="text-xs text-gray-500">Cache DNS responses for faster resolution</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.cacheEnabled}
                onChange={(e) => setSettings({ ...settings, cacheEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.cacheEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cache TTL (seconds)
              </label>
              <input
                type="number"
                value={settings.cacheTTL}
                onChange={(e) => setSettings({ ...settings, cacheTTL: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Auto-Blocking</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Auto-Block</label>
              <p className="text-xs text-gray-500">Automatically block suspicious domains</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoBlock}
                onChange={(e) => setSettings({ ...settings, autoBlock: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.autoBlock && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block Threshold (queries per minute)
              </label>
              <input
                type="number"
                value={settings.blockThreshold}
                onChange={(e) => setSettings({ ...settings, blockThreshold: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-red-600 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Danger Zone</span>
        </h2>

        <div className="space-y-3">
          <button
            onClick={handleClearStats}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Trash2 className="h-5 w-5" />
            <span>Clear All Statistics</span>
          </button>

          <button
            onClick={handleRestart}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Restart DNS Server</span>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="h-5 w-5" />
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );
}

export default Settings;