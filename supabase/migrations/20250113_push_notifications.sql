-- Create profiles_push_subscriptions table
CREATE TABLE IF NOT EXISTS profiles_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Create profiles_notification_settings table
CREATE TABLE IF NOT EXISTS profiles_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Push notifications
  push_enabled BOOLEAN DEFAULT FALSE,
  push_new_requests BOOLEAN DEFAULT TRUE,
  push_new_messages BOOLEAN DEFAULT TRUE,
  push_status_changes BOOLEAN DEFAULT TRUE,

  -- Email notifications
  email_enabled BOOLEAN DEFAULT TRUE,
  email_new_requests BOOLEAN DEFAULT TRUE,
  email_new_messages BOOLEAN DEFAULT TRUE,
  email_digest BOOLEAN DEFAULT TRUE,
  email_digest_frequency TEXT DEFAULT 'daily',

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON profiles_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON profiles_notification_settings(user_id);

-- Enable RLS
ALTER TABLE profiles_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles_push_subscriptions
CREATE POLICY "Users can view own push subscriptions" ON profiles_push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON profiles_push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON profiles_push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON profiles_push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for profiles_notification_settings
CREATE POLICY "Users can view own notification settings" ON profiles_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON profiles_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON profiles_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification settings" ON profiles_notification_settings
  FOR DELETE USING (auth.uid() = user_id);
