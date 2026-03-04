import type { Metadata } from 'next';
import VerticalLanding from '@/components/marketing/vertical-landing';

export const metadata: Metadata = {
  title: 'Volleyball Scheduling Software | Skedence',
  description: 'Skedence is volleyball scheduling software for coaches and clubs. Sell lesson packages, automate bookings, and get paid online.',
  keywords: [
    'volleyball scheduling software',
    'volleyball booking system',
    'volleyball lesson packages',
    'volleyball coach app',
    'volleyball training management'
  ],
  alternates: {
    canonical: 'https://skedence.com/volleyball',
  },
  openGraph: {
    title: 'Volleyball Scheduling Software | Skedence',
    description: 'Sell lesson packages, automate bookings, and get paid online with Skedence for volleyball coaches.',
    url: 'https://skedence.com/volleyball',
    siteName: 'Skedence',
    type: 'website',
  },
};

export default function VolleyballPage() {
  const faqs = [
    {
      question: 'Can I sell volleyball lesson packages online?',
      answer: 'Yes. Skedence lets you create lesson packages and accept online payments before sessions.'
    },
    {
      question: 'Can parents book lessons for athletes?',
      answer: 'Yes. The booking flow is mobile-friendly and works great for parents and athletes.'
    },
    {
      question: 'Does it support group clinics?',
      answer: 'Yes. Create group classes with capacity limits and recurring schedules.'
    },
    {
      question: 'How fast can I set this up?',
      answer: 'Most coaches can create their account and share a booking link in under 10 minutes.'
    }
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <VerticalLanding
        sportName="Volleyball"
        headline="The operating system for volleyball lessons"
        subheadline="Sell lesson packages, automate scheduling, and stop chasing payments. Built for volleyball coaches, clubs, and academies."
        primaryKeyword="volleyball scheduling software"
        secondaryKeyword="volleyball booking system"
        videoUrl="https://firebasestorage.googleapis.com/v0/b/polyface-ae6d3.firebasestorage.app/o/marketing-videos%2Fvolleyball-outbound.mp4?alt=media"
        videoTitle="See Volleyball Training Management in Action"
        benefits={[
          {
            title: 'Sell lesson packages',
            description: 'Offer 5-pack and 10-pack lessons, sell online, and track usage automatically.'
          },
          {
            title: 'Self-serve booking',
            description: 'Athletes and parents book on their own with a clean, mobile-first flow.'
          },
          {
            title: 'Fewer no-shows',
            description: 'Automated confirmations and reminders reduce last-minute cancellations.'
          }
        ]}
        features={[
          {
            title: 'Private and group lesson scheduling',
            description: 'Run private lessons, small groups, and clinics with capacity controls.'
          },
          {
            title: 'Client profiles and history',
            description: 'Track lesson history, notes, and athlete progress in one place.'
          },
          {
            title: 'Packages and passes',
            description: 'Create custom packages and let athletes pay upfront.'
          },
          {
            title: 'Payments and receipts',
            description: 'Get paid online and keep payment records organized.'
          }
        ]}
        faqs={faqs}
      />
    </>
  );
}
