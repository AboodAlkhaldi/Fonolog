-- Reports table for generated PDF progress reports.
-- The PDF binary itself is stored in the `reports` Storage bucket.
-- This table stores the user-facing metadata so every user can browse
-- previously generated reports from the app.

CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by   uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        text NOT NULL,
  file_name    text NOT NULL,
  file_path    text NOT NULL UNIQUE,
  file_url     text,
  mime_type    text NOT NULL DEFAULT 'application/pdf',
  size_bytes   integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own_or_created" ON public.reports;
CREATE POLICY "reports_select_own_or_created" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = created_by);

DROP POLICY IF EXISTS "reports_insert_own_or_created" ON public.reports;
CREATE POLICY "reports_insert_own_or_created" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

DROP POLICY IF EXISTS "reports_update_own_or_created" ON public.reports;
CREATE POLICY "reports_update_own_or_created" ON public.reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

DROP POLICY IF EXISTS "reports_delete_own_or_created" ON public.reports;
CREATE POLICY "reports_delete_own_or_created" ON public.reports
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = created_by);
