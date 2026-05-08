import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
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
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-gray-400">
            <a href="/#programs" className="hover:text-pva-orange transition">Training</a>
            <Link href="/classes-and-camps" className="hover:text-pva-orange transition">Classes &amp; Camps</Link>
            <Link href="/trainers" className="hover:text-pva-orange transition">Trainers</Link>
            <Link href="/blog" className="hover:text-pva-orange transition">Blog</Link>
            <Link href="/cancellation-policy" className="hover:text-pva-orange transition">Cancellation Policy</Link>
            <Link href="/sign-waiver" className="hover:text-pva-orange transition">Sign Waiver</Link>
            <Link href="/login" className="hover:text-pva-orange transition">Client Login</Link>
            <Link href="/privacy" className="hover:text-pva-orange transition">Privacy Policy</Link>
          </div>
          <div className="text-sm text-gray-400 text-center md:text-right">
            <div>© 2026 PolyFace Volleyball Academy</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
