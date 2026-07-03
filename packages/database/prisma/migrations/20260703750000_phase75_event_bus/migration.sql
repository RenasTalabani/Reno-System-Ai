-- Phase 75: Event Bus

CREATE TABLE "eb_streams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "partitions" INTEGER NOT NULL DEFAULT 1,
  "retention_ms" BIGINT NOT NULL DEFAULT 86400000,
  "max_msg_size" INTEGER NOT NULL DEFAULT 1048576,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "message_count" BIGINT NOT NULL DEFAULT 0,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "eb_streams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eb_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "stream_id" UUID NOT NULL,
  "partition_key" VARCHAR(200),
  "payload" JSONB NOT NULL,
  "headers" JSONB NOT NULL DEFAULT '{}',
  "offset" BIGINT NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "published_by" UUID NOT NULL,
  "processed_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eb_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eb_consumer_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "stream_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "eb_consumer_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eb_consumers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "consumer_group_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "callback_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_poll_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eb_consumers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eb_consumer_offsets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "consumer_group_id" UUID NOT NULL,
  "partition" INTEGER NOT NULL DEFAULT 0,
  "offset" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "eb_consumer_offsets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eb_dead_letters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "stream_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "headers" JSONB NOT NULL DEFAULT '{}',
  "replayed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eb_dead_letters_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "eb_streams" ADD CONSTRAINT "eb_streams_tenant_id_name_key" UNIQUE ("tenant_id", "name");
ALTER TABLE "eb_consumer_groups" ADD CONSTRAINT "eb_consumer_groups_tenant_id_stream_id_name_key" UNIQUE ("tenant_id", "stream_id", "name");
ALTER TABLE "eb_consumer_offsets" ADD CONSTRAINT "eb_consumer_offsets_consumer_group_id_partition_key" UNIQUE ("consumer_group_id", "partition");
ALTER TABLE "eb_dead_letters" ADD CONSTRAINT "eb_dead_letters_message_id_key" UNIQUE ("message_id");

-- Indexes
CREATE INDEX "eb_streams_tenant_id_idx" ON "eb_streams"("tenant_id");
CREATE INDEX "eb_messages_tenant_id_stream_id_idx" ON "eb_messages"("tenant_id", "stream_id");
CREATE INDEX "eb_messages_tenant_id_status_idx" ON "eb_messages"("tenant_id", "status");
CREATE INDEX "eb_consumer_groups_tenant_id_idx" ON "eb_consumer_groups"("tenant_id");
CREATE INDEX "eb_consumers_tenant_id_consumer_group_id_idx" ON "eb_consumers"("tenant_id", "consumer_group_id");
CREATE INDEX "eb_consumer_offsets_tenant_id_idx" ON "eb_consumer_offsets"("tenant_id");
CREATE INDEX "eb_dead_letters_tenant_id_stream_id_idx" ON "eb_dead_letters"("tenant_id", "stream_id");

-- FK constraints
ALTER TABLE "eb_streams" ADD CONSTRAINT "eb_streams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_messages" ADD CONSTRAINT "eb_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_messages" ADD CONSTRAINT "eb_messages_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "eb_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_consumer_groups" ADD CONSTRAINT "eb_consumer_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_consumer_groups" ADD CONSTRAINT "eb_consumer_groups_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "eb_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_consumers" ADD CONSTRAINT "eb_consumers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_consumers" ADD CONSTRAINT "eb_consumers_consumer_group_id_fkey" FOREIGN KEY ("consumer_group_id") REFERENCES "eb_consumer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_consumer_offsets" ADD CONSTRAINT "eb_consumer_offsets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_consumer_offsets" ADD CONSTRAINT "eb_consumer_offsets_consumer_group_id_fkey" FOREIGN KEY ("consumer_group_id") REFERENCES "eb_consumer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_dead_letters" ADD CONSTRAINT "eb_dead_letters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eb_dead_letters" ADD CONSTRAINT "eb_dead_letters_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "eb_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;