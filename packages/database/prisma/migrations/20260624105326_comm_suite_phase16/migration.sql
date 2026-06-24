-- CreateTable
CREATE TABLE "comm_teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "avatar_url" VARCHAR(500),
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comm_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "team_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "topic" VARCHAR(500),
    "type" VARCHAR(50) NOT NULL DEFAULT 'public',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMP(3),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comm_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_channel_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "last_read_at" TIMESTAMP(3),
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "comm_channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID,
    "dm_conversation_id" UUID,
    "parent_message_id" UUID,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_at" TIMESTAMP(3),
    "pinned_by" UUID,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "related_entity_type" VARCHAR(100),
    "related_entity_id" UUID,
    "ai_summary" TEXT,
    "ai_action_items" JSONB,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comm_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_mentions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "mentioned_user_id" UUID NOT NULL,
    "mention_type" VARCHAR(50) NOT NULL DEFAULT 'user',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(200) NOT NULL,
    "size" INTEGER NOT NULL,
    "is_voice_note" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_dm_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255),
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comm_dm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_dm_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_dm_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_presences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'offline',
    "status_message" VARCHAR(255),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comm_presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_read_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "agenda" JSONB,
    "channel_id" UUID,
    "organizer_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'instant',
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "max_participants" INTEGER,
    "room_token" VARCHAR(500),
    "room_url" VARCHAR(1000),
    "has_recording" BOOLEAN NOT NULL DEFAULT false,
    "recording_url" VARCHAR(1000),
    "related_entity_type" VARCHAR(100),
    "related_entity_id" UUID,
    "ai_summary" TEXT,
    "ai_action_items" JSONB,
    "ai_transcript" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comm_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_meeting_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'participant',
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "has_video" BOOLEAN NOT NULL DEFAULT false,
    "has_audio" BOOLEAN NOT NULL DEFAULT false,
    "has_screen_share" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "comm_meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "team_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'normal',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comm_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_announcement_reads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_announcement_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comm_teams_tenant_id_idx" ON "comm_teams"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_team_members_tenant_id_idx" ON "comm_team_members"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_team_members_team_id_idx" ON "comm_team_members"("team_id");

-- CreateIndex
CREATE INDEX "comm_team_members_user_id_idx" ON "comm_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_team_members_team_id_user_id_key" ON "comm_team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "comm_channels_tenant_id_idx" ON "comm_channels"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_channels_tenant_id_team_id_idx" ON "comm_channels"("tenant_id", "team_id");

-- CreateIndex
CREATE INDEX "comm_channel_members_tenant_id_idx" ON "comm_channel_members"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_channel_members_channel_id_idx" ON "comm_channel_members"("channel_id");

-- CreateIndex
CREATE INDEX "comm_channel_members_user_id_idx" ON "comm_channel_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_channel_members_channel_id_user_id_key" ON "comm_channel_members"("channel_id", "user_id");

-- CreateIndex
CREATE INDEX "comm_messages_tenant_id_idx" ON "comm_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_messages_channel_id_idx" ON "comm_messages"("channel_id");

-- CreateIndex
CREATE INDEX "comm_messages_dm_conversation_id_idx" ON "comm_messages"("dm_conversation_id");

-- CreateIndex
CREATE INDEX "comm_messages_parent_message_id_idx" ON "comm_messages"("parent_message_id");

-- CreateIndex
CREATE INDEX "comm_messages_user_id_idx" ON "comm_messages"("user_id");

-- CreateIndex
CREATE INDEX "comm_reactions_tenant_id_idx" ON "comm_reactions"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_reactions_message_id_idx" ON "comm_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_reactions_message_id_user_id_emoji_key" ON "comm_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "comm_mentions_tenant_id_idx" ON "comm_mentions"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_mentions_message_id_idx" ON "comm_mentions"("message_id");

-- CreateIndex
CREATE INDEX "comm_mentions_mentioned_user_id_idx" ON "comm_mentions"("mentioned_user_id");

-- CreateIndex
CREATE INDEX "comm_attachments_tenant_id_idx" ON "comm_attachments"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_attachments_message_id_idx" ON "comm_attachments"("message_id");

-- CreateIndex
CREATE INDEX "comm_dm_conversations_tenant_id_idx" ON "comm_dm_conversations"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_dm_participants_tenant_id_idx" ON "comm_dm_participants"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_dm_participants_conversation_id_idx" ON "comm_dm_participants"("conversation_id");

-- CreateIndex
CREATE INDEX "comm_dm_participants_user_id_idx" ON "comm_dm_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_dm_participants_conversation_id_user_id_key" ON "comm_dm_participants"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "comm_presences_tenant_id_idx" ON "comm_presences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_presences_tenant_id_user_id_key" ON "comm_presences"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "comm_read_receipts_tenant_id_idx" ON "comm_read_receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_read_receipts_message_id_idx" ON "comm_read_receipts"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_read_receipts_message_id_user_id_key" ON "comm_read_receipts"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "comm_meetings_tenant_id_idx" ON "comm_meetings"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_meetings_tenant_id_status_idx" ON "comm_meetings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "comm_meetings_organizer_id_idx" ON "comm_meetings"("organizer_id");

-- CreateIndex
CREATE INDEX "comm_meeting_participants_tenant_id_idx" ON "comm_meeting_participants"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_meeting_participants_meeting_id_idx" ON "comm_meeting_participants"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_meeting_participants_meeting_id_user_id_key" ON "comm_meeting_participants"("meeting_id", "user_id");

-- CreateIndex
CREATE INDEX "comm_announcements_tenant_id_idx" ON "comm_announcements"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_announcements_tenant_id_team_id_idx" ON "comm_announcements"("tenant_id", "team_id");

-- CreateIndex
CREATE INDEX "comm_announcement_reads_tenant_id_idx" ON "comm_announcement_reads"("tenant_id");

-- CreateIndex
CREATE INDEX "comm_announcement_reads_announcement_id_idx" ON "comm_announcement_reads"("announcement_id");

-- CreateIndex
CREATE UNIQUE INDEX "comm_announcement_reads_announcement_id_user_id_key" ON "comm_announcement_reads"("announcement_id", "user_id");

-- AddForeignKey
ALTER TABLE "comm_teams" ADD CONSTRAINT "comm_teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_team_members" ADD CONSTRAINT "comm_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "comm_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_channels" ADD CONSTRAINT "comm_channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_channels" ADD CONSTRAINT "comm_channels_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "comm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_channel_members" ADD CONSTRAINT "comm_channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "comm_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_messages" ADD CONSTRAINT "comm_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_messages" ADD CONSTRAINT "comm_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "comm_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_messages" ADD CONSTRAINT "comm_messages_dm_conversation_id_fkey" FOREIGN KEY ("dm_conversation_id") REFERENCES "comm_dm_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_messages" ADD CONSTRAINT "comm_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "comm_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_reactions" ADD CONSTRAINT "comm_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "comm_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_mentions" ADD CONSTRAINT "comm_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "comm_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_attachments" ADD CONSTRAINT "comm_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "comm_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_dm_conversations" ADD CONSTRAINT "comm_dm_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_dm_participants" ADD CONSTRAINT "comm_dm_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "comm_dm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_presences" ADD CONSTRAINT "comm_presences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_read_receipts" ADD CONSTRAINT "comm_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "comm_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_meetings" ADD CONSTRAINT "comm_meetings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_meetings" ADD CONSTRAINT "comm_meetings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "comm_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_meeting_participants" ADD CONSTRAINT "comm_meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "comm_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_announcements" ADD CONSTRAINT "comm_announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_announcements" ADD CONSTRAINT "comm_announcements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "comm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_announcement_reads" ADD CONSTRAINT "comm_announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "comm_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
