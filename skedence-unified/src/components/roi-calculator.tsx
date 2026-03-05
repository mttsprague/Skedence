'use client';

import { useState, useEffect } from 'react';
import { Calculator, Clock, DollarSign, TrendingUp } from 'lucide-react';

export default function ROICalculator() {
  const [currentSpending, setCurrentSpending] = useState(0);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [missedBookings, setMissedBookings] = useState(2);

  // Calculations
  const monthlyToolCost = currentSpending;
  const monthlyTimeCost = (hoursPerWeek * 4.33) * hourlyRate; // 4.33 weeks per month
  const monthlyMissedRevenue = missedBookings * 80; // Avg $80 per session
  const totalMonthlyCost = monthlyToolCost + monthlyTimeCost + monthlyMissedRevenue;
  
  const skedenceCost = 99; // Studio plan
  const monthlySavings = totalMonthlyCost - skedenceCost;
  const yearlySavings = monthlySavings * 12;
  const roi = skedenceCost > 0 ? ((monthlySavings / skedenceCost) * 100) : 0;

  return (
    <div className="premium-card p-10 lg:p-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-3xl font-black text-foreground uppercase tracking-tight">Calculate Your Savings</h3>
        <p className="text-foreground/60">See how much time and money you could save with Skedence</p>
      </div>

      <div className="space-y-6">
        {/* Current Tool Spending */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
            <DollarSign className="w-4 h-4 text-primary" />
            Current monthly spending on tools
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">$</span>
            <input
              type="number"
              value={currentSpending}
              onChange={(e) => setCurrentSpending(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-xl px-4 pl-8 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              min="0"
            />
          </div>
          <p className="text-xs text-foreground/40">Mindbody, Acuity, scheduling tools, etc.</p>
        </div>

        {/* Hours per week */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
            <Clock className="w-4 h-4 text-primary" />
            Hours per week on admin tasks
          </label>
          <input
            type="range"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            min="0"
            max="20"
            step="1"
          />
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">{hoursPerWeek} hours</span>
            <span className="text-foreground/40">Manual scheduling, payments, follow-ups</span>
          </div>
        </div>

        {/* Hourly rate */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-primary" />
            Your hourly rate / value of time
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">$</span>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-xl px-4 pl-8 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="50"
              min="0"
            />
          </div>
          <p className="text-xs text-foreground/40">What you charge per hour or value your time at</p>
        </div>

        {/* Missed bookings */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
            Missed bookings per month
          </label>
          <input
            type="range"
            value={missedBookings}
            onChange={(e) => setMissedBookings(Number(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            min="0"
            max="10"
            step="1"
          />
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">{missedBookings} bookings</span>
            <span className="text-foreground/40">Due to scheduling issues, no-shows</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="border-t border-border pt-8 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-start text-sm">
            <span className="text-foreground/60">Tool costs</span>
            <span className="text-foreground font-mono">${monthlyToolCost.toFixed(0)}/mo</span>
          </div>
          <div className="flex justify-between items-start text-sm">
            <span className="text-foreground/60">Time costs ({hoursPerWeek}h × ${hourlyRate}/h)</span>
            <span className="text-foreground font-mono">${monthlyTimeCost.toFixed(0)}/mo</span>
          </div>
          <div className="flex justify-between items-start text-sm">
            <span className="text-foreground/60">Lost revenue ({missedBookings} missed)</span>
            <span className="text-foreground font-mono">${monthlyMissedRevenue.toFixed(0)}/mo</span>
          </div>
          <div className="flex justify-between items-start text-sm border-t border-border pt-3">
            <span className="text-foreground font-bold">Total monthly cost</span>
            <span className="text-foreground font-bold font-mono">${totalMonthlyCost.toFixed(0)}/mo</span>
          </div>
        </div>

        {monthlySavings > 0 ? (
          <>
            <div className="bg-primary/10 border-2 border-primary rounded-xl p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-foreground/60 uppercase tracking-wider font-bold mb-2">Your Monthly Savings</p>
                <p className="text-5xl font-black text-primary">${monthlySavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                <p className="text-sm text-foreground/60 mt-2">with Skedence Studio ($99/mo)</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/20">
                <div className="text-center">
                  <p className="text-xs text-foreground/50 uppercase tracking-wider mb-1">Yearly Savings</p>
                  <p className="text-2xl font-bold text-primary">${yearlySavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-foreground/50 uppercase tracking-wider mb-1">ROI</p>
                  <p className="text-2xl font-bold text-primary">{roi.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-foreground/60">
                That&apos;s enough to hire a new trainer or expand your services
              </p>
              <a href="#pricing" className="btn-premium inline-flex items-center gap-2">
                See Full Pricing
              </a>
            </div>
          </>
        ) : (
          <div className="bg-muted/20 border border-border rounded-xl p-6 text-center">
            <p className="text-foreground/60">Even with your current setup, Skedence at $99/mo provides:</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70 text-left max-w-xs mx-auto">
              <li>✓ Automated scheduling (save {hoursPerWeek}h/week)</li>
              <li>✓ Built-in payment processing</li>
              <li>✓ Mobile apps for you and clients</li>
              <li>✓ Professional client management</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
