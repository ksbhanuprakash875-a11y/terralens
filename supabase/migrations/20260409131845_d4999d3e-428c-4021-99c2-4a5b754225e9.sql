
-- Create storage bucket for enhanced images (public read access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('enhanced-images', 'enhanced-images', true);

-- Anyone can view enhanced images (public bucket)
CREATE POLICY "Enhanced images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'enhanced-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own enhanced images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enhanced-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
CREATE POLICY "Users can delete their own enhanced images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'enhanced-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
