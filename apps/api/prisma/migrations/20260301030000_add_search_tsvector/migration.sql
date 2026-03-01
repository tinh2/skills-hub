-- Add tsvector column for full-text search
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "Skill_searchVector_idx" ON "Skill" USING GIN ("searchVector");

-- Populate search vector for existing rows
UPDATE "Skill" SET "searchVector" =
  setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'B');

-- Create trigger function to auto-update search vector on insert/update
CREATE OR REPLACE FUNCTION skill_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS skill_search_vector_trigger ON "Skill";
CREATE TRIGGER skill_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "name", "description" ON "Skill"
  FOR EACH ROW
  EXECUTE FUNCTION skill_search_vector_update();
