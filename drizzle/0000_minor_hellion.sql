CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`action` text,
	`resource` text,
	`entityType` text,
	`entityId` text,
	`details` text,
	`ipAddress` text,
	`userAgent` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `auto_collection_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`settingsId` text,
	`userId` text,
	`runStartedAt` integer,
	`runCompletedAt` integer,
	`status` text,
	`emailsFound` text,
	`emailsProcessed` text,
	`filesFound` text,
	`filesDownloaded` text,
	`errorCount` text,
	`errorMessage` text,
	`executionTimeSeconds` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `auto_collection_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`keywords` text,
	`keywordMatchMode` text,
	`dateRangeStart` integer,
	`dateRangeEnd` integer,
	`emailAccountIds` text,
	`googleDriveFolderIds` text,
	`autoDownloadAttachments` integer,
	`autoDownloadGoogleDriveFiles` integer,
	`isEnabled` integer DEFAULT true,
	`status` text,
	`lastRunAt` integer,
	`totalItemsCollected` text,
	`totalEmailsCollected` text,
	`totalFilesCollected` text,
	`metadata` text,
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `billing_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`stripeSubscriptionId` text,
	`stripeInvoiceId` text,
	`periodStart` integer,
	`periodEnd` integer,
	`status` text,
	`metadata` text,
	`totalCost` text,
	`totalBilledCost` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `bulk_import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`filename` text,
	`status` text,
	`totalRows` text DEFAULT '0',
	`processedRows` text DEFAULT '0',
	`failedRows` text DEFAULT '0',
	`errors` text,
	`completedAt` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `case_strength_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`clientName` text,
	`clientEmail` text,
	`clientPhone` text,
	`clientAddress` text,
	`caseType` text,
	`caseSummary` text,
	`urgency` text,
	`status` text DEFAULT 'active',
	`legalAreas` text,
	`preferredLanguages` text,
	`latitude` text,
	`longitude` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE INDEX `cases_userId_idx` ON `cases` (`userId`);--> statement-breakpoint
CREATE TABLE `channel_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`provider` text,
	`status` text DEFAULT 'active',
	`lastSyncAt` integer,
	`nextSyncAt` integer,
	`syncFrequency` integer DEFAULT 3600,
	`errorMessage` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `clarification_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`question` text,
	`answer` text,
	`status` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `communication_gaps` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`channel` text,
	`type` text,
	`direction` text,
	`subject` text,
	`body` text,
	`content` text,
	`timestamp` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `conversation_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`caseId` text,
	`title` text,
	`status` text DEFAULT 'active',
	`priority` text DEFAULT 'normal',
	`participants` text,
	`channels` text,
	`firstMessageAt` integer,
	`lastMessageAt` integer,
	`messageCount` integer DEFAULT 0,
	`unreadCount` integer DEFAULT 0,
	`aiSummary` text,
	`aiTopics` text,
	`metadata` text,
	`archivedAt` integer,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `deadlines` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`title` text,
	`description` text,
	`dueDate` integer,
	`completed` integer DEFAULT false,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`title` text,
	`content` text,
	`name` text,
	`type` text,
	`folder` text,
	`uploadedAt` integer,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `email_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`provider` text,
	`email` text,
	`displayName` text,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiry` integer,
	`status` text,
	`connectedAt` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `email_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`lawyerId` text,
	`activityType` text,
	`emailType` text,
	`recipientEmail` text,
	`subject` text,
	`metadata` text,
	`responseReceived` text,
	`responseStatus` text,
	`sentAt` integer,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `email_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text,
	`caseId` text,
	`category` text,
	`relevanceScore` text,
	`subject` text,
	`snippet` text,
	`body` text,
	`date` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `email_sync_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text,
	`caseId` text,
	`status` text,
	`startDate` integer,
	`endDate` integer,
	`keywords` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`source` text,
	`title` text NOT NULL,
	`description` text,
	`fileUrl` text,
	`fileName` text,
	`fileSize` text,
	`mimeType` text,
	`metadata` text,
	`tags` text,
	`relevant` integer DEFAULT true,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE INDEX `evidence_caseId_idx` ON `evidence` (`caseId`);--> statement-breakpoint
CREATE INDEX `evidence_userId_idx` ON `evidence` (`userId`);--> statement-breakpoint
CREATE TABLE `evidence_file_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`evidenceFileId` text,
	`tagId` text
);
--> statement-breakpoint
CREATE TABLE `evidence_files` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text NOT NULL,
	`fileType` text,
	`fileSize` text,
	`uploadSource` text DEFAULT 'manual',
	`uploadedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`fileName` text,
	`mimeType` text,
	`storageKey` text
);
--> statement-breakpoint
CREATE INDEX `evidence_files_user_idx` ON `evidence_files` (`userId`);--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`source` text,
	`sourceId` text,
	`sourceType` text,
	`fileName` text,
	`title` text,
	`description` text,
	`type` text,
	`folder` text,
	`size` text,
	`tags` text,
	`relevance` integer,
	`relevanceScore` integer,
	`content` text,
	`metadata` text,
	`timestamp` integer,
	`uploadedAt` integer,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `evidence_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`provider` text,
	`sourceType` text,
	`externalId` text,
	`sourceIdentifier` text,
	`connectionStatus` text,
	`status` text,
	`accessToken` text,
	`itemsCollected` integer,
	`itemCount` integer,
	`lastSyncedAt` integer,
	`connectedAt` integer,
	`errorMessage` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `evidence_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`name` text,
	`color` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `expected_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `extracted_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`entityType` text,
	`value` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `google_drive_files` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`caseId` text,
	`accountId` text,
	`googleFileId` text,
	`fileName` text,
	`mimeType` text,
	`fileSize` text,
	`s3Key` text,
	`s3Url` text,
	`googleWebViewLink` text,
	`googleModifiedTime` integer,
	`evidenceType` text,
	`isIncluded` text,
	`relevanceScore` text,
	`category` text,
	`userNotes` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `keyword_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`itemId` text,
	`itemType` text,
	`matchedKeywords` text,
	`matchCount` text,
	`source` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `lawyer_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`lawyerId` text NOT NULL,
	`caseId` text NOT NULL,
	`interactionType` text NOT NULL,
	`outreachSentAt` integer,
	`responseReceivedAt` integer,
	`responseTimeHours` text,
	`responseText` text,
	`responseLength` text,
	`completenessScore` text,
	`professionalismScore` text,
	`helpfulnessScore` text,
	`clarityScore` text,
	`aiAnalysis` text,
	`acceptedCase` integer DEFAULT false,
	`declinedCase` integer DEFAULT false,
	`providedAlternatives` integer DEFAULT false,
	`askedClarifyingQuestions` integer DEFAULT false,
	`finalOutcome` text DEFAULT 'pending',
	`outcomeNotes` text,
	`analyzedAt` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `lawyer_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`lawyerId` text,
	`overallRating` text NOT NULL,
	`totalInteractions` text DEFAULT '0',
	`ratingConfidence` text DEFAULT 'low',
	`responseTimeScore` text,
	`completenessScore` text,
	`cooperationScore` text,
	`ratingTrend` text DEFAULT 'stable',
	`lastCalculatedAt` integer,
	`lastInteractionAt` integer,
	`averageResponseTimeHours` text,
	`fastResponses` text DEFAULT '0',
	`mediumResponses` text DEFAULT '0',
	`slowResponses` text DEFAULT '0',
	`verySlowResponses` text DEFAULT '0',
	`averageCompletenessScore` text,
	`completeAnswers` text DEFAULT '0',
	`partialAnswers` text DEFAULT '0',
	`incompleteAnswers` text DEFAULT '0',
	`averageCooperationScore` text,
	`casesAccepted` text DEFAULT '0',
	`casesDeclined` text DEFAULT '0',
	`casesNoResponse` text DEFAULT '0',
	`acceptanceRate` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `lawyers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`city` text,
	`firm` text,
	`firmName` text,
	`legalAreas` text,
	`email` text,
	`phone` text,
	`website` text,
	`address` text,
	`latitude` text,
	`longitude` text,
	`permanentlyFiltered` text DEFAULT 'No',
	`filterUntil` integer,
	`totalOutreaches` text DEFAULT '0',
	`totalResponses` text DEFAULT '0',
	`totalAcceptances` text DEFAULT '0',
	`averageResponseTimeHours` text,
	`caseLoad` text DEFAULT '0',
	`caseStop` text DEFAULT 'No',
	`experienceYears` text DEFAULT '0',
	`barAssociationStatus` text DEFAULT 'Good Standing',
	`currentlyAccepting` text DEFAULT 'Yes',
	`capacityPercentage` text DEFAULT '0',
	`languages` text,
	`novaId` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE INDEX `lawyers_city_idx` ON `lawyers` (`city`);--> statement-breakpoint
CREATE TABLE `legal_inferences` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`name` text,
	`body` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`caseId` text,
	`content` text,
	`threadId` text,
	`parentId` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`title` text,
	`body` text,
	`read` integer DEFAULT false,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `outreach_status` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`lawyerId` text,
	`status` text,
	`initialContact` integer,
	`lastContact` integer,
	`followUpsSent` integer,
	`followUp1SentAt` integer,
	`followUp2SentAt` integer,
	`responseTimeHours` text,
	`lawyerCapacityPercentage` text,
	`acceptanceStatus` text,
	`response` text,
	`responseReceived` text DEFAULT 'No',
	`notes` text,
	`distanceKm` integer,
	`metadata` text,
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `rating_calculation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`lawyerId` text,
	`calculationType` text,
	`interactionsAnalyzed` text,
	`previousRating` text,
	`newRating` text,
	`ratingChange` text,
	`responseTimeComponent` text,
	`completenessComponent` text,
	`cooperationComponent` text,
	`calculationDetails` text,
	`triggeredBy` text,
	`log` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text,
	`queryJson` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `suspicious_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`configKey` text PRIMARY KEY NOT NULL,
	`configValue` text,
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`eventType` text,
	`title` text,
	`description` text,
	`eventAt` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `unified_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`caseId` text,
	`threadId` text,
	`channel` text,
	`externalId` text,
	`sender` text,
	`recipient` text,
	`subject` text,
	`body` text,
	`direction` text,
	`status` text DEFAULT 'received',
	`priority` text DEFAULT 'normal',
	`metadata` text,
	`attachmentCount` integer DEFAULT 0,
	`readAt` integer,
	`sentAt` integer,
	`receivedAt` integer,
	`aiSubject` text,
	`aiSentiment` text,
	`aiCategory` text,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"'
);
--> statement-breakpoint
CREATE TABLE `usage_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`tier` text,
	`resourceType` text,
	`monthlyLimit` text,
	`description` text,
	`limitsJson` text,
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `usage_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`resourceType` text,
	`quantity` text,
	`baseCost` text,
	`billedCost` text,
	`metadata` text,
	`caseId` text,
	`reportedToStripe` integer DEFAULT false,
	`stripeUsageRecordId` text,
	`timestamp` integer,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`key` text,
	`value` text,
	`theme` text,
	`dashboardWidgets` text,
	`notificationSettings` text,
	`preferredLawyers` text,
	`caseTemplates` text,
	`updatedAt` integer DEFAULT '"2026-04-04T09:47:07.197Z"',
	`userPreferences` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`password` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`subscriptionStatus` text DEFAULT 'free',
	`subscriptionTier` text DEFAULT 'free',
	`emailPreferences` text,
	`paymentFailedAt` integer,
	`gracePeriodEndsAt` integer,
	`createdAt` integer DEFAULT '"2026-04-04T09:47:07.196Z"',
	`lastSignedIn` integer DEFAULT '"2026-04-04T09:47:07.196Z"'
);
