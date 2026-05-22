
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_enhancement_inserted ON public.enhancement_history;
CREATE TRIGGER on_enhancement_inserted
  AFTER INSERT ON public.enhancement_history
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_credits_on_enhance();
