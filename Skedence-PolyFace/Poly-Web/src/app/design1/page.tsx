'use client'

export default function Design1() {
  return (
    <div className="min-h-screen bg-white">
      {/* Athletic Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/polyface-logo.png" alt="Polyface Volleyball Academy" className="h-14 w-14 rounded-xl shadow-lg" />
              <div>
                <div className="text-2xl font-black leading-none">
                  <span className="text-pva-navy">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
                <div className="text-xs text-gray-500 font-semibold">VOLLEYBALL ACADEMY</div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm font-bold text-gray-700">
              <a href="#programs" className="hover:text-pva-orange transition">TRAINING</a>
              <a href="#about" className="hover:text-pva-orange transition">ABOUT</a>
              <a href="#contact" className="hover:text-pva-orange transition">CONTACT</a>
            </div>
            <div className="flex items-center space-x-3">
              <button className="hidden sm:block bg-white hover:bg-gray-50 text-pva-navy border-2 border-pva-navy px-6 py-2.5 rounded-full font-bold text-sm transition">
                Download App
              </button>
              <button className="bg-gradient-to-r from-pva-orange to-pva-orange/80 hover:opacity-90 text-white px-8 py-3 rounded-full font-bold text-sm transition transform hover:scale-105 shadow-lg">
                BOOK NOW
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-pva-navy via-pva-navy/95 to-pva-teal/90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(78,166,176,0.15),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="inline-block px-6 py-2 bg-pva-orange/20 backdrop-blur-sm rounded-full mb-8 border border-pva-orange/30">
            <span className="text-pva-orange font-bold text-sm tracking-wider uppercase">Over 20 Years Experience</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-black text-white mb-6 leading-none tracking-tight">
            PUSH YOUR<br />LIMITS
          </h1>
          <p className="text-2xl text-gray-300 mb-12 max-w-2xl mx-auto font-light">
            Professional volleyball training for athletes of all levels
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-pva-orange hover:bg-pva-orange/90 text-white px-10 py-5 rounded-lg text-lg font-bold transition transform hover:scale-105 shadow-2xl">
              Get Started
            </button>
            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-10 py-5 rounded-lg text-lg font-semibold transition border border-white/30">
              Learn More
            </button>
          </div>
        </div>
        {/* Diagonal Accent */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Programs Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-pva-navy mb-4">TRAINING OPTIONS</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Individual lessons and group classes available</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card 1 */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 hover:border-pva-teal transition-all hover:shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-navy rounded-xl flex items-center justify-center shadow-lg group-hover:bg-pva-teal transition">
                <span className="text-3xl font-black text-white">01</span>
              </div>
              <div className="mt-8">
                <h3 className="text-3xl font-black text-pva-navy mb-4">INDIVIDUAL<br />LESSONS</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Personalized one-on-one training sessions focused on your specific goals and skill development.
                </p>
                <div className="text-4xl font-black text-pva-orange mb-4">$85<span className="text-xl text-gray-500">+</span></div>
                <button className="w-full bg-pva-navy text-white py-4 rounded-lg font-bold hover:bg-pva-teal transition">
                  Learn More
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative bg-gradient-to-br from-pva-navy to-pva-teal p-8 rounded-2xl border-2 border-pva-navy shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-orange rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-black text-white">02</span>
              </div>
              <div className="mt-8">
                <h3 className="text-3xl font-black text-white mb-4">GROUP<br />CLASSES</h3>
                <p className="text-gray-200 mb-6 leading-relaxed">
                  Train with other athletes in a dynamic group environment that builds skills and teamwork.
                </p>
                <div className="text-4xl font-black text-white mb-4">$40<span className="text-xl text-gray-300">/athlete</span></div>
                <button className="w-full bg-white text-pva-navy py-4 rounded-lg font-bold hover:bg-gray-100 transition">
                  View Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-black text-pva-navy mb-6">20+ YEARS<br />OF COACHING</h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Quality training for athletes at all skill levels. Whether you're just starting out or looking to refine advanced techniques, we're here to help you improve.
              </p>
              <button className="bg-pva-orange hover:bg-pva-orange/90 text-white px-8 py-4 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-xl">
                Get Started Today
              </button>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border-2 border-pva-teal/20 hover:border-pva-teal transition">
                <h3 className="text-2xl font-bold text-pva-navy mb-2">All Skill Levels</h3>
                <p className="text-gray-600">From beginners to advanced players, everyone is welcome.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border-2 border-pva-orange/20 hover:border-pva-orange transition">
                <h3 className="text-2xl font-bold text-pva-navy mb-2">Flexible Scheduling</h3>
                <p className="text-gray-600">Find times that work with your schedule.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border-2 border-pva-green/20 hover:border-pva-green transition">
                <h3 className="text-2xl font-bold text-pva-navy mb-2">Proven Methods</h3>
                <p className="text-gray-600">Training approaches refined over two decades.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-pva-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-xl" />
              <div>
                <div className="text-xl font-black">POLYFACE</div>
                <div className="text-xs text-gray-400">Volleyball Academy</div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-gray-300 mb-2">polyfacevolleyballacademy.com</div>
              <div className="text-sm text-gray-400">© 2026 Polyface Volleyball Academy</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
