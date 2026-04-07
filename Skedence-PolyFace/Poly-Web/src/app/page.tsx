'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Users, Calendar, Star, Phone, Mail, MapPin } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-pva-navy via-pva-navy/95 to-pva-teal/90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(78,166,176,0.15),transparent_50%)] pointer-events-none" />
        {/* Volleyball net graphic overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 60px)' }}
        />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="inline-block px-6 py-2 bg-pva-orange/20 backdrop-blur-sm rounded-full mb-8 border border-pva-orange/30">
            <span className="text-pva-orange font-bold text-sm tracking-wider uppercase">✦ Over 20 Years of Elite Coaching</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white mb-6 leading-none tracking-tight">
            PUSH YOUR<br />
            <span className="text-pva-teal">LIMITS</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto font-light">
            Professional volleyball training for athletes of all levels in the Chattanooga area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/portal/book"
              className="bg-pva-orange hover:bg-pva-orange/90 text-white px-10 py-5 rounded-lg text-lg font-bold transition transform hover:scale-105 shadow-2xl flex items-center justify-center gap-2"
            >
              Book a Lesson <ChevronRight size={20} />
            </Link>
            <a
              href="https://apps.apple.com/us/app/polyface-volleyball/id6752781077"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white px-8 py-5 rounded-lg text-base font-semibold transition border border-white/20 shadow-xl"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] text-gray-300 font-normal">Download on the</div>
                <div className="text-base font-bold">App Store</div>
              </div>
            </a>
            <a
              href="#programs"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-10 py-5 rounded-lg text-lg font-semibold transition border border-white/30"
            >
              Learn More
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Stats Banner */}
      <section className="bg-pva-navy py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '20+', label: 'Years Coaching' },
              { value: '500+', label: 'Athletes Trained' },
              { value: '4', label: 'Training Options' },
              { value: '★ 5.0', label: 'Rating' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-black text-pva-orange mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm font-semibold tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section id="programs" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-pva-navy mb-4">TRAINING OPTIONS</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Individual lessons and group classes designed to elevate your game</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Private Lessons */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 hover:border-pva-teal transition-all hover:shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-navy rounded-xl flex items-center justify-center shadow-lg group-hover:bg-pva-teal transition">
                <span className="text-3xl font-black text-white">01</span>
              </div>
              <div className="mt-8">
                <h3 className="text-3xl font-black text-pva-navy mb-4">INDIVIDUAL<br />LESSONS</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Personalized one-on-one sessions focused on your specific goals — serving, passing, attacking, and more.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-pva-orange">$80</span>
                  <span className="text-gray-500">/session</span>
                </div>
                <Link href="/portal/book" className="block w-full text-center bg-pva-navy text-white py-4 rounded-lg font-bold hover:bg-pva-teal transition">
                  Book Now
                </Link>
              </div>
            </div>

            {/* Group Classes */}
            <div className="group relative bg-gradient-to-br from-pva-navy to-pva-teal p-8 rounded-2xl border-2 border-pva-navy shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-orange rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-black text-white">02</span>
              </div>
              <div className="mt-8">
                <div className="inline-block bg-pva-orange/20 border border-pva-orange/40 rounded-full px-3 py-1 mb-4">
                  <span className="text-pva-orange text-xs font-bold uppercase tracking-wider">Most Popular</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-4">GROUP<br />CLASSES</h3>
                <p className="text-gray-200 mb-6 leading-relaxed">
                  Train with other athletes in a dynamic group environment that builds skills and team chemistry.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">$40</span>
                  <span className="text-gray-300">/athlete</span>
                </div>
                <Link href="/portal/book" className="block w-full text-center bg-white text-pva-navy py-4 rounded-lg font-bold hover:bg-gray-100 transition">
                  View Schedule
                </Link>
              </div>
            </div>

            {/* 2-Athlete */}
            <div className="group bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-pva-orange transition-all hover:shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Users size={28} className="text-pva-orange" />
                <h3 className="text-2xl font-black text-pva-navy">2-ATHLETE<br />PRIVATE</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Bring a training partner and share the cost of a private lesson. Great for partners working on the same skills.
              </p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-pva-orange">$140</span>
                <span className="text-gray-500">/session</span>
              </div>
              <Link href="/portal/book" className="block w-full text-center bg-pva-orange/10 text-pva-orange py-3 rounded-lg font-bold hover:bg-pva-orange hover:text-white transition">
                Book Now
              </Link>
            </div>

            {/* 3-Athlete */}
            <div className="group bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-pva-green transition-all hover:shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Users size={28} className="text-pva-green" />
                <h3 className="text-2xl font-black text-pva-navy">3-ATHLETE<br />PRIVATE</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Perfect for a small group wanting focused instruction at a more affordable per-athlete cost.
              </p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-pva-green">$180</span>
                <span className="text-gray-500">/session</span>
              </div>
              <Link href="/portal/book" className="block w-full text-center bg-pva-green/10 text-pva-green py-3 rounded-lg font-bold hover:bg-pva-green hover:text-white transition">
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About / Experience Section */}
      <section id="about" className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-4 py-1 bg-pva-teal/10 border border-pva-teal/30 rounded-full mb-6">
                <span className="text-pva-teal text-sm font-bold uppercase tracking-wider">About Us</span>
              </div>
              <h2 className="text-5xl font-black text-pva-navy mb-6 leading-tight">20+ YEARS<br />OF WINNING</h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                PolyFace Volleyball Academy has been developing elite athletes for over two decades.
                Whether you&apos;re picking up a volleyball for the first time or preparing for club competition,
                our coaches will help you reach your potential.
              </p>
              <Link
                href="/portal/book"
                className="inline-flex items-center gap-2 bg-pva-orange hover:bg-pva-orange/90 text-white px-8 py-4 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-xl"
              >
                Start Training <ChevronRight size={20} />
              </Link>
            </div>
            <div className="space-y-5">
              {[
                { icon: <Users size={20} />, title: 'All Skill Levels', desc: 'From beginners discovering the sport to advanced athletes honing technique.' },
                { icon: <Calendar size={20} />, title: 'Flexible Scheduling', desc: 'Book sessions when it works for you — weekday and weekend availability.' },
                { icon: <Star size={20} />, title: 'Proven Coaching', desc: 'Training methods refined across 20+ years producing competitive players.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-5 bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-pva-teal transition hover:shadow-md">
                  <div className="w-12 h-12 bg-pva-teal/10 rounded-xl flex items-center justify-center text-pva-teal flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-pva-navy mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-pva-navy">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black text-white mb-6">READY TO LEVEL UP?</h2>
          <p className="text-gray-300 text-xl mb-10 max-w-2xl mx-auto">
            Download the Skedence app or log in to the client portal to book your first session.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-pva-orange hover:bg-pva-orange/90 text-white px-10 py-5 rounded-lg text-lg font-bold transition transform hover:scale-105 shadow-2xl"
            >
              Client Login
            </Link>
            <Link
              href="/register"
              className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-lg text-lg font-semibold transition border border-white/30"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-pva-navy mb-4">GET IN TOUCH</h2>
            <p className="text-gray-600 text-lg">Questions? We'd love to hear from you.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: <Phone size={24} />, label: 'Phone', value: '314-898-2580' },
              { icon: <Mail size={24} />, label: 'Email', value: 'Jeff@polyfacevolleyball.com' },
              { icon: <MapPin size={24} />, label: 'Location', value: 'Chattanooga, TN' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center p-6">
                <div className="w-14 h-14 bg-pva-navy rounded-xl flex items-center justify-center text-white mb-4">
                  {item.icon}
                </div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{item.label}</div>
                <div className="font-semibold text-pva-navy">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-pva-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <Image src="/polyface-logo.webp" alt="Polyface" width={48} height={48} className="rounded-xl" />
              <div>
                <div className="text-xl font-black">
                  <span className="text-white">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
                <div className="text-xs text-gray-400 tracking-widest">VOLLEYBALL ACADEMY</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm font-semibold text-gray-400">
              <a href="#programs" className="hover:text-pva-orange transition">Training</a>
              <a href="#about" className="hover:text-pva-orange transition">About</a>
              <Link href="/login" className="hover:text-pva-orange transition">Client Login</Link>
              <Link href="/privacy" className="hover:text-pva-orange transition">Privacy Policy</Link>
            </div>
            <div className="text-sm text-gray-400 text-center md:text-right">
              <div>© 2026 PolyFace Volleyball Academy</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
