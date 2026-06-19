-- Fix branding image URLs stored with the incorrect /api/uploads/ prefix.
-- Public assets are served at /uploads/* (see Caddyfile and server.ts).
-- Files lost before the api_uploads volume was added cannot be recovered; affected vendors must re-upload.

UPDATE "vendor_branding"
SET "logo_url" = REPLACE("logo_url", '/api/uploads/', '/uploads/')
WHERE "logo_url" LIKE '%/api/uploads/%';

UPDATE "vendor_branding"
SET "wordmark_url" = REPLACE("wordmark_url", '/api/uploads/', '/uploads/')
WHERE "wordmark_url" LIKE '%/api/uploads/%';

UPDATE "vendor_branding"
SET "card_bg_image_url" = REPLACE("card_bg_image_url", '/api/uploads/', '/uploads/')
WHERE "card_bg_image_url" LIKE '%/api/uploads/%';
