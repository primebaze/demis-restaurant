"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type GroupInfo = {
  groupCode: string;
  date: string;
  partySize: number;
  locationSlug: string;
  selectionsCount: number;
  isFull: boolean;
};

const APPETISERS = ["Puff Puff", "Samosa", "Spring Rolls"];

const LOCATION_NAMES: Record<string, string> = {
  cricklewood: "Cricklewood",
  streatham: "Streatham Hill",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function GuestSelectionPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [guestName, setGuestName] = useState("");
  const [appetiser, setAppetiser] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/set-menu/groups/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
        } else {
          setGroup(data);
        }
      })
      .catch(() => setLoadError("Could not load this event. Please check your link."))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim()) { setSubmitError("Please enter your name"); return; }
    if (!appetiser) { setSubmitError("Please choose your appetiser"); return; }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/set-menu/groups/${code}/selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName: guestName.trim(), appetiser, website: honeypot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-stone-400 text-sm">Loading your event…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl font-bold text-white mb-3">Link not found</p>
          <p className="text-stone-400 text-sm leading-relaxed">{loadError}</p>
          <Link href="/set-menu" className="mt-8 inline-block btn-gold px-6 py-2.5 text-sm">
            View Set Menu &rarr;
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          {/* Success icon */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gold-300/[0.08] border border-gold-300/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="section-label mb-3">Selection Confirmed</p>
          <h1 className="heading-lg mb-4">You&apos;re all set, {guestName.split(" ")[0]}!</h1>
          <p className="body-text text-sm max-w-sm mx-auto">
            Your appetiser choice of <span className="text-gold-300 font-semibold">{appetiser}</span> has been saved.
            We look forward to welcoming you on {group && formatDate(group.date)}.
          </p>

          <div className="mt-10 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-left space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60">Your Menu</p>
            {[
              { label: "Appetiser", value: appetiser },
              { label: "Starter", value: "Salad" },
              { label: "Main", value: "Jollof Rice + Chicken" },
              { label: "Dessert", value: "Ice Cream Xplosion" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
                <span className="text-xs text-stone-500 uppercase tracking-wider">{label}</span>
                <span className="text-sm text-stone-200 font-medium">{value}</span>
              </div>
            ))}
          </div>

          <Link href="/" className="mt-8 inline-block text-sm text-gold-300 hover:text-gold-200 transition-colors">
            ← Back to Demi&apos;s Restaurant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <div className="relative overflow-hidden px-6 pt-16 pb-10 text-center bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-gold-300/[0.04] blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-2xl font-bold text-gold-300 tracking-wider font-serif">Demi&apos;s</h1>
          </Link>
          <p className="section-label mb-2">Group {code}</p>
          <h2 className="heading-lg mb-3">Choose Your Menu</h2>
          {group && (
            <p className="text-sm text-stone-400">
              {formatDate(group.date)} &middot; {LOCATION_NAMES[group.locationSlug] || group.locationSlug}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 pb-20">
        {group?.isFull ? (
          <div className="text-center py-12">
            <p className="text-lg font-semibold text-white mb-2">All selections received</p>
            <p className="text-sm text-stone-400">Everyone in this group has submitted their menu choice.</p>
          </div>
        ) : (
          <>
            {/* Menu preview */}
            <div className="mb-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-6">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-300/60 mb-4">Your Four Course Menu</p>
              <div className="space-y-3">
                {[
                  { label: "01 Appetiser", value: "Your choice below ↓", highlight: true },
                  { label: "02 Starter", value: "Salad" },
                  { label: "03 Main", value: "Jollof Rice + Chicken" },
                  { label: "04 Dessert", value: "Ice Cream Xplosion" },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/[0.05] last:border-0">
                    <span className="text-xs text-stone-500 uppercase tracking-wider">{label}</span>
                    <span className={`text-sm font-medium ${highlight ? "text-gold-300" : "text-stone-200"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot — hidden from humans */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Amara Johnson"
                  maxLength={200}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.10] rounded-xl text-white placeholder-stone-600 text-sm focus:outline-none focus:border-gold-300/40 transition-colors"
                />
              </div>

              {/* Appetiser choice */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-3">Choose Your Appetiser</label>
                <div className="grid grid-cols-3 gap-3">
                  {APPETISERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setAppetiser(item)}
                      className={`relative py-4 px-3 rounded-xl border text-sm font-medium text-center transition-all duration-200 ${
                        appetiser === item
                          ? "border-gold-300/50 bg-gold-300/[0.08] text-gold-300"
                          : "border-white/[0.08] bg-white/[0.02] text-stone-400 hover:border-white/20 hover:text-stone-200"
                      }`}
                    >
                      {appetiser === item && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold-300" />
                      )}
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-gold py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Confirm My Selection →"}
              </button>

              <p className="text-xs text-stone-600 text-center">
                Group {code} &middot; {group?.selectionsCount ?? 0} of {group?.partySize ?? "?"} selections received
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
