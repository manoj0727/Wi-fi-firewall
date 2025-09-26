import { useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Ban, CheckCircle, Monitor, TrendingUp, TrendingDown } from 'lucide-react';
import useStore from '../store/useStore';
import api from '../utils/api';

function Dashboard() {
  const stats = useStore(state => state.stats);
  const queryHistory = useStore(state => state.queryHistory);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/stats');
        useStore.getState().setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  const pieData = [
    { name: 'Blocked', value: stats.blockedQueries, color: '#ef4444' },
    { name: 'Allowed', value: stats.allowedQueries, color: '#22c55e' }
  ];

  const blockRate = stats.totalQueries > 0
    ? ((stats.blockedQueries / stats.totalQueries) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQueries}</p>
            </div>
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blocked</p>
              <p className="text-2xl font-bold text-red-600">{stats.blockedQueries}</p>
            </div>
            <Ban className="h-10 w-10 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Allowed</p>
              <p className="text-2xl font-bold text-green-600">{stats.allowedQueries}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Block Rate</p>
              <p className="text-2xl font-bold text-orange-600">{blockRate}%</p>
            </div>
            <TrendingUp className="h-10 w-10 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Query Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Blocked Domains</h2>
          <div className="space-y-2">
            {stats.topBlockedDomains?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate">{item.domain}</span>
                <span className="text-sm font-medium text-red-600">{item.count}</span>
              </div>
            ))}
            {(!stats.topBlockedDomains || stats.topBlockedDomains.length === 0) && (
              <p className="text-sm text-gray-500">No blocked domains yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Connected Devices</h2>
          <div className="space-y-3">
            {stats.devices?.slice(0, 5).map((device, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <Monitor className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium">{device.ip}</span>
                </div>
                <div className="flex space-x-4 text-xs">
                  <span className="text-gray-600">Q: {device.queries}</span>
                  <span className="text-red-600">B: {device.blocked}</span>
                  <span className="text-green-600">A: {device.allowed}</span>
                </div>
              </div>
            ))}
            {(!stats.devices || stats.devices.length === 0) && (
              <p className="text-sm text-gray-500">No devices connected</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {queryHistory.slice(0, 10).map((query, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {query.action === 'blocked' ? (
                    <Ban className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-gray-700 truncate max-w-xs">{query.domain}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(query.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {queryHistory.length === 0 && (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;