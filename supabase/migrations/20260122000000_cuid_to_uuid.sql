-- Migration: Convert CUID to UUID for all affected tables
-- IMPORTANT: Run this during downtime, backup data first!

-- ============================================================
-- STEP 1: Add new UUID columns to all tables
-- ============================================================

-- Tables with cuid as PK
ALTER TABLE aimags ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE districts ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE khoroos ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE categories ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE listings ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE listing_requests ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE notifications ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE chat_messages ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE reviews ADD COLUMN new_id UUID DEFAULT gen_random_uuid();

-- FK columns that reference cuid tables
ALTER TABLE districts ADD COLUMN new_aimag_id UUID;
ALTER TABLE khoroos ADD COLUMN new_district_id UUID;
ALTER TABLE categories ADD COLUMN new_parent_id UUID;

ALTER TABLE listings ADD COLUMN new_category_id UUID;
ALTER TABLE listings ADD COLUMN new_aimag_id UUID;
ALTER TABLE listings ADD COLUMN new_district_id UUID;
ALTER TABLE listings ADD COLUMN new_khoroo_id UUID;

ALTER TABLE listing_requests ADD COLUMN new_listing_id UUID;
ALTER TABLE listing_requests ADD COLUMN new_aimag_id UUID;
ALTER TABLE listing_requests ADD COLUMN new_district_id UUID;
ALTER TABLE listing_requests ADD COLUMN new_khoroo_id UUID;

ALTER TABLE listings_images ADD COLUMN new_listing_id UUID;
ALTER TABLE listings_views ADD COLUMN new_listing_id UUID;
ALTER TABLE user_favorites ADD COLUMN new_listing_id UUID;

ALTER TABLE notifications ADD COLUMN new_request_id UUID;
ALTER TABLE chat_messages ADD COLUMN new_request_id UUID;
ALTER TABLE reviews ADD COLUMN new_request_id UUID;

-- ============================================================
-- STEP 2: Populate new UUID values for existing rows
-- ============================================================

UPDATE aimags SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE districts SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE khoroos SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE categories SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE listings SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE listing_requests SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE notifications SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE chat_messages SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE reviews SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- ============================================================
-- STEP 3: Update FK columns with new UUIDs (mapping old cuid -> new uuid)
-- ============================================================

-- districts.aimag_id -> aimags.id
UPDATE districts d SET new_aimag_id = a.new_id FROM aimags a WHERE d.aimag_id = a.id;

-- khoroos.district_id -> districts.id
UPDATE khoroos k SET new_district_id = d.new_id FROM districts d WHERE k.district_id = d.id;

-- categories.parent_id -> categories.id (self-reference)
UPDATE categories c SET new_parent_id = p.new_id FROM categories p WHERE c.parent_id = p.id;

-- listings FKs
UPDATE listings l SET new_category_id = c.new_id FROM categories c WHERE l.category_id = c.id;
UPDATE listings l SET new_aimag_id = a.new_id FROM aimags a WHERE l.aimag_id = a.id;
UPDATE listings l SET new_district_id = d.new_id FROM districts d WHERE l.district_id = d.id;
UPDATE listings l SET new_khoroo_id = k.new_id FROM khoroos k WHERE l.khoroo_id = k.id;

-- listing_requests FKs
UPDATE listing_requests lr SET new_listing_id = l.new_id FROM listings l WHERE lr.listing_id = l.id;
UPDATE listing_requests lr SET new_aimag_id = a.new_id FROM aimags a WHERE lr.aimag_id = a.id;
UPDATE listing_requests lr SET new_district_id = d.new_id FROM districts d WHERE lr.district_id = d.id;
UPDATE listing_requests lr SET new_khoroo_id = k.new_id FROM khoroos k WHERE lr.khoroo_id = k.id;

-- listings_images.listing_id -> listings.id
UPDATE listings_images li SET new_listing_id = l.new_id FROM listings l WHERE li.listing_id = l.id;

-- listings_views.listing_id -> listings.id
UPDATE listings_views lv SET new_listing_id = l.new_id FROM listings l WHERE lv.listing_id = l.id;

-- user_favorites.listing_id -> listings.id
UPDATE user_favorites uf SET new_listing_id = l.new_id FROM listings l WHERE uf.listing_id = l.id;

-- notifications.request_id -> listing_requests.id
UPDATE notifications n SET new_request_id = lr.new_id FROM listing_requests lr WHERE n.request_id = lr.id;

-- chat_messages.request_id -> listing_requests.id
UPDATE chat_messages cm SET new_request_id = lr.new_id FROM listing_requests lr WHERE cm.request_id = lr.id;

-- reviews.request_id -> listing_requests.id
UPDATE reviews r SET new_request_id = lr.new_id FROM listing_requests lr WHERE r.request_id = lr.id;

-- ============================================================
-- STEP 4: Drop old FK constraints
-- ============================================================

ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_aimag_id_fkey;
ALTER TABLE khoroos DROP CONSTRAINT IF EXISTS khoroos_district_id_fkey;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_id_fkey;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_aimag_id_fkey;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_district_id_fkey;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_khoroo_id_fkey;

ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_listing_id_fkey;
ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_aimag_id_fkey;
ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_district_id_fkey;
ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_khoroo_id_fkey;

ALTER TABLE listings_images DROP CONSTRAINT IF EXISTS listings_images_listing_id_fkey;
ALTER TABLE listings_views DROP CONSTRAINT IF EXISTS listings_views_listing_id_fkey;
ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_listing_id_fkey;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_request_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_request_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_request_id_fkey;

-- ============================================================
-- STEP 5: Drop old PK constraints and columns, rename new columns
-- ============================================================

-- aimags
ALTER TABLE aimags DROP CONSTRAINT aimags_pkey;
ALTER TABLE aimags DROP COLUMN id;
ALTER TABLE aimags RENAME COLUMN new_id TO id;
ALTER TABLE aimags ADD PRIMARY KEY (id);

-- districts
ALTER TABLE districts DROP CONSTRAINT districts_pkey;
ALTER TABLE districts DROP COLUMN id;
ALTER TABLE districts RENAME COLUMN new_id TO id;
ALTER TABLE districts DROP COLUMN aimag_id;
ALTER TABLE districts RENAME COLUMN new_aimag_id TO aimag_id;
ALTER TABLE districts ADD PRIMARY KEY (id);

-- khoroos
ALTER TABLE khoroos DROP CONSTRAINT khoroos_pkey;
ALTER TABLE khoroos DROP COLUMN id;
ALTER TABLE khoroos RENAME COLUMN new_id TO id;
ALTER TABLE khoroos DROP COLUMN district_id;
ALTER TABLE khoroos RENAME COLUMN new_district_id TO district_id;
ALTER TABLE khoroos ADD PRIMARY KEY (id);

-- categories
ALTER TABLE categories DROP CONSTRAINT categories_pkey;
ALTER TABLE categories DROP COLUMN id;
ALTER TABLE categories RENAME COLUMN new_id TO id;
ALTER TABLE categories DROP COLUMN parent_id;
ALTER TABLE categories RENAME COLUMN new_parent_id TO parent_id;
ALTER TABLE categories ADD PRIMARY KEY (id);

-- listings
ALTER TABLE listings DROP CONSTRAINT listings_pkey;
ALTER TABLE listings DROP COLUMN id;
ALTER TABLE listings RENAME COLUMN new_id TO id;
ALTER TABLE listings DROP COLUMN category_id;
ALTER TABLE listings RENAME COLUMN new_category_id TO category_id;
ALTER TABLE listings DROP COLUMN aimag_id;
ALTER TABLE listings RENAME COLUMN new_aimag_id TO aimag_id;
ALTER TABLE listings DROP COLUMN district_id;
ALTER TABLE listings RENAME COLUMN new_district_id TO district_id;
ALTER TABLE listings DROP COLUMN khoroo_id;
ALTER TABLE listings RENAME COLUMN new_khoroo_id TO khoroo_id;
ALTER TABLE listings ADD PRIMARY KEY (id);

-- listing_requests
ALTER TABLE listing_requests DROP CONSTRAINT listing_requests_pkey;
ALTER TABLE listing_requests DROP COLUMN id;
ALTER TABLE listing_requests RENAME COLUMN new_id TO id;
ALTER TABLE listing_requests DROP COLUMN listing_id;
ALTER TABLE listing_requests RENAME COLUMN new_listing_id TO listing_id;
ALTER TABLE listing_requests DROP COLUMN aimag_id;
ALTER TABLE listing_requests RENAME COLUMN new_aimag_id TO aimag_id;
ALTER TABLE listing_requests DROP COLUMN district_id;
ALTER TABLE listing_requests RENAME COLUMN new_district_id TO district_id;
ALTER TABLE listing_requests DROP COLUMN khoroo_id;
ALTER TABLE listing_requests RENAME COLUMN new_khoroo_id TO khoroo_id;
ALTER TABLE listing_requests ADD PRIMARY KEY (id);

-- notifications
ALTER TABLE notifications DROP CONSTRAINT notifications_pkey;
ALTER TABLE notifications DROP COLUMN id;
ALTER TABLE notifications RENAME COLUMN new_id TO id;
ALTER TABLE notifications DROP COLUMN request_id;
ALTER TABLE notifications RENAME COLUMN new_request_id TO request_id;
ALTER TABLE notifications ADD PRIMARY KEY (id);

-- chat_messages
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_pkey;
ALTER TABLE chat_messages DROP COLUMN id;
ALTER TABLE chat_messages RENAME COLUMN new_id TO id;
ALTER TABLE chat_messages DROP COLUMN request_id;
ALTER TABLE chat_messages RENAME COLUMN new_request_id TO request_id;
ALTER TABLE chat_messages ADD PRIMARY KEY (id);

-- reviews
ALTER TABLE reviews DROP CONSTRAINT reviews_pkey;
ALTER TABLE reviews DROP COLUMN id;
ALTER TABLE reviews RENAME COLUMN new_id TO id;
ALTER TABLE reviews DROP COLUMN request_id;
ALTER TABLE reviews RENAME COLUMN new_request_id TO request_id;
ALTER TABLE reviews ADD PRIMARY KEY (id);

-- listings_images
ALTER TABLE listings_images DROP COLUMN listing_id;
ALTER TABLE listings_images RENAME COLUMN new_listing_id TO listing_id;

-- listings_views
ALTER TABLE listings_views DROP COLUMN listing_id;
ALTER TABLE listings_views RENAME COLUMN new_listing_id TO listing_id;

-- user_favorites
ALTER TABLE user_favorites DROP COLUMN listing_id;
ALTER TABLE user_favorites RENAME COLUMN new_listing_id TO listing_id;

-- ============================================================
-- STEP 6: Recreate FK constraints
-- ============================================================

ALTER TABLE districts ADD CONSTRAINT districts_aimag_id_fkey
    FOREIGN KEY (aimag_id) REFERENCES aimags(id) ON DELETE CASCADE;

ALTER TABLE khoroos ADD CONSTRAINT khoroos_district_id_fkey
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE;

ALTER TABLE categories ADD CONSTRAINT categories_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES categories(id);

ALTER TABLE listings ADD CONSTRAINT listings_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE listings ADD CONSTRAINT listings_aimag_id_fkey
    FOREIGN KEY (aimag_id) REFERENCES aimags(id);
ALTER TABLE listings ADD CONSTRAINT listings_district_id_fkey
    FOREIGN KEY (district_id) REFERENCES districts(id);
ALTER TABLE listings ADD CONSTRAINT listings_khoroo_id_fkey
    FOREIGN KEY (khoroo_id) REFERENCES khoroos(id);

ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_aimag_id_fkey
    FOREIGN KEY (aimag_id) REFERENCES aimags(id);
ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_district_id_fkey
    FOREIGN KEY (district_id) REFERENCES districts(id);
ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_khoroo_id_fkey
    FOREIGN KEY (khoroo_id) REFERENCES khoroos(id);

ALTER TABLE listings_images ADD CONSTRAINT listings_images_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
ALTER TABLE listings_views ADD CONSTRAINT listings_views_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT notifications_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES listing_requests(id) ON DELETE SET NULL;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES listing_requests(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES listing_requests(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 7: Recreate indexes (Prisma will handle most, but key ones here)
-- ============================================================

-- Unique constraints that were dropped
ALTER TABLE districts ADD CONSTRAINT districts_aimag_id_name_key UNIQUE (aimag_id, name);
ALTER TABLE khoroos ADD CONSTRAINT khoroos_district_id_name_key UNIQUE (district_id, name);
ALTER TABLE khoroos ADD CONSTRAINT khoroos_district_id_number_key UNIQUE (district_id, number);
ALTER TABLE reviews ADD CONSTRAINT reviews_request_id_key UNIQUE (request_id);
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_user_id_listing_id_key UNIQUE (user_id, listing_id);

-- Key indexes
CREATE INDEX IF NOT EXISTS idx_districts_aimag_id ON districts(aimag_id);
CREATE INDEX IF NOT EXISTS idx_khoroos_district_id ON khoroos(district_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_aimag_id ON listings(aimag_id);
CREATE INDEX IF NOT EXISTS idx_listing_requests_listing_id ON listing_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_images_listing_id ON listings_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_views_listing_id ON listings_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_listing_id ON user_favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_notifications_request_id ON notifications(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_id ON chat_messages(request_id);
