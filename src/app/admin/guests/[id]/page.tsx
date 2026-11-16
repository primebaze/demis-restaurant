"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { OwnLayout, PageHead, GlassStats, Sheet, SheetTitle, Tag, Avatar, Empty, btn, statusTone, statusLabel } from "@/components/admin/ui";

interface GuestDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string;
  notes: string;
  createdAt: string;
  totalBookings: number;
  totalVisits: number;
  totalSpendPence: number;
  noShows: number;
  bookings: {
    id: string;
    confirmationCode: string;
    location: string;
    date: string;
    time: string;
    slot: string;
    partySize: number;
    status: string;
    source: string;
    notes: string | null;
    depositAmountPence: number;
    depositStatus: string;
    addOns: { name: string; pricePence: number }[];
    changes: { fieldChanged: string; oldValue: string; newValue: string; createdAt: string }[];
    createdAt: string;
  }[];
  visits: {
    id: string;
    visitDate: string;
    spendPence: number;
    notes: string | null;
    createdAt: string;
  }[];
}

const back = (
  <Link href="/admin/guests" className={btn.glass}>
    <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
    Back to Guests
  </Link>
);

export default function GuestProfilePage() {
  const params = useParams();
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/guests/${params.id}`)
      .then((r) => r.json())
      .then((data) => setGuest(data.guest))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading || !guest) {
    return (
      <OwnLayout>
        <PageHead title="Guest" actions={back} />
        <Sheet>
          <Empty>{loading ? "Loading guest profile..." : "Guest not found"}</Empty>
        </Sheet>
      </OwnLayout>
    );
  }

  return (
    <OwnLayout>
      <PageHead
        title={guest.name}
        subtitle={
          <>
            {guest.email} {guest.phone && `· ${guest.phone}`}
          </>
        }
        actions={back}
      />

      <GlassStats
        items={[
          { label: "Bookings", value: guest.totalBookings },
          { label: "Visits", value: guest.totalVisits },
          { label: "Total spend", value: `£${(guest.totalSpendPence / 100).toFixed(0)}` },
          { label: "No-shows", value: guest.noShows },
          { label: "Average spend", value: `£${guest.totalVisits > 0 ? (guest.totalSpendPence / 100 / guest.totalVisits).toFixed(0) : "0"}`, hint: "per visit" },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          {/* Profile */}
          <Sheet label="Profile" className="p-[18px]">
            <div className="flex items-center gap-3">
              <Avatar name={guest.name} />
              <div className="min-w-0">
                <h2 className="truncate font-outfit text-xl font-normal tracking-tight text-stone-900">{guest.name}</h2>
                <p className="text-xs font-light text-stone-500">Member since {new Date(guest.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-3 border-t border-stone-100 pt-4 text-sm">
              <div>
                <dt className="text-xs font-light text-stone-500">Email</dt>
                <dd className="mt-0.5 break-all">{guest.email || <span className="text-stone-400">Not given</span>}</dd>
              </div>
              <div>
                <dt className="text-xs font-light text-stone-500">Phone</dt>
                <dd className="mt-0.5">
                  {guest.phone ? (
                    <a href={`tel:${guest.phone.replace(/\s+/g, "")}`} className="hover:text-stone-900">
                      {guest.phone}
                    </a>
                  ) : (
                    <span className="text-stone-400">Not given</span>
                  )}
                </dd>
              </div>
              {guest.tags && (
                <div>
                  <dt className="text-xs font-light text-stone-500">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {guest.tags.split(",").map((tag) => (
                      <Tag key={tag} tone={tag.trim().toLowerCase() === "vip" ? "gold" : "off"}>
                        {tag.trim()}
                      </Tag>
                    ))}
                  </dd>
                </div>
              )}
              {guest.notes && (
                <div>
                  <dt className="text-xs font-light text-stone-500">Notes</dt>
                  <dd className="mt-1 rounded-2xl bg-stone-50 px-3.5 py-2.5 text-[13px] text-stone-700">{guest.notes}</dd>
                </div>
              )}
            </dl>
          </Sheet>

          {/* Visit history */}
          <Sheet label="Visit history" className="overflow-hidden">
            <div className="px-[18px] pb-3 pt-[18px]">
              <SheetTitle aside={<span className="text-xs font-light text-stone-500">{guest.visits.length}</span>}>Visit history</SheetTitle>
            </div>
            {guest.visits.length === 0 ? (
              <Empty>No visits recorded yet</Empty>
            ) : (
              <ul>
                {guest.visits.map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-3 border-t border-stone-100 px-[18px] py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-stone-900">{v.visitDate}</p>
                      {v.notes && <p className="mt-0.5 text-xs font-light text-stone-500">{v.notes}</p>}
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-stone-900">£{(v.spendPence / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Sheet>
        </div>

        {/* Booking history */}
        <Sheet label="Booking history" className="overflow-hidden">
          <div className="px-4 pb-3 pt-[18px] md:px-5">
            <SheetTitle aside={<span className="text-xs font-light text-stone-500">{guest.bookings.length}</span>}>Booking history</SheetTitle>
          </div>
          {guest.bookings.length === 0 ? (
            <Empty>No bookings yet</Empty>
          ) : (
            <ul>
              {guest.bookings.map((b) => (
                <li key={b.id} className="border-t border-stone-100 px-4 py-3.5 md:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-stone-900">{b.confirmationCode}</span>
                    <Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag>
                    <span className="ml-auto text-xs text-stone-500">{b.source}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                    <span className="text-stone-900">{b.date}</span>
                    <span>{b.slot}</span>
                    <span>{b.location}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {b.partySize} guests
                    </span>
                    {b.depositAmountPence > 0 && (
                      <span>
                        Deposit £{(b.depositAmountPence / 100).toFixed(2)} ({b.depositStatus})
                      </span>
                    )}
                  </div>
                  {b.addOns.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {b.addOns.map((a, i) => (
                        <Tag key={i} tone="gold">
                          {a.name}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {b.changes.length > 0 && (
                    <div className="mt-2 space-y-0.5 border-l-2 border-stone-100 pl-3">
                      {b.changes.map((c, i) => (
                        <p key={i} className="text-xs text-stone-500">
                          {c.fieldChanged}: {c.oldValue} → {c.newValue}{" "}
                          <span className="text-stone-400">({new Date(c.createdAt).toLocaleDateString("en-GB")})</span>
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </OwnLayout>
  );
}
