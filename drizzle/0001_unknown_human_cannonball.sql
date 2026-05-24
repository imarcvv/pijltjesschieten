CREATE TABLE `darts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsorId` int,
	`sessionId` varchar(64) NOT NULL,
	`shooterName` varchar(128),
	`trajectoryData` json,
	`firedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `darts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`message` text NOT NULL,
	`clickUrl` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`color` varchar(32) NOT NULL DEFAULT '#e8d5a3',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `darts` ADD CONSTRAINT `darts_sponsorId_sponsors_id_fk` FOREIGN KEY (`sponsorId`) REFERENCES `sponsors`(`id`) ON DELETE no action ON UPDATE no action;