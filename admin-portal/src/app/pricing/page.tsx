'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Trash2, Info } from 'lucide-react';

interface PackageOption {
  id: string;
  title: string;
  description: string;
  priceInCents: number;
  packageType: string;
  lessonCount: number;
  packageCategory: 'pass' | 'class';
}

interface PricingTier {
  id: string;
  tierName: string;
  packages: PackageOption[];
}

export default function PricingPage() {
  const { orgId } = useAuth();
  const [tiers, setTiers] = useState<PricingTier[]>([{ id: '1', tierName: '', packages: [] }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function loadPricing() {
      try {
        if (!orgId) return; // Type guard
        
        // Load from organizations/{orgId} document field (matching iOS PricingStructureService)
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          const pricingData = data.pricingStructure;
          
          if (pricingData && pricingData.tiers && Array.isArray(pricingData.tiers) && pricingData.tiers.length > 0) {
            setTiers(pricingData.tiers);
          }
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        setMessage({ type: 'error', text: 'Failed to load pricing structure' });
      } finally {
        setLoading(false);
      }
    }

    loadPricing();
  }, [orgId]);

  const addTier = () => {
    setTiers([...tiers, {
      id: Date.now().toString(),
      tierName: '',
      packages: []
    }]);
  };

  const deleteTier = (tierIndex: number) => {
    if (tiers.length === 1) {
      setMessage({ type: 'error', text: 'Cannot delete the last tier' });
      return;
    }
    setTiers(tiers.filter((_, i) => i !== tierIndex));
  };

  const updateTierName = (tierIndex: number, name: string) => {
    const newTiers = [...tiers];
    newTiers[tierIndex].tierName = name;
    setTiers(newTiers);
  };

  const addPackage = (tierIndex: number) => {
    const newTiers = [...tiers];
    newTiers[tierIndex].packages.push({
      id: Date.now().toString(),
      title: '',
      description: '',
      priceInCents: 0,
      packageType: '',
      lessonCount: 1,
      packageCategory: 'pass'
    });
    setTiers(newTiers);
  };

  const deletePackage = (tierIndex: number, packageIndex: number) => {
    const newTiers = [...tiers];
    newTiers[tierIndex].packages = newTiers[tierIndex].packages.filter((_, i) => i !== packageIndex);
    setTiers(newTiers);
  };

  const updatePackage = (tierIndex: number, packageIndex: number, field: string, value: any) => {
    const newTiers = [...tiers];
    (newTiers[tierIndex].packages[packageIndex] as any)[field] = value;
    setTiers(newTiers);
  };

  const savePricingStructure = async () => {
    if (!orgId) return;

    // Validation
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (!tier.tierName.trim()) {
        setMessage({ type: 'error', text: `Tier ${i + 1} must have a name` });
        return;
      }

      for (let j = 0; j < tier.packages.length; j++) {
        const pkg = tier.packages[j];
        if (!pkg.title.trim()) {
          setMessage({ type: 'error', text: `Tier "${tier.tierName}" - Package ${j + 1} must have a title` });
          return;
        }
        if (pkg.priceInCents <= 0) {
          setMessage({ type: 'error', text: `Tier "${tier.tierName}" - Package "${pkg.title}" must have a price greater than $0` });
          return;
        }
        if (pkg.lessonCount <= 0) {
          setMessage({ type: 'error', text: `Tier "${tier.tierName}" - Package "${pkg.title}" must have at least 1 pass` });
          return;
        }
        if (!pkg.packageType.trim()) {
          setMessage({ type: 'error', text: `Tier "${tier.tierName}" - Package "${pkg.title}" must have a package type` });
          return;
        }
      }
    }

    setSaving(true);
    setMessage(null);

    try {
      // Save to organizations/{orgId} document field (matching iOS PricingStructureService)
      await setDoc(
        doc(db, 'organizations', orgId),
        { 
          pricingStructure: {
            tiers,
            lastUpdated: new Date().toISOString()
          }
        },
        { merge: true }
      );

      setMessage({ type: 'success', text: 'Pricing structure saved successfully!' });
    } catch (error) {
      console.error('Error saving pricing:', error);
      setMessage({ type: 'error', text: 'Failed to save pricing structure' });
    } finally {
      setSaving(false);
    }
  };

  const showPackageTypeInfo = () => {
    setMessage({
      type: 'info',
      text: 'Use lowercase letters and underscores (_) for package types.\n\nExamples:\n• private\n• 2_athlete\n• 3_athlete\n• class_pass\n• small_group\n\nAvoid spaces - use underscores instead.'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pricing...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Structure</h1>
            <p className="text-gray-600 mt-1">Set up pricing tiers and package options</p>
            {tiers.length > 0 && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-600"></span>
                Currently: {tiers.length} tier(s), {tiers.reduce((sum, t) => sum + t.packages.length, 0)} package(s)
              </p>
            )}
          </div>
          <Button
            onClick={showPackageTypeInfo}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Package Type Format
          </Button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg whitespace-pre-line ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {tiers.map((tier, tierIndex) => (
            <Card key={tier.id} className="border-2">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={tier.tierName}
                    onChange={(e) => updateTierName(tierIndex, e.target.value)}
                    placeholder="Tier Name (e.g., Master, Elite, Pro)"
                    className="flex-1 px-4 py-2 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  />
                  {tiers.length > 1 && (
                    <Button
                      onClick={() => deleteTier(tierIndex)}
                      variant="danger"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {tier.packages.map((pkg, packageIndex) => (
                  <div key={pkg.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">Package {packageIndex + 1}</span>
                      <Button
                        onClick={() => deletePackage(tierIndex, packageIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Title</label>
                      <input
                        type="text"
                        value={pkg.title}
                        onChange={(e) => updatePackage(tierIndex, packageIndex, 'title', e.target.value)}
                        placeholder="e.g., 1 Athlete Private Lesson"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Description</label>
                      <textarea
                        value={pkg.description}
                        onChange={(e) => updatePackage(tierIndex, packageIndex, 'description', e.target.value)}
                        placeholder="Package description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">Package Category *</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => updatePackage(tierIndex, packageIndex, 'packageCategory', 'pass')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            pkg.packageCategory === 'pass'
                              ? 'bg-[#3258A3] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pkg.packageCategory === 'pass' && <span>✓</span>}
                          Private Lessons
                        </button>
                        <button
                          onClick={() => updatePackage(tierIndex, packageIndex, 'packageCategory', 'class')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            pkg.packageCategory === 'class'
                              ? 'bg-[#3258A3] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pkg.packageCategory === 'class' && <span>✓</span>}
                          Group Classes
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Type (use_underscores)</label>
                        <input
                          type="text"
                          value={pkg.packageType}
                          onChange={(e) => updatePackage(tierIndex, packageIndex, 'packageType', e.target.value.toLowerCase())}
                          placeholder="e.g., private"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Passes</label>
                        <input
                          type="number"
                          value={pkg.lessonCount}
                          onChange={(e) => updatePackage(tierIndex, packageIndex, 'lessonCount', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Price ($)</label>
                        <input
                          type="number"
                          value={(pkg.priceInCents / 100).toFixed(2)}
                          onChange={(e) => updatePackage(tierIndex, packageIndex, 'priceInCents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={() => addPackage(tierIndex)}
                  variant="outline"
                  className="w-full border-dashed border-2 py-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={addTier}
            variant="outline"
            className="w-full border-dashed border-2 py-8"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Tier
          </Button>

          <Button
            onClick={savePricingStructure}
            disabled={saving || tiers.length === 0}
            className="w-full bg-[#3258A3] hover:bg-[#2a4a8a] text-white py-6 text-lg"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Pricing Structure'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
