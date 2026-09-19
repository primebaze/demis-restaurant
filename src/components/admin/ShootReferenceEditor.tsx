"use client";
import { useEffect, useRef, useState } from "react";
import {
  Action,
  Field,
  fieldClass,
  plannerRequest,
  errorMessage,
} from "./ShootPlanUI";
import { MAX_VIDEO_REFERENCES, type ShootVideo } from "@/lib/shoot-plans";
import { ReferenceImage } from "@/components/shoot-plans/ShootPlanDocument";
export default function ShootReferenceEditor({
  references,
  endpoint,
  disabled,
  onChange,
  onBusy,
}: {
  references: ShootVideo["references"];
  endpoint?: string;
  disabled: boolean;
  onChange: (refs: ShootVideo["references"]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController>();
  const [pending, setPending] = useState<{ file: File; id: string } | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState<{
    ref: ShootVideo["references"][number];
    index: number;
  } | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function upload(entry: { file: File; id: string }) {
    if (!endpoint || controller.current || disabled) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(entry.file.type) ||
      entry.file.size > 3_000_000 ||
      !entry.file.size
    ) {
      setError("Choose a JPG, PNG or WebP image smaller than 3 MB.");
      return;
    }
    setError("");
    setPending(entry);
    setUploading(true);
    onBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const form = new FormData();
      form.set("file", entry.file);
      form.set("id", entry.id);
      const result = await plannerRequest<{
        reference: ShootVideo["references"][number];
      }>(endpoint, { method: "POST", body: form, signal: abort.signal });
      if (!abort.signal.aborted) {
        onChange([...references, result.reference]);
        setPending(null);
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(errorMessage(e));
    } finally {
      controller.current = undefined;
      setUploading(false);
      onBusy(false);
    }
  }
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">
          Reference frames{" "}
          <span className="text-sm font-normal text-gray-400">
            {references.length}/{MAX_VIDEO_REFERENCES}
          </span>
        </h3>
        <input
          ref={picker}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label="Reference image file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload({ file, id: crypto.randomUUID() });
            e.target.value = "";
          }}
        />
        <Action
          disabled={
            disabled ||
            uploading ||
            !endpoint ||
            references.length >= MAX_VIDEO_REFERENCES
          }
          onClick={() => picker.current?.click()}
        >
          {endpoint ? "Upload reference image" : "Save shoot first"}
        </Action>
      </div>
      {uploading && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-gray-400">
            Uploading {pending?.file.name}…
          </p>
          <Action
            onClick={() => {
              controller.current?.abort();
              setPending(null);
            }}
          >
            Cancel upload
          </Action>
        </div>
      )}
      {error && (
        <div className="mb-4" role="alert">
          <p className="text-sm text-red-300">{error}</p>
          {pending && !uploading && (
            <Action className="mt-2" onClick={() => void upload(pending)}>
              Retry upload
            </Action>
          )}
        </div>
      )}
      {removed && (
        <div role="status" className="mb-3 flex items-center gap-3 text-sm">
          <span>Image removed.</span>
          <Action
            disabled={
              disabled || uploading || references.length >= MAX_VIDEO_REFERENCES
            }
            onClick={() => {
              const next = [...references];
              next.splice(Math.min(removed.index, next.length), 0, removed.ref);
              onChange(next);
              setRemoved(null);
            }}
          >
            Undo remove image
          </Action>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {references.map((ref, index) => (
          <div key={ref.id} className="min-w-0">
            <ReferenceImage
              src={`${endpoint}?image=${ref.id}`}
              alt={ref.caption || `Reference ${index + 1}`}
            />
            <div className="mt-3">
              <Field id={`reference-${ref.id}`} label={`Caption ${index + 1}`}>
                <input
                  id={`reference-${ref.id}`}
                  maxLength={500}
                  value={ref.caption}
                  disabled={disabled || uploading}
                  onChange={(e) =>
                    onChange(
                      references.map((item) =>
                        item.id === ref.id
                          ? { ...item, caption: e.target.value }
                          : item,
                      ),
                    )
                  }
                  className={fieldClass}
                />
              </Field>
            </div>
            <Action
              className="mt-2 w-full"
              disabled={disabled || uploading}
              onClick={() => {
                setRemoved({ ref, index });
                onChange(references.filter((item) => item.id !== ref.id));
              }}
            >
              Remove image {index + 1}
            </Action>
          </div>
        ))}
      </div>
    </section>
  );
}
