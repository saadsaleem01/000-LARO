CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open',
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "userId", "action", "resource", "entityType", "entityId", "details", "ipAddress", "userAgent", "metadata", "createdAt") SELECT "id", "userId", "action", "resource", "entityType", "entityId", "details", "ipAddress", "userAgent", "metadata", "createdAt" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_auto_collection_logs` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_auto_collection_logs`("id", "caseId", "settingsId", "userId", "runStartedAt", "runCompletedAt", "status", "emailsFound", "emailsProcessed", "filesFound", "filesDownloaded", "errorCount", "errorMessage", "executionTimeSeconds", "createdAt") SELECT "id", "caseId", "settingsId", "userId", "runStartedAt", "runCompletedAt", "status", "emailsFound", "emailsProcessed", "filesFound", "filesDownloaded", "errorCount", "errorMessage", "executionTimeSeconds", "createdAt" FROM `auto_collection_logs`;--> statement-breakpoint
DROP TABLE `auto_collection_logs`;--> statement-breakpoint
ALTER TABLE `__new_auto_collection_logs` RENAME TO `auto_collection_logs`;--> statement-breakpoint
CREATE TABLE `__new_auto_collection_settings` (
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
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_auto_collection_settings`("id", "caseId", "userId", "keywords", "keywordMatchMode", "dateRangeStart", "dateRangeEnd", "emailAccountIds", "googleDriveFolderIds", "autoDownloadAttachments", "autoDownloadGoogleDriveFiles", "isEnabled", "status", "lastRunAt", "totalItemsCollected", "totalEmailsCollected", "totalFilesCollected", "metadata", "updatedAt") SELECT "id", "caseId", "userId", "keywords", "keywordMatchMode", "dateRangeStart", "dateRangeEnd", "emailAccountIds", "googleDriveFolderIds", "autoDownloadAttachments", "autoDownloadGoogleDriveFiles", "isEnabled", "status", "lastRunAt", "totalItemsCollected", "totalEmailsCollected", "totalFilesCollected", "metadata", "updatedAt" FROM `auto_collection_settings`;--> statement-breakpoint
DROP TABLE `auto_collection_settings`;--> statement-breakpoint
ALTER TABLE `__new_auto_collection_settings` RENAME TO `auto_collection_settings`;--> statement-breakpoint
CREATE TABLE `__new_billing_periods` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_billing_periods`("id", "userId", "stripeSubscriptionId", "stripeInvoiceId", "periodStart", "periodEnd", "status", "metadata", "totalCost", "totalBilledCost", "createdAt") SELECT "id", "userId", "stripeSubscriptionId", "stripeInvoiceId", "periodStart", "periodEnd", "status", "metadata", "totalCost", "totalBilledCost", "createdAt" FROM `billing_periods`;--> statement-breakpoint
DROP TABLE `billing_periods`;--> statement-breakpoint
ALTER TABLE `__new_billing_periods` RENAME TO `billing_periods`;--> statement-breakpoint
CREATE TABLE `__new_bulk_import_jobs` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_bulk_import_jobs`("id", "userId", "filename", "status", "totalRows", "processedRows", "failedRows", "errors", "completedAt", "metadata", "createdAt") SELECT "id", "userId", "filename", "status", "totalRows", "processedRows", "failedRows", "errors", "completedAt", "metadata", "createdAt" FROM `bulk_import_jobs`;--> statement-breakpoint
DROP TABLE `bulk_import_jobs`;--> statement-breakpoint
ALTER TABLE `__new_bulk_import_jobs` RENAME TO `bulk_import_jobs`;--> statement-breakpoint
CREATE TABLE `__new_case_strength_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_case_strength_analysis`("id", "caseId", "data", "createdAt") SELECT "id", "caseId", "data", "createdAt" FROM `case_strength_analysis`;--> statement-breakpoint
DROP TABLE `case_strength_analysis`;--> statement-breakpoint
ALTER TABLE `__new_case_strength_analysis` RENAME TO `case_strength_analysis`;--> statement-breakpoint
CREATE TABLE `__new_cases` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"'
);
--> statement-breakpoint
INSERT INTO `__new_cases`("id", "userId", "clientName", "clientEmail", "clientPhone", "clientAddress", "caseType", "caseSummary", "urgency", "status", "legalAreas", "preferredLanguages", "latitude", "longitude", "metadata", "createdAt", "updatedAt") SELECT "id", "userId", "clientName", "clientEmail", "clientPhone", "clientAddress", "caseType", "caseSummary", "urgency", "status", "legalAreas", "preferredLanguages", "latitude", "longitude", "metadata", "createdAt", "updatedAt" FROM `cases`;--> statement-breakpoint
DROP TABLE `cases`;--> statement-breakpoint
ALTER TABLE `__new_cases` RENAME TO `cases`;--> statement-breakpoint
CREATE INDEX `cases_userId_idx` ON `cases` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_channel_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`provider` text,
	`status` text DEFAULT 'active',
	`lastSyncAt` integer,
	`nextSyncAt` integer,
	`syncFrequency` integer DEFAULT 3600,
	`errorMessage` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_channel_integrations`("id", "userId", "provider", "status", "lastSyncAt", "nextSyncAt", "syncFrequency", "errorMessage", "metadata", "createdAt", "updatedAt") SELECT "id", "userId", "provider", "status", "lastSyncAt", "nextSyncAt", "syncFrequency", "errorMessage", "metadata", "createdAt", "updatedAt" FROM `channel_integrations`;--> statement-breakpoint
DROP TABLE `channel_integrations`;--> statement-breakpoint
ALTER TABLE `__new_channel_integrations` RENAME TO `channel_integrations`;--> statement-breakpoint
CREATE TABLE `__new_clarification_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`question` text,
	`answer` text,
	`status` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_clarification_questions`("id", "caseId", "userId", "question", "answer", "status", "createdAt") SELECT "id", "caseId", "userId", "question", "answer", "status", "createdAt" FROM `clarification_questions`;--> statement-breakpoint
DROP TABLE `clarification_questions`;--> statement-breakpoint
ALTER TABLE `__new_clarification_questions` RENAME TO `clarification_questions`;--> statement-breakpoint
CREATE TABLE `__new_communication_gaps` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_communication_gaps`("id", "caseId", "data", "createdAt") SELECT "id", "caseId", "data", "createdAt" FROM `communication_gaps`;--> statement-breakpoint
DROP TABLE `communication_gaps`;--> statement-breakpoint
ALTER TABLE `__new_communication_gaps` RENAME TO `communication_gaps`;--> statement-breakpoint
CREATE TABLE `__new_communications` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_communications`("id", "caseId", "userId", "channel", "type", "direction", "subject", "body", "content", "timestamp", "metadata", "createdAt") SELECT "id", "caseId", "userId", "channel", "type", "direction", "subject", "body", "content", "timestamp", "metadata", "createdAt" FROM `communications`;--> statement-breakpoint
DROP TABLE `communications`;--> statement-breakpoint
ALTER TABLE `__new_communications` RENAME TO `communications`;--> statement-breakpoint
CREATE TABLE `__new_conversation_threads` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_conversation_threads`("id", "userId", "caseId", "title", "status", "priority", "participants", "channels", "firstMessageAt", "lastMessageAt", "messageCount", "unreadCount", "aiSummary", "aiTopics", "metadata", "archivedAt", "createdAt", "updatedAt") SELECT "id", "userId", "caseId", "title", "status", "priority", "participants", "channels", "firstMessageAt", "lastMessageAt", "messageCount", "unreadCount", "aiSummary", "aiTopics", "metadata", "archivedAt", "createdAt", "updatedAt" FROM `conversation_threads`;--> statement-breakpoint
DROP TABLE `conversation_threads`;--> statement-breakpoint
ALTER TABLE `__new_conversation_threads` RENAME TO `conversation_threads`;--> statement-breakpoint
CREATE TABLE `__new_deadlines` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`title` text,
	`description` text,
	`dueDate` integer,
	`completed` integer DEFAULT false,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_deadlines`("id", "caseId", "userId", "title", "description", "dueDate", "completed", "createdAt", "updatedAt") SELECT "id", "caseId", "userId", "title", "description", "dueDate", "completed", "createdAt", "updatedAt" FROM `deadlines`;--> statement-breakpoint
DROP TABLE `deadlines`;--> statement-breakpoint
ALTER TABLE `__new_deadlines` RENAME TO `deadlines`;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`title` text,
	`content` text,
	`name` text,
	`type` text,
	`folder` text,
	`uploadedAt` integer,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "caseId", "userId", "title", "content", "name", "type", "folder", "uploadedAt", "createdAt") SELECT "id", "caseId", "userId", "title", "content", "name", "type", "folder", "uploadedAt", "createdAt" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE TABLE `__new_email_accounts` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_email_accounts`("id", "userId", "provider", "email", "displayName", "accessToken", "refreshToken", "tokenExpiry", "status", "connectedAt", "metadata", "createdAt", "updatedAt") SELECT "id", "userId", "provider", "email", "displayName", "accessToken", "refreshToken", "tokenExpiry", "status", "connectedAt", "metadata", "createdAt", "updatedAt" FROM `email_accounts`;--> statement-breakpoint
DROP TABLE `email_accounts`;--> statement-breakpoint
ALTER TABLE `__new_email_accounts` RENAME TO `email_accounts`;--> statement-breakpoint
CREATE TABLE `__new_email_activity` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_email_activity`("id", "caseId", "lawyerId", "activityType", "emailType", "recipientEmail", "subject", "metadata", "responseReceived", "responseStatus", "sentAt", "createdAt") SELECT "id", "caseId", "lawyerId", "activityType", "emailType", "recipientEmail", "subject", "metadata", "responseReceived", "responseStatus", "sentAt", "createdAt" FROM `email_activity`;--> statement-breakpoint
DROP TABLE `email_activity`;--> statement-breakpoint
ALTER TABLE `__new_email_activity` RENAME TO `email_activity`;--> statement-breakpoint
CREATE TABLE `__new_email_messages` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_email_messages`("id", "accountId", "caseId", "category", "relevanceScore", "subject", "snippet", "body", "date", "metadata", "createdAt") SELECT "id", "accountId", "caseId", "category", "relevanceScore", "subject", "snippet", "body", "date", "metadata", "createdAt" FROM `email_messages`;--> statement-breakpoint
DROP TABLE `email_messages`;--> statement-breakpoint
ALTER TABLE `__new_email_messages` RENAME TO `email_messages`;--> statement-breakpoint
CREATE TABLE `__new_email_sync_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text,
	`caseId` text,
	`status` text,
	`startDate` integer,
	`endDate` integer,
	`keywords` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_email_sync_jobs`("id", "accountId", "caseId", "status", "startDate", "endDate", "keywords", "createdAt") SELECT "id", "accountId", "caseId", "status", "startDate", "endDate", "keywords", "createdAt" FROM `email_sync_jobs`;--> statement-breakpoint
DROP TABLE `email_sync_jobs`;--> statement-breakpoint
ALTER TABLE `__new_email_sync_jobs` RENAME TO `email_sync_jobs`;--> statement-breakpoint
CREATE TABLE `__new_evidence` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"'
);
--> statement-breakpoint
INSERT INTO `__new_evidence`("id", "caseId", "userId", "type", "source", "title", "description", "fileUrl", "fileName", "fileSize", "mimeType", "metadata", "tags", "relevant", "createdAt", "updatedAt") SELECT "id", "caseId", "userId", "type", "source", "title", "description", "fileUrl", "fileName", "fileSize", "mimeType", "metadata", "tags", "relevant", "createdAt", "updatedAt" FROM `evidence`;--> statement-breakpoint
DROP TABLE `evidence`;--> statement-breakpoint
ALTER TABLE `__new_evidence` RENAME TO `evidence`;--> statement-breakpoint
CREATE INDEX `evidence_caseId_idx` ON `evidence` (`caseId`);--> statement-breakpoint
CREATE INDEX `evidence_userId_idx` ON `evidence` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_evidence_files` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text NOT NULL,
	`fileType` text,
	`fileSize` text,
	`uploadSource` text DEFAULT 'manual',
	`uploadedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"',
	`fileName` text,
	`mimeType` text,
	`storageKey` text
);
--> statement-breakpoint
INSERT INTO `__new_evidence_files`("id", "caseId", "userId", "fileType", "fileSize", "uploadSource", "uploadedAt", "fileName", "mimeType", "storageKey") SELECT "id", "caseId", "userId", "fileType", "fileSize", "uploadSource", "uploadedAt", "fileName", "mimeType", "storageKey" FROM `evidence_files`;--> statement-breakpoint
DROP TABLE `evidence_files`;--> statement-breakpoint
ALTER TABLE `__new_evidence_files` RENAME TO `evidence_files`;--> statement-breakpoint
CREATE INDEX `evidence_files_user_idx` ON `evidence_files` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_evidence_items` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"'
);
--> statement-breakpoint
INSERT INTO `__new_evidence_items`("id", "caseId", "userId", "source", "sourceId", "sourceType", "fileName", "title", "description", "type", "folder", "size", "tags", "relevance", "relevanceScore", "content", "metadata", "timestamp", "uploadedAt", "createdAt", "updatedAt") SELECT "id", "caseId", "userId", "source", "sourceId", "sourceType", "fileName", "title", "description", "type", "folder", "size", "tags", "relevance", "relevanceScore", "content", "metadata", "timestamp", "uploadedAt", "createdAt", "updatedAt" FROM `evidence_items`;--> statement-breakpoint
DROP TABLE `evidence_items`;--> statement-breakpoint
ALTER TABLE `__new_evidence_items` RENAME TO `evidence_items`;--> statement-breakpoint
CREATE TABLE `__new_evidence_sources` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_evidence_sources`("id", "caseId", "userId", "provider", "sourceType", "externalId", "sourceIdentifier", "connectionStatus", "status", "accessToken", "itemsCollected", "itemCount", "lastSyncedAt", "connectedAt", "errorMessage", "metadata", "createdAt") SELECT "id", "caseId", "userId", "provider", "sourceType", "externalId", "sourceIdentifier", "connectionStatus", "status", "accessToken", "itemsCollected", "itemCount", "lastSyncedAt", "connectedAt", "errorMessage", "metadata", "createdAt" FROM `evidence_sources`;--> statement-breakpoint
DROP TABLE `evidence_sources`;--> statement-breakpoint
ALTER TABLE `__new_evidence_sources` RENAME TO `evidence_sources`;--> statement-breakpoint
CREATE TABLE `__new_evidence_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`name` text,
	`color` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_evidence_tags`("id", "userId", "name", "color", "createdAt") SELECT "id", "userId", "name", "color", "createdAt" FROM `evidence_tags`;--> statement-breakpoint
DROP TABLE `evidence_tags`;--> statement-breakpoint
ALTER TABLE `__new_evidence_tags` RENAME TO `evidence_tags`;--> statement-breakpoint
CREATE TABLE `__new_expected_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_expected_documents`("id", "caseId", "data", "createdAt") SELECT "id", "caseId", "data", "createdAt" FROM `expected_documents`;--> statement-breakpoint
DROP TABLE `expected_documents`;--> statement-breakpoint
ALTER TABLE `__new_expected_documents` RENAME TO `expected_documents`;--> statement-breakpoint
CREATE TABLE `__new_extracted_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`entityType` text,
	`value` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_extracted_entities`("id", "caseId", "userId", "entityType", "value", "metadata", "createdAt") SELECT "id", "caseId", "userId", "entityType", "value", "metadata", "createdAt" FROM `extracted_entities`;--> statement-breakpoint
DROP TABLE `extracted_entities`;--> statement-breakpoint
ALTER TABLE `__new_extracted_entities` RENAME TO `extracted_entities`;--> statement-breakpoint
CREATE TABLE `__new_google_drive_files` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_google_drive_files`("id", "userId", "caseId", "accountId", "googleFileId", "fileName", "mimeType", "fileSize", "s3Key", "s3Url", "googleWebViewLink", "googleModifiedTime", "evidenceType", "isIncluded", "relevanceScore", "category", "userNotes", "metadata", "createdAt") SELECT "id", "userId", "caseId", "accountId", "googleFileId", "fileName", "mimeType", "fileSize", "s3Key", "s3Url", "googleWebViewLink", "googleModifiedTime", "evidenceType", "isIncluded", "relevanceScore", "category", "userNotes", "metadata", "createdAt" FROM `google_drive_files`;--> statement-breakpoint
DROP TABLE `google_drive_files`;--> statement-breakpoint
ALTER TABLE `__new_google_drive_files` RENAME TO `google_drive_files`;--> statement-breakpoint
CREATE TABLE `__new_keyword_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`itemId` text,
	`itemType` text,
	`matchedKeywords` text,
	`matchCount` text,
	`source` text,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_keyword_matches`("id", "caseId", "itemId", "itemType", "matchedKeywords", "matchCount", "source", "metadata", "createdAt") SELECT "id", "caseId", "itemId", "itemType", "matchedKeywords", "matchCount", "source", "metadata", "createdAt" FROM `keyword_matches`;--> statement-breakpoint
DROP TABLE `keyword_matches`;--> statement-breakpoint
ALTER TABLE `__new_keyword_matches` RENAME TO `keyword_matches`;--> statement-breakpoint
CREATE TABLE `__new_lawyer_interactions` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_lawyer_interactions`("id", "lawyerId", "caseId", "interactionType", "outreachSentAt", "responseReceivedAt", "responseTimeHours", "responseText", "responseLength", "completenessScore", "professionalismScore", "helpfulnessScore", "clarityScore", "aiAnalysis", "acceptedCase", "declinedCase", "providedAlternatives", "askedClarifyingQuestions", "finalOutcome", "outcomeNotes", "analyzedAt", "metadata", "createdAt") SELECT "id", "lawyerId", "caseId", "interactionType", "outreachSentAt", "responseReceivedAt", "responseTimeHours", "responseText", "responseLength", "completenessScore", "professionalismScore", "helpfulnessScore", "clarityScore", "aiAnalysis", "acceptedCase", "declinedCase", "providedAlternatives", "askedClarifyingQuestions", "finalOutcome", "outcomeNotes", "analyzedAt", "metadata", "createdAt" FROM `lawyer_interactions`;--> statement-breakpoint
DROP TABLE `lawyer_interactions`;--> statement-breakpoint
ALTER TABLE `__new_lawyer_interactions` RENAME TO `lawyer_interactions`;--> statement-breakpoint
CREATE TABLE `__new_lawyer_ratings` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_lawyer_ratings`("id", "lawyerId", "overallRating", "totalInteractions", "ratingConfidence", "responseTimeScore", "completenessScore", "cooperationScore", "ratingTrend", "lastCalculatedAt", "lastInteractionAt", "averageResponseTimeHours", "fastResponses", "mediumResponses", "slowResponses", "verySlowResponses", "averageCompletenessScore", "completeAnswers", "partialAnswers", "incompleteAnswers", "averageCooperationScore", "casesAccepted", "casesDeclined", "casesNoResponse", "acceptanceRate", "metadata", "createdAt", "updatedAt") SELECT "id", "lawyerId", "overallRating", "totalInteractions", "ratingConfidence", "responseTimeScore", "completenessScore", "cooperationScore", "ratingTrend", "lastCalculatedAt", "lastInteractionAt", "averageResponseTimeHours", "fastResponses", "mediumResponses", "slowResponses", "verySlowResponses", "averageCompletenessScore", "completeAnswers", "partialAnswers", "incompleteAnswers", "averageCooperationScore", "casesAccepted", "casesDeclined", "casesNoResponse", "acceptanceRate", "metadata", "createdAt", "updatedAt" FROM `lawyer_ratings`;--> statement-breakpoint
DROP TABLE `lawyer_ratings`;--> statement-breakpoint
ALTER TABLE `__new_lawyer_ratings` RENAME TO `lawyer_ratings`;--> statement-breakpoint
CREATE TABLE `__new_lawyers` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"',
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"'
);
--> statement-breakpoint
INSERT INTO `__new_lawyers`("id", "name", "city", "firm", "firmName", "legalAreas", "email", "phone", "website", "address", "latitude", "longitude", "permanentlyFiltered", "filterUntil", "totalOutreaches", "totalResponses", "totalAcceptances", "averageResponseTimeHours", "caseLoad", "caseStop", "experienceYears", "barAssociationStatus", "currentlyAccepting", "capacityPercentage", "languages", "novaId", "createdAt", "updatedAt") SELECT "id", "name", "city", "firm", "firmName", "legalAreas", "email", "phone", "website", "address", "latitude", "longitude", "permanentlyFiltered", "filterUntil", "totalOutreaches", "totalResponses", "totalAcceptances", "averageResponseTimeHours", "caseLoad", "caseStop", "experienceYears", "barAssociationStatus", "currentlyAccepting", "capacityPercentage", "languages", "novaId", "createdAt", "updatedAt" FROM `lawyers`;--> statement-breakpoint
DROP TABLE `lawyers`;--> statement-breakpoint
ALTER TABLE `__new_lawyers` RENAME TO `lawyers`;--> statement-breakpoint
CREATE INDEX `lawyers_city_idx` ON `lawyers` (`city`);--> statement-breakpoint
CREATE TABLE `__new_legal_inferences` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_legal_inferences`("id", "caseId", "data", "createdAt") SELECT "id", "caseId", "data", "createdAt" FROM `legal_inferences`;--> statement-breakpoint
DROP TABLE `legal_inferences`;--> statement-breakpoint
ALTER TABLE `__new_legal_inferences` RENAME TO `legal_inferences`;--> statement-breakpoint
CREATE TABLE `__new_message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`name` text,
	`body` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_message_templates`("id", "userId", "name", "body", "createdAt") SELECT "id", "userId", "name", "body", "createdAt" FROM `message_templates`;--> statement-breakpoint
DROP TABLE `message_templates`;--> statement-breakpoint
ALTER TABLE `__new_message_templates` RENAME TO `message_templates`;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`caseId` text,
	`content` text,
	`threadId` text,
	`parentId` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "userId", "caseId", "content", "threadId", "parentId", "createdAt") SELECT "id", "userId", "caseId", "content", "threadId", "parentId", "createdAt" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
CREATE TABLE `__new_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`title` text,
	`body` text,
	`read` integer DEFAULT false,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "userId", "title", "body", "read", "createdAt") SELECT "id", "userId", "title", "body", "read", "createdAt" FROM `notifications`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint
CREATE TABLE `__new_outreach_status` (
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
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"',
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_outreach_status`("id", "caseId", "lawyerId", "status", "initialContact", "lastContact", "followUpsSent", "followUp1SentAt", "followUp2SentAt", "responseTimeHours", "lawyerCapacityPercentage", "acceptanceStatus", "response", "responseReceived", "notes", "distanceKm", "metadata", "updatedAt", "createdAt") SELECT "id", "caseId", "lawyerId", "status", "initialContact", "lastContact", "followUpsSent", "followUp1SentAt", "followUp2SentAt", "responseTimeHours", "lawyerCapacityPercentage", "acceptanceStatus", "response", "responseReceived", "notes", "distanceKm", "metadata", "updatedAt", "createdAt" FROM `outreach_status`;--> statement-breakpoint
DROP TABLE `outreach_status`;--> statement-breakpoint
ALTER TABLE `__new_outreach_status` RENAME TO `outreach_status`;--> statement-breakpoint
CREATE TABLE `__new_rating_calculation_logs` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_rating_calculation_logs`("id", "lawyerId", "calculationType", "interactionsAnalyzed", "previousRating", "newRating", "ratingChange", "responseTimeComponent", "completenessComponent", "cooperationComponent", "calculationDetails", "triggeredBy", "log", "createdAt") SELECT "id", "lawyerId", "calculationType", "interactionsAnalyzed", "previousRating", "newRating", "ratingChange", "responseTimeComponent", "completenessComponent", "cooperationComponent", "calculationDetails", "triggeredBy", "log", "createdAt" FROM `rating_calculation_logs`;--> statement-breakpoint
DROP TABLE `rating_calculation_logs`;--> statement-breakpoint
ALTER TABLE `__new_rating_calculation_logs` RENAME TO `rating_calculation_logs`;--> statement-breakpoint
CREATE TABLE `__new_saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text,
	`queryJson` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_saved_searches`("id", "userId", "name", "queryJson", "createdAt") SELECT "id", "userId", "name", "queryJson", "createdAt" FROM `saved_searches`;--> statement-breakpoint
DROP TABLE `saved_searches`;--> statement-breakpoint
ALTER TABLE `__new_saved_searches` RENAME TO `saved_searches`;--> statement-breakpoint
CREATE TABLE `__new_suspicious_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`data` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_suspicious_patterns`("id", "caseId", "data", "createdAt") SELECT "id", "caseId", "data", "createdAt" FROM `suspicious_patterns`;--> statement-breakpoint
DROP TABLE `suspicious_patterns`;--> statement-breakpoint
ALTER TABLE `__new_suspicious_patterns` RENAME TO `suspicious_patterns`;--> statement-breakpoint
CREATE TABLE `__new_system_config` (
	`configKey` text PRIMARY KEY NOT NULL,
	`configValue` text,
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_system_config`("configKey", "configValue", "updatedAt") SELECT "configKey", "configValue", "updatedAt" FROM `system_config`;--> statement-breakpoint
DROP TABLE `system_config`;--> statement-breakpoint
ALTER TABLE `__new_system_config` RENAME TO `system_config`;--> statement-breakpoint
CREATE TABLE `__new_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text,
	`userId` text,
	`eventType` text,
	`title` text,
	`description` text,
	`eventAt` integer,
	`metadata` text,
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_timeline`("id", "caseId", "userId", "eventType", "title", "description", "eventAt", "metadata", "createdAt") SELECT "id", "caseId", "userId", "eventType", "title", "description", "eventAt", "metadata", "createdAt" FROM `timeline`;--> statement-breakpoint
DROP TABLE `timeline`;--> statement-breakpoint
ALTER TABLE `__new_timeline` RENAME TO `timeline`;--> statement-breakpoint
CREATE TABLE `__new_unified_messages` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.455Z"'
);
--> statement-breakpoint
INSERT INTO `__new_unified_messages`("id", "userId", "caseId", "threadId", "channel", "externalId", "sender", "recipient", "subject", "body", "direction", "status", "priority", "metadata", "attachmentCount", "readAt", "sentAt", "receivedAt", "aiSubject", "aiSentiment", "aiCategory", "createdAt") SELECT "id", "userId", "caseId", "threadId", "channel", "externalId", "sender", "recipient", "subject", "body", "direction", "status", "priority", "metadata", "attachmentCount", "readAt", "sentAt", "receivedAt", "aiSubject", "aiSentiment", "aiCategory", "createdAt" FROM `unified_messages`;--> statement-breakpoint
DROP TABLE `unified_messages`;--> statement-breakpoint
ALTER TABLE `__new_unified_messages` RENAME TO `unified_messages`;--> statement-breakpoint
CREATE TABLE `__new_usage_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`tier` text,
	`resourceType` text,
	`monthlyLimit` text,
	`description` text,
	`limitsJson` text,
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_usage_limits`("id", "userId", "tier", "resourceType", "monthlyLimit", "description", "limitsJson", "updatedAt") SELECT "id", "userId", "tier", "resourceType", "monthlyLimit", "description", "limitsJson", "updatedAt" FROM `usage_limits`;--> statement-breakpoint
DROP TABLE `usage_limits`;--> statement-breakpoint
ALTER TABLE `__new_usage_limits` RENAME TO `usage_limits`;--> statement-breakpoint
CREATE TABLE `__new_usage_tracking` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"'
);
--> statement-breakpoint
INSERT INTO `__new_usage_tracking`("id", "userId", "resourceType", "quantity", "baseCost", "billedCost", "metadata", "caseId", "reportedToStripe", "stripeUsageRecordId", "timestamp", "createdAt") SELECT "id", "userId", "resourceType", "quantity", "baseCost", "billedCost", "metadata", "caseId", "reportedToStripe", "stripeUsageRecordId", "timestamp", "createdAt" FROM `usage_tracking`;--> statement-breakpoint
DROP TABLE `usage_tracking`;--> statement-breakpoint
ALTER TABLE `__new_usage_tracking` RENAME TO `usage_tracking`;--> statement-breakpoint
CREATE TABLE `__new_user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`key` text,
	`value` text,
	`theme` text,
	`dashboardWidgets` text,
	`notificationSettings` text,
	`preferredLawyers` text,
	`caseTemplates` text,
	`updatedAt` integer DEFAULT '"2026-05-13T18:24:53.454Z"',
	`userPreferences` text
);
--> statement-breakpoint
INSERT INTO `__new_user_preferences`("id", "userId", "key", "value", "theme", "dashboardWidgets", "notificationSettings", "preferredLawyers", "caseTemplates", "updatedAt", "userPreferences") SELECT "id", "userId", "key", "value", "theme", "dashboardWidgets", "notificationSettings", "preferredLawyers", "caseTemplates", "updatedAt", "userPreferences" FROM `user_preferences`;--> statement-breakpoint
DROP TABLE `user_preferences`;--> statement-breakpoint
ALTER TABLE `__new_user_preferences` RENAME TO `user_preferences`;--> statement-breakpoint
CREATE TABLE `__new_users` (
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
	`createdAt` integer DEFAULT '"2026-05-13T18:24:53.453Z"',
	`lastSignedIn` integer DEFAULT '"2026-05-13T18:24:53.453Z"'
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "password", "loginMethod", "role", "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "subscriptionTier", "emailPreferences", "paymentFailedAt", "gracePeriodEndsAt", "createdAt", "lastSignedIn") SELECT "id", "name", "email", "password", "loginMethod", "role", "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "subscriptionTier", "emailPreferences", "paymentFailedAt", "gracePeriodEndsAt", "createdAt", "lastSignedIn" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;