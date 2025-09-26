import { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Database, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/api';

function Privacy() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/privacy/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
    }
  };

  const updatePrivacyMode = async (mode) => {
    setLoading(true);
    try {
      const response = await api.put('/privacy/settings', { mode });
      setSettings(response.data.settings);
      setMessage(`Privacy mode updated to ${mode}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update privacy mode:', error);
      setMessage('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const clearPrivateData = async () => {
    if (!confirm('Are you sure you want to clear all private data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/privacy/clear');
      setMessage('All private data has been cleared');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to clear private data:', error);
      setMessage('Failed to clear private data');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  const privacyModes = [
    {
      mode: 'strict',
      title: 'Maximum Privacy',
      description: 'IP anonymization, domain hashing, 1-day retention',
      icon: <EyeOff className="h-6 w-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      mode: 'enhanced',
      title: 'Enhanced Privacy',
      description: 'IP anonymization, clear domains, 7-day retention',
      icon: <Shield className="h-6 w-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      mode: 'basic',
      title: 'Basic Privacy',
      description: 'IP anonymization, clear domains, 30-day retention',
      icon: <Eye className="h-6 w-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      mode: 'off',
      title: 'Privacy Off',
      description: 'Full logging, no anonymization, 90-day retention',
      icon: <Database className="h-6 w-6" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Lock className="h-6 w-6 mr-2" />
          Privacy Settings
        </h1>

        {message && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800">{message}</span>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {privacyModes.map((pm) => (
              <button
                key={pm.mode}
                onClick={() => updatePrivacyMode(pm.mode)}
                disabled={loading}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.mode === pm.mode
                    ? `${pm.borderColor} ${pm.bgColor}`
                    : 'border-gray-200 hover:border-gray-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start">
                  <div className={`${pm.color} mr-3`}>
                    {pm.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-gray-900">{pm.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{pm.description}</p>
                    {settings.mode === pm.mode && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">IP Anonymization</p>
              <p className="font-medium">
                {settings.ipAnonymization ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-red-600">Disabled</span>
                )}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Domain Hashing</p>
              <p className="font-medium">
                {settings.domainHashing ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-red-600">Disabled</span>
                )}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Data Retention</p>
              <p className="font-medium">{settings.dataRetention} days</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Encryption</p>
              <p className="font-medium">
                {settings.encryptionEnabled ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900 mb-2 flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Clear Private Data
              </h3>
              <p className="text-sm text-red-800 mb-4">
                This will permanently delete all stored query history, device information, and statistics.
              </p>
              <button
                onClick={clearPrivateData}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All Private Data
              </button>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy Features</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <strong>IP Anonymization:</strong> Masks the last part of IP addresses in logs
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <strong>Domain Hashing:</strong> Stores domain names as one-way hashes (strict mode)
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <strong>Auto Data Cleanup:</strong> Automatically removes old data based on retention settings
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <strong>Local Processing:</strong> All DNS filtering happens locally on your network
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <strong>No External Tracking:</strong> No data is sent to external servers
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Privacy Notice
        </h3>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• All DNS queries are processed locally on your network</li>
          <li>• No personal data is transmitted to external servers</li>
          <li>• Device information is only used for network management</li>
          <li>• You can clear all data at any time</li>
        </ul>
      </div>
    </div>
  );
}

export default Privacy;