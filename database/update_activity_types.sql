-- Migration: Update activity_type check constraint
-- First, drop the existing constraint if it exists (Supabase might have created one automatically based on previous inserts or definitions)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;

-- Add a new constraint that allows all our new activity types
ALTER TABLE activities 
ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN ('הערה', 'שיחה', 'פגישה', 'מייל', 'משימה'));
