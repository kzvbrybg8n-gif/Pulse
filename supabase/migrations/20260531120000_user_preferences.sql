-- Table des préférences utilisateur (une ligne par utilisateur).
-- Persistance des réglages tâches, pomodoro et notifications.
-- Le thème (clair/sombre) reste en localStorage côté client.

CREATE TABLE user_preferences (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Module Tâches
  reminder_default_minutes  integer,                            -- null = aucun rappel
  tasks_sort_order          text        NOT NULL DEFAULT 'created',  -- 'priority' | 'due' | 'created'
  tasks_show_completed      boolean     NOT NULL DEFAULT true,

  -- Module Pomodoro
  focus_minutes             integer     NOT NULL DEFAULT 25,
  break_minutes             integer     NOT NULL DEFAULT 5,
  long_break_minutes        integer     NOT NULL DEFAULT 15,
  long_break_interval       integer     NOT NULL DEFAULT 4,
  sound_enabled             boolean     NOT NULL DEFAULT true,

  -- Notifications
  notifications_enabled     boolean     NOT NULL DEFAULT false,
  reminders_enabled         boolean     NOT NULL DEFAULT true,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own prefs"
  ON user_preferences FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
