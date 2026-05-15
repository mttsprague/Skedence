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
    canonical: 'https://skedence.com/basketball',
  },
  openGraph: {
    title: 'Basketball Scheduling Software | Skedence',
    description: 'Sell training packages, automate bookings, and get paid online with Skedence for basketball trainers.',
    url: 'https://skedence.com/basketball',
    siteName: 'Skedence',
    type: 'website',
    images: [{ url: 'https://skedence.com/og-basketball.png', width: 1200, height: 630, alt: 'Basketball Scheduling Software - Skedence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Basketball Scheduling Software | Skedence',
    description: 'Sell training packages, automate bookings, and get paid online with Skedence for basketball trainers.',
    images: ['https://skedence.com/og-basketball.png'],
  },
};

export default function BasketballPage() {
  const faqs = [
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
        sportName="Basketball"
        headline="Basketball Scheduling Software for Trainers"
        subheadline="Sell packages, fill your calendar, and get paid without the admin work. Designed for private basketball training."
        primaryKeyword="basketball scheduling software"
        secondaryKeyword="basketball booking system"
        videoUrl="https://firebasestorage.googleapis.com/v0/b/polyface-ae6d3.firebasestorage.app/o/marketing-videos%2Fbasketball.mp4?alt=media"
        videoTitle="See Basketball Training Management in Action"
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
        faqs={faqs}
        blogCategoryUrl="/blog/basketball"
        relatedBlogLinks={[
          { title: 'The Best Basketball Training Drills for Guards', slug: 'basketball-training-drills-for-guards' },
          { title: 'How to Fix Shooting Form in Private Basketball Training', slug: 'fix-basketball-shooting-form' },
          { title: 'How to Price Basketball Training Packages', slug: 'how-to-price-basketball-training-packages' },
        ]}
      />
    </>
  );
}
