import Link from 'next/link'
import { Shield } from 'lucide-react'
import Navbar from '@/components/Navbar'

const sections = [
  {
    number: '1',
    title: 'Information We Collect',
    content: null,
    subsections: [
      {
        label: 'A. Information You Provide Directly',
        body: 'When you schedule lessons, communicate with us, or use our services, we may collect:',
        bullets: [
          'Contact Information: name, email address, phone number',
          'Account Information (in-app): profile details associated with the PolyFace app',
          'Booking & Lesson Details: lesson date/time, trainer selection, location, athlete notes, attendance history',
          'Payment-Related Information: billing name and transaction details (payments are processed by Stripe; we do not store full credit card numbers)',
          'Communications: messages or communications with Polyface Volleyball (email, text, app messaging)',
        ],
      },
      {
        label: 'B. Information About Athletes (Including Minors)',
        body: 'Because we provide volleyball training, you may provide information about an athlete, including minors, such as:',
        bullets: [
          'Athlete name and age (or graduation year)',
          'Training history or skill notes',
          'Emergency contact information (if provided)',
          'Optional injury notes or accommodations you choose to share',
        ],
        footer: 'We only collect athlete information needed to provide training services.',
      },
      {
        label: 'C. Website Information (Collected Automatically)',
        body: 'When you visit our website, we may automatically collect limited data such as:',
        bullets: [
          'IP address',
          'Browser type and device information',
          'General site usage (pages visited, time spent, referring page)',
        ],
        footer: 'We do not use Google Analytics at this time, but our web host and security tools may log basic traffic information for performance and security purposes.',
      },
    ],
  },
  {
    number: '2',
    title: 'How We Use Your Information',
    body: 'We use your information to:',
    bullets: [
      'Provide and manage private volleyball lessons',
      'Schedule and coordinate sessions through the PolyFace app',
      'Match lesson requests with trainer availability',
      'Process payments through Stripe and provide receipts',
      'Communicate with you about bookings, cancellations, changes, or service updates',
      'Provide customer support',
      'Improve service quality and training experiences',
      'Protect our athletes, clients, trainers, and business operations',
      'Comply with legal obligations and enforce our policies',
    ],
  },
  {
    number: '3',
    title: 'How We Share Your Information',
    intro: 'We do not sell personal information. We may share personal information only as necessary to operate our business, including:',
    subsections: [
      {
        label: 'A. Trainers and Staff',
        body: 'We share necessary booking and athlete details with the trainer assigned to the lesson, including:',
        bullets: ['Client and athlete name', 'Session time and location', 'Lesson notes relevant to training'],
      },
      {
        label: 'B. Payment Processor (Stripe)',
        body: 'Payments are processed securely by Stripe. Stripe may collect and process payment-related information in accordance with their privacy policy. Polyface Volleyball does not store your complete payment card information.',
        bullets: [],
      },
      {
        label: 'C. Service Providers',
        body: 'We may share information with third-party service providers that help us operate, such as:',
        bullets: [
          'Hosting and website providers',
          'Booking and scheduling systems (PolyFace app)',
          'Email and communication systems',
          'Security and fraud prevention tools',
        ],
        footer: 'These providers may only use your information to perform services for us.',
      },
      {
        label: 'D. Legal Compliance and Safety',
        body: 'We may disclose information if required by law or if necessary to:',
        bullets: [
          'Respond to lawful requests',
          'Protect the safety and rights of clients, athletes, trainers, or others',
          'Prevent fraud or security threats',
          'Enforce our terms and policies',
        ],
      },
      {
        label: 'E. Business Transfers',
        body: 'If Polyface Volleyball is involved in a merger, acquisition, or sale of assets, information may be transferred as part of that transaction.',
        bullets: [],
      },
    ],
  },
  {
    number: '4',
    title: 'Cookies and Similar Technologies',
    body: 'Our website may use cookies or similar technologies to:',
    bullets: [
      'Make the site function properly',
      'Improve site performance',
      'Provide security protections',
    ],
    footer: 'You can control cookies through your browser settings. Disabling cookies may affect website functionality.',
  },
  {
    number: '5',
    title: 'Communications Preferences',
    body: 'You may opt out of non-essential marketing emails by using an "unsubscribe" link (if provided) or emailing us directly. Even if you opt out of marketing, we may still send essential messages related to your bookings (such as confirmations, reminders, or changes).',
    bullets: [],
  },
  {
    number: '6',
    title: 'Data Retention',
    body: 'We retain personal information only as long as reasonably necessary to:',
    bullets: [
      'Provide services and maintain booking records',
      'Meet legal, accounting, and tax obligations',
      'Resolve disputes and enforce policies',
    ],
    footer: 'We may retain some information in a de-identified or aggregated format.',
  },
  {
    number: '7',
    title: 'Data Security',
    body: 'We use reasonable administrative, technical, and organizational safeguards to protect personal information. However, no system is 100% secure, and we cannot guarantee absolute protection against unauthorized access.',
    bullets: [],
  },
  {
    number: '8',
    title: 'Privacy of Minors',
    body: 'Polyface Volleyball provides training services to minors, and we take privacy seriously.',
    bullets: [
      'In most cases, a parent or legal guardian is the individual booking and paying for lessons.',
      'We collect only the information necessary to deliver training services and ensure safety.',
      'We do not knowingly collect personal information directly from children under 13 through our website without parental involvement.',
    ],
    footer: 'If you believe that we have collected information from a minor improperly, please contact us at info@polyfacevolleyball.com, and we will take appropriate steps to review and address the issue.',
  },
  {
    number: '9',
    title: 'Your Rights and Choices',
    body: 'Depending on your location and applicable laws, you may have the right to:',
    bullets: [
      'Request access to the personal information we maintain about you',
      'Request correction of inaccurate information',
      'Request deletion of personal information (subject to legal/recordkeeping requirements)',
      'Request a copy of your information',
    ],
    footer: 'To make a request, contact us at info@polyfacevolleyball.com. We may need to verify your identity before completing requests.',
  },
  {
    number: '10',
    title: 'Third-Party Links and Services',
    body: 'Our Services may include links to third-party websites or services (such as Stripe or app store listings). We are not responsible for the privacy practices of third parties. We encourage you to review their privacy policies before providing information.',
    bullets: [],
  },
  {
    number: '11',
    title: 'Changes to This Privacy Policy',
    body: 'We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.',
    bullets: [],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Header */}
      <div className="bg-pva-navy text-white pt-20">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-pva-teal/20 flex items-center justify-center">
              <Shield size={24} className="text-pva-teal" />
            </div>
            <div>
              <p className="text-pva-teal text-sm font-semibold tracking-widest uppercase">Legal</p>
              <h1 className="text-3xl font-black">Privacy Policy</h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Effective Date: December 29, 2025</p>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <p className="text-gray-700 leading-relaxed">
            Polyface Volleyball ("Polyface Volleyball," "we," "us," or "our") values your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard information when you visit our website (
            <a href="https://www.polyfacevolleyball.com/" className="text-pva-teal hover:underline">
              https://www.polyfacevolleyball.com/
            </a>
            ), book private lessons through the PolyFace app, communicate with us, or otherwise interact with our
            services (collectively, the "Services").
          </p>
          <p className="text-gray-700 leading-relaxed mt-4">
            By accessing or using our Services, you agree to the terms of this Privacy Policy.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.number} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center gap-4 px-8 py-5 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-pva-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{section.number}</span>
                </div>
                <h2 className="text-lg font-bold text-pva-navy">{section.title}</h2>
              </div>

              <div className="px-8 py-6 space-y-5">
                {/* Top-level intro (section 3) */}
                {'intro' in section && section.intro && (
                  <p className="text-gray-700 leading-relaxed">{section.intro}</p>
                )}

                {/* Top-level body */}
                {'body' in section && section.body && (
                  <p className="text-gray-700 leading-relaxed">{section.body}</p>
                )}

                {/* Top-level bullets */}
                {'bullets' in section && section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-2">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-700">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-pva-teal flex-shrink-0" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Top-level footer */}
                {'footer' in section && section.footer && (
                  <p className="text-gray-600 text-sm leading-relaxed italic">{section.footer}</p>
                )}

                {/* Subsections */}
                {'subsections' in section && section.subsections && (
                  <div className="space-y-6">
                    {section.subsections.map((sub, i) => (
                      <div key={i}>
                        <h3 className="font-semibold text-pva-navy mb-2">{sub.label}</h3>
                        {sub.body && <p className="text-gray-700 leading-relaxed mb-3">{sub.body}</p>}
                        {sub.bullets && sub.bullets.length > 0 && (
                          <ul className="space-y-2 mb-3">
                            {sub.bullets.map((b, j) => (
                              <li key={j} className="flex items-start gap-3 text-gray-700">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-pva-teal flex-shrink-0" />
                                <span className="leading-relaxed">{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {'footer' in sub && sub.footer && (
                          <p className="text-gray-600 text-sm leading-relaxed italic">{sub.footer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Section 12 — Contact */}
          <div className="bg-pva-navy rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 px-8 py-5 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-pva-teal/20 flex items-center justify-center flex-shrink-0">
                <span className="text-pva-teal text-xs font-bold">12</span>
              </div>
              <h2 className="text-lg font-bold text-white">Contact Us</h2>
            </div>
            <div className="px-8 py-6 space-y-3">
              <p className="text-gray-300 leading-relaxed">
                If you have questions about this Privacy Policy or want to make a privacy request, contact:
              </p>
              <div className="space-y-1 text-gray-300">
                <p className="font-semibold text-white">Polyface Volleyball</p>
                <p>Email: <a href="mailto:info@polyfacevolleyball.com" className="text-pva-teal hover:underline">info@polyfacevolleyball.com</a></p>
                <p>Website: <a href="https://www.polyfacevolleyball.com/" className="text-pva-teal hover:underline">https://www.polyfacevolleyball.com/</a></p>
                <p>Location: Tennessee, United States</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-pva-navy font-semibold hover:text-pva-teal transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-pva-navy text-white py-8 mt-10">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-400">
          © 2026 PolyFace Volleyball Academy · <Link href="/privacy" className="hover:text-pva-orange transition">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
