"use client";

/* eslint-disable @next/next/no-img-element */
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Account,
  ClearanceStatus,
  ContactPreference,
  CustomFieldType,
  EventCohort,
  EventGrade,
  FamilyMember,
  FamilySummary,
  PortalEvent,
  VolunteerPolicy,
} from "@/lib/portal";

type PortalData = {
  account: Account;
  activePolicy: VolunteerPolicy | null;
  events: PortalEvent[];
  families: FamilySummary[];
};

type AdminSummaryView =
  | "open"
  | "families"
  | "pending"
  | "completed"
  | "waitlist"
  | "swaps";
type FamilySummaryView =
  | "open"
  | "remaining"
  | "pending"
  | "completed"
  | "waitlist"
  | "all";

type DraftPosition = {
  id?: string;
  title: string;
  description: string;
  hours: string;
  requirements: string;
  clearanceRequired: boolean;
  adultOnly: boolean;
  trainingRequired: boolean;
};

type DraftCustomField = {
  id?: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  value: string;
};

type DraftResourceLink = {
  title: string;
  url: string;
};

type EventDraft = {
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  cohort: EventCohort;
  grade: EventGrade;
  hours: string;
  description: string;
  instructions: string;
  parkingInfo: string;
  cancellationDeadlineHours: string;
  reminderDays: string;
  privateNotes: string;
  resourceLinks: DraftResourceLink[];
  recurrenceFrequency: "none" | "weekly";
  recurrenceCount: string;
  customFields: DraftCustomField[];
  positions: DraftPosition[];
};

type PhoneDraft = {
  id?: string;
  label: string;
  number: string;
};

type MemberDraft = {
  id?: string;
  name: string;
  email: string;
  preferredContactMethod: ContactPreference;
  phones: PhoneDraft[];
};

type AdminSignupUpdate = {
  status?: "reserved" | "completed";
  action?:
    | "check_in"
    | "check_out"
    | "no_show"
    | "clear_no_show"
    | "resolve_swap";
};

type BoardFilters = {
  search: string;
  cohort: EventCohort | "any";
  grade: EventGrade | "any";
  availability: "all" | "open" | "filled" | "requires_clearance";
};

const cohortOptions: Array<{ value: EventCohort; label: string }> = [
  { value: "all", label: "All Cohorts" },
  { value: "A", label: "Cohort A" },
  { value: "B", label: "Cohort B" },
  { value: "C", label: "Cohort C" },
];

const gradeOptions: Array<{ value: EventGrade; label: string }> = [
  { value: "all", label: "All grades" },
  { value: "jk", label: "JK (Junior Kinder)" },
  { value: "k", label: "K" },
  { value: "1st", label: "1st" },
  { value: "2nd", label: "2nd" },
  { value: "3rd", label: "3rd" },
  { value: "4th", label: "4th" },
  { value: "5th", label: "5th" },
  { value: "6th", label: "6th" },
  { value: "7th", label: "7th" },
  { value: "8th", label: "8th" },
  { value: "9th", label: "9th" },
  { value: "10th", label: "10th" },
  { value: "11th", label: "11th" },
  { value: "12th", label: "12th" },
];

const customFieldTypeOptions: Array<{ value: CustomFieldType; label: string }> = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "url", label: "Website link" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "multi_select", label: "Multi-select" },
];

const initialDraft: EventDraft = {
  title: "",
  date: "2026-09-18",
  endDate: "2026-09-18",
  startTime: "08:00",
  endTime: "10:00",
  location: "",
  cohort: "all",
  grade: "all",
  hours: "2",
  description: "",
  instructions: "",
  parkingInfo: "",
  cancellationDeadlineHours: "24",
  reminderDays: "7, 3, 1",
  privateNotes: "",
  resourceLinks: [],
  recurrenceFrequency: "none",
  recurrenceCount: "1",
  customFields: [],
  positions: [
    {
      title: "Position 1",
      description: "",
      hours: "2",
      requirements: "",
      clearanceRequired: false,
      adultOnly: false,
      trainingRequired: false,
    },
  ],
};

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function cohortLabel(cohort: EventCohort) {
  return cohortOptions.find((option) => option.value === cohort)?.label ?? cohort;
}

function gradeLabel(grade: EventGrade) {
  return gradeOptions.find((option) => option.value === grade)?.label ?? grade;
}

function blankCustomField(): DraftCustomField {
  return {
    label: "",
    fieldType: "text",
    options: [],
    value: "",
  };
}

function customFieldUsesOptions(fieldType: CustomFieldType) {
  return fieldType === "select" || fieldType === "multi_select";
}

function parseMultiSelectValue(value: string) {
  if (!value) {
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

function customFieldDisplayValue(field: PortalEvent["customFields"][number]) {
  if (field.fieldType === "checkbox") {
    return field.value === "true" ? "Yes" : "No";
  }

  if (field.fieldType === "multi_select") {
    const values = parseMultiSelectValue(field.value);
    return values.length > 0 ? values.join(", ") : "-";
  }

  return field.value || "-";
}

function draftHoursValue(value: string, fallback = 0) {
  const hours = Number(value);
  return Number.isFinite(hours) ? hours : fallback;
}

function draftPositionHours(position: DraftPosition, defaultHours: string) {
  return draftHoursValue(position.hours || defaultHours);
}

function parseDraftList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDraftReminderDays(value: string) {
  return parseDraftList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 90);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatDateRange(startDate: string, endDate: string) {
  return startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatTime(time: string) {
  const [hourValue, minute] = time.split(":").map(Number);
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function collectPositions(events: PortalEvent[]) {
  return events.flatMap((event) =>
    event.positions.map((position) => ({ event, position }))
  );
}

function signedUpFamilyNames(event: PortalEvent) {
  return Array.from(
    new Set(
      event.positions
        .map((position) => position.signup?.familyName)
        .filter((familyName): familyName is string => Boolean(familyName))
    )
  );
}

function waitlistedFamilyNames(position: PortalEvent["positions"][number]) {
  return position.waitlist
    .map((entry) => entry.familyName)
    .filter((familyName): familyName is string => Boolean(familyName));
}

function signupDisplayStatus(signup: PortalEvent["positions"][number]["signup"]) {
  if (!signup) {
    return "open" as const;
  }

  if (signup.noShowAt) {
    return "no_show" as const;
  }

  if (signup.status === "completed") {
    return "completed" as const;
  }

  if (signup.swapRequestedAt) {
    return "swap" as const;
  }

  if (signup.checkedOutAt) {
    return "checked_out" as const;
  }

  if (signup.checkedInAt) {
    return "checked_in" as const;
  }

  return "reserved" as const;
}

function filterEventsByPosition(
  events: PortalEvent[],
  predicate: (position: PortalEvent["positions"][number]) => boolean
) {
  return events
    .map((event) => ({
      ...event,
      positions: event.positions.filter(predicate),
    }))
    .filter((event) => event.positions.length > 0);
}

function filterEvents(
  events: PortalEvent[],
  filters: BoardFilters,
  family?: FamilySummary
) {
  const query = filters.search.trim().toLowerCase();

  return events
    .filter((event) => filters.cohort === "any" || event.cohort === filters.cohort)
    .filter((event) => filters.grade === "any" || event.grade === filters.grade)
    .map((event) => ({
      ...event,
      positions: event.positions.filter((position) => {
        const text = [
          event.title,
          event.description,
          event.location,
          event.instructions,
          event.parkingInfo,
          position.title,
          position.description,
          position.requirements.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        const matchesSearch = !query || text.includes(query);
        const matchesAvailability =
          filters.availability === "all" ||
          (filters.availability === "open" && !position.signup) ||
          (filters.availability === "filled" && Boolean(position.signup)) ||
          (filters.availability === "requires_clearance" &&
            position.clearanceRequired);
        const hasClearedMember =
          !family ||
          family.members.some((member) => member.clearanceStatus === "cleared");

        return (
          matchesSearch &&
          matchesAvailability &&
          (!position.clearanceRequired || hasClearedMember || Boolean(position.signup))
        );
      }),
    }))
    .filter((event) => event.positions.length > 0);
}

function eventToDraft(event: PortalEvent): EventDraft {
  return {
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    cohort: event.cohort,
    grade: event.grade,
    hours: String(event.hours),
    description: event.description,
    instructions: event.instructions,
    parkingInfo: event.parkingInfo,
    cancellationDeadlineHours: String(event.cancellationDeadlineHours),
    reminderDays: event.reminderDays.join(", "),
    privateNotes: event.privateNotes,
    resourceLinks: event.resourceLinks.map((link) => ({ ...link })),
    recurrenceFrequency: "none",
    recurrenceCount: "1",
    customFields: event.customFields.map((field) => ({
      id: field.id,
      label: field.label,
      fieldType: field.fieldType,
      options: field.options,
      value: field.value,
    })),
    positions: event.positions.map((position) => ({
      id: position.id,
      title: position.title,
      description: position.description,
      hours: String(position.hours),
      requirements: position.requirements.join(", "),
      clearanceRequired: position.clearanceRequired,
      adultOnly: position.adultOnly,
      trainingRequired: position.trainingRequired,
    })),
  };
}

function memberToDraft(member: FamilyMember): MemberDraft {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    preferredContactMethod: member.preferredContactMethod,
    phones:
      member.phones.length > 0
        ? member.phones.map((phone) => ({
            id: phone.id,
            label: phone.label,
            number: phone.number,
          }))
        : [{ label: "Mobile", number: "" }],
  };
}

function blankMemberDraft(): MemberDraft {
  return {
    name: "",
    email: "",
    preferredContactMethod: "email",
    phones: [{ label: "Mobile", number: "" }],
  };
}

function contactPreferenceLabel(preference: ContactPreference) {
  const labels = {
    email: "Email",
    phone: "Phone",
    both: "Email and phone",
  };

  return labels[preference];
}

function clearanceLabel(status: ClearanceStatus) {
  const labels = {
    not_started: "Not started",
    pending: "Pending",
    cleared: "Cleared",
  };

  return labels[status];
}

function familyEmails(family: FamilySummary) {
  const emails = [
    family.email,
    ...family.members.map((member) => member.email),
  ].filter(Boolean);

  return Array.from(new Set(emails));
}

function familyPhones(family: FamilySummary) {
  return family.members.flatMap((member) =>
    member.phones.map((phone) => `${member.name} ${phone.label}: ${phone.number}`)
  );
}

function eventFamilies(event: PortalEvent, families: FamilySummary[]) {
  const ids = new Set(
    event.positions
      .map((position) => position.signup?.familyId)
      .filter((familyId): familyId is string => Boolean(familyId))
  );

  return families.filter((family) => ids.has(family.id));
}

function buildMailto(emails: string[], subject: string, body: string) {
  return `mailto:${emails.join(",")}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildFamilyHoursRows(families: FamilySummary[]) {
  return [
    [
      "Family",
      "Email",
      "Student",
      "Grade",
      "Teacher",
      "Signed off",
      "Pending",
      "Remaining",
      "Interests",
    ],
    ...families.map((family) => [
      family.name,
      family.email,
      family.studentName,
      gradeLabel((family.studentGrade || "all") as EventGrade),
      family.teacherName,
      formatHours(family.completedHours),
      formatHours(family.reservedHours),
      formatHours(Math.max(family.targetHours - family.completedHours, 0)),
      family.volunteerInterests.join("; "),
    ]),
  ];
}

function buildRosterRows(events: PortalEvent[]) {
  return [
    [
      "Event",
      "Date",
      "Position",
      "Hours",
      "Family",
      "Status",
      "Checked in",
      "Checked out",
      "Waitlist",
    ],
    ...collectPositions(events).map(({ event, position }) => [
      event.title,
      formatDateRange(event.date, event.endDate),
      position.title,
      formatHours(position.hours),
      position.signup?.familyName ?? "",
      position.signup ? signupDisplayStatus(position.signup) : "open",
      formatTimestamp(position.signup?.checkedInAt ?? null),
      formatTimestamp(position.signup?.checkedOutAt ?? null),
      waitlistedFamilyNames(position).join("; "),
    ]),
  ];
}

function calendarHref(event: PortalEvent, position?: PortalEvent["positions"][number]) {
  const start = `${event.date.replaceAll("-", "")}T${event.startTime.replace(
    ":",
    ""
  )}00`;
  const end = `${event.endDate.replaceAll("-", "")}T${event.endTime.replace(
    ":",
    ""
  )}00`;
  const title = position ? `${event.title}: ${position.title}` : event.title;
  const description = [
    event.description,
    position?.description,
    event.instructions,
    event.parkingInfo,
  ]
    .filter(Boolean)
    .join("\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Parnassus Volunteer Portal//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}-${position?.id ?? "event"}@parnassus-volunteer`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function requirementLabels(position: PortalEvent["positions"][number]) {
  return [
    ...position.requirements,
    position.clearanceRequired ? "Background clearance required" : "",
    position.adultOnly ? "Adult only" : "",
    position.trainingRequired ? "Training required" : "",
  ].filter(Boolean);
}

function checkInUrl(origin: string, positionId: string) {
  return origin ? `${origin}/?checkin=${encodeURIComponent(positionId)}` : "";
}

function qrCodeImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
    value
  )}`;
}

function formatPhoneList(phones: FamilyMember["phones"]) {
  if (phones.length === 0) {
    return "No phone listed";
  }

  return phones.map((phone) => `${phone.label}: ${phone.number}`).join(" · ");
}

export default function Home() {
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin
  );
  const processedCheckInRef = useRef<string | null>(null);

  async function loadPortal() {
    const response = await fetch("/api/portal", { cache: "no-store" });

    if (response.status === 401) {
      setPortal(null);
      setInitializing(false);
      return;
    }

    const data = (await response.json()) as PortalData | { error?: string };

    if (!response.ok) {
      setMessage("The portal could not load.");
      setPortal(null);
      setInitializing(false);
      return;
    }

    setPortal(data as PortalData);
    setMessage(null);
    setInitializing(false);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function initializePortal() {
      const response = await fetch("/api/portal", {
        cache: "no-store",
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (response.status === 401) {
        setPortal(null);
        setInitializing(false);
        return;
      }

      const data = (await response.json()) as PortalData | { error?: string };

      if (!response.ok) {
        setMessage("The portal could not load.");
        setPortal(null);
        setInitializing(false);
        return;
      }

      setPortal(data as PortalData);
      setMessage(null);
      setInitializing(false);
    }

    void initializePortal().catch((error) => {
      if (!controller.signal.aborted && error instanceof Error) {
        setMessage("The portal could not load.");
        setPortal(null);
        setInitializing(false);
      }
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!portal || portal.account.role !== "family") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const positionId = params.get("checkin");

    if (!positionId || processedCheckInRef.current === positionId) {
      return;
    }

    processedCheckInRef.current = positionId;

    void (async () => {
      await Promise.resolve();
      setBusy(true);
      setMessage(null);

      return fetch("/api/family/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId }),
      });
    })()
      .then(async (response) => {
        const data = (await response.json()) as {
          data?: PortalData;
          error?: string;
        };

        if (!response.ok || !data.data) {
          setMessage(data.error ?? "QR check-in could not be completed.");
        } else {
          setPortal(data.data);
          setMessage("QR check-in complete.");
          params.delete("checkin");
          const nextQuery = params.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
          );
        }
      })
      .catch(() => setMessage("QR check-in could not be completed."))
      .finally(() => setBusy(false));
  }, [portal]);

  async function handleLogout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setPortal(null);
    setBusy(false);
  }

  if (initializing) {
    return (
      <main className="grid min-h-screen place-items-center bg-white px-5 text-[#17345f]">
        <div className="h-10 w-10 animate-pulse rounded-md bg-[#183058]" />
      </main>
    );
  }

  if (!portal) {
    return (
      <LoginScreen
        busy={busy}
        message={message}
        onBusyChange={setBusy}
        onMessageChange={setMessage}
        onSignedIn={loadPortal}
      />
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#14233d]">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center border border-[#e2c15a] bg-white p-1">
              <img
                alt="Parnassus Preparatory Academy crest"
                className="h-12 w-auto object-contain"
                src="/parnassus-crest.png"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#b58b00]">
                Parnassus Preparatory Academy
              </p>
              <h1 className="text-2xl font-bold text-[#17345f]">
                Volunteer Portal
              </h1>
              <p className="text-sm text-[#6f664f]">
                {portal.account.name} · {portal.account.role}
              </p>
            </div>
          </div>
          <button
            className="rounded-md border border-[#ccb987] px-4 py-2 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
            disabled={busy}
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>

      {message ? (
        <div className="mx-auto mt-5 max-w-7xl px-5">
          <div className="rounded-lg border border-[#d8a828] bg-[#fff8e4] px-4 py-3 text-sm text-[#7a4d00]">
            {message}
          </div>
        </div>
      ) : null}

      {portal.account.role === "admin" ? (
        <AdminPortal
          busy={busy}
          onBusyChange={setBusy}
          onMessageChange={setMessage}
          origin={origin}
          portal={portal}
          setPortal={setPortal}
        />
      ) : (
        <FamilyPortal
          busy={busy}
          onBusyChange={setBusy}
          onMessageChange={setMessage}
          origin={origin}
          portal={portal}
          setPortal={setPortal}
        />
      )}
    </main>
  );
}

function LoginScreen({
  busy,
  message,
  onBusyChange,
  onMessageChange,
  onSignedIn,
}: {
  busy: boolean;
  message: string | null;
  onBusyChange: (busy: boolean) => void;
  onMessageChange: (message: string | null) => void;
  onSignedIn: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      onMessageChange(data.error ?? "Sign in failed.");
      onBusyChange(false);
      return;
    }

    await onSignedIn();
    onBusyChange(false);
  }

  return (
    <main className="min-h-screen bg-white text-[#242424]">
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-20 text-center">
        <p className="text-base font-normal uppercase text-[#2b2b2b]">
          Click the box below to record your hours
        </p>
        <a
          className="mt-1 inline-flex min-h-16 items-center justify-center bg-[#f0f0f0] px-4 text-center text-3xl font-extrabold uppercase text-[#17345f] transition hover:bg-[#e8e8e8] sm:px-7 sm:text-4xl"
          href="#portal-sign-in"
        >
          Record Volunteer Hours
        </a>

        <h1 className="mt-10 text-3xl font-normal uppercase text-black">
          Volunteering Opportunities
        </h1>
        <h2 className="mt-7 text-xl font-extrabold uppercase text-black">
          Get Involved - Volunteer!
        </h2>
        <p className="mx-auto mt-4 max-w-6xl text-base leading-7 text-[#2f2f2f] sm:text-lg">
          When adults volunteer, all students benefit! There are many
          opportunities for parents and community members to get involved! Your
          help is needed!
        </p>
      </section>

      <section className="border-t border-[#e5e5e5] px-5 py-7 text-center">
        <h2 className="text-3xl font-extrabold uppercase text-[#333333]">
          Events
        </h2>
        <div className="mx-auto mt-10 max-w-lg">
          <h3 className="text-2xl font-extrabold text-black">
            Volunteer Portal
          </h3>
          <a
            className="mx-auto mt-5 flex h-24 w-72 max-w-full flex-col items-center justify-center rounded-2xl border-4 border-[#d4a600] bg-[#0d4474] px-5 text-white shadow-sm transition hover:bg-[#0a3760]"
            href="#portal-sign-in"
          >
            <span className="text-xl uppercase leading-6">Click Here To</span>
            <span className="font-serif text-4xl italic leading-10">
              Volunteer
            </span>
          </a>
        </div>
      </section>

      <section
        className="mx-auto grid max-w-6xl scroll-mt-6 gap-8 px-5 py-10 lg:grid-cols-[1fr_420px]"
        id="portal-sign-in"
      >
        <div className="self-center text-center lg:text-left">
          <p className="text-sm font-bold uppercase tracking-wide text-[#b58b00]">
            Parnassus Preparatory Academy
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-[#17345f]">
            Volunteer Portal Sign In
          </h2>
          <p className="mt-3 text-base leading-7 text-[#3f3f3f]">
            Select opportunities, track pending hours, and view signed-off hours
            toward your family volunteer goal.
          </p>
        </div>

        <form
          className="rounded-lg border border-[#dedede] bg-white p-6 shadow-sm"
          onSubmit={handleLogin}
        >
          <div className="mb-6 text-center">
            <img
              alt="Parnassus Preparatory Academy crest"
              className="mx-auto h-24 w-auto object-contain"
              src="/parnassus-crest.png"
            />
            <p className="mt-4 text-sm font-bold uppercase text-[#b58b00]">
              Family and School Access
            </p>
          </div>

          <label className="block text-sm font-bold text-[#17345f]">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-[#cfcfcf] px-3 py-2 text-base outline-none transition focus:border-[#17345f] focus:ring-2 focus:ring-[#d4a600]"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="mt-4 block text-sm font-bold text-[#17345f]">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-[#cfcfcf] px-3 py-2 text-base outline-none transition focus:border-[#17345f] focus:ring-2 focus:ring-[#d4a600]"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {message ? (
            <div className="mt-4 rounded-md border border-[#d4a600] bg-[#fff8e1] px-3 py-2 text-sm text-[#6b4d00]">
              {message}
            </div>
          ) : null}
          <button
            className="mt-5 w-full rounded-md border-2 border-[#d4a600] bg-[#0d4474] px-4 py-3 text-sm font-extrabold uppercase text-white transition hover:bg-[#0a3760] disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}

function AdminPortal({
  busy,
  onBusyChange,
  onMessageChange,
  origin,
  portal,
  setPortal,
}: {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessageChange: (message: string | null) => void;
  origin: string;
  portal: PortalData;
  setPortal: (portal: PortalData) => void;
}) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [summaryView, setSummaryView] = useState<AdminSummaryView>("open");
  const [filters, setFilters] = useState<BoardFilters>({
    search: "",
    cohort: "any",
    grade: "any",
    availability: "all",
  });
  const positions = useMemo(() => collectPositions(portal.events), [portal.events]);
  const editingEvent =
    portal.events.find((event) => event.id === editingEventId) ?? null;
  const openPositions = positions.filter(({ position }) => !position.signup);
  const reservedPositions = positions.filter(
    ({ position }) => position.signup?.status === "reserved"
  );
  const completedPositions = positions.filter(
    ({ position }) => position.signup?.status === "completed"
  );
  const waitlistPositions = positions.filter(
    ({ position }) => position.waitlist.length > 0
  );
  const swapPositions = positions.filter(
    ({ position }) => position.signup?.swapRequestedAt
  );
  const filteredEvents = filterEvents(portal.events, filters);
  const reservedHours = portal.families.reduce(
    (total, family) => total + family.reservedHours,
    0
  );
  const completedHours = portal.families.reduce(
    (total, family) => total + family.completedHours,
    0
  );

  async function updateSignup(signupId: string, update: AdminSignupUpdate) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/admin/signups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId, ...update }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The signup could not be updated.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  async function updateFamilyAdmin(payload: {
    familyId: string;
    memberId?: string;
    clearanceStatus?: ClearanceStatus;
    adminNotes?: string;
  }) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/admin/families", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The family record could not be updated.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[380px_1fr]">
      <aside className="space-y-6">
        <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">School Summary</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MetricButton
              active={summaryView === "open"}
              label="Open jobs"
              onClick={() => setSummaryView("open")}
              value={String(openPositions.length)}
            />
            <MetricButton
              active={summaryView === "families"}
              label="Families"
              onClick={() => setSummaryView("families")}
              value={String(portal.families.length)}
            />
            <MetricButton
              active={summaryView === "pending"}
              label="Pending"
              onClick={() => setSummaryView("pending")}
              value={formatHours(reservedHours)}
            />
            <MetricButton
              active={summaryView === "completed"}
              label="Signed off"
              onClick={() => setSummaryView("completed")}
              value={formatHours(completedHours)}
            />
            <MetricButton
              active={summaryView === "waitlist"}
              label="Waitlist"
              onClick={() => setSummaryView("waitlist")}
              value={String(
                waitlistPositions.reduce(
                  (total, { position }) => total + position.waitlist.length,
                  0
                )
              )}
            />
            <MetricButton
              active={summaryView === "swaps"}
              label="Swaps"
              onClick={() => setSummaryView("swaps")}
              value={String(swapPositions.length)}
            />
          </div>
        </section>

        <AdminToolsPanel portal={portal} />

        <PolicyAdminPanel
          activePolicy={portal.activePolicy}
          busy={busy}
          families={portal.families}
          onBusyChange={onBusyChange}
          onMessageChange={onMessageChange}
          setPortal={setPortal}
        />

        <EventForm
          busy={busy}
          event={editingEvent}
          key={editingEvent?.id ?? "create-event"}
          onCancelEdit={() => setEditingEventId(null)}
          onBusyChange={onBusyChange}
          onDone={() => setEditingEventId(null)}
          onMessageChange={onMessageChange}
          setPortal={setPortal}
        />
      </aside>

      <section className="space-y-6">
        <AdminSummaryPanel
          completedPositions={completedPositions}
          families={portal.families}
          openPositions={openPositions}
          reservedPositions={reservedPositions}
          swapPositions={swapPositions}
          view={summaryView}
          waitlistPositions={waitlistPositions}
          onUpdateFamilyAdmin={updateFamilyAdmin}
          busy={busy}
        />
        <FamilyProgressTable families={portal.families} />
        <EventFilterPanel filters={filters} onFiltersChange={setFilters} />
        <EventBoard
          events={filteredEvents}
          families={portal.families}
          mode="admin"
          onEditEvent={setEditingEventId}
          origin={origin}
          onUpdateSignup={updateSignup}
          busy={busy}
        />
      </section>
    </div>
  );
}

function FamilyPortal({
  busy,
  onBusyChange,
  onMessageChange,
  portal,
  setPortal,
}: {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessageChange: (message: string | null) => void;
  portal: PortalData;
  setPortal: (portal: PortalData) => void;
}) {
  const [summaryView, setSummaryView] = useState<FamilySummaryView>("open");
  const [filters, setFilters] = useState<BoardFilters>({
    search: "",
    cohort: "any",
    grade: "any",
    availability: "all",
  });
  const family = portal.families[0];
  const positions = useMemo(() => collectPositions(portal.events), [portal.events]);
  const myPositions = positions.filter(({ position }) => position.signup?.isMine);
  const openPositions = positions.filter(({ position }) => !position.signup);
  const myWaitlistPositions = positions.filter(({ position }) =>
    position.waitlist.some((entry) => entry.isMine)
  );
  const pendingPositions = positions.filter(
    ({ position }) => position.signup?.isMine && position.signup.status === "reserved"
  );
  const completedPositions = positions.filter(
    ({ position }) => position.signup?.isMine && position.signup.status === "completed"
  );
  const remaining = Math.max(family.targetHours - family.completedHours, 0);
  const policySigned =
    !portal.activePolicy || Boolean(portal.activePolicy.acknowledgedAt);
  const filteredEvents =
    summaryView === "all"
      ? portal.events
      : summaryView === "pending"
        ? filterEventsByPosition(
            portal.events,
            (position) => position.signup?.isMine && position.signup.status === "reserved"
          )
        : summaryView === "completed"
          ? filterEventsByPosition(
              portal.events,
              (position) =>
                position.signup?.isMine && position.signup.status === "completed"
            )
          : summaryView === "waitlist"
            ? filterEventsByPosition(portal.events, (position) =>
                position.waitlist.some((entry) => entry.isMine)
              )
          : filterEventsByPosition(portal.events, (position) => !position.signup);
  const visibleEvents = filterEvents(filteredEvents, filters, family);

  async function claim(positionId: string) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/signups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "That position could not be selected.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  async function release(signupId: string) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/signups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "That position could not be released.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  async function requestSwap(signupId: string) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/signups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The swap request could not be sent.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  async function joinWaitlist(positionId: string) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The waitlist could not be updated.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  async function leaveWaitlist(waitlistId: string) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/waitlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waitlistId }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The waitlist could not be updated.");
    } else {
      setPortal(data.data);
    }

    onBusyChange(false);
  }

  async function acknowledgePolicy(policyId: string, signerName: string) {
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId, signerName }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The volunteer policy could not be signed.");
    } else {
      setPortal(data.data);
      onMessageChange("Volunteer policy signed.");
    }

    onBusyChange(false);
  }

  return (
    <>
      <section className="border-b border-[#e5e5e5] bg-white px-5 py-8 text-center">
        <p className="text-sm font-normal uppercase text-[#2b2b2b]">
          Record and review your volunteer hours
        </p>
        <div className="mt-1 inline-flex min-h-14 items-center justify-center bg-[#f0f0f0] px-5 text-2xl font-extrabold uppercase text-[#17345f] sm:text-3xl">
          {family.name}
        </div>
        <h1 className="mt-6 text-2xl font-normal uppercase text-black">
          Volunteering Opportunities
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-[#3f3f3f]">
          Select open positions, track pending hours, and see completed hours
          after admin sign-off.
        </p>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-6">
        <section className="rounded-lg border border-[#dedede] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#17345f]">{family.name}</h2>
          <p className="mt-1 text-sm text-[#6f664f]">{family.email}</p>
          <ProgressMeter family={family} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MetricButton
              active={summaryView === "open"}
              label="Open"
              onClick={() => setSummaryView("open")}
              value={String(openPositions.length)}
            />
            <MetricButton
              active={summaryView === "waitlist"}
              label="Waitlist"
              onClick={() => setSummaryView("waitlist")}
              value={String(myWaitlistPositions.length)}
            />
            <MetricButton
              active={summaryView === "remaining"}
              label="Remaining"
              onClick={() => setSummaryView("remaining")}
              value={formatHours(remaining)}
            />
            <MetricButton
              active={summaryView === "pending"}
              label="Pending"
              onClick={() => setSummaryView("pending")}
              value={formatHours(family.reservedHours)}
            />
            <MetricButton
              active={summaryView === "completed"}
              label="Signed off"
              onClick={() => setSummaryView("completed")}
              value={formatHours(family.completedHours)}
            />
            <MetricButton
              active={summaryView === "all"}
              label="Goal"
              onClick={() => setSummaryView("all")}
              value={formatHours(family.targetHours)}
            />
          </div>
        </section>

        <FamilyContactsPanel
          busy={busy}
          family={family}
          key={
            family.members
              .map(
                (member) =>
                  `${member.id}:${member.name}:${member.email}:${member.preferredContactMethod}:${member.phones.map((phone) => `${phone.id}:${phone.label}:${phone.number}`).join(",")}`
              )
              .join("|") || family.id
          }
          onBusyChange={onBusyChange}
          onMessageChange={onMessageChange}
          setPortal={setPortal}
        />

        <VolunteerPolicyPanel
          activePolicy={portal.activePolicy}
          busy={busy}
          family={family}
          onAcknowledgePolicy={acknowledgePolicy}
        />

        <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">My Signups</h2>
          <div className="mt-4 divide-y divide-[#eee4d0]">
            {myPositions.length === 0 ? (
              <p className="py-5 text-sm text-[#6f664f]">No selected positions.</p>
            ) : (
              myPositions.map(({ event, position }) => (
                <div className="py-4" key={position.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{position.title}</p>
                      <p className="mt-1 text-sm text-[#6f664f]">
                        {formatDateRange(event.date, event.endDate)} ·{" "}
                        {formatHours(position.hours)} hrs
                      </p>
                    </div>
                    <StatusPill status={signupDisplayStatus(position.signup)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
                      download={`${event.title}-${position.title}.ics`}
                      href={calendarHref(event, position)}
                    >
                      Add calendar
                    </a>
                    {position.signup?.status === "reserved" ? (
                      <button
                        className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
                        disabled={busy || Boolean(position.signup.swapRequestedAt)}
                        onClick={() => requestSwap(position.signup!.id)}
                        type="button"
                      >
                        {position.signup.swapRequestedAt ? "Swap requested" : "Request swap"}
                      </button>
                    ) : null}
                  </div>
                  {position.signup?.status === "reserved" ? (
                    <button
                      className="mt-2 rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
                      disabled={busy}
                      onClick={() => release(position.signup!.id)}
                      type="button"
                    >
                      Release
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      <EventBoard
        busy={busy}
        emptyMessage="No positions match this view."
        events={visibleEvents}
        heading={
          summaryView === "all"
            ? "All Volunteer Events"
            : summaryView === "pending"
              ? "Pending Sign-Off"
              : summaryView === "completed"
                ? "Signed-Off Positions"
                : summaryView === "waitlist"
                  ? "Waitlisted Positions"
                : "Open Positions"
        }
        mode="family"
        onClaim={claim}
        onJoinWaitlist={joinWaitlist}
        onLeaveWaitlist={leaveWaitlist}
        policySigned={policySigned}
        onRelease={release}
        onRequestSwap={requestSwap}
        summaryPanel={
          <>
            <FamilySummaryPanel
              completedPositions={completedPositions}
              family={family}
              openPositions={openPositions}
              remaining={remaining}
              pendingPositions={pendingPositions}
              view={summaryView}
              waitlistPositions={myWaitlistPositions}
            />
            <FamilyLedgerPanel positions={myPositions} waitlistPositions={myWaitlistPositions} />
            <EventFilterPanel filters={filters} onFiltersChange={setFilters} />
          </>
        }
      />
      </div>
    </>
  );
}

function MetricButton({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-20 rounded-md border p-3 text-left transition ${
        active
          ? "border-[#d4a600] bg-[#17345f] text-white shadow-sm"
          : "border-[#dedede] bg-white hover:border-[#d4a600] hover:bg-[#fafafa]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`block text-xs font-bold uppercase ${
          active ? "text-[#f3d45a]" : "text-[#5f5f5f]"
        }`}
      >
        {label}
      </span>
      <span
        className={`mt-1 block text-2xl font-extrabold ${
          active ? "text-white" : "text-[#17345f]"
        }`}
      >
        {value}
      </span>
    </button>
  );
}

function AdminToolsPanel({ portal }: { portal: PortalData }) {
  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Admin Tools</h2>
      <div className="mt-4 grid gap-3">
        <button
          className="rounded-md border border-[#ccb987] px-3 py-2 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
          onClick={() =>
            downloadCsv("family-hours.csv", buildFamilyHoursRows(portal.families))
          }
          type="button"
        >
          Export family hours
        </button>
        <button
          className="rounded-md border border-[#ccb987] px-3 py-2 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
          onClick={() => downloadCsv("event-rosters.csv", buildRosterRows(portal.events))}
          type="button"
        >
          Export event rosters
        </button>
      </div>
      <div className="mt-4 rounded-md border border-[#eee4d0] bg-[#fffaf0] p-3">
        <p className="text-sm font-semibold text-[#26385f]">Reminder Queue</p>
        <div className="mt-2 space-y-2 text-sm text-[#6f664f]">
          {portal.events.slice(0, 5).map((event) => (
            <p key={event.id}>
              {event.title}: {event.reminderDays.join(", ")} days before
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function PolicyAdminPanel({
  activePolicy,
  busy,
  families,
  onBusyChange,
  onMessageChange,
  setPortal,
}: {
  activePolicy: VolunteerPolicy | null;
  busy: boolean;
  families: FamilySummary[];
  onBusyChange: (busy: boolean) => void;
  onMessageChange: (message: string | null) => void;
  setPortal: (portal: PortalData) => void;
}) {
  const [title, setTitle] = useState(activePolicy?.title ?? "Volunteer Policy");
  const [body, setBody] = useState(activePolicy?.body ?? "");
  const [attachmentName, setAttachmentName] = useState(
    activePolicy?.attachmentName ?? ""
  );
  const [attachmentDataUrl, setAttachmentDataUrl] = useState(
    activePolicy?.attachmentDataUrl ?? ""
  );
  const acknowledgedCount = activePolicy?.acknowledgedFamilyIds.length ?? 0;

  async function handlePolicyFile(file: File | null) {
    if (!file) {
      return;
    }

    if (file.size > 650_000) {
      onMessageChange(
        "That policy file is too large for the built-in policy upload. Use policy text or a shared document link."
      );
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read policy file."));
      reader.readAsDataURL(file);
    });

    setAttachmentName(file.name);
    setAttachmentDataUrl(dataUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/admin/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        attachmentName,
        attachmentDataUrl,
      }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The volunteer policy could not be published.");
    } else {
      setPortal(data.data);
      onMessageChange("Volunteer policy published. Families will be asked to sign it.");
    }

    onBusyChange(false);
  }

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Volunteer Policy</h2>
      {activePolicy ? (
        <div className="mt-3 rounded-md border border-[#eee4d0] bg-[#fffaf0] p-3 text-sm text-[#6f664f]">
          <p className="font-semibold text-[#26385f]">{activePolicy.title}</p>
          <p className="mt-1">
            {acknowledgedCount} of {families.length} families signed
          </p>
          {activePolicy.attachmentName ? (
            <a
              className="mt-2 inline-flex font-semibold text-[#183058] underline-offset-2 hover:underline"
              download={activePolicy.attachmentName}
              href={activePolicy.attachmentDataUrl}
            >
              {activePolicy.attachmentName}
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#6f664f]">
          No active policy has been published yet.
        </p>
      )}

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <TextInput label="Policy title" onChange={setTitle} value={title} />
        <label className="block text-sm font-semibold text-[#26385f]">
          Policy text
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) => setBody(event.target.value)}
            value={body}
          />
        </label>
        <label className="block text-sm font-semibold text-[#26385f]">
          Upload policy file
          <input
            accept=".pdf,.txt,.md"
            className="mt-2 w-full rounded-md border border-[#ccb987] bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) => void handlePolicyFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        {attachmentName ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#eee4d0] bg-[#fffaf0] px-3 py-2 text-sm text-[#6f664f]">
            <span>{attachmentName}</span>
            <button
              className="rounded-md border border-[#efb4ad] px-3 py-1.5 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee]"
              onClick={() => {
                setAttachmentName("");
                setAttachmentDataUrl("");
              }}
              type="button"
            >
              Remove
            </button>
          </div>
        ) : null}
        <button
          className="w-full rounded-md bg-[#183058] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102344] disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          Publish policy
        </button>
      </form>
    </section>
  );
}

function EventFilterPanel({
  filters,
  onFiltersChange,
}: {
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
}) {
  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Filters</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <TextInput
          label="Search"
          onChange={(value) => onFiltersChange({ ...filters, search: value })}
          value={filters.search}
        />
        <SelectInput
          label="Cohort"
          onChange={(value) => onFiltersChange({ ...filters, cohort: value })}
          options={[
            { value: "any", label: "Any cohort" },
            ...cohortOptions,
          ]}
          value={filters.cohort}
        />
        <SelectInput
          label="Grade"
          onChange={(value) => onFiltersChange({ ...filters, grade: value })}
          options={[
            { value: "any", label: "Any grade" },
            ...gradeOptions,
          ]}
          value={filters.grade}
        />
        <label className="block text-sm font-semibold text-[#26385f]">
          Status
          <select
            className="mt-2 w-full rounded-md border border-[#ccb987] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                availability: event.target.value as BoardFilters["availability"],
              })
            }
            value={filters.availability}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="filled">Filled</option>
            <option value="requires_clearance">Needs clearance</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function VolunteerPolicyPanel({
  activePolicy,
  busy,
  family,
  onAcknowledgePolicy,
}: {
  activePolicy: VolunteerPolicy | null;
  busy: boolean;
  family: FamilySummary;
  onAcknowledgePolicy: (policyId: string, signerName: string) => void;
}) {
  const [signerName, setSignerName] = useState(
    family.members[0]?.name ?? family.name
  );

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Volunteer Info</h2>
      <div className="mt-4 space-y-2 text-sm text-[#6f664f]">
        <p>40 signed-off hours per family each school year.</p>
        <p>Pending hours count after admin sign-off.</p>
        <p>Some jobs require clearance, training, or adult volunteers.</p>
        <p>Use the calendar links for selected volunteer jobs.</p>
      </div>
      {activePolicy ? (
        <div className="mt-4 rounded-md border border-[#eee4d0] bg-[#fffaf0] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#26385f]">{activePolicy.title}</p>
              <p className="mt-1 text-sm text-[#6f664f]">
                Published {formatTimestamp(activePolicy.publishedAt)}
              </p>
            </div>
            <StatusPill
              status={activePolicy.acknowledgedAt ? "completed" : "reserved"}
            />
          </div>
          {activePolicy.body ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-[#26385f]">
              {activePolicy.body}
            </p>
          ) : null}
          {activePolicy.attachmentName ? (
            <a
              className="mt-3 inline-flex rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
              download={activePolicy.attachmentName}
              href={activePolicy.attachmentDataUrl}
            >
              Download policy
            </a>
          ) : null}
          {activePolicy.acknowledgedAt ? (
            <p className="mt-3 text-sm text-[#486a2a]">
              Signed by {activePolicy.signerName} on{" "}
              {formatTimestamp(activePolicy.acknowledgedAt)}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <TextInput
                label="Signer name"
                onChange={setSignerName}
                value={signerName}
              />
              <button
                className="w-full rounded-md bg-[#183058] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102344] disabled:opacity-50"
                disabled={busy}
                onClick={() => onAcknowledgePolicy(activePolicy.id, signerName)}
                type="button"
              >
                Sign policy
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function FamilyLedgerPanel({
  positions,
  waitlistPositions,
}: {
  positions: ReturnType<typeof collectPositions>;
  waitlistPositions: ReturnType<typeof collectPositions>;
}) {
  const rows = [
    ...positions.map(({ event, position }) => ({
      id: position.id,
      event,
      position,
      status: signupDisplayStatus(position.signup),
    })),
    ...waitlistPositions.map(({ event, position }) => ({
      id: `${position.id}-waitlist`,
      event,
      position,
      status: "waitlist" as const,
    })),
  ];

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Hour Ledger</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[#6f664f]">No ledger entries yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-[#eee4d0]">
          {rows.map(({ event, id, position, status }) => (
            <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto]" key={id}>
              <div>
                <p className="font-semibold">{position.title}</p>
                <p className="mt-1 text-sm text-[#6f664f]">
                  {event.title} · {formatDateRange(event.date, event.endDate)} ·{" "}
                  {formatHours(position.hours)} hrs
                </p>
              </div>
              <StatusPill status={status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FamilyContactsPanel({
  busy,
  family,
  onBusyChange,
  onMessageChange,
  setPortal,
}: {
  busy: boolean;
  family: FamilySummary;
  onBusyChange: (busy: boolean) => void;
  onMessageChange: (message: string | null) => void;
  setPortal: (portal: PortalData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [studentName, setStudentName] = useState(family.studentName);
  const [studentGrade, setStudentGrade] = useState(family.studentGrade || "all");
  const [teacherName, setTeacherName] = useState(family.teacherName);
  const [volunteerInterests, setVolunteerInterests] = useState(
    family.volunteerInterests.join(", ")
  );
  const [members, setMembers] = useState<MemberDraft[]>(() =>
    family.members.length > 0
      ? family.members.map(memberToDraft)
      : [blankMemberDraft()]
  );

  function updateMember<K extends keyof MemberDraft>(
    index: number,
    key: K,
    value: MemberDraft[K]
  ) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [key]: value } : member
      )
    );
  }

  function updatePhone(
    memberIndex: number,
    phoneIndex: number,
    key: keyof PhoneDraft,
    value: string
  ) {
    setMembers((current) =>
      current.map((member, currentMemberIndex) =>
        currentMemberIndex === memberIndex
          ? {
              ...member,
              phones: member.phones.map((phone, currentPhoneIndex) =>
                currentPhoneIndex === phoneIndex
                  ? { ...phone, [key]: value }
                  : phone
              ),
            }
          : member
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBusyChange(true);
    onMessageChange(null);

    const response = await fetch("/api/family/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName,
        studentGrade,
        teacherName,
        volunteerInterests: parseDraftList(volunteerInterests),
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          preferredContactMethod: member.preferredContactMethod,
          phones: member.phones,
        })),
      }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(data.error ?? "The family contacts could not be saved.");
    } else {
      setPortal(data.data);
      setEditing(false);
    }

    onBusyChange(false);
  }

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Family Contacts</h2>
        <button
          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
          disabled={busy}
          onClick={() => setEditing((current) => !current)}
          type="button"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {!editing ? (
        <>
          <div className="mt-4 rounded-md border border-[#eee4d0] bg-[#fffaf0] p-3 text-sm text-[#6f664f]">
            <p className="font-semibold text-[#26385f]">
              {family.studentName || "Student"}
            </p>
            <p>
              {family.studentGrade
                ? gradeLabel(family.studentGrade as EventGrade)
                : "Grade not listed"}{" "}
              {family.teacherName ? `· ${family.teacherName}` : ""}
            </p>
            {family.volunteerInterests.length > 0 ? (
              <p className="mt-2">{family.volunteerInterests.join(", ")}</p>
            ) : null}
          </div>
          <div className="mt-4 divide-y divide-[#eee4d0]">
            {family.members.length === 0 ? (
              <p className="py-4 text-sm text-[#6f664f]">
                No participating family members listed yet.
              </p>
            ) : (
              family.members.map((member) => (
                <div className="py-4" key={member.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{member.name}</p>
                    <span className="rounded-md bg-[#f4e5bd] px-2 py-1 text-xs font-semibold text-[#102344]">
                      {contactPreferenceLabel(member.preferredContactMethod)}
                    </span>
                    <span className="rounded-md bg-[#edf3f8] px-2 py-1 text-xs font-semibold text-[#102344]">
                      {clearanceLabel(member.clearanceStatus)}
                    </span>
                  </div>
                  {member.email ? (
                    <p className="mt-1 text-sm text-[#6f664f]">{member.email}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-[#6f664f]">
                    {formatPhoneList(member.phones)}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput
              label="Student name"
              onChange={setStudentName}
              value={studentName}
            />
            <SelectInput
              label="Student grade"
              onChange={setStudentGrade}
              options={gradeOptions}
              value={studentGrade as EventGrade}
            />
          </div>
          <TextInput
            label="Teacher"
            onChange={setTeacherName}
            value={teacherName}
          />
          <TextInput
            label="Volunteer interests"
            onChange={setVolunteerInterests}
            value={volunteerInterests}
          />
          <div className="divide-y divide-[#eee4d0] border-y border-[#eee4d0]">
            {members.map((member, memberIndex) => (
              <div className="space-y-3 py-4" key={member.id ?? memberIndex}>
                <TextInput
                  label="Name"
                  onChange={(value) => updateMember(memberIndex, "name", value)}
                  value={member.name}
                />
                <TextInput
                  label="Email"
                  onChange={(value) => updateMember(memberIndex, "email", value)}
                  type="email"
                  value={member.email}
                />
                <label className="block text-sm font-semibold text-[#26385f]">
                  Preferred contact
                  <select
                    className="mt-2 w-full rounded-md border border-[#ccb987] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
                    onChange={(event) =>
                      updateMember(
                        memberIndex,
                        "preferredContactMethod",
                        event.target.value as ContactPreference
                      )
                    }
                    value={member.preferredContactMethod}
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Email and phone</option>
                  </select>
                </label>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#26385f]">
                      Phone numbers
                    </h3>
                    <button
                      className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
                      onClick={() =>
                        updateMember(memberIndex, "phones", [
                          ...member.phones,
                          { label: "Mobile", number: "" },
                        ])
                      }
                      type="button"
                    >
                      Add phone
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {member.phones.map((phone, phoneIndex) => (
                      <div
                        className="grid gap-3 md:grid-cols-[110px_1fr_auto]"
                        key={phone.id ?? phoneIndex}
                      >
                        <input
                          className="rounded-md border border-[#ccb987] px-3 py-2 text-base outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
                          onChange={(event) =>
                            updatePhone(
                              memberIndex,
                              phoneIndex,
                              "label",
                              event.target.value
                            )
                          }
                          placeholder="Mobile"
                          value={phone.label}
                        />
                        <input
                          className="rounded-md border border-[#ccb987] px-3 py-2 text-base outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
                          onChange={(event) =>
                            updatePhone(
                              memberIndex,
                              phoneIndex,
                              "number",
                              event.target.value
                            )
                          }
                          placeholder="Phone number"
                          type="tel"
                          value={phone.number}
                        />
                        <button
                          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
                          onClick={() =>
                            updateMember(
                              memberIndex,
                              "phones",
                              member.phones.filter(
                                (_, currentPhoneIndex) =>
                                  currentPhoneIndex !== phoneIndex
                              )
                            )
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {members.length > 1 ? (
                  <button
                    className="rounded-md border border-[#efb4ad] px-3 py-1.5 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee]"
                    onClick={() =>
                      setMembers((current) =>
                        current.filter((_, index) => index !== memberIndex)
                      )
                    }
                    type="button"
                  >
                    Remove person
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <button
            className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
            onClick={() =>
              setMembers((current) => [...current, blankMemberDraft()])
            }
            type="button"
          >
            Add person
          </button>

          <button
            className="w-full rounded-md bg-[#183058] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102344] disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            Save contacts
          </button>
        </form>
      )}
    </section>
  );
}

function AdminSummaryPanel({
  busy,
  completedPositions,
  families,
  openPositions,
  onUpdateFamilyAdmin,
  reservedPositions,
  swapPositions,
  view,
  waitlistPositions,
}: {
  busy: boolean;
  completedPositions: ReturnType<typeof collectPositions>;
  families: FamilySummary[];
  onUpdateFamilyAdmin: (payload: {
    familyId: string;
    memberId?: string;
    clearanceStatus?: ClearanceStatus;
    adminNotes?: string;
  }) => void;
  openPositions: ReturnType<typeof collectPositions>;
  reservedPositions: ReturnType<typeof collectPositions>;
  swapPositions: ReturnType<typeof collectPositions>;
  view: AdminSummaryView;
  waitlistPositions: ReturnType<typeof collectPositions>;
}) {
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  if (view === "families") {
    return (
      <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Family Summary</h2>
            <p className="mt-1 text-sm text-[#6f664f]">
              {families.length} families tracked
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {families.map((family) => {
            const remaining = Math.max(
              family.targetHours - family.completedHours,
              0
            );

            return (
              <div
                className="rounded-md border border-[#eee4d0] bg-[#fffaf0] p-4"
                key={family.id}
              >
                <p className="font-semibold">{family.name}</p>
                <p className="mt-1 text-sm text-[#6f664f]">{family.email}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <span>{formatHours(family.completedHours)} signed off</span>
                  <span>{formatHours(family.reservedHours)} pending</span>
                  <span>{formatHours(remaining)} left</span>
                </div>
                <div className="mt-4 divide-y divide-[#eee4d0] border-t border-[#eee4d0]">
                  {family.members.length === 0 ? (
                    <p className="pt-3 text-sm text-[#6f664f]">
                      No contacts listed.
                    </p>
                  ) : (
                    family.members.map((member) => (
                      <div className="py-3" key={member.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{member.name}</p>
                          <span className="rounded-md bg-[#f4e5bd] px-2 py-1 text-xs font-semibold text-[#102344]">
                            {contactPreferenceLabel(
                              member.preferredContactMethod
                            )}
                          </span>
                          <span className="rounded-md bg-[#edf3f8] px-2 py-1 text-xs font-semibold text-[#102344]">
                            {clearanceLabel(member.clearanceStatus)}
                          </span>
                        </div>
                        {member.email ? (
                          <p className="mt-1 text-sm text-[#6f664f]">
                            {member.email}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm text-[#6f664f]">
                          {formatPhoneList(member.phones)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(["not_started", "pending", "cleared"] as ClearanceStatus[]).map(
                            (status) => (
                              <button
                                className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  member.clearanceStatus === status
                                    ? "border-[#183058] bg-[#f4e5bd] text-[#102344]"
                                    : "border-[#ccb987] text-[#26385f] hover:bg-[#f5ecd8]"
                                }`}
                                disabled={busy}
                                key={status}
                                onClick={() =>
                                  onUpdateFamilyAdmin({
                                    familyId: family.id,
                                    memberId: member.id,
                                    clearanceStatus: status,
                                  })
                                }
                                type="button"
                              >
                                {clearanceLabel(status)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-[#26385f]">
                    Private admin notes
                    <textarea
                      className="mt-2 min-h-16 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [family.id]: event.target.value,
                        }))
                      }
                      value={noteDrafts[family.id] ?? family.adminNotes}
                    />
                  </label>
                  <button
                    className="mt-2 rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
                    disabled={busy}
                    onClick={() =>
                      onUpdateFamilyAdmin({
                        familyId: family.id,
                        adminNotes: noteDrafts[family.id] ?? family.adminNotes,
                      })
                    }
                    type="button"
                  >
                    Save notes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const panel = {
    open: {
      title: "Open Job Summary",
      count: openPositions.length,
      entries: openPositions,
    },
    pending: {
      title: "Pending Sign-Off",
      count: reservedPositions.length,
      entries: reservedPositions,
    },
    completed: {
      title: "Signed-Off Job Summary",
      count: completedPositions.length,
      entries: completedPositions,
    },
    waitlist: {
      title: "Waitlist Summary",
      count: waitlistPositions.reduce(
        (total, { position }) => total + position.waitlist.length,
        0
      ),
      entries: waitlistPositions,
    },
    swaps: {
      title: "Swap Requests",
      count: swapPositions.length,
      entries: swapPositions,
    },
  }[view];
  const hours = panel.entries.reduce(
    (total, { position }) => total + position.hours,
    0
  );

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{panel.title}</h2>
          <p className="mt-1 text-sm text-[#6f664f]">
            {panel.count} jobs · {formatHours(hours)} hours
          </p>
        </div>
      </div>
      <SummaryPositionList
        entries={panel.entries}
        emptyMessage="No positions in this summary."
        showFamily
      />
    </section>
  );
}

function FamilySummaryPanel({
  completedPositions,
  family,
  openPositions,
  remaining,
  pendingPositions,
  view,
  waitlistPositions,
}: {
  completedPositions: ReturnType<typeof collectPositions>;
  family: FamilySummary;
  openPositions: ReturnType<typeof collectPositions>;
  remaining: number;
  pendingPositions: ReturnType<typeof collectPositions>;
  view: FamilySummaryView;
  waitlistPositions: ReturnType<typeof collectPositions>;
}) {
  const panels = {
    open: {
      title: "Open Positions",
      subtitle: `${openPositions.length} jobs available · ${formatHours(
        openPositions.reduce((total, { position }) => total + position.hours, 0)
      )} hours`,
      entries: openPositions,
    },
    remaining: {
      title: "Hours Remaining",
      subtitle: `${formatHours(remaining)} hours left toward ${formatHours(
        family.targetHours
      )}`,
      entries: openPositions,
    },
    pending: {
      title: "Pending Sign-Off",
      subtitle: `${pendingPositions.length} jobs · ${formatHours(
        family.reservedHours
      )} hours waiting for admin approval`,
      entries: pendingPositions,
    },
    completed: {
      title: "Signed-Off Positions",
      subtitle: `${completedPositions.length} jobs · ${formatHours(
        family.completedHours
      )} hours`,
      entries: completedPositions,
    },
    waitlist: {
      title: "Waitlisted Positions",
      subtitle: `${waitlistPositions.length} jobs where you are next in line if a spot opens`,
      entries: waitlistPositions,
    },
    all: {
      title: "Annual Goal",
      subtitle: `${formatHours(
        family.completedHours
      )} signed off · ${formatHours(
        family.reservedHours
      )} pending of ${formatHours(family.targetHours)} hours`,
      entries: openPositions,
    },
  };
  const panel = panels[view];

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{panel.title}</h2>
          <p className="mt-1 text-sm text-[#6f664f]">{panel.subtitle}</p>
        </div>
      </div>
      <SummaryPositionList
        entries={panel.entries}
        emptyMessage="No positions in this view."
      />
    </section>
  );
}

function SummaryPositionList({
  emptyMessage,
  entries,
  showFamily = false,
}: {
  emptyMessage: string;
  entries: ReturnType<typeof collectPositions>;
  showFamily?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="mt-4 text-sm text-[#6f664f]">{emptyMessage}</p>;
  }

  return (
    <div className="mt-4 divide-y divide-[#eee4d0]">
      {entries.map(({ event, position }) => (
        <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto]" key={position.id}>
          <div>
            <p className="font-semibold">{position.title}</p>
            <p className="mt-1 text-sm text-[#6f664f]">
              {event.title} · {formatDateRange(event.date, event.endDate)} ·{" "}
              {formatHours(position.hours)} hrs
            </p>
            {showFamily && position.signup?.familyName ? (
              <p className="mt-1 text-sm text-[#26385f]">
                {position.signup.familyName}
              </p>
            ) : null}
          </div>
          {position.signup ? (
            <StatusPill status={signupDisplayStatus(position.signup)} />
          ) : (
            <StatusPill status="open" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressMeter({ family }: { family: FamilySummary }) {
  const completedPercent = Math.min(
    (family.completedHours / family.targetHours) * 100,
    100
  );
  const pendingPercent = Math.min(
    ((family.completedHours + family.reservedHours) / family.targetHours) * 100,
    100
  );

  return (
    <div className="mt-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#26385f]">Annual progress</p>
          <p className="mt-1 text-sm text-[#6f664f]">
            {formatHours(family.completedHours)} signed off ·{" "}
            {formatHours(family.reservedHours)} pending of{" "}
            {formatHours(family.targetHours)}
          </p>
        </div>
        <p className="text-2xl font-semibold text-[#183058]">
          {Math.round(completedPercent)}%
        </p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-md bg-[#eee4d0]">
        <div
          className="h-full bg-[#d8a828]"
          style={{ width: `${pendingPercent}%` }}
        />
        <div
          className="-mt-3 h-full bg-[#183058]"
          style={{ width: `${completedPercent}%` }}
        />
      </div>
    </div>
  );
}

function FamilyProgressTable({ families }: { families: FamilySummary[] }) {
  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Family Progress</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#d8c7a0] text-[#6f664f]">
              <th className="py-3 pr-4 font-semibold">Family</th>
              <th className="py-3 pr-4 font-semibold">Signed off</th>
              <th className="py-3 pr-4 font-semibold">Pending</th>
              <th className="py-3 pr-4 font-semibold">Remaining</th>
              <th className="py-3 font-semibold">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee4d0]">
            {families.map((family) => {
              const remaining = Math.max(
                family.targetHours - family.completedHours,
                0
              );
              const percent = Math.min(
                (family.completedHours / family.targetHours) * 100,
                100
              );

              return (
                <tr key={family.id}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-[#14233d]">{family.name}</p>
                    <p className="text-xs text-[#6f664f]">{family.email}</p>
                  </td>
                  <td className="py-3 pr-4">{formatHours(family.completedHours)}</td>
                  <td className="py-3 pr-4">{formatHours(family.reservedHours)}</td>
                  <td className="py-3 pr-4">{formatHours(remaining)}</td>
                  <td className="py-3">
                    <div className="h-2 w-32 overflow-hidden rounded-md bg-[#eee4d0]">
                      <div
                        className="h-full bg-[#183058]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EventForm({
  busy,
  event,
  onCancelEdit,
  onBusyChange,
  onDone,
  onMessageChange,
  setPortal,
}: {
  busy: boolean;
  event?: PortalEvent | null;
  onCancelEdit?: () => void;
  onBusyChange: (busy: boolean) => void;
  onDone?: () => void;
  onMessageChange: (message: string | null) => void;
  setPortal: (portal: PortalData) => void;
}) {
  const isEditing = Boolean(event);
  const [draft, setDraft] = useState<EventDraft>(() =>
    event ? eventToDraft(event) : initialDraft
  );

  function updateDraft<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateDefaultHours(value: string) {
    setDraft((current) => ({
      ...current,
      hours: value,
      positions: current.positions.map((position) =>
        !position.hours || position.hours === current.hours
          ? { ...position, hours: value }
          : position
      ),
    }));
  }

  function updatePositionCount(value: string) {
    const nextCount = Math.max(1, Math.min(50, Number(value) || 1));

    setDraft((current) => {
      if (nextCount === current.positions.length) {
        return current;
      }

      if (nextCount < current.positions.length) {
        return {
          ...current,
          positions: current.positions.slice(0, nextCount),
        };
      }

      return {
        ...current,
        positions: [
          ...current.positions,
          ...Array.from({ length: nextCount - current.positions.length }, (_, index) => {
            const positionNumber = current.positions.length + index + 1;

            return {
              title: `Position ${positionNumber}`,
              description: "",
              hours: current.hours,
              requirements: "",
              clearanceRequired: false,
              adultOnly: false,
              trainingRequired: false,
            };
          }),
        ],
      };
    });
  }

  function updatePosition(
    index: number,
    key: keyof DraftPosition,
    value: DraftPosition[keyof DraftPosition]
  ) {
    setDraft((current) => ({
      ...current,
      positions: current.positions.map((position, positionIndex) =>
        positionIndex === index ? { ...position, [key]: value } : position
      ),
    }));
  }

  function updateResourceLink(
    index: number,
    key: keyof DraftResourceLink,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [key]: value } : link
      ),
    }));
  }

  function updateCustomField(
    index: number,
    key: keyof DraftCustomField,
    value: DraftCustomField[keyof DraftCustomField]
  ) {
    setDraft((current) => ({
      ...current,
      customFields: current.customFields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      ),
    }));
  }

  function updateCustomFieldType(index: number, fieldType: CustomFieldType) {
    setDraft((current) => ({
      ...current,
      customFields: current.customFields.map((field, fieldIndex) => {
        if (fieldIndex !== index) {
          return field;
        }

        return {
          ...field,
          fieldType,
          options: customFieldUsesOptions(fieldType) ? field.options : [],
          value: fieldType === "checkbox" ? "false" : "",
        };
      }),
    }));
  }

  function updateCustomFieldOption(
    fieldIndex: number,
    optionIndex: number,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      customFields: current.customFields.map((field, currentFieldIndex) =>
        currentFieldIndex === fieldIndex
          ? {
              ...field,
              options: field.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? value : option
              ),
            }
          : field
      ),
    }));
  }

  function addCustomFieldOption(fieldIndex: number) {
    setDraft((current) => ({
      ...current,
      customFields: current.customFields.map((field, currentFieldIndex) =>
        currentFieldIndex === fieldIndex
          ? { ...field, options: [...field.options, ""] }
          : field
      ),
    }));
  }

  function removeCustomFieldOption(fieldIndex: number, optionIndex: number) {
    setDraft((current) => ({
      ...current,
      customFields: current.customFields.map((field, currentFieldIndex) => {
        if (currentFieldIndex !== fieldIndex) {
          return field;
        }

        const removedOption = field.options[optionIndex];
        const options = field.options.filter(
          (_, currentOptionIndex) => currentOptionIndex !== optionIndex
        );

        if (field.fieldType === "multi_select") {
          return {
            ...field,
            options,
            value: JSON.stringify(
              parseMultiSelectValue(field.value).filter(
                (value) => value !== removedOption
              )
            ),
          };
        }

        return {
          ...field,
          options,
          value: field.value === removedOption ? "" : field.value,
        };
      }),
    }));
  }

  function updateMultiSelectValue(
    fieldIndex: number,
    option: string,
    selected: boolean
  ) {
    setDraft((current) => ({
      ...current,
      customFields: current.customFields.map((field, currentFieldIndex) => {
        if (currentFieldIndex !== fieldIndex) {
          return field;
        }

        const currentValues = parseMultiSelectValue(field.value);
        const nextValues = selected
          ? Array.from(new Set([...currentValues, option]))
          : currentValues.filter((value) => value !== option);

        return {
          ...field,
          value: JSON.stringify(nextValues),
        };
      }),
    }));
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    onBusyChange(true);
    onMessageChange(null);

    const eventHours = Number(draft.hours);
    const response = await fetch("/api/admin/events", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event?.id,
        ...draft,
        hours: eventHours,
        cancellationDeadlineHours: Number(draft.cancellationDeadlineHours),
        reminderDays: parseDraftReminderDays(draft.reminderDays),
        resourceLinks: draft.resourceLinks,
        recurrenceCount: Number(draft.recurrenceCount),
        customFields: draft.customFields.map((field) => ({
          id: field.id,
          label: field.label,
          fieldType: field.fieldType,
          options: field.options,
          value: field.value,
        })),
        positions: draft.positions.map((position) => ({
          id: position.id,
          title: position.title,
          description: position.description,
          hours: draftPositionHours(position, draft.hours),
          requirements: parseDraftList(position.requirements),
          clearanceRequired: position.clearanceRequired,
          adultOnly: position.adultOnly,
          trainingRequired: position.trainingRequired,
        })),
      }),
    });
    const data = (await response.json()) as { data?: PortalData; error?: string };

    if (!response.ok || !data.data) {
      onMessageChange(
        data.error ??
          (isEditing
            ? "The event could not be updated."
            : "The event could not be created.")
      );
    } else {
      setPortal(data.data);
      if (isEditing) {
        onDone?.();
      } else {
        setDraft(initialDraft);
      }
    }

    onBusyChange(false);
  }

  return (
    <section className="rounded-lg border border-[#d8c7a0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {isEditing ? "Edit Event" : "Create Event"}
        </h2>
        {isEditing ? (
          <button
            className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
            onClick={onCancelEdit}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <TextInput
          label="Event name"
          onChange={(value) => updateDraft("title", value)}
          value={draft.title}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <SelectInput
            label="Cohort"
            onChange={(value) => updateDraft("cohort", value)}
            options={cohortOptions}
            value={draft.cohort}
          />
          <SelectInput
            label="Grade"
            onChange={(value) => updateDraft("grade", value)}
            options={gradeOptions}
            value={draft.grade}
          />
          <TextInput
            label="Number of positions"
            max="50"
            min="1"
            onChange={updatePositionCount}
            step="1"
            type="number"
            value={String(draft.positions.length)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <TextInput
            label="Start date"
            onChange={(value) => updateDraft("date", value)}
            type="date"
            value={draft.date}
          />
          <TextInput
            label="End date"
            onChange={(value) => updateDraft("endDate", value)}
            type="date"
            value={draft.endDate}
          />
          <TextInput
            label="Default position hours"
            min="0.5"
            onChange={updateDefaultHours}
            step="0.5"
            type="number"
            value={draft.hours}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Start"
            onChange={(value) => updateDraft("startTime", value)}
            type="time"
            value={draft.startTime}
          />
          <TextInput
            label="End"
            onChange={(value) => updateDraft("endTime", value)}
            type="time"
            value={draft.endTime}
          />
        </div>
        <TextInput
          label="Location"
          onChange={(value) => updateDraft("location", value)}
          value={draft.location}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <TextInput
            label="Cancellation cutoff hours"
            min="0"
            onChange={(value) => updateDraft("cancellationDeadlineHours", value)}
            step="1"
            type="number"
            value={draft.cancellationDeadlineHours}
          />
          <TextInput
            label="Reminder days"
            onChange={(value) => updateDraft("reminderDays", value)}
            value={draft.reminderDays}
          />
        </div>
        <label className="block text-sm font-semibold text-[#26385f]">
          Description
          <textarea
            className="mt-2 min-h-20 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) => updateDraft("description", event.target.value)}
            value={draft.description}
          />
        </label>
        <label className="block text-sm font-semibold text-[#26385f]">
          Instructions
          <textarea
            className="mt-2 min-h-20 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) => updateDraft("instructions", event.target.value)}
            value={draft.instructions}
          />
        </label>
        <label className="block text-sm font-semibold text-[#26385f]">
          Parking
          <textarea
            className="mt-2 min-h-16 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) => updateDraft("parkingInfo", event.target.value)}
            value={draft.parkingInfo}
          />
        </label>
        <label className="block text-sm font-semibold text-[#26385f]">
          Private admin notes
          <textarea
            className="mt-2 min-h-16 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
            onChange={(event) => updateDraft("privateNotes", event.target.value)}
            value={draft.privateNotes}
          />
        </label>

        {!isEditing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[#26385f]">
              Repeat
              <select
                className="mt-2 w-full rounded-md border border-[#ccb987] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
                onChange={(event) =>
                  updateDraft(
                    "recurrenceFrequency",
                    event.target.value as EventDraft["recurrenceFrequency"]
                  )
                }
                value={draft.recurrenceFrequency}
              >
                <option value="none">No repeat</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <TextInput
              label="Occurrences"
              max="20"
              min="1"
              onChange={(value) => updateDraft("recurrenceCount", value)}
              step="1"
              type="number"
              value={draft.recurrenceCount}
            />
          </div>
        ) : null}

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#26385f]">
              Resource links
            </h3>
            <button
              className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
              onClick={() =>
                updateDraft("resourceLinks", [
                  ...draft.resourceLinks,
                  { title: "", url: "" },
                ])
              }
              type="button"
            >
              Add link
            </button>
          </div>
          {draft.resourceLinks.length > 0 ? (
            <div className="mt-3 space-y-3">
              {draft.resourceLinks.map((link, index) => (
                <div
                  className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  key={index}
                >
                  <TextInput
                    label="Title"
                    onChange={(value) => updateResourceLink(index, "title", value)}
                    value={link.title}
                  />
                  <TextInput
                    label="URL"
                    onChange={(value) => updateResourceLink(index, "url", value)}
                    type="url"
                    value={link.url}
                  />
                  <button
                    className="self-end rounded-md border border-[#efb4ad] px-3 py-2 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee]"
                    onClick={() =>
                      updateDraft(
                        "resourceLinks",
                        draft.resourceLinks.filter(
                          (_, linkIndex) => linkIndex !== index
                        )
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#26385f]">
              Custom fields
            </h3>
            <button
              className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
              onClick={() =>
                updateDraft("customFields", [
                  ...draft.customFields,
                  blankCustomField(),
                ])
              }
              type="button"
            >
              Add field
            </button>
          </div>

          {draft.customFields.length > 0 ? (
            <div className="mt-3 divide-y divide-[#eee4d0] border-y border-[#eee4d0]">
              {draft.customFields.map((field, index) => (
                <div className="space-y-3 py-4" key={field.id ?? index}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput
                      label="Field name"
                      onChange={(value) =>
                        updateCustomField(index, "label", value)
                      }
                      value={field.label}
                    />
                    <SelectInput
                      label="Field type"
                      onChange={(value) => updateCustomFieldType(index, value)}
                      options={customFieldTypeOptions}
                      value={field.fieldType}
                    />
                  </div>

                  {customFieldUsesOptions(field.fieldType) ? (
                    <div className="space-y-3 rounded-md border border-[#eee4d0] bg-[#fbf8ef] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#26385f]">
                          Choices
                        </p>
                        <button
                          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
                          onClick={() => addCustomFieldOption(index)}
                          type="button"
                        >
                          Add choice
                        </button>
                      </div>
                      {field.options.map((option, optionIndex) => (
                        <div
                          className="grid gap-2 md:grid-cols-[1fr_auto]"
                          key={optionIndex}
                        >
                          <TextInput
                            label={`Choice ${optionIndex + 1}`}
                            onChange={(value) =>
                              updateCustomFieldOption(index, optionIndex, value)
                            }
                            value={option}
                          />
                          <button
                            className="self-end rounded-md border border-[#efb4ad] px-3 py-2 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee]"
                            onClick={() =>
                              removeCustomFieldOption(index, optionIndex)
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <CustomFieldValueInput
                    field={field}
                    onChange={(value) => updateCustomField(index, "value", value)}
                    onMultiSelectChange={(option, selected) =>
                      updateMultiSelectValue(index, option, selected)
                    }
                  />

                  <button
                    className="rounded-md border border-[#efb4ad] px-3 py-1.5 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee]"
                    onClick={() =>
                      updateDraft(
                        "customFields",
                        draft.customFields.filter(
                          (_, fieldIndex) => fieldIndex !== index
                        )
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#26385f]">Positions</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6f664f]">
                {draft.positions.length} jobs
              </p>
            </div>
            <button
              className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
              onClick={() =>
                updateDraft("positions", [
                  ...draft.positions,
                  {
                    title: `Position ${draft.positions.length + 1}`,
                    description: "",
                    hours: draft.hours,
                    requirements: "",
                    clearanceRequired: false,
                    adultOnly: false,
                    trainingRequired: false,
                  },
                ])
              }
              type="button"
            >
              Add
            </button>
          </div>

          <div className="mt-3 divide-y divide-[#eee4d0] border-y border-[#eee4d0]">
            {draft.positions.map((position, index) => (
              <div className="space-y-3 py-4" key={position.id ?? index}>
                <TextInput
                  label="Position"
                  onChange={(value) => updatePosition(index, "title", value)}
                  value={position.title}
                />
                <TextInput
                  label="Granted hours"
                  min="0.5"
                  onChange={(value) => updatePosition(index, "hours", value)}
                  placeholder={draft.hours}
                  step="0.5"
                  type="number"
                  value={position.hours}
                />
                <TextInput
                  label="Requirements"
                  onChange={(value) => updatePosition(index, "requirements", value)}
                  value={position.requirements}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-md border border-[#eee4d0] px-3 py-2 text-sm font-semibold text-[#26385f]">
                    <input
                      checked={position.clearanceRequired}
                      className="h-4 w-4 accent-[#183058]"
                      onChange={(event) =>
                        updatePosition(
                          index,
                          "clearanceRequired",
                          event.target.checked
                        )
                      }
                      type="checkbox"
                    />
                    Clearance
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-[#eee4d0] px-3 py-2 text-sm font-semibold text-[#26385f]">
                    <input
                      checked={position.adultOnly}
                      className="h-4 w-4 accent-[#183058]"
                      onChange={(event) =>
                        updatePosition(index, "adultOnly", event.target.checked)
                      }
                      type="checkbox"
                    />
                    Adult
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-[#eee4d0] px-3 py-2 text-sm font-semibold text-[#26385f]">
                    <input
                      checked={position.trainingRequired}
                      className="h-4 w-4 accent-[#183058]"
                      onChange={(event) =>
                        updatePosition(
                          index,
                          "trainingRequired",
                          event.target.checked
                        )
                      }
                      type="checkbox"
                    />
                    Training
                  </label>
                </div>
                <label className="block text-sm font-semibold text-[#26385f]">
                  Position description
                  <textarea
                    className="mt-2 min-h-16 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
                    onChange={(event) =>
                      updatePosition(index, "description", event.target.value)
                    }
                    value={position.description}
                  />
                </label>
                {draft.positions.length > 1 ? (
                  <button
                    className="rounded-md border border-[#efb4ad] px-3 py-1.5 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee] disabled:cursor-not-allowed disabled:border-[#d8c7a0] disabled:text-[#98a2b3] disabled:hover:bg-transparent"
                    disabled={
                      event?.positions.some(
                        (existing) =>
                          existing.id === position.id && Boolean(existing.signup)
                      ) ?? false
                    }
                    onClick={() =>
                      updateDraft(
                        "positions",
                        draft.positions.filter((_, positionIndex) => positionIndex !== index)
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <button
          className="w-full rounded-md bg-[#183058] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102344] disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {isEditing ? "Save event" : "Create event"}
        </button>
      </form>
    </section>
  );
}

function CustomFieldValueInput({
  field,
  onChange,
  onMultiSelectChange,
}: {
  field: DraftCustomField;
  onChange: (value: string) => void;
  onMultiSelectChange: (option: string, selected: boolean) => void;
}) {
  if (field.fieldType === "textarea") {
    return (
      <label className="block text-sm font-semibold text-[#26385f]">
        Field value
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
          onChange={(event) => onChange(event.target.value)}
          value={field.value}
        />
      </label>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-md border border-[#ccb987] px-3 py-2 text-sm font-semibold text-[#26385f]">
        <input
          checked={field.value === "true"}
          className="h-4 w-4 accent-[#183058]"
          onChange={(event) => onChange(event.target.checked ? "true" : "false")}
          type="checkbox"
        />
        Checked
      </label>
    );
  }

  if (field.fieldType === "select") {
    return (
      <label className="block text-sm font-semibold text-[#26385f]">
        Field value
        <select
          className="mt-2 w-full rounded-md border border-[#ccb987] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
          onChange={(event) => onChange(event.target.value)}
          value={field.value}
        >
          <option value="">Select...</option>
          {field.options.filter(Boolean).map((option, index) => (
            <option key={`${option}-${index}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.fieldType === "multi_select") {
    const selectedValues = parseMultiSelectValue(field.value);

    return (
      <div className="rounded-md border border-[#ccb987] p-3">
        <p className="text-sm font-semibold text-[#26385f]">Field values</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {field.options.filter(Boolean).map((option, index) => (
            <label
              className="flex items-center gap-2 rounded-md border border-[#eee4d0] px-3 py-2 text-sm text-[#26385f]"
              key={`${option}-${index}`}
            >
              <input
                checked={selectedValues.includes(option)}
                className="h-4 w-4 accent-[#183058]"
                onChange={(event) =>
                  onMultiSelectChange(option, event.target.checked)
                }
                type="checkbox"
              />
              {option}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const typeMap: Record<string, string> = {
    date: "date",
    email: "email",
    number: "number",
    phone: "tel",
    time: "time",
    url: "url",
  };

  return (
    <TextInput
      label="Field value"
      onChange={onChange}
      type={typeMap[field.fieldType] ?? "text"}
      value={field.value}
    />
  );
}

function CustomFieldDisplayValue({
  field,
}: {
  field: PortalEvent["customFields"][number];
}) {
  const value = customFieldDisplayValue(field);

  if (field.fieldType === "url" && field.value) {
    return (
      <a
        className="font-semibold text-[#183058] underline-offset-2 hover:underline"
        href={field.value}
        rel="noreferrer"
        target="_blank"
      >
        {field.value}
      </a>
    );
  }

  if (field.fieldType === "email" && field.value) {
    return (
      <a
        className="font-semibold text-[#183058] underline-offset-2 hover:underline"
        href={`mailto:${field.value}`}
      >
        {field.value}
      </a>
    );
  }

  if (field.fieldType === "phone" && field.value) {
    return (
      <a
        className="font-semibold text-[#183058] underline-offset-2 hover:underline"
        href={`tel:${field.value}`}
      >
        {field.value}
      </a>
    );
  }

  return <>{value}</>;
}

function TextInput({
  label,
  onChange,
  value,
  type = "text",
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[#26385f]">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-[#ccb987] px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectInput<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  value: T;
}) {
  return (
    <label className="block text-sm font-semibold text-[#26385f]">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-[#ccb987] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#183058] focus:ring-2 focus:ring-[#dec071]"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EventBoard({
  busy,
  emptyMessage = "No volunteer positions to show.",
  events,
  families = [],
  heading,
  mode,
  onClaim,
  onEditEvent,
  onJoinWaitlist,
  onLeaveWaitlist,
  onRelease,
  onRequestSwap,
  origin = "",
  policySigned = true,
  summaryPanel,
  onUpdateSignup,
}: {
  busy: boolean;
  emptyMessage?: string;
  events: PortalEvent[];
  families?: FamilySummary[];
  heading?: string;
  mode: "admin" | "family";
  onClaim?: (positionId: string) => void;
  onEditEvent?: (eventId: string) => void;
  onJoinWaitlist?: (positionId: string) => void;
  onLeaveWaitlist?: (waitlistId: string) => void;
  onRelease?: (signupId: string) => void;
  onRequestSwap?: (signupId: string) => void;
  origin?: string;
  policySigned?: boolean;
  summaryPanel?: ReactNode;
  onUpdateSignup?: (signupId: string, update: AdminSignupUpdate) => void;
}) {
  return (
    <section className="space-y-4">
      {summaryPanel}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {heading ?? (mode === "admin" ? "Volunteer Events" : "Available Events")}
          </h2>
          <p className="mt-1 text-sm text-[#6f664f]">
            {events.length} events
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-[#d8c7a0] bg-white p-8 text-sm text-[#6f664f] shadow-sm">
          {emptyMessage}
        </div>
      ) : null}

      {events.map((event) => {
        const signedUps = signedUpFamilyNames(event);
        const rosterFamilies = eventFamilies(event, families);
        const rosterEmails = rosterFamilies.flatMap(familyEmails);
        const rosterPhones = rosterFamilies.flatMap(familyPhones);

        return (
          <article
            className="rounded-lg border border-[#d8c7a0] bg-white shadow-sm"
            key={event.id}
          >
            <div className="grid gap-4 border-b border-[#eee4d0] p-5 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  <span className="rounded-md bg-[#f4e5bd] px-2 py-1 text-xs font-semibold text-[#102344]">
                    {cohortLabel(event.cohort)}
                  </span>
                  <span className="rounded-md bg-[#edf3f8] px-2 py-1 text-xs font-semibold text-[#102344]">
                    {gradeLabel(event.grade)}
                  </span>
                  <span className="rounded-md bg-[#f4e5bd] px-2 py-1 text-xs font-semibold text-[#102344]">
                    {event.positions.length} jobs
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#6f664f]">
                  {event.description}
                </p>
                {event.customFields.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {event.customFields.map((field) => (
                      <p
                        className="rounded-md border border-[#eee4d0] bg-[#fbf8ef] px-3 py-2 text-sm text-[#26385f]"
                        key={field.id}
                      >
                        <span className="font-semibold">{field.label}:</span>{" "}
                        <CustomFieldDisplayValue field={field} />
                      </p>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-sm text-[#26385f]">
                  <span className="font-semibold">Signed up:</span>{" "}
                  {signedUps.length > 0 ? signedUps.join(", ") : "No one yet"}
                </p>
                {event.instructions || event.parkingInfo ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {event.instructions ? (
                      <p className="rounded-md border border-[#eee4d0] bg-[#fffaf0] px-3 py-2 text-sm text-[#26385f]">
                        <span className="font-semibold">Instructions:</span>{" "}
                        {event.instructions}
                      </p>
                    ) : null}
                    {event.parkingInfo ? (
                      <p className="rounded-md border border-[#eee4d0] bg-[#fffaf0] px-3 py-2 text-sm text-[#26385f]">
                        <span className="font-semibold">Parking:</span>{" "}
                        {event.parkingInfo}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {event.resourceLinks.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.resourceLinks.map((link) => (
                      <a
                        className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
                        href={link.url}
                        key={`${link.title}-${link.url}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                ) : null}
                {mode === "admin" && event.privateNotes ? (
                  <p className="mt-3 rounded-md border border-[#eee4d0] bg-[#fbf8ef] px-3 py-2 text-sm text-[#6f664f]">
                    <span className="font-semibold text-[#26385f]">
                      Private notes:
                    </span>{" "}
                    {event.privateNotes}
                  </p>
                ) : null}
              </div>
              <div className="text-sm text-[#26385f] md:text-right">
                <p className="font-semibold">
                  {formatDateRange(event.date, event.endDate)}
                </p>
                <p>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
                <p>{event.location}</p>
                <p className="mt-1 text-[#6f664f]">
                  Cancel cutoff: {event.cancellationDeadlineHours} hrs
                </p>
                <p className="text-[#6f664f]">
                  Reminders: {event.reminderDays.join(", ")} days
                </p>
                {mode === "admin" ? (
                  <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                    <button
                      className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
                      disabled={busy}
                      onClick={() => onEditEvent?.(event.id)}
                      type="button"
                    >
                      Edit
                    </button>
                    <a
                      className={`rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] ${
                        rosterEmails.length === 0 ? "pointer-events-none opacity-50" : ""
                      }`}
                      href={buildMailto(
                        rosterEmails,
                        `${event.title} volunteer reminder`,
                        `Thank you for volunteering for ${event.title} on ${formatDateRange(
                          event.date,
                          event.endDate
                        )}.`
                      )}
                    >
                      Email roster
                    </a>
                    <button
                      className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
                      disabled={busy || rosterPhones.length === 0}
                      onClick={() =>
                        void navigator.clipboard?.writeText(rosterPhones.join("\n"))
                      }
                      type="button"
                    >
                      Copy phones
                    </button>
                  </div>
                ) : null}
                {mode === "family" ? (
                  <a
                    className="mt-3 inline-flex rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
                    download={`${event.title}.ics`}
                    href={calendarHref(event)}
                  >
                    Add event
                  </a>
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-[#eee4d0]">
              {event.positions.map((position) => (
                <div
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"
                  key={position.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{position.title}</h4>
                      <span className="text-sm text-[#6f664f]">
                        {formatHours(position.hours)} hrs
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#6f664f]">
                      {position.description}
                    </p>
                    {requirementLabels(position).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requirementLabels(position).map((requirement) => (
                          <span
                            className="rounded-md bg-[#edf3f8] px-2 py-1 text-xs font-semibold text-[#102344]"
                            key={requirement}
                          >
                            {requirement}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {position.signup ? (
                      <p className="mt-2 text-sm text-[#26385f]">
                        <span className="font-semibold">Signed up:</span>{" "}
                        {position.signup.familyName ?? "Filled"}
                      </p>
                    ) : null}
                    {position.waitlist.length > 0 ? (
                      <p className="mt-2 text-sm text-[#6f664f]">
                        <span className="font-semibold text-[#26385f]">
                          Waitlist:
                        </span>{" "}
                        {waitlistedFamilyNames(position).join(", ")}
                      </p>
                    ) : null}
                    {position.signup?.swapRequestedAt ? (
                      <p className="mt-2 rounded-md border border-[#d8a828] bg-[#fff8e4] px-3 py-2 text-sm text-[#7a4d00]">
                        Swap requested {formatTimestamp(position.signup.swapRequestedAt)}
                      </p>
                    ) : null}
                    {mode === "admin" ? (
                      <QrCheckInPanel origin={origin} positionId={position.id} />
                    ) : null}
                  </div>

                  <PositionAction
                    busy={busy}
                    mode={mode}
                    onClaim={onClaim}
                    onJoinWaitlist={onJoinWaitlist}
                    onLeaveWaitlist={onLeaveWaitlist}
                    policySigned={policySigned}
                    onRelease={onRelease}
                    onRequestSwap={onRequestSwap}
                    onUpdateSignup={onUpdateSignup}
                    position={position}
                  />
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function QrCheckInPanel({
  origin,
  positionId,
}: {
  origin: string;
  positionId: string;
}) {
  const url = checkInUrl(origin, positionId);

  if (!url) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-[#eee4d0] bg-[#fffaf0] p-3">
      <img
        alt="QR check-in code"
        className="h-24 w-24 rounded-md border border-[#d8c7a0] bg-white p-1"
        src={qrCodeImageUrl(url)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#26385f]">QR check-in</p>
        <p className="mt-1 break-all text-xs text-[#6f664f]">{url}</p>
        <button
          className="mt-2 rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8]"
          onClick={() => void navigator.clipboard?.writeText(url)}
          type="button"
        >
          Copy link
        </button>
      </div>
    </div>
  );
}

function PositionAction({
  busy,
  mode,
  onClaim,
  onJoinWaitlist,
  onLeaveWaitlist,
  onRelease,
  onRequestSwap,
  onUpdateSignup,
  position,
}: {
  busy: boolean;
  mode: "admin" | "family";
  onClaim?: (positionId: string) => void;
  onJoinWaitlist?: (positionId: string) => void;
  onLeaveWaitlist?: (waitlistId: string) => void;
  onRelease?: (signupId: string) => void;
  onRequestSwap?: (signupId: string) => void;
  onUpdateSignup?: (signupId: string, update: AdminSignupUpdate) => void;
  position: PortalEvent["positions"][number];
}) {
  const signup = position.signup;
  const myWaitlist = position.waitlist.find((entry) => entry.isMine);

  if (mode === "admin") {
    if (!signup) {
      return (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <StatusPill status="open" />
          {position.waitlist.length > 0 ? (
            <StatusPill status="waitlist" />
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <StatusPill status={signupDisplayStatus(signup)} />
        {signup.status === "reserved" && !signup.noShowAt ? (
          <>
            <button
              className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
              disabled={busy || Boolean(signup.checkedInAt)}
              onClick={() => onUpdateSignup?.(signup.id, { action: "check_in" })}
              type="button"
            >
              Check in
            </button>
            <button
              className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
              disabled={busy || Boolean(signup.checkedOutAt)}
              onClick={() => onUpdateSignup?.(signup.id, { action: "check_out" })}
              type="button"
            >
              Check out
            </button>
          </>
        ) : null}
        {signup.status === "reserved" ? (
          <button
            className="rounded-md bg-[#183058] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#102344] disabled:opacity-50"
            disabled={busy}
            onClick={() => onUpdateSignup?.(signup.id, { status: "completed" })}
            type="button"
          >
            Sign off
          </button>
        ) : (
          <button
            className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
            disabled={busy}
            onClick={() => onUpdateSignup?.(signup.id, { status: "reserved" })}
            type="button"
          >
            Undo sign-off
          </button>
        )}
        {signup.noShowAt ? (
          <button
            className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
            disabled={busy}
            onClick={() => onUpdateSignup?.(signup.id, { action: "clear_no_show" })}
            type="button"
          >
            Clear no-show
          </button>
        ) : (
          <button
            className="rounded-md border border-[#efb4ad] px-3 py-1.5 text-sm font-semibold text-[#9f2d20] transition hover:bg-[#fff0ee] disabled:opacity-50"
            disabled={busy || signup.status === "completed"}
            onClick={() => onUpdateSignup?.(signup.id, { action: "no_show" })}
            type="button"
          >
            No-show
          </button>
        )}
        {signup.swapRequestedAt ? (
          <button
            className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
            disabled={busy}
            onClick={() => onUpdateSignup?.(signup.id, { action: "resolve_swap" })}
            type="button"
          >
            Resolve swap
          </button>
        ) : null}
      </div>
    );
  }

  if (!signup) {
    if (myWaitlist) {
      return (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <StatusPill status="waitlist" />
          <button
            className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
            disabled={busy}
            onClick={() => onLeaveWaitlist?.(myWaitlist.id)}
            type="button"
          >
            Leave waitlist
          </button>
        </div>
      );
    }

    return (
      <button
        className="rounded-md bg-[#183058] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#102344] disabled:opacity-50"
        disabled={busy || !policySigned}
        onClick={() => onClaim?.(position.id)}
        title={policySigned ? undefined : "Sign the volunteer policy first"}
        type="button"
      >
        Select
      </button>
    );
  }

  if (signup.isMine && signup.status === "reserved") {
    return (
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <StatusPill status={signupDisplayStatus(signup)} />
        <button
          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
          disabled={busy}
          onClick={() => onRelease?.(signup.id)}
          type="button"
        >
          Release
        </button>
        <button
          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
          disabled={busy || Boolean(signup.swapRequestedAt)}
          onClick={() => onRequestSwap?.(signup.id)}
          type="button"
        >
          {signup.swapRequestedAt ? "Swap requested" : "Request swap"}
        </button>
      </div>
    );
  }

  if (!signup.isMine && myWaitlist) {
    return (
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <StatusPill status="waitlist" />
        <button
          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
          disabled={busy}
          onClick={() => onLeaveWaitlist?.(myWaitlist.id)}
          type="button"
        >
          Leave waitlist
        </button>
      </div>
    );
  }

  if (!signup.isMine) {
    return (
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <StatusPill status="filled" />
        <button
          className="rounded-md border border-[#ccb987] px-3 py-1.5 text-sm font-semibold text-[#26385f] transition hover:bg-[#f5ecd8] disabled:opacity-50"
          disabled={busy || !policySigned}
          onClick={() => onJoinWaitlist?.(position.id)}
          title={policySigned ? undefined : "Sign the volunteer policy first"}
          type="button"
        >
          Join waitlist
        </button>
      </div>
    );
  }

  return <StatusPill status={signupDisplayStatus(signup)} />;
}

function StatusPill({
  status,
}: {
  status:
    | "open"
    | "filled"
    | "reserved"
    | "completed"
    | "checked_in"
    | "checked_out"
    | "no_show"
    | "waitlist"
    | "swap";
}) {
  const styles = {
    open: "bg-[#f4e5bd] text-[#102344]",
    filled: "bg-[#f5ecd8] text-[#6f664f]",
    reserved: "bg-[#fff1cf] text-[#7a4d00]",
    completed: "bg-[#e8f0df] text-[#486a2a]",
    checked_in: "bg-[#edf3f8] text-[#183058]",
    checked_out: "bg-[#e8f0df] text-[#486a2a]",
    no_show: "bg-[#fff0ee] text-[#9f2d20]",
    waitlist: "bg-[#edf3f8] text-[#183058]",
    swap: "bg-[#fff8e4] text-[#7a4d00]",
  };

  const labels = {
    open: "Open",
    filled: "Filled",
    reserved: "Pending",
    completed: "Signed off",
    checked_in: "Checked in",
    checked_out: "Checked out",
    no_show: "No-show",
    waitlist: "Waitlist",
    swap: "Swap requested",
  };

  return (
    <span
      className={`inline-flex min-w-24 justify-center rounded-md px-3 py-1.5 text-sm font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
