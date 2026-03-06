"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { trackAuth } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to activity or their intended destination
  useEffect(() => {
    if (!authLoading && userData) {
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/activity';
      sessionStorage.removeItem('redirectAfterLogin');
      router.push(redirectTo);
    }
  }, [userData, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Track successful login
      trackAuth.login(email);
      
      // Get redirect destination (stored in session if came from protected route)
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/activity';
      sessionStorage.removeItem('redirectAfterLogin');
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  // Show loading if already authenticated
  if (authLoading || userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-2xl shadow-black/50 p-8 border border-border">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold text-primary">Skedence</a>
          <h2 className="mt-6 text-3xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-2 text-foreground/60">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-6" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-foreground/60 text-sm mb-3">
            Don't have an account yet?
          </p>
          <a 
            href="/register" 
            className="text-primary hover:text-primary/80 font-medium text-sm hover:underline transition-colors"
          >
            Register Now →
          </a>
        </div>

        <div className="mt-6 text-center text-sm">
          <a href="/setup-password" className="text-foreground/50 hover:text-foreground hover:underline transition-colors">
            Need to set up your password?
          </a>
        </div>
      </div>
    </div>
  );
}
