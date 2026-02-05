-- =====================================================
-- Fix RLS policies for bpf_reports and related tables
-- Issue: 403 errors due to overly restrictive RLS policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view BPF reports from their org" ON public.bpf_reports;
DROP POLICY IF EXISTS "Admins can manage BPF reports" ON public.bpf_reports;
DROP POLICY IF EXISTS "Users can view BPF domains from their org" ON public.bpf_training_domains;
DROP POLICY IF EXISTS "Admins can manage BPF domains" ON public.bpf_training_domains;
DROP POLICY IF EXISTS "Users can view snapshots from their org" ON public.bpf_monthly_snapshots;
DROP POLICY IF EXISTS "System can manage snapshots" ON public.bpf_monthly_snapshots;

-- =====================================================
-- bpf_reports - Fixed policies
-- =====================================================

-- SELECT: All authenticated users can view reports from their organization
CREATE POLICY "bpf_reports_select_org"
  ON public.bpf_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT: Staff members can create reports for their organization
CREATE POLICY "bpf_reports_insert_staff"
  ON public.bpf_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'accountant', 'secretary', 'trainer')
    )
  );

-- UPDATE: Staff members can update reports from their organization
CREATE POLICY "bpf_reports_update_staff"
  ON public.bpf_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'accountant', 'secretary', 'trainer')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- DELETE: Only admins can delete reports
CREATE POLICY "bpf_reports_delete_admin"
  ON public.bpf_reports FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- bpf_training_domains - Fixed policies
-- =====================================================

-- SELECT: Users can view domains from reports they can access
CREATE POLICY "bpf_training_domains_select"
  ON public.bpf_training_domains FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bpf_reports br
      WHERE br.id = bpf_report_id
      AND br.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- INSERT: Staff can add domains to reports
CREATE POLICY "bpf_training_domains_insert"
  ON public.bpf_training_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bpf_reports br
      JOIN public.users u ON u.organization_id = br.organization_id
      WHERE br.id = bpf_report_id
      AND u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'accountant', 'secretary', 'trainer')
    )
  );

-- UPDATE: Staff can update domains
CREATE POLICY "bpf_training_domains_update"
  ON public.bpf_training_domains FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bpf_reports br
      JOIN public.users u ON u.organization_id = br.organization_id
      WHERE br.id = bpf_report_id
      AND u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'accountant', 'secretary', 'trainer')
    )
  );

-- DELETE: Admins can delete domains
CREATE POLICY "bpf_training_domains_delete"
  ON public.bpf_training_domains FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bpf_reports br
      JOIN public.users u ON u.organization_id = br.organization_id
      WHERE br.id = bpf_report_id
      AND u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- bpf_monthly_snapshots - Fixed policies
-- =====================================================

-- SELECT: Users can view snapshots from their organization
CREATE POLICY "bpf_monthly_snapshots_select"
  ON public.bpf_monthly_snapshots FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT: Staff can create snapshots
CREATE POLICY "bpf_monthly_snapshots_insert"
  ON public.bpf_monthly_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'accountant', 'secretary', 'trainer')
    )
  );

-- UPDATE: Staff can update snapshots
CREATE POLICY "bpf_monthly_snapshots_update"
  ON public.bpf_monthly_snapshots FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'accountant', 'secretary', 'trainer')
    )
  );

-- DELETE: Admins can delete snapshots
CREATE POLICY "bpf_monthly_snapshots_delete"
  ON public.bpf_monthly_snapshots FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- Add comment for documentation
-- =====================================================
COMMENT ON POLICY "bpf_reports_select_org" ON public.bpf_reports IS 'All authenticated users can view BPF reports from their organization';
COMMENT ON POLICY "bpf_reports_insert_staff" ON public.bpf_reports IS 'Staff members can create BPF reports for their organization';
COMMENT ON POLICY "bpf_reports_update_staff" ON public.bpf_reports IS 'Staff members can update BPF reports from their organization';
COMMENT ON POLICY "bpf_reports_delete_admin" ON public.bpf_reports IS 'Only admins can delete BPF reports';
