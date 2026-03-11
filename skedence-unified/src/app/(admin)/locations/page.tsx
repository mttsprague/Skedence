'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MapPin, Plus, Edit2, Trash2, X, AlertCircle, Building2, Crown } from 'lucide-react';
import { Location } from '@/types/location';
import { logLocationCreated, logLocationUpdated, logLocationDeleted } from '@/lib/activity-logger';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { toast } from '@/lib/toast';

type SubscriptionTier = 'starter' | 'studio' | 'academy' | 'enterprise';

interface Organization {
  id: string;
  subscriptionTier?: SubscriptionTier;
}

const LOCATION_LIMITS: Record<SubscriptionTier, number | null> = {
  starter: 1,
  studio: 3,
  academy: 10,
  enterprise: null, // unlimited
};

const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  studio: 'Studio',
  academy: 'Academy',
  enterprise: 'Enterprise',
};

export default function LocationsPage() {
  const { orgId, user, userData } = useAuthHook();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Load organization and locations
  useEffect(() => {
    if (!orgId) return;

    async function loadData() {
      if (!orgId) return; // Additional check for TypeScript
      
      try {
        // Load organization to get subscription tier from billing.plan
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          const billingData = orgData.billing;
          let tier: SubscriptionTier = 'starter';
          
          // Get plan from billing.plan field (matches admin app structure)
          if (billingData && billingData.plan) {
            const plan = billingData.plan.toLowerCase();
            if (plan === 'studio' || plan === 'academy' || plan === 'enterprise') {
              tier = plan as SubscriptionTier;
            }
          }
          
          console.log('Locations: Loaded org billing plan:', tier);
          
          setOrganization({
            id: orgDoc.id,
            subscriptionTier: tier,
          });
        }

        // Load locations
        const locationsQuery = query(
          collection(db, 'locations'),
          where('orgId', '==', orgId),
          where('isActive', '==', true)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Location[];
        setLocations(locationsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  const subscriptionTier = organization?.subscriptionTier || 'starter';
  const locationLimit = LOCATION_LIMITS[subscriptionTier];
  const canAddLocation = locationLimit === null || locations.length < locationLimit;

  const resetForm = () => {
    setForm({
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setEditingLocation(null);
    setShowForm(false);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setForm({
      name: location.name,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2 || '',
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
    });
    setShowForm(true);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    const locationToDelete = locations.find(loc => loc.id === locationId);
    if (!locationToDelete) return;

    try {
      // Soft delete by setting isActive to false
      await updateDoc(doc(db, 'locations', locationId), {
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      // Log activity
      if (user && userData) {
        await logLocationDeleted({
          orgId: orgId!,
          actorId: user.uid,
          actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
          actorRole: 'admin',
          locationId: locationId,
          locationName: locationToDelete.name,
        });
      }
      
      setLocations(locations.filter(loc => loc.id !== locationId));
      toast.success('Location deleted successfully');
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location', 'Please try again');
    }
  };

  // Helper function to sanitize location name for use as document ID
  const sanitizeLocationId = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace hyphens with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setSaving(true);
    try {
      const locationData = {
        name: form.name,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || '',
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        orgId,
        isActive: true,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (editingLocation) {
        // Update existing location
        await updateDoc(doc(db, 'locations', editingLocation.id), locationData);
        
        // CASCADE UPDATE: Update location name in all schedules, bookings, and classes
        const oldLocationName = editingLocation.name;
        const newLocationName = form.name;
        
        if (oldLocationName !== newLocationName) {
          console.log(`📍 Cascading location update from "${oldLocationName}" to "${newLocationName}"`);
          
          // Update all trainer schedules with this location
          const trainersQuery = query(
            collection(db, 'trainers'),
            where('orgId', '==', orgId),
            where('active', '==', true)
          );
          const trainersSnap = await getDocs(trainersQuery);
          
          let schedulesUpdated = 0;
          for (const trainerDoc of trainersSnap.docs) {
            const schedulesQuery = query(
              collection(db, 'trainers', trainerDoc.id, 'schedules'),
              where('location', '==', oldLocationName)
            );
            const schedulesSnap = await getDocs(schedulesQuery);
            
            for (const scheduleDoc of schedulesSnap.docs) {
              await updateDoc(scheduleDoc.ref, { location: newLocationName });
              schedulesUpdated++;
            }
          }
          console.log(`✅ Updated ${schedulesUpdated} schedule slots`);
          
          // Update all bookings with this location
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('orgId', '==', orgId),
            where('location', '==', oldLocationName)
          );
          const bookingsSnap = await getDocs(bookingsQuery);
          let bookingsUpdated = 0;
          for (const bookingDoc of bookingsSnap.docs) {
            await updateDoc(bookingDoc.ref, { location: newLocationName });
            bookingsUpdated++;
          }
          console.log(`✅ Updated ${bookingsUpdated} bookings`);
          
          // Update all classes with this location
          const classesQuery = query(
            collection(db, 'classes'),
            where('orgId', '==', orgId),
            where('location', '==', oldLocationName)
          );
          const classesSnap = await getDocs(classesQuery);
          let classesUpdated = 0;
          for (const classDoc of classesSnap.docs) {
            await updateDoc(classDoc.ref, { location: newLocationName });
            classesUpdated++;
          }
          console.log(`✅ Updated ${classesUpdated} classes`);
          
          const totalUpdates = schedulesUpdated + bookingsUpdated + classesUpdated;
          if (totalUpdates > 0) {
            toast.success(`Location updated in ${totalUpdates} places`, `Updated ${schedulesUpdated} schedules, ${bookingsUpdated} bookings, and ${classesUpdated} classes`);
          }
        }
        
        // Log activity
        if (user && userData) {
          const fullAddress = `${form.addressLine1}, ${form.city}, ${form.state} ${form.zipCode}`;
          await logLocationUpdated({
            orgId: orgId,
            actorId: user.uid,
            actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
            actorRole: 'admin',
            locationId: editingLocation.id,
            locationName: form.name,
            address: fullAddress,
          });
        }
        
        // Reload locations
        const locationsQuery = query(
          collection(db, 'locations'),
          where('orgId', '==', orgId),
          where('isActive', '==', true)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Location[];
        setLocations(locationsData);
      } else {
        // Add new location with name-based ID
        const locationId = sanitizeLocationId(form.name);
        await setDoc(doc(db, 'locations', locationId), {
          ...locationData,
          createdAt: Timestamp.fromDate(new Date()),
        });
        
        // Log activity
        if (user && userData) {
          const fullAddress = `${form.addressLine1}, ${form.city}, ${form.state} ${form.zipCode}`;
          await logLocationCreated({
            orgId: orgId,
            actorId: user.uid,
            actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Unknown',
            actorRole: 'owner',
            locationId: locationId,
            locationName: form.name,
            address: fullAddress,
          });
        }
        
        // Mark "Configure Business Settings" as complete in onboarding checklist
        try {
          const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
          const onboardingDoc = await getDoc(onboardingRef);
          const currentProgress = onboardingDoc.exists() ? onboardingDoc.data() : {};
          await setDoc(onboardingRef, { ...currentProgress, hasSettings: true }, { merge: true });
        } catch (error) {
          // Silent fail - onboarding step not critical
        }
        
        setLocations([...locations, {
          id: locationId,
          ...locationData,
          createdAt: Timestamp.fromDate(new Date()),
        }]);
      }

      resetForm();
      toast.success(editingLocation ? 'Location updated successfully' : 'Location created successfully');
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location', 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BusinessSettingsSubmenu>
        <div className="p-6 lg:p-8 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-5 w-64" />
          </div>
          
          {/* Location cards skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BusinessSettingsSubmenu>
    );
  }

  return (
    <BusinessSettingsSubmenu>
      <div className="space-y-6 p-6 lg:p-8">
        {/* Header with subscription info */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Locations</h1>
            <p className="text-foreground/80 mt-1">Manage your business locations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Crown className="w-4 h-4 text-primary" />
              <div className="text-sm">
                <div className="font-semibold text-foreground">{TIER_DISPLAY_NAMES[subscriptionTier]}</div>
                <div className="text-foreground/80">
                  {locations.length} / {locationLimit === null ? '∞' : locationLimit} locations
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location limit warning */}
        {!canAddLocation && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Location Limit Reached</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You've reached the maximum number of locations for your {TIER_DISPLAY_NAMES[subscriptionTier]} plan.
                    Upgrade to add more locations.
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-amber-800">
                    <div>• <strong>Studio:</strong> Up to 3 locations</div>
                    <div>• <strong>Academy:</strong> Up to 10 locations</div>
                    <div>• <strong>Enterprise:</strong> Unlimited locations</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locations Grid */}
        {locations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="pt-12 pb-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No locations yet</h3>
              <p className="text-foreground/80 mb-6">Add your first location to get started</p>
              {canAddLocation && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-[#264680]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Add Location Button */}
            {canAddLocation && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-[#264680] w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            )}

            {/* Locations List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <Card key={location.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(location)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-foreground/80" />
                        </button>
                        <button
                          onClick={() => handleDelete(location.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-foreground/80">
                      <p>{location.addressLine1}</p>
                      {location.addressLine2 && <p>{location.addressLine2}</p>}
                      <p>{location.city}, {location.state} {location.zipCode}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {editingLocation ? 'Edit Location' : 'Add New Location'}
                  </CardTitle>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Main Studio, North Campus, etc."
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={form.addressLine1}
                      onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                      required
                      placeholder="123 Main Street"
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={form.addressLine2}
                      onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                      placeholder="Suite, Unit, Building (optional)"
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                        required
                        maxLength={2}
                        placeholder="CA"
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      required
                      maxLength={10}
                      placeholder="12345"
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={resetForm}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-primary hover:bg-[#264680]"
                    >
                      {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </BusinessSettingsSubmenu>
  );
}
