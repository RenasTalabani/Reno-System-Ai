-- Phase 76: Kubernetes Deployment Manager

CREATE TABLE "k8s_clusters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "provider" VARCHAR(50) NOT NULL DEFAULT 'kubernetes',
  "region" VARCHAR(100),
  "api_endpoint" TEXT,
  "kube_version" VARCHAR(50),
  "status" VARCHAR(30) NOT NULL DEFAULT 'unknown',
  "node_count" INTEGER NOT NULL DEFAULT 0,
  "cpu_capacity" VARCHAR(50),
  "mem_capacity" VARCHAR(50),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "k8s_clusters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "k8s_namespaces" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "labels" JSONB NOT NULL DEFAULT '{}',
  "annotations" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "k8s_namespaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "k8s_deployments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "namespace" VARCHAR(200) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "image" TEXT NOT NULL,
  "replicas" INTEGER NOT NULL DEFAULT 1,
  "ready_replicas" INTEGER NOT NULL DEFAULT 0,
  "strategy" VARCHAR(50) NOT NULL DEFAULT 'RollingUpdate',
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "labels" JSONB NOT NULL DEFAULT '{}',
  "env_vars" JSONB NOT NULL DEFAULT '{}',
  "resources" JSONB NOT NULL DEFAULT '{}',
  "health_check" JSONB NOT NULL DEFAULT '{}',
  "last_rollout_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "k8s_deployments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "k8s_pods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "deployment_id" UUID,
  "namespace" VARCHAR(200) NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "node_name" VARCHAR(200),
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "phase" VARCHAR(50) NOT NULL DEFAULT 'Pending',
  "cpu_usage" VARCHAR(50),
  "mem_usage" VARCHAR(50),
  "restart_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "k8s_pods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "k8s_services" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "namespace" VARCHAR(200) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "service_type" VARCHAR(50) NOT NULL DEFAULT 'ClusterIP',
  "cluster_ip" VARCHAR(50),
  "external_ip" VARCHAR(50),
  "ports" JSONB NOT NULL DEFAULT '[]',
  "selector" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "k8s_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "k8s_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cluster_id" UUID NOT NULL,
  "namespace" VARCHAR(200),
  "event_type" VARCHAR(30) NOT NULL,
  "reason" VARCHAR(200) NOT NULL,
  "message" TEXT NOT NULL,
  "object_kind" VARCHAR(50) NOT NULL,
  "object_name" VARCHAR(300) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "k8s_events_pkey" PRIMARY KEY ("id")
);

-- Unique
ALTER TABLE "k8s_namespaces" ADD CONSTRAINT "k8s_namespaces_cluster_id_name_key" UNIQUE ("cluster_id", "name");

-- Indexes
CREATE INDEX "k8s_clusters_tenant_id_idx" ON "k8s_clusters"("tenant_id");
CREATE INDEX "k8s_namespaces_tenant_id_idx" ON "k8s_namespaces"("tenant_id");
CREATE INDEX "k8s_deployments_tenant_id_cluster_id_idx" ON "k8s_deployments"("tenant_id", "cluster_id");
CREATE INDEX "k8s_pods_tenant_id_cluster_id_idx" ON "k8s_pods"("tenant_id", "cluster_id");
CREATE INDEX "k8s_services_tenant_id_cluster_id_idx" ON "k8s_services"("tenant_id", "cluster_id");
CREATE INDEX "k8s_events_tenant_id_cluster_id_idx" ON "k8s_events"("tenant_id", "cluster_id");

-- FKs
ALTER TABLE "k8s_clusters" ADD CONSTRAINT "k8s_clusters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_namespaces" ADD CONSTRAINT "k8s_namespaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_namespaces" ADD CONSTRAINT "k8s_namespaces_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "k8s_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_deployments" ADD CONSTRAINT "k8s_deployments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_deployments" ADD CONSTRAINT "k8s_deployments_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "k8s_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_pods" ADD CONSTRAINT "k8s_pods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_pods" ADD CONSTRAINT "k8s_pods_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "k8s_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_pods" ADD CONSTRAINT "k8s_pods_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "k8s_deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "k8s_services" ADD CONSTRAINT "k8s_services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_services" ADD CONSTRAINT "k8s_services_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "k8s_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_events" ADD CONSTRAINT "k8s_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "k8s_events" ADD CONSTRAINT "k8s_events_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "k8s_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;