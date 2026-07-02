import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    role: text("role", { enum: ["admin", "family"] }).notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    targetHours: real("target_hours").notNull().default(40),
    studentName: text("student_name").notNull().default(""),
    studentGrade: text("student_grade").notNull().default(""),
    teacherName: text("teacher_name").notNull().default(""),
    volunteerInterestsJson: text("volunteer_interests_json")
      .notNull()
      .default("[]"),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("accounts_email_unique").on(table.email)]
);

export const familyMembers = sqliteTable(
  "family_members",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    preferredContactMethod: text("preferred_contact_method", {
      enum: ["email", "phone", "both"],
    })
      .notNull()
      .default("email"),
    clearanceStatus: text("clearance_status", {
      enum: ["not_started", "pending", "cleared"],
    })
      .notNull()
      .default("not_started"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("family_members_family_id_idx").on(table.familyId)]
);

export const familyMemberPhones = sqliteTable(
  "family_member_phones",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Mobile"),
    number: text("phone_number").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("family_member_phones_member_id_idx").on(table.memberId)]
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    endDate: text("end_date").notNull().default(""),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    location: text("location").notNull(),
    cohort: text("cohort", { enum: ["all", "A", "B", "C"] })
      .notNull()
      .default("A"),
    grade: text("grade", {
      enum: [
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
      ],
    })
      .notNull()
      .default("all"),
    hours: real("hours").notNull(),
    description: text("description").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    parkingInfo: text("parking_info").notNull().default(""),
    cancellationDeadlineHours: integer("cancellation_deadline_hours")
      .notNull()
      .default(24),
    reminderDaysJson: text("reminder_days_json").notNull().default("[7,3,1]"),
    resourceLinksJson: text("resource_links_json").notNull().default("[]"),
    privateNotes: text("private_notes").notNull().default(""),
    status: text("status", { enum: ["planned", "cancelled"] })
      .notNull()
      .default("planned"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("events_date_idx").on(table.date)]
);

export const eventCustomFields = sqliteTable(
  "event_custom_fields",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    fieldType: text("field_type", {
      enum: [
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
      ],
    })
      .notNull()
      .default("text"),
    optionsJson: text("options_json").notNull().default("[]"),
    value: text("value").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("event_custom_fields_event_id_idx").on(table.eventId)]
);

export const positions = sqliteTable(
  "positions",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    hoursOverride: real("hours_override"),
    requirementsJson: text("requirements_json").notNull().default("[]"),
    clearanceRequired: integer("clearance_required", { mode: "boolean" })
      .notNull()
      .default(false),
    adultOnly: integer("adult_only", { mode: "boolean" })
      .notNull()
      .default(false),
    trainingRequired: integer("training_required", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("positions_event_id_idx").on(table.eventId)]
);

export const signups = sqliteTable(
  "signups",
  {
    id: text("id").primaryKey(),
    positionId: text("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["reserved", "completed"] })
      .notNull()
      .default("reserved"),
    claimedAt: text("claimed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
    completionRequestedAt: text("completion_requested_at"),
    checkedInAt: text("checked_in_at"),
    checkedOutAt: text("checked_out_at"),
    noShowAt: text("no_show_at"),
    swapRequestedAt: text("swap_requested_at"),
    swapNote: text("swap_note").notNull().default(""),
  },
  (table) => [
    uniqueIndex("signups_position_id_unique").on(table.positionId),
    index("signups_family_id_idx").on(table.familyId),
  ]
);

export const waitlistEntries = sqliteTable(
  "waitlist_entries",
  {
    id: text("id").primaryKey(),
    positionId: text("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["active", "promoted", "cancelled"] })
      .notNull()
      .default("active"),
    requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    index("waitlist_entries_position_id_idx").on(table.positionId),
    index("waitlist_entries_family_id_idx").on(table.familyId),
  ]
);

export const volunteerPolicies = sqliteTable(
  "volunteer_policies",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    attachmentName: text("attachment_name").notNull().default(""),
    attachmentDataUrl: text("attachment_data_url").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => accounts.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("volunteer_policies_active_idx").on(table.isActive)]
);

export const policyAcknowledgements = sqliteTable(
  "policy_acknowledgements",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => volunteerPolicies.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    signerName: text("signer_name").notNull(),
    acknowledgedAt: text("acknowledged_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("policy_acknowledgements_policy_family_unique").on(
      table.policyId,
      table.familyId
    ),
    index("policy_acknowledgements_family_id_idx").on(table.familyId),
  ]
);

export const portalDocuments = sqliteTable(
  "portal_documents",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    fileName: text("file_name").notNull(),
    fileDataUrl: text("file_data_url").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => accounts.id),
    uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("portal_documents_uploaded_at_idx").on(table.uploadedAt)]
);

export const familyDocumentSubmissions = sqliteTable(
  "family_document_submissions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => portalDocuments.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileDataUrl: text("file_data_url").notNull(),
    submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("family_document_submissions_document_family_unique").on(
      table.documentId,
      table.familyId
    ),
    index("family_document_submissions_document_id_idx").on(table.documentId),
    index("family_document_submissions_family_id_idx").on(table.familyId),
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("sessions_account_id_idx").on(table.accountId)]
);
