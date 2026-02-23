'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Minus } from 'lucide-react';

export interface PlanFeature {
  name: string;
  free?: boolean | string;
  starter?: boolean | string;
  studio?: boolean | string;
  academy?: boolean | string;
  enterprise?: boolean | string;
}

const comparisonFeatures: PlanFeature[] = [
  {
    name: 'Price',
    free: 'Free',
    starter: '$29/mo',
    studio: '$99/mo',
    academy: '$249/mo',
    enterprise: '$499/mo',
  },
  {
    name: 'Max Trainers',
    free: '1',
    starter: '3',
    studio: '10',
    academy: '30',
    enterprise: 'Unlimited',
  },
  {
    name: 'Max Clients',
    free: '10',
    starter: '50',
    studio: '200',
    academy: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    name: 'Locations',
    free: '1',
    starter: '2',
    studio: '5',
    academy: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    name: 'Scheduling & Bookings',
    free: true,
    starter: true,
    studio: true,
    academy: true,
    enterprise: true,
  },
  {
    name: 'Client Packages',
    free: true,
    starter: true,
    studio: true,
    academy: true,
    enterprise: true,
  },
  {
    name: 'Payment Processing',
    free: true,
    starter: true,
    studio: true,
    academy: true,
    enterprise: true,
  },
  {
    name: 'Reports & Analytics',
    free: false,
    starter: true,
    studio: true,
    academy: true,
    enterprise: true,
  },
  {
    name: 'User Analytics',
    free: false,
    starter: false,
    studio: true,
    academy: true,
    enterprise: true,
  },
  {
    name: 'Email Notifications',
    free: false,
    starter: true,
    studio: true,
    academy: true,
    enterprise: true,
  },
  {
    name: 'Custom Branding',
    free: false,
    starter: false,
    studio: false,
    academy: true,
    enterprise: true,
  },
  {
    name: 'White-Label',
    free: false,
    starter: false,
    studio: false,
    academy: false,
    enterprise: true,
  },
  {
    name: 'API Access',
    free: false,
    starter: false,
    studio: false,
    academy: false,
    enterprise: true,
  },
  {
    name: 'Support',
    free: 'Community',
    starter: 'Email',
    studio: 'Priority',
    academy: 'Dedicated',
    enterprise: 'White Glove',
  },
];

function renderFeatureValue(value: boolean | string | undefined) {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-600 mx-auto" />;
  } else if (value === false) {
    return <X className="h-5 w-5 text-gray-300 mx-auto" />;
  } else if (value === undefined) {
    return <Minus className="h-5 w-5 text-gray-300 mx-auto" />;
  } else {
    return <span className="text-sm font-medium text-center block">{value}</span>;
  }
}

export function PlanComparison() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-4 font-semibold text-sm">Feature</th>
                <th className="text-center p-4 font-semibold text-sm w-32">Free</th>
                <th className="text-center p-4 font-semibold text-sm w-32">Starter</th>
                <th className="text-center p-4 font-semibold text-sm w-32 bg-blue-50">
                  <div className="flex flex-col items-center gap-1">
                    <span>Studio</span>
                    <span className="text-xs font-normal text-blue-600">Popular</span>
                  </div>
                </th>
                <th className="text-center p-4 font-semibold text-sm w-32">Academy</th>
                <th className="text-center p-4 font-semibold text-sm w-32">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((feature, idx) => (
                <tr
                  key={feature.name}
                  className={`border-b transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } hover:bg-blue-50/30`}
                >
                  <td className="p-4 text-sm font-medium text-foreground/80">
                    {feature.name}
                  </td>
                  <td className="p-4">{renderFeatureValue(feature.free)}</td>
                  <td className="p-4">{renderFeatureValue(feature.starter)}</td>
                  <td className="p-4 bg-blue-50/30">{renderFeatureValue(feature.studio)}</td>
                  <td className="p-4">{renderFeatureValue(feature.academy)}</td>
                  <td className="p-4">{renderFeatureValue(feature.enterprise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
