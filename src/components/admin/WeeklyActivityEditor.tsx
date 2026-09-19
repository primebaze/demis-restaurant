"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  MAX_ACTIVITIES,
  SHOOT_STATUSES,
  WEEK_DAYS,
  WORK_TYPES,
  type WeeklyActivity,
} from "@/lib/shoot-plans";
import { Action, Field, fieldClass } from "./ShootPlanUI";
import { PlanText, type FieldErrors } from "./ShootPlanFields";

export default function WeeklyActivityEditor({
  items,
  disabled,
  onChange,
  onContent,
  ...errors
}: {
  items: WeeklyActivity[];
  disabled: boolean;
  onChange: (items: WeeklyActivity[]) => void;
  onContent: (id: string) => void;
} & FieldErrors) {
  const [removed, setRemoved] = useState<{
    item: WeeklyActivity;
    index: number;
  } | null>(null);
  function update(id: string, patch: Partial<WeeklyActivity>) {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  function addActivity() {
    if (disabled || items.length >= MAX_ACTIVITIES) return;
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        title: "",
        type: "content_shoot",
        day: "",
        assignee: "",
        notes: "",
        status: "planned",
      },
    ]);
    requestAnimationFrame(() => {
      const title = document.getElementById(`activity-${items.length}-title`);
      title?.focus({ preventScroll: true });
      title?.scrollIntoView({ block: "center" });
    });
  }
  return (
    <section id="activities" tabIndex={-1} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Weekly activities</h2>
        <Action
          primary
          disabled={disabled || items.length >= MAX_ACTIVITIES}
          onClick={addActivity}
        >
          <Plus size={16} />
          Add activity
        </Action>
      </div>
      {removed && (
        <div
          role="status"
          className="flex items-center gap-3 text-sm text-gray-400"
        >
          Activity removed.
          <Action
            disabled={disabled || items.length >= MAX_ACTIVITIES}
            onClick={() => {
              const next = [...items];
              next.splice(
                Math.min(removed.index, next.length),
                0,
                removed.item,
              );
              onChange(next);
              setRemoved(null);
            }}
          >
            Undo remove activity
          </Action>
        </div>
      )}
      {!items.length && (
        <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-12 text-center text-gray-400">
          No activities yet
        </div>
      )}
      {items.map((item, index) => {
        const prefix = `activity-${index}`;
        return (
          <fieldset
            key={item.id}
            disabled={disabled}
            className="min-w-0 space-y-5 rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gold-300">
                Activity {index + 1}
              </h3>
              <Action
                aria-label={`Remove activity ${index + 1}`}
                onClick={() => {
                  setRemoved({ item, index });
                  onChange(items.filter((entry) => entry.id !== item.id));
                }}
              >
                <Trash2 size={16} />
              </Action>
            </div>
            <PlanText
              id={`${prefix}-title`}
              label="Activity title"
              value={item.title}
              maxLength={120}
              onChange={(title) => update(item.id, { title })}
              {...errors}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["type", "Work type", WORK_TYPES],
                  ["day", "Day", { "": "Unscheduled", ...WEEK_DAYS }],
                  ["status", "Activity status", SHOOT_STATUSES],
                ] as const
              ).map(([key, label, options]) => (
                <Field
                  key={key}
                  id={`${prefix}-${key}`}
                  label={label}
                  error={
                    errors.errorField === `${prefix}-${key}`
                      ? errors.error
                      : undefined
                  }
                >
                  <select
                    id={`${prefix}-${key}`}
                    value={item[key]}
                    className={fieldClass}
                    aria-invalid={
                      errors.errorField === `${prefix}-${key}` || undefined
                    }
                    aria-describedby={
                      errors.errorField === `${prefix}-${key}`
                        ? `${prefix}-${key}-error`
                        : undefined
                    }
                    onChange={(e) => update(item.id, { [key]: e.target.value })}
                  >
                    {Object.entries(options).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <PlanText
              id={`${prefix}-assignee`}
              label="Owner"
              value={item.assignee}
              maxLength={120}
              onChange={(assignee) => update(item.id, { assignee })}
              {...errors}
            />
            <PlanText
              id={`${prefix}-notes`}
              label="Activity notes"
              value={item.notes}
              rows={3}
              maxLength={3000}
              onChange={(notes) => update(item.id, { notes })}
              {...errors}
            />
            {item.type === "content_shoot" && (
              <Action onClick={() => onContent(item.id)}>
                Plan shoot content
              </Action>
            )}
          </fieldset>
        );
      })}
      {items.length > 0 && (
        <Action
          primary
          className="w-full sm:w-auto"
          disabled={disabled || items.length >= MAX_ACTIVITIES}
          onClick={addActivity}
        >
          <Plus size={16} />
          Add activity
        </Action>
      )}
    </section>
  );
}
