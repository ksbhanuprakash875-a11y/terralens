
-- Create user_credits table
CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  credits_remaining integer NOT NULL DEFAULT 50,
  credits_used integer NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
ON public.user_credits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
ON public.user_credits FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Extend handle_new_user to also seed credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Function to reset credits if period expired
CREATE OR REPLACE FUNCTION public.maybe_reset_credits(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_credits
  SET credits_remaining = 50,
      credits_used = 0,
      period_start = date_trunc('month', now()),
      period_end = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
  WHERE user_id = p_user_id
    AND period_end <= now();
END;
$$;

-- Trigger function to deduct credits on enhancement insert
CREATE OR REPLACE FUNCTION public.deduct_credits_on_enhance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cost integer;
BEGIN
  -- Reset if period expired
  PERFORM public.maybe_reset_credits(NEW.user_id);
  
  -- Determine cost
  IF lower(NEW.model) LIKE '%gemini%' THEN
    cost := 3;
  ELSE
    cost := 1;
  END IF;
  
  -- Deduct
  UPDATE public.user_credits
  SET credits_remaining = GREATEST(credits_remaining - cost, 0),
      credits_used = credits_used + cost,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_credits
AFTER INSERT ON public.enhancement_history
FOR EACH ROW
EXECUTE FUNCTION public.deduct_credits_on_enhance();

-- Seed credits for existing users who don't have a row yet
INSERT INTO public.user_credits (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits);
