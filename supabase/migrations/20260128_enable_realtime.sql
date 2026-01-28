-- Enable Supabase Realtime for critical tables
-- This adds tables to the supabase_realtime publication for live updates

-- Enable realtime for listing_requests (status updates, completion reports)
ALTER PUBLICATION supabase_realtime ADD TABLE listing_requests;

-- Enable realtime for chat_messages (instant messaging, read status)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable realtime for notifications (instant push)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for request_locations (live tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE request_locations;

-- Enable realtime for listings (new listings, updates)
ALTER PUBLICATION supabase_realtime ADD TABLE listings;

-- Set REPLICA IDENTITY to FULL for tables where we need OLD values in UPDATE events
-- This allows us to see what changed (old vs new values)

ALTER TABLE listing_requests REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE request_locations REPLICA IDENTITY FULL;

-- Note: Run this migration in Supabase Dashboard > SQL Editor
-- Or via: supabase db push
