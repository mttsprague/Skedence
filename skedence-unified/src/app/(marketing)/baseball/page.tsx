import type { Metadata } from 'next';
import VerticalLanding from '@/components/marketing/vertical-landing';

export const metadata: Metadata = {
  title: 'Baseball Scheduling Software | Skedence',
  description: 'Skedence is baseball scheduling software for coaches. Sell lesson packages, automate booking, and manage payments.',
  keywords: [
    'baseball scheduling software',
    'baseball booking system',
    'baseball lesson packages',
    'baseball coach app',
    'baseball training management'
  ],
  alternates: {
    canonical: 'https://polyface-ae6d3.web.app/baseball',
  },
  openGraph: {
    title: 'Baseball Scheduling Software | Skedence',
    description: 'Sell lesson packages, automate booking, and get paid online with Skedence for baseball coaches.',
    url: 'https://polyface-ae6d3.web.app/baseball',
    siteName: 'Skedence',
    type: 'website',
  },
};

export default function BaseballPage() {
  return (
    <VerticalLanding
      sportName="Baseball"
      headline="The booking system for baseball coaches"
      subheadline="Sell lesson packages, automate scheduling, and stop chasing payments. Built for baseball training businesses."
      primaryKeyword="baseball scheduling software"
      secondaryKeyword="baseball booking system"
      benefits={[
        {
          title: 'Sell lesson packages',
          description: 'Offer 5-pack, 10-pack, or monthly training packages.'
        },
        {
          title: 'Automated booking',
          description: 'Players and parents book online without back-and-forth texts.'
        },
        {
          title: 'Less admin time',
          description: 'Reminders and confirmations keep everyone on track.'
        }
      ]}
      features={[
        {
          title: 'Packages and pass tracking',
          description: 'Track package usage and remaining lessons automatically.'
        },
        {
          title: 'Group clinics',
          description: 'Create clinics and manage capacity with ease.'
        },
        {
          title: 'Player profiles',
          description: 'Store lesson notes, goals, and attendance history.'
        },
        {
          title: 'Parent-friendly booking',
          description: 'Mobile-first booking flow built for parents and athletes.'
        }
      ]}
      faqs={[
        {
          question: 'Can I sell baseball lesson packages online?',
          answer: 'Yes. Skedence makes it easy to sell packages and collect payment upfront.'
        },
        {
          question: 'Does it work for clinics and group lessons?',
          answer: 'Yes. You can create clinics with capacity limits and recurring schedules.'
        },
        {
          question: 'Can parents book lessons for athletes?',
          answer: 'Yes. The booking experience is designed to be simple for parents.'
        },
        {
          question: 'How quickly can I get started?',
          answer: 'Most coaches can be up and running in less than 10 minutes.'
        }
      ]}
    />
  );
}
