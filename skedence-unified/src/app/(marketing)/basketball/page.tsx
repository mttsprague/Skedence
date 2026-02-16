import type { Metadata } from 'next';
import VerticalLanding from '@/components/marketing/vertical-landing';

export const metadata: Metadata = {
  title: 'Basketball Scheduling Software | Skedence',
  description: 'Skedence is basketball scheduling software for trainers. Sell packages, fill your calendar, and get paid online.',
  keywords: [
    'basketball scheduling software',
    'basketball booking system',
    'basketball training packages',
    'basketball trainer app',
    'basketball lesson management'
  ],
  alternates: {
    canonical: 'https://polyface-ae6d3.web.app/basketball',
  },
  openGraph: {
    title: 'Basketball Scheduling Software | Skedence',
    description: 'Sell training packages, automate bookings, and get paid online with Skedence for basketball trainers.',
    url: 'https://polyface-ae6d3.web.app/basketball',
    siteName: 'Skedence',
    type: 'website',
  },
};

export default function BasketballPage() {
  return (
    <VerticalLanding
      sportName="Basketball"
      headline="Built for basketball trainers"
      subheadline="Sell packages, fill your calendar, and get paid without the admin work. Designed for private basketball training."
      primaryKeyword="basketball scheduling software"
      secondaryKeyword="basketball booking system"
      benefits={[
        {
          title: 'Package sales',
          description: 'Offer training bundles and collect payments upfront.'
        },
        {
          title: 'Clients book themselves',
          description: 'One link lets athletes book training on their own time.'
        },
        {
          title: 'Professional experience',
          description: 'Clean booking flow, confirmations, and reminders built in.'
        }
      ]}
      features={[
        {
          title: 'Private and small group sessions',
          description: 'Handle 1-on-1 sessions, small groups, and recurring clinics.'
        },
        {
          title: 'Package tracking',
          description: 'Track remaining sessions and package usage automatically.'
        },
        {
          title: 'Client notes and history',
          description: 'Store athlete notes, goals, and attendance in one place.'
        },
        {
          title: 'Mobile-first booking',
          description: 'Make it easy for athletes and parents to book on any device.'
        }
      ]}
      faqs={[
        {
          question: 'Can I sell basketball training packages online?',
          answer: 'Yes. Skedence lets you sell packages and accept payments before sessions.'
        },
        {
          question: 'Does this work for group training?',
          answer: 'Yes. You can create group sessions with capacity limits and recurring schedules.'
        },
        {
          question: 'Will athletes get reminders?',
          answer: 'Yes. Automated confirmations and reminders are included.'
        },
        {
          question: 'How quickly can I start?',
          answer: 'Most trainers can set up their booking link in under 10 minutes.'
        }
      ]}
    />
  );
}
