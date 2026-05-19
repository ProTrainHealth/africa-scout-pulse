
ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'voice_note',
  ADD COLUMN IF NOT EXISTS video_url text NOT NULL DEFAULT '';

ALTER TABLE public.briefings
  DROP CONSTRAINT IF EXISTS briefings_type_check;

ALTER TABLE public.briefings
  ADD CONSTRAINT briefings_type_check
  CHECK (type IN ('voice_note','management_call','video_boardroom'));
