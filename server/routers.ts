import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getActiveSponsors, getAllSponsors, getSponsorById,
  createSponsor, updateSponsor, deleteSponsor,
  fireDart, getRecentDarts, getDartById, getDartStats,
} from "./db";
import { storagePut } from "./storage";
import { broadcastDartEvent } from "./_core/embedBroadcast";  // SSE broadcast

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  sponsors: router({
    // Public: list active sponsors for dart assignment
    listActive: publicProcedure.query(async () => {
      return getActiveSponsors();
    }),

    // Admin: list all sponsors
    listAll: adminProcedure.query(async () => {
      return getAllSponsors();
    }),

    // Admin: create sponsor
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        logoUrl: z.string().optional(),
        message: z.string().min(1),
        clickUrl: z.string().url(),
        color: z.string().default("#e8d5a3"),
        goldenChance: z.number().min(0).max(1).default(0.05),
        prizeText: z.string().optional(),
        prizeClaimUrl: z.string().url().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createSponsor({
          name: input.name,
          logoUrl: input.logoUrl ?? null,
          message: input.message,
          clickUrl: input.clickUrl,
          color: input.color,
          active: true,
          goldenChance: input.goldenChance,
          prizeText: input.prizeText ?? null,
          prizeClaimUrl: input.prizeClaimUrl ?? null,
        });
        return { id };
      }),

    // Admin: update sponsor
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        logoUrl: z.string().optional().nullable(),
        message: z.string().min(1).optional(),
        clickUrl: z.string().url().optional(),
        color: z.string().optional(),
        active: z.boolean().optional(),
        goldenChance: z.number().min(0).max(1).optional(),
        prizeText: z.string().optional().nullable(),
        prizeClaimUrl: z.string().url().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateSponsor(id, data);
        return { success: true };
      }),

    // Admin: delete (soft delete) sponsor
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSponsor(input.id);
        return { success: true };
      }),

    // Admin: upload logo
    uploadLogo: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        base64: z.string(),
        mimeType: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `sponsors/${input.sponsorId}/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateSponsor(input.sponsorId, { logoUrl: url });
        return { url };
      }),
  }),

  darts: router({
    // Public: fire a dart
    fire: publicProcedure
      .input(z.object({
        sponsorId: z.number().optional(),
        sessionId: z.string(),
        shooterName: z.string().max(128).optional(),
        trajectoryData: z.object({
          startX: z.number(),
          startY: z.number(),
          angle: z.number(),
          speed: z.number(),
          spin: z.number(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        // Determine golden dart status server-side based on sponsor's goldenChance
        let isGolden = false;
        if (input.sponsorId) {
          const sponsor = await getSponsorById(input.sponsorId);
          if (sponsor && sponsor.goldenChance > 0) {
            isGolden = Math.random() < sponsor.goldenChance;
          }
        }
        const id = await fireDart({
          sponsorId: input.sponsorId ?? null,
          sessionId: input.sessionId,
          shooterName: input.shooterName ?? null,
          trajectoryData: input.trajectoryData ?? null,
          isGolden,
          firedAt: new Date(),
        });
        const dart = await getDartById(id);
        // Broadcast to all embed.js clients in real-time
        if (dart) {
          const sponsor = input.sponsorId ? await getSponsorById(input.sponsorId) : null;
          broadcastDartEvent({
            sponsorId:       sponsor?.id ?? null,
            sponsorName:     sponsor?.name ?? null,
            sponsorLogoUrl:  sponsor?.logoUrl ?? null,
            sponsorColor:    sponsor?.color ?? null,
            sponsorMessage:  sponsor?.message ?? null,
            sponsorClickUrl: sponsor?.clickUrl ?? null,
          });
        }
        return dart;
      }),

    // Public: get recent darts (for gallery/feed)
    recent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        return getRecentDarts(input.limit);
      }),

    // Public: get single dart
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const dart = await getDartById(input.id);
        if (!dart) throw new TRPCError({ code: "NOT_FOUND" });
        return dart;
      }),

    // Admin: stats
    stats: adminProcedure.query(async () => {
      return getDartStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
