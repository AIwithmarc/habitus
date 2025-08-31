-- Add missing columns to user_goals table
-- Migration to support role_id, is_default, and color columns

-- Add role_id column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN role_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL;

-- Add is_default column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Add color column to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN color TEXT DEFAULT '#4F46E5';

-- Create index for role_id for better performance
CREATE INDEX idx_user_goals_role_id ON public.user_goals(role_id);

-- Update existing goals to have default values
UPDATE public.user_goals 
SET 
    is_default = false,
    color = '#4F46E5'
WHERE is_default IS NULL OR color IS NULL;

-- Add comment to document the changes
COMMENT ON COLUMN public.user_goals.role_id IS 'Reference to the role this goal belongs to';
COMMENT ON COLUMN public.user_goals.is_default IS 'Whether this is a default goal for the role';
COMMENT ON COLUMN public.user_goals.color IS 'Color code for the goal display';
