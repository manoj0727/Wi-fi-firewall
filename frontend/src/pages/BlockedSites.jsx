import { useState, useEffect } from 'react';
import { Plus, Trash2, Ban, Search } from 'lucide-react';
import useStore from '../store/useStore';
import api from '../utils/api';

function BlockedSites() {
  const blockedDomains = useStore(state => state.blockedDomains);
  const [newDomain, setNewDomain] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBlockedDomains();
  }, []);

  const fetchBlockedDomains = async () => {
    try {
      const response = await api.get('/blocked-domains');
      useStore.getState().setBlockedDomains(response.data);
    } catch (error) {
      console.error('Failed to fetch blocked domains:', error);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (newDomain.trim()) {
      try {
        await api.post('/blocked-domains', { domain: newDomain.trim() });
        setNewDomain('');
        fetchBlockedDomains();
      } catch (error) {
        console.error('Failed to add domain:', error);
      }
    }
  };

  const handleRemoveDomain = async (domain) => {
    if (confirm(`Are you sure you want to unblock ${domain}?`)) {
      try {
        await api.delete(`/blocked-domains/${encodeURIComponent(domain)}`);
        fetchBlockedDomains();
      } catch (error) {
        console.error('Failed to remove domain:', error);
      }
    }
  };

  const filteredDomains = blockedDomains.filter(domain =>
    domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Blocked Sites</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Add Domain to Blocklist</h2>
        <form onSubmit={handleAddDomain} className="flex space-x-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Enter domain (e.g., example.com)"
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Ban className="h-5 w-5" />
            <span>Block Domain</span>
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Blocked Domains ({blockedDomains.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search domains..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {filteredDomains.map((domain) => (
            <div
              key={domain}
              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Ban className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-gray-900">{domain}</span>
              </div>
              <button
                onClick={() => handleRemoveDomain(domain)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {filteredDomains.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            {searchTerm ? 'No domains found matching your search' : 'No blocked domains yet'}
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockedSites;