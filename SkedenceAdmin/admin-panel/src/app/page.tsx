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
  const [stats, setStats] = useState<Stats>({
    totalOrgs: 0,
    activeSubscriptions: 0,
    trialingOrgs: 0,
    disabledOrgs: 0,
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

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
      const response = await fetch('/api/orgs');
      if (!response.ok) {
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
        headers: { 'Content-Type': 'application/json' },
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
