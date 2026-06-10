alter table public.scan_analyses
  add column allowance_type text not null default 'regular';

alter table public.scan_analyses
  add constraint scan_analyses_allowance_type_check
  check (allowance_type in ('regular', 'bonus'));

create index idx_scan_analyses_student_completed_processed
  on public.scan_analyses (student_user_id, processed_at desc, created_at desc)
  where status = 'completed';
