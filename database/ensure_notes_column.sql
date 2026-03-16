-- Migration to add notes column to deal_items and deals if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deal_items' AND column_name='notes') THEN
        ALTER TABLE deal_items ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='notes') THEN
        ALTER TABLE deals ADD COLUMN notes TEXT;
    END IF;
END $$;
