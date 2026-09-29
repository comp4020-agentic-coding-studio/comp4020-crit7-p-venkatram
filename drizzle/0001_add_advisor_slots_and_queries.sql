CREATE TABLE `advisor_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`starts_at` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `queries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_name` text NOT NULL,
	`category` text NOT NULL,
	`details` text NOT NULL,
	`slot_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `advisor_slots`(`id`) ON UPDATE no action ON DELETE no action
);
