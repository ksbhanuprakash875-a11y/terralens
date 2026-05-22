
-- Redeem codes table
CREATE TABLE public.redeem_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 25,
  plan_upgrade TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active unredeemed codes (needed to validate)
CREATE POLICY "Authenticated users can check codes"
  ON public.redeem_codes FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (admin via edge function)
CREATE POLICY "Service role manages codes"
  ON public.redeem_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add plan column to user_credits
ALTER TABLE public.user_credits ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';

-- Update maybe_reset_credits to respect plan
CREATE OR REPLACE FUNCTION public.maybe_reset_credits(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  user_plan TEXT;
  reset_amount INTEGER;
BEGIN
  SELECT plan INTO user_plan FROM public.user_credits WHERE user_id = p_user_id;
  
  IF user_plan = 'pro' THEN
    reset_amount := 150;
  ELSE
    reset_amount := 50;
  END IF;

  UPDATE public.user_credits
  SET credits_remaining = reset_amount,
      credits_used = 0,
      period_start = date_trunc('month', now()),
      period_end = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
  WHERE user_id = p_user_id
    AND period_end <= now();
END;
$$;
