'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Copy, Check, Code, Book, Key, Zap, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ApiDocsPage() {
  const { orgId } = useAuth();
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const baseUrl = 'https://us-central1-polyface-ae6d3.cloudfunctions.net/api/api/v1';

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      category: 'Clients',
      description: 'Manage client accounts and view their lesson packages',
      items: [
        {
          method: 'GET',
          path: '/clients',
          description: 'List all clients in your organization',
          params: ['limit (optional, default: 100)', 'offset (optional, default: 0)', 'search (optional)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/clients?limit=50&search=john"`,
          response: `{
  "data": [
    {
      "id": "client_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "role": "client",
      "orgId": "org_xyz",
      "createdAt": "2026-03-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}`
        },
        {
          method: 'GET',
          path: '/clients/:id',
          description: 'Get client details including their lesson packages',
          params: ['id (required, path parameter)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/clients/client_123"`,
          response: `{
  "data": {
    "id": "client_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "packages": [
      {
        "id": "pkg_456",
        "packageType": "private",
        "totalLessons": 10,
        "lessonsUsed": 3,
        "remainingLessons": 7,
        "purchaseDate": "2026-02-15T14:30:00.000Z",
        "expirationDate": "2026-05-15T14:30:00.000Z"
      }
    ]
  }
}`
        },
        {
          method: 'POST',
          path: '/clients',
          description: 'Create a new client account',
          params: ['firstName (required)', 'lastName (required)', 'email (required)', 'phoneNumber (required)'],
          example: `curl -X POST -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phoneNumber": "+1234567890"
  }' \\
  "${baseUrl}/clients"`,
          response: `{
  "data": {
    "id": "client_789",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phoneNumber": "+1234567890",
    "role": "client",
    "orgId": "org_xyz",
    "createdAt": "2026-03-08T12:00:00.000Z"
  }
}`
        }
      ]
    },
    {
      category: 'Bookings',
      description: 'Create and manage lesson bookings',
      items: [
        {
          method: 'GET',
          path: '/bookings',
          description: 'List bookings with optional filters',
          params: [
            'limit (optional, default: 100)',
            'offset (optional, default: 0)',
            'status (optional: confirmed, cancelled, completed)',
            'trainerId (optional)',
            'clientId (optional)',
            'startDate (optional, ISO 8601)',
            'endDate (optional, ISO 8601)'
          ],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/bookings?status=confirmed&startDate=2026-03-01"`,
          response: `{
  "data": [
    {
      "id": "booking_123",
      "clientId": "client_456",
      "trainerId": "trainer_789",
      "scheduleId": "schedule_111",
      "packageId": "pkg_222",
      "startTime": "2026-03-10T14:00:00.000Z",
      "endTime": "2026-03-10T15:00:00.000Z",
      "status": "confirmed",
      "location": "Court 1",
      "notes": "Focus on serving technique"
    }
  ],
  "meta": { "total": 1 }
}`
        },
        {
          method: 'POST',
          path: '/bookings',
          description: 'Create a new booking (marks schedule slot, decrements package)',
          params: [
            'clientId (required)',
            'trainerId (required)',
            'scheduleId (required)',
            'startTime (required, ISO 8601)',
            'endTime (required, ISO 8601)',
            'packageId (required)',
            'location (optional)',
            'notes (optional)'
          ],
          example: `curl -X POST -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "client_456",
    "trainerId": "trainer_789",
    "scheduleId": "schedule_111",
    "packageId": "pkg_222",
    "startTime": "2026-03-10T14:00:00.000Z",
    "endTime": "2026-03-10T15:00:00.000Z",
    "location": "Court 1",
    "notes": "Focus on serving technique"
  }' \\
  "${baseUrl}/bookings"`,
          response: `{
  "data": {
    "id": "booking_123",
    "clientId": "client_456",
    "trainerId": "trainer_789",
    "status": "confirmed",
    "createdAt": "2026-03-08T12:00:00.000Z"
  }
}`
        },
        {
          method: 'DELETE',
          path: '/bookings/:id',
          description: 'Cancel a booking (frees schedule slot, refunds lesson to package)',
          params: ['id (required, path parameter)'],
          example: `curl -X DELETE -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/bookings/booking_123"`,
          response: `{
  "data": {
    "message": "Booking cancelled successfully",
    "id": "booking_123"
  }
}`
        }
      ]
    },
    {
      category: 'Trainers',
      description: 'View trainer information and availability',
      items: [
        {
          method: 'GET',
          path: '/trainers',
          description: 'List all trainers',
          params: ['active (optional: true/false)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/trainers?active=true"`,
          response: `{
  "data": [
    {
      "id": "trainer_123",
      "firstName": "Coach",
      "lastName": "Johnson",
      "email": "coach@example.com",
      "active": true,
      "role": "trainer"
    }
  ],
  "meta": { "total": 1 }
}`
        },
        {
          method: 'GET',
          path: '/trainers/:id/availability',
          description: 'Get unbooked schedule slots for a trainer',
          params: ['id (required, path parameter)', 'startDate (optional, ISO 8601)', 'endDate (optional, ISO 8601)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/trainers/trainer_123/availability?startDate=2026-03-10"`,
          response: `{
  "data": [
    {
      "id": "schedule_111",
      "trainerId": "trainer_123",
      "startTime": "2026-03-10T14:00:00.000Z",
      "endTime": "2026-03-10T15:00:00.000Z",
      "isBooked": false,
      "location": "Court 1"
    }
  ]
}`
        }
      ]
    },
    {
      category: 'Classes',
      description: 'Manage group classes and registrations',
      items: [
        {
          method: 'GET',
          path: '/classes',
          description: 'List group classes',
          params: ['upcoming (optional: true/false)', 'limit (optional)', 'offset (optional)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/classes?upcoming=true"`,
          response: `{
  "data": [
    {
      "id": "class_123",
      "className": "Advanced Serving",
      "description": "Master serve techniques",
      "trainerId": "trainer_456",
      "startTime": "2026-03-15T18:00:00.000Z",
      "endTime": "2026-03-15T19:30:00.000Z",
      "maxParticipants": 12,
      "currentParticipants": 8,
      "location": "Main Court"
    }
  ]
}`
        },
        {
          method: 'POST',
          path: '/classes/:id/register',
          description: 'Register a client for a class',
          params: ['id (required, path parameter)', 'clientId (required)', 'packageId (optional)'],
          example: `curl -X POST -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"clientId": "client_789", "packageId": "pkg_222"}' \\
  "${baseUrl}/classes/class_123/register"`,
          response: `{
  "data": {
    "message": "Successfully registered for class",
    "classId": "class_123",
    "clientId": "client_789"
  }
}`
        }
      ]
    },
    {
      category: 'Reports',
      description: 'Access analytics and statistics',
      items: [
        {
          method: 'GET',
          path: '/reports/revenue',
          description: 'Get revenue analytics',
          params: ['startDate (optional, ISO 8601)', 'endDate (optional, ISO 8601)', 'groupBy (optional: day/month)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/reports/revenue?startDate=2026-03-01&endDate=2026-03-31"`,
          response: `{
  "data": {
    "totalRevenue": 12500,
    "totalRevenueFormatted": "$125.00",
    "revenueByDate": [
      {
        "date": "2026-03-01",
        "revenue": 8000,
        "revenueFormatted": "$80.00",
        "count": 1
      }
    ]
  }
}`
        },
        {
          method: 'GET',
          path: '/reports/bookings',
          description: 'Get booking statistics',
          params: ['startDate (optional, ISO 8601)', 'endDate (optional, ISO 8601)'],
          example: `curl -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl}/reports/bookings"`,
          response: `{
  "data": {
    "totalBookings": 45,
    "byStatus": {
      "confirmed": 30,
      "completed": 10,
      "cancelled": 5
    },
    "byTrainer": {
      "trainer_123": 20,
      "trainer_456": 25
    }
  }
}`
        }
      ]
    }
  ];

  const errorCodes = [
    { code: '200', status: 'OK', description: 'Request succeeded' },
    { code: '201', status: 'Created', description: 'Resource created successfully' },
    { code: '400', status: 'Bad Request', description: 'Invalid request parameters or missing required fields' },
    { code: '401', status: 'Unauthorized', description: 'Missing or invalid API key' },
    { code: '403', status: 'Forbidden', description: 'API access not enabled or insufficient permissions' },
    { code: '404', status: 'Not Found', description: 'Resource not found' },
    { code: '409', status: 'Conflict', description: 'Resource already exists (e.g., duplicate email)' },
    { code: '429', status: 'Too Many Requests', description: 'Rate limit exceeded' },
    { code: '500', status: 'Internal Server Error', description: 'Server error, contact support if persists' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="px-6 py-12 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Book className="h-10 w-10" />
              <h1 className="text-4xl font-bold">API Documentation</h1>
            </div>
            <p className="text-xl text-primary-foreground/90 mb-6">
              Integrate Skedence with your systems using our REST API
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/settings/api"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition"
              >
                <Key className="h-5 w-5" />
                Get API Key
              </Link>
              <a 
                href="#quickstart"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/20 text-primary-foreground rounded-lg font-semibold hover:bg-primary-foreground/30 transition"
              >
                <Zap className="h-5 w-5" />
                Quick Start
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Quick Start */}
          <section id="quickstart" className="mb-16 scroll-mt-20">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Zap className="h-7 w-7 text-orange-500" />
              Quick Start
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">1. Get Your API Key</h3>
                <p className="text-muted-foreground mb-2">
                  Visit the <Link href="/settings/api" className="text-primary hover:underline">API Settings page</Link> to generate your API key. 
                  Available for Academy and Enterprise plans only.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">2. Make Your First Request</h3>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-foreground">{`curl -H "X-API-Key: YOUR_API_KEY" \\
  ${baseUrl}/clients`}</pre>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">3. Test the Health Endpoint</h3>
                <p className="text-muted-foreground mb-2">Verify the API is accessible (no authentication required):</p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-foreground">{`curl ${baseUrl}/health`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16 scroll-mt-20">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Shield className="h-7 w-7 text-blue-500" />
              Authentication
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <p className="text-foreground">
                All API requests (except <code className="bg-muted px-2 py-1 rounded">/health</code>) require authentication using an API key.
              </p>
              <div>
                <h3 className="text-lg font-semibold mb-2">Include your API key in the request header:</h3>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                  <pre className="text-foreground">X-API-Key: sk_your_api_key_here</pre>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">Security Best Practice</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                      Never expose your API key in client-side code or public repositories. Store it securely as an environment variable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Rate Limiting */}
          <section id="rate-limiting" className="mb-16 scroll-mt-20">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Zap className="h-7 w-7 text-yellow-500" />
              Rate Limiting
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <p className="text-foreground">API requests are rate-limited based on your subscription tier:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Academy Tier</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">1,000</p>
                  <p className="text-sm text-muted-foreground">requests per hour</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Enterprise Tier</h3>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">10,000</p>
                  <p className="text-sm text-muted-foreground">requests per hour</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Rate Limit Headers</h3>
                <p className="text-muted-foreground mb-2">Each response includes headers to track your usage:</p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
                  <div className="text-foreground">X-RateLimit-Limit: 1000</div>
                  <div className="text-foreground">X-RateLimit-Remaining: 950</div>
                  <div className="text-foreground">X-RateLimit-Reset: 1709928000</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                If you exceed your rate limit, you'll receive a <code className="bg-muted px-2 py-1 rounded">429 Too Many Requests</code> response.
              </p>
            </div>
          </section>

          {/* Endpoints */}
          <section id="endpoints" className="mb-16 scroll-mt-20">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Code className="h-7 w-7 text-green-500" />
              API Endpoints
            </h2>
            <div className="space-y-8">
              {endpoints.map((category, idx) => (
                <div key={idx} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-6 py-4 border-b border-border">
                    <h3 className="text-2xl font-bold">{category.category}</h3>
                    <p className="text-muted-foreground mt-1">{category.description}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {category.items.map((endpoint, endpointIdx) => (
                      <div key={endpointIdx} className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <span className={`px-3 py-1 rounded-md font-mono text-sm font-bold ${
                            endpoint.method === 'GET' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                            endpoint.method === 'POST' ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' :
                            endpoint.method === 'PUT' ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' :
                            'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                          }`}>
                            {endpoint.method}
                          </span>
                          <div className="flex-1">
                            <code className="text-lg font-mono text-foreground">{endpoint.path}</code>
                            <p className="text-muted-foreground mt-1">{endpoint.description}</p>
                          </div>
                        </div>

                        {endpoint.params && endpoint.params.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Parameters:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {endpoint.params.map((param, paramIdx) => (
                                <li key={paramIdx}>{param}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Example Request:</h4>
                            <button
                              onClick={() => copyToClipboard(endpoint.example, `${category.category}-${endpointIdx}`)}
                              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition"
                            >
                              {copiedEndpoint === `${category.category}-${endpointIdx}` ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                            <pre className="text-foreground">{endpoint.example}</pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Example Response:</h4>
                          <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                            <pre className="text-foreground">{endpoint.response}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Error Codes */}
          <section id="errors" className="mb-16 scroll-mt-20">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-red-500" />
              Error Codes
            </h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Code</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {errorCodes.map((error, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-mono font-bold">{error.code}</td>
                      <td className="px-6 py-4 font-medium">{error.status}</td>
                      <td className="px-6 py-4 text-muted-foreground">{error.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Base URL Reference */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Base URL</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-gray-900 px-4 py-2 rounded font-mono text-sm overflow-x-auto">
                  {baseUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(baseUrl, 'base-url')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition flex items-center gap-2"
                >
                  {copiedEndpoint === 'base-url' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="mb-16">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <h3 className="text-2xl font-bold mb-2">Need Help?</h3>
              <p className="text-muted-foreground mb-4">
                Contact our support team if you have questions or need assistance with the API
              </p>
              <Link 
                href="/support"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
              >
                <ExternalLink className="h-5 w-5" />
                Contact Support
              </Link>
            </div>
          </section>
        </div>
      </div>
  );
}
