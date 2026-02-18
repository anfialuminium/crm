-- ============================================
-- FIX SECURITY ADVISOR WARNINGS
-- ============================================

-- 1. FIX MUTABLE SEARCH PATH FOR FUNCTIONS
-- This addresses the 'Function Search Path Mutable' warning.
-- By setting the search_path, we ensure the function always uses the correct schema.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_deal_total() SET search_path = public;
ALTER FUNCTION public.update_supplier_order_total() SET search_path = public;

-- 2. ENABLE RLS ON MISSING TABLES
-- This addresses the 'RLS Disabled in Public' warning for 'resource_links'.
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;

-- 3. FIX OVERLY PERMISSIVE (ALWAYS TRUE) POLICIES
-- We split 'FOR ALL' policies into separate SELECT, INSERT, UPDATE, DELETE policies.
-- Supabase Advisor ignores 'USING (true)' for SELECT, resolving that part of the warning.
-- Note: 'INSERT', 'UPDATE', and 'DELETE' with 'true' will still show a warning because they are public.
-- To fully resolve these, you should use Supabase Auth and change 'TO public' to 'TO authenticated'.

DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'activities', 'activity_notes', 'audit_log', 'contacts', 'customers', 
        'deal_items', 'deals', 'product_colors', 'products', 
        'supplier_order_items', 'supplier_orders', 'suppliers', 'system_settings',
        'resource_links'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- 1. DROP EXISTING POLICIES (Matches names found in your Advisor report)
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for all users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access to %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all operations on %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable access for all users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for all users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update access for all users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for all users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access to %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all operations on contacts" ON public.%I', t);
        
        -- 2. CREATE NEW SPLIT POLICIES
        -- Select is now permitted without warning
        EXECUTE format('CREATE POLICY "Public Read Access" ON public.%I FOR SELECT USING (true)', t);
        
        -- Mutations will still warn in Advisor unless restricted to authenticated users,
        -- but splitting them makes the security model clearer.
        EXECUTE format('CREATE POLICY "Public Insert Access" ON public.%I FOR INSERT WITH CHECK (true)', t);
        EXECUTE format('CREATE POLICY "Public Update Access" ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', t);
        EXECUTE format('CREATE POLICY "Public Delete Access" ON public.%I FOR DELETE USING (true)', t);
    END LOOP;
END $$;

-- 4. SPECIAL HANDLING FOR AUDIT LOG
-- Audit log should typically be insert-only for the application.
DROP POLICY IF EXISTS "Public Update Access" ON public.audit_log;
DROP POLICY IF EXISTS "Public Delete Access" ON public.audit_log;
