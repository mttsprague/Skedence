import type { Metadata } from 'next';
import HomepageClient from '@/components/homepage-client';

export const metadata: Metadata = {
  title: 'Sports Coaching Scheduling Software | Skedence',
  description: 'Transform your coaching business with Skedence. Schedule sessions, sell lesson packages, manage clients, and get paid online. Built for sports coaches, trainers, and instructors.',
  keywords: [
    'sports coaching scheduling software',
    'lesson booking software',
    'coaching business management',
    'sports trainer app',
    'lesson package management',
    'private lesson booking',
  ],
  alternates: {
    canonical: 'https://skedence.com',
  },
  openGraph: {
    title: 'Sports Coaching Scheduling Software | Skedence',
    description: 'Schedule sessions, sell lesson packages, and get paid online. Built for sports coaches, trainers, and athletic academies.',
    url: 'https://skedence.com',
    siteName: 'Skedence',
    type: 'website',
    images: [{ url: 'https://skedence.com/og-image.png', width: 1200, height: 630, alt: 'Skedence - Sports Coaching Scheduling Software' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sports Coaching Scheduling Software | Skedence',
    description: 'Schedule sessions, sell lesson packages, and get paid online. Built for sports coaches and trainers.',
    images: ['https://skedence.com/og-image.png'],
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Skedence',
  url: 'https://skedence.com',
  logo: 'https://skedence.com/logo-nav.png',
  description: 'Coaching business management software for sports coaches, private trainers, and athletic academies.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@skedence.com',
  },
};

const softwareAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Skedence',
  url: 'https://skedence.com',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'iOS, Web',
  description: 'Scheduling software for sports coaches — booking, lesson passes, and payments in one place.',
  offers: [
    { '@type': 'Offer', price: '29', priceCurrency: 'USD', name: 'Starter Plan' },
    { '@type': 'Offer', price: '99', priceCurrency: 'USD', name: 'Studio Plan' },
    { '@type': 'Offer', price: '249', priceCurrency: 'USD', name: 'Academy Plan' },
  ],
  author: { '@type': 'Person', name: 'Matt Sprague' },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    reviewCount: '1',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'How does the free trial work?', acceptedAnswer: { '@type': 'Answer', text: 'Sign up and get full access to every feature for 14 days. No credit card required.' } },
    { '@type': 'Question', name: 'Can I cancel anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cancel anytime with no fees. Your data stays accessible for 30 days.' } },
    { '@type': 'Question', name: 'How does payment processing work?', acceptedAnswer: { '@type': 'Answer', text: 'We use Stripe for secure payment processing. Stripe charges 2.9% + $0.30 per transaction.' } },
    { '@type': 'Question', name: 'Do my clients need to download an app?', acceptedAnswer: { '@type': 'Answer', text: 'Yes - clients download the free Skedence app on iPhone from the App Store.' } },
    { '@type': 'Question', name: 'Can I import my existing clients?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can manually add clients or import them via CSV.' } },
    { '@type': 'Question', name: 'Is my data secure?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. We use bank-level encryption and comply with GDPR and CCPA regulations.' } },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <HomepageClient />
    </>
  );
}
