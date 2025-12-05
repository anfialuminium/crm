-- Migration: Add edit tracking columns to activities table
-- Adds columns to store who edited a note and when.
ALTER TABLE activities
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN edited_by VARCHAR(255);

-- Optional: create index for faster queries on edited_at
CREATE INDEX IF NOT EXISTS idx_activities_edited_at ON activities(edited_at);
