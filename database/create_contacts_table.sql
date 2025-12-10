-- Create contacts table for managing contact persons
-- Contacts can be linked to customers and deals

CREATE TABLE IF NOT EXISTS contacts (
    contact_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(100),  -- תפקיד (מנהל, מזכירה, רכש, וכו')
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Add contact_id to deals table to link primary contact to deal
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(contact_id) ON DELETE SET NULL;

-- Add primary_contact_id to customers table to link primary contact
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(contact_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(contact_name);
CREATE INDEX IF NOT EXISTS idx_customers_primary_contact ON customers(primary_contact_id);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists, then create
DROP POLICY IF EXISTS "Allow all operations on contacts" ON contacts;
CREATE POLICY "Allow all operations on contacts" ON contacts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE contacts IS 'Contact persons that can be linked to customers and deals';
COMMENT ON COLUMN contacts.role IS 'Job title or role of the contact person';
