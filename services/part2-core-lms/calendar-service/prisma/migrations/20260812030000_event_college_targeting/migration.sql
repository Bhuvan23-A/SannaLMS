-- Multi-college targeting: which colleges (tenant_ids) an event is visible in.
-- Empty = creator's own college only; ['__ALL__'] = every college.
ALTER TABLE "Event" ADD COLUMN "target_tenants" TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_event_target_tenants ON "Event" USING GIN (target_tenants);
