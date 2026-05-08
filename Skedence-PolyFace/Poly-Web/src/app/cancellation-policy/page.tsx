import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const rules = [
  {
    icon: '🚫',
    title: 'No Refunds or Cancellations',
    body: 'Once a session is booked, it cannot be cancelled or refunded. Each session is scheduled around coach availability and reserved gym time.',
  },
  {
    icon: '🕐',
    title: '48-Hour Reschedule Window',
    body: 'You may request to reschedule your session, but only if the request is made at least 48 hours before the scheduled lesson time.',
  },
  {
    icon: '⚠️',
    title: 'Late Requests Are Not Accepted',
    body: 'Any rescheduling request made less than 48 hours before your lesson will not be accepted. The session will be charged in full.',
  },
  {
    icon: '❌',
    title: 'No-Shows & Missed Sessions',
    body: 'Missed sessions and no-shows are charged in full. PVA commits gym space, staffing, and preparation to every scheduled lesson.',
  },
];

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-pva-navy text-white text-center px-6">
        <p className="text-pva-orange text-sm font-bold tracking-widest uppercase mb-3">Policies</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Cancellation &amp; Rescheduling</h1>
        <p className="text-white/70 max-w-xl mx-auto text-base">
          Please review our policy carefully before booking. Each session reserves coach time and gym space.
        </p>
      </section>

      {/* Rules Grid */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {rules.map((rule) => (
            <div key={rule.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex gap-4">
              <div className="text-3xl shrink-0 mt-0.5">{rule.icon}</div>
              <div>
                <h3 className="text-base font-bold text-pva-navy mb-1">{rule.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{rule.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plain-English Summary */}
      <section className="max-w-4xl mx-auto px-6 pb-10">
        <div className="bg-pva-navy rounded-2xl p-8 text-white">
          <p className="text-xs font-bold tracking-widest uppercase text-pva-orange mb-3">In Plain Terms</p>
          <p className="text-lg font-semibold leading-relaxed">
            There are no refunds or cancellations. You may reschedule{' '}
            <span className="text-pva-orange">only if you request it at least 48 hours before your lesson.</span>{' '}
            After that, the session is locked in and will be charged in full — no exceptions.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-pva-navy mb-1">Questions about your session?</p>
            <p className="text-sm text-gray-500">Reach out and we&apos;ll do our best to help.</p>
          </div>
          <a
            href="/#contact"
            className="shrink-0 bg-pva-orange text-white font-bold px-6 py-3 rounded-full text-sm hover:opacity-90 transition"
          >
            Contact Us
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
