-- Add sender tracking so staff can see the notifications they sent.
ALTER TABLE "Notification" ADD COLUMN "sender_id" TEXT;
