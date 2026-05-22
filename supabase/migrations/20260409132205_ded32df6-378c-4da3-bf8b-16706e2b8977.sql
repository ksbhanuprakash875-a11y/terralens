
-- Create benchmark_images table
CREATE TABLE public.benchmark_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'satellite',
  low_res_url TEXT NOT NULL,
  high_res_url TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_images ENABLE ROW LEVEL SECURITY;

-- Public read access for benchmark images
CREATE POLICY "Anyone can view benchmark images"
ON public.benchmark_images FOR SELECT
USING (true);

-- Only admins can manage benchmarks
CREATE POLICY "Admins can manage benchmark images"
ON public.benchmark_images FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for benchmark images
INSERT INTO storage.buckets (id, name, public)
VALUES ('benchmark-images', 'benchmark-images', true);

-- Public read for benchmark images bucket
CREATE POLICY "Benchmark images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'benchmark-images');

-- Only admins can upload benchmark images (via service role in edge functions)
CREATE POLICY "Service role manages benchmark images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'benchmark-images')
WITH CHECK (bucket_id = 'benchmark-images');

-- Add ground-truth metric columns to enhancement_history
ALTER TABLE public.enhancement_history
ADD COLUMN ground_truth_psnr REAL DEFAULT NULL,
ADD COLUMN ground_truth_ssim REAL DEFAULT NULL,
ADD COLUMN benchmark_image_id UUID DEFAULT NULL REFERENCES public.benchmark_images(id) ON DELETE SET NULL;
