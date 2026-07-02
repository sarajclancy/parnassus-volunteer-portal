import { env } from "cloudflare:workers";

export type AccountRole = "admin" | "family";

export type Account = {
  id: string;
  role: AccountRole;
  name: string;
  email: string;
  targetHours: number;
};

export type ContactPreference = "email" | "phone" | "both";
export type ClearanceStatus = "not_started" | "pending" | "cleared";
export type EventCohort = "all" | "A" | "B" | "C";
export type EventGrade =
  | "jk"
  | "k"
  | "1st"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "8th"
  | "9th"
  | "10th"
  | "11th"
  | "12th"
  | "all";
export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "url"
  | "email"
  | "phone"
  | "checkbox"
  | "select"
  | "multi_select";

export type FamilyMemberPhone = {
  id: string;
  label: string;
  number: string;
};

export type FamilyMember = {
  id: string;
  familyId: string;
  name: string;
  email: string;
  preferredContactMethod: ContactPreference;
  clearanceStatus: ClearanceStatus;
  phones: FamilyMemberPhone[];
};

export type WaitlistEntry = {
  id: string;
  positionId: string;
  familyId: string;
  familyName: string | null;
  status: "active" | "promoted" | "cancelled";
  requestedAt: string;
  isMine: boolean;
};

export type PositionSignup = {
  id: string;
  familyId: string;
  familyName: string | null;
  status: "reserved" | "completed";
  claimedAt: string;
  completedAt: string | null;
  completionRequestedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  noShowAt: string | null;
  swapRequestedAt: string | null;
  swapNote: string;
  isMine: boolean;
};

export type PortalPosition = {
  id: string;
  title: string;
  description: string;
  hours: number;
  requirements: string[];
  clearanceRequired: boolean;
  adultOnly: boolean;
  trainingRequired: boolean;
  signup: PositionSignup | null;
  waitlist: WaitlistEntry[];
};

export type EventCustomField = {
  id: string;
  eventId: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  value: string;
};

export type PortalEvent = {
  id: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  cohort: EventCohort;
  grade: EventGrade;
  hours: number;
  description: string;
  instructions: string;
  parkingInfo: string;
  cancellationDeadlineHours: number;
  reminderDays: number[];
  resourceLinks: Array<{ title: string; url: string }>;
  privateNotes: string;
  status: "planned" | "cancelled";
  customFields: EventCustomField[];
  positions: PortalPosition[];
};

export type FamilySummary = {
  id: string;
  name: string;
  email: string;
  targetHours: number;
  studentName: string;
  studentGrade: string;
  teacherName: string;
  volunteerInterests: string[];
  adminNotes: string;
  reservedHours: number;
  completedHours: number;
  members: FamilyMember[];
};

export type VolunteerPolicy = {
  id: string;
  title: string;
  body: string;
  attachmentName: string;
  attachmentDataUrl: string;
  publishedAt: string;
  acknowledgedAt: string | null;
  signerName: string | null;
  acknowledgedFamilyIds: string[];
};

export const sessionCookieName = "volunteer_session";

type D1Result<T> = {
  results?: T[];
};

type AccountRow = Account & {
  passwordHash?: string;
};

type EventPositionPayload = {
  id?: string;
  title?: string;
  description?: string;
  hours?: number | null;
  requirements?: string[];
  clearanceRequired?: boolean;
  adultOnly?: boolean;
  trainingRequired?: boolean;
};

type EventResourceLinkPayload = {
  title?: string;
  url?: string;
};

type EventCustomFieldPayload = {
  id?: string;
  label?: string;
  fieldType?: string;
  options?: string[];
  value?: string | boolean | string[];
};

type EventPayload = {
  eventId?: string;
  title?: string;
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  cohort?: string;
  grade?: string;
  hours?: number;
  description?: string;
  instructions?: string;
  parkingInfo?: string;
  cancellationDeadlineHours?: number;
  reminderDays?: number[];
  resourceLinks?: EventResourceLinkPayload[];
  privateNotes?: string;
  recurrenceFrequency?: string;
  recurrenceCount?: number;
  customFields?: EventCustomFieldPayload[];
  positions?: EventPositionPayload[];
};

type FamilyProfilePayload = {
  studentName?: string;
  studentGrade?: string;
  teacherName?: string;
  volunteerInterests?: string[];
  members?: Array<{
    id?: string;
    name?: string;
    email?: string;
    preferredContactMethod?: string;
    phones?: Array<{
      id?: string;
      label?: string;
      number?: string;
    }>;
  }>;
};

type VolunteerPolicyPayload = {
  title?: string;
  body?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
};

const passwordSalt = "school-volunteer-portal-v1";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function getD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. The portal needs the DB binding in .openai/hosting.json."
    );
  }

  return env.DB;
}

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(`${passwordSalt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseCookies(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) {
          return [part, ""];
        }

        return [
          decodeURIComponent(part.slice(0, separator)),
          decodeURIComponent(part.slice(separator + 1)),
        ];
      })
  );
}

export function createSessionCookie(token: string) {
  return `${sessionCookieName}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`;
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function normalizeCohort(value: string | undefined): EventCohort | null {
  if (value === "all" || value === "A" || value === "B" || value === "C") {
    return value;
  }

  return null;
}

function normalizeGrade(value: string | undefined): EventGrade | null {
  if (value === "kinder") {
    return "k";
  }

  const grades: EventGrade[] = [
    "jk",
    "k",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
    "all",
  ];

  if (grades.some((grade) => grade === value)) {
    return value as EventGrade;
  }

  return null;
}

function normalizeClearanceStatus(value: string | undefined): ClearanceStatus {
  if (value === "pending" || value === "cleared") {
    return value;
  }

  return "not_started";
}

function normalizeCustomFieldType(value: string | undefined): CustomFieldType {
  const types: CustomFieldType[] = [
    "text",
    "textarea",
    "number",
    "date",
    "time",
    "url",
    "email",
    "phone",
    "checkbox",
    "select",
    "multi_select",
  ];

  return types.find((type) => type === value) ?? "text";
}

function normalizeCustomFieldOptions(options: string[] | undefined) {
  const seen = new Set<string>();

  return (
    options
      ?.map((option) => option.trim())
      .filter(Boolean)
      .filter((option) => {
        const key = option.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, 30) ?? []
  );
}

function parseCustomFieldOptions(value: unknown) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter((option): option is string => typeof option === "string")
      : [];
  } catch {
    return [];
  }
}

function parseStringArray(value: unknown) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function normalizeStringList(values: string[] | undefined, limit = 20) {
  const seen = new Set<string>();

  return (
    values
      ?.map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, limit) ?? []
  );
}

function parseReminderDays(value: unknown) {
  if (typeof value !== "string" || !value) {
    return [7, 3, 1];
  }

  try {
    const parsed = JSON.parse(value);
    const days = Array.isArray(parsed)
      ? parsed
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item >= 0 && item <= 90)
      : [];

    return days.length > 0 ? Array.from(new Set(days)).sort((a, b) => b - a) : [];
  } catch {
    return [7, 3, 1];
  }
}

function normalizeReminderDays(values: number[] | undefined) {
  const days =
    values
      ?.map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 90) ??
    [];

  return days.length > 0 ? Array.from(new Set(days)).sort((a, b) => b - a) : [];
}

function parseResourceLinks(value: unknown) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .map((link) => ({
            title:
              typeof link?.title === "string" ? link.title.trim() : "",
            url: typeof link?.url === "string" ? link.url.trim() : "",
          }))
          .filter((link) => link.title && link.url)
      : [];
  } catch {
    return [];
  }
}

function normalizeResourceLinks(links: EventResourceLinkPayload[] | undefined) {
  return (
    links
      ?.map((link) => ({
        title: link.title?.trim() ?? "",
        url: link.url?.trim() ?? "",
      }))
      .filter((link) => link.title && link.url)
      .slice(0, 12) ?? []
  );
}

function normalizeCustomFieldValue(
  fieldType: CustomFieldType,
  value: string | boolean | string[] | undefined
) {
  if (fieldType === "checkbox") {
    return value === true || value === "true" ? "true" : "false";
  }

  if (fieldType === "multi_select") {
    if (Array.isArray(value)) {
      return JSON.stringify(value.filter((item) => typeof item === "string"));
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(
          Array.isArray(parsed)
            ? parsed.filter((item) => typeof item === "string")
            : []
        );
      } catch {
        return JSON.stringify([]);
      }
    }

    return JSON.stringify([]);
  }

  return typeof value === "string" ? value.trim() : "";
}

function isOrderedDateRange(startDate: string, endDate: string) {
  return endDate >= startDate;
}

function addDays(date: string, days: number) {
  const current = new Date(`${date}T12:00:00Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00Z`).getTime();
  const end = new Date(`${endDate}T12:00:00Z`).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function eventStartMs(date: string, startTime: string) {
  const value = new Date(`${date}T${startTime || "00:00"}:00`).getTime();
  return Number.isFinite(value) ? value : null;
}

function isInsideCancellationWindow(
  date: string,
  startTime: string,
  cancellationDeadlineHours: number
) {
  const startMs = eventStartMs(date, startTime);

  if (!startMs) {
    return false;
  }

  return startMs - Date.now() <= cancellationDeadlineHours * 60 * 60 * 1000;
}

async function getActivePolicyForAccount(
  db: D1Database,
  account: Account
): Promise<VolunteerPolicy | null> {
  const policy = await db
    .prepare(
      `SELECT
        id,
        title,
        body,
        attachment_name AS attachmentName,
        attachment_data_url AS attachmentDataUrl,
        published_at AS publishedAt
       FROM volunteer_policies
       WHERE is_active = 1
       ORDER BY published_at DESC
       LIMIT 1`
    )
    .first<Record<string, unknown>>();

  if (!policy) {
    return null;
  }

  const acknowledgementRows = await db
    .prepare(
      `SELECT
        family_id AS familyId,
        signer_name AS signerName,
        acknowledged_at AS acknowledgedAt
       FROM policy_acknowledgements
       WHERE policy_id = ?`
    )
    .bind(String(policy.id))
    .all();
  const acknowledgements =
    (acknowledgementRows as D1Result<Record<string, unknown>>).results ?? [];
  const myAcknowledgement = acknowledgements.find(
    (row) => String(row.familyId) === account.id
  );

  return {
    id: String(policy.id),
    title: String(policy.title),
    body: String(policy.body ?? ""),
    attachmentName: String(policy.attachmentName ?? ""),
    attachmentDataUrl:
      account.role === "admin" || myAcknowledgement
        ? String(policy.attachmentDataUrl ?? "")
        : String(policy.attachmentDataUrl ?? ""),
    publishedAt: String(policy.publishedAt),
    acknowledgedAt: myAcknowledgement
      ? String(myAcknowledgement.acknowledgedAt)
      : null,
    signerName: myAcknowledgement ? String(myAcknowledgement.signerName) : null,
    acknowledgedFamilyIds:
      account.role === "admin"
        ? acknowledgements.map((row) => String(row.familyId))
        : [],
  };
}

async function requireCurrentPolicyAcknowledgement(
  db: D1Database,
  family: Account
) {
  const policy = await getActivePolicyForAccount(db, family);

  if (!policy || policy.acknowledgedAt) {
    return null;
  }

  return Response.json(
    {
      error:
        "Please review and sign the current volunteer policy before using volunteer signups.",
    },
    { status: 409 }
  );
}

function normalizeCustomFields(fields: EventCustomFieldPayload[] | undefined) {
  return (
    fields
      ?.map((field) => {
        const fieldType = normalizeCustomFieldType(field.fieldType);
        const options = normalizeCustomFieldOptions(field.options);

        return {
          label: field.label?.trim() ?? "",
          fieldType,
          options,
          value: normalizeCustomFieldValue(fieldType, field.value),
        };
      })
      .filter((field) => field.label || field.value) ?? []
  );
}

async function ensureEventAudienceColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(events)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );
  const statements: D1PreparedStatement[] = [];

  if (!existingColumns.has("cohort")) {
    statements.push(
      db.prepare("ALTER TABLE events ADD COLUMN cohort TEXT NOT NULL DEFAULT 'A'")
    );
  }

  if (!existingColumns.has("grade")) {
    statements.push(
      db.prepare("ALTER TABLE events ADD COLUMN grade TEXT NOT NULL DEFAULT 'all'")
    );
  }

  const hasEndDate = existingColumns.has("end_date");

  if (!hasEndDate) {
    statements.push(
      db.prepare("ALTER TABLE events ADD COLUMN end_date TEXT NOT NULL DEFAULT ''")
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  await db
    .prepare("UPDATE events SET end_date = date WHERE end_date = '' OR end_date IS NULL")
    .run();
}

async function ensureAccountProfileColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(accounts)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );
  const statements: D1PreparedStatement[] = [];

  [
    ["student_name", "ALTER TABLE accounts ADD COLUMN student_name TEXT NOT NULL DEFAULT ''"],
    ["student_grade", "ALTER TABLE accounts ADD COLUMN student_grade TEXT NOT NULL DEFAULT ''"],
    ["teacher_name", "ALTER TABLE accounts ADD COLUMN teacher_name TEXT NOT NULL DEFAULT ''"],
    [
      "volunteer_interests_json",
      "ALTER TABLE accounts ADD COLUMN volunteer_interests_json TEXT NOT NULL DEFAULT '[]'",
    ],
    ["admin_notes", "ALTER TABLE accounts ADD COLUMN admin_notes TEXT NOT NULL DEFAULT ''"],
  ].forEach(([column, statement]) => {
    if (!existingColumns.has(column)) {
      statements.push(db.prepare(statement));
    }
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function ensureFamilyMemberColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(family_members)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );

  if (!existingColumns.has("clearance_status")) {
    await db
      .prepare(
        "ALTER TABLE family_members ADD COLUMN clearance_status TEXT NOT NULL DEFAULT 'not_started'"
      )
      .run();
  }
}

async function ensureEventOperationsColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(events)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );
  const statements: D1PreparedStatement[] = [];

  [
    ["instructions", "ALTER TABLE events ADD COLUMN instructions TEXT NOT NULL DEFAULT ''"],
    ["parking_info", "ALTER TABLE events ADD COLUMN parking_info TEXT NOT NULL DEFAULT ''"],
    [
      "cancellation_deadline_hours",
      "ALTER TABLE events ADD COLUMN cancellation_deadline_hours INTEGER NOT NULL DEFAULT 24",
    ],
    [
      "reminder_days_json",
      "ALTER TABLE events ADD COLUMN reminder_days_json TEXT NOT NULL DEFAULT '[7,3,1]'",
    ],
    [
      "resource_links_json",
      "ALTER TABLE events ADD COLUMN resource_links_json TEXT NOT NULL DEFAULT '[]'",
    ],
    ["private_notes", "ALTER TABLE events ADD COLUMN private_notes TEXT NOT NULL DEFAULT ''"],
  ].forEach(([column, statement]) => {
    if (!existingColumns.has(column)) {
      statements.push(db.prepare(statement));
    }
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function ensurePositionRequirementColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(positions)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );
  const statements: D1PreparedStatement[] = [];

  [
    [
      "requirements_json",
      "ALTER TABLE positions ADD COLUMN requirements_json TEXT NOT NULL DEFAULT '[]'",
    ],
    [
      "clearance_required",
      "ALTER TABLE positions ADD COLUMN clearance_required INTEGER NOT NULL DEFAULT 0",
    ],
    ["adult_only", "ALTER TABLE positions ADD COLUMN adult_only INTEGER NOT NULL DEFAULT 0"],
    [
      "training_required",
      "ALTER TABLE positions ADD COLUMN training_required INTEGER NOT NULL DEFAULT 0",
    ],
  ].forEach(([column, statement]) => {
    if (!existingColumns.has(column)) {
      statements.push(db.prepare(statement));
    }
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function ensureSignupWorkflowColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(signups)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );
  const statements: D1PreparedStatement[] = [];

  [
    ["checked_in_at", "ALTER TABLE signups ADD COLUMN checked_in_at TEXT"],
    ["checked_out_at", "ALTER TABLE signups ADD COLUMN checked_out_at TEXT"],
    ["no_show_at", "ALTER TABLE signups ADD COLUMN no_show_at TEXT"],
    ["swap_requested_at", "ALTER TABLE signups ADD COLUMN swap_requested_at TEXT"],
    [
      "completion_requested_at",
      "ALTER TABLE signups ADD COLUMN completion_requested_at TEXT",
    ],
    ["swap_note", "ALTER TABLE signups ADD COLUMN swap_note TEXT NOT NULL DEFAULT ''"],
  ].forEach(([column, statement]) => {
    if (!existingColumns.has(column)) {
      statements.push(db.prepare(statement));
    }
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function ensureEventCustomFieldColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(event_custom_fields)").all();
  const existingColumns = new Set(
    ((columns as D1Result<Record<string, unknown>>).results ?? []).map((column) =>
      String(column.name)
    )
  );
  const statements: D1PreparedStatement[] = [];

  if (!existingColumns.has("field_type")) {
    statements.push(
      db.prepare("ALTER TABLE event_custom_fields ADD COLUMN field_type TEXT NOT NULL DEFAULT 'text'")
    );
  }

  if (!existingColumns.has("options_json")) {
    statements.push(
      db.prepare("ALTER TABLE event_custom_fields ADD COLUMN options_json TEXT NOT NULL DEFAULT '[]'")
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

export async function ensurePortalData() {
  const db = getD1();

  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('admin', 'family')),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        target_hours REAL NOT NULL DEFAULT 40,
        student_name TEXT NOT NULL DEFAULT '',
        student_grade TEXT NOT NULL DEFAULT '',
        teacher_name TEXT NOT NULL DEFAULT '',
        volunteer_interests_json TEXT NOT NULL DEFAULT '[]',
        admin_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON accounts (email)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        preferred_contact_method TEXT NOT NULL DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'both')),
        clearance_status TEXT NOT NULL DEFAULT 'not_started' CHECK (clearance_status IN ('not_started', 'pending', 'cleared')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS family_members_family_id_idx ON family_members (family_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS family_member_phones (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        label TEXT NOT NULL DEFAULT 'Mobile',
        phone_number TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS family_member_phones_member_id_idx ON family_member_phones (member_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        end_date TEXT NOT NULL DEFAULT '',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT NOT NULL,
        cohort TEXT NOT NULL DEFAULT 'A' CHECK (cohort IN ('all', 'A', 'B', 'C')),
        grade TEXT NOT NULL DEFAULT 'all' CHECK (grade IN ('jk', 'k', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'all')),
        hours REAL NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        instructions TEXT NOT NULL DEFAULT '',
        parking_info TEXT NOT NULL DEFAULT '',
        cancellation_deadline_hours INTEGER NOT NULL DEFAULT 24,
        reminder_days_json TEXT NOT NULL DEFAULT '[7,3,1]',
        resource_links_json TEXT NOT NULL DEFAULT '[]',
        private_notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'cancelled')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS events_date_idx ON events (date)"),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS event_custom_fields (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'time', 'url', 'email', 'phone', 'checkbox', 'select', 'multi_select')),
        options_json TEXT NOT NULL DEFAULT '[]',
        value TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS event_custom_fields_event_id_idx ON event_custom_fields (event_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        hours_override REAL,
        requirements_json TEXT NOT NULL DEFAULT '[]',
        clearance_required INTEGER NOT NULL DEFAULT 0,
        adult_only INTEGER NOT NULL DEFAULT 0,
        training_required INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS positions_event_id_idx ON positions (event_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS signups (
        id TEXT PRIMARY KEY,
        position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed')),
        claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        completion_requested_at TEXT,
        checked_in_at TEXT,
        checked_out_at TEXT,
        no_show_at TEXT,
        swap_requested_at TEXT,
        swap_note TEXT NOT NULL DEFAULT '',
        UNIQUE(position_id)
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS signups_family_id_idx ON signups (family_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS waitlist_entries (
        id TEXT PRIMARY KEY,
        position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'cancelled')),
        requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS waitlist_entries_position_id_idx ON waitlist_entries (position_id)"
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS waitlist_entries_family_id_idx ON waitlist_entries (family_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS volunteer_policies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        attachment_name TEXT NOT NULL DEFAULT '',
        attachment_data_url TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL REFERENCES accounts(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS volunteer_policies_active_idx ON volunteer_policies (is_active)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS policy_acknowledgements (
        id TEXT PRIMARY KEY,
        policy_id TEXT NOT NULL REFERENCES volunteer_policies(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        signer_name TEXT NOT NULL,
        acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(policy_id, family_id)
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS policy_acknowledgements_family_id_idx ON policy_acknowledgements (family_id)"
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS sessions_account_id_idx ON sessions (account_id)"
    ),
  ]);

  await ensureAccountProfileColumns(db);
  await ensureFamilyMemberColumns(db);
  await ensureEventAudienceColumns(db);
  await ensureEventOperationsColumns(db);
  await ensureEventCustomFieldColumns(db);
  await ensurePositionRequirementColumns(db);
  await ensureSignupWorkflowColumns(db);

  const existing = await db
    .prepare("SELECT COUNT(*) AS count FROM accounts")
    .first<{ count: number }>();

  if (!existing || Number(existing.count) === 0) {
    await seedPortalData(db);
  }

  await ensureFamilyMemberData(db);

  return db;
}

async function seedPortalData(db: D1Database) {
  const accountRows = await Promise.all(
    [
      {
        id: "admin-main",
        role: "admin",
        name: "Volunteer Office",
        email: "admin@school.test",
        password: "admin2026",
        targetHours: 0,
      },
      {
        id: "family-rivera",
        role: "family",
        name: "Rivera Family",
        email: "rivera@example.com",
        password: "family2026",
        targetHours: 40,
        studentName: "Sofia Rivera",
        studentGrade: "4th",
        teacherName: "Ms. Larson",
        volunteerInterests: ["Book Fair", "Campus Help", "Classroom Prep"],
      },
      {
        id: "family-chen",
        role: "family",
        name: "Chen Family",
        email: "chen@example.com",
        password: "family2026",
        targetHours: 40,
        studentName: "Evan Chen",
        studentGrade: "7th",
        teacherName: "Mr. Wells",
        volunteerInterests: ["Events", "Technology", "Check-in"],
      },
      {
        id: "family-patel",
        role: "family",
        name: "Patel Family",
        email: "patel@example.com",
        password: "family2026",
        targetHours: 40,
        studentName: "Leela Patel",
        studentGrade: "k",
        teacherName: "Mrs. Novak",
        volunteerInterests: ["Library", "Office Help", "Fundraising"],
      },
    ].map(async (account) => ({
      ...account,
      passwordHash: await hashPassword(account.password),
    }))
  );

  await db.batch(
    accountRows.map((account) =>
      db
        .prepare(
          `INSERT INTO accounts
            (id, role, name, email, password_hash, target_hours, student_name, student_grade, teacher_name, volunteer_interests_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          account.id,
          account.role,
          account.name,
          account.email,
          account.passwordHash,
          account.targetHours,
          "studentName" in account ? account.studentName : "",
          "studentGrade" in account ? account.studentGrade : "",
          "teacherName" in account ? account.teacherName : "",
          JSON.stringify("volunteerInterests" in account ? account.volunteerInterests : [])
        )
    )
  );

  const events = [
    {
      id: "event-campus-cleanup",
      title: "Summer Campus Cleanup",
      date: "2026-06-20",
      endDate: "2026-06-20",
      startTime: "09:00",
      endTime: "13:00",
      location: "Main Courtyard",
      cohort: "A",
      grade: "all",
      hours: 4,
      description: "Prepare outdoor spaces before the new school year.",
      instructions: "Meet at the main courtyard supply table.",
      parkingInfo: "Use the north lot and enter through the courtyard gate.",
      cancellationDeadlineHours: 24,
      reminderDays: [7, 3, 1],
      resourceLinks: [
        { title: "Campus map", url: "https://www.parnassusprepacademy.org" },
      ],
      privateNotes: "Bring extra gloves for new volunteers.",
    },
    {
      id: "event-packet-prep",
      title: "Back-to-School Packet Prep",
      date: "2026-08-14",
      endDate: "2026-08-14",
      startTime: "10:00",
      endTime: "12:00",
      location: "School Office",
      cohort: "B",
      grade: "1st",
      hours: 2,
      description: "Sort, label, and assemble family welcome packets.",
      instructions: "Check in at the school office before starting.",
      parkingInfo: "Short-term parking is available near the front entrance.",
      cancellationDeadlineHours: 24,
      reminderDays: [7, 2, 1],
      resourceLinks: [],
      privateNotes: "Office staff will provide class lists.",
    },
    {
      id: "event-fall-fair",
      title: "Fall Family Fair",
      date: "2026-09-12",
      endDate: "2026-09-12",
      startTime: "08:30",
      endTime: "12:30",
      location: "Playground and Gym",
      cohort: "C",
      grade: "all",
      hours: 4,
      description: "Support games, check-in, and activity stations.",
      instructions: "Volunteer check-in opens 15 minutes before the first shift.",
      parkingInfo: "Use the playground entrance for setup shifts.",
      cancellationDeadlineHours: 48,
      reminderDays: [7, 3, 1],
      resourceLinks: [
        { title: "Family fair page", url: "https://www.parnassusprepacademy.org" },
      ],
      privateNotes: "Confirm weather backup plan the day before.",
    },
    {
      id: "event-book-fair",
      title: "Book Fair Preview Night",
      date: "2026-10-07",
      endDate: "2026-10-07",
      startTime: "17:00",
      endTime: "19:30",
      location: "Library",
      cohort: "A",
      grade: "k",
      hours: 2.5,
      description: "Help families browse, check out, and restock displays.",
      instructions: "Meet in the library and ask for the Book Fair lead.",
      parkingInfo: "Evening parking is open in both lots.",
      cancellationDeadlineHours: 24,
      reminderDays: [5, 2, 1],
      resourceLinks: [
        { title: "School library", url: "https://www.parnassusprepacademy.org" },
      ],
      privateNotes: "Cashier role should be filled by cleared adults.",
    },
  ];

  await db.batch(
    events.map((event) =>
      db
        .prepare(
          `INSERT INTO events
            (id, title, date, end_date, start_time, end_time, location, cohort, grade, hours, description, instructions, parking_info, cancellation_deadline_hours, reminder_days_json, resource_links_json, private_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          event.id,
          event.title,
          event.date,
          event.endDate,
          event.startTime,
          event.endTime,
          event.location,
          event.cohort,
          event.grade,
          event.hours,
          event.description,
          event.instructions,
          event.parkingInfo,
          event.cancellationDeadlineHours,
          JSON.stringify(event.reminderDays),
          JSON.stringify(event.resourceLinks),
          event.privateNotes
        )
    )
  );

  const positions = [
    {
      id: "position-cleanup-mulch",
      eventId: "event-campus-cleanup",
      title: "Garden Refresh",
      description: "Spread mulch and clear planter beds.",
      hoursOverride: null,
      requirements: ["Comfortable working outdoors"],
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
    {
      id: "position-cleanup-supplies",
      eventId: "event-campus-cleanup",
      title: "Supply Table",
      description: "Check families in and distribute cleanup supplies.",
      hoursOverride: null,
      requirements: ["Friendly greeting table support"],
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
    {
      id: "position-packet-labels",
      eventId: "event-packet-prep",
      title: "Labeling Lead",
      description: "Print labels and organize packets by classroom.",
      hoursOverride: null,
      requirements: ["Attention to detail"],
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
    {
      id: "position-packet-assembly",
      eventId: "event-packet-prep",
      title: "Packet Assembly",
      description: "Assemble and count packets for each class.",
      hoursOverride: null,
      requirements: ["Sorting and counting"],
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
    {
      id: "position-fair-checkin",
      eventId: "event-fall-fair",
      title: "Welcome Table",
      description: "Greet families and hand out wristbands.",
      hoursOverride: null,
      requirements: ["Check-in station"],
      clearanceRequired: false,
      adultOnly: true,
      trainingRequired: false,
    },
    {
      id: "position-fair-games",
      eventId: "event-fall-fair",
      title: "Game Station",
      description: "Run one classroom game station for the morning.",
      hoursOverride: null,
      requirements: ["Comfortable with student activities"],
      clearanceRequired: true,
      adultOnly: true,
      trainingRequired: true,
    },
    {
      id: "position-fair-setup",
      eventId: "event-fall-fair",
      title: "Morning Setup",
      description: "Set up tables, signage, and activity materials.",
      hoursOverride: null,
      requirements: ["Can lift lightweight tables"],
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
    {
      id: "position-book-cashier",
      eventId: "event-book-fair",
      title: "Checkout Desk",
      description: "Help with purchases and receipt organization.",
      hoursOverride: null,
      requirements: ["Cash handling"],
      clearanceRequired: true,
      adultOnly: true,
      trainingRequired: true,
    },
    {
      id: "position-book-restock",
      eventId: "event-book-fair",
      title: "Display Restock",
      description: "Restock featured books and keep tables tidy.",
      hoursOverride: null,
      requirements: ["Library support"],
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
  ];

  await db.batch(
    positions.map((position) =>
      db
        .prepare(
          `INSERT INTO positions
            (id, event_id, title, description, hours_override, requirements_json, clearance_required, adult_only, training_required)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          position.id,
          position.eventId,
          position.title,
          position.description,
          position.hoursOverride,
          JSON.stringify(position.requirements),
          position.clearanceRequired ? 1 : 0,
          position.adultOnly ? 1 : 0,
          position.trainingRequired ? 1 : 0
        )
    )
  );

  await db.batch([
    db
      .prepare(
        `INSERT INTO signups
          (id, position_id, family_id, status, claimed_at, completed_at)
         VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind("signup-rivera-cleanup", "position-cleanup-mulch", "family-rivera"),
    db
      .prepare(
        `INSERT INTO signups
          (id, position_id, family_id, status)
         VALUES (?, ?, ?, 'reserved')`
      )
      .bind("signup-chen-fair-setup", "position-fair-setup", "family-chen"),
  ]);
}

async function ensureFamilyMemberData(db: D1Database) {
  const familyRows = await db
    .prepare("SELECT id, name, email FROM accounts WHERE role = 'family'")
    .all();

  for (const family of
    (familyRows as D1Result<Record<string, unknown>>).results ?? []) {
    const familyId = String(family.id);
    const existing = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM family_members WHERE family_id = ?"
      )
      .bind(familyId)
      .first<{ count: number }>();

    if (existing && Number(existing.count) > 0) {
      continue;
    }

    const familyName = String(family.name);
    const familyEmail = String(family.email);
    const fixtureMembers = getSeedFamilyMembers(familyId, familyName, familyEmail);
    const statements: D1PreparedStatement[] = [];

    for (const member of fixtureMembers) {
      const memberId = member.id;
      statements.push(
        db
          .prepare(
            `INSERT INTO family_members
              (id, family_id, name, email, preferred_contact_method, clearance_status)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            memberId,
            familyId,
            member.name,
            member.email,
            member.preferredContactMethod,
            member.clearanceStatus
          )
      );

      member.phones.forEach((phone, phoneIndex) => {
        statements.push(
          db
            .prepare(
              `INSERT INTO family_member_phones
                (id, member_id, label, phone_number, sort_order)
               VALUES (?, ?, ?, ?, ?)`
            )
            .bind(
              `${memberId}-phone-${phoneIndex + 1}`,
              memberId,
              phone.label,
              phone.number,
              phoneIndex
            )
        );
      });
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }
  }
}

function getSeedFamilyMembers(
  familyId: string,
  familyName: string,
  familyEmail: string
) {
  const fixtures: Record<
    string,
    Array<{
      id: string;
      name: string;
      email: string;
      preferredContactMethod: ContactPreference;
      clearanceStatus: ClearanceStatus;
      phones: Array<{ label: string; number: string }>;
    }>
  > = {
    "family-rivera": [
      {
        id: "member-rivera-alicia",
        name: "Alicia Rivera",
        email: "alicia.rivera@example.com",
        preferredContactMethod: "both",
        clearanceStatus: "cleared",
        phones: [{ label: "Mobile", number: "(555) 013-4401" }],
      },
      {
        id: "member-rivera-marco",
        name: "Marco Rivera",
        email: "marco.rivera@example.com",
        preferredContactMethod: "phone",
        clearanceStatus: "pending",
        phones: [
          { label: "Mobile", number: "(555) 013-4402" },
          { label: "Work", number: "(555) 013-4403" },
        ],
      },
      {
        id: "member-rivera-elena",
        name: "Elena Rivera",
        email: "",
        preferredContactMethod: "phone",
        clearanceStatus: "not_started",
        phones: [{ label: "Mobile", number: "(555) 013-4404" }],
      },
    ],
    "family-chen": [
      {
        id: "member-chen-maya",
        name: "Maya Chen",
        email: "maya.chen@example.com",
        preferredContactMethod: "email",
        clearanceStatus: "cleared",
        phones: [{ label: "Mobile", number: "(555) 013-5501" }],
      },
      {
        id: "member-chen-david",
        name: "David Chen",
        email: "david.chen@example.com",
        preferredContactMethod: "both",
        clearanceStatus: "pending",
        phones: [{ label: "Mobile", number: "(555) 013-5502" }],
      },
    ],
    "family-patel": [
      {
        id: "member-patel-nisha",
        name: "Nisha Patel",
        email: "nisha.patel@example.com",
        preferredContactMethod: "both",
        clearanceStatus: "pending",
        phones: [{ label: "Mobile", number: "(555) 013-6601" }],
      },
      {
        id: "member-patel-arjun",
        name: "Arjun Patel",
        email: "arjun.patel@example.com",
        preferredContactMethod: "phone",
        clearanceStatus: "not_started",
        phones: [{ label: "Mobile", number: "(555) 013-6602" }],
      },
      {
        id: "member-patel-kavita",
        name: "Kavita Patel",
        email: "",
        preferredContactMethod: "phone",
        clearanceStatus: "not_started",
        phones: [{ label: "Mobile", number: "(555) 013-6603" }],
      },
    ],
  };

  return (
    fixtures[familyId] ?? [
      {
        id: `${familyId}-primary-member`,
        name: `${familyName} Primary Contact`,
        email: familyEmail,
        preferredContactMethod: "email" as ContactPreference,
        clearanceStatus: "not_started" as ClearanceStatus,
        phones: [],
      },
    ]
  );
}

export function publicAccount(row: AccountRow): Account {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    email: row.email,
    targetHours: Number(row.targetHours),
  };
}

export async function login(email: string, password: string) {
  const db = await ensurePortalData();
  const row = await db
    .prepare(
      `SELECT
        id,
        role,
        name,
        email,
        password_hash AS passwordHash,
        target_hours AS targetHours
       FROM accounts
       WHERE lower(email) = lower(?)`
    )
    .bind(email.trim())
    .first<AccountRow>();

  if (!row || row.passwordHash !== (await hashPassword(password))) {
    return null;
  }

  const token = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;

  await db
    .prepare(
      "INSERT INTO sessions (token, account_id, expires_at) VALUES (?, ?, ?)"
    )
    .bind(token, row.id, expiresAt)
    .run();

  return { account: publicAccount(row), token };
}

export async function logout(request: Request) {
  const db = await ensurePortalData();
  const token = parseCookies(request)[sessionCookieName];

  if (token) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
}

export async function getCurrentAccount(request: Request) {
  const db = await ensurePortalData();
  const token = parseCookies(request)[sessionCookieName];

  if (!token) {
    return null;
  }

  const row = await db
    .prepare(
      `SELECT
        accounts.id,
        accounts.role,
        accounts.name,
        accounts.email,
        accounts.target_hours AS targetHours
       FROM sessions
       JOIN accounts ON accounts.id = sessions.account_id
       WHERE sessions.token = ?
         AND sessions.expires_at > ?`
    )
    .bind(token, Math.floor(Date.now() / 1000))
    .first<AccountRow>();

  return row ? publicAccount(row) : null;
}

export async function requireAccount(request: Request) {
  const account = await getCurrentAccount(request);

  if (!account) {
    return { account: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { account, response: null };
}

export async function requireAdmin(request: Request) {
  const auth = await requireAccount(request);

  if (!auth.account) {
    return auth;
  }

  if (auth.account.role !== "admin") {
    return {
      account: auth.account,
      response: Response.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return { account: auth.account, response: null };
}

export async function requireFamily(request: Request) {
  const auth = await requireAccount(request);

  if (!auth.account) {
    return auth;
  }

  if (auth.account.role !== "family") {
    return {
      account: auth.account,
      response: Response.json({ error: "Family access required" }, { status: 403 }),
    };
  }

  return { account: auth.account, response: null };
}

export async function getPortalData(account: Account) {
  const db = await ensurePortalData();
  const rows = await db
    .prepare(
      `SELECT
        events.id AS eventId,
        events.title AS eventTitle,
        events.date AS eventDate,
        events.end_date AS eventEndDate,
        events.start_time AS eventStartTime,
        events.end_time AS eventEndTime,
        events.location AS eventLocation,
        events.cohort AS eventCohort,
        events.grade AS eventGrade,
        events.hours AS eventHours,
        events.description AS eventDescription,
        events.instructions AS eventInstructions,
        events.parking_info AS eventParkingInfo,
        events.cancellation_deadline_hours AS eventCancellationDeadlineHours,
        events.reminder_days_json AS eventReminderDaysJson,
        events.resource_links_json AS eventResourceLinksJson,
        events.private_notes AS eventPrivateNotes,
        events.status AS eventStatus,
        positions.id AS positionId,
        positions.title AS positionTitle,
        positions.description AS positionDescription,
        positions.hours_override AS positionHoursOverride,
        positions.requirements_json AS positionRequirementsJson,
        positions.clearance_required AS positionClearanceRequired,
        positions.adult_only AS positionAdultOnly,
        positions.training_required AS positionTrainingRequired,
        signups.id AS signupId,
        signups.family_id AS signupFamilyId,
        signups.status AS signupStatus,
        signups.claimed_at AS signupClaimedAt,
        signups.completed_at AS signupCompletedAt,
        signups.completion_requested_at AS signupCompletionRequestedAt,
        signups.checked_in_at AS signupCheckedInAt,
        signups.checked_out_at AS signupCheckedOutAt,
        signups.no_show_at AS signupNoShowAt,
        signups.swap_requested_at AS signupSwapRequestedAt,
        signups.swap_note AS signupSwapNote,
        families.name AS signupFamilyName
       FROM events
       LEFT JOIN positions ON positions.event_id = events.id
       LEFT JOIN signups ON signups.position_id = positions.id
       LEFT JOIN accounts families ON families.id = signups.family_id
       ORDER BY events.date ASC, events.start_time ASC, positions.title ASC`
    )
    .all();

  const eventsById = new Map<string, PortalEvent>();
  const positionsById = new Map<string, PortalPosition>();

  for (const row of (rows as D1Result<Record<string, unknown>>).results ?? []) {
    const eventId = String(row.eventId);
    const eventHours = Number(row.eventHours);
    const existing = eventsById.get(eventId);
    const event =
      existing ??
      ({
        id: eventId,
        title: String(row.eventTitle),
        date: String(row.eventDate),
        endDate: row.eventEndDate ? String(row.eventEndDate) : String(row.eventDate),
        startTime: String(row.eventStartTime),
        endTime: String(row.eventEndTime),
        location: String(row.eventLocation),
        cohort: normalizeCohort(String(row.eventCohort)) ?? "A",
        grade: normalizeGrade(String(row.eventGrade)) ?? "all",
        hours: eventHours,
        description: String(row.eventDescription ?? ""),
        instructions: String(row.eventInstructions ?? ""),
        parkingInfo: String(row.eventParkingInfo ?? ""),
        cancellationDeadlineHours: Number(row.eventCancellationDeadlineHours ?? 24),
        reminderDays: parseReminderDays(row.eventReminderDaysJson),
        resourceLinks: parseResourceLinks(row.eventResourceLinksJson),
        privateNotes: account.role === "admin" ? String(row.eventPrivateNotes ?? "") : "",
        status: row.eventStatus as "planned" | "cancelled",
        customFields: [],
        positions: [],
      } satisfies PortalEvent);

    if (!existing) {
      eventsById.set(eventId, event);
    }

    if (row.positionId) {
      const familyId = row.signupFamilyId ? String(row.signupFamilyId) : null;
      const isMine = familyId === account.id;

      const position = {
        id: String(row.positionId),
        title: String(row.positionTitle),
        description: String(row.positionDescription ?? ""),
        hours:
          row.positionHoursOverride === null ||
          typeof row.positionHoursOverride === "undefined"
            ? eventHours
            : Number(row.positionHoursOverride),
        requirements: parseStringArray(row.positionRequirementsJson),
        clearanceRequired: Number(row.positionClearanceRequired ?? 0) === 1,
        adultOnly: Number(row.positionAdultOnly ?? 0) === 1,
        trainingRequired: Number(row.positionTrainingRequired ?? 0) === 1,
        signup: row.signupId
          ? {
              id: String(row.signupId),
              familyId: String(familyId),
              familyName: String(row.signupFamilyName),
              status: row.signupStatus as "reserved" | "completed",
              claimedAt: String(row.signupClaimedAt),
              completedAt: row.signupCompletedAt
                ? String(row.signupCompletedAt)
                : null,
              completionRequestedAt: row.signupCompletionRequestedAt
                ? String(row.signupCompletionRequestedAt)
                : null,
              checkedInAt: row.signupCheckedInAt
                ? String(row.signupCheckedInAt)
                : null,
              checkedOutAt: row.signupCheckedOutAt
                ? String(row.signupCheckedOutAt)
                : null,
              noShowAt: row.signupNoShowAt ? String(row.signupNoShowAt) : null,
              swapRequestedAt: row.signupSwapRequestedAt
                ? String(row.signupSwapRequestedAt)
                : null,
              swapNote: String(row.signupSwapNote ?? ""),
              isMine,
            }
          : null,
        waitlist: [],
      } satisfies PortalPosition;

      event.positions.push(position);
      positionsById.set(position.id, position);
    }
  }

  const waitlistRows = await db
    .prepare(
      `SELECT
        waitlist_entries.id,
        waitlist_entries.position_id AS positionId,
        waitlist_entries.family_id AS familyId,
        waitlist_entries.status,
        waitlist_entries.requested_at AS requestedAt,
        accounts.name AS familyName
       FROM waitlist_entries
       JOIN accounts ON accounts.id = waitlist_entries.family_id
       WHERE waitlist_entries.status = 'active'
       ORDER BY waitlist_entries.requested_at ASC`
    )
    .all();

  for (const row of
    (waitlistRows as D1Result<Record<string, unknown>>).results ?? []) {
    const position = positionsById.get(String(row.positionId));

    if (!position) {
      continue;
    }

    position.waitlist.push({
      id: String(row.id),
      positionId: String(row.positionId),
      familyId: String(row.familyId),
      familyName: String(row.familyName),
      status: row.status as "active" | "promoted" | "cancelled",
      requestedAt: String(row.requestedAt),
      isMine: String(row.familyId) === account.id,
    });
  }

  const customFieldRows = await db
    .prepare(
      `SELECT
        id,
        event_id AS eventId,
        label,
        field_type AS fieldType,
        options_json AS optionsJson,
        value
       FROM event_custom_fields
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all();

  for (const row of
    (customFieldRows as D1Result<Record<string, unknown>>).results ?? []) {
    const event = eventsById.get(String(row.eventId));

    if (!event) {
      continue;
    }

    event.customFields.push({
      id: String(row.id),
      eventId: String(row.eventId),
      label: String(row.label),
      fieldType: normalizeCustomFieldType(String(row.fieldType)),
      options: parseCustomFieldOptions(row.optionsJson),
      value: String(row.value ?? ""),
    });
  }

  const familyRows = await db
    .prepare(
      `SELECT
        accounts.id,
        accounts.name,
        accounts.email,
        accounts.target_hours AS targetHours,
        accounts.student_name AS studentName,
        accounts.student_grade AS studentGrade,
        accounts.teacher_name AS teacherName,
        accounts.volunteer_interests_json AS volunteerInterestsJson,
        accounts.admin_notes AS adminNotes,
        COALESCE(SUM(
          CASE WHEN signups.status = 'reserved'
                 AND signups.no_show_at IS NULL
            THEN COALESCE(positions.hours_override, events.hours)
            ELSE 0
          END
        ), 0) AS reservedHours,
        COALESCE(SUM(
          CASE WHEN signups.status = 'completed'
            THEN COALESCE(positions.hours_override, events.hours)
            ELSE 0
          END
        ), 0) AS completedHours
       FROM accounts
       LEFT JOIN signups ON signups.family_id = accounts.id
       LEFT JOIN positions ON positions.id = signups.position_id
       LEFT JOIN events ON events.id = positions.event_id
       WHERE accounts.role = 'family'
       GROUP BY accounts.id
       ORDER BY accounts.name ASC`
    )
    .all();

  const memberRows = await db
    .prepare(
      `SELECT
        family_members.id AS memberId,
        family_members.family_id AS familyId,
        family_members.name AS memberName,
        family_members.email AS memberEmail,
        family_members.preferred_contact_method AS preferredContactMethod,
        family_members.clearance_status AS clearanceStatus,
        family_member_phones.id AS phoneId,
        family_member_phones.label AS phoneLabel,
        family_member_phones.phone_number AS phoneNumber
       FROM family_members
       LEFT JOIN family_member_phones
         ON family_member_phones.member_id = family_members.id
       ORDER BY family_members.created_at ASC,
                family_members.name ASC,
                family_member_phones.sort_order ASC`
    )
    .all();

  const membersByFamily = new Map<string, FamilyMember[]>();
  const membersById = new Map<string, FamilyMember>();

  for (const row of
    (memberRows as D1Result<Record<string, unknown>>).results ?? []) {
    const memberId = String(row.memberId);
    const familyId = String(row.familyId);
    let member = membersById.get(memberId);

    if (!member) {
      member = {
        id: memberId,
        familyId,
        name: String(row.memberName),
        email: String(row.memberEmail ?? ""),
        preferredContactMethod:
          row.preferredContactMethod === "phone" ||
          row.preferredContactMethod === "both"
            ? (row.preferredContactMethod as ContactPreference)
            : "email",
        clearanceStatus: normalizeClearanceStatus(String(row.clearanceStatus)),
        phones: [],
      };
      membersById.set(memberId, member);

      const familyMembers = membersByFamily.get(familyId) ?? [];
      familyMembers.push(member);
      membersByFamily.set(familyId, familyMembers);
    }

    if (row.phoneId) {
      member.phones.push({
        id: String(row.phoneId),
        label: String(row.phoneLabel ?? "Mobile"),
        number: String(row.phoneNumber),
      });
    }
  }

  const families = ((familyRows as D1Result<Record<string, unknown>>).results ?? [])
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      targetHours: Number(row.targetHours),
      studentName: String(row.studentName ?? ""),
      studentGrade: String(row.studentGrade ?? ""),
      teacherName: String(row.teacherName ?? ""),
      volunteerInterests: parseStringArray(row.volunteerInterestsJson),
      adminNotes: account.role === "admin" ? String(row.adminNotes ?? "") : "",
      reservedHours: Number(row.reservedHours),
      completedHours: Number(row.completedHours),
      members: membersByFamily.get(String(row.id)) ?? [],
    }))
    .filter((family) => account.role === "admin" || family.id === account.id);

  return {
    account,
    activePolicy: await getActivePolicyForAccount(db, account),
    events: Array.from(eventsById.values()),
    families,
  };
}

export async function createEventWithPositions(
  payload: unknown,
  admin: Account
) {
  const db = await ensurePortalData();
  const data = payload as EventPayload;

  const title = data.title?.trim() ?? "";
  const date = data.date?.trim() ?? "";
  const endDate = data.endDate?.trim() || date;
  const startTime = data.startTime?.trim() ?? "";
  const endTime = data.endTime?.trim() ?? "";
  const location = data.location?.trim() ?? "";
  const cohort = normalizeCohort(data.cohort?.trim());
  const grade = normalizeGrade(data.grade?.trim());
  const hours = Number(data.hours);
  const description = data.description?.trim() ?? "";
  const instructions = data.instructions?.trim() ?? "";
  const parkingInfo = data.parkingInfo?.trim() ?? "";
  const cancellationDeadlineHours = Math.max(
    0,
    Math.min(168, Number(data.cancellationDeadlineHours) || 24)
  );
  const reminderDays = normalizeReminderDays(data.reminderDays);
  const resourceLinks = normalizeResourceLinks(data.resourceLinks);
  const privateNotes = data.privateNotes?.trim() ?? "";
  const recurrenceFrequency =
    data.recurrenceFrequency === "weekly" ? "weekly" : "none";
  const recurrenceCount =
    recurrenceFrequency === "weekly"
      ? Math.max(1, Math.min(20, Number(data.recurrenceCount) || 1))
      : 1;
  const customFields = normalizeCustomFields(data.customFields);
  const positions =
    data.positions
      ?.map((position) => ({
        title: position.title?.trim() ?? "",
        description: position.description?.trim() ?? "",
        hours:
          typeof position.hours === "number" && Number.isFinite(position.hours)
            ? position.hours
            : null,
        requirements: normalizeStringList(position.requirements, 12),
        clearanceRequired: position.clearanceRequired === true,
        adultOnly: position.adultOnly === true,
        trainingRequired: position.trainingRequired === true,
      }))
      .filter((position) => position.title) ?? [];

  if (!title || !date || !startTime || !endTime || !location) {
    return Response.json(
      { error: "Event title, start date, time, and location are required." },
      { status: 400 }
    );
  }

  if (!isOrderedDateRange(date, endDate)) {
    return Response.json(
      { error: "End date must be the same as or after the start date." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    return Response.json(
      { error: "Event hours must be greater than zero." },
      { status: 400 }
    );
  }

  if (!cohort || !grade) {
    return Response.json(
      { error: "Select a cohort and grade for the event." },
      { status: 400 }
    );
  }

  if (positions.length === 0) {
    return Response.json(
      { error: "Add at least one volunteer position." },
      { status: 400 }
    );
  }

  if (customFields.length > 20) {
    return Response.json(
      { error: "Events can include up to 20 custom fields." },
      { status: 400 }
    );
  }

  if (resourceLinks.length > 12) {
    return Response.json(
      { error: "Events can include up to 12 resource links." },
      { status: 400 }
    );
  }

  if (customFields.some((field) => !field.label)) {
    return Response.json(
      { error: "Each custom field needs a field name." },
      { status: 400 }
    );
  }

  if (
    customFields.some(
      (field) =>
        (field.fieldType === "select" || field.fieldType === "multi_select") &&
        field.options.length === 0
    )
  ) {
    return Response.json(
      { error: "Dropdown and multi-select fields need at least one option." },
      { status: 400 }
    );
  }

  if (
    positions.some(
      (position) => position.hours !== null && position.hours <= 0
    )
  ) {
    return Response.json(
      { error: "Position hours must be greater than zero." },
      { status: 400 }
    );
  }

  const rangeLength = daysBetween(date, endDate);
  const statements: D1PreparedStatement[] = [];

  for (let recurrenceIndex = 0; recurrenceIndex < recurrenceCount; recurrenceIndex += 1) {
    const eventId = crypto.randomUUID();
    const offset = recurrenceFrequency === "weekly" ? recurrenceIndex * 7 : 0;
    const eventDate = addDays(date, offset);
    const eventEndDate = addDays(eventDate, rangeLength);

    statements.push(
      db
        .prepare(
          `INSERT INTO events
            (id, title, date, end_date, start_time, end_time, location, cohort, grade, hours, description, instructions, parking_info, cancellation_deadline_hours, reminder_days_json, resource_links_json, private_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          eventId,
          recurrenceCount > 1 ? `${title} ${recurrenceIndex + 1}` : title,
          eventDate,
          eventEndDate,
          startTime,
          endTime,
          location,
          cohort,
          grade,
          hours,
          description,
          instructions,
          parkingInfo,
          cancellationDeadlineHours,
          JSON.stringify(reminderDays),
          JSON.stringify(resourceLinks),
          privateNotes
        )
    );

    customFields.forEach((field, index) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO event_custom_fields
              (id, event_id, label, field_type, options_json, value, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            eventId,
            field.label,
            field.fieldType,
            JSON.stringify(field.options),
            field.value,
            index
          )
      );
    });

    positions.forEach((position) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO positions
              (id, event_id, title, description, hours_override, requirements_json, clearance_required, adult_only, training_required)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            eventId,
            position.title,
            position.description,
            position.hours === hours ? null : position.hours,
            JSON.stringify(position.requirements),
            position.clearanceRequired ? 1 : 0,
            position.adultOnly ? 1 : 0,
            position.trainingRequired ? 1 : 0
          )
      );
    });
  }

  await db.batch(statements);

  return Response.json(
    {
      data: await getPortalData(admin),
    },
    { status: 201 }
  );
}

export async function updateEventWithPositions(
  payload: unknown,
  admin: Account
) {
  const db = await ensurePortalData();
  const data = payload as EventPayload;
  const eventId = data.eventId?.trim() ?? "";
  const title = data.title?.trim() ?? "";
  const date = data.date?.trim() ?? "";
  const endDate = data.endDate?.trim() || date;
  const startTime = data.startTime?.trim() ?? "";
  const endTime = data.endTime?.trim() ?? "";
  const location = data.location?.trim() ?? "";
  const cohort = normalizeCohort(data.cohort?.trim());
  const grade = normalizeGrade(data.grade?.trim());
  const hours = Number(data.hours);
  const description = data.description?.trim() ?? "";
  const instructions = data.instructions?.trim() ?? "";
  const parkingInfo = data.parkingInfo?.trim() ?? "";
  const cancellationDeadlineHours = Math.max(
    0,
    Math.min(168, Number(data.cancellationDeadlineHours) || 24)
  );
  const reminderDays = normalizeReminderDays(data.reminderDays);
  const resourceLinks = normalizeResourceLinks(data.resourceLinks);
  const privateNotes = data.privateNotes?.trim() ?? "";
  const customFields = normalizeCustomFields(data.customFields);
  const positions =
    data.positions?.map((position) => ({
      id: position.id?.trim() || null,
      title: position.title?.trim() ?? "",
      description: position.description?.trim() ?? "",
      hours:
        typeof position.hours === "number" && Number.isFinite(position.hours)
          ? position.hours
          : null,
      requirements: normalizeStringList(position.requirements, 12),
      clearanceRequired: position.clearanceRequired === true,
      adultOnly: position.adultOnly === true,
      trainingRequired: position.trainingRequired === true,
    })) ?? [];

  if (!eventId) {
    return Response.json({ error: "Event is required." }, { status: 400 });
  }

  const existingEvent = await db
    .prepare("SELECT id FROM events WHERE id = ?")
    .bind(eventId)
    .first<{ id: string }>();

  if (!existingEvent) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  if (!title || !date || !startTime || !endTime || !location) {
    return Response.json(
      { error: "Event title, start date, time, and location are required." },
      { status: 400 }
    );
  }

  if (!isOrderedDateRange(date, endDate)) {
    return Response.json(
      { error: "End date must be the same as or after the start date." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    return Response.json(
      { error: "Event hours must be greater than zero." },
      { status: 400 }
    );
  }

  if (!cohort || !grade) {
    return Response.json(
      { error: "Select a cohort and grade for the event." },
      { status: 400 }
    );
  }

  if (positions.length === 0 || positions.some((position) => !position.title)) {
    return Response.json(
      { error: "Each event needs at least one named volunteer position." },
      { status: 400 }
    );
  }

  if (customFields.length > 20) {
    return Response.json(
      { error: "Events can include up to 20 custom fields." },
      { status: 400 }
    );
  }

  if (resourceLinks.length > 12) {
    return Response.json(
      { error: "Events can include up to 12 resource links." },
      { status: 400 }
    );
  }

  if (customFields.some((field) => !field.label)) {
    return Response.json(
      { error: "Each custom field needs a field name." },
      { status: 400 }
    );
  }

  if (
    customFields.some(
      (field) =>
        (field.fieldType === "select" || field.fieldType === "multi_select") &&
        field.options.length === 0
    )
  ) {
    return Response.json(
      { error: "Dropdown and multi-select fields need at least one option." },
      { status: 400 }
    );
  }

  if (
    positions.some(
      (position) => position.hours !== null && position.hours <= 0
    )
  ) {
    return Response.json(
      { error: "Position hours must be greater than zero." },
      { status: 400 }
    );
  }

  const existingPositionsResult = await db
    .prepare(
      `SELECT
        positions.id,
        CASE WHEN signups.id IS NULL THEN 0 ELSE 1 END AS hasSignup
       FROM positions
       LEFT JOIN signups ON signups.position_id = positions.id
       WHERE positions.event_id = ?`
    )
    .bind(eventId)
    .all();

  const existingPositions = new Map(
    ((existingPositionsResult as D1Result<Record<string, unknown>>).results ?? []).map(
      (position) => [
        String(position.id),
        {
          id: String(position.id),
          hasSignup: Number(position.hasSignup) === 1,
        },
      ]
    )
  );
  const submittedExistingIds = new Set(
    positions
      .map((position) => position.id)
      .filter((id): id is string => Boolean(id))
  );

  for (const id of submittedExistingIds) {
    if (!existingPositions.has(id)) {
      return Response.json(
        { error: "One of the positions does not belong to this event." },
        { status: 400 }
      );
    }
  }

  const blockedRemoval = Array.from(existingPositions.values()).find(
    (position) => position.hasSignup && !submittedExistingIds.has(position.id)
  );

  if (blockedRemoval) {
    return Response.json(
      { error: "Claimed positions cannot be removed from an event." },
      { status: 409 }
    );
  }

  const statements = [
    db
      .prepare(
        `UPDATE events
         SET title = ?,
             date = ?,
             end_date = ?,
             start_time = ?,
             end_time = ?,
             location = ?,
             cohort = ?,
             grade = ?,
             hours = ?,
             description = ?,
             instructions = ?,
             parking_info = ?,
             cancellation_deadline_hours = ?,
             reminder_days_json = ?,
             resource_links_json = ?,
             private_notes = ?
         WHERE id = ?`
      )
      .bind(
        title,
        date,
        endDate,
        startTime,
        endTime,
        location,
        cohort,
        grade,
        hours,
        description,
        instructions,
        parkingInfo,
        cancellationDeadlineHours,
        JSON.stringify(reminderDays),
        JSON.stringify(resourceLinks),
        privateNotes,
        eventId
      ),
    db
      .prepare("DELETE FROM event_custom_fields WHERE event_id = ?")
      .bind(eventId),
  ];

  for (const [index, field] of customFields.entries()) {
    statements.push(
      db
        .prepare(
          `INSERT INTO event_custom_fields
            (id, event_id, label, field_type, options_json, value, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          eventId,
          field.label,
          field.fieldType,
          JSON.stringify(field.options),
          field.value,
          index
        )
    );
  }

  for (const position of positions) {
    const positionHours =
      position.hours === null || position.hours === hours
        ? null
        : position.hours;

    if (position.id) {
      statements.push(
        db
          .prepare(
            `UPDATE positions
             SET title = ?,
                 description = ?,
                 hours_override = ?,
                 requirements_json = ?,
                 clearance_required = ?,
                 adult_only = ?,
                 training_required = ?
             WHERE id = ?
               AND event_id = ?`
          )
          .bind(
            position.title,
            position.description,
            positionHours,
            JSON.stringify(position.requirements),
            position.clearanceRequired ? 1 : 0,
            position.adultOnly ? 1 : 0,
            position.trainingRequired ? 1 : 0,
            position.id,
            eventId
          )
      );
    } else {
      statements.push(
        db
          .prepare(
            `INSERT INTO positions
              (id, event_id, title, description, hours_override, requirements_json, clearance_required, adult_only, training_required)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            eventId,
            position.title,
            position.description,
            positionHours,
            JSON.stringify(position.requirements),
            position.clearanceRequired ? 1 : 0,
            position.adultOnly ? 1 : 0,
            position.trainingRequired ? 1 : 0
          )
      );
    }
  }

  for (const existing of existingPositions.values()) {
    if (!submittedExistingIds.has(existing.id)) {
      statements.push(
        db
          .prepare("DELETE FROM positions WHERE id = ? AND event_id = ?")
          .bind(existing.id, eventId)
      );
    }
  }

  await db.batch(statements);

  return Response.json({ data: await getPortalData(admin) });
}

async function promoteNextWaitlistEntry(db: D1Database, positionId: string) {
  const next = await db
    .prepare(
      `SELECT id, family_id AS familyId
       FROM waitlist_entries
       WHERE position_id = ?
         AND status = 'active'
       ORDER BY requested_at ASC
       LIMIT 1`
    )
    .bind(positionId)
    .first<{ id: string; familyId: string }>();

  if (!next) {
    return;
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO signups
          (id, position_id, family_id, status)
         VALUES (?, ?, ?, 'reserved')`
      )
      .bind(crypto.randomUUID(), positionId, next.familyId),
    db
      .prepare(
        "UPDATE waitlist_entries SET status = 'promoted', resolved_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(next.id),
  ]);
}

export async function claimPosition(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const policyResponse = await requireCurrentPolicyAcknowledgement(db, family);

  if (policyResponse) {
    return policyResponse;
  }

  const positionId = (payload as { positionId?: string }).positionId?.trim();

  if (!positionId) {
    return Response.json({ error: "Position is required." }, { status: 400 });
  }

  const position = await db
    .prepare(
      `SELECT
        positions.id,
        positions.clearance_required AS clearanceRequired
       FROM positions
       WHERE positions.id = ?`
    )
    .bind(positionId)
    .first<{ id: string; clearanceRequired: number }>();

  if (!position) {
    return Response.json({ error: "Position not found." }, { status: 404 });
  }

  if (Number(position.clearanceRequired) === 1) {
    const cleared = await db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM family_members
         WHERE family_id = ?
           AND clearance_status = 'cleared'`
      )
      .bind(family.id)
      .first<{ count: number }>();

    if (!cleared || Number(cleared.count) === 0) {
      return Response.json(
        { error: "This position requires a cleared family member." },
        { status: 409 }
      );
    }
  }

  try {
    await db
      .prepare(
        `INSERT INTO signups
          (id, position_id, family_id, status)
         VALUES (?, ?, ?, 'reserved')`
      )
      .bind(crypto.randomUUID(), positionId, family.id)
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.includes("constraint")) {
      return Response.json(
        { error: "That position has already been claimed." },
        { status: 409 }
      );
    }

    throw error;
  }

  return Response.json({ data: await getPortalData(family) });
}

export async function joinWaitlist(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const policyResponse = await requireCurrentPolicyAcknowledgement(db, family);

  if (policyResponse) {
    return policyResponse;
  }

  const positionId = (payload as { positionId?: string }).positionId?.trim();

  if (!positionId) {
    return Response.json({ error: "Position is required." }, { status: 400 });
  }

  const position = await db
    .prepare(
      `SELECT
        positions.id,
        signups.family_id AS signupFamilyId
       FROM positions
       LEFT JOIN signups ON signups.position_id = positions.id
       WHERE positions.id = ?`
    )
    .bind(positionId)
    .first<{ id: string; signupFamilyId: string | null }>();

  if (!position) {
    return Response.json({ error: "Position not found." }, { status: 404 });
  }

  if (!position.signupFamilyId) {
    return Response.json(
      { error: "This position is open. Select it instead of joining the waitlist." },
      { status: 409 }
    );
  }

  if (position.signupFamilyId === family.id) {
    return Response.json(
      { error: "You are already signed up for this position." },
      { status: 409 }
    );
  }

  const existing = await db
    .prepare(
      `SELECT id
       FROM waitlist_entries
       WHERE position_id = ?
         AND family_id = ?
         AND status = 'active'`
    )
    .bind(positionId, family.id)
    .first<{ id: string }>();

  if (existing) {
    return Response.json({ data: await getPortalData(family) });
  }

  await db
    .prepare(
      `INSERT INTO waitlist_entries
        (id, position_id, family_id, status)
       VALUES (?, ?, ?, 'active')`
    )
    .bind(crypto.randomUUID(), positionId, family.id)
    .run();

  return Response.json({ data: await getPortalData(family) });
}

export async function leaveWaitlist(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const waitlistId = (payload as { waitlistId?: string }).waitlistId?.trim();

  if (!waitlistId) {
    return Response.json({ error: "Waitlist entry is required." }, { status: 400 });
  }

  await db
    .prepare(
      `UPDATE waitlist_entries
       SET status = 'cancelled',
           resolved_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND family_id = ?
         AND status = 'active'`
    )
    .bind(waitlistId, family.id)
    .run();

  return Response.json({ data: await getPortalData(family) });
}

export async function releaseSignup(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const signupId = (payload as { signupId?: string }).signupId?.trim();

  if (!signupId) {
    return Response.json({ error: "Signup is required." }, { status: 400 });
  }

  const signup = await db
    .prepare(
      `SELECT
        signups.id,
        signups.status,
        signups.position_id AS positionId,
        signups.completion_requested_at AS completionRequestedAt,
        events.date,
        events.start_time AS startTime,
        events.cancellation_deadline_hours AS cancellationDeadlineHours
       FROM signups
       JOIN positions ON positions.id = signups.position_id
       JOIN events ON events.id = positions.event_id
       WHERE signups.id = ?
         AND signups.family_id = ?`
    )
    .bind(signupId, family.id)
    .first<{
      id: string;
      status: string;
      positionId: string;
      completionRequestedAt: string | null;
      date: string;
      startTime: string;
      cancellationDeadlineHours: number;
    }>();

  if (!signup) {
    return Response.json({ error: "Signup not found." }, { status: 404 });
  }

  if (signup.status === "completed") {
    return Response.json(
      { error: "Completed hours cannot be released by the family." },
      { status: 409 }
    );
  }

  if (signup.completionRequestedAt) {
    return Response.json(
      { error: "Completed hours are already awaiting admin approval." },
      { status: 409 }
    );
  }

  if (
    isInsideCancellationWindow(
      signup.date,
      signup.startTime,
      Number(signup.cancellationDeadlineHours)
    )
  ) {
    return Response.json(
      {
        error:
          "This event is inside its cancellation window. Request a swap so an admin can help fill it.",
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM signups WHERE id = ?").bind(signupId).run();
  await promoteNextWaitlistEntry(db, signup.positionId);

  return Response.json({ data: await getPortalData(family) });
}

export async function requestSignupSwap(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const data = payload as { signupId?: string; note?: string };
  const signupId = data.signupId?.trim();
  const note =
    data.note?.trim() || "Family requested help finding a substitute.";

  if (!signupId) {
    return Response.json({ error: "Signup is required." }, { status: 400 });
  }

  const signup = await db
    .prepare(
      `SELECT id, status, completion_requested_at AS completionRequestedAt
       FROM signups
       WHERE id = ?
         AND family_id = ?`
    )
    .bind(signupId, family.id)
    .first<{ id: string; status: string; completionRequestedAt: string | null }>();

  if (!signup) {
    return Response.json({ error: "Signup not found." }, { status: 404 });
  }

  if (signup.status === "completed") {
    return Response.json(
      { error: "Completed hours cannot be swapped." },
      { status: 409 }
    );
  }

  if (signup.completionRequestedAt) {
    return Response.json(
      { error: "Completed hours are already awaiting admin approval." },
      { status: 409 }
    );
  }

  await db
    .prepare(
      `UPDATE signups
       SET swap_requested_at = CURRENT_TIMESTAMP,
           swap_note = ?
       WHERE id = ?`
    )
    .bind(note, signupId)
    .run();

  return Response.json({ data: await getPortalData(family) });
}

export async function requestSignupCompletion(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const signupId = (payload as { signupId?: string }).signupId?.trim();

  if (!signupId) {
    return Response.json({ error: "Signup is required." }, { status: 400 });
  }

  const signup = await db
    .prepare(
      `SELECT id, status, no_show_at AS noShowAt
       FROM signups
       WHERE id = ?
         AND family_id = ?`
    )
    .bind(signupId, family.id)
    .first<{ id: string; status: string; noShowAt: string | null }>();

  if (!signup) {
    return Response.json({ error: "Signup not found." }, { status: 404 });
  }

  if (signup.status === "completed") {
    return Response.json(
      { error: "These hours are already completed." },
      { status: 409 }
    );
  }

  if (signup.noShowAt) {
    return Response.json(
      { error: "This signup is marked no-show. Ask an admin to clear it first." },
      { status: 409 }
    );
  }

  await db
    .prepare(
      `UPDATE signups
       SET completion_requested_at = COALESCE(completion_requested_at, CURRENT_TIMESTAMP)
       WHERE id = ?`
    )
    .bind(signupId)
    .run();

  return Response.json({ data: await getPortalData(family) });
}

export async function updateFamilyAdminDetails(payload: unknown, admin: Account) {
  const db = await ensurePortalData();
  const data = payload as {
    familyId?: string;
    memberId?: string;
    clearanceStatus?: string;
    adminNotes?: string;
  };
  const familyId = data.familyId?.trim();

  if (!familyId) {
    return Response.json({ error: "Family is required." }, { status: 400 });
  }

  const family = await db
    .prepare("SELECT id FROM accounts WHERE id = ? AND role = 'family'")
    .bind(familyId)
    .first<{ id: string }>();

  if (!family) {
    return Response.json({ error: "Family not found." }, { status: 404 });
  }

  const statements: D1PreparedStatement[] = [];

  if (typeof data.adminNotes === "string") {
    statements.push(
      db
        .prepare("UPDATE accounts SET admin_notes = ? WHERE id = ?")
        .bind(data.adminNotes.trim(), familyId)
    );
  }

  if (data.memberId && data.clearanceStatus) {
    const clearanceStatus = normalizeClearanceStatus(data.clearanceStatus);
    statements.push(
      db
        .prepare(
          `UPDATE family_members
           SET clearance_status = ?
           WHERE id = ?
             AND family_id = ?`
        )
        .bind(clearanceStatus, data.memberId.trim(), familyId)
    );
  }

  if (statements.length === 0) {
    return Response.json({ error: "No family updates were provided." }, { status: 400 });
  }

  await db.batch(statements);

  return Response.json({ data: await getPortalData(admin) });
}

export async function publishVolunteerPolicy(payload: unknown, admin: Account) {
  const db = await ensurePortalData();
  const data = payload as VolunteerPolicyPayload;
  const title = data.title?.trim() ?? "";
  const body = data.body?.trim() ?? "";
  const attachmentName = data.attachmentName?.trim() ?? "";
  const attachmentDataUrl = data.attachmentDataUrl?.trim() ?? "";

  if (!title || (!body && !attachmentDataUrl)) {
    return Response.json(
      { error: "Policy title and either policy text or an attachment are required." },
      { status: 400 }
    );
  }

  if (attachmentDataUrl.length > 900_000) {
    return Response.json(
      { error: "Policy attachment is too large. Use policy text or a shared link for large PDFs." },
      { status: 400 }
    );
  }

  const policyId = crypto.randomUUID();

  await db.batch([
    db.prepare("UPDATE volunteer_policies SET is_active = 0 WHERE is_active = 1"),
    db
      .prepare(
        `INSERT INTO volunteer_policies
          (id, title, body, attachment_name, attachment_data_url, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      )
      .bind(policyId, title, body, attachmentName, attachmentDataUrl, admin.id),
  ]);

  return Response.json({ data: await getPortalData(admin) }, { status: 201 });
}

export async function acknowledgeVolunteerPolicy(
  payload: unknown,
  family: Account
) {
  const db = await ensurePortalData();
  const data = payload as { policyId?: string; signerName?: string };
  const policyId = data.policyId?.trim() ?? "";
  const signerName = data.signerName?.trim() ?? "";

  if (!policyId || !signerName) {
    return Response.json(
      { error: "Policy and signer name are required." },
      { status: 400 }
    );
  }

  const policy = await db
    .prepare("SELECT id FROM volunteer_policies WHERE id = ? AND is_active = 1")
    .bind(policyId)
    .first<{ id: string }>();

  if (!policy) {
    return Response.json(
      { error: "The active policy could not be found." },
      { status: 404 }
    );
  }

  const existing = await db
    .prepare(
      "SELECT id FROM policy_acknowledgements WHERE policy_id = ? AND family_id = ?"
    )
    .bind(policyId, family.id)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE policy_acknowledgements
         SET signer_name = ?,
             acknowledged_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(signerName, existing.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO policy_acknowledgements
          (id, policy_id, family_id, signer_name)
         VALUES (?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), policyId, family.id, signerName)
      .run();
  }

  return Response.json({ data: await getPortalData(family) });
}

export async function checkInPositionByQr(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const policyResponse = await requireCurrentPolicyAcknowledgement(db, family);

  if (policyResponse) {
    return policyResponse;
  }

  const positionId = (payload as { positionId?: string }).positionId?.trim();

  if (!positionId) {
    return Response.json({ error: "Position is required." }, { status: 400 });
  }

  const signup = await db
    .prepare(
      `SELECT signups.id, signups.status, signups.no_show_at AS noShowAt
       FROM signups
       WHERE signups.position_id = ?
         AND signups.family_id = ?`
    )
    .bind(positionId, family.id)
    .first<{ id: string; status: string; noShowAt: string | null }>();

  if (!signup) {
    return Response.json(
      { error: "This QR code is for a position your family has not selected." },
      { status: 404 }
    );
  }

  if (signup.status === "completed") {
    return Response.json({ data: await getPortalData(family) });
  }

  if (signup.noShowAt) {
    return Response.json(
      { error: "This signup is marked no-show. Ask an admin to clear it first." },
      { status: 409 }
    );
  }

  await db
    .prepare(
      `UPDATE signups
       SET checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP),
           no_show_at = NULL
       WHERE id = ?`
    )
    .bind(signup.id)
    .run();

  return Response.json({ data: await getPortalData(family) });
}

export async function updateFamilyProfile(payload: unknown, family: Account) {
  const db = await ensurePortalData();
  const data = payload as FamilyProfilePayload;
  const studentName = data.studentName?.trim() ?? "";
  const studentGrade = data.studentGrade?.trim() ?? "";
  const teacherName = data.teacherName?.trim() ?? "";
  const volunteerInterests = normalizeStringList(data.volunteerInterests, 20);
  const members =
    data.members
      ?.map((member) => {
        const preferredContactMethod =
          member.preferredContactMethod === "phone" ||
          member.preferredContactMethod === "both"
            ? member.preferredContactMethod
            : "email";
        const phones =
          member.phones
            ?.map((phone) => ({
              id: phone.id?.trim() || null,
              label: phone.label?.trim() || "Mobile",
              number: phone.number?.trim() ?? "",
            }))
            .filter((phone) => phone.number) ?? [];

        return {
          id: member.id?.trim() || null,
          name: member.name?.trim() ?? "",
          email: member.email?.trim() ?? "",
          preferredContactMethod,
          phones,
        };
      })
      .filter(
        (member) => member.name || member.email || member.phones.length > 0
      ) ?? [];

  if (members.length === 0) {
    return Response.json(
      { error: "Add at least one family member." },
      { status: 400 }
    );
  }

  if (members.length > 8) {
    return Response.json(
      { error: "A family profile can include up to 8 people." },
      { status: 400 }
    );
  }

  for (const member of members) {
    if (!member.name) {
      return Response.json(
        { error: "Each family member needs a name." },
        { status: 400 }
      );
    }

    if (
      (member.preferredContactMethod === "email" ||
        member.preferredContactMethod === "both") &&
      !member.email
    ) {
      return Response.json(
        { error: `${member.name} needs an email for that contact preference.` },
        { status: 400 }
      );
    }

    if (
      (member.preferredContactMethod === "phone" ||
        member.preferredContactMethod === "both") &&
      member.phones.length === 0
    ) {
      return Response.json(
        {
          error: `${member.name} needs at least one phone number for that contact preference.`,
        },
        { status: 400 }
      );
    }

    if (member.phones.length > 4) {
      return Response.json(
        { error: `${member.name} can have up to 4 phone numbers.` },
        { status: 400 }
      );
    }
  }

  const existingRows = await db
    .prepare("SELECT id FROM family_members WHERE family_id = ?")
    .bind(family.id)
    .all();
  const existingIds = new Set(
    ((existingRows as D1Result<Record<string, unknown>>).results ?? []).map((row) =>
      String(row.id)
    )
  );
  const submittedIds = new Set(
    members.map((member) => member.id).filter((id): id is string => Boolean(id))
  );

  for (const id of submittedIds) {
    if (!existingIds.has(id)) {
      return Response.json(
        { error: "One of the family members does not belong to this account." },
        { status: 400 }
      );
    }
  }

  const statements: D1PreparedStatement[] = [];

  statements.push(
    db
      .prepare(
        `UPDATE accounts
         SET student_name = ?,
             student_grade = ?,
             teacher_name = ?,
             volunteer_interests_json = ?
         WHERE id = ?`
      )
      .bind(
        studentName,
        studentGrade,
        teacherName,
        JSON.stringify(volunteerInterests),
        family.id
      )
  );

  for (const existingId of existingIds) {
    if (!submittedIds.has(existingId)) {
      statements.push(
        db
          .prepare("DELETE FROM family_member_phones WHERE member_id = ?")
          .bind(existingId),
        db
          .prepare("DELETE FROM family_members WHERE id = ? AND family_id = ?")
          .bind(existingId, family.id)
      );
    }
  }

  for (const member of members) {
    const memberId = member.id ?? crypto.randomUUID();

    if (member.id) {
      statements.push(
        db
          .prepare(
            `UPDATE family_members
             SET name = ?,
                 email = ?,
                 preferred_contact_method = ?
             WHERE id = ?
               AND family_id = ?`
          )
          .bind(
            member.name,
            member.email,
            member.preferredContactMethod,
            member.id,
            family.id
          )
      );
    } else {
      statements.push(
        db
          .prepare(
            `INSERT INTO family_members
              (id, family_id, name, email, preferred_contact_method, clearance_status)
             VALUES (?, ?, ?, ?, ?, 'not_started')`
          )
          .bind(
            memberId,
            family.id,
            member.name,
            member.email,
            member.preferredContactMethod
          )
      );
    }

    statements.push(
      db
        .prepare("DELETE FROM family_member_phones WHERE member_id = ?")
        .bind(memberId)
    );

    member.phones.forEach((phone, phoneIndex) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO family_member_phones
              (id, member_id, label, phone_number, sort_order)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(
            phone.id ?? crypto.randomUUID(),
            memberId,
            phone.label,
            phone.number,
            phoneIndex
          )
      );
    });
  }

  await db.batch(statements);

  return Response.json({ data: await getPortalData(family) });
}

export async function updateSignupStatus(payload: unknown, admin: Account) {
  const db = await ensurePortalData();
  const data = payload as { signupId?: string; status?: string; action?: string };
  const signupId = data.signupId?.trim();
  const status = data.status?.trim();
  const action = data.action?.trim();

  if (
    !signupId ||
    (!action && status !== "reserved" && status !== "completed")
  ) {
    return Response.json(
      { error: "Signup and status are required." },
      { status: 400 }
    );
  }

  const signup = await db
    .prepare("SELECT id FROM signups WHERE id = ?")
    .bind(signupId)
    .first<{ id: string }>();

  if (!signup) {
    return Response.json({ error: "Signup not found." }, { status: 404 });
  }

  if (action === "check_in") {
    await db
      .prepare(
        `UPDATE signups
         SET checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP),
             no_show_at = NULL
         WHERE id = ?`
      )
      .bind(signupId)
      .run();

    return Response.json({ data: await getPortalData(admin) });
  }

  if (action === "check_out") {
    await db
      .prepare(
        `UPDATE signups
         SET checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP),
             checked_out_at = CURRENT_TIMESTAMP,
             no_show_at = NULL
         WHERE id = ?`
      )
      .bind(signupId)
      .run();

    return Response.json({ data: await getPortalData(admin) });
  }

  if (action === "no_show") {
    await db
      .prepare(
        `UPDATE signups
         SET no_show_at = CURRENT_TIMESTAMP,
             completed_at = NULL,
             completion_requested_at = NULL,
             status = 'reserved'
         WHERE id = ?`
      )
      .bind(signupId)
      .run();

    return Response.json({ data: await getPortalData(admin) });
  }

  if (action === "clear_no_show") {
    await db
      .prepare("UPDATE signups SET no_show_at = NULL WHERE id = ?")
      .bind(signupId)
      .run();

    return Response.json({ data: await getPortalData(admin) });
  }

  if (action === "resolve_swap") {
    await db
      .prepare(
        "UPDATE signups SET swap_requested_at = NULL, swap_note = '' WHERE id = ?"
      )
      .bind(signupId)
      .run();

    return Response.json({ data: await getPortalData(admin) });
  }

  if (status === "completed") {
    await db
      .prepare(
        `UPDATE signups
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             completion_requested_at = NULL,
             checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP),
             checked_out_at = COALESCE(checked_out_at, CURRENT_TIMESTAMP),
             no_show_at = NULL,
             swap_requested_at = NULL,
             swap_note = ''
         WHERE id = ?`
      )
      .bind(signupId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE signups
         SET status = 'reserved',
             completed_at = NULL,
             completion_requested_at = NULL
         WHERE id = ?`
      )
      .bind(signupId)
      .run();
  }

  return Response.json({ data: await getPortalData(admin) });
}
