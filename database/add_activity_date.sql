-- Migration: Add activity_date column to activities table
ALTER TABLE activities
ADD COLUMN activity_date TIMESTAMP WITH TIME ZONE;

-- Optional: create index for faster queries on activity_date
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities(activity_date);
