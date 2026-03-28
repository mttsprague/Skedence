'use client'

export default function Design3() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-2xl shadow-md" />
              <div>
                <div className="text-xl font-black tracking-tight leading-none">
                  <span className="text-pva-navy">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
                <div className="text-xs text-gray-500 font-medium">Volleyball Academy</div>
              </div>
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-semibold text-gray-700">
              <a href="#" className="hover:text-pva-navy transition">Training</a>
              <a href="#" className="hover:text-pva-navy transition">Coaches</a>
              <a href="#" className="hover:text-pva-navy transition">Schedule</a>
            </div>
            <button className="bg-pva-navy hover:bg-pva-navy/90 text-white px-6 py-2.5 rounded-full text-sm font-bold transition">
              Book Session
            </button>
          </div>
        </div>
      </nav>

      {/* Bento Grid Hero */}
      <section className="pt-32 pb-20 px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6 auto-rows-[200px]">
            {/* Large Hero Card - Spans 8 columns, 3 rows */}
            <div className="col-span-12 lg:col-span-8 row-span-3 bg-gradient-to-br from-pva-navy via-pva-navy to-black rounded-3xl p-12 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pva-teal/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition duration-700"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pva-orange/20 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3 group-hover:scale-150 transition duration-700"></div>
              
              <div className="relative z-10">
                <div className="inline-block mb-6 px-4 py-2 bg-pva-teal/20 rounded-full border border-pva-teal/30">
                  <span className="text-pva-light-blue font-bold text-sm">Elite Training Programs</span>
                </div>
                <h1 className="text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
                  Master the
                  <br />
                  <span className="bg-gradient-to-r from-pva-teal via-pva-green to-pva-orange bg-clip-text text-transparent">
                    Art of Volleyball
                  </span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl">
                  Join elite athletes at Polyface Volleyball Academy. Professional coaching, cutting-edge techniques, championship results.
                </p>
                <div className="flex gap-4">
                  <button className="bg-pva-orange hover:bg-pva-orange/90 text-white px-8 py-4 rounded-full font-bold transition transform hover:scale-105">
                    Start Training
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-bold transition border border-white/30">
                    View Programs
                  </button>
                </div>
              </div>
            </div>

            {/* Stat Card 1 */}
            <div className="col-span-6 lg:col-span-4 row-span-1 bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="text-5xl font-black text-pva-teal mb-2">500+</div>
              <div className="text-gray-600 font-semibold">Athletes Trained</div>
              <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pva-teal to-pva-green w-[85%]"></div>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="col-span-6 lg:col-span-4 row-span-1 bg-gradient-to-br from-pva-orange to-pva-orange/80 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-white">
              <div className="text-5xl font-black mb-2">15</div>
              <div className="font-semibold opacity-90">Expert Coaches</div>
              <div className="mt-4 flex -space-x-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white/20 border-2 border-white backdrop-blur-sm"></div>
                ))}
                <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white backdrop-blur-sm flex items-center justify-center text-xs font-bold">
                  +11
                </div>
              </div>
            </div>

            {/* Video Card */}
            <div className="col-span-12 lg:col-span-4 row-span-2 bg-gradient-to-br from-pva-green to-pva-teal rounded-3xl p-2 shadow-lg overflow-hidden group">
              <div className="relative w-full h-full bg-gradient-to-br from-pva-navy/50 to-black/50 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm border-2 border-white/30 group-hover:scale-110 transition">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-sm">Watch Training Video</p>
                </div>
              </div>
            </div>

            {/* Success Rate Card */}
            <div className="col-span-6 lg:col-span-4 row-span-1 bg-gradient-to-br from-pva-navy to-pva-navy/80 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pva-green/20 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="text-5xl font-black mb-2 bg-gradient-to-r from-pva-green to-pva-teal bg-clip-text text-transparent">98%</div>
                <div className="font-semibold">Success Rate</div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="col-span-6 lg:col-span-4 row-span-1 bg-gradient-to-br from-pva-light-blue to-pva-teal rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex items-center justify-center cursor-pointer group">
              <div className="text-center">
                <div className="text-xl font-black text-white mb-1">Book Free Trial</div>
                <div className="text-sm text-white/80 group-hover:text-white transition">Get Started Today →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section - Modern Cards */}
      <section className="py-20 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-pva-navy mb-4">
              Training Programs
            </h2>
            <p className="text-xl text-gray-600">Choose the path that fits your ambition</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Private */}
            <div className="bg-white rounded-3xl p-10 shadow-xl border-2 border-gray-100 hover:border-pva-teal/50 transition-all duration-300 transform hover:scale-105">
              <div className="inline-block px-4 py-1 bg-pva-teal/10 rounded-full text-pva-teal text-xs font-bold mb-6 uppercase">
                Individual
              </div>
              <h3 className="text-3xl font-black text-pva-navy mb-3">Private Coaching</h3>
              <p className="text-gray-600 mb-6">Personalized one-on-one training designed for your specific goals</p>
              
              <div className="mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-baseline">
                  <span className="text-5xl font-black text-pva-navy">$80</span>
                  <span className="text-gray-500 ml-2">/session</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {['Custom training plan', 'Video analysis', 'Flexible scheduling', 'Progress tracking'].map((item) => (
                  <li key={item} className="flex items-center text-gray-700">
                    <div className="w-6 h-6 bg-pva-teal/10 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-pva-teal" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="w-full bg-pva-teal hover:bg-pva-teal/90 text-white py-4 rounded-full font-bold transition transform hover:scale-105">
                Select Plan
              </button>
            </div>

            {/* Group - Featured */}
            <div className="bg-gradient-to-br from-pva-orange to-pva-orange/90 rounded-3xl p-10 shadow-2xl transform scale-105 hover:scale-110 transition-all duration-300 text-white relative overflow-hidden">
              <div className="absolute -top-3 right-8 px-4 py-1 bg-white rounded-full z-10">
                <span className="text-pva-orange font-black text-xs uppercase">Most Popular</span>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-white text-xs font-bold mb-6 uppercase">
                  Small Group
                </div>
                <h3 className="text-3xl font-black mb-3">Group Training</h3>
                <p className="text-white/90 mb-6">Train with peers in competitive, dynamic sessions</p>
                
                <div className="mb-8 pb-8 border-b border-white/20">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-black">$120</span>
                    <span className="text-white/80 ml-2">/session</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  {['4-6 athletes max', 'Team dynamics', 'Competition drills', 'Match scenarios', 'Peer motivation'].map((item) => (
                    <li key={item} className="flex items-center">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-white hover:bg-white/90 text-pva-orange py-4 rounded-full font-bold transition transform hover:scale-105">
                  Select Plan
                </button>
              </div>
            </div>

            {/* Elite */}
            <div className="bg-white rounded-3xl p-10 shadow-xl border-2 border-gray-100 hover:border-pva-green/50 transition-all duration-300 transform hover:scale-105">
              <div className="inline-block px-4 py-1 bg-gradient-to-r from-pva-green/10 to-pva-teal/10 rounded-full text-pva-green text-xs font-bold mb-6 uppercase">
                Advanced
              </div>
              <h3 className="text-3xl font-black text-pva-navy mb-3">Elite Program</h3>
              <p className="text-gray-600 mb-6">Complete championship-level training and development</p>
              
              <div className="mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-baseline">
                  <span className="text-5xl font-black text-pva-navy">$200</span>
                  <span className="text-gray-500 ml-2">/session</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {['All private features', 'Mental coaching', 'Nutrition plans', 'College recruiting', 'Priority access'].map((item) => (
                  <li key={item} className="flex items-center text-gray-700">
                    <div className="w-6 h-6 bg-gradient-to-r from-pva-green/10 to-pva-teal/10 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-pva-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="w-full bg-gradient-to-r from-pva-green to-pva-teal hover:opacity-90 text-white py-4 rounded-full font-bold transition transform hover:scale-105">
                Select Plan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Bento */}
      <section className="py-20 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-12 shadow-xl border border-gray-100">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-8 h-8 text-pva-orange" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-3xl md:text-4xl font-light text-pva-navy mb-8 leading-relaxed">
                "Polyface transformed not just my game, but my entire approach to volleyball. The coaches here are exceptional."
              </blockquote>
              <div className="flex items-center justify-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pva-teal to-pva-green rounded-full shadow-lg"></div>
                <div className="text-left">
                  <div className="font-bold text-pva-navy">Sarah Mitchell</div>
                  <div className="text-gray-500 text-sm">Division I Athlete, UCLA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-gradient-to-br from-pva-navy via-pva-navy to-black rounded-[40px] p-16 relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pva-teal/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pva-orange/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>
            
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Ready to Elevate
                <br />
                Your Game?
              </h2>
              <p className="text-xl text-gray-300 mb-10">
                Join hundreds of athletes who've transformed their skills at Polyface
              </p>
              <button className="bg-pva-orange hover:bg-pva-orange/90 text-white px-12 py-5 rounded-full text-lg font-bold transition transform hover:scale-105 shadow-2xl">
                Book Free Trial Session
              </button>
              <p className="text-gray-400 text-sm mt-6">No credit card required • Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-16 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/polyface-logo.png" alt="Polyface" className="h-12 w-12 rounded-2xl shadow-md" />
                <div>
                  <div className="text-2xl font-black tracking-tight leading-none">
                    <span className="text-pva-navy">POLY</span>
                    <span className="text-pva-teal">FACE</span>
                  </div>
                  <div className="text-xs text-gray-500">Volleyball Academy</div>
                </div>
              </div>
              <p className="text-gray-600 text-sm max-w-sm">
                Elite volleyball training for athletes who demand excellence
              </p>
            </div>
            <div>
              <h4 className="font-bold text-pva-navy mb-4">Programs</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Private Coaching</li>
                <li>Group Training</li>
                <li>Elite Program</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-pva-navy mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>About Us</li>
                <li>Our Coaches</li>
                <li>Testimonials</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-pva-navy mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Schedule</li>
                <li>Get in Touch</li>
                <li>FAQ</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 text-center text-sm text-gray-500">
            © 2026 Polyface Volleyball Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
