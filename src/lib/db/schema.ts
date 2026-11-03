import { randomUUID } from "node:crypto";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

const id = () => text("id").primaryKey().$defaultFn(randomUUID);
const owner = () => text("user_id").notNull().references(() => user.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const taskStatus = pgEnum("task_status", ["ongoing", "in_process", "completed", "canceled"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const taskSource = pgEnum("task_source", ["web", "mcp"]);
export const activityActor = pgEnum("activity_actor", ["user", "mcp"]);
export const focusMode = pgEnum("focus_mode", ["focus", "short", "long"]);

export const project = pgTable(
  "project",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull(),
    key: text("key").notNull(),
    description: text("description"),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    template: text("template"),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    budgetHours: integer("budget_hours"),
    taskSeq: integer("task_seq").default(0).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [unique().on(table.userId, table.key)],
);

export const milestone = pgTable(
  "milestone",
  {
    id: id(),
    projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dueDate: date("due_date"),
    createdAt: createdAt(),
  },
  (table) => [index("milestone_project_idx").on(table.projectId)],
);

export const category = pgTable(
  "category",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique().on(table.userId, table.name)],
);

export const task = pgTable(
  "task",
  {
    id: id(),
    userId: owner(),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    milestoneId: text("milestone_id").references(() => milestone.id, { onDelete: "set null" }),
    number: integer("number"),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").default("ongoing").notNull(),
    priority: taskPriority("priority").default("medium").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    dueHasTime: boolean("due_has_time").default(false).notNull(),
    plannedAt: timestamp("planned_at", { withTimezone: true }),
    durationMin: integer("duration_min"),
    estimateMin: integer("estimate_min"),
    alertEnabled: boolean("alert_enabled").default(false).notNull(),
    position: doublePrecision("position").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    source: taskSource("source").default("web").notNull(),
    clientRequestId: text("client_request_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("task_user_status_idx").on(table.userId, table.status, table.position),
    unique().on(table.projectId, table.number),
    unique().on(table.userId, table.clientRequestId),
  ],
);

export const taskCategory = pgTable(
  "task_category",
  {
    taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => category.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.categoryId] })],
);

export const subtask = pgTable(
  "subtask",
  {
    id: id(),
    taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: boolean("done").default(false).notNull(),
    position: doublePrecision("position").notNull(),
  },
  (table) => [index("subtask_task_idx").on(table.taskId)],
);

export const activity = pgTable(
  "activity",
  {
    id: id(),
    taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
    actor: activityActor("actor").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload"),
    createdAt: createdAt(),
  },
  (table) => [index("activity_task_idx").on(table.taskId, table.createdAt)],
);

export const focusSession = pgTable(
  "focus_session",
  {
    // Made by the browser, so sending a session twice stores it once.
    id: text("id").primaryKey(),
    userId: owner(),
    taskId: text("task_id").references(() => task.id, { onDelete: "set null" }),
    mode: focusMode("mode").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    seconds: integer("seconds").notNull(),
    completed: boolean("completed").notNull(),
  },
  (table) => [index("focus_session_user_ended_idx").on(table.userId, table.endedAt), index("focus_session_task_idx").on(table.taskId)],
);
