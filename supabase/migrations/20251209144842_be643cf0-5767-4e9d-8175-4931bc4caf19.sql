-- Add tags column to events table for storing event atmosphere, style, and type keywords
ALTER TABLE public.events ADD COLUMN tags text[] DEFAULT NULL;