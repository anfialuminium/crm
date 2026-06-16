-- יצירת טבלת פתקים ורשימות
CREATE TABLE IF NOT EXISTS notes (
    note_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT,                                     -- תוכן לפתק רגיל
    is_list BOOLEAN DEFAULT FALSE,                    -- האם מדובר ברשימת משימות
    items JSONB DEFAULT '[]'::jsonb,                  -- רשימת המשימות במבנה: [{"text": "text", "completed": false}]
    color VARCHAR(50) DEFAULT '#fff9c4',             -- צבע הפתק
    is_pinned BOOLEAN DEFAULT FALSE,                  -- האם נעוץ בראש הדף
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL, -- לקוח קשור
    deal_id UUID REFERENCES deals(deal_id) ON DELETE SET NULL,             -- עסקה קשורה
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ביטול Row Level Security (RLS) כדי לאפשר גישה מהאפליקציה (כמו שאר הטבלאות במערכת)
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

-- אינדקסים לביצועים מהירים
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

