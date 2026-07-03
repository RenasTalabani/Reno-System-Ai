-- Phase 79: Message Queue Cluster

CREATE TABLE "qc_clusters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "engine" VARCHAR(30) NOT NULL DEFAULT 'rabbitmq',
  "status" VARCHAR(30) NOT NULL DEFAULT 'provisioning',
  "node_count" INTEGER NOT NULL DEFAULT 3,
  "version" VARCHAR(30) NOT NULL DEFAULT '3.13',
  "ha_mode" VARCHAR(30) NOT NULL DEFAULT 'mirrored',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qc_clusters_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qc_clusters_tenant_id_idx" ON "qc_clusters"("tenant_id");
ALTER TABLE "qc_clusters" ADD CONSTRAINT "qc_clusters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "qc_nodes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "role" VARCHAR(30) NOT NULL DEFAULT 'follower',
  "status" VARCHAR(30) NOT NULL DEFAULT 'running',
  "cpu_usage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mem_usage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "disk_usage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qc_nodes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qc_nodes_tenant_id_cluster_id_idx" ON "qc_nodes"("tenant_id","cluster_id");
ALTER TABLE "qc_nodes" ADD CONSTRAINT "qc_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "qc_nodes" ADD CONSTRAINT "qc_nodes_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "qc_clusters"("id") ON DELETE CASCADE;

CREATE TABLE "qc_queues" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "queue_type" VARCHAR(30) NOT NULL DEFAULT 'classic',
  "durable" BOOLEAN NOT NULL DEFAULT true,
  "max_length" INTEGER,
  "message_count" INTEGER NOT NULL DEFAULT 0,
  "consumer_count" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qc_queues_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "qc_queues_tenant_id_cluster_id_name_key" ON "qc_queues"("tenant_id","cluster_id","name");
CREATE INDEX "qc_queues_tenant_id_cluster_id_idx" ON "qc_queues"("tenant_id","cluster_id");
ALTER TABLE "qc_queues" ADD CONSTRAINT "qc_queues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "qc_queues" ADD CONSTRAINT "qc_queues_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "qc_clusters"("id") ON DELETE CASCADE;

CREATE TABLE "qc_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "queue_id" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(30) NOT NULL DEFAULT 'ready',
  "delivered_at" TIMESTAMPTZ,
  "acked_at" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qc_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qc_messages_tenant_id_queue_id_status_idx" ON "qc_messages"("tenant_id","queue_id","status");
ALTER TABLE "qc_messages" ADD CONSTRAINT "qc_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "qc_messages" ADD CONSTRAINT "qc_messages_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "qc_queues"("id") ON DELETE CASCADE;

CREATE TABLE "qc_consumers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "queue_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "prefetch" INTEGER NOT NULL DEFAULT 10,
  "acked_count" INTEGER NOT NULL DEFAULT 0,
  "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qc_consumers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qc_consumers_tenant_id_queue_id_idx" ON "qc_consumers"("tenant_id","queue_id");
ALTER TABLE "qc_consumers" ADD CONSTRAINT "qc_consumers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "qc_consumers" ADD CONSTRAINT "qc_consumers_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "qc_queues"("id") ON DELETE CASCADE;

CREATE TABLE "qc_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "alert_type" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
  "message" TEXT NOT NULL,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qc_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qc_alerts_tenant_id_cluster_id_idx" ON "qc_alerts"("tenant_id","cluster_id");
ALTER TABLE "qc_alerts" ADD CONSTRAINT "qc_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "qc_alerts" ADD CONSTRAINT "qc_alerts_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "qc_clusters"("id") ON DELETE CASCADE;