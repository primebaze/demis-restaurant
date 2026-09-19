"use client";
import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import {
  newShot,
  MAX_SHOTS,
  SHOT_FORMATS,
  type ShootShot,
  type ShootVideo,
  type ShotFormat,
} from "@/lib/shoot-plans";
import { Action, Field, fieldClass } from "./ShootPlanUI";
import { PlanText, type FieldErrors } from "./ShootPlanFields";
export default function ShootShotEditor({
  shots,
  videos,
  videoId,
  onChange,
  ...errors
}: {
  shots: ShootShot[];
  videos: ShootVideo[];
  videoId: string;
  onChange: (shots: ShootShot[]) => void;
} & FieldErrors) {
  const [removed, setRemoved] = useState<{
    shot: ShootShot;
    index: number;
  } | null>(null);
  const group = shots
    .map((shot, index) => ({ shot, index }))
    .filter(({ shot }) => shot.videoId === videoId);
  function update(id: string, patch: Partial<ShootShot>) {
    onChange(
      shots.map((shot) => (shot.id === id ? { ...shot, ...patch } : shot)),
    );
  }
  function add() {
    onChange([...shots, newShot(videoId)]);
    requestAnimationFrame(() =>
      document.getElementById(`shot-${shots.length}-title`)?.focus(),
    );
  }
  function move(index: number, to: number) {
    const next = [...shots];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  }
  return (
    <section id="shots" tabIndex={-1} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          Shot list{" "}
          <span className="ml-2 text-sm font-normal text-gray-400">
            {group.length}
          </span>
        </h3>
        <Action disabled={shots.length >= MAX_SHOTS} onClick={add}>
          <Plus size={16} />
          Add shot
        </Action>
      </div>
      {removed && (
        <div role="status" className="flex items-center gap-3 text-sm">
          <span>Shot removed.</span>
          <Action
            disabled={shots.length >= MAX_SHOTS}
            onClick={() => {
              const next = [...shots];
              next.splice(
                Math.min(removed.index, next.length),
                0,
                removed.shot,
              );
              onChange(next);
              setRemoved(null);
            }}
          >
            Undo remove shot
          </Action>
        </div>
      )}
      {!group.length && (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
          <p className="mb-4 text-sm text-gray-400">No shots yet</p>
          <Action onClick={add} disabled={shots.length >= MAX_SHOTS}>
            Add your first shot
          </Action>
        </div>
      )}
      {group.map(({ shot, index }, position) => (
        <div
          key={shot.id}
          className="rounded-xl border border-gray-800 bg-black/15 p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={shot.captured}
                onChange={(e) =>
                  update(shot.id, { captured: e.target.checked })
                }
                className="h-5 w-5 accent-[#e8cc9c]"
              />
              Captured
            </label>
            <div className="flex gap-1">
              <Action
                aria-label={`Move shot ${index + 1} up`}
                disabled={position === 0}
                onClick={() => move(index, group[position - 1].index)}
              >
                <ArrowUp size={14} />
              </Action>
              <Action
                aria-label={`Move shot ${index + 1} down`}
                disabled={position === group.length - 1}
                onClick={() => move(index, group[position + 1].index)}
              >
                <ArrowDown size={14} />
              </Action>
              <Action
                aria-label={`Remove shot ${index + 1}`}
                onClick={() => {
                  setRemoved({ shot, index });
                  onChange(shots.filter((s) => s.id !== shot.id));
                }}
              >
                <Trash2 size={14} />
              </Action>
            </div>
          </div>
          <PlanText
            id={`shot-${index}-title`}
            label={`Shot ${index + 1}`}
            value={shot.title}
            maxLength={120}
            onChange={(title) => update(shot.id, { title })}
            {...errors}
          />
          <details
            className="mt-4"
            open={
              errors.errorField.startsWith(`shot-${index}-`) &&
              errors.errorField !== `shot-${index}-title`
                ? true
                : undefined
            }
          >
            <summary className="cursor-pointer py-2 text-sm text-gold-300 focus-visible:outline">
              Shot details
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`shot-${index}-format`} label="Format">
                  <select
                    id={`shot-${index}-format`}
                    value={shot.format}
                    onChange={(e) =>
                      update(shot.id, { format: e.target.value as ShotFormat })
                    }
                    className={fieldClass}
                  >
                    {Object.entries(SHOT_FORMATS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <PlanText
                  id={`shot-${index}-assignee`}
                  label="Assigned to"
                  value={shot.assignee}
                  maxLength={120}
                  onChange={(assignee) => update(shot.id, { assignee })}
                  {...errors}
                />
              </div>
              <PlanText
                id={`shot-${index}-description`}
                label="Action & camera direction"
                rows={3}
                value={shot.description}
                onChange={(description) => update(shot.id, { description })}
                {...errors}
              />
              <PlanText
                id={`shot-${index}-preparation`}
                label="Preparation"
                rows={2}
                value={shot.preparation}
                onChange={(preparation) => update(shot.id, { preparation })}
                {...errors}
              />
              <PlanText
                id={`shot-${index}-referenceUrl`}
                label="Reference link"
                value={shot.referenceUrl}
                onChange={(referenceUrl) => update(shot.id, { referenceUrl })}
                {...errors}
              />
              {!!videos.length && (
                <Field id={`shot-${index}-videoId`} label="Video brief">
                  <select
                    className={fieldClass}
                    id={`shot-${index}-videoId`}
                    value={shot.videoId}
                    onChange={(e) =>
                      update(shot.id, { videoId: e.target.value })
                    }
                  >
                    <option value="">Additional shots</option>
                    {videos.map((video, i) => (
                      <option key={video.id} value={video.id}>
                        {video.title || `Video brief ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </details>
        </div>
      ))}
    </section>
  );
}
