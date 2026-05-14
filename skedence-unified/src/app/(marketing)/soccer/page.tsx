import type { Metadata } from 'next';
import VerticalLanding from '@/components/marketing/vertical-landing';

export const metadata: Metadata = {
  title: 'Soccer Scheduling Software | Skedence',
  description: 'Skedence is soccer scheduling software for trainers. Sell packages, automate bookings, and manage payments online.',
  keywords: [
    'soccer scheduling software',
    'soccer booking system',
    'soccer training packages',
    'soccer coach app',
    'soccer lesson management'
  ],
  alternates: {
    canonical: 'https://skedence.com/soccer',
  },
  openGraph: {
    title: 'Soccer Scheduling Software | Skedence',
    description: 'Sell training packages, automate bookings, and get paid online with Skedence for soccer trainers.',
    url: 'https://skedence.com/soccer',
    siteName: 'Skedence',
    type: 'website',
    images: [{ url: 'https://skedence.com/og-soccer.png', width: 1200, height: 630, alt: 'Soccer Scheduling Software - Skedence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soccer Scheduling Software | Skedence',
    description: 'Sell training packages, automate bookings, and get paid online with Skedence for soccer trainers.',
    images: ['https://skedence.com/og-soccer.png'],
  },
};

export default function SoccerPage() {
  const faqs = [
    {
      question: 'Can I sell soccer training packages online?',
      answer: 'Yes. Skedence lets you create packages and accept payment upfront.'
    },
    {
      question: 'Is this for private and group sessions?',
      answer: 'Yes. You can run private lessons, group training, and clinics.'
    },
    {
      question: 'Will players get reminders?',
      answer: 'Yes. Automated reminders are built in to reduce no-shows.'
    },
    {
      question: 'How fast can I launch?',
      answer: 'Most trainers can set up their booking link in under 10 minutes.'
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
        sportName="Soccer"
        headline="Soccer Scheduling Software for Coaches & Clubs"
        subheadline="Sell packages, automate bookings, and get paid without the chaos. Built for soccer trainers and clubs."
        primaryKeyword="soccer scheduling software"
        secondaryKeyword="soccer booking system"
        videoUrl="https://firebasestorage.googleapis.com/v0/b/polyface-ae6d3.firebasestorage.app/o/marketing-videos%2Fsoccer.mp4?alt=media"
        videoTitle="See Soccer Training Management in Action"
        benefits={[
          {
            title: 'Package sales',
            description: 'Sell training bundles and reduce no-shows with upfront payment.'
          },
          {
            title: 'Client-booked sessions',
            description: 'Players and parents book on their own with one link.'
          },
          {
            title: 'Clean operations',
            description: 'Payments, scheduling, and client info stay in one place.'
          }
        ]}
        features={[
          {
            title: 'Private and group training',
            description: 'Run private lessons, group sessions, and recurring clinics.'
          },
          {
            title: 'Package tracking',
            description: 'Track remaining sessions and usage automatically.'
          },
          {
            title: 'Client history and notes',
            description: 'Store athlete notes, attendance, and goals.'
          },
          {
            title: 'Automated reminders',
            description: 'Reduce no-shows with confirmations and reminders.'
          }
        ]}
        faqs={faqs}
      />
    </>
  );
}
