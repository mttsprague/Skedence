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
    // Check for stored email
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
    if!isAuthenticated) {
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
         div>
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
        </button
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

  if ( (org.disabled) {
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
        <h1>Skedence Admin Panel</h1>
        <p>Manage organizations, subscriptions, and system health</p>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* Stats Dashboard */}
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

      {/* Organizations List */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Organizations</h2>
        
        <input
          type="text"
          className="search-box"
          placeholder="Search by organization name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {filteredOrgs.length === 0 ? (
          <div className="empty-state">
            <h3>No organizations found</h3>
            <p>Try adjusting your search query</p>
          </div>
        ) : (
          <ul className="org-list">
            {filteredOrgs.map((org) => (
              <li key={org.id} className="org-item">
                <div className="org-info">
                  <h3>
                    {org.name}
                    {getStatusBadge(org)}
                  </h3>
                  <p>
                    ID: {org.id} • 
                    {org.subscriptionPlan && ` Plan: ${org.subscriptionPlan} • `}
                    Members: {org.memberCount || 0}
                  </p>
                </div>
                <div className="button-group">
                  <button
                    className="button button-secondary"
                    onClick={() => window.location.href = `/org/${org.id}`}
                  >
                    View Details
                  </button>
                  <button
                    className={`button ${org.disabled ? 'button-primary' : 'button-danger'}`}
                    onClick={() => handleDisableOrg(org.id, org.disabled || false)}
                  >
                    {org.disabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
