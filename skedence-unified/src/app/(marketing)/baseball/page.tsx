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
    canonical: 'https://skedence.com/baseball',
  },
  openGraph: {
    title: 'Baseball Scheduling Software | Skedence',
    description: 'Sell lesson packages, automate booking, and get paid online with Skedence for baseball coaches.',
    url: 'https://skedence.com/baseball',
    siteName: 'Skedence',
    type: 'website',
    images: [{ url: 'https://skedence.com/og-baseball.png', width: 1200, height: 630, alt: 'Baseball Scheduling Software - Skedence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Baseball Scheduling Software | Skedence',
    description: 'Sell lesson packages, automate booking, and get paid online with Skedence for baseball coaches.',
    images: ['https://skedence.com/og-baseball.png'],
  },
};

export default function BaseballPage() {
  const faqs = [
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
        sportName="Baseball"
        headline="Baseball Scheduling Software for Coaches"
        subheadline="Sell lesson packages, automate scheduling, and stop chasing payments. Built for baseball training businesses."
        primaryKeyword="baseball scheduling software"
        secondaryKeyword="baseball booking system"
        videoUrl="https://firebasestorage.googleapis.com/v0/b/polyface-ae6d3.firebasestorage.app/o/marketing-videos%2Fbaseball.mp4?alt=media"
        videoTitle="See Baseball Training Management in Action"
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
        faqs={faqs}
        blogCategoryUrl="/blog/baseball"
        relatedBlogLinks={[
          { title: 'The Best Pitching Drills for Private Baseball Lessons', slug: 'baseball-pitching-drills-private-lessons' },
          { title: 'Baseball Catching Fundamentals for Private Lessons', slug: 'baseball-catching-fundamentals-private-lessons' },
          { title: 'How to Price Baseball Lesson Packages', slug: 'how-to-price-baseball-lesson-packages' },
        ]}
      />
    </>
  );
}
