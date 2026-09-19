"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import {
  MAX_CHECKLIST_ITEMS,
  formatShootDate,
  type ShootChecklistItem,
} from "@/lib/shoot-plans";
import { Action } from "@/components/admin/ShootPlanUI";

function ItemText({
  item,
  index,
  onText,
  error,
}: {
  item: ShootChecklistItem;
  index: number;
  onText: (text: string) => void;
  error?: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = "auto";
      input.current.style.height = `${input.current.scrollHeight}px`;
    }
  }, [item.text]);
  const id = `checklist-${index}-text`;
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">
        Content item {index + 1}
      </label>
      <textarea
        ref={input}
        id={id}
        rows={1}
        maxLength={500}
        value={item.text}
        onChange={(e) => onText(e.target.value)}
        // Example content: highlight reel, decor, buffet service or food review.
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block min-h-11 w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2 py-2 text-base leading-relaxed placeholder:text-gray-500 hover:border-gray-700 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 sm:text-lg ${item.completed ? "text-gray-400 line-through" : "text-gray-200"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** One checklist presentation for editing, shoot-day completion and read-only sharing. */
export default function ShootContentChecklist({
  items,
  date,
  onChange,
  onToggle,
  disabled = false,
  errorField,
  error,
}: {
  items: ShootChecklistItem[];
  date: string;
  onChange?: (items: ShootChecklistItem[]) => void;
  onToggle?: (id: string) => void;
  disabled?: boolean;
  errorField?: string;
  error?: string;
}) {
  const [removed, setRemoved] = useState<{
    item: ShootChecklistItem;
    index: number;
  } | null>(null);
  const editable = !!onChange;
  if (!editable && items.length === 0) return null;
  const completed = items.filter((item) => item.completed).length;
  function add() {
    if (!onChange || disabled || items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange([
      ...items,
      { id: crypto.randomUUID(), text: "", completed: false },
    ]);
    requestAnimationFrame(() =>
      document.getElementById(`checklist-${items.length}-text`)?.focus(),
    );
  }
  function move(index: number, direction: number) {
    if (!onChange) return;
    const next = [...items];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  }
  return (
    <section
      id="checklist"
      tabIndex={-1}
      aria-labelledby="checklist-heading"
      className="rounded-2xl border border-gray-800 bg-[#141414] p-5 focus-visible:outline focus-visible:outline-gold-300 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="checklist-heading" className="text-lg font-semibold">
            Content checklist
          </h2>
          <p className="mt-2 text-base text-gray-300">
            {formatShootDate(date)}
          </p>
        </div>
        <span className="text-xs text-gray-400" aria-live="polite">
          {completed} of {items.length} complete
        </span>
      </div>
      {/* Checklist items describe content deliverables; detailed shots remain separate. */}
      {editable && removed && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300"
        >
          <span>Item removed.</span>
          <Action
            disabled={disabled || items.length >= MAX_CHECKLIST_ITEMS}
            onClick={() => {
              const next = [...items];
              next.splice(
                Math.min(removed.index, next.length),
                0,
                removed.item,
              );
              onChange?.(next);
              setRemoved(null);
            }}
          >
            Undo remove item
          </Action>
        </div>
      )}
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start gap-x-2 gap-y-1"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {editable || onToggle ? (
                <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={disabled}
                    aria-label={`Complete content item ${index + 1}${item.text ? `: ${item.text}` : ""}`}
                    onChange={() =>
                      onChange
                        ? onChange(
                            items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, completed: !entry.completed }
                                : entry,
                            ),
                          )
                        : onToggle?.(item.id)
                    }
                    className="h-7 w-7 cursor-pointer appearance-none rounded-full border-2 border-gray-500 bg-transparent checked:border-gold-300 checked:bg-gold-300 hover:border-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300 disabled:cursor-wait disabled:opacity-50"
                  />
                  {item.completed && (
                    <Check
                      size={18}
                      aria-hidden="true"
                      className="pointer-events-none absolute text-[#141414]"
                    />
                  )}
                </label>
              ) : (
                <span
                  role="img"
                  aria-label={item.completed ? "Complete" : "Not complete"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${item.completed ? "border-gold-300 bg-gold-300 text-[#141414]" : "border-gray-500"}`}
                  >
                    {item.completed && <Check size={18} aria-hidden="true" />}
                  </span>
                </span>
              )}
              {editable ? (
                <ItemText
                  item={item}
                  index={index}
                  onText={(text) =>
                    onChange?.(
                      items.map((entry) =>
                        entry.id === item.id ? { ...entry, text } : entry,
                      ),
                    )
                  }
                  error={
                    errorField === `checklist-${index}-text` ? error : undefined
                  }
                />
              ) : (
                <p
                  className={`min-w-0 flex-1 whitespace-pre-wrap break-words py-2 text-base leading-relaxed sm:text-lg ${item.completed ? "text-gray-400 line-through" : "text-gray-200"}`}
                >
                  {item.text}
                </p>
              )}
            </div>
            {editable && (
              <div className="ml-auto flex gap-1 max-sm:basis-full max-sm:justify-end">
                <Action
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move content item ${index + 1} up`}
                  className="!px-3"
                >
                  <ArrowUp size={15} aria-hidden="true" />
                </Action>
                <Action
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move content item ${index + 1} down`}
                  className="!px-3"
                >
                  <ArrowDown size={15} aria-hidden="true" />
                </Action>
                <Action
                  disabled={disabled}
                  onClick={() => {
                    setRemoved({ item, index });
                    onChange?.(items.filter((entry) => entry.id !== item.id));
                  }}
                  aria-label={`Remove content item ${index + 1}`}
                  className="!px-3 text-red-300"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </Action>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <Action
          onClick={add}
          disabled={disabled || items.length >= MAX_CHECKLIST_ITEMS}
          className="mt-4"
        >
          <Plus size={16} aria-hidden="true" />
          {items.length >= MAX_CHECKLIST_ITEMS
            ? "100-item limit reached"
            : "Add content item"}
        </Action>
      )}
    </section>
  );
}
