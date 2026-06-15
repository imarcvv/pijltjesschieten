import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sponsors, darts, InsertSponsor, InsertDart, Sponsor, Dart, siteSettings } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Sponsors ──────────────────────────────────────────────────────────────────

export async function getActiveSponsors(): Promise<Sponsor[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sponsors).where(eq(sponsors.active, true));
}

export async function getAllSponsors(): Promise<Sponsor[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sponsors).orderBy(desc(sponsors.createdAt));
}

export async function getSponsorById(id: number): Promise<Sponsor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
  return result[0];
}

export async function createSponsor(data: InsertSponsor): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sponsors).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateSponsor(id: number, data: Partial<InsertSponsor>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sponsors).set(data).where(eq(sponsors.id, id));
}

export async function deleteSponsor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sponsors).set({ active: false }).where(eq(sponsors.id, id));
}

// ── Darts ─────────────────────────────────────────────────────────────────────

export async function fireDart(data: InsertDart): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(darts).values(data);
  return (result[0] as any).insertId as number;
}

export async function getRecentDarts(limit = 20): Promise<(Dart & { sponsor: Sponsor | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(darts)
    .leftJoin(sponsors, eq(darts.sponsorId, sponsors.id))
    .orderBy(desc(darts.firedAt))
    .limit(limit);
  return rows.map(r => ({ ...r.darts, sponsor: r.sponsors ?? null }));
}

export async function getDartById(id: number): Promise<(Dart & { sponsor: Sponsor | null }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(darts)
    .leftJoin(sponsors, eq(darts.sponsorId, sponsors.id))
    .where(eq(darts.id, id))
    .limit(1);
  if (!rows[0]) return undefined;
  return { ...rows[0].darts, sponsor: rows[0].sponsors ?? null };
}

// ── Site Settings ────────────────────────────────────────────────────────────

export async function getSiteSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(siteSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function isSiteActive(): Promise<boolean> {
  const val = await getSiteSetting('site_active');
  return val !== 'false'; // default to true if not set
}

export async function getDartStats(): Promise<{ total: number; today: number; golden: number }> {
  const db = await getDb();
  if (!db) return { total: 0, today: 0, golden: 0 };
  const allDarts = await db.select().from(darts);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayDarts = allDarts.filter(d => new Date(d.firedAt) >= startOfDay);
  const goldenDarts = allDarts.filter(d => d.isGolden);
  return { total: allDarts.length, today: todayDarts.length, golden: goldenDarts.length };
}
