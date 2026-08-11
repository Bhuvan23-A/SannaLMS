-- Multi-college targeting: which colleges (tenant_ids) a forum / chat room is
-- visible in. Empty = creator's own college only; ['__ALL__'] = every college.
ALTER TABLE "Forum" ADD COLUMN "target_tenants" TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_forum_target_tenants ON "Forum" USING GIN (target_tenants);

ALTER TABLE "ChatRoom" ADD COLUMN "target_tenants" TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_chatroom_target_tenants ON "ChatRoom" USING GIN (target_tenants);
