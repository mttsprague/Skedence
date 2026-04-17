import Link from 'next/link'
import Image from 'next/image'
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
          <p className="text-pva-teal text-sm font-semibold tracking-widest uppercase mb-4">The Academy</p>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Meet the Coach &{' '}
            <span className="text-pva-orange">The Story</span>
          </h1>
          <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            22 years of coaching. A pro career spanning three continents. One mission: develop complete athletes.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">

        {/* Meet Jeff — headshot + credentials */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-shrink-0 w-40 h-48 rounded-2xl overflow-hidden bg-gray-100 shadow-lg self-center sm:self-start">
              <Image
                src="/trainer-headshot.png"
                alt="Jeffrey Schmitz"
                width={160}
                height={192}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1">
              <p className="text-pva-teal text-sm font-semibold tracking-widest uppercase mb-2">Head Coach</p>
              <h2 className="text-3xl font-black text-pva-navy mb-1">Jeffrey Schmitz</h2>
              <p className="text-gray-500 text-sm mb-5">UC Irvine Alum · National Champion · 6-Year Professional Setter</p>
              <div className="flex flex-wrap gap-2">
                {['22 Yrs Coaching', 'Pro — Brazil', 'Pro — Finland', 'Pro — Austria', 'UC Davis', 'U of Illinois', 'Stanford'].map(tag => (
                  <span key={tag} className="bg-pva-navy/5 border border-pva-navy/10 text-pva-navy text-xs font-semibold px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Playing Career */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pva-navy to-pva-teal flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-sm">🏆</span>
            </div>
            <h2 className="text-xl font-black text-pva-navy">Playing Career</h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">
            Jeffrey Schmitz is a six-year professional setter, National Champion, and alumnus of the{' '}
            <span className="font-semibold text-pva-navy">University of California, Irvine.</span>
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            After graduating in 2011, Schmitz played with professional volleyball clubs in{' '}
            <span className="font-semibold text-pva-navy">Brazil, Finland, and Austria</span> — bringing
            world-class competition experience back to every athlete he trains.
          </p>
        </div>

        {/* Coaching Career */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pva-orange to-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-sm">📋</span>
            </div>
            <h2 className="text-xl font-black text-pva-navy">Coaching Career</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Schmitz has been coaching volleyball for <span className="font-semibold text-pva-navy">22 years</span>.
            He started his coaching career on the club level in St. Louis at High Performance, and worked his way
            up to the <span className="font-semibold text-pva-navy">NCAA Division I level</span> as an assistant
            coach for the UC Davis women&apos;s team.
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            Schmitz has served as a youth coach internationally as well as at universities across the United States,
            including the{' '}
            <span className="font-semibold text-pva-navy">University of Illinois</span> and{' '}
            <span className="font-semibold text-pva-navy">Stanford University</span>.
          </p>
        </div>

        {/* His Approach */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pva-teal to-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-sm">🎯</span>
            </div>
            <h2 className="text-xl font-black text-pva-navy">His Approach</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            With a sharp eye for detail, Schmitz brings a seasoned level of expertise. His love for furthering
            the game and developing athletes is serious, yet his approach to the game is a playful one — he sees
            the court as his playground.
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            He frequently incorporates <span className="font-semibold text-pva-navy">innovative approaches
            and different tools</span> to help athletes develop their skills. Being coached by Schmitz is often
            described as <span className="italic font-semibold text-pva-orange">&ldquo;focused fun&rdquo;</span> — and
            his athletes see improvements quickly from his high-impact solutions.
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            <span className="font-semibold text-pva-navy">Video playback and analysis</span> are regularly used
            to help athletes make changes in real time. Schmitz also offers athletes the opportunity to send game
            video for analysis.
          </p>
        </div>

        {/* Mindset */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pva-navy flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-sm">🧠</span>
            </div>
            <h2 className="text-xl font-black text-pva-navy">Mindset Coaching</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            In addition to game skills, Schmitz mentors his athletes through mindset work. Journaling, reframing,
            confidence building, and offering new perspectives are all regularly incorporated into his coaching.
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            He understands that what&apos;s happening in the mind can impact how the body performs. Beyond
            awareness, Schmitz offers solutions to these challenges — developing{' '}
            <span className="font-semibold text-pva-navy">balanced, well-rounded athletes.</span>
          </p>
        </div>

        {/* CTA */}
        <div className="bg-pva-navy rounded-2xl p-8 md:p-10 text-center">
          <p className="text-white text-xl md:text-2xl font-bold leading-relaxed max-w-2xl mx-auto">
            Ready to train with Jeff?
          </p>
          <p className="text-gray-400 mt-3 mb-8 max-w-xl mx-auto">
            Book a session and experience &ldquo;focused fun&rdquo; firsthand.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/portal/book" className="bg-pva-orange text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition">
              Book a Lesson
            </Link>
            <Link href="/login" className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold hover:bg-white/20 transition">
              Client Login
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 py-4">
          <div className="flex-1 h-px bg-gray-200" />
          <p className="text-gray-400 text-sm font-semibold tracking-widest uppercase">The PolyFace Story</p>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

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
            The name &ldquo;PolyFace&rdquo; comes from the Greek prefix{' '}
            <span className="italic font-medium">&ldquo;poly,&rdquo;</span> meaning &ldquo;many,&rdquo; and{' '}
            <span className="italic font-medium">&ldquo;face,&rdquo;</span> representing the different styles, skills,
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
            players embrace the multiple sides of their game — whether it&apos;s learning to set with finesse like
            Emma, hit with power like Marcus, dig with precision like Sophia, or block with timing like Jay.
          </p>
          <p className="text-gray-700 leading-relaxed mt-4">
            PolyFace isn&apos;t just about one style or one position. It&apos;s about helping athletes recognize the
            <span className="font-semibold text-pva-navy"> &ldquo;many faces&rdquo; within themselves</span>, drawing from
            the diverse strengths of the game. Whether you&apos;re the quiet strategist, the fiery competitor, or
            the unassuming team player, PolyFace helps you shape your own version of excellence.
          </p>
        </div>

        {/* Mission statement */}
        <div className="bg-pva-navy rounded-2xl p-8 md:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-pva-teal/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-pva-teal text-2xl font-black">★</span>
          </div>
          <p className="text-white text-xl md:text-2xl font-bold leading-relaxed max-w-2xl mx-auto">
            We train with the belief that each athlete, with their unique &ldquo;face,&rdquo; can grow to be the best
            version of themselves.
          </p>
          <p className="text-gray-400 mt-4 leading-relaxed max-w-xl mx-auto">
            And by embracing diversity in skills, mindset, and style, we can all achieve greatness together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/portal/book" className="bg-pva-orange text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition">
              Book a Lesson
            </Link>
            <Link href="/login" className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold hover:bg-white/20 transition">
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

