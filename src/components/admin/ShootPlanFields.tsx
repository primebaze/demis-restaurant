"use client";
import { Field, fieldClass } from "./ShootPlanUI";
export type FieldErrors = { errorField: string; error: string };
export function PlanSelect({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
  errorField,
  error,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
} & FieldErrors) {
  return (
    <Field id={id} label={label} error={errorField === id ? error : undefined}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
        aria-invalid={errorField === id || undefined}
        aria-describedby={errorField === id ? `${id}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {/* Preserve free-text values saved before these fields became selects. */}
        {value && !options.includes(value) && (
          <option value={value}>{value}</option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function PlanText({
  id,
  label,
  value,
  onChange,
  rows,
  maxLength = 2000,
  errorField,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
} & FieldErrors) {
  const props = {
    id,
    value,
    maxLength,
    "aria-invalid": errorField === id || undefined,
    "aria-describedby": errorField === id ? `${id}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    className: fieldClass,
  };
  return (
    <Field id={id} label={label} error={errorField === id ? error : undefined}>
      {rows ? (
        <textarea
          {...props}
          rows={rows}
          className={`${fieldClass} resize-none`}
        />
      ) : (
        <input {...props} />
      )}
    </Field>
  );
}
