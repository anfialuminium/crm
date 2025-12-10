-- שימו לב: המערכת שלכם משתמשת בחיבור אנונימי (ללא ניהול משתמשים מלא של Supabase).
-- בעת הפעלת RLS, ברירת המחדל היא חסימת כל הגישה.
-- כדי לראות ולערוך נתונים, עליכם להוסיף מדיניות (Policy) המאפשרת גישה ציבורית לטבלאות הללו.

-- הריצו את הפקודות הבאות בעורך ה-SQL של Supabase (SQL Editor):

-- 1. טבלת ספקים (Suppliers)
CREATE POLICY "Enable access for all users" ON "public"."suppliers"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 2. טבלת הזמנות רכש (Supplier Orders)
CREATE POLICY "Enable access for all users" ON "public"."supplier_orders"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. טבלת פריטי הזמנה (Supplier Order Items)
CREATE POLICY "Enable access for all users" ON "public"."supplier_order_items"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- הערה: מדיניות זו ("USING true") מאפשרת לכל מי שמחזיק במפתח ה-API הציבורי שלכם לקרוא ולכתוב לטבלאות אלו.
-- זה תואם את המצב הנוכחי של האפליקציה (התחברות באמצעות סיסמה מקומית בקוד).
