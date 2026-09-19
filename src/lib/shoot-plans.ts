/** Shared by the planner UI and API. No server-only imports. */
export const SHOOT_STATUSES = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;
export const SHOT_FORMATS = {
  vertical_video: "Vertical video",
  photo: "Photo",
  photo_video: "Photo + video",
  landscape_video: "Landscape video",
} as const;
export const SHOOT_LOCATIONS = {
  cricklewood: "Cricklewood",
  streatham: "Streatham Hill",
} as const;
export const WORK_TYPES = {
  content_shoot: "Content shoot",
  web_development: "Web development",
  website_maintenance: "Website maintenance",
  social_media: "Social media",
  design: "Design",
  other: "Other",
} as const;
export const WEEK_DAYS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
} as const;
export type WeeklyActivity = {
  id: string;
  title: string;
  type: keyof typeof WORK_TYPES;
  day: keyof typeof WEEK_DAYS | "";
  assignee: string;
  status: ShootStatus;
  notes: string;
};
export const MAX_ACTIVITIES = 50;
export function startOfWeek(date: string): string {
  if (!date) return "";
  const day = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(day.getTime())) return "";
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
export function formatWeek(date: string): string {
  return date ? `Week of ${formatShootDate(date)}` : "Week to be decided";
}
export type ShootStatus = keyof typeof SHOOT_STATUSES;
export type ShotFormat = keyof typeof SHOT_FORMATS;
export type ShootChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};
export const MAX_CHECKLIST_ITEMS = 100;
export type ShootVideo = {
  activityId?: string;
  id: string;
  title: string;
  style: string;
  concept: string;
  openingText: string;
  midVideoText: string;
  offerText: string;
  endFrame: string;
  references: { id: string; caption: string }[];
};
export const MAX_VIDEOS = 20;
export const MAX_VIDEO_REFERENCES = 6;
export function newVideo(): ShootVideo {
  return {
    id: crypto.randomUUID(),
    title: "",
    style: "",
    concept: "",
    openingText: "",
    midVideoText: "",
    offerText: "",
    endFrame: "",
    references: [],
  };
}
export type ShootShot = {
  videoId: string;
  id: string;
  title: string;
  description: string;
  format: ShotFormat;
  preparation: string;
  assignee: string;
  referenceUrl: string;
  captured: boolean;
};
export type ShootDraft = {
  weekStart: string;
  activities: WeeklyActivity[];
  title: string;
  date: string;
  time: string;
  location: keyof typeof SHOOT_LOCATIONS;
  objective: string;
  notes: string;
  visualDirection: string;
  outputFormat: string;
  videos: ShootVideo[];
  checklist: ShootChecklistItem[];
  status: ShootStatus;
  shots: ShootShot[];
};
export type ShootPlan = ShootDraft & {
  id: string;
  version: number;
  updatedAt: string;
};
export type ShootSummary = Omit<ShootPlan, "shots"> & {
  shotCount: number;
  capturedCount: number;
};
export const emptyShoot: ShootDraft = {
  weekStart: "",
  activities: [],
  title: "",
  date: "",
  time: "",
  location: "cricklewood",
  objective: "",
  notes: "",
  visualDirection: "",
  outputFormat: "Vertical 9:16",
  videos: [],
  checklist: [],
  status: "planned",
  shots: [],
};
export const MAX_SHOTS = 100;
export function newShot(videoId = ""): ShootShot {
  return {
    id: crypto.randomUUID(),
    videoId,
    title: "",
    description: "",
    format: "vertical_video",
    preparation: "",
    assignee: "",
    referenceUrl: "",
    captured: false,
  };
}
export function formatShootDate(date: string): string {
  if (!date) return "Date to be decided";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export class ShootValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
  }
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validShootId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ShootValidationError(
      "Check the shoot details and try again.",
      "title",
    );
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  field: string,
  max: number,
  required = false,
): string {
  if (typeof value !== "string")
    throw new ShootValidationError("Enter a text value.", field);
  const result = value.trim();
  if (required && !result)
    throw new ShootValidationError("Add a title.", field);
  if (result.length > max)
    throw new ShootValidationError(`Use ${max} characters or fewer.`, field);
  return result;
}
function choice<T extends string>(
  value: unknown,
  options: Record<T, string>,
  field: string,
): T {
  if (typeof value !== "string" || !Object.hasOwn(options, value))
    throw new ShootValidationError(
      "Choose one of the available options.",
      field,
    );
  return value as T;
}
export function parseShootDraft(input: unknown): ShootDraft {
  const data = record(input);
  const title = text(data.title, "title", 120, true);
  const weekStart = text(data.weekStart ?? "", "weekStart", 10);
  if (
    weekStart &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) ||
      startOfWeek(weekStart) !== weekStart)
  )
    throw new ShootValidationError(
      "Choose a valid Monday for the start of the week.",
      "weekStart",
    );
  const rawActivities = data.activities ?? [];
  if (!Array.isArray(rawActivities) || rawActivities.length > MAX_ACTIVITIES)
    throw new ShootValidationError(
      `Add up to ${MAX_ACTIVITIES} activities.`,
      "activities",
    );
  const activityIds = new Set<string>();
  const activities = rawActivities.map((value, index): WeeklyActivity => {
    const item = record(value);
    const prefix = `activity-${index}`;
    if (!validShootId(item.id) || activityIds.has(item.id))
      throw new ShootValidationError(
        "Each activity needs a unique ID.",
        "activities",
      );
    activityIds.add(item.id);
    return {
      id: item.id,
      title: text(item.title, `${prefix}-title`, 120, true),
      type: choice(item.type, WORK_TYPES, `${prefix}-type`),
      day: item.day === "" ? "" : choice(item.day, WEEK_DAYS, `${prefix}-day`),
      status: choice(item.status, SHOOT_STATUSES, `${prefix}-status`),
      assignee: text(item.assignee, `${prefix}-assignee`, 120),
      notes: text(item.notes, `${prefix}-notes`, 3000),
    };
  });
  if (activities.length && !weekStart)
    throw new ShootValidationError(
      "Choose a week for these activities.",
      "weekStart",
    );
  const rawChecklist = data.checklist === undefined ? [] : data.checklist;
  if (!Array.isArray(rawChecklist) || rawChecklist.length > MAX_CHECKLIST_ITEMS)
    throw new ShootValidationError(
      `Add up to ${MAX_CHECKLIST_ITEMS} checklist items.`,
      "checklist",
    );
  const checklistIds = new Set<string>();
  const checklist = rawChecklist.map((value, index): ShootChecklistItem => {
    const item = record(value);
    const field = `checklist-${index}-text`;
    if (!validShootId(item.id) || checklistIds.has(item.id))
      throw new ShootValidationError(
        "Each checklist item needs a unique ID. Reload the plan.",
        "checklist",
      );
    checklistIds.add(item.id);
    const label = text(item.text, field, 500);
    if (!label)
      throw new ShootValidationError(
        "Add a description or remove this empty item.",
        field,
      );
    if (typeof item.completed !== "boolean")
      throw new ShootValidationError(
        "Choose whether the item is complete.",
        field,
      );
    return { id: item.id, text: label, completed: item.completed };
  });
  const rawVideos = data.videos === undefined ? [] : data.videos;
  if (!Array.isArray(rawVideos) || rawVideos.length > MAX_VIDEOS)
    throw new ShootValidationError(`Add up to ${MAX_VIDEOS} videos.`, "videos");
  const videoIds = new Set<string>();
  const videos = rawVideos.map((value, index): ShootVideo => {
    const video = record(value);
    const prefix = `video-${index}`;
    if (!validShootId(video.id) || videoIds.has(video.id))
      throw new ShootValidationError("Each video needs a unique ID.", "videos");
    videoIds.add(video.id);
    if (
      !Array.isArray(video.references) ||
      video.references.length > MAX_VIDEO_REFERENCES
    )
      throw new ShootValidationError(
        `Add up to ${MAX_VIDEO_REFERENCES} reference images per video.`,
        `${prefix}-references`,
      );
    const referenceIds = new Set<string>();
    const references = video.references.map((value) => {
      const ref = record(value);
      if (!validShootId(ref.id) || referenceIds.has(ref.id))
        throw new ShootValidationError(
          "Choose a valid reference image.",
          `${prefix}-references`,
        );
      referenceIds.add(ref.id);
      return {
        id: ref.id,
        caption: text(ref.caption, `${prefix}-references`, 500),
      };
    });
    const activityId = text(video.activityId ?? "", `${prefix}-activityId`, 36);
    if (
      activityId &&
      !activities.some(
        (activity) =>
          activity.id === activityId && activity.type === "content_shoot",
      )
    )
      throw new ShootValidationError(
        "Choose a content shoot from this week.",
        `${prefix}-activityId`,
      );
    return {
      activityId,
      id: video.id,
      title: text(video.title, `${prefix}-title`, 120, true),
      style: text(video.style, `${prefix}-style`, 250),
      concept: text(video.concept, `${prefix}-concept`, 3000),
      openingText: text(video.openingText, `${prefix}-openingText`, 1000),
      midVideoText: text(video.midVideoText, `${prefix}-midVideoText`, 2000),
      offerText: text(video.offerText, `${prefix}-offerText`, 1000),
      endFrame: text(video.endFrame, `${prefix}-endFrame`, 1000),
      references,
    };
  });
  const date = text(data.date, "date", 10);
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date)
  ) {
    throw new ShootValidationError("Choose a valid shoot date.", "date");
  }
  const time = text(data.time, "time", 5);
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new ShootValidationError("Choose a valid start time.", "time");
  if (time && !date)
    throw new ShootValidationError(
      "Choose a date before adding a start time.",
      "date",
    );
  if (!Array.isArray(data.shots) || data.shots.length > MAX_SHOTS)
    throw new ShootValidationError(
      `A plan can have up to ${MAX_SHOTS} shots.`,
      "shots",
    );
  const ids = new Set<string>();
  const shots = data.shots.map((value, index): ShootShot => {
    const shot = record(value);
    const prefix = `shot-${index}`;
    if (!validShootId(shot.id) || ids.has(shot.id))
      throw new ShootValidationError(
        "Each shot must have a unique ID. Reload the plan.",
        "shots",
      );
    ids.add(shot.id);
    const videoId =
      shot.videoId === undefined
        ? ""
        : text(shot.videoId, `${prefix}-videoId`, 36);
    if (videoId && !videoIds.has(videoId))
      throw new ShootValidationError(
        "Choose a video in this shoot.",
        `${prefix}-videoId`,
      );
    const shotTitle = text(shot.title, `${prefix}-title`, 120, true);
    const referenceUrl = text(
      shot.referenceUrl,
      `${prefix}-referenceUrl`,
      2000,
    );
    if (referenceUrl) {
      let url: URL;
      try {
        url = new URL(referenceUrl);
      } catch {
        throw new ShootValidationError(
          "Use a full https:// or http:// reference link.",
          `${prefix}-referenceUrl`,
        );
      }
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new ShootValidationError(
          "Use a public https:// or http:// reference link.",
          `${prefix}-referenceUrl`,
        );
    }
    if (typeof shot.captured !== "boolean")
      throw new ShootValidationError(
        "Choose whether the shot is captured.",
        "shots",
      );
    return {
      id: shot.id,
      videoId,
      title: shotTitle,
      description: text(shot.description, `${prefix}-description`, 2000),
      format: choice(shot.format, SHOT_FORMATS, `${prefix}-format`),
      preparation: text(shot.preparation, `${prefix}-preparation`, 2000),
      assignee: text(shot.assignee, `${prefix}-assignee`, 120),
      referenceUrl,
      captured: shot.captured,
    };
  });
  return {
    weekStart,
    activities,
    title,
    date,
    time,
    location: choice(data.location, SHOOT_LOCATIONS, "location"),
    objective: text(data.objective, "objective", 2000),
    notes: text(data.notes, "notes", 5000),
    checklist,
    videos,
    visualDirection: text(data.visualDirection ?? "", "visualDirection", 3000),
    outputFormat: text(
      data.outputFormat ?? "Vertical 9:16",
      "outputFormat",
      250,
    ),
    status: choice(data.status, SHOOT_STATUSES, "status"),
    shots,
  };
}
