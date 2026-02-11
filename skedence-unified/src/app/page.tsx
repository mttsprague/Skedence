'use client';

import Script from 'next/script';

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      
      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-wrapper">
            <a href="/" className="logo">
              <img src="/logo-nav.png" alt="Skedence Logo" />
              <span className="logo-text">Skedence</span>
            </a>
            <button className="mobile-menu-toggle" aria-label="Toggle menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <ul className="nav-menu">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="/support">Support</a></li>
              <li className="dropdown">
                <a href="#" className="dropdown-toggle">
                  About
                  <svg className="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <ul className="dropdown-menu">
                  <li><a href="/about">About Us</a></li>
                  <li><a href="/demo.html">Product Demo</a></li>
                </ul>
              </li>
              <li><a href="/login">Sign In / Register</a></li>
              <li><a href="#cta" className="btn btn-primary">Start Free Trial</a></li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Run Your Coaching Business With Confidence</h1>
            <p className="hero-subtitle">All-in-one platform to schedule classes, manage clients, process payments, and grow your coaching business. No more juggling multiple tools.</p>
            <div className="hero-cta">
              <a href="#pricing" className="btn btn-white btn-large">Start 14-Day Free Trial</a>
              <a href="#features" className="btn btn-outline-white btn-large">See How It Works</a>
            </div>
            <p className="hero-note">✓ No credit card required  ✓ Cancel anytime  ✓ Full access during trial</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need to Succeed</h2>
            <p>Powerful features designed specifically for coaches, trainers, and studios</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Smart Scheduling</h3>
              <p>Automated booking system with real-time availability. Clients book directly, and you stay in control with custom availability slots.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Built-in Payments</h3>
              <p>Secure payment processing powered by Stripe. Sell lesson packages, manage subscriptions, and get paid automatically.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Client Management</h3>
              <p>Complete client profiles with booking history, attendance tracking, payment records, and custom notes.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🏋️</div>
              <h3>Group Classes</h3>
              <p>Create and manage group classes with capacity limits, waitlists, and recurring schedules.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Business Analytics</h3>
              <p>Track revenue, attendance rates, popular time slots, and client retention with powerful dashboards.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Apps</h3>
              <p>Native iOS apps for both coaches and clients. Manage your business and book sessions on the go.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Multi-Location</h3>
              <p>Manage multiple studios or training locations from one account. Perfect for growing businesses.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Digital Waivers</h3>
              <p>Custom waiver forms with e-signatures. Clients sign electronically before their first session.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>Simple Setup, Powerful Results</h2>
            <p>Get up and running in minutes, not days</p>
          </div>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Your Account</h3>
              <p>Sign up in 60 seconds. Add your business details, services, and availability.</p>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <h3>Invite Your Clients</h3>
              <p>Share your booking link or import existing clients. They download the app and book instantly.</p>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <h3>Start Training</h3>
              <p>Accept bookings, process payments, and focus on what you do best—coaching.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>Trusted by Coaches Worldwide</h2>
            <p>See what trainers are saying about Skedence</p>
          </div>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">&quot;Skedence has completely transformed how I run my personal training business. No more back-and-forth texts trying to schedule sessions!&quot;</p>
              <div className="testimonial-author">
                <strong>Sarah Johnson</strong>
                <span>Personal Trainer, Los Angeles</span>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">&quot;The payment processing is seamless. I love that clients can purchase packages right from the app. My revenue has increased 40% since switching.&quot;</p>
              <div className="testimonial-author">
                <strong>Mike Chen</strong>
                <span>CrossFit Coach, San Francisco</span>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">&quot;Managing three studio locations used to be a nightmare. Now everything is organized in one place. Game changer for our business.&quot;</p>
              <div className="testimonial-author">
                <strong>Jessica Martinez</strong>
                <span>Yoga Studio Owner, Austin</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <div className="section-header">
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose the plan that fits your business. All plans include a 14-day free trial. No credit card required.</p>
          </div>
          
          <div className="pricing-grid">
            {/* Starter Plan */}
            <div className="pricing-card">
              <h3>Starter</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">29</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">Perfect for solo coaches and trainers</p>
              <ul className="features-list">
                <li>✓ 1 trainer account</li>
                <li>✓ 1 location</li>
                <li>✓ Unlimited clients</li>
                <li>✓ Unlimited bookings</li>
                <li>✓ Payment processing</li>
                <li>✓ Client mobile app</li>
                <li>✓ Email support</li>
              </ul>
              <a href="#cta" className="btn btn-primary">Start Free Trial</a>
            </div>
            
            {/* Studio Plan */}
            <div className="pricing-card featured">
              <div className="badge">Most Popular</div>
              <h3>Studio</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">99</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">For growing studios and businesses</p>
              <ul className="features-list">
                <li>✓ Up to 5 trainers</li>
                <li>✓ 3 locations</li>
                <li>✓ Everything in Starter</li>
                <li>✓ Group class management</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Priority support</li>
                <li>✓ Custom branding</li>
              </ul>
              <a href="#cta" className="btn btn-primary">Start Free Trial</a>
            </div>
            
            {/* Academy Plan */}
            <div className="pricing-card">
              <h3>Academy</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">249</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">For large training facilities</p>
              <ul className="features-list">
                <li>✓ Up to 15 trainers</li>
                <li>✓ 10 locations</li>
                <li>✓ Everything in Studio</li>
                <li>✓ Advanced permissions</li>
                <li>✓ API access</li>
                <li>✓ Dedicated support</li>
                <li>✓ Custom integrations</li>
              </ul>
              <a href="#cta" className="btn btn-primary">Start Free Trial</a>
            </div>
            
            {/* Enterprise Plan */}
            <div className="pricing-card">
              <h3>Enterprise</h3>
              <div className="price">
                <span className="custom">Custom</span>
              </div>
              <p className="plan-description">For franchises and large organizations</p>
              <ul className="features-list">
                <li>✓ Unlimited trainers</li>
                <li>✓ Unlimited locations</li>
                <li>✓ Everything in Academy</li>
                <li>✓ White-label solution</li>
                <li>✓ SLA guarantee</li>
                <li>✓ Account manager</li>
                <li>✓ Custom development</li>
              </ul>
              <a href="/support" className="btn btn-outline">Contact Sales</a>
            </div>
          </div>
          
          <div className="pricing-addons">
            <h3>Add-Ons (Available on All Plans)</h3>
            <div className="addons-grid">
              <div className="addon-item">
                <strong>Additional Trainer</strong>
                <span>$10/month per trainer</span>
              </div>
              <div className="addon-item">
                <strong>Additional Location</strong>
                <span>$25/month per location</span>
              </div>
              <div className="addon-item">
                <strong>Custom Domain</strong>
                <span>$15/month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq">
        <div className="container">
          <div className="section-header">
            <h2>Frequently Asked Questions</h2>
          </div>
          
          <div className="faq-grid">
            <div className="faq-item">
              <h3>How does the free trial work?</h3>
              <p>Start with a 14-day free trial with full access to all features. No credit card required to start. If you love Skedence, choose a plan after your trial ends.</p>
            </div>
            
            <div className="faq-item">
              <h3>Can I cancel anytime?</h3>
              <p>Yes! Cancel anytime with no penalties or cancellation fees. Your data remains accessible for 30 days after cancellation.</p>
            </div>
            
            <div className="faq-item">
              <h3>How does payment processing work?</h3>
              <p>We use Stripe for secure payment processing. Stripe charges 2.9% + $0.30 per transaction. Funds are deposited directly to your bank account within 2 business days.</p>
            </div>
            
            <div className="faq-item">
              <h3>Do my clients need to download an app?</h3>
              <p>Yes, your clients download the free Skedence app (iOS) to book sessions and manage their schedule. It&apos;s simple, fast, and user-friendly.</p>
            </div>
            
            <div className="faq-item">
              <h3>Can I import my existing clients?</h3>
              <p>Absolutely! You can manually add clients or import them via CSV. We also offer migration assistance for larger client lists.</p>
            </div>
            
            <div className="faq-item">
              <h3>Is my data secure?</h3>
              <p>Yes. We use bank-level encryption, secure cloud infrastructure (Firebase), and comply with GDPR and CCPA regulations. Your data is backed up daily.</p>
            </div>
            
            <div className="faq-item">
              <h3>What if I need help getting started?</h3>
              <p>We offer email support for all plans, with priority support for Studio+ plans. We also have comprehensive documentation and video tutorials.</p>
            </div>
            
            <div className="faq-item">
              <h3>Can I upgrade or downgrade my plan?</h3>
              <p>Yes! Change plans anytime. Upgrades take effect immediately. Downgrades take effect at the end of your current billing cycle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="cta">
        <div className="container">
          <h2>Ready to Transform Your Coaching Business?</h2>
          <p>Join hundreds of coaches using Skedence to save time and grow their business</p>
          <div className="cta-buttons">
            <a href="/support" className="btn btn-white btn-large">Start Free Trial</a>
            <a href="/support" className="btn btn-outline-white btn-large">Contact Sales</a>
          </div>
          <p className="cta-note">14-day free trial • No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/support">Support</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/support">Contact</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Connect</h4>
              <p>support@skedence.com</p>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2026 Skedence. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
