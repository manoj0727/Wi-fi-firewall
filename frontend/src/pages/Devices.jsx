import { useState, useEffect } from 'react';
import { Smartphone, Laptop, Tablet, Tv, Router, Activity, Shield, Globe, Wifi, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { getSocket } from '../hooks/useSocket';

function Devices() {
  const [devices, setDevices] = useState([]);
  const [activeDevices, setActiveDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [newName, setNewName] = useState('');
  const socket = getSocket();

  useEffect(() => {
    fetchDevices();
    fetchNetworkInfo();
    const interval = setInterval(fetchDevices, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('device-activity', (data) => {
        updateDeviceActivity(data);
      });

      return () => {
        socket.off('device-activity');
      };
    }
  }, [socket]);

  const fetchDevices = async () => {
    try {
      const [allDevices, active] = await Promise.all([
        api.get('/devices'),
        api.get('/devices/active')
      ]);
      setDevices(allDevices.data);
      setActiveDevices(active.data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const response = await api.get('/network');
      setNetworkInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch network info:', error);
    }
  };

  const updateDeviceActivity = (data) => {
    setDevices(prev => prev.map(device =>
      device.ip === data.device.ip
        ? { ...device, ...data.stats, lastSeen: new Date() }
        : device
    ));
  };

  const getDeviceIcon = (device) => {
    const name = device.deviceName?.toLowerCase() || '';
    if (name.includes('phone') || name.includes('mobile')) return Smartphone;
    if (name.includes('laptop') || name.includes('macbook')) return Laptop;
    if (name.includes('tablet') || name.includes('ipad')) return Tablet;
    if (name.includes('tv') || name.includes('chromecast')) return Tv;
    if (name.includes('router') || name.includes('gateway')) return Router;
    return Wifi;
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = (now - d) / 1000; // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return d.toLocaleDateString();
  };

  const handleSaveName = async (ip) => {
    try {
      await api.put(`/devices/${ip}/name`, { name: newName });
      setDevices(prev => prev.map(d =>
        d.ip === ip ? { ...d, deviceName: newName } : d
      ));
      setEditingName(null);
      setNewName('');
    } catch (error) {
      console.error('Failed to update device name:', error);
    }
  };

  const viewDeviceDetails = async (ip) => {
    try {
      const response = await api.get(`/devices/${ip}`);
      setSelectedDevice(response.data);
    } catch (error) {
      console.error('Failed to fetch device details:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Connected Devices</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Active: {activeDevices.length} / Total: {devices.length}
          </span>
        </div>
      </div>

      {/* Network Info Card */}
      {networkInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            DNS Server Configuration
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>DNS Server: <span className="font-mono font-bold">{networkInfo.dnsServer}</span></p>
            <p className="mt-2">To block websites on your devices:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>Mobile:</strong> Go to WiFi settings → Modify network → Set DNS to {networkInfo.interfaces[0]?.ip}</li>
              <li><strong>Router:</strong> Access router settings → Set primary DNS to {networkInfo.interfaces[0]?.ip}</li>
              <li><strong>Computer:</strong> Network settings → DNS → Add {networkInfo.interfaces[0]?.ip}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Active Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const Icon = getDeviceIcon(device);
          const isActive = device.status === 'active';
          const blockRate = device.totalQueries > 0
            ? ((device.blockedQueries / device.totalQueries) * 100).toFixed(1)
            : 0;

          return (
            <div
              key={device.ip}
              className={`bg-white rounded-lg shadow p-4 border-2 transition-all ${
                isActive ? 'border-green-200 hover:shadow-lg' : 'border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Icon className={`h-6 w-6 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    {editingName === device.ip ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                          placeholder={device.deviceName}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveName(device.ip)}
                          className="text-green-600 hover:text-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(null);
                            setNewName('');
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h3
                          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingName(device.ip);
                            setNewName(device.deviceName);
                          }}
                        >
                          {device.deviceName}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">{device.ip}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Activity className={`h-4 w-4 ${isActive ? 'text-green-500 animate-pulse' : 'text-gray-300'}`} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Queries:</span>
                  <span className="font-medium">{device.totalQueries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blocked:</span>
                  <span className="font-medium text-red-600">{device.blockedQueries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Block Rate:</span>
                  <span className={`font-medium ${blockRate > 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {blockRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Seen:</span>
                  <span className="text-xs">{formatTime(device.lastSeen)}</span>
                </div>
              </div>

              {device.recentDomains && device.recentDomains.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600 mb-1">Recent Activity:</p>
                  <div className="space-y-1">
                    {device.recentDomains.slice(0, 3).map((activity, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1 text-gray-700">{activity.domain}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded ${
                          activity.action === 'blocked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {activity.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => viewDeviceDetails(device.ip)}
                className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-700"
              >
                View Details →
              </button>
            </div>
          );
        })}
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedDevice.deviceName}</h2>
                <p className="text-sm text-gray-600">{selectedDevice.ip}</p>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">First Seen</p>
                <p className="font-medium">{formatTime(selectedDevice.firstSeen)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Last Activity</p>
                <p className="font-medium">{formatTime(selectedDevice.lastSeen)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Queries</p>
                <p className="font-medium">{selectedDevice.totalQueries}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Block Rate</p>
                <p className="font-medium">{selectedDevice.blockRate}%</p>
              </div>
            </div>

            {selectedDevice.recentDomains && selectedDevice.recentDomains.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Recent Activity</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedDevice.recentDomains.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{activity.domain}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(activity.timestamp)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          activity.action === 'blocked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {activity.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {devices.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Devices Detected</h3>
          <p className="text-gray-600">
            Devices will appear here when they connect and use this DNS server.
          </p>
        </div>
      )}
    </div>
  );
}

export default Devices;