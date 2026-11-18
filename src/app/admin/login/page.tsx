"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Globe, KeyRound, Lock, Mail, MapPin } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  const field =
    "h-[52px] w-full rounded-full border border-white/30 bg-white/[0.14] pl-12 pr-4 text-[15px] font-light text-white placeholder:text-white/75 outline-none transition focus:border-white focus:bg-white/20";

  return (
    <div className="admin-bg relative min-h-[100dvh] font-outfit text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Demi's" className="absolute left-6 top-7 md:left-9 md:top-8 h-6 w-auto" />
      <a
        href="/"
        className="absolute right-5 top-5 md:right-7 md:top-6 hidden sm:inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[rgba(58,52,48,0.48)] px-4 text-[15px] font-light backdrop-blur-xl hover:bg-[rgba(58,52,48,0.65)]"
      >
        <Globe className="h-5 w-5" strokeWidth={1.5} />
        Back to the website
      </a>

      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end gap-8 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-24 min-[700px]:flex-row min-[700px]:items-center min-[700px]:justify-between min-[700px]:gap-6 min-[700px]:pb-0">
        <div className="min-[700px]:self-end min-[700px]:pb-12">
          <h1 className="text-5xl min-[700px]:text-[44px] min-[700px]:whitespace-nowrap lg:text-[76px] font-extralight tracking-tight leading-none [text-shadow:0_2px_22px_rgba(0,0,0,0.3)]">
            Welcome back
          </h1>
          <p className="mt-3 text-base md:text-lg font-light text-white/90">Demi&apos;s Admin · Booking Management System</p>
          <div className="mt-5 hidden md:flex gap-1.5">
            {["Cricklewood", "Streatham Hill"].map((b) => (
              <span key={b} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-[rgba(58,52,48,0.48)] px-3.5 text-[13px] font-light backdrop-blur-xl">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                {b}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} aria-label="Sign in" className="glass w-full shrink-0 rounded-[28px] p-6 min-[700px]:w-[360px] min-[700px]:p-7 lg:w-[400px] lg:p-8">
          <div className="hidden md:flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/30 bg-white/[0.18]">
            <Lock className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className="mt-0 md:mt-5 text-3xl font-light">Sign in</h2>
          <p className="mt-1.5 mb-5 text-sm font-light text-white/85">Use your Demi&apos;s admin email and password.</p>

          {error && (
            <p role="alert" className="mb-3 rounded-2xl border border-red-300/40 bg-red-500/25 px-4 py-2.5 text-sm">
              {error}
            </p>
          )}

          <label className="relative block">
            <Mail className="absolute left-[18px] top-[16px] h-5 w-5 text-white/85" strokeWidth={1.5} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" placeholder="Email address" aria-label="Email address" className={field} />
          </label>
          <label className="relative mt-2.5 block">
            <KeyRound className="absolute left-[18px] top-[16px] h-5 w-5 text-white/85" strokeWidth={1.5} />
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-[8px] flex h-9 w-9 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
            >
              {show ? <EyeOff className="h-5 w-5" strokeWidth={1.5} /> : <Eye className="h-5 w-5" strokeWidth={1.5} />}
            </button>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-honey-300 text-base font-medium text-ink-900 transition hover:bg-honey-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </form>
      </div>

      <p className="absolute bottom-3 right-5 hidden lg:block text-[11px] font-light text-white/60">
        Crafted and Designed By{" "}
        <a href="https://bazeflix.co.uk" target="_blank" rel="noopener noreferrer" className="hover:text-white">
          Bazeflix
        </a>
      </p>
    </div>
  );
}
