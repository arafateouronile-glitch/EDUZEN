-- Migration pour changer la devise par défaut de XOF à EUR
-- Adaptation pour le marché français/européen

-- 1. Changer la devise par défaut dans la table courses
ALTER TABLE public.courses 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- 2. Changer la devise par défaut dans la table marketplace_templates
ALTER TABLE public.marketplace_templates 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- 3. Changer la devise par défaut dans la table marketplace_transactions
ALTER TABLE public.marketplace_transactions 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- 4. Changer la devise par défaut dans la table financial_reports
ALTER TABLE public.financial_reports 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- 5. Changer la devise par défaut dans la table financial_forecasts
ALTER TABLE public.financial_forecasts 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- 6. Changer la devise par défaut dans la table mobile_money_transactions
-- Note: Cette table peut être supprimée plus tard si on retire Mobile Money
ALTER TABLE public.mobile_money_transactions 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- 7. Mettre à jour les enregistrements existants (optionnel, commenté pour éviter les modifications de données)
-- UPDATE public.courses SET currency = 'EUR' WHERE currency = 'XOF';
-- UPDATE public.marketplace_templates SET currency = 'EUR' WHERE currency = 'XOF';
-- UPDATE public.marketplace_transactions SET currency = 'EUR' WHERE currency = 'XOF';
-- UPDATE public.financial_reports SET currency = 'EUR' WHERE currency = 'XOF';
-- UPDATE public.financial_forecasts SET currency = 'EUR' WHERE currency = 'XOF';
-- UPDATE public.mobile_money_transactions SET currency = 'EUR' WHERE currency = 'XOF';
