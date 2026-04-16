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

function getDates(days: number) {
  const dates: string[] = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export default function BookingWidget() {
  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Result
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  // ─── Load locations + add-ons ───
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []));
    fetch("/api/addons")
      .then((r) => r.json())
      .then((d) => setAddOns(d.addOns || []));
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create booking");
        setLoading(false);
        return;
      }

      setBookingResult(data.booking);
      setStep(5); // confirmation step
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const depositRequired = policy && partySize >= policy.depositThreshold;
  const dates = getDates(policy?.maxPartySize ? 30 : 30);

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
        </div>
      </div>
    );
  }

  // ─── STEP 1: Date ───
  if (step === 1) {
    return (
      <div>
        <StepIndicator />
        <h2 className="text-xl font-bold text-white mb-2">Pick a date</h2>
        <p className="text-sm text-stone-400 mb-6">
          Booking at <span className="text-gold-300">{selectedLocation?.name}</span>
        </p>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => {
                setSelectedDate(d);
                setStep(2);
              }}
              className={`p-3 rounded-xl text-center border transition-all ${
                selectedDate === d
                  ? "border-gold-300 bg-gold-300/10 text-gold-300"
                  : "border-white/[0.06] bg-[#222] text-white hover:border-gold-300/20"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-stone-500">
                {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" })}
              </p>
              <p className="text-lg font-bold mt-0.5">
                {new Date(d + "T12:00:00").getDate()}
              </p>
              <p className="text-[10px] text-stone-500">
                {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { month: "short" })}
              </p>
            </button>
          ))}
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

        {/* Time slots */}
        {availabilityError ? (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/30 text-sm text-red-300">
            {availabilityError}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-stone-500">Loading time slots...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {slots.map((slot) => {
              const canFit = slot.available && slot.remaining >= partySize;
              return (
                <button
                  key={slot.id}
                  disabled={!canFit}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep(3);
                  }}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    !canFit
                      ? "border-white/[0.04] bg-[#1e1e1e] text-stone-600 cursor-not-allowed"
                      : selectedSlot?.id === slot.id
                      ? "border-gold-300 bg-gold-300/10 text-gold-300"
                      : "border-white/[0.06] bg-[#222] text-white hover:border-gold-300/20"
                  }`}
                >
                  <p className="text-sm font-bold">
                    {slot.startTime} – {slot.endTime}
                  </p>
                  <p className={`text-[10px] mt-1 ${canFit ? "text-stone-400" : "text-stone-600"}`}>
                    {canFit ? `${slot.remaining} covers left` : "Full"}
                  </p>
                </button>
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
          {selectedLocation?.name} · {formatDate(selectedDate)} · {selectedSlot?.startTime} –{" "}
          {selectedSlot?.endTime} · {partySize} {partySize === 1 ? "guest" : "guests"}
        </p>

        <div className="space-y-4">
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
              {selectedSlot?.startTime} – {selectedSlot?.endTime}
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
            {loading ? "Booking..." : depositRequired ? `Confirm & Pay ${formatPence(policy!.depositAmountPence)}` : "Confirm Booking"}
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
