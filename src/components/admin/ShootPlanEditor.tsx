"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import {
  emptyShoot,
  startOfWeek,
  WORK_TYPES,
  type WeeklyActivity,
  formatWeek,
  MAX_VIDEOS,
  newVideo,
  parseShootDraft,
  SHOOT_LOCATIONS,
  SHOOT_STATUSES,
  ShootValidationError,
  type ShootDraft,
  type ShootPlan,
  type ShootVideo,
} from "@/lib/shoot-plans";
import {
  Action,
  Field,
  Feedback,
  PlannerRequestError,
  StatusBadge,
  UnsavedGuard,
  errorMessage,
  fieldClass,
  linkClass,
  plannerRequest,
  CaptureProgress,
  ConfirmDelete,
} from "./ShootPlanUI";
import ShootPlanSharing from "./ShootPlanSharing";
import ShootContentChecklist from "@/components/shoot-plans/ShootContentChecklist";
import ShootPlanDocument from "@/components/shoot-plans/ShootPlanDocument";
import ShootShotEditor from "./ShootShotEditor";
import ShootReferenceEditor from "./ShootReferenceEditor";
import { PlanSelect, PlanText } from "./ShootPlanFields";
import WeeklyActivityEditor from "./WeeklyActivityEditor";
type Mode =
  "activities" | "overview" | "videos" | "preview" | "day" | "sharing";
function asDraft(plan: ShootDraft): ShootDraft {
  return {
    weekStart: plan.weekStart || startOfWeek(plan.date),
    activities: structuredClone(plan.activities || []),
    title: plan.title,
    date: plan.date,
    time: plan.time,
    location: plan.location,
    objective: plan.objective,
    notes: plan.notes,
    visualDirection: plan.visualDirection || "",
    outputFormat: plan.outputFormat ?? "Vertical 9:16",
    videos: structuredClone(plan.videos || []),
    checklist: structuredClone(plan.checklist || []),
    status: plan.status,
    shots: plan.shots.map((s) => ({
      id: s.id,
      videoId: s.videoId || "",
      title: s.title,
      description: s.description,
      format: s.format,
      preparation: s.preparation,
      assignee: s.assignee,
      referenceUrl: s.referenceUrl,
      captured: s.captured,
    })),
  };
}
export default function ShootPlanEditor({
  initial,
  collaboration,
}: {
  initial?: ShootPlan;
  collaboration?: {
    endpoint: string;
    unlockPath: string;
    onLock: () => void;
    busy: boolean;
  };
}) {
  const router = useRouter();
  const [id] = useState(() => initial?.id || crypto.randomUUID());
  const [version, setVersion] = useState(initial?.version || 0);
  const [draft, setDraft] = useState(() =>
    asDraft(
      initial || {
        ...emptyShoot,
        weekStart: startOfWeek(
          new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }),
        ),
      },
    ),
  );
  const [saved, setSaved] = useState(() => JSON.stringify(draft));
  const [mode, setMode] = useState<Mode>("overview");
  const [activeVideo, setActiveVideo] = useState(
    initial?.videos?.[0]?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const activityLinks = useRef(new Map<string, string>());
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const submitting = useRef(false);
  const stickyHeader = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = stickyHeader.current;
    if (!header) return;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingTop;
    // Keep focused fields and preview anchors below the sticky controls.
    const resize = new ResizeObserver(() => {
      root.style.scrollPaddingTop = `${header.getBoundingClientRect().height + 16}px`;
    });
    resize.observe(header);
    return () => {
      resize.disconnect();
      root.style.scrollPaddingTop = previous;
    };
  }, []);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<{
    video: ShootVideo;
    index: number;
    shots: ShootDraft["shots"];
  } | null>(null);
  const dirty = JSON.stringify(draft) !== saved;
  const locked = busy || uploading || deleting || deleted;
  const savedTitle = (JSON.parse(saved) as ShootDraft).title;
  const endpoint = collaboration?.endpoint || `/api/admin/shoot-plans/${id}`;
  const imageEndpoint = `${endpoint}/references`;
  const errors = { error, errorField };
  const hasContent =
    draft.activities.some((item) => item.type === "content_shoot") ||
    !!draft.videos.length ||
    !!draft.shots.length ||
    !!draft.checklist.length ||
    !draft.activities.length;
  function updateActivities(activities: WeeklyActivity[]) {
    setDraft((d) => ({
      ...d,
      activities,
      videos: d.videos.map((video) => {
        if (video.activityId)
          activityLinks.current.set(video.id, video.activityId);
        const activityId =
          video.activityId || activityLinks.current.get(video.id) || "";
        return {
          ...video,
          activityId: activities.some(
            (item) => item.id === activityId && item.type === "content_shoot",
          )
            ? activityId
            : "",
        };
      }),
    }));
    setMessage("");
  }
  function planContent(activityId: string) {
    const existing = draft.videos.find(
      (video) => video.activityId === activityId,
    );
    if (existing) setActiveVideo(existing.id);
    else {
      if (draft.videos.length >= MAX_VIDEOS) {
        setError(`Add up to ${MAX_VIDEOS} video briefs.`);
        return;
      }
      const activity = draft.activities.find((item) => item.id === activityId);
      const video = { ...newVideo(), activityId, title: activity?.title || "" };
      update("videos", [...draft.videos, video]);
      setActiveVideo(video.id);
    }
    setMode("videos");
  }
  useEffect(() => {
    document.title = version
      ? `${savedTitle} | Weekly Plans | Demi’s`
      : "New weekly plan | Demi’s";
  }, [savedTitle, version]);
  function update<K extends keyof ShootDraft>(key: K, value: ShootDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage("");
  }
  function updateVideo(id: string, patch: Partial<ShootVideo>) {
    setDraft((d) => ({
      ...d,
      videos: d.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
    setMessage("");
  }
  function focusError(field: string) {
    const videoIndex = field.match(/^video-(\d+)/)?.[1];
    const shotIndex = field.match(/^shot-(\d+)/)?.[1];
    if (field === "activities" || field.startsWith("activity-")) {
      setMode("activities");
    } else if (videoIndex !== undefined) {
      setMode("videos");
      setActiveVideo(draft.videos[Number(videoIndex)]?.id || "");
    } else if (shotIndex !== undefined) {
      setMode("videos");
      setActiveVideo(draft.shots[Number(shotIndex)]?.videoId || "");
    } else if (field === "videos" || field === "shots") {
      setMode("videos");
    } else setMode("overview");
    requestAnimationFrame(() => document.getElementById(field)?.focus());
  }
  async function save(nextDraft = draft, feedback = "Weekly plan saved.") {
    if (submitting.current || uploading) return;
    setError("");
    setErrorField("");
    setErrorStatus(0);
    setMessage("");
    let parsed: ShootDraft;
    try {
      parsed = parseShootDraft(nextDraft);
    } catch (err) {
      if (err instanceof ShootValidationError) {
        setError(err.message);
        setErrorField(err.field);
        focusError(err.field);
      }
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const data = await plannerRequest<{ plan: ShootPlan }>(
        version ? endpoint : "/api/admin/shoot-plans",
        {
          method: version ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed, id, version }),
        },
      );
      const clean = asDraft(data.plan);
      setDraft(clean);
      setSaved(JSON.stringify(clean));
      setVersion(data.plan.version);
      setRemoved(null);
      setMessage(feedback);
      if (!version) router.replace(`/admin/shoot-plans/${data.plan.id}`);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof PlannerRequestError) {
        setErrorStatus(err.status);
        setErrorField(err.field || "");
        if (err.field) focusError(err.field);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function copyEdits() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      setMessage("Edits copied.");
    } catch {
      setError(
        "Couldn’t copy your edits. Select and copy the field values before reloading.",
      );
    }
  }
  async function deletePlan() {
    if (collaboration || !version || locked || submitting.current) return;
    submitting.current = true;
    setDeleting(true);
    setError("");
    setErrorField("");
    setErrorStatus(0);
    setMessage("");
    try {
      await plannerRequest(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      setDeleted(true);
      setConfirmDelete(false);
      router.replace("/admin/shoot-plans");
      router.refresh();
    } catch (err) {
      setConfirmDelete(false);
      setError(errorMessage(err));
      if (err instanceof PlannerRequestError) setErrorStatus(err.status);
    } finally {
      submitting.current = false;
      setDeleting(false);
    }
  }
  function addVideo() {
    const video = newVideo();
    update("videos", [...draft.videos, video]);
    setActiveVideo(video.id);
    setMode("videos");
    requestAnimationFrame(() =>
      document.getElementById(`video-${draft.videos.length}-title`)?.focus(),
    );
  }
  const videoIndex = draft.videos.findIndex((v) => v.id === activeVideo);
  const video = draft.videos[videoIndex];
  const ungrouped = draft.shots.filter((s) => !s.videoId);
  const groups = [
    ...draft.videos.map((v) => ({ id: v.id, title: v.title })),
    ...(ungrouped.length
      ? [
          {
            id: "",
            title: draft.videos.length ? "Additional shots" : "Shot list",
          },
        ]
      : []),
  ];
  return (
    <div className="mx-auto max-w-6xl pb-10">
      <ConfirmDelete
        open={confirmDelete}
        busy={deleting}
        title={savedTitle}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void deletePlan()}
      />
      <UnsavedGuard dirty={!deleted && (dirty || uploading)} />
      <div
        ref={stickyHeader}
        className="sticky top-0 z-30 mb-6 max-h-[60svh] overflow-y-auto bg-[#0f0f0f] pt-3"
      >
        {!collaboration && (
          <Link href="/admin/shoot-plans" className={`${linkClass} mb-4 -ml-4`}>
            <ChevronLeft size={16} />
            Weekly plans
          </Link>
        )}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">
                {collaboration
                  ? "Collaborator access"
                  : "Demi’s weekly planner"}
              </p>
              <StatusBadge status={draft.status} />
            </div>
            <h1 className="break-words text-2xl font-bold">
              {version ? savedTitle : "New weekly plan"}
            </h1>
            {initial && (
              <p className="mt-2 text-sm text-gray-400">
                {formatWeek(draft.weekStart)} ·{" "}
                {SHOOT_LOCATIONS[draft.location]}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span role="status" className="text-xs text-gray-400">
              {deleted
                ? "Deleted"
                : deleting
                  ? "Deleting…"
                  : uploading
                    ? "Uploading…"
                    : busy
                      ? "Saving…"
                      : dirty
                        ? "Unsaved changes"
                        : version
                          ? "Saved"
                          : "New plan"}
            </span>
            {collaboration && (
              <Action
                disabled={locked || dirty || collaboration.busy}
                onClick={collaboration.onLock}
              >
                Lock page
              </Action>
            )}
            {!collaboration && version > 0 && (
              <Action
                disabled={locked}
                onClick={() => setConfirmDelete(true)}
                className="text-red-300"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting…" : "Delete plan"}
              </Action>
            )}
            <Action
              primary
              disabled={locked || (version > 0 && !dirty)}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : version ? "Save changes" : "Create plan"}
            </Action>
          </div>
        </header>
        <div
          className="flex gap-2 overflow-x-auto whitespace-nowrap border-b border-gray-800 pb-4 [&>button]:shrink-0"
          role="group"
          aria-label="Planner view"
        >
          {(
            [
              ["overview", "Week overview"],
              ["activities", `Activities (${draft.activities.length})`],
              ...(hasContent
                ? [
                    [
                      "videos",
                      `Content plan${draft.videos.length ? ` (${draft.videos.length})` : ""}`,
                    ],
                  ]
                : []),
              ["preview", "Preview"],
              ...(hasContent ? [["day", "Shoot day"]] : []),
              ...(!collaboration ? [["sharing", "Sharing"]] : []),
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <Action
              key={value}
              primary={mode === value}
              aria-pressed={mode === value}
              disabled={
                locked ||
                (value === "day" && (!version || dirty)) ||
                (value === "sharing" && !version)
              }
              onClick={() => setMode(value)}
            >
              {label}
            </Action>
          ))}
        </div>
      </div>
      <div className="mb-5 space-y-3" aria-live="polite">
        {error && (
          <Feedback error>
            {error}
            {errorStatus === 401 && (
              <p className="mt-3">
                <Link
                  href={collaboration?.unlockPath || "/admin/login"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-300 underline"
                >
                  {collaboration
                    ? "Unlock in a new tab"
                    : "Sign in in a new tab"}
                </Link>
              </p>
            )}
            {errorStatus === 409 && (
              <div className="mt-3 flex gap-3">
                <Action onClick={copyEdits}>Copy my edits</Action>
                <Action onClick={() => window.location.reload()}>
                  Reload latest plan
                </Action>
              </div>
            )}
          </Feedback>
        )}
        {message && <Feedback>{message}</Feedback>}
      </div>
      {mode === "sharing" && !collaboration && (
        <>
          <ShootPlanSharing id={id} />
          <ShootPlanSharing id={id} editable />
        </>
      )}
      {mode === "preview" && (
        <ShootPlanDocument plan={draft} imageEndpoint={imageEndpoint} />
      )}
      {mode === "overview" && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={locked} className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5 sm:p-7">
              <h2 className="mb-6 text-xl font-semibold">Week overview</h2>
              <div className="space-y-5">
                <PlanText
                  id="title"
                  label="Plan title"
                  value={draft.title}
                  maxLength={120}
                  onChange={(v) => update("title", v)}
                  {...errors}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    id="weekStart"
                    label="Week starting"
                    error={errorField === "weekStart" ? error : undefined}
                  >
                    <input
                      id="weekStart"
                      type="date"
                      value={draft.weekStart}
                      onChange={(e) =>
                        update("weekStart", startOfWeek(e.target.value))
                      }
                      className={fieldClass}
                      aria-invalid={errorField === "weekStart" || undefined}
                      aria-describedby={
                        errorField === "weekStart"
                          ? "weekStart-error"
                          : undefined
                      }
                    />
                  </Field>
                  <Field id="location" label="Restaurant">
                    <select
                      id="location"
                      value={draft.location}
                      className={fieldClass}
                      onChange={(e) =>
                        update(
                          "location",
                          e.target.value as ShootDraft["location"],
                        )
                      }
                    >
                      {Object.entries(SHOOT_LOCATIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="status" label="Status">
                    <select
                      id="status"
                      className={fieldClass}
                      value={draft.status}
                      onChange={(e) =>
                        update("status", e.target.value as ShootDraft["status"])
                      }
                    >
                      {Object.entries(SHOOT_STATUSES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <PlanText
                  id="objective"
                  label="Objective"
                  rows={3}
                  value={draft.objective}
                  onChange={(v) => update("objective", v)}
                  {...errors}
                />
                <PlanText
                  id="notes"
                  label="Week notes"
                  rows={3}
                  maxLength={5000}
                  value={draft.notes}
                  onChange={(v) => update("notes", v)}
                  {...errors}
                />
              </div>
            </section>
            {hasContent && (
              <details
                className="rounded-2xl border border-gray-800 p-5"
                open={
                  ["date", "time", "visualDirection", "outputFormat"].includes(
                    errorField,
                  )
                    ? true
                    : undefined
                }
              >
                <summary className="cursor-pointer py-2 font-semibold text-gold-300">
                  Shoot details
                </summary>
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="date"
                      label="Date"
                      error={errorField === "date" ? error : undefined}
                    >
                      <input
                        id="date"
                        type="date"
                        value={draft.date}
                        onChange={(e) => update("date", e.target.value)}
                        className={fieldClass}
                        aria-invalid={errorField === "date" || undefined}
                        aria-describedby={
                          errorField === "date" ? "date-error" : undefined
                        }
                      />
                    </Field>
                    <Field
                      id="time"
                      label="Time · London"
                      error={errorField === "time" ? error : undefined}
                    >
                      <input
                        id="time"
                        type="time"
                        value={draft.time}
                        onChange={(e) => update("time", e.target.value)}
                        className={fieldClass}
                        aria-invalid={errorField === "time" || undefined}
                        aria-describedby={
                          errorField === "time" ? "time-error" : undefined
                        }
                      />
                    </Field>
                  </div>
                  <PlanText
                    id="visualDirection"
                    label="Visual direction"
                    rows={3}
                    maxLength={3000}
                    value={draft.visualDirection}
                    onChange={(v) => update("visualDirection", v)}
                    {...errors}
                  />
                  <PlanSelect
                    id="outputFormat"
                    label="Format"
                    value={draft.outputFormat}
                    options={["Vertical 9:16", "Landscape 16:9"]}
                    placeholder="Select format"
                    onChange={(v) => update("outputFormat", v)}
                    {...errors}
                  />
                  <ShootContentChecklist
                    items={draft.checklist}
                    date={draft.date}
                    disabled={locked}
                    onChange={(items) => update("checklist", items)}
                    {...errors}
                  />
                </div>
              </details>
            )}
            <div className="flex justify-end">
              <Action primary onClick={() => setMode("activities")}>
                Next: Activities
              </Action>
            </div>
          </fieldset>
        </form>
      )}
      {mode === "activities" && (
        <WeeklyActivityEditor
          items={draft.activities}
          disabled={locked}
          onChange={updateActivities}
          onContent={planContent}
          {...errors}
        />
      )}
      {mode === "videos" && (
        <div
          id="videos"
          tabIndex={-1}
          className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
        >
          <aside className="space-y-3">
            <h2 className="mb-4 text-xl font-semibold">Content plan</h2>
            <div className="flex flex-col gap-2">
              {draft.videos.map((v, i) => (
                <Action
                  key={v.id}
                  disabled={locked}
                  primary={v.id === activeVideo}
                  className="!justify-start text-left"
                  onClick={() => setActiveVideo(v.id)}
                >
                  <span className="shrink-0 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 break-words">
                    {v.title || `Video brief ${i + 1}`}
                  </span>
                </Action>
              ))}
              {!!ungrouped.length && (
                <Action
                  disabled={locked}
                  primary={!activeVideo}
                  onClick={() => setActiveVideo("")}
                >
                  Additional shots ({ungrouped.length})
                </Action>
              )}
            </div>
            <Action
              disabled={locked || draft.videos.length >= MAX_VIDEOS}
              onClick={addVideo}
            >
              <Plus size={16} />
              Add video brief
            </Action>
            {removed && (
              <div role="status" className="space-y-2 text-sm text-gray-400">
                <p>Video brief removed.</p>
                <Action
                  disabled={locked || draft.videos.length >= MAX_VIDEOS}
                  onClick={() => {
                    const videos = [...draft.videos];
                    videos.splice(
                      Math.min(removed.index, videos.length),
                      0,
                      removed.video,
                    );
                    setDraft((d) => ({
                      ...d,
                      videos,
                      shots: [...d.shots, ...removed.shots],
                    }));
                    setActiveVideo(removed.video.id);
                    setRemoved(null);
                  }}
                >
                  Undo remove video brief
                </Action>
              </div>
            )}
          </aside>
          {video ? (
            <form
              key={video.id}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <fieldset disabled={locked} className="min-w-0 space-y-6">
                <section className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5 sm:p-7">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                      Video brief {videoIndex + 1}
                    </h2>
                    <div className="flex gap-1">
                      <Action
                        aria-label="Move video brief up"
                        disabled={videoIndex === 0}
                        onClick={() => {
                          const videos = [...draft.videos];
                          [videos[videoIndex - 1], videos[videoIndex]] = [
                            videos[videoIndex],
                            videos[videoIndex - 1],
                          ];
                          update("videos", videos);
                        }}
                      >
                        <ArrowUp size={15} />
                      </Action>
                      <Action
                        aria-label="Move video brief down"
                        disabled={videoIndex === draft.videos.length - 1}
                        onClick={() => {
                          const videos = [...draft.videos];
                          [videos[videoIndex + 1], videos[videoIndex]] = [
                            videos[videoIndex],
                            videos[videoIndex + 1],
                          ];
                          update("videos", videos);
                        }}
                      >
                        <ArrowDown size={15} />
                      </Action>
                      <Action
                        aria-label="Remove video brief"
                        onClick={() => {
                          setRemoved({
                            video,
                            index: videoIndex,
                            shots: draft.shots.filter(
                              (s) => s.videoId === video.id,
                            ),
                          });
                          const videos = draft.videos.filter(
                            (v) => v.id !== video.id,
                          );
                          setDraft((d) => ({
                            ...d,
                            videos,
                            shots: d.shots.filter(
                              (s) => s.videoId !== video.id,
                            ),
                          }));
                          setActiveVideo(videos[0]?.id || "");
                        }}
                      >
                        <Trash2 size={15} />
                      </Action>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <Field
                      id={`video-${videoIndex}-activityId`}
                      label="Content shoot"
                      error={
                        errorField === `video-${videoIndex}-activityId`
                          ? error
                          : undefined
                      }
                    >
                      <select
                        id={`video-${videoIndex}-activityId`}
                        value={video.activityId || ""}
                        aria-invalid={
                          errorField === `video-${videoIndex}-activityId` ||
                          undefined
                        }
                        aria-describedby={
                          errorField === `video-${videoIndex}-activityId`
                            ? `video-${videoIndex}-activityId-error`
                            : undefined
                        }
                        onChange={(e) =>
                          updateVideo(video.id, { activityId: e.target.value })
                        }
                        className={fieldClass}
                      >
                        <option value="">Unassigned</option>
                        {draft.activities
                          .filter((item) => item.type === "content_shoot")
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title || WORK_TYPES[item.type]}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <PlanText
                      id={`video-${videoIndex}-title`}
                      label="Video title"
                      maxLength={120}
                      value={video.title}
                      onChange={(title) => updateVideo(video.id, { title })}
                      {...errors}
                    />
                    <PlanSelect
                      id={`video-${videoIndex}-style`}
                      label="Style & audio"
                      options={[
                        "Trending audio",
                        "Original audio",
                        "Voiceover",
                        "Talking to camera",
                        "Music only",
                        "Natural sound",
                        "No audio",
                      ]}
                      placeholder="Select style & audio"
                      value={video.style}
                      onChange={(style) => updateVideo(video.id, { style })}
                      {...errors}
                    />
                    <PlanText
                      id={`video-${videoIndex}-concept`}
                      label="Concept"
                      rows={4}
                      maxLength={3000}
                      value={video.concept}
                      onChange={(concept) => updateVideo(video.id, { concept })}
                      {...errors}
                    />
                  </div>
                  <details
                    className="mt-6 border-t border-gray-800 pt-3"
                    open={
                      errorField.startsWith(`video-${videoIndex}-`) &&
                      [
                        "openingText",
                        "midVideoText",
                        "offerText",
                        "endFrame",
                      ].some((key) => errorField.endsWith(key))
                        ? true
                        : undefined
                    }
                  >
                    <summary className="cursor-pointer py-3 font-semibold text-gold-300 focus-visible:outline">
                      On-screen text
                    </summary>
                    <div className="mt-3 grid gap-5 sm:grid-cols-2">
                      {(
                        [
                          ["openingText", "Opening text"],
                          ["midVideoText", "Mid-video text"],
                          ["offerText", "Offer text"],
                          ["endFrame", "End frame"],
                        ] as const
                      ).map(([key, label]) => (
                        <PlanText
                          key={key}
                          id={`video-${videoIndex}-${key}`}
                          label={label}
                          rows={3}
                          maxLength={key === "midVideoText" ? 2000 : 1000}
                          value={video[key]}
                          onChange={(v) => updateVideo(video.id, { [key]: v })}
                          {...errors}
                        />
                      ))}
                    </div>
                  </details>
                </section>
                <section className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5 sm:p-7">
                  <ShootShotEditor
                    shots={draft.shots}
                    videos={draft.videos}
                    videoId={video.id}
                    onChange={(shots) => update("shots", shots)}
                    {...errors}
                  />
                </section>
              </fieldset>
              <div
                id={`video-${videoIndex}-references`}
                tabIndex={-1}
                className="mt-6 rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5 sm:p-7"
              >
                <ShootReferenceEditor
                  references={video.references}
                  endpoint={version ? imageEndpoint : undefined}
                  disabled={busy}
                  onBusy={setUploading}
                  onChange={(references) =>
                    updateVideo(video.id, { references })
                  }
                />
              </div>
            </form>
          ) : ungrouped.length ? (
            <fieldset
              disabled={locked}
              className="min-w-0 rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5"
            >
              <ShootShotEditor
                shots={draft.shots}
                videos={draft.videos}
                videoId=""
                onChange={(shots) => update("shots", shots)}
                {...errors}
              />
            </fieldset>
          ) : (
            <section className="rounded-2xl border border-dashed border-gray-700 py-20 text-center">
              <h3 className="mb-5 text-lg font-semibold">
                No video briefs yet
              </h3>
              <Action primary disabled={locked} onClick={addVideo}>
                Add your first video brief
              </Action>
            </section>
          )}
        </div>
      )}
      {mode === "day" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-800 p-5">
            <CaptureProgress
              captured={draft.shots.filter((s) => s.captured).length}
              total={draft.shots.length}
            />
          </div>
          <ShootContentChecklist
            items={draft.checklist}
            date={draft.date}
            disabled={locked}
            onToggle={(itemId) =>
              void save(
                {
                  ...draft,
                  checklist: draft.checklist.map((item) =>
                    item.id === itemId
                      ? { ...item, completed: !item.completed }
                      : item,
                  ),
                },
                "Checklist updated.",
              )
            }
          />
          {groups.map((group) => (
            <section
              key={group.id}
              className="rounded-2xl border border-gray-800 p-5"
            >
              <h2 className="mb-4 text-xl font-semibold">{group.title}</h2>
              <div className="space-y-3">
                {draft.shots
                  .filter((s) => s.videoId === group.id)
                  .map((shot) => (
                    <div
                      key={shot.id}
                      className="flex items-start gap-4 rounded-xl bg-white/5 p-4"
                    >
                      <Action
                        aria-label={`${shot.captured ? "Mark not captured" : "Mark captured"}: ${shot.title}`}
                        aria-pressed={shot.captured}
                        disabled={locked}
                        primary={shot.captured}
                        onClick={() =>
                          void save(
                            {
                              ...draft,
                              shots: draft.shots.map((s) =>
                                s.id === shot.id
                                  ? { ...s, captured: !s.captured }
                                  : s,
                              ),
                            },
                            "Shot updated.",
                          )
                        }
                      >
                        <Check size={18} />
                      </Action>
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold">
                          {shot.title}
                        </h3>
                        {shot.description && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-400">
                            {shot.description}
                          </p>
                        )}
                        {shot.preparation && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-400">
                            {shot.preparation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
