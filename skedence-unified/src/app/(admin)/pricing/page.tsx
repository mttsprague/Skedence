'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Plus, Trash2, Info } from 'lucide-react';

interface PackageOption {
  id: string;
  title: string;
  description: string;
  priceInCents: number;
  packageType: string;
  lessonCount: number;
  packageCategory: 'oneAthlete' | 'twoAthlete' | 'threeAthlete' | 'fourAthlete' | 'class';
  expirationDays: number; // Days until pass expires after purchase (e.g., 365)
  active: boolean; // Whether this package is currently available for purchase
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
            // Ensure all packages have active field (default true for backward compatibility)
            const tiersWithActive = pricingData.tiers.map((tier: PricingTier) => ({
              ...tier,
              packages: tier.packages.map((pkg: PackageOption) => ({
                ...pkg,
                active: pkg.active !== undefined ? pkg.active : true
              }))
            }));
            setTiers(tiersWithActive);
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
      packageType: '', // Will be auto-generated from title
      lessonCount: 1,
      packageCategory: 'oneAthlete',
      expirationDays: 365, // Default to 1 year
      active: true // Default to active
    });
    setTiers(newTiers);
  };

  const deletePackage = async (tierIndex: number, packageIndex: number) => {
    const packageToDelete = tiers[tierIndex].packages[packageIndex];
    
    if (!orgId || !packageToDelete.id) {
      setMessage({ type: 'error', text: 'Cannot delete package: missing organization or package ID' });
      return;
    }

    // Only allow deleting inactive packages
    if (packageToDelete.active) {
      setMessage({ type: 'error', text: 'Cannot delete active packages. Please deactivate first.' });
      return;
    }

    // Confirm deletion
    if (!confirm(`Permanently delete "${packageToDelete.title}"? This will also remove all purchased passes of this type from client accounts. This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    setMessage({ type: 'info', text: 'Deleting package and associated passes...' });

    try {
      // Call Cloud Function to delete all lesson packages purchased from this pricing package
      const functions = getFunctions();
      const deletePricingPackageLessons = httpsCallable(functions, 'deletePricingPackageLessons');
      
      const result = await deletePricingPackageLessons({
        orgId: orgId,
        packageId: packageToDelete.id
      });

      const data = result.data as { success: boolean; deletedCount: number; message: string };
      
      // Remove from local state
      const newTiers = [...tiers];
      newTiers[tierIndex].packages = newTiers[tierIndex].packages.filter((_, i) => i !== packageIndex);
      setTiers(newTiers);

      setMessage({ 
        type: 'success', 
        text: `Package permanently deleted. ${data.message}` 
      });
    } catch (error) {
      console.error('Error deleting package:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete package: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const deactivatePackage = (tierIndex: number, packageIndex: number) => {
    const packageToDeactivate = tiers[tierIndex].packages[packageIndex];
    
    if (!confirm(`Deactivate "${packageToDeactivate.title}"? This will hide it from the client app and prevent new purchases.`)) {
      return;
    }

    const newTiers = [...tiers];
    newTiers[tierIndex].packages[packageIndex].active = false;
    setTiers(newTiers);
    setMessage({ type: 'info', text: 'Package deactivated. Click Save to apply changes.' });
  };

  const reactivatePackage = (tierIndex: number, packageIndex: number) => {
    const newTiers = [...tiers];
    newTiers[tierIndex].packages[packageIndex].active = true;
    setTiers(newTiers);
    setMessage({ type: 'info', text: 'Package reactivated. Click Save to apply changes.' });
  };

  const updatePackage = (tierIndex: number, packageIndex: number, field: string, value: any) => {
    const newTiers = [...tiers];
    (newTiers[tierIndex].packages[packageIndex] as any)[field] = value;
    
    // Auto-generate packageType from title when title changes
    if (field === 'title') {
      const packageType = value.toLowerCase().replace(/\s+/g, '_');
      (newTiers[tierIndex].packages[packageIndex] as any)['packageType'] = packageType;
    }
    
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

  // Helper function to render package fields
  const renderPackageFields = (tierIndex: number, packageIndex: number, pkg: PackageOption, isActive: boolean) => {
    return (
      <>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">
            {pkg.title || `Package ${packageIndex + 1}`}
            {!isActive && <span className="ml-2 text-xs bg-gray-400 text-white px-2 py-0.5 rounded">INACTIVE</span>}
          </span>
          <div className="flex gap-2">
            {isActive ? (
              <Button
                onClick={() => deactivatePackage(tierIndex, packageIndex)}
                variant="ghost"
                size="sm"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                disabled={saving}
                title="Deactivate package"
              >
                Deactivate
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => reactivatePackage(tierIndex, packageIndex)}
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  disabled={saving}
                  title="Reactivate package"
                >
                  Reactivate
                </Button>
                <Button
                  onClick={() => deletePackage(tierIndex, packageIndex)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={saving}
                  title="Permanently delete package"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Title</label>
          <input
            type="text"
            value={pkg.title}
            onChange={(e) => updatePackage(tierIndex, packageIndex, 'title', e.target.value)}
            placeholder="e.g., 1 Athlete Private Lesson"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
            disabled={!isActive}
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
            disabled={!isActive}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Package Category *</label>
          <select
            value={pkg.packageCategory}
            onChange={(e) => updatePackage(tierIndex, packageIndex, 'packageCategory', e.target.value as PackageOption['packageCategory'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
            disabled={!isActive}
          >
            <option value="oneAthlete">1 Athlete - Private Lesson</option>
            <option value="twoAthlete">2 Athletes - Private Lesson</option>
            <option value="threeAthlete">3 Athletes - Private Lesson</option>
            <option value="fourAthlete">4 Athletes - Private Lesson</option>
            <option value="class">Group Class</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Passes</label>
            <input
              type="number"
              value={pkg.lessonCount}
              onChange={(e) => updatePackage(tierIndex, packageIndex, 'lessonCount', parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
              disabled={!isActive}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Price ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={(pkg.priceInCents / 100).toFixed(2)}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string while typing
                if (value === '') {
                  updatePackage(tierIndex, packageIndex, 'priceInCents', 0);
                  return;
                }
                // Only accept valid decimal numbers
                if (/^\d*\.?\d{0,2}$/.test(value)) {
                  const dollars = parseFloat(value) || 0;
                  updatePackage(tierIndex, packageIndex, 'priceInCents', Math.round(dollars * 100));
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
              disabled={!isActive}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Expiration (Days)</label>
          <input
            type="number"
            value={pkg.expirationDays}
            onChange={(e) => updatePackage(tierIndex, packageIndex, 'expirationDays', parseInt(e.target.value) || 365)}
            min="1"
            className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
            placeholder="365"
            disabled={!isActive}
          />
          <p className="text-xs text-gray-500 mt-1">Pass expires this many days after purchase</p>
        </div>
        
        {/* Show auto-generated type for reference */}
        {pkg.title && (
          <div className="text-xs text-gray-500 italic">
            Auto-generated type: <span className="font-mono">{pkg.packageType}</span>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <SchedulingSubmenu>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pricing...</p>
          </div>
          </div>
        </div>
      </SchedulingSubmenu>
    );
  }

  return (
    <SchedulingSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Structure</h1>
          <p className="text-gray-600 mt-1">Set up pricing tiers and package options</p>
          {tiers.length > 0 && (
            <div className="flex gap-4 mt-2">
              <p className="text-sm text-green-600 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-600"></span>
                Active: {tiers.flatMap(t => t.packages.filter(p => p.active)).length} package(s)
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-gray-400"></span>
                Inactive: {tiers.flatMap(t => t.packages.filter(p => !p.active)).length} package(s)
              </p>
            </div>
          )}
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
          {tiers.map((tier, tierIndex) => {
            const activePackages = tier.packages.filter(pkg => pkg.active);
            const inactivePackages = tier.packages.filter(pkg => !pkg.active);
            
            return (
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
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Active Packages Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-green-700">ACTIVE PRICING</h3>
                      <span className="text-xs text-gray-500">({activePackages.length})</span>
                    </div>
                    {activePackages.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No active packages</p>
                    ) : (
                      activePackages.map((pkg) => {
                        const packageIndex = tier.packages.indexOf(pkg);
                        return (
                          <div key={pkg.id} className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                            {renderPackageFields(tierIndex, packageIndex, pkg, true)}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Inactive Packages Section */}
                  {inactivePackages.length > 0 && (
                    <div className="space-y-4 pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-600">INACTIVE PRICING</h3>
                        <span className="text-xs text-gray-500">({inactivePackages.length})</span>
                      </div>
                      {inactivePackages.map((pkg) => {
                        const packageIndex = tier.packages.indexOf(pkg);
                        return (
                          <div key={pkg.id} className="p-4 bg-gray-100 border border-gray-300 rounded-lg space-y-3 opacity-75">
                            {renderPackageFields(tierIndex, packageIndex, pkg, false)}
                          </div>
                        );
                      })}
                    </div>
                  )}

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
            );
          })}

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
      </div>
    </SchedulingSubmenu>
  );
}
