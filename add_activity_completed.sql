-- Migration: Add completed status to activities table
ALTER TABLE activities
ADD COLUMN completed BOOLEAN DEFAULT FALSE;

-- Add completed_at timestamp to track when activity was marked as completed
ALTER TABLE activities
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Optional: create index for faster queries on completed status
CREATE INDEX IF NOT EXISTS idx_activities_completed ON activities(completed);
