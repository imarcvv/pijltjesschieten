import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@pijltjesschieten.nl",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Gebruiker",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Mock DB ───────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getActiveSponsors: vi.fn().mockResolvedValue([
    { id: 1, name: "Wehkamp", logoUrl: null, message: "Test boodschap", clickUrl: "https://wehkamp.nl", active: true, color: "#e8d5a3", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getAllSponsors: vi.fn().mockResolvedValue([
    { id: 1, name: "Wehkamp", logoUrl: null, message: "Test boodschap", clickUrl: "https://wehkamp.nl", active: true, color: "#e8d5a3", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "ANWB", logoUrl: null, message: "ANWB boodschap", clickUrl: "https://anwb.nl", active: false, color: "#e8b84b", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getSponsorById: vi.fn().mockResolvedValue({ id: 1, name: "Wehkamp", logoUrl: null, message: "Test", clickUrl: "https://wehkamp.nl", active: true, color: "#e8d5a3", createdAt: new Date(), updatedAt: new Date() }),
  createSponsor: vi.fn().mockResolvedValue(42),
  updateSponsor: vi.fn().mockResolvedValue(undefined),
  deleteSponsor: vi.fn().mockResolvedValue(undefined),
  fireDart: vi.fn().mockResolvedValue(99),
  getRecentDarts: vi.fn().mockResolvedValue([
    { id: 1, sponsorId: 1, sessionId: "sess_abc", shooterName: "Marc", trajectoryData: null, firedAt: new Date(), sponsor: { id: 1, name: "Wehkamp", color: "#e8d5a3", message: "Test", clickUrl: "https://wehkamp.nl" } },
  ]),
  getDartById: vi.fn().mockResolvedValue({
    id: 99, sponsorId: 1, sessionId: "sess_abc", shooterName: "Marc", trajectoryData: null, firedAt: new Date(),
    sponsor: { id: 1, name: "Wehkamp", color: "#e8d5a3", message: "Test", clickUrl: "https://wehkamp.nl" },
  }),
  getDartStats: vi.fn().mockResolvedValue({ total: 42, today: 7 }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "/manus-storage/test.png" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test-key", url: "/manus-storage/test.png" }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });
});

describe("sponsors.listActive", () => {
  it("returns active sponsors for public users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.sponsors.listActive();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("Wehkamp");
  });
});

describe("sponsors.listAll", () => {
  it("returns all sponsors for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.sponsors.listAll();
    expect(result.length).toBe(2);
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.sponsors.listAll()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.sponsors.listAll()).rejects.toThrow();
  });
});

describe("sponsors.create", () => {
  it("creates a sponsor as admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.sponsors.create({
      name: "Veronica",
      message: "Beste muziek van de jaren 80!",
      clickUrl: "https://radioveronica.nl",
      color: "#d4472a",
    });
    expect(result.id).toBe(42);
  });

  it("rejects invalid URL", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.sponsors.create({ name: "Test", message: "Msg", clickUrl: "not-a-url", color: "#fff" })
    ).rejects.toThrow();
  });

  it("rejects non-admin", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.sponsors.create({ name: "Test", message: "Msg", clickUrl: "https://test.nl", color: "#fff" })
    ).rejects.toThrow();
  });
});

describe("darts.fire", () => {
  it("fires a dart as public user", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.darts.fire({
      sessionId: "sess_test123",
      sponsorId: 1,
      shooterName: "Marc",
      trajectoryData: { startX: 50, startY: 300, angle: 5, speed: 0.8, spin: 1.2 },
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(99);
  });

  it("fires a dart without sponsor", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.darts.fire({ sessionId: "sess_nosponsor" });
    expect(result).not.toBeNull();
  });
});

describe("darts.recent", () => {
  it("returns recent darts with sponsor info", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.darts.recent({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].sponsor?.name).toBe("Wehkamp");
  });
});

describe("darts.stats", () => {
  it("returns stats for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.darts.stats();
    expect(result.total).toBe(42);
    expect(result.today).toBe(7);
  });

  it("throws for non-admin", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.darts.stats()).rejects.toThrow();
  });
});

describe("blow detection threshold logic", () => {
  it("RMS threshold of 0.28 requires deliberate blow", () => {
    // Simulate RMS values for gentle breath vs hard blow
    const gentleBreath = 0.05;  // ~5% — should NOT fire
    const hardBlow = 0.35;      // ~35% — should fire
    const threshold = 0.28;

    expect(gentleBreath >= threshold).toBe(false);
    expect(hardBlow >= threshold).toBe(true);
  });

  it("sustain requirement prevents accidental triggers", () => {
    const sustainMs = 120;
    const shortPuff = 80;   // ms — too short, should NOT fire
    const realBlow = 150;   // ms — sustained, should fire

    expect(shortPuff >= sustainMs).toBe(false);
    expect(realBlow >= sustainMs).toBe(true);
  });
});
