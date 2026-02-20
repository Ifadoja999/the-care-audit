-- Add phone column to facilities table
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
