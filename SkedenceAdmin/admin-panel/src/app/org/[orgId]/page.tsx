'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';

interface Member {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

interface Event {
  id: string;
  type: string;
  timestamp: any;
  details: any;
}

interface OrgDetails {
  id: string;
  name: string;
  stripeCustomerId?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  disabled?: boolean;
  createdAt: any;
}

export default function OrgDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const resolvedParams = use(params);
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrgDetails();
  }, [resolvedParams.orgId]);

  async function fetchOrgDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${resolvedParams.orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch organization details');
      }
      const data = await response.json();
      setOrg(data.organization);
      setMembers(data.members || []);
      setEvents(data.recentEvents || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading organization details...</div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="container">
        <div className="error">{error || 'Organization not found'}</div>
        <button className="button button-secondary" onClick={() => window.location.href = '/'}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="button button-secondary" onClick={() => window.location.href = '/'} style={{ marginBottom: '20px' }}>
        ← Back to Dashboard
      </button>

      <div className="header">
        <h1>{org.name}</h1>
        <p>Organization ID: {org.id}</p>
      </div>

      {/* Organization Info */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Organization Details</h2>
        <table className="table">
          <tbody>
            <tr>
              <td><strong>Status</strong></td>
              <td>{org.disabled ? 'Disabled' : 'Active'}</td>
            </tr>
            <tr>
              <td><strong>Subscription Status</strong></td>
              <td>{org.subscriptionStatus || 'None'}</td>
            </tr>
            <tr>
              <td><strong>Subscription Plan</strong></td>
              <td>{org.subscriptionPlan || 'None'}</td>
            </tr>
            <tr>
              <td><strong>Stripe Customer ID</strong></td>
              <td>{org.stripeCustomerId || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Created At</strong></td>
              <td>{org.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Members */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Members ({members.length})</h2>
        {members.length === 0 ? (
          <div className="empty-state">
            <p>No members found</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.email}</td>
                  <td>{member.displayName || '-'}</td>
                  <td>{member.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Events */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Recent Events</h2>
        {events.length === 0 ? (
          <div className="empty-state">
            <p>No recent events</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Timestamp</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.type}</td>
                  <td>{event.timestamp?.toDate?.()?.toLocaleString() || 'N/A'}</td>
                  <td><code>{JSON.stringify(event.details)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
