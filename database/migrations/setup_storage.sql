-- ============================================================
-- HOKAGE22B.COM — Configuração do Supabase Storage (Mural de Imagens)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Cria o Bucket público 'mural-images' para armazenar capas de anúncios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mural-images',
    'mural-images',
    true,
    5242880, -- Limite de 5MB (o front-end já compacta para ~150KB automaticamente)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Permite leitura pública de todas as fotos do bucket
DROP POLICY IF EXISTS "Leitura pública de imagens do mural" ON storage.objects;
CREATE POLICY "Leitura pública de imagens do mural"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'mural-images');

-- 3. Permite envio de fotos de anúncios para o bucket 'mural-images'
DROP POLICY IF EXISTS "Upload público de imagens para o mural" ON storage.objects;
CREATE POLICY "Upload público de imagens para o mural"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        bucket_id = 'mural-images' AND
        (storage.extension(name) = 'jpg' OR
         storage.extension(name) = 'jpeg' OR
         storage.extension(name) = 'png' OR
         storage.extension(name) = 'webp' OR
         storage.extension(name) = 'gif')
    );

