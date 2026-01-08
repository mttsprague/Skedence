'use client';

import { useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  subscriptionPlan?: string;
  createdAt: any;
  disabled?: boolean;
  memberCount?: number;
  isDemoMode?: boolean;
  template?: string;
  onboardingProgress?: {
    hasConnectedStripe?: boolean;
    hasCreatedPackages?: boolean;
    hasAddedTrainer?: boolean;
    hasSetAvailability?: boolean;
    hasInvitedClient?: boolean;
    selectedTemplate?: string;
    completedAt?: any;
  };
}

interface Stats {
  totalOrgs: number;
  activeSubscriptions: number;
  trialingOrgs: number;
  disabledOrgs: number;
}

export default function HomePage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalOrgs: 0,
    activeSubscriptions: 0,
    trialingOrgs: 0,
    disabledOrgs: 0,
  });

  useEffect(() => {
    const storedEmail = localStorage.getItem('adminEmail');
    if (storedEmail) {
      setAdminEmail(storedEmail);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminEmail) {
      fetchOrganizations();
    }
  }, [isAuthenticated, adminEmail]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = orgs.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(orgs);
    }
  }, [searchQuery, orgs]);

  async function fetchOrganizations() {
    try {
      setLoading(true);
      const response = await fetch('/api/orgs', {
        headers: {
          'x-admin-email': adminEmail,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem('adminEmail');
          throw new Error('Unauthorized - please sign in again');
        }
        throw new Error('Failed to fetch organizations');
      }
      const data = await response.json();
      setOrgs(data.organizations || []);
      setStats(data.stats || {});
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisableOrg(orgId: string, currentlyDisabled: boolean) {
    if (!confirm(`Are you sure you want to ${currentlyDisabled ? 'enable' : 'disable'} this organization?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ disabled: !currentlyDisabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      await fetchOrganizations();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'An error occurred'));
    }
  }

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    if (email) {
      setAdminEmail(email);
      localStorage.setItem('adminEmail', email);
      setIsAuthenticated(true);
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setAdminEmail('');
    localStorage.removeItem('adminEmail');
  }

  function getStatusBadge(org: Organization) {
    if (org.disabled) {
      return <span className="status-badge status-inactive">Disabled</span>;
    }
    
    switch (org.subscriptionStatus) {
      case 'active':
        return <span className="status-badge status-active">Active</span>;
      case 'trialing':
        return <span className="status-badge status-trial">Trial</span>;
      case 'past_due':
        return <span className="status-badge status-inactive">Past Due</span>;
      case 'canceled':
        return <span className="status-badge status-inactive">Canceled</span>;
      default:
        return <span className="status-badge status-inactive">No Sub</span>;
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '400px', margin: '100px auto' }}>
          <h1 style={{ marginBottom: '8px' }}>Admin Login</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>Enter your authorized admin email</p>
          
          <form onSubmit={handleLogin}>
            <input
              type="email"
              name="email"
              placeholder="admin@example.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </form>
          
          {error && (
            <div style={{ color: '#f00', marginTop: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Skedence Admin Panel</h1>
          <p>Manage organizations, subscriptions, and system health</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Logout ({adminEmail})
        </button>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Organizations</h4>
          <div className="value">{stats.totalOrgs}</div>
        </div>
        <div className="stat-card">
          <h4>Active Subscriptions</h4>
          <div className="value">{stats.activeSubscriptions}</div>
        </div>
        <div className="stat-card">
          <h4>Trial Organizations</h4>
          <div className="value">{stats.trialingOrgs}</div>
        </div>
        <div className="stat-card">
          <h4>Disabled Organizations</h4>
          <div className="value">{stats.disabledOrgs}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Organizations</h2>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="orgs-list">
          {filteredOrgs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {searchQuery ? 'No organizations match your search' : 'No organizations found'}
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <div key={org.id} className="org-item">
                <div className="org-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3>{org.name}</h3>
                    {org.isDemoMode && (
                      <span className="status-badge" style={{ backgroundColor: '#f59e0b', color: 'white', fontSize: '11px' }}>
                        DEMO
                      </span>
                    )}
                    {org.template && (
                      <span style={{ fontSize: '20px', marginLeft: '4px' }}>
                        {org.template === 'volleyball' && '🏐'}
                        {org.template === 'basketball' && '🏀'}
                        {org.template === 'tennis' && '🎾'}
                        {org.template === 'golf' && '⛳️'}
                      </span>
                    )}
                  </div>
                  <p className="org-id">ID: {org.id}</p>
                  <div className="org-meta">
                    <span>Members: {org.memberCount || 0}</span>
                    {org.subscriptionPlan && (
                      <span>Plan: {org.subscriptionPlan}</span>
                    )}
                    {org.onboardingProgress && (
                      <span>
                        Setup: {Math.round(
                          (Object.values({
                            stripe: org.onboardingProgress.hasConnectedStripe || false,
                            packages: org.onboardingProgress.hasCreatedPackages || false,
                            trainer: org.onboardingProgress.hasAddedTrainer || false,
                            availability: org.onboardingProgress.hasSetAvailability || false,
                            client: org.onboardingProgress.hasInvitedClient || false,
                          }).filter(Boolean).length / 5) * 100
                        )}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="org-actions">
                  {getStatusBadge(org)}
                  <button
                    onClick={() => handleDisableOrg(org.id, org.disabled || false)}
                    className={org.disabled ? 'btn-secondary' : 'btn-danger'}
                  >
                    {org.disabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
