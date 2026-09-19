"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, ExternalLink, ImageOff } from "lucide-react";
import {
  formatWeek,
  formatShootDate,
  startOfWeek,
  WEEK_DAYS,
  WORK_TYPES,
  SHOOT_LOCATIONS,
  SHOOT_STATUSES,
  SHOT_FORMATS,
  type ShootDraft,
} from "@/lib/shoot-plans";

type DocumentPlan = Omit<ShootDraft, "shots"> & {
  shots: Omit<ShootDraft["shots"][number], "id">[];
};
export function ReferenceImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex aspect-[9/13] items-center justify-center overflow-hidden rounded-lg bg-black/5">
      {failed ? (
        <span className="flex flex-col items-center gap-2 p-4 text-center text-sm text-gray-500">
          <ImageOff aria-hidden="true" size={22} />
          Image unavailable
        </span>
      ) : (
        // Private images must load directly with the scoped session cookie, never through a public image cache.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-2 border-t border-black/10 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
      <dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap break-words text-sm leading-7 sm:text-base">
        {value}
      </dd>
    </div>
  );
}
function Shots({ shots }: { shots: DocumentPlan["shots"] }) {
  if (!shots.length) return null;
  return (
    <section className="mt-8">
      <h3 className="mb-4 text-lg font-bold">Shot list</h3>
      <ol className="divide-y divide-black/10">
        {shots.map((shot, index) => (
          <li key={index} className="flex gap-4 py-4">
            <span
              className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-400 text-neutral-700"
              role="img"
              aria-label={shot.captured ? "Captured" : "To capture"}
            >
              {shot.captured && <Check size={15} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{shot.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {SHOT_FORMATS[shot.format]}
                {shot.assignee && ` · ${shot.assignee}`}
              </p>
              {shot.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  {shot.description}
                </p>
              )}
              {shot.preparation && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  <span className="font-semibold">Preparation: </span>
                  {shot.preparation}
                </p>
              )}
              {shot.referenceUrl && (
                <a
                  href={shot.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm underline focus-visible:outline focus-visible:outline-2"
                >
                  View reference <ExternalLink size={14} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
export default function ShootPlanDocument({
  plan,
  imageEndpoint,
}: {
  plan: DocumentPlan;
  imageEndpoint: string;
}) {
  const videos = plan.videos || [];
  const activities = plan.activities || [];
  const hasContent =
    !activities.length ||
    activities.some((item) => item.type === "content_shoot") ||
    !!videos.length ||
    !!plan.shots.length;
  const ungrouped = plan.shots.filter((shot) => !shot.videoId);
  return (
    <article className="shoot-document overflow-hidden rounded-2xl border border-black/10 bg-[#faf9f6] text-[#25221d] shadow-sm">
      <header className="border-b border-black/10 px-6 py-9 sm:px-12 sm:py-12">
        <div className="mb-10 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em]">
          <Image
            src="/logo.png"
            alt="Demi’s Restaurant"
            width={180}
            height={54}
            sizes="(max-width: 639px) 120px, 180px"
            className="h-auto w-[120px] shrink-0 brightness-0 sm:w-[180px]"
          />
          <span>Weekly plan</span>
        </div>
        <h1 className="break-words font-sans text-4xl font-semibold leading-tight sm:text-6xl">
          {plan.title || "Untitled weekly plan"}
        </h1>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
          <span>{formatWeek(plan.weekStart || startOfWeek(plan.date))}</span>
          <span>{SHOOT_LOCATIONS[plan.location]}</span>
          <span>{SHOOT_STATUSES[plan.status]}</span>
        </div>
      </header>
      <div className="px-6 py-8 sm:px-12 sm:py-10">
        <h2 className="mb-6 text-2xl font-bold">Week overview</h2>
        <dl>
          {hasContent && plan.date && (
            <Row
              label="Shoot date"
              value={`${formatShootDate(plan.date)}${plan.time ? ` · ${plan.time} London` : ""}`}
            />
          )}
          <Row label="Objective" value={plan.objective} />
          {hasContent && (
            <Row label="Visual direction" value={plan.visualDirection || ""} />
          )}
          {hasContent && <Row label="Format" value={plan.outputFormat || ""} />}
          <Row label="Notes" value={plan.notes} />
        </dl>
        {!!activities.length && (
          <section className="mt-10">
            <h3 className="mb-5 text-xl font-bold">This week</h3>
            {[...Object.entries(WEEK_DAYS), ["", "Unscheduled"]].map(
              ([day, label]) => {
                const scheduled = activities.filter((item) => item.day === day);
                if (!scheduled.length) return null;
                return (
                  <section
                    key={day}
                    className="grid gap-3 border-t border-black/15 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-8"
                  >
                    <h4 className="text-sm font-bold">{label}</h4>
                    <ul className="space-y-6">
                      {scheduled.map((item) => (
                        <li key={item.id}>
                          <div className="flex flex-wrap justify-between gap-2 text-xs text-neutral-500">
                            <span>{WORK_TYPES[item.type]}</span>
                            <span>{SHOOT_STATUSES[item.status]}</span>
                          </div>
                          <p className="mt-2 break-words text-lg font-semibold">
                            {item.title}
                          </p>
                          {item.assignee && (
                            <p className="mt-2 text-sm text-neutral-600">
                              {item.assignee}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                              {item.notes}
                            </p>
                          )}
                          {videos
                            .filter((video) => video.activityId === item.id)
                            .map((video) => (
                              <a
                                key={video.id}
                                href={`#document-video-${video.id}`}
                                className="mt-2 flex min-h-11 items-center text-sm underline"
                              >
                                {video.title}
                              </a>
                            ))}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              },
            )}
          </section>
        )}
        {!!videos.length && (
          <section className="mt-8">
            <h3 className="mb-4 text-lg font-bold">Planned content</h3>
            <ol className="space-y-3">
              {videos.map((video, index) => (
                <li key={video.id}>
                  <a
                    href={`#document-video-${video.id}`}
                    className="flex min-h-11 gap-4 rounded py-2 text-sm hover:bg-black/5 focus-visible:outline focus-visible:outline-2"
                  >
                    <span className="shrink-0 font-semibold text-neutral-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="break-words">
                      {video.title || `Video ${index + 1}`}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}
        {!!plan.checklist?.length && (
          <section className="mt-8">
            <h3 className="mb-4 text-lg font-bold">Content checklist</h3>
            <ul className="space-y-3">
              {plan.checklist.map((item) => (
                <li className="flex items-start gap-3" key={item.id}>
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-400"
                    role="img"
                    aria-label={item.completed ? "Complete" : "Not complete"}
                  >
                    {item.completed && <Check size={14} />}
                  </span>
                  <span
                    className={`whitespace-pre-wrap break-words text-sm ${item.completed ? "text-neutral-500 line-through" : ""}`}
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {videos.map((video, index) => (
        <section
          key={video.id}
          id={`document-video-${video.id}`}
          className="scroll-mt-6 border-t border-black/15 px-6 py-9 sm:px-12 sm:py-12"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
            {activities.find((item) => item.id === video.activityId)?.title ||
              "Content shoot"}{" "}
            · Video {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="break-words font-sans text-3xl font-semibold leading-tight sm:text-5xl">
            {video.title || `Video ${index + 1}`}
          </h2>
          {video.style && (
            <p className="mt-3 whitespace-pre-wrap break-words text-base italic text-neutral-600">
              {video.style}
            </p>
          )}
          <dl className="mt-8">
            <Row label="Concept" value={video.concept} />
            <Row label="Opening text" value={video.openingText} />
            <Row label="Mid-video text" value={video.midVideoText} />
            <Row label="Offer text" value={video.offerText} />
            <Row label="End frame" value={video.endFrame} />
          </dl>
          <Shots
            shots={plan.shots.filter((shot) => shot.videoId === video.id)}
          />
          {!!video.references.length && (
            <section className="mt-9">
              <h3 className="mb-5 text-lg font-bold">Reference frames</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                {video.references.map((ref, i) => (
                  <figure key={ref.id}>
                    <ReferenceImage
                      src={`${imageEndpoint}?image=${ref.id}`}
                      alt={ref.caption || `${video.title} reference ${i + 1}`}
                    />
                    {ref.caption && (
                      <figcaption className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-neutral-600">
                        {ref.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}
        </section>
      ))}
      {!!ungrouped.length && (
        <section className="border-t border-black/15 px-6 pb-10 sm:px-12">
          <Shots shots={ungrouped} />
        </section>
      )}
      <footer className="flex flex-wrap justify-between gap-3 border-t border-black/10 px-6 py-5 text-xs text-neutral-500 sm:px-12">
        <span>Demi’s · Weekly planner</span>
        <span>
          {activities.length} activities
          {hasContent
            ? ` · ${videos.length} videos · ${plan.shots.length} shots`
            : ""}
        </span>
      </footer>
    </article>
  );
}
