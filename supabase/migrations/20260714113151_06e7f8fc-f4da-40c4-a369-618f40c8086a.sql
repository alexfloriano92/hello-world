CREATE POLICY "logos owner write"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'logos');

CREATE POLICY "vehicle-photos owners upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle-photos owners update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle-photos owners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle-photos public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'vehicle-photos');