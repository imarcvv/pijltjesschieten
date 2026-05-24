ALTER TABLE `darts` ADD `isGolden` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sponsors` ADD `goldenChance` float DEFAULT 0.05 NOT NULL;--> statement-breakpoint
ALTER TABLE `sponsors` ADD `prizeText` text;--> statement-breakpoint
ALTER TABLE `sponsors` ADD `prizeClaimUrl` text;