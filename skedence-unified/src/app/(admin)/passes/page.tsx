'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Package, ChevronDown, ChevronUp, Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ClientPass {
  id: string;
  clientId: string;
  clientName: string;
  packageType: string;
  packageCategory: string;
  packageName: string;
  totalLessons: number;
  lessonsUsed: number;
  remainingLessons: number;
  purchaseDate: Date;
  expirationDate: Date;
  isExpired: boolean;
}

interface CategoryGroup {
  category: string;
  displayName: string;
  totalRemaining: number;
  nextExpiration: Date | null;
  passes: ClientPass[];
  isFixed: boolean; // true for 1-4 athlete categories
}

// Fixed category definitions
const FIXED_CATEGORIES = [
  { id: 'oneAthlete', name: 'One Athlete' },
  { id: 'twoAthlete', name: 'Two Athletes' },
  { id: 'threeAthlete', name: 'Three Athletes' },
  { id: 'fourAthlete', name: 'Four Athletes' },
];

function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'oneAthlete':
      return 'One Athlete';
    case 'twoAthlete':
      return 'Two Athletes';
    case 'threeAthlete':
      return 'Three Athletes';
    case 'fourAthlete':
      return 'Four Athletes';
    default:
      // For class passes, use the category name as-is (capitalized)
      return category.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
  }
}

export default function PassesPage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!orgId) return;

    async function loadAllPasses() {
      try {
        if (!orgId) return;

        // Load all clients
        const membersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId),
          where('role', '==', 'client'),
          where('isActive', '==', true)
        );
        const membersSnap = await getDocs(membersQuery);

        // Load passes for all clients
        const allPasses: ClientPass[] = [];
        const now = new Date();

        for (const memberDoc of membersSnap.docs) {
          const memberData = memberDoc.data();
          const userId = memberData.userId;

          if (!userId) continue;

          try {
            // Load user data for name
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (!userDoc.exists()) continue;

            const userData = userDoc.data();
            const clientName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

            // Try new organization path first
            let packagesSnap = await getDocs(
              collection(db, 'organizations', orgId, 'users', userId, 'packages')
            );

            // Fall back to old path if no packages found
            if (packagesSnap.empty) {
              packagesSnap = await getDocs(
                collection(db, 'users', userId, 'lessonPackages')
              );
            }

            // Process each package
            packagesSnap.docs.forEach(pkgDoc => {
              const data = pkgDoc.data();
              const purchaseDate = data.purchaseDate?.toDate?.() || new Date();
              const expirationDate = data.expirationDate?.toDate?.() || new Date();
              const isExpired = expirationDate < now;
              const remainingLessons = (data.totalLessons || 0) - (data.lessonsUsed || 0);

              allPasses.push({
                id: pkgDoc.id,
                clientId: userId,
                clientName,
                packageType: data.packageType || '',
                packageCategory: data.packageCategory || 'pass',
                packageName: data.packageName || data.packageType || 'Pass',
                totalLessons: data.totalLessons || 0,
                lessonsUsed: data.lessonsUsed || 0,
                remainingLessons,
                purchaseDate,
                expirationDate,
                isExpired,
              });
            });
          } catch (err) {
            console.warn('Error loading passes for user', userId, err);
          }
        }

        // Group passes by category
        const categoryMap = new Map<string, ClientPass[]>();
        
        allPasses.forEach(pass => {
          const category = pass.packageCategory;
          if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
          }
          categoryMap.get(category)!.push(pass);
        });

        // Build category groups
        const groups: CategoryGroup[] = [];

        // Add fixed categories (always show, even if empty)
        FIXED_CATEGORIES.forEach(fixedCat => {
          const passes = categoryMap.get(fixedCat.id) || [];
          const activePasses = passes.filter(p => !p.isExpired);
          const totalRemaining = activePasses.reduce((sum, p) => sum + p.remainingLessons, 0);
          
          // Find next expiration among active passes
          const nextExpiration = activePasses.length > 0
            ? activePasses.reduce((earliest, p) => 
                !earliest || p.expirationDate < earliest ? p.expirationDate : earliest, 
                null as Date | null
              )
            : null;

          groups.push({
            category: fixedCat.id,
            displayName: fixedCat.name,
            totalRemaining,
            nextExpiration,
            passes: passes.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()),
            isFixed: true,
          });
        });

        // Add dynamic class categories (only if they have passes)
        Array.from(categoryMap.keys())
          .filter(cat => !FIXED_CATEGORIES.some(fc => fc.id === cat))
          .forEach(category => {
            const passes = categoryMap.get(category) || [];
            const activePasses = passes.filter(p => !p.isExpired);
            const totalRemaining = activePasses.reduce((sum, p) => sum + p.remainingLessons, 0);
            
            const nextExpiration = activePasses.length > 0
              ? activePasses.reduce((earliest, p) => 
                  !earliest || p.expirationDate < earliest ? p.expirationDate : earliest, 
                  null as Date | null
                )
              : null;

            if (passes.length > 0) {
              groups.push({
                category,
                displayName: getCategoryDisplayName(category),
                totalRemaining,
                nextExpiration,
                passes: passes.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()),
                isFixed: false,
              });
            }
          });

        setCategoryGroups(groups);
      } catch (error) {
        console.error('Error loading passes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAllPasses();
  }, [orgId]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <BusinessSettingsSubmenu>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </BusinessSettingsSubmenu>
    );
  }

  return (
    <BusinessSettingsSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Passes Overview</h1>
            <p className="text-gray-600 mt-1">
              View all client passes organized by category
            </p>
          </div>

          {categoryGroups.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Passes Yet</h3>
                  <p className="text-gray-600">
                    No clients have purchased passes yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {categoryGroups.map(group => {
                const isExpanded = expandedCategories.has(group.category);
                const hasActivePasses = group.totalRemaining > 0;

                return (
                  <Card key={group.category} className="overflow-hidden">
                    {/* Category Header - Clickable */}
                    <button
                      onClick={() => toggleCategory(group.category)}
                      className="w-full"
                    >
                      <CardHeader className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                              <CardTitle className="text-xl">{group.displayName}</CardTitle>
                              {hasActivePasses ? (
                                <p className="text-sm text-gray-600 mt-1">
                                  {group.totalRemaining} pass{group.totalRemaining === 1 ? '' : 'es'} remaining
                                  {group.nextExpiration && (
                                    <span className="ml-2">
                                      · Next expires {format(group.nextExpiration, 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500 mt-1">No active passes</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasActivePasses && (
                              <div className="text-right mr-4">
                                <div className="text-3xl font-bold text-primary">
                                  {group.totalRemaining}
                                </div>
                                <div className="text-xs text-gray-500">total remaining</div>
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <CardContent className="border-t">
                        {group.passes.length === 0 ? (
                          <div className="py-8 text-center text-gray-500">
                            <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No passes in this category</p>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {group.passes.map(pass => (
                              <div
                                key={pass.id}
                                className={`py-4 ${pass.isExpired ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <span className="font-semibold text-gray-900">
                                        {pass.clientName}
                                      </span>
                                      {pass.isExpired && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                          Expired
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="ml-6 space-y-1 text-sm">
                                      <div className="flex items-center gap-2 text-gray-700">
                                        <Package className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="font-medium">{pass.packageName}</span>
                                        <span className="text-gray-500">
                                          · {pass.remainingLessons} of {pass.totalLessons} remaining
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-4 text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                                          <span>Purchased {format(pass.purchaseDate, 'MMM d, yyyy')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className={`h-3.5 w-3.5 ${pass.isExpired ? 'text-red-400' : 'text-gray-400'}`} />
                                          <span className={pass.isExpired ? 'text-red-600 font-medium' : ''}>
                                            Expires {format(pass.expirationDate, 'MMM d, yyyy')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right ml-4">
                                    <div className={`text-2xl font-bold ${pass.isExpired ? 'text-gray-400' : 'text-primary'}`}>
                                      {pass.remainingLessons}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      of {pass.totalLessons}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BusinessSettingsSubmenu>
  );
}
