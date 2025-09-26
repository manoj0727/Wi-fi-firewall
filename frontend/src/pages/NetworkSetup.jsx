import { useState, useEffect } from 'react';
import { Wifi, Shield, Router, Smartphone, CheckCircle, AlertCircle, Copy, ArrowRight } from 'lucide-react';
import api from '../utils/api';

function NetworkSetup() {
  const [networkConfig, setNetworkConfig] = useState(null);
  const [setupMode, setSetupMode] = useState('auto'); // 'auto' or 'manual'
  const [networkName, setNetworkName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [enforcement, setEnforcement] = useState(false);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetchNetworkStatus();
  }, []);

  const fetchNetworkStatus = async () => {
    try {
      const [status, config] = await Promise.all([
        api.get('/network/status'),
        api.get('/network/config')
      ]);

      setNetworkConfig(config.data);
      setIsRegistered(status.data.registered);
      setEnforcement(status.data.enforcing);
      setInstructions(status.data.instructions);
    } catch (error) {
      console.error('Failed to fetch network status:', error);
    }
  };

  const registerNetwork = async () => {
    if (!networkName) {
      alert('Please enter a network name');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/network/register', {
        networkName,
        autoEnforce: setupMode === 'auto'
      });

      setIsRegistered(true);
      setInstructions(response.data.instructions);

      if (setupMode === 'auto') {
        await enableEnforcement();
      }
    } catch (error) {
      console.error('Failed to register network:', error);
      alert('Failed to register network. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const enableEnforcement = async () => {
    setLoading(true);
    try {
      await api.post('/network/enforce');
      setEnforcement(true);
      alert('DNS enforcement enabled! All devices on your network will now use this DNS server.');
    } catch (error) {
      console.error('Failed to enable enforcement:', error);
      alert('Failed to enable automatic enforcement. You may need administrator privileges.');
    } finally {
      setLoading(false);
    }
  };

  const disableEnforcement = async () => {
    setLoading(true);
    try {
      await api.post('/network/disable-enforcement');
      setEnforcement(false);
      alert('DNS enforcement disabled.');
    } catch (error) {
      console.error('Failed to disable enforcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  if (!networkConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading network configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Network Setup & Configuration</h1>

        {!isRegistered ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Setup Your WiFi Firewall
              </h3>
              <p className="text-blue-800">
                Register your network to automatically block websites for all connected devices.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Network Name
                </label>
                <input
                  type="text"
                  value={networkName}
                  onChange={(e) => setNetworkName(e.target.value)}
                  placeholder="Enter your WiFi network name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setup Mode
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSetupMode('auto')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      setupMode === 'auto'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Shield className="h-6 w-6 mb-2 mx-auto text-blue-600" />
                    <h4 className="font-medium">Automatic</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Automatically enforce DNS for all devices (requires admin)
                    </p>
                  </button>

                  <button
                    onClick={() => setSetupMode('manual')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      setupMode === 'manual'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="h-6 w-6 mb-2 mx-auto text-blue-600" />
                    <h4 className="font-medium">Manual</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Get instructions to configure devices manually
                    </p>
                  </button>
                </div>
              </div>

              <button
                onClick={registerNetwork}
                disabled={loading || !networkName}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Register Network
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Network Registered Successfully
              </h3>
              <p className="text-green-800">
                Your network is configured to use the WiFi Firewall DNS server.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">DNS Server Information</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Primary DNS:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {networkConfig.dnsServerIP}
                    </code>
                    <button
                      onClick={() => copyToClipboard(networkConfig.dnsServerIP)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Port:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">53</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    enforcement
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {enforcement ? 'Enforcing' : 'Manual Configuration'}
                  </span>
                </div>
              </div>
            </div>

            {!enforcement && (
              <button
                onClick={enableEnforcement}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Enable Automatic Enforcement
              </button>
            )}

            {enforcement && (
              <button
                onClick={disableEnforcement}
                disabled={loading}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Disable Enforcement
              </button>
            )}

            {instructions && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Configuration Instructions</h3>

                {instructions.automatic && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Router className="h-5 w-5 mr-2" />
                      Router Configuration (Recommended)
                    </h4>
                    <ol className="space-y-2 text-sm">
                      {instructions.automatic.router.steps.map((step, idx) => (
                        <li key={idx} className="flex">
                          <span className="text-gray-500 mr-2">{idx + 1}.</span>
                          <span className="text-gray-700">{step.replace(`${networkConfig.dnsServerIP}`,
                            <code className="bg-gray-100 px-1 rounded">{networkConfig.dnsServerIP}</code>)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Manual Device Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(instructions.manual || {}).map(([platform, steps]) => (
                      platform !== 'title' && (
                        <div key={platform} className="space-y-2">
                          <h5 className="font-medium text-gray-700 capitalize">{platform}</h5>
                          <ol className="space-y-1 text-xs text-gray-600">
                            {steps.map((step, idx) => (
                              <li key={idx}>{idx + 1}. {step}</li>
                            ))}
                          </ol>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Important Notes
        </h3>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• Automatic enforcement requires administrator/root privileges</li>
          <li>• Changes may require restarting your router or network devices</li>
          <li>• Some devices may cache DNS settings and need to be restarted</li>
          <li>• Make sure this server remains running for DNS filtering to work</li>
        </ul>
      </div>
    </div>
  );
}

export default NetworkSetup;