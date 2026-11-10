-- ============================================
-- FIX RLS POLICIES FOR NOTES TABLE
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/abqracafkjerlcemqnva/sql
-- ============================================

-- 1. Ensure RLS is enabled on notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public Read Access" ON public.notes;
DROP POLICY IF EXISTS "Public Insert Access" ON public.notes;
DROP POLICY IF EXISTS "Public Update Access" ON public.notes;
DROP POLICY IF EXISTS "Public Delete Access" ON public.notes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.notes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.notes;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.notes;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.notes;
DROP POLICY IF EXISTS "Allow all operations on notes" ON public.notes;

-- 3. Create full CRUD policies for public access (anon key)
CREATE POLICY "Public Read Access" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON public.notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON public.notes FOR DELETE USING (true);
