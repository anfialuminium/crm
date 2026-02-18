-- שימו לב: המערכת שלכם משתמשת בחיבור אנונימי (ללא ניהול משתמשים מלא של Supabase).
-- בעת הפעלת RLS, ברירת המחדל היא חסימת כל הגישה.
-- כדי לראות ולערוך נתונים, עליכם להוסיף מדיניות (Policy) המאפשרת גישה ציבורית לטבלאות הללו.

-- הריצו את הפקודות הבאות בעורך ה-SQL של Supabase (SQL Editor):

-- 1. ניקוי הגדרות קודמות לטבלאות הספקים
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY['suppliers', 'supplier_orders', 'supplier_order_items'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable access for all users" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Public Read Access" ON public.%I FOR SELECT USING (true)', t);
        EXECUTE format('CREATE POLICY "Public Insert Access" ON public.%I FOR INSERT WITH CHECK (true)', t);
        EXECUTE format('CREATE POLICY "Public Update Access" ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', t);
        EXECUTE format('CREATE POLICY "Public Delete Access" ON public.%I FOR DELETE USING (true)', t);
    END LOOP;
END $$;

-- 2. הגדרת search_path מאובטח לפונקציות
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_deal_total() SET search_path = public;
ALTER FUNCTION public.update_supplier_order_total() SET search_path = public;

-- הערה: פיצול המדיניות (Select/Insert/Update/Delete) עוזר לפתור את האזהרות של Supabase Advisor.
-- עם זאת, גישת "true" לכתיבה עדיין תציג אזהרה כמאובטחת למחצה. לפתרון מלא מומלץ לעבור לשימוש ב-Supabase Auth.
