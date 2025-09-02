-- Create additional_expenses table for separate expense tracking
CREATE TABLE public.additional_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  maintenance_cost NUMERIC DEFAULT 0,
  food_cost NUMERIC DEFAULT 0,
  toll_cost NUMERIC DEFAULT 0,
  parking_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.additional_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own additional expenses" 
ON public.additional_expenses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own additional expenses" 
ON public.additional_expenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own additional expenses" 
ON public.additional_expenses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own additional expenses" 
ON public.additional_expenses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_additional_expenses_updated_at
BEFORE UPDATE ON public.additional_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();