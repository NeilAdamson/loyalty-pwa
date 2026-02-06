-- Add username column for staff login (short, memorable - replaces UUID)
-- Backfill existing staff: slugify name to create username, ensure uniqueness

-- Add column as nullable first
ALTER TABLE "staff_users" ADD COLUMN "username" TEXT;

-- Backfill: use lowercase first word of name, or full slugified name. Ensure unique per vendor.
DO $$
DECLARE
  r RECORD;
  base_username TEXT;
  final_username TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT staff_id, vendor_id, name FROM staff_users WHERE username IS NULL
  LOOP
    -- Slugify: lowercase, alphanumeric only, first 20 chars
    base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(TRIM(r.name), ' ', 1), '[^a-z0-9]', '', 'g'));
    IF base_username = '' THEN
      base_username := 'staff';
    END IF;
    base_username := LEFT(base_username, 20);
    
    final_username := base_username;
    counter := 1;
    
    -- Ensure uniqueness within vendor
    WHILE EXISTS (SELECT 1 FROM staff_users WHERE vendor_id = r.vendor_id AND username = final_username AND staff_id != r.staff_id)
    LOOP
      final_username := base_username || counter::TEXT;
      counter := counter + 1;
    END LOOP;
    
    UPDATE staff_users SET username = final_username WHERE staff_id = r.staff_id;
  END LOOP;
END $$;

-- Set NOT NULL and add unique constraint
ALTER TABLE "staff_users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "staff_users_vendor_id_username_key" ON "staff_users"("vendor_id", "username");
