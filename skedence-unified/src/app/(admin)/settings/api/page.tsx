'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shield, Copy, Eye, EyeOff, RefreshCw, Key, AlertCircle, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import * as crypto from 'crypto-js';

export default function ApiSettingsPage() {
  const { orgId, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('');

  useEffect(() => {
    if (!orgId) return;

    async function loadApiSettings() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setApiEnabled(data.apiEnabled || false);
          
          // Check both billing.plan (from Stripe) and subscriptionTier (legacy)
          const tier = data.billing?.plan || data.subscriptionTier || 'starter';
          setSubscriptionTier(tier);
          console.log('Current subscription tier:', tier, 'billing.plan:', data.billing?.plan, 'subscriptionTier:', data.subscriptionTier); // Debug log
          
          // API key is only shown once during generation
          // We don't store the raw key, only the hash
          if (data.apiKey) {
            setApiKey('••••••••••••••••••••••••••••••••');
          }
        }
      } catch (error) {
        console.error('Error loading API settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadApiSettings();
  }, [orgId]);

  const generateApiKey = async () => {
    if (!orgId) return;

    setGenerating(true);
    try {
      // Generate a secure random API key
      const randomBytes = crypto.lib.WordArray.random(32);
      const newApiKey = `sk_${orgId.substring(0, 8)}_${randomBytes.toString()}`;
      
      // Hash the key for storage
      const hashedKey = crypto.SHA256(newApiKey).toString();

      // Save to Firestore
      await updateDoc(doc(db, 'organizations', orgId), {
        apiKeyHash: hashedKey,
        apiEnabled: true,
        apiKeyCreatedAt: new Date(),
      });

      setApiKey(newApiKey);
      setApiEnabled(true);
      setShowKey(true);
    } catch (error) {
      console.error('Error generating API key:', error);
      alert('Failed to generate API key. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleApiEnabled = async () => {
    if (!orgId) return;

    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        apiEnabled: !apiEnabled,
      });
      setApiEnabled(!apiEnabled);
    } catch (error) {
      console.error('Error toggling API status:', error);
      alert('Failed to update API status. Please try again.');
    }
  };

  const copyToClipboard = () => {
    if (apiKey && showKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Case-insensitive check for API access
  const tierLower = subscriptionTier.toLowerCase();
  const hasApiAccess = tierLower === 'academy' || tierLower === 'enterprise';

  if (loading) {
    return (
      <BusinessSettingsSubmenu>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </BusinessSettingsSubmenu>
    );
  }

  return (
    <BusinessSettingsSubmenu>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Settings</h1>
          <p className="text-foreground/80 mt-2">Manage API access for enterprise integrations</p>
        </div>

        {!hasApiAccess && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">API Access Not Available</h3>
                  <p className="text-sm text-amber-800 mb-4">
                    API access is available for Academy and Enterprise tier subscribers. 
                    Upgrade your subscription to access the Skedence REST API.
                  </p>
                  <a
                    href="/subscription"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                  >
                    Upgrade Subscription
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasApiAccess && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  API Access Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">API Access</p>
                    <p className="text-sm text-muted-foreground">
                      {apiEnabled ? 'Active - API requests will be accepted' : 'Disabled - API requests will be rejected'}
                    </p>
                  </div>
                  <button
                    onClick={toggleApiEnabled}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      apiEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {apiEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiKey ? (
                  <>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <code className="flex-1 px-3 py-2 bg-background border border-input rounded font-mono text-sm">
                          {showKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="p-2 hover:bg-background rounded transition-colors"
                          title={showKey ? 'Hide key' : 'Show key'}
                        >
                          {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        {showKey && (
                          <button
                            onClick={copyToClipboard}
                            className="p-2 hover:bg-background rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                          </button>
                        )}
                      </div>

                      {showKey && (
                        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <p>
                            Store this key securely. For security reasons, we only display it once. 
                            If you lose it, generate a new one.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={generateApiKey}
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                      Regenerate Key
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Generate an API key to access the Skedence REST API. This key will be shown only once, 
                      so make sure to copy and store it securely.
                    </p>
                    <button
                      onClick={generateApiKey}
                      disabled={generating}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4" />
                          Generate API Key
                        </>
                      )}
                    </button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The Skedence REST API allows you to programmatically manage your organization's data.
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Base URL</h4>
                  <code className="block px-3 py-2 bg-muted rounded text-sm font-mono">
                    https://us-central1-polyface-ae6d3.cloudfunctions.net/api/api/v1
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Include your API key in the <code className="px-1.5 py-0.5 bg-muted rounded text-xs">X-API-Key</code> header:
                  </p>
                  <code className="block px-3 py-2 bg-muted rounded text-sm font-mono">
                    X-API-Key: your_api_key_here
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Available Endpoints</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <code className="text-xs">/clients</code> - Manage clients</li>
                    <li>• <code className="text-xs">/bookings</code> - Manage bookings</li>
                    <li>• <code className="text-xs">/trainers</code> - View trainers and availability</li>
                    <li>• <code className="text-xs">/classes</code> - Manage group classes</li>
                    <li>• <code className="text-xs">/reports</code> - Access revenue and booking reports</li>
                  </ul>
                </div>

                <Link
                  href="/api-docs"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  <Shield className="h-5 w-5" />
                  View Full API Documentation
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessSettingsSubmenu>
  );
}
