import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Shield, Globe } from 'lucide-react';
import useStore from '../store/useStore';
import api from '../utils/api';

function Rules() {
  const [rulesData, setRulesData] = useState({
    blocked: [],
    allowed: [],
    categories: {},
    blockedCategories: [],
    mode: 'blacklist'
  });
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [domainType, setDomainType] = useState('blocked');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await api.get('/rules');
      setRulesData(response.data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const handleAddDomain = async () => {
    if (!domainInput.trim()) return;

    try {
      if (domainType === 'blocked') {
        await api.post('/blocked-domains', { domain: domainInput });
      } else {
        await api.post('/allowed-domains', { domain: domainInput });
      }
      setDomainInput('');
      setIsAddingDomain(false);
      fetchRules();
    } catch (error) {
      console.error('Failed to add domain:', error);
    }
  };

  const handleRemoveDomain = async (domain, type) => {
    if (confirm(`Are you sure you want to remove ${domain}?`)) {
      try {
        if (type === 'blocked') {
          await api.delete(`/blocked-domains/${encodeURIComponent(domain)}`);
        } else {
          await api.delete(`/allowed-domains/${encodeURIComponent(domain)}`);
        }
        fetchRules();
      } catch (error) {
        console.error('Failed to remove domain:', error);
      }
    }
  };

  const handleToggleCategory = async (category) => {
    try {
      await api.post(`/categories/${category}/toggle`);
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle category:', error);
    }
  };

  const handleModeChange = async (newMode) => {
    try {
      await api.put('/settings/mode', { mode: newMode });
      fetchRules();
    } catch (error) {
      console.error('Failed to change mode:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Firewall Rules</h1>
        <div className="flex space-x-4">
          <select
            value={rulesData.mode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="blacklist">Blacklist Mode</option>
            <option value="whitelist">Whitelist Mode</option>
          </select>
          <button
            onClick={() => setIsAddingDomain(!isAddingDomain)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Domain</span>
          </button>
        </div>
      </div>

      {isAddingDomain && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="Enter domain (e.g., example.com)"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <select
              value={domainType}
              onChange={(e) => setDomainType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="blocked">Block</option>
              <option value="allowed">Allow</option>
            </select>
            <button
              onClick={handleAddDomain}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsAddingDomain(false);
                setDomainInput('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-gray-600">
            Current Mode: <span className="font-medium">{rulesData.mode === 'blacklist' ? 'Blacklist' : 'Whitelist'}</span>
            {rulesData.databaseConnected && (
              <span className="ml-2 text-green-600">(Database Connected)</span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6">
          {Object.entries(rulesData.categories).map(([category, domains]) => (
            <div key={category} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium capitalize">{category}</h3>
                <button
                  onClick={() => handleToggleCategory(category)}
                  className={`px-3 py-1 rounded text-sm ${
                    rulesData.blockedCategories.includes(category)
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {rulesData.blockedCategories.includes(category) ? 'Blocked' : 'Not Blocked'}
                </button>
              </div>
              <div className="text-sm text-gray-600">
                {domains.length} domains
                <div className="mt-1 text-xs">
                  {domains.slice(0, 3).join(', ')}
                  {domains.length > 3 && '...'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Domains */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Blocked Domains ({rulesData.blocked.length})</h2>
        </div>
        <div className="divide-y">
          {rulesData.blocked.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No blocked domains. Add domains to block above.
            </div>
          ) : (
            rulesData.blocked.map((domain) => (
              <div key={domain} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-red-600" />
                    <span className="font-medium">{domain}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDomain(domain, 'blocked')}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Allowed Domains (for whitelist mode) */}
      {rulesData.mode === 'whitelist' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Allowed Domains ({rulesData.allowed.length})</h2>
          </div>
          <div className="divide-y">
            {rulesData.allowed.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No allowed domains. Add domains to allow above.
              </div>
            ) : (
              rulesData.allowed.map((domain) => (
                <div key={domain} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-green-600" />
                      <span className="font-medium">{domain}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDomain(domain, 'allowed')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Rules;