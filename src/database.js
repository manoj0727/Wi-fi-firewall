const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DatabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
    this.initSupabase();
  }

  initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url') {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.initialized = true;
        console.log('Supabase database connected successfully');
        this.initializeTables();
      } catch (error) {
        console.error('Failed to connect to Supabase:', error);
        this.initialized = false;
      }
    } else {
      console.log('Supabase credentials not configured. Using in-memory storage.');
      this.initialized = false;
    }
  }

  async initializeTables() {
    if (!this.initialized) return;

    try {
      // Check if tables exist, if not create them via Supabase dashboard
      // These are the table structures you need to create in Supabase:

      // 1. blocked_domains table
      // - id (uuid, primary key)
      // - domain (text, unique)
      // - type (text) - 'blocked' or 'allowed'
      // - category (text, nullable)
      // - created_at (timestamp)
      // - updated_at (timestamp)
      // - created_by (text, nullable)
      // - ip_address (text, nullable)

      // 2. access_logs table
      // - id (uuid, primary key)
      // - domain (text)
      // - action (text) - 'blocked' or 'allowed'
      // - ip_address (text)
      // - device_name (text, nullable)
      // - timestamp (timestamp)
      // - query_type (text, nullable)

      // 3. categories table
      // - id (uuid, primary key)
      // - name (text, unique)
      // - domains (text[])
      // - enabled (boolean, default false)
      // - created_at (timestamp)
      // - updated_at (timestamp)

      // 4. settings table
      // - id (uuid, primary key)
      // - key (text, unique)
      // - value (jsonb)
      // - updated_at (timestamp)

      console.log('Database tables ready');
    } catch (error) {
      console.error('Error initializing database tables:', error);
    }
  }

  // Blocked Domains Management
  async addBlockedDomain(domain, category = null, ipAddress = null) {
    if (!this.initialized) return { success: false, error: 'Database not initialized' };

    try {
      const { data, error } = await this.supabase
        .from('blocked_domains')
        .insert([
          {
            domain,
            type: 'blocked',
            category,
            ip_address: ipAddress,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error adding blocked domain:', error);
      return { success: false, error: error.message };
    }
  }

  async removeBlockedDomain(domain) {
    if (!this.initialized) return { success: false, error: 'Database not initialized' };

    try {
      const { error } = await this.supabase
        .from('blocked_domains')
        .delete()
        .eq('domain', domain);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing blocked domain:', error);
      return { success: false, error: error.message };
    }
  }

  async getBlockedDomains() {
    if (!this.initialized) return [];

    try {
      const { data, error } = await this.supabase
        .from('blocked_domains')
        .select('*')
        .eq('type', 'blocked')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching blocked domains:', error);
      return [];
    }
  }

  async getAllowedDomains() {
    if (!this.initialized) return [];

    try {
      const { data, error } = await this.supabase
        .from('blocked_domains')
        .select('*')
        .eq('type', 'allowed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching allowed domains:', error);
      return [];
    }
  }

  async isDomainBlocked(domain) {
    if (!this.initialized) return false;

    try {
      const { data, error } = await this.supabase
        .from('blocked_domains')
        .select('domain, type')
        .eq('domain', domain)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false; // No rows found
        throw error;
      }

      return data?.type === 'blocked';
    } catch (error) {
      console.error('Error checking domain status:', error);
      return false;
    }
  }

  // Access Logging
  async logAccess(domain, action, ipAddress, deviceName = null) {
    if (!this.initialized) return;

    try {
      const { error } = await this.supabase
        .from('access_logs')
        .insert([
          {
            domain,
            action,
            ip_address: ipAddress,
            device_name: deviceName,
            timestamp: new Date().toISOString()
          }
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }

  async getAccessLogs(limit = 100, offset = 0) {
    if (!this.initialized) return [];

    try {
      const { data, error } = await this.supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching access logs:', error);
      return [];
    }
  }

  async getAccessStats(hours = 24) {
    if (!this.initialized) return { blocked: 0, allowed: 0, total: 0 };

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('access_logs')
        .select('action')
        .gte('timestamp', since);

      if (error) throw error;

      const stats = {
        blocked: 0,
        allowed: 0,
        total: 0
      };

      if (data) {
        data.forEach(log => {
          stats.total++;
          if (log.action === 'blocked') stats.blocked++;
          else if (log.action === 'allowed') stats.allowed++;
        });
      }

      return stats;
    } catch (error) {
      console.error('Error fetching access stats:', error);
      return { blocked: 0, allowed: 0, total: 0 };
    }
  }

  // Categories Management
  async getCategories() {
    if (!this.initialized) return [];

    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async updateCategory(name, domains, enabled) {
    if (!this.initialized) return { success: false, error: 'Database not initialized' };

    try {
      const { data, error } = await this.supabase
        .from('categories')
        .upsert([
          {
            name,
            domains,
            enabled,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'name' })
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: error.message };
    }
  }

  async getEnabledCategories() {
    if (!this.initialized) return [];

    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('name, domains')
        .eq('enabled', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching enabled categories:', error);
      return [];
    }
  }

  // Settings Management
  async getSetting(key) {
    if (!this.initialized) return null;

    try {
      const { data, error } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }

      return data?.value;
    } catch (error) {
      console.error('Error fetching setting:', error);
      return null;
    }
  }

  async setSetting(key, value) {
    if (!this.initialized) return { success: false, error: 'Database not initialized' };

    try {
      const { error } = await this.supabase
        .from('settings')
        .upsert([
          {
            key,
            value,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'key' });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error setting value:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions
  subscribeToBlockedDomains(callback) {
    if (!this.initialized) return null;

    return this.supabase
      .channel('blocked_domains_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_domains' },
        callback
      )
      .subscribe();
  }

  subscribeToAccessLogs(callback) {
    if (!this.initialized) return null;

    return this.supabase
      .channel('access_logs_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'access_logs' },
        callback
      )
      .subscribe();
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = new DatabaseService();