'use client'

export default function Design1() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Athletic Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
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
            <div className="hidden md:flex space-x-6 text-sm font-bold text-gray-700">
              <a href="#programs" className="hover:text-pva-orange transition">PROGRAMS</a>
              <a href="#coaches" className="hover:text-pva-orange transition">COACHES</a>
              <a href="#schedule" className="hover:text-pva-orange transition">SCHEDULE</a>
            </div>
            <button className="bg-gradient-to-r from-pva-orange to-pva-orange/80 hover:opacity-90 text-white px-8 py-3 rounded-full font-bold text-sm transition transform hover:scale-105 shadow-lg">
              BOOK NOW
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Width Athletic Image */}
      <section className="pt-24 relative overflow-hidden bg-gradient-to-br from-gray-900 via-pva-navy to-black min-h-screen flex items-center">
        {/* Diagonal Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-pva-orange/20 via-transparent to-pva-teal/20" 
             style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)' }}></div>
        
        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Hero Content */}
            <div>
              <div className="inline-block mb-6 px-6 py-2 bg-pva-orange/90 rounded-full">
                <span className="text-white font-black text-sm tracking-wider">ELITE TRAINING • EST. 2014</span>
              </div>
              
              <h1 className="text-7xl lg:text-8xl font-black text-white mb-6 leading-none tracking-tight">
                PUSH
                <br />
                YOUR
                <br />
                <span className="text-pva-orange">LIMITS</span>
              </h1>

              <p className="text-2xl text-gray-300 mb-10 leading-relaxed max-w-lg">
                Train with championship-winning coaches. Master elite techniques. 
                <span className="text-pva-teal font-bold"> Dominate the court.</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button className="group bg-pva-orange hover:bg-pva-orange/90 text-white px-10 py-5 rounded-full text-lg font-black transition transform hover:scale-105 shadow-2xl flex items-center justify-center">
                  START TRAINING
                  <svg className="w-6 h-6 ml-3 group-hover:translate-x-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button className="bg-transparent hover:bg-white/10 text-white px-10 py-5 rounded-full text-lg font-black transition border-2 border-white/40">
                  WATCH VIDEO
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t-2 border-white/20">
                <div>
                  <div className="text-4xl font-black text-pva-orange mb-1">500+</div>
                  <div className="text-sm text-gray-400 font-semibold uppercase tracking-wide">Athletes</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-pva-teal mb-1">15</div>
                  <div className="text-sm text-gray-400 font-semibold uppercase tracking-wide">Coaches</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-pva-green mb-1">10Y</div>
                  <div className="text-sm text-gray-400 font-semibold uppercase tracking-wide">Experience</div>
                </div>
              </div>
            </div>

            {/* Right - Image Placeholder */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden transform rotate-3 hover:rotate-0 transition duration-500">
                <div className="aspect-[3/4] bg-gradient-to-br from-pva-teal/30 via-pva-navy to-gray-900 flex items-center justify-center border-4 border-pva-orange/30">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 bg-white/10 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-sm border-4 border-pva-teal/50">
                      <svg className="w-16 h-16 text-pva-teal" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-lg">Athletic Action Photo</p>
                    <p className="text-gray-400 text-sm mt-2">High-energy volleyball training</p>
                  </div>
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-pva-orange/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Diagonal shape at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-white" 
             style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%, 0 100%)' }}></div>
      </section>

      {/* Programs - Bold Cards */}
      <section className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-block mb-4 px-6 py-2 bg-pva-navy/5 rounded-full">
              <span className="text-pva-navy font-black text-sm uppercase tracking-wider">Training Programs</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black text-pva-navy mb-4 leading-tight">
              CHOOSE YOUR
              <br />
              <span className="text-pva-orange">TRAINING PATH</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Program 1 */}
            <div className="group relative bg-gradient-to-br from-pva-navy to-black rounded-3xl p-10 transform hover:-translate-y-4 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pva-teal/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <div className="text-pva-teal text-6xl font-black mb-4">01</div>
                <h3 className="text-4xl font-black text-white mb-4">PRIVATE</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">One-on-one elite coaching tailored to your specific needs and goals.</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">$80</span>
                  <span className="text-gray-400 text-lg">/session</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {['Personalized Training', 'Video Analysis', 'Skill Assessment', 'Progress Tracking'].map((item) => (
                    <li key={item} className="flex items-center text-white">
                      <div className="w-2 h-2 bg-pva-teal rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-pva-teal hover:bg-pva-teal/90 text-white py-4 rounded-full font-black transition transform group-hover:scale-105">
                  SELECT
                </button>
              </div>
            </div>

            {/* Program 2 - Featured */}
            <div className="group relative bg-gradient-to-br from-pva-orange to-pva-orange/80 rounded-3xl p-10 transform scale-105 hover:scale-110 transition-all duration-300 shadow-2xl overflow-hidden">
              <div className="absolute -top-4 right-8 px-6 py-2 bg-white rounded-full z-20">
                <span className="text-pva-orange font-black text-sm">POPULAR</span>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <div className="text-white text-6xl font-black mb-4">02</div>
                <h3 className="text-4xl font-black text-white mb-4">GROUP</h3>
                <p className="text-white/90 mb-6 leading-relaxed">Small group training with competitive drills and team dynamics.</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">$120</span>
                  <span className="text-white/80 text-lg">/session</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {['4-6 Athletes Max', 'Team Building', 'Match Scenarios', 'Competition Drills', 'Peer Learning'].map((item) => (
                    <li key={item} className="flex items-center text-white">
                      <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-white hover:bg-white/90 text-pva-orange py-4 rounded-full font-black transition transform group-hover:scale-105">
                  SELECT
                </button>
              </div>
            </div>

            {/* Program 3 */}
            <div className="group relative bg-gradient-to-br from-pva-green to-pva-teal rounded-3xl p-10 transform hover:-translate-y-4 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pva-navy/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <div className="text-pva-navy text-6xl font-black mb-4">03</div>
                <h3 className="text-4xl font-black text-white mb-4">ELITE</h3>
                <p className="text-white/90 mb-6 leading-relaxed">Comprehensive program for athletes competing at the highest level.</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">$200</span>
                  <span className="text-white/80 text-lg">/session</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {['All Private Features', 'Mental Coaching', 'Nutrition Plans', 'College Recruiting', 'Priority Access'].map((item) => (
                    <li key={item} className="flex items-center text-white">
                      <div className="w-2 h-2 bg-pva-navy rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-pva-navy hover:bg-pva-navy/90 text-white py-4 rounded-full font-black transition transform group-hover:scale-105">
                  SELECT
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Angled Section */}
      <section className="relative py-40 bg-gradient-to-br from-pva-navy via-black to-pva-navy overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pva-orange/10 via-transparent to-pva-teal/10" 
             style={{ clipPath: 'polygon(0 15%, 100% 0, 100% 85%, 0 100%)' }}></div>
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pva-orange/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pva-teal/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-7xl md:text-8xl font-black text-white mb-8 leading-none tracking-tight">
            READY TO
            <br />
            <span className="text-pva-orange">DOMINATE?</span>
          </h2>
          <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Join the elite athletes training at Polyface Volleyball Academy
          </p>
          <button className="bg-pva-orange hover:bg-pva-orange/90 text-white px-16 py-6 rounded-full text-xl font-black transition transform hover:scale-110 shadow-2xl">
            START YOUR JOURNEY
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-lg" />
                <div className="text-2xl font-black">
                  <span className="text-white">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Championship training since 2014</p>
            </div>
            <div>
              <h4 className="font-black text-pva-orange mb-4 uppercase text-sm">Programs</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Private Training</li>
                <li>Group Sessions</li>
                <li>Elite Program</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-pva-orange mb-4 uppercase text-sm">Academy</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Our Coaches</li>
                <li>Facilities</li>
                <li>Success Stories</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-pva-orange mb-4 uppercase text-sm">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Schedule</li>
                <li>Contact</li>
                <li>Instagram</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            © 2026 Polyface Volleyball Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
