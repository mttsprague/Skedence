'use client'

export default function Design3() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pva-navy to-slate-800">
      {/* Modern Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-pva-navy/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-2xl shadow-md" />
              <div>
                <div className="text-xl font-black tracking-tight leading-none">
                  <span className="text-white">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
                <div className="text-xs text-gray-400 font-medium">Volleyball Academy</div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-300">
              <a href="#" className="hover:text-pva-teal transition">Training</a>
              <a href="#" className="hover:text-pva-teal transition">About</a>
              <a href="#" className="hover:text-pva-teal transition">Contact</a>
            </div>
            <div className="flex items-center space-x-3">
              <button className="hidden sm:block bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-2.5 rounded-full text-sm font-bold transition">
                Download App
              </button>
              <button className="bg-pva-teal hover:bg-pva-teal/90 text-white px-6 py-2.5 rounded-full text-sm font-bold transition">
                Book Session
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Bento Grid */}
      <section className="max-w-[1600px] mx-auto px-8 pt-32 pb-16">
        <div className="grid grid-cols-12 gap-6 h-[600px]">
          {/* Left Large Card */}
          <div className="col-span-7 bg-gradient-to-br from-pva-navy via-pva-navy to-pva-teal rounded-3xl p-12 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(78,166,176,0.2),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
                <span className="text-white/90 font-semibold text-sm tracking-wide">Since 2005</span>
              </div>
              <h1 className="text-6xl font-black text-white mb-6 leading-tight">
                Volleyball<br />Training
              </h1>
              <p className="text-xl text-gray-200 mb-8 max-w-lg">
                Quality coaching for athletes of all levels. Individual lessons and group classes available.
              </p>
              <button className="bg-white hover:bg-pva-orange text-pva-navy hover:text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl">
                Get Started
              </button>
            </div>
            <div className="relative z-10 flex items-center space-x-8">
              <div>
                <div className="text-4xl font-black text-white">20+</div>
                <div className="text-sm text-gray-300">Years Experience</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-4xl font-black text-white">$85+</div>
                <div className="text-sm text-gray-300">Individual Lessons</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-4xl font-black text-white">$40</div>
                <div className="text-sm text-gray-300">Group Classes</div>
              </div>
            </div>
          </div>

          {/* Top Right - Individual Pricing Card */}
          <div className="col-span-5 row-span-1 bg-gradient-to-br from-pva-orange to-pva-orange/80 rounded-3xl p-8 flex flex-col justify-between hover:shadow-2xl transition-all group cursor-pointer">
            <div>
              <h3 className="text-3xl font-black text-white mb-2">Individual Lessons</h3>
              <p className="text-white/90">Personalized one-on-one training</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-black text-white">$85+</div>
                <div className="text-white/80 text-sm">per session</div>
              </div>
              <button className="bg-white text-pva-orange px-6 py-3 rounded-xl font-bold hover:bg-pva-navy hover:text-white transition">
                Learn More
              </button>
            </div>
          </div>

          {/* Bottom Right - Group Classes Card */}
          <div className="col-span-5 row-span-1 bg-gradient-to-br from-pva-teal to-pva-light-blue rounded-3xl p-8 flex flex-col justify-between hover:shadow-2xl transition-all group cursor-pointer">
            <div>
              <h3 className="text-3xl font-black text-white mb-2">Group Classes</h3>
              <p className="text-white/90">Train with other athletes</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-black text-white">$40</div>
                <div className="text-white/80 text-sm">per athlete</div>
              </div>
              <button className="bg-white text-pva-teal px-6 py-3 rounded-xl font-bold hover:bg-pva-navy hover:text-white transition">
                View Schedule
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-[1600px] mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-pva-teal/20 to-pva-teal/5 border-2 border-pva-teal/30 rounded-2xl p-8 hover:border-pva-teal hover:shadow-2xl transition-all backdrop-blur-sm">
            <div className="w-14 h-14 bg-pva-teal/20 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">All Skill Levels</h3>
            <p className="text-gray-300">
              From beginners to advanced players, everyone is welcome to train and improve.
            </p>
          </div>

          <div className="bg-gradient-to-br from-pva-orange/20 to-pva-orange/5 border-2 border-pva-orange/30 rounded-2xl p-8 hover:border-pva-orange hover:shadow-2xl transition-all backdrop-blur-sm">
            <div className="w-14 h-14 bg-pva-orange/20 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Flexible Scheduling</h3>
            <p className="text-gray-300">
              Find training times that work with your schedule. Multiple options available.
            </p>
          </div>

          <div className="bg-gradient-to-br from-pva-green/20 to-pva-green/5 border-2 border-pva-green/30 rounded-2xl p-8 hover:border-pva-green hover:shadow-2xl transition-all backdrop-blur-sm">
            <div className="w-14 h-14 bg-pva-green/20 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Proven Methods</h3>
            <p className="text-gray-300">
              Training approaches refined and perfected over more than 20 years of coaching.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-[1600px] mx-auto px-8 py-24">
        <div className="bg-gradient-to-br from-pva-navy to-pva-teal rounded-3xl p-16 text-center">
          <h2 className="text-5xl font-black text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Join our training program and start improving your volleyball skills today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white hover:bg-pva-orange text-pva-navy hover:text-white px-10 py-5 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl">
              Book a Session
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg transition border-2 border-white/30">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-white/10 py-16">
        <div className="max-w-[1600px] mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-xl" />
              <div>
                <div className="text-xl font-black text-white">POLYFACE</div>
                <div className="text-xs text-gray-400">Volleyball Academy</div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-gray-400 mb-2">polyfacevolleyballacademy.com</div>
              <div className="text-sm text-gray-500">© 2026 Polyface Volleyball Academy. All rights reserved.</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
