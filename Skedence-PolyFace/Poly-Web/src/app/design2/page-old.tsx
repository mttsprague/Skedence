'use client'

export default function Design2() {
  return (
    <div className="min-h-screen bg-pva-navy">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-pva-navy/95 backdrop-blur-sm border-b border-pva-teal/20">
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
              <a href="#" className="text-white/80 hover:text-pva-teal transition font-medium">Athletes</a>
              <a href="#" className="text-white/80 hover:text-pva-teal transition font-medium">Schedule</a>
              <a href="#" className="text-white/80 hover:text-pva-teal transition font-medium">Contact</a>
              <button className="bg-gradient-to-r from-pva-teal to-pva-green hover:opacity-90 text-white px-6 py-2.5 rounded-full font-bold transition transform hover:scale-105">
                Book Today
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Split Hero Section */}
      <section className="pt-24 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-pva-teal/10 rounded-full border border-pva-teal/30">
                <div className="w-2 h-2 bg-pva-green rounded-full animate-pulse"></div>
                <span className="text-pva-teal font-semibold text-sm">NOW ENROLLING</span>
              </div>
              
              <h1 className="text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-none">
                TRAIN
                <br />
                LIKE A
                <br />
                <span className="bg-gradient-to-r from-pva-teal via-pva-green to-pva-orange bg-clip-text text-transparent">
                  CHAMPION
                </span>
              </h1>

              <p className="text-xl text-pva-light-blue/90 max-w-lg leading-relaxed">
                Expert volleyball coaching tailored to your goals. From fundamentals to elite performance, 
                we transform athletes at every level.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="group bg-pva-orange hover:bg-pva-orange/90 text-white px-8 py-4 rounded-xl text-lg font-bold transition transform hover:scale-105 shadow-xl flex items-center justify-center">
                  Start Training
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button className="bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white px-8 py-4 rounded-xl text-lg font-bold transition border border-white/20">
                  View Schedule
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                <div>
                  <div className="text-4xl font-black text-pva-teal mb-1">10+</div>
                  <div className="text-sm text-pva-light-blue">Years</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-pva-green mb-1">500+</div>
                  <div className="text-sm text-pva-light-blue">Athletes</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-pva-orange mb-1">15</div>
                  <div className="text-sm text-pva-light-blue">Coaches</div>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden">
                {/* Placeholder for athlete image */}
                <div className="aspect-[3/4] bg-gradient-to-br from-pva-teal/20 via-pva-navy to-pva-orange/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-pva-navy via-transparent to-transparent"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-32 h-32 bg-pva-teal/20 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm border-2 border-pva-teal/30">
                      <svg className="w-16 h-16 text-pva-teal" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-white font-semibold">Your Image Here</p>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-pva-orange/30 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-pva-green/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="py-20 bg-gradient-to-r from-pva-teal to-pva-green relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Flexible Scheduling</h3>
              <p className="text-white/80">Book sessions that fit your lifestyle</p>
            </div>
            <div className="space-y-3">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Proven Results</h3>
              <p className="text-white/80">Track your progress every step</p>
            </div>
            <div className="space-y-3">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Expert Coaches</h3>
              <p className="text-white/80">Learn from the best in the game</p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-24 bg-pva-navy">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
              Choose Your <span className="text-pva-orange">Path</span>
            </h2>
            <p className="text-xl text-pva-light-blue">Three Programs. One Goal: Excellence.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Program 1 */}
            <div className="group bg-gradient-to-br from-pva-navy to-pva-navy/50 rounded-3xl p-8 border-2 border-pva-teal/30 hover:border-pva-teal transition-all duration-300 hover:shadow-2xl hover:shadow-pva-teal/20 transform hover:-translate-y-2">
              <div className="mb-6">
                <div className="inline-block px-4 py-1 bg-pva-teal/20 rounded-full text-pva-teal text-sm font-bold mb-4">
                  BEGINNER
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Foundations</h3>
                <p className="text-pva-light-blue">Master the basics with personalized attention</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-pva-teal">$80</span>
                <span className="text-pva-light-blue">/session</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['1-on-1 Training', 'Fundamentals Focus', 'Video Review', 'Weekly Progress'].map((item) => (
                  <li key={item} className="flex items-center text-white">
                    <div className="w-6 h-6 bg-pva-teal/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-pva-teal" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-pva-teal hover:bg-pva-teal/90 text-white py-4 rounded-xl font-bold transition transform group-hover:scale-105">
                Get Started
              </button>
            </div>

            {/* Program 2 - Featured */}
            <div className="group bg-gradient-to-br from-pva-orange to-pva-orange/80 rounded-3xl p-8 border-2 border-pva-orange shadow-2xl shadow-pva-orange/30 transform scale-105 lg:scale-110 hover:scale-110 lg:hover:scale-115 transition-all duration-300">
              <div className="mb-6">
                <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-white text-sm font-bold mb-4">
                  MOST POPULAR
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Competitive</h3>
                <p className="text-white/90">Take your skills to the next level</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-white">$120</span>
                <span className="text-white/80">/session</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Small Group Training', 'Game Strategy', 'Match Analysis', 'Tournament Prep', 'Strength & Conditioning'].map((item) => (
                  <li key={item} className="flex items-center text-white">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-white hover:bg-white/90 text-pva-orange py-4 rounded-xl font-bold transition transform group-hover:scale-105">
                Join Now
              </button>
            </div>

            {/* Program 3 */}
            <div className="group bg-gradient-to-br from-pva-navy to-pva-navy/50 rounded-3xl p-8 border-2 border-pva-green/30 hover:border-pva-green transition-all duration-300 hover:shadow-2xl hover:shadow-pva-green/20 transform hover:-translate-y-2">
              <div className="mb-6">
                <div className="inline-block px-4 py-1 bg-pva-green/20 rounded-full text-pva-green text-sm font-bold mb-4">
                  ELITE
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Championship</h3>
                <p className="text-pva-light-blue">Train like a professional athlete</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-pva-green">$200</span>
                <span className="text-pva-light-blue">/session</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Elite Coaching', 'College Recruiting', 'Mental Performance', 'Nutrition Plans', 'Priority Scheduling'].map((item) => (
                  <li key={item} className="flex items-center text-white">
                    <div className="w-6 h-6 bg-pva-green/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-pva-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-pva-green hover:bg-pva-green/90 text-white py-4 rounded-xl font-bold transition transform group-hover:scale-105">
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-pva-navy via-pva-teal/20 to-pva-navy relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pva-teal/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pva-orange/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-6xl md:text-7xl font-black text-white mb-8 leading-tight">
            Your Journey
            <br />
            <span className="bg-gradient-to-r from-pva-teal to-pva-green bg-clip-text text-transparent">
              Starts Today
            </span>
          </h2>
          <p className="text-2xl text-pva-light-blue mb-12 max-w-2xl mx-auto">
            Join the Polyface family and discover what you're truly capable of achieving
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-pva-orange hover:bg-pva-orange/90 text-white px-10 py-5 rounded-xl text-lg font-bold transition transform hover:scale-105 shadow-2xl">
              Book Free Consultation
            </button>
            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-10 py-5 rounded-xl text-lg font-bold transition border border-white/30">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/polyface-logo.png" alt="Polyface" className="h-10 w-10 rounded-lg" />
                <div className="text-2xl font-black">
                  <span className="text-white">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
              </div>
              <p className="text-pva-light-blue/80 text-sm">
                Building champions on and off the court since 2014
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-pva-teal">Training</h4>
              <ul className="space-y-2 text-sm text-pva-light-blue/80">
                <li>Private Lessons</li>
                <li>Group Training</li>
                <li>Elite Program</li>
                <li>Camps & Clinics</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-pva-teal">Academy</h4>
              <ul className="space-y-2 text-sm text-pva-light-blue/80">
                <li>Our Coaches</li>
                <li>Facilities</li>
                <li>Success Stories</li>
                <li>Blog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-pva-teal">Contact</h4>
              <ul className="space-y-2 text-sm text-pva-light-blue/80">
                <li>Schedule</li>
                <li>Location</li>
                <li>Get in Touch</li>
                <li>FAQ</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-pva-light-blue/60">
            <p>© 2026 Polyface Volleyball Academy. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-pva-teal transition">Privacy</a>
              <a href="#" className="hover:text-pva-teal transition">Terms</a>
              <a href="#" className="hover:text-pva-teal transition">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
