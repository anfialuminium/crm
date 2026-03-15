-- Add completed column to activity_notes
ALTER TABLE activity_notes ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
ALTER TABLE activity_notes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
