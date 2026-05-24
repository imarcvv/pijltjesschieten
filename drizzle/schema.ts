import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const sponsors = mysqlTable("sponsors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  message: text("message").notNull(),
  clickUrl: text("clickUrl").notNull(),
  active: boolean("active").default(true).notNull(),
  color: varchar("color", { length: 32 }).default("#e8d5a3").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = typeof sponsors.$inferInsert;

export const darts = mysqlTable("darts", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").references(() => sponsors.id),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  shooterName: varchar("shooterName", { length: 128 }),
  trajectoryData: json("trajectoryData"),
  firedAt: timestamp("firedAt").defaultNow().notNull(),
});

export type Dart = typeof darts.$inferSelect;
export type InsertDart = typeof darts.$inferInsert;
