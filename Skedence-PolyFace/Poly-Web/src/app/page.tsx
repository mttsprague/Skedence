'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Users, User, Calendar, Star, Phone, Mail, MapPin } from 'lucide-react'

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
        {/* Polyface logo — top right, below fixed navbar */}
        <div className="absolute top-20 right-6 z-20 pointer-events-none select-none">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-white/20">
            <Image
              src="/polyface-logo.png"
              alt="Polyface Volleyball Academy"
              width={110}
              height={110}
              className="w-20 sm:w-24 h-auto object-contain"
              priority
            />
          </div>
        </div>
        {/* Left background image — hidden on mobile, visible md+ */}
        <div className="hidden md:block absolute bottom-0 left-0 w-[420px] lg:w-[500px] pointer-events-none select-none opacity-60" style={{ mixBlendMode: 'multiply' }}>
          <Image
            src="/coach-tablet-1on1.png"
            alt="Coach with athlete"
            width={500}
            height={500}
            className="w-full h-auto object-contain object-bottom"
            priority
          />
        </div>
        {/* Right background image — smaller/more transparent on mobile */}
        <div className="absolute bottom-0 right-0 w-[260px] sm:w-[360px] md:w-[560px] lg:w-[640px] pointer-events-none select-none opacity-30 md:opacity-60" style={{ mixBlendMode: 'multiply' }}>
          <Image
            src="/coach-tablet-group.png"
            alt="Coach showing feedback on screen"
            width={1366}
            height={768}
            className="w-full h-auto object-contain object-bottom"
            priority
          />
        </div>
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
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Private lessons, group classes, and camps designed to elevate your game at every level</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

            {/* 01 — Private */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 hover:border-pva-navy transition-all hover:shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-navy rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-2xl font-black text-white">01</span>
              </div>
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 bg-pva-navy/8 rounded-full px-3 py-1 mb-4">
                  <User size={13} className="text-pva-navy" />
                  <span className="text-pva-navy text-xs font-bold uppercase tracking-wider">1-on-1</span>
                </div>
                <h3 className="text-3xl font-black text-pva-navy mb-3">PRIVATE<br />LESSONS</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Focused, personalized sessions built around your specific goals — serving, passing, attacking, setting, or defense. The fastest way to level up.
                </p>
                <ul className="space-y-2 mb-6">
                  {['All skill levels welcome', 'Flexible scheduling', 'Technique-focused reps'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-pva-navy flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/portal/book" className="block w-full text-center bg-pva-navy text-white py-3.5 rounded-xl font-bold hover:bg-pva-navy/90 transition">
                  Book a Private Session
                </Link>
              </div>
            </div>

            {/* 02 — Multi-Athlete (hero card) */}
            <div className="group relative bg-gradient-to-br from-pva-navy via-pva-navy to-blue-900 p-8 rounded-2xl border-2 border-pva-navy shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-orange rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-2xl font-black text-white">02</span>
              </div>
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 bg-pva-orange/25 border border-pva-orange/40 rounded-full px-3 py-1 mb-4">
                  <span className="text-pva-orange text-xs font-bold uppercase tracking-wider">Best Value</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-3">MULTI-ATHLETE<br />PRIVATE</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Bring 2–4 training partners and split the cost of a private lesson. Same focused coaching, more affordable per athlete.
                </p>
                <ul className="space-y-2 mb-6">
                  {['2, 3, or 4 athletes', 'Lower cost per person', 'Great for friends & teammates'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-pva-orange flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/portal/book" className="block w-full text-center bg-white text-pva-navy py-3.5 rounded-xl font-bold hover:bg-gray-100 transition">
                  Book Multi-Athlete
                </Link>
              </div>
            </div>

            {/* 03 — Small Group Classes */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 hover:border-pva-orange transition-all hover:shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-orange rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-2xl font-black text-white">03</span>
              </div>
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 bg-pva-orange/10 rounded-full px-3 py-1 mb-4">
                  <Users size={13} className="text-pva-orange" />
                  <span className="text-pva-orange text-xs font-bold uppercase tracking-wider">Group · Mobile</span>
                </div>
                <h3 className="text-3xl font-black text-pva-navy mb-3">SMALL GROUP<br />CLASSES</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  High-energy group sessions that build skills and court chemistry. Structured by skill level and age so every rep counts.
                </p>
                <div className="bg-pva-orange/8 border border-pva-orange/20 rounded-xl px-4 py-3 mb-6">
                  <p className="text-sm font-bold text-pva-navy">📍 We can come to you!</p>
                  <p className="text-sm text-gray-600 mt-0.5">Host a class at your facility. Reach out for group rates.</p>
                </div>
                <div className="flex gap-3">
                  <Link href="/classes-and-camps" className="flex-1 text-center bg-pva-orange text-white py-3.5 rounded-xl font-bold hover:bg-pva-orange/90 transition text-sm">
                    View Classes
                  </Link>
                  <Link href="/portal/book" className="flex-1 text-center bg-pva-orange/10 text-pva-orange py-3.5 rounded-xl font-bold hover:bg-pva-orange hover:text-white transition text-sm">
                    Book Now
                  </Link>
                </div>
              </div>
            </div>

            {/* 04 — Camps */}
            <div className="group relative bg-gradient-to-br from-pva-navy via-blue-900 to-slate-900 p-8 rounded-2xl border-2 border-pva-navy shadow-2xl">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-pva-navy rounded-xl flex items-center justify-center shadow-lg border-2 border-pva-orange/60 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-black text-white">04</span>
              </div>
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-4">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Summer 2026</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-3">CAMPS</h3>
                <p className="text-gray-300 mb-5 leading-relaxed">
                  Immersive multi-day camps for every age group. High reps, great coaching, and an experience athletes remember.
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    { label: 'PeeWees Camp', desc: '3rd – 5th grade' },
                    { label: '14U Camp', desc: 'Middle school athletes' },
                    { label: 'High School Camp', desc: 'HS prep & competition' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="flex items-center justify-between bg-white/8 rounded-lg px-4 py-2.5">
                      <span className="text-white font-bold text-sm">{label}</span>
                      <span className="text-gray-400 text-xs">{desc}</span>
                    </div>
                  ))}
                </div>
                <Link href="/classes-and-camps" className="block w-full text-center bg-pva-orange text-white py-3.5 rounded-xl font-bold hover:bg-pva-orange/90 transition">
                  See All Camps
                </Link>
              </div>
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
              {/* Trainer headshot */}
              <div className="flex gap-4 mb-8 items-end">
                <div className="relative w-36 h-44 flex-shrink-0 rounded-2xl overflow-hidden bg-white shadow-xl border border-gray-100">
                  <Image
                    src="/trainer-headshot.png"
                    alt="Head coach"
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>
              <Link
                href="/portal/book"
                className="inline-flex items-center gap-2 bg-pva-orange hover:bg-pva-orange/90 text-white px-8 py-4 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-xl"
              >
                Start Training <ChevronRight size={20} />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 ml-4 text-pva-teal font-semibold hover:underline text-lg"
              >
                Meet Jeff →
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

      {/* Partners Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Powered By</p>
          <h2 className="text-3xl font-black text-pva-navy mb-12">Our Trusted Partners</h2>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-stretch">
            {/* VolleyIQ */}
            <a
              href="https://appvolleyiq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 max-w-sm mx-auto bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-8 flex flex-col items-center gap-4 group"
            >
              <img
                src="https://appvolleyiq.com/AppIcon.png"
                alt="VolleyIQ"
                className="w-20 h-20 rounded-2xl object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="text-xl font-black text-pva-navy mb-1">VolleyIQ</div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Expert video coaching — submit your clips and get timestamped feedback from certified coaches.
                </p>
              </div>
              <span className="mt-auto text-pva-orange font-semibold text-sm group-hover:underline">
                Learn More →
              </span>
            </a>
            {/* All Volleyball */}
            <a
              href="https://www.allvolleyball.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 max-w-sm mx-auto bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-8 flex flex-col items-center gap-4 group"
            >
              <img
                src="/av-logo.png"
                alt="All Volleyball"
                className="w-24 h-20 object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="text-xl font-black text-pva-navy mb-1">All Volleyball</div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  The nation&apos;s most trusted volleyball gear supplier since 1995 — shoes, jerseys, equipment and more.
                </p>
              </div>
              <span className="mt-auto text-pva-orange font-semibold text-sm group-hover:underline">
                Shop Now →
              </span>
            </a>
            {/* Skedence */}
            <a
              href="https://skedence.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 max-w-sm mx-auto bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-8 flex flex-col items-center gap-4 group"
            >
              <img
                src="/skedence-icon.png"
                alt="Skedence"
                className="w-20 h-20 rounded-2xl object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="text-xl font-black text-pva-navy mb-1">Skedence</div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  The platform powering our scheduling, lesson packages, and client booking — available for sports organizations everywhere.
                </p>
              </div>
              <span className="mt-auto text-pva-orange font-semibold text-sm group-hover:underline">
                Learn More →
              </span>
            </a>
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
                <div className="text-xs text-pva-orange tracking-widest">VOLLEYBALL ACADEMY</div>
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
