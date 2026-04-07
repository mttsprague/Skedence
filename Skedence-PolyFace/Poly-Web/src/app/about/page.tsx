import Link from 'next/link'
import Navbar from '@/components/Navbar'

const athletes = [
  {
    name: 'Emma',
    position: 'Setter',
    description:
      'Precise, cerebral, the playmaker. She\'s quick with her decisions and always sees the court before the ball even arrives — creating opportunities, bringing others into the game.',
    color: 'from-blue-500 to-pva-teal',
    initial: 'E',
    trait: 'The Strategist',
  },
  {
    name: 'Marcus',
    position: 'Outside Hitter',
    description:
      'Athletic, powerful, and explosive. His swings are all about raw power and timing — but what makes him special is his ability to read the blockers and adapt mid-air.',
    color: 'from-pva-orange to-red-500',
    initial: 'M',
    trait: 'The Competitor',
  },
  {
    name: 'Sophia',
    position: 'Libero',
    description:
      'She doesn\'t always get the spotlight, but every rally has a moment where she dives or shifts into position, saving a point or starting a perfect transition.',
    color: 'from-pva-teal to-green-500',
    initial: 'S',
    trait: 'The Anchor',
  },
  {
    name: 'Jay',
    position: 'Middle Blocker',
    description:
      'Where others focus on speed or finesse, Jay uses his height and timing to disrupt plays. His blocks can change the momentum of an entire match.',
    color: 'from-purple-500 to-pva-navy',
    initial: 'J',
    trait: 'The Disruptor',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-pva-navy text-white pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-pva-teal text-sm font-semibold tracking-widest uppercase mb-4">Our Story</p>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            The WHY Behind{' '}
            <span className="text-pva-orange">"PolyFace"</span>
          </h1>
          <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            Embracing the Many Faces of Volleyball
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">

        {/* Opening */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pva-navy to-pva-teal flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-sm">P</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-pva-navy">The Name</h2>
              <p className="text-pva-teal text-sm font-semibold">poly · face</p>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">
            At the heart of PolyFace Volleyball is a simple yet powerful idea:{' '}
            <span className="font-semibold text-pva-navy">volleyball is a game of many faces.</span>
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            The name "PolyFace" comes from the Greek prefix{' '}
            <span className="italic font-medium">"poly,"</span> meaning "many," and{' '}
            <span className="italic font-medium">"face,"</span> representing the different styles, skills,
            and approaches that athletes bring to the court. Just like no two players are alike, no two games
            of volleyball are ever the same. At PolyFace, we celebrate this diversity and channel it into
            something that helps players not only discover their unique style but also grow from it.
          </p>
        </div>

        {/* Athlete Stories */}
        <div>
          <h2 className="text-2xl font-black text-pva-navy mb-2 text-center">The Many Faces</h2>
          <p className="text-gray-500 text-center text-sm mb-8">Every player brings something different to the court.</p>
          <div className="grid md:grid-cols-2 gap-5">
            {athletes.map((a) => (
              <div key={a.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-white font-black text-xl">{a.initial}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-pva-navy text-lg">{a.name}</span>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a.position}</span>
                  </div>
                  <p className="text-pva-teal text-xs font-bold tracking-wide uppercase mb-2">{a.trait}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core belief */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <p className="text-gray-700 leading-relaxed">
            Each of these athletes brings a different face to the game. At PolyFace, we believe in helping
            players embrace the multiple sides of their game — whether it's learning to set with finesse like
            Emma, hit with power like Marcus, dig with precision like Sophia, or block with timing like Jay.
          </p>
          <p className="text-gray-700 leading-relaxed mt-4">
            PolyFace isn't just about one style or one position. It's about helping athletes recognize the
            <span className="font-semibold text-pva-navy"> "many faces" within themselves</span>, drawing from
            the diverse strengths of the game. Whether you're the quiet strategist, the fiery competitor, or
            the unassuming team player, PolyFace helps you shape your own version of excellence.
          </p>
        </div>

        {/* Mission statement */}
        <div className="bg-pva-navy rounded-2xl p-8 md:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-pva-teal/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-pva-teal text-2xl font-black">★</span>
          </div>
          <p className="text-white text-xl md:text-2xl font-bold leading-relaxed max-w-2xl mx-auto">
            We train with the belief that each athlete, with their unique "face," can grow to be the best
            version of themselves.
          </p>
          <p className="text-gray-400 mt-4 leading-relaxed max-w-xl mx-auto">
            And by embracing diversity in skills, mindset, and style, we can all achieve greatness together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/portal/book"
              className="bg-pva-orange text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition"
            >
              Book a Lesson
            </Link>
            <Link
              href="/login"
              className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold hover:bg-white/20 transition"
            >
              Client Login
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-pva-navy text-white py-8 mt-4">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-400">
          © 2026 PolyFace Volleyball Academy ·{' '}
          <Link href="/privacy" className="hover:text-pva-orange transition">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
