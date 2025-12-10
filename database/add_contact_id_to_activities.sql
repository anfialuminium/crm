-- Add contact_id to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(contact_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
