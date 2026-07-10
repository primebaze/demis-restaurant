"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ───
type Location = { id: string; name: string; slug: string; address: string };
type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  remaining: number;
  available: boolean;
};
type Policy = {
  minPartySize: number;
  maxPartySize: number;
  depositThreshold: number;
  depositAmountPence: number;
  cancellationWindowH: number;
};
type AddOn = { id: string; name: string; description: string; pricePence: number };
type BlackoutDateEntry = { date: string; locationId: string | null; reason: string };
type BookingResult = {
  confirmationCode: string;
  location: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  depositRequired: boolean;
  depositAmountPence: number;
  managementUrl: string;
};

const STEPS = ["Location", "Date", "Time", "Details", "Confirm"];

function formatPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateLong(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Convert 24h "13:30" → "1:30 PM" */
function formatTime(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  // Build 6-row grid padded with nulls
  const cells: (string | null)[] = [];
  // Pad start (Mon-first: shift so Mon=0)
  const startPad = (startDow + 6) % 7; // Monday-first offset
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  return cells;
}

function getMaxDate(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

type BookingWidgetProps = {
  initialLocations?: Location[];
  initialAddOns?: AddOn[];
  initialBlackoutDates?: BlackoutDateEntry[];
};

export default function BookingWidget({ initialLocations, initialAddOns, initialBlackoutDates }: BookingWidgetProps) {
  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState<Location[]>(initialLocations ?? []);
  const [addOns, setAddOns] = useState<AddOn[]>(initialAddOns ?? []);
  const blackoutDates = initialBlackoutDates ?? [];

  // Selections
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // Guest details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ─── Calendar state ───
  const todayStr = new Date().toISOString().split("T")[0];
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const maxDate = getMaxDate(8);

  function prevMonth() {
    const now = new Date();
    if (calYear === now.getFullYear() && calMonth === now.getMonth()) return;
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  }
  function nextMonth() {
    const max = new Date(maxDate + "T12:00:00");
    if (calYear > max.getFullYear() || (calYear === max.getFullYear() && calMonth >= max.getMonth())) return;
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  }

  // Result
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  // ─── Scroll to top of widget when step changes ───
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ─── Load locations + add-ons (skip if server-provided) ───
  useEffect(() => {
    if (locations.length === 0) {
      fetch("/api/locations")
        .then((r) => r.json())
        .then((d) => setLocations(d.locations || []));
    }
    if (addOns.length === 0) {
      fetch("/api/addons")
        .then((r) => r.json())
        .then((d) => setAddOns(d.addOns || []));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load availability when location + date selected ───
  const fetchAvailability = useCallback(async (slug: string, date: string) => {
    setAvailabilityError("");
    setSlots([]);
    setSelectedSlot(null);

    try {
      const res = await fetch(`/api/availability?location=${slug}&date=${date}`);
      const data = await res.json();

      if (!data.available) {
        setAvailabilityError(data.reason || "Not available");
        return;
      }

      setSlots(data.slots || []);
      setPolicy(data.policy || null);
    } catch {
      setAvailabilityError("Failed to load availability");
    }
  }, []);

  useEffect(() => {
    if (selectedLocation && selectedDate) {
      fetchAvailability(selectedLocation.slug, selectedDate);
    }
  }, [selectedLocation, selectedDate, fetchAvailability]);

  // ─── Submit booking ───
  async function handleSubmit() {
    if (!selectedLocation || !selectedSlot || !selectedDate) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationSlug: selectedLocation.slug,
          timeSlotId: selectedSlot.id,
          date: selectedDate,
          time: selectedSlot.startTime,
          partySize,
          name: guestName,
          email: guestEmail,
          phone: guestPhone || undefined,
          notes: guestNotes || undefined,
          addOnIds: selectedAddOns.length > 0 ? selectedAddOns : undefined,
          website: honeypot || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create booking");
        setLoading(false);
        return;
      }

      // Payment required → redirect to Stripe Checkout
      if (data.paymentRequired) {
        setError(""); // clear any previous error
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationCode: data.booking.confirmationCode }),
        });
        const checkoutData = await checkoutRes.json();

        if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
          setError(checkoutData.error || "Failed to start payment. Please try again.");
          setLoading(false);
          return;
        }

        // Redirect to Stripe hosted Checkout page
        window.location.href = checkoutData.checkoutUrl;
        return; // keep loading spinner until redirect completes
      }

      // No payment → show confirmation step directly
      setBookingResult(data.booking);
      setStep(5); // confirmation step
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const depositRequired = policy && partySize >= policy.depositThreshold;

  // ─── Render step indicator ───
  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-1 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                i === step
                  ? "bg-gold-300 text-[#1a1a1a]"
                  : i < step
                  ? "bg-gold-300/20 text-gold-300 cursor-pointer hover:bg-gold-300/30"
                  : "bg-white/5 text-white/30"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-[1px] ${i < step ? "bg-gold-300/40" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ─── STEP 0: Location ───
  if (step === 0) {
    return (
      <div>
        <StepIndicator />
        <h2 className="text-xl font-bold text-white mb-2">Choose a location</h2>
        <p className="text-sm text-stone-400 mb-6">Where would you like to dine?</p>

        <div className="grid sm:grid-cols-2 gap-4">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setSelectedLocation(loc);
                setStep(1);
              }}
              className="text-left p-6 rounded-2xl border border-white/[0.06] bg-[#222] hover:border-gold-300/30 hover:bg-[#282828] transition-all"
            >
              <h3 className="text-lg font-bold text-white">{loc.name}</h3>
              <p className="text-sm text-stone-400 mt-1">{loc.address}</p>
            </button>
          ))}

          {/* Sunday buffet shortcut */}
          <a
            href="/sunday-buffet"
            className="sm:col-span-2 group flex items-center justify-between gap-4 text-left p-6 rounded-2xl border border-gold-300/30 bg-gradient-to-br from-gold-300/[0.10] to-[#222] hover:border-gold-300/50 transition-all"
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold-300 font-semibold mb-1">Every Sunday · Streatham Hill</p>
              <h3 className="text-lg font-bold text-white">Sunday All-You-Can-Eat Buffet</h3>
              <p className="text-sm text-stone-400 mt-1">Reserve your spot, the earlier you book, the less you pay.</p>
            </div>
            <span className="text-gold-300 text-xl group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </div>
      </div>
    );
  }

  // ─── STEP 1: Date (Month Calendar) ───
  if (step === 1) {
    const cells = getMonthDays(calYear, calMonth);
    const monthLabel = new Date(calYear, calMonth).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const now = new Date();
    const canGoPrev = !(calYear === now.getFullYear() && calMonth === now.getMonth());
    const maxD = new Date(maxDate + "T12:00:00");
    const canGoNext = calYear < maxD.getFullYear() || (calYear === maxD.getFullYear() && calMonth < maxD.getMonth());

    return (
      <div>
        <StepIndicator />
        <h2 className="text-xl font-bold text-white mb-2">Pick a date</h2>
        <p className="text-sm text-stone-400 mb-6">
          Booking at <span className="text-gold-300">{selectedLocation?.name}</span>
        </p>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${canGoPrev ? "text-white hover:bg-white/10" : "text-stone-700 cursor-not-allowed"}`}
          >
            ‹
          </button>
          <h3 className="text-sm font-bold text-white tracking-wide">{monthLabel}</h3>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${canGoNext ? "text-white hover:bg-white/10" : "text-stone-700 cursor-not-allowed"}`}
          >
            ›
          </button>
        </div>

        {/* Day headers (Mon-Sun) */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-stone-600 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={`pad-${i}`} />;
            const isPast = dateStr < todayStr;
            const isBeyond = dateStr > maxDate;
            const isBlackout = selectedLocation
              ? blackoutDates.some(
                  (b) =>
                    b.date === dateStr &&
                    (b.locationId === null || b.locationId === selectedLocation.id)
                )
              : false;
            const disabled = isPast || isBeyond || isBlackout;
            const isSelected = selectedDate === dateStr;
            const dayNum = new Date(dateStr + "T12:00:00").getDate();
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                disabled={disabled}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setStep(2);
                }}
                title={isBlackout ? "Unavailable" : undefined}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                  disabled
                    ? isBlackout
                      ? "text-stone-700 cursor-not-allowed line-through decoration-red-500/60"
                      : "text-stone-700 cursor-not-allowed"
                    : isSelected
                    ? "bg-gold-300 text-[#1a1a1a]"
                    : isToday
                    ? "border border-gold-300/40 text-gold-300 hover:bg-gold-300/10"
                    : "text-white hover:bg-white/[0.06]"
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        <button onClick={() => setStep(0)} className="mt-6 text-sm text-stone-500 hover:text-white transition-colors">
          ← Change location
        </button>
      </div>
    );
  }

  // ─── STEP 2: Time + Party Size ───
  if (step === 2) {
    return (
      <div>
        <StepIndicator />
        <h2 className="text-xl font-bold text-white mb-2">Choose a time</h2>
        <p className="text-sm text-stone-400 mb-6">
          {selectedLocation?.name} · {formatDateLong(selectedDate)}
        </p>

        {/* Party size */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">
            Party size
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPartySize(Math.max(1, partySize - 1))}
              className="w-10 h-10 rounded-full border border-white/[0.1] bg-[#222] text-white text-lg flex items-center justify-center hover:border-gold-300/30 transition-all"
            >
              −
            </button>
            <span className="text-2xl font-bold text-white w-12 text-center">{partySize}</span>
            <button
              onClick={() =>
                setPartySize(Math.min(policy?.maxPartySize || 30, partySize + 1))
              }
              className="w-10 h-10 rounded-full border border-white/[0.1] bg-[#222] text-white text-lg flex items-center justify-center hover:border-gold-300/30 transition-all"
            >
              +
            </button>
          </div>
          {depositRequired && (
            <p className="mt-2 text-xs text-gold-300">
              ⚡ A {formatPence(policy!.depositAmountPence)} hold fee applies for parties of{" "}
              {policy!.depositThreshold}+
            </p>
          )}
        </div>

        {/* Time slots grouped by period */}
        {availabilityError ? (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/30 text-sm text-red-300">
            {availabilityError}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-stone-500">Loading time slots...</p>
        ) : (
          <div className="space-y-6">
            {[
              { label: "Lunch", icon: "☀️", from: "12:00", to: "14:59" },
              { label: "Afternoon", icon: "🌤", from: "15:00", to: "17:59" },
              { label: "Evening", icon: "🌙", from: "18:00", to: "20:59" },
              { label: "Late", icon: "✨", from: "21:00", to: "23:59" },
            ].map((period) => {
              const periodSlots = slots.filter(
                (s) => s.startTime >= period.from && s.startTime <= period.to
              );
              if (periodSlots.length === 0) return null;
              return (
                <div key={period.label}>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                    {period.icon} {period.label}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {periodSlots.map((slot) => {
                      const canFit = slot.available && slot.remaining >= partySize;
                      return (
                        <button
                          key={slot.id}
                          disabled={!canFit}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep(3);
                          }}
                          className={`px-3 py-3 rounded-xl border text-center transition-all ${
                            !canFit
                              ? "border-white/[0.04] bg-[#1e1e1e] text-stone-600 cursor-not-allowed"
                              : selectedSlot?.id === slot.id
                              ? "border-gold-300 bg-gold-300/10 text-gold-300"
                              : "border-white/[0.06] bg-[#222] text-white hover:border-gold-300/20"
                          }`}
                        >
                          <p className="text-sm font-bold">
                            {formatTime(slot.startTime)}
                          </p>
                          {!canFit && (
                            <p className="text-[10px] mt-1 text-stone-600">Full</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setStep(1)} className="mt-6 text-sm text-stone-500 hover:text-white transition-colors">
          ← Change date
        </button>
      </div>
    );
  }

  // ─── STEP 3: Guest Details + Add-Ons ───
  if (step === 3) {
    return (
      <div>
        <StepIndicator />
        <h2 className="text-xl font-bold text-white mb-2">Your details</h2>
        <p className="text-sm text-stone-400 mb-6">
          {selectedLocation?.name} · {formatDate(selectedDate)} · {selectedSlot ? formatTime(selectedSlot.startTime) : ""} · {partySize} {partySize === 1 ? "guest" : "guests"}
        </p>

        <div className="space-y-4">
          {/* Honeypot — invisible to real users, bots auto-fill it */}
          <div className="absolute opacity-0 -z-10 h-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
              Full name *
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Tunde Adeyemi"
              className="w-full px-4 py-3 rounded-xl bg-[#222] border border-white/[0.06] text-white text-sm placeholder:text-stone-600 focus:border-gold-300/40 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="tunde@email.com"
              className="w-full px-4 py-3 rounded-xl bg-[#222] border border-white/[0.06] text-white text-sm placeholder:text-stone-600 focus:border-gold-300/40 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="07400 123456"
              className="w-full px-4 py-3 rounded-xl bg-[#222] border border-white/[0.06] text-white text-sm placeholder:text-stone-600 focus:border-gold-300/40 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
              Special requests
            </label>
            <textarea
              value={guestNotes}
              onChange={(e) => setGuestNotes(e.target.value)}
              placeholder="Allergies, birthday celebration, high chair needed..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#222] border border-white/[0.06] text-white text-sm placeholder:text-stone-600 focus:border-gold-300/40 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Add-ons */}
          {addOns.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-3">
                Make it special
              </label>
              <div className="space-y-2">
                {addOns.map((addon) => {
                  const selected = selectedAddOns.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      onClick={() =>
                        setSelectedAddOns((prev) =>
                          selected ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                        )
                      }
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                        selected
                          ? "border-gold-300/40 bg-gold-300/5"
                          : "border-white/[0.06] bg-[#222] hover:border-white/[0.1]"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${selected ? "text-gold-300" : "text-white"}`}>
                          {addon.name}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">{addon.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <span className="text-sm font-bold text-gold-300">{formatPence(addon.pricePence)}</span>
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-all ${
                            selected ? "border-gold-300 bg-gold-300 text-[#1a1a1a]" : "border-white/20"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button onClick={() => setStep(2)} className="text-sm text-stone-500 hover:text-white transition-colors">
            ← Back
          </button>
          <button
            onClick={() => setStep(4)}
            disabled={!guestName || !guestEmail}
            className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
              guestName && guestEmail
                ? "bg-gold-300 text-[#1a1a1a] hover:bg-gold-200"
                : "bg-white/5 text-stone-600 cursor-not-allowed"
            }`}
          >
            Review Booking
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 4: Confirm ───
  if (step === 4) {
    const selectedAddOnDetails = addOns.filter((a) => selectedAddOns.includes(a.id));
    const addOnsTotalPence = selectedAddOnDetails.reduce((sum, a) => sum + a.pricePence, 0);
    const depositPence = depositRequired ? policy!.depositAmountPence : 0;
    const totalPayable = addOnsTotalPence + depositPence;

    return (
      <div>
        <StepIndicator />
        <h2 className="text-xl font-bold text-white mb-2">Confirm your booking</h2>
        <p className="text-sm text-stone-400 mb-6">Please review the details below.</p>

        <div className="rounded-2xl border border-white/[0.06] bg-[#222] divide-y divide-white/[0.04]">
          <div className="p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Location</p>
            <p className="text-sm font-semibold text-white">{selectedLocation?.name}</p>
            <p className="text-xs text-stone-400">{selectedLocation?.address}</p>
          </div>
          <div className="p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Date &amp; Time</p>
            <p className="text-sm font-semibold text-white">{formatDateLong(selectedDate)}</p>
            <p className="text-xs text-stone-400">
              {selectedSlot ? formatTime(selectedSlot.startTime) : ""}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Party Size</p>
            <p className="text-sm font-semibold text-white">
              {partySize} {partySize === 1 ? "guest" : "guests"}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Guest</p>
            <p className="text-sm font-semibold text-white">{guestName}</p>
            <p className="text-xs text-stone-400">{guestEmail}</p>
            {guestPhone && <p className="text-xs text-stone-400">{guestPhone}</p>}
          </div>
          {guestNotes && (
            <div className="p-5">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-stone-300">{guestNotes}</p>
            </div>
          )}
          {selectedAddOnDetails.length > 0 && (
            <div className="p-5">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Add-ons</p>
              {selectedAddOnDetails.map((a) => (
                <div key={a.id} className="flex items-center justify-between mb-1">
                  <p className="text-sm text-stone-300">{a.name}</p>
                  <p className="text-sm font-semibold text-gold-300">{formatPence(a.pricePence)}</p>
                </div>
              ))}
            </div>
          )}
          {depositRequired && (
            <div className="p-5 bg-gold-300/5">
              <p className="text-xs text-gold-300 uppercase tracking-wider mb-1">Hold Fee Required</p>
              <p className="text-sm font-bold text-gold-300">
                {formatPence(policy!.depositAmountPence)} per person
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Refundable if cancelled {policy!.cancellationWindowH}+ hours before your booking.
              </p>
            </div>
          )}
          {totalPayable > 0 && (
            <div className="p-5 bg-gold-300/5 border-t border-gold-300/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Total to Pay</p>
                <p className="text-lg font-bold text-gold-300">{formatPence(totalPayable)}</p>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                You&apos;ll be redirected to our secure payment page.
              </p>
            </div>
          )}
        </div>

        {/* Terms */}
        <label className="mt-5 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#e8cc9c]"
          />
          <span className="text-xs text-stone-400 leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" className="text-gold-300 hover:underline">
              booking terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-gold-300 hover:underline">
              privacy policy
            </Link>
            . I understand that late cancellations may forfeit the hold fee.
          </span>
        </label>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <button onClick={() => setStep(3)} className="text-sm text-stone-500 hover:text-white transition-colors">
            ← Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!acceptedTerms || loading}
            className={`flex-1 py-3.5 rounded-full font-bold text-sm transition-all ${
              acceptedTerms && !loading
                ? "bg-gold-300 text-[#1a1a1a] hover:bg-gold-200"
                : "bg-white/5 text-stone-600 cursor-not-allowed"
            }`}
          >
            {loading ? "Processing..." : totalPayable > 0 ? `Pay ${formatPence(totalPayable)} & Confirm` : "Confirm Booking"}
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 5: Confirmation ───
  if (step === 5 && bookingResult) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✓</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
        <p className="text-sm text-stone-400 mb-8">
          A confirmation email has been sent to your inbox.
        </p>

        <div className="rounded-2xl border border-white/[0.06] bg-[#222] p-6 text-left max-w-sm mx-auto">
          <div className="mb-4">
            <p className="text-xs text-stone-500 uppercase tracking-wider">Confirmation Code</p>
            <p className="text-xl font-bold text-gold-300 mt-1">{bookingResult.confirmationCode}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-400">Location</span>
              <span className="text-white font-medium">{bookingResult.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Date</span>
              <span className="text-white font-medium">{formatDateLong(bookingResult.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Time</span>
              <span className="text-white font-medium">{bookingResult.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Guests</span>
              <span className="text-white font-medium">{bookingResult.partySize}</span>
            </div>
            {bookingResult.depositRequired && (
              <div className="flex justify-between">
                <span className="text-stone-400">Hold Fee</span>
                <span className="text-gold-300 font-medium">
                  {formatPence(bookingResult.depositAmountPence)}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-stone-500">
          Need to change something?{" "}
          <Link href={bookingResult.managementUrl} className="text-gold-300 hover:underline">
            Manage your booking
          </Link>
        </p>

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-stone-500 hover:text-white transition-colors"
        >
          ← Back to homepage
        </Link>
      </div>
    );
  }

  return null;
}
