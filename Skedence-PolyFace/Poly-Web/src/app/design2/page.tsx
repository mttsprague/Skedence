'use client'

export default function Design2() {
  return (
    <div className="min-h-screen bg-pva-navy">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-pva-navy/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/polyface-logo.png" alt="Polyface Volleyball Academy" className="h-12 w-12 rounded-xl" />
              <div className="text-2xl font-black">
                <span className="text-white">POLY</span>
                <span className="text-pva-teal">FACE</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-white/80 hover:text-pva-teal transition font-medium">Training</a>
              <a href="#" className="text-white/80 hover:text-pva-teal transition font-medium">About</a>
              <a href="#" className="text-white/80 hover:text-pva-teal transition font-medium">Contact</a>
              <button className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-2.5 rounded-full font-bold transition">
                Download App
              </button>
              <button className="bg-gradient-to-r from-pva-teal to-pva-green hover:opacity-90 text-white px-6 py-2.5 rounded-full font-bold transition transform hover:scale-105">
                Book Today
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 min-h-screen flex items-center bg-gradient-to-br from-pva-navy to-black">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Content */}
            <div>
              <div className="inline-block px-4 py-1.5 bg-pva-teal/10 rounded-full mb-6">
                <span className="text-pva-teal font-semibold text-sm tracking-wide">OVER 20 YEARS EXPERIENCE</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight">
                Volleyball<br />Training
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Quality coaching for athletes of all levels, from beginners to advanced players.
              </p>
              <div className="space-y-4 mb-10">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-pva-teal rounded-full"></div>
                  <span className="text-lg text-gray-300">Individual lessons starting at $85</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-pva-teal rounded-full"></div>
                  <span className="text-lg text-gray-300">Group classes starting at $40/athlete</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-pva-teal rounded-full"></div>
                  <span className="text-lg text-gray-300">All skill levels welcome</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-pva-teal hover:bg-pva-teal/90 text-white px-8 py-4 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-xl">
                  Get Started
                </button>
                <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-bold text-lg transition border border-white/20">
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Side - Image Placeholder */}
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-pva-teal/20 to-pva-orange/20 backdrop-blur-sm border-2 border-white/10 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-8xl mb-4">🏐</div>
                  <p className="text-white/60 text-sm">Training Action Photo</p>
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-pva-teal/30 rounded-full blur-3xl"></div>
              <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-pva-orange/30 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-pva-navy mb-4">Training Options</h2>
            <p className="text-xl text-gray-600">Choose what works best for you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Individual */}
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-pva-teal transition-all hover:shadow-xl">
              <h3 className="text-2xl font-bold text-pva-navy mb-2">Individual Lessons</h3>
              <p className="text-gray-600 mb-6">Personalized one-on-one training</p>
              <div className="text-5xl font-black text-pva-navy mb-6">$85<span className="text-xl text-gray-500">+</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="mr-2 text-pva-teal">✓</span> Focused attention
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="mr-2 text-pva-teal">✓</span> Custom skill development
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="mr-2 text-pva-teal">✓</span> Flexible scheduling
                </li>
              </ul>
              <button className="w-full bg-pva-navy text-white py-4 rounded-lg font-bold hover:bg-pva-teal transition">
                Learn More
              </button>
            </div>

            {/* Group */}
            <div className="bg-gradient-to-br from-pva-navy to-pva-teal p-8 rounded-2xl border-2 border-pva-navy shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Group Classes</h3>
              <p className="text-gray-200 mb-6">Train with other athletes</p>
              <div className="text-5xl font-black text-white mb-6">$40<span className="text-xl text-gray-300">/athlete</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-white">
                  <span className="mr-2 text-pva-orange">✓</span> Group dynamics
                </li>
                <li className="flex items-center text-white">
                  <span className="mr-2 text-pva-orange">✓</span> Skill building
                </li>
                <li className="flex items-center text-white">
                  <span className="mr-2 text-pva-orange">✓</span> Team environment
                </li>
              </ul>
              <button className="w-full bg-white text-pva-navy py-4 rounded-lg font-bold hover:bg-pva-orange hover:text-white transition">
                View Schedule
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Strip */}
      <section className="py-16 bg-gradient-to-r from-pva-teal to-pva-green">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-black mb-2">20+</div>
              <div className="text-lg">Years Experience</div>
            </div>
            <div>
              <div className="text-5xl font-black mb-2">$85+</div>
              <div className="text-lg">Individual Lessons</div>
            </div>
            <div>
              <div className="text-5xl font-black mb-2">$40</div>
              <div className="text-lg">Group Classes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-xl" />
              <div>
                <div className="text-xl font-black text-white">POLYFACE</div>
                <div className="text-xs text-gray-500">Volleyball Academy</div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-gray-400 mb-2">polyfacevolleyballacademy.com</div>
              <div className="text-sm text-gray-600">© 2026 Polyface Volleyball Academy</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
