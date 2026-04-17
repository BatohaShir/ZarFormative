-- Enable Supabase Realtime for notifications table
-- This allows instant notification delivery via WebSocket

-- Add notifications table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
