'use client';

import { useState } from 'react';
import {
  User, Users, Ticket, Book,
  AlertTriangle, Calendar, Clock, Award, ShieldCheck,
  RefreshCw, ShoppingCart, ChevronUp, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { LessonPackage } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPackageTypeToCategory(packageType: string): string {
  const lc = packageType.toLowerCase();
  if (lc.includes('one_athlete') || lc.includes('1_athlete') || lc === 'private') return 'oneAthlete';
  if (lc.includes('two_athlete') || lc.includes('2_athlete')) return 'twoAthlete';
  if (lc.includes('three_athlete') || lc.includes('3_athlete')) return 'threeAthlete';
  if (lc.includes('four_athlete') || lc.includes('4_athlete')) return 'fourAthlete';
  if (lc === 'class' || lc === 'classpass' || lc.includes('class')) return 'classPass';
  return packageType;
}

function isExpiringSoon(date: Date | null): boolean {
  if (!date) return false;
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  return date <= thirtyDays;
}

function tierGradient(tierName?: string): string {
  switch (tierName?.toLowerCase()) {
    case 'elite':  return 'from-yellow-500 to-yellow-700';
    case 'pro':    return 'from-blue-600 to-blue-900';
    case 'master': return 'from-purple-600 to-purple-900';
    default:       return 'from-orange-400 to-orange-600';
  }
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface PurchaseDetail {
  id: string;
  packageName: string;
  totalLessons: number;
  remainingLessons: number;
  purchaseDate: Date;
  expirationDate: Date;
  isExpired: boolean;
  tierName?: string;
}

interface CategoryGroup {
  id: string;
  displayName: string;
  isClass: boolean;
  totalRemaining: number;
  nextExpiration: Date | null;
  purchases: PurchaseDetail[];
}

// ─── Category icon ────────────────────────────────────────────────────────────

function CategoryIcon({ id }: { id: string }) {
  const props = { size: 22, className: 'text-white' };
  switch (id) {
    case 'oneAthlete':   return <User {...props} />;
    case 'twoAthlete':
    case 'threeAthlete': return <Users {...props} />;
    case 'fourAthlete':  return <Ticket {...props} />;
    case 'classPass':    return <Book {...props} />;
    default:             return <Ticket {...props} />;
  }
}

// ─── Build grouped categories (mirrors iOS buildCategoryGroups) ───────────────

function buildCategoryGroups(packages: LessonPackage[]): CategoryGroup[] {
  const now = new Date();

  type ExtendedPackage = LessonPackage & { pricingTierName?: string };

  const toPurchaseDetail = (p: ExtendedPackage): PurchaseDetail => ({
    id: p.id,
    packageName: p.packageName || p.packageType,
    totalLessons: p.totalLessons,
    remainingLessons: p.remainingLessons,
    purchaseDate: p.purchaseDate,
    expirationDate: p.expirationDate,
    isExpired: p.expirationDate < now,
    tierName: p.pricingTierName,
  });

  const minDate = (dates: Date[]): Date | null =>
    dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;

  const FIXED = [
    { id: 'oneAthlete',   displayName: 'One Athlete' },
    { id: 'twoAthlete',   displayName: 'Two Athletes' },
    { id: 'threeAthlete', displayName: 'Three Athletes' },
    { id: 'fourAthlete',  displayName: 'Four Athletes' },
  ];

  const groups: CategoryGroup[] = FIXED.map(({ id, displayName }) => {
    const purchases = (packages as ExtendedPackage[])
      .filter(p => {
        const raw = p.packageCategory || '';
        const cat = raw === 'class' ? 'classPass' : (raw || mapPackageTypeToCategory(p.packageType));
        return cat === id && p.remainingLessons > 0;
      })
      .map(toPurchaseDetail)
      .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());

    const active = purchases.filter(p => !p.isExpired);
    return {
      id,
      displayName,
      isClass: false,
      totalRemaining: active.reduce((s, p) => s + p.remainingLessons, 0),
      nextExpiration: minDate(active.map(p => p.expirationDate)),
      purchases,
    };
  });

  // Class passes — only if there are active ones
  const isClassCat = (p: ExtendedPackage) => {
    const raw = p.packageCategory || '';
    const cat = raw === 'class' ? 'classPass' : (raw || mapPackageTypeToCategory(p.packageType));
    return cat === 'classPass';
  };

  const classPurchases = (packages as ExtendedPackage[])
    .filter(p => isClassCat(p))
    .map(toPurchaseDetail)
    .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());

  const activeClassPurchases = classPurchases.filter(p => !p.isExpired && p.remainingLessons > 0);
  if (classPurchases.length > 0) {
    groups.push({
      id: 'classPass',
      displayName: 'Class Passes',
      isClass: true,
      totalRemaining: activeClassPurchases.reduce((s, p) => s + p.remainingLessons, 0),
      nextExpiration: minDate(activeClassPurchases.map(p => p.expirationDate)),
      purchases: classPurchases,
    });
  }

  return groups;
}

// ─── Purchase detail row (mirrors iOS purchaseDetailRow) ─────────────────────

function PurchaseDetailRow({ purchase }: { purchase: PurchaseDetail }) {
  return (
    <div className={`py-3 ${purchase.isExpired ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-gray-900">{purchase.packageName}</span>
        {purchase.isExpired && (
          <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-wide">
            Expired
          </span>
        )}
      </div>

      {purchase.tierName ? (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md mb-2 bg-gradient-to-r ${tierGradient(purchase.tierName)}`}>
          <Award size={11} className="text-white" />
          <span className="text-xs font-semibold text-white">{purchase.tierName}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md mb-2 bg-gradient-to-r from-green-500 to-green-600">
          <ShieldCheck size={11} className="text-white" />
          <span className="text-xs font-semibold text-white">Universal Pass</span>
          <span className="text-[10px] text-green-100">· Works with all trainers</span>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Ticket size={11} />
          {purchase.remainingLessons} of {purchase.totalLessons} remaining
        </span>
        <span className="flex items-center gap-1 text-gray-400">
          <Calendar size={11} />
          Purchased {format(purchase.purchaseDate, 'MMM d, yyyy')}
        </span>
      </div>

      <div className={`flex items-center gap-1 text-xs mt-1 ${purchase.isExpired ? 'text-red-500' : 'text-gray-400'}`}>
        {purchase.isExpired ? <AlertTriangle size={11} /> : <Clock size={11} />}
        Expires {format(purchase.expirationDate, 'MMM d, yyyy')}
      </div>
    </div>
  );
}

// ─── Category card (mirrors iOS categoryCard — collapsible) ───────────────────

function CategoryCard({ group }: { group: CategoryGroup }) {
  const [expanded, setExpanded] = useState(false);
  const expiring = isExpiringSoon(group.nextExpiration);

  const iconBg = group.isClass
    ? 'bg-gradient-to-br from-pva-orange to-orange-600'
    : 'bg-gradient-to-br from-pva-navy to-blue-900';
  const accentText = group.isClass ? 'text-pva-orange' : 'text-pva-navy';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
      <button
        className="w-full flex items-center gap-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <CategoryIcon id={group.id} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{group.displayName}</div>
          {group.totalRemaining > 0 ? (
            <>
              <div className="flex items-center gap-1 text-green-600 text-xs font-medium mt-0.5">
                <Ticket size={11} />
                {group.totalRemaining} remaining
              </div>
              {group.nextExpiration && (
                <div className={`flex items-center gap-1 text-xs mt-0.5 ${expiring ? 'text-orange-500' : 'text-gray-400'}`}>
                  {expiring ? <AlertTriangle size={10} /> : <Calendar size={10} />}
                  Next expires {format(group.nextExpiration, 'MMM d, yyyy')}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-400 mt-0.5">No active passes</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-4xl font-black leading-none ${group.totalRemaining > 0 ? accentText : 'text-gray-200'}`}>
            {group.totalRemaining}
          </span>
          {expanded
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-1 divide-y divide-gray-50">
          {group.purchases.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No passes in this category</p>
          ) : (
            group.purchases.map(p => <PurchaseDetailRow key={p.id} purchase={p} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

/** Main passes view — mirrors iOS PassesTab with category cards. */
export function PassesView({ passes, onRefresh }: { passes: LessonPackage[]; onRefresh: () => void }) {
  const groups = buildCategoryGroups(passes);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-pva-navy" />
          <span className="text-xs text-gray-500">Athlete Passes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-pva-orange" />
          <span className="text-xs text-gray-500">Class Passes</span>
        </div>
      </div>

      {/* Refresh + Purchase buttons */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={onRefresh}
          className="w-12 h-12 rounded-xl bg-pva-navy flex items-center justify-center flex-shrink-0 hover:bg-pva-teal transition"
          aria-label="Refresh passes"
        >
          <RefreshCw size={18} className="text-white" />
        </button>
        <Link
          href="/portal/buy-passes"
          className="flex-1 flex items-center justify-center gap-2 bg-pva-navy text-white rounded-xl py-3 font-bold hover:bg-pva-teal transition"
        >
          <ShoppingCart size={18} />
          Purchase Passes
        </Link>
      </div>

      {/* Category cards */}
      {groups.map(g => <CategoryCard key={g.id} group={g} />)}
    </div>
  );
}

/** Compact passes widget for the dashboard — same category grouping, no full-page chrome. */
export function DashboardPassesView({ passes }: { passes: LessonPackage[] }) {
  const groups = buildCategoryGroups(passes);
  const activeGroups = groups.filter(g => g.purchases.length > 0);

  if (activeGroups.length === 0) {
    return (
      <div className="p-8 text-center">
        <Ticket size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm font-medium">No passes yet, purchase a pass to book an event!</p>
        <Link href="/portal/buy-passes" className="inline-block mt-3 text-pva-orange font-bold text-sm hover:text-pva-navy transition">
          Purchase passes →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {activeGroups.map(group => {
        const expiring = isExpiringSoon(group.nextExpiration);
        const iconBg = group.isClass
          ? 'bg-gradient-to-br from-pva-orange to-orange-600'
          : 'bg-gradient-to-br from-pva-navy to-blue-900';
        const accentText = group.isClass ? 'text-pva-orange' : 'text-pva-navy';

        return (
          <div key={group.id} className="flex items-center gap-3 px-4 py-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <CategoryIcon id={group.id} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm">{group.displayName}</div>
              {group.nextExpiration && group.totalRemaining > 0 && (
                <div className={`flex items-center gap-1 text-xs mt-0.5 ${expiring ? 'text-orange-500' : 'text-gray-400'}`}>
                  {expiring ? <AlertTriangle size={10} /> : <Clock size={10} />}
                  Exp {format(group.nextExpiration, 'MMM d, yyyy')}
                </div>
              )}
              {group.totalRemaining === 0 && (
                <div className="text-xs text-gray-400 mt-0.5">All used</div>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <span className={`text-2xl font-black leading-none ${group.totalRemaining > 0 ? accentText : 'text-gray-200'}`}>
                {group.totalRemaining}
              </span>
              <div className="text-[10px] text-gray-400 mt-0.5">remaining</div>
            </div>
          </div>
        );
      })}
      <div className="px-4 py-3">
        <Link
          href="/portal/buy-passes"
          className="flex items-center justify-center gap-2 w-full bg-pva-navy/5 hover:bg-pva-navy/10 text-pva-navy rounded-xl py-2.5 font-bold text-sm transition"
        >
          <ShoppingCart size={15} />
          Purchase Passes
        </Link>
      </div>
    </div>
  );
}

/** Kept for any residual imports. */
export default function PassCard() { return null; }
export function PassSection(_: { passes: LessonPackage[]; active: boolean }) { return null; }
