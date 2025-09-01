-- Add user preferences columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN saved_km_per_liter numeric DEFAULT NULL,
ADD COLUMN saved_fuel_price numeric DEFAULT NULL;

-- Add additional expenses columns to calculations table  
ALTER TABLE public.calculations
ADD COLUMN maintenance_cost numeric DEFAULT 0,
ADD COLUMN food_cost numeric DEFAULT 0,
ADD COLUMN toll_cost numeric DEFAULT 0,
ADD COLUMN parking_cost numeric DEFAULT 0;