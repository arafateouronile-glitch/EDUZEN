-- Migration pour ajouter la géolocalisation à l'émargement

-- 1. Ajouter les colonnes de géolocalisation à la table attendance
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(10, 2), -- Précision en mètres
ADD COLUMN IF NOT EXISTS location_address TEXT, -- Adresse résolue (optionnel)
ADD COLUMN IF NOT EXISTS location_method TEXT DEFAULT 'manual', -- 'manual', 'qr_code', 'gps', 'ip'
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false; -- Vérification de la localisation

-- 2. Ajouter les colonnes de géolocalisation à la table sessions (si elles n'existent pas)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS require_location_for_attendance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_attendance_radius_meters INTEGER DEFAULT NULL; -- Rayon autorisé en mètres

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_attendance_location ON public.attendance(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_location ON public.sessions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Fonction pour calculer la distance entre deux points GPS (formule de Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R DECIMAL := 6371000; -- Rayon de la Terre en mètres
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convertir les degrés en radians
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  -- Formule de Haversine
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon / 2) * SIN(dlon / 2);
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN R * c;
END;
$$;

-- 5. Fonction pour vérifier si une localisation est dans le rayon autorisé
CREATE OR REPLACE FUNCTION is_location_within_radius(
  session_lat DECIMAL,
  session_lon DECIMAL,
  attendance_lat DECIMAL,
  attendance_lon DECIMAL,
  radius_meters INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  distance DECIMAL;
BEGIN
  IF session_lat IS NULL OR session_lon IS NULL OR attendance_lat IS NULL OR attendance_lon IS NULL THEN
    RETURN false;
  END IF;
  
  distance := calculate_distance_meters(session_lat, session_lon, attendance_lat, attendance_lon);
  
  RETURN distance <= radius_meters;
END;
$$;

-- 6. Commentaires pour la documentation
COMMENT ON COLUMN public.attendance.latitude IS 'Latitude GPS de l''émargement';
COMMENT ON COLUMN public.attendance.longitude IS 'Longitude GPS de l''émargement';
COMMENT ON COLUMN public.attendance.location_accuracy IS 'Précision de la localisation en mètres';
COMMENT ON COLUMN public.attendance.location_address IS 'Adresse résolue depuis les coordonnées GPS';
COMMENT ON COLUMN public.attendance.location_method IS 'Méthode de capture de la localisation (manual, qr_code, gps, ip)';
COMMENT ON COLUMN public.attendance.location_verified IS 'Indique si la localisation a été vérifiée comme étant dans le rayon autorisé';
COMMENT ON COLUMN public.sessions.latitude IS 'Latitude GPS du lieu de la session';
COMMENT ON COLUMN public.sessions.longitude IS 'Longitude GPS du lieu de la session';
COMMENT ON COLUMN public.sessions.require_location_for_attendance IS 'Exiger la géolocalisation pour l''émargement';
COMMENT ON COLUMN public.sessions.allowed_attendance_radius_meters IS 'Rayon autorisé en mètres pour l''émargement';



-- 1. Ajouter les colonnes de géolocalisation à la table attendance
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(10, 2), -- Précision en mètres
ADD COLUMN IF NOT EXISTS location_address TEXT, -- Adresse résolue (optionnel)
ADD COLUMN IF NOT EXISTS location_method TEXT DEFAULT 'manual', -- 'manual', 'qr_code', 'gps', 'ip'
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false; -- Vérification de la localisation

-- 2. Ajouter les colonnes de géolocalisation à la table sessions (si elles n'existent pas)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS require_location_for_attendance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_attendance_radius_meters INTEGER DEFAULT NULL; -- Rayon autorisé en mètres

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_attendance_location ON public.attendance(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_location ON public.sessions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Fonction pour calculer la distance entre deux points GPS (formule de Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R DECIMAL := 6371000; -- Rayon de la Terre en mètres
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convertir les degrés en radians
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  -- Formule de Haversine
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon / 2) * SIN(dlon / 2);
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN R * c;
END;
$$;

-- 5. Fonction pour vérifier si une localisation est dans le rayon autorisé
CREATE OR REPLACE FUNCTION is_location_within_radius(
  session_lat DECIMAL,
  session_lon DECIMAL,
  attendance_lat DECIMAL,
  attendance_lon DECIMAL,
  radius_meters INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  distance DECIMAL;
BEGIN
  IF session_lat IS NULL OR session_lon IS NULL OR attendance_lat IS NULL OR attendance_lon IS NULL THEN
    RETURN false;
  END IF;
  
  distance := calculate_distance_meters(session_lat, session_lon, attendance_lat, attendance_lon);
  
  RETURN distance <= radius_meters;
END;
$$;

-- 6. Commentaires pour la documentation
COMMENT ON COLUMN public.attendance.latitude IS 'Latitude GPS de l''émargement';
COMMENT ON COLUMN public.attendance.longitude IS 'Longitude GPS de l''émargement';
COMMENT ON COLUMN public.attendance.location_accuracy IS 'Précision de la localisation en mètres';
COMMENT ON COLUMN public.attendance.location_address IS 'Adresse résolue depuis les coordonnées GPS';
COMMENT ON COLUMN public.attendance.location_method IS 'Méthode de capture de la localisation (manual, qr_code, gps, ip)';
COMMENT ON COLUMN public.attendance.location_verified IS 'Indique si la localisation a été vérifiée comme étant dans le rayon autorisé';
COMMENT ON COLUMN public.sessions.latitude IS 'Latitude GPS du lieu de la session';
COMMENT ON COLUMN public.sessions.longitude IS 'Longitude GPS du lieu de la session';
COMMENT ON COLUMN public.sessions.require_location_for_attendance IS 'Exiger la géolocalisation pour l''émargement';
COMMENT ON COLUMN public.sessions.allowed_attendance_radius_meters IS 'Rayon autorisé en mètres pour l''émargement';



-- 1. Ajouter les colonnes de géolocalisation à la table attendance
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(10, 2), -- Précision en mètres
ADD COLUMN IF NOT EXISTS location_address TEXT, -- Adresse résolue (optionnel)
ADD COLUMN IF NOT EXISTS location_method TEXT DEFAULT 'manual', -- 'manual', 'qr_code', 'gps', 'ip'
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false; -- Vérification de la localisation

-- 2. Ajouter les colonnes de géolocalisation à la table sessions (si elles n'existent pas)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS require_location_for_attendance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_attendance_radius_meters INTEGER DEFAULT NULL; -- Rayon autorisé en mètres

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_attendance_location ON public.attendance(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_location ON public.sessions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Fonction pour calculer la distance entre deux points GPS (formule de Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R DECIMAL := 6371000; -- Rayon de la Terre en mètres
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convertir les degrés en radians
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  -- Formule de Haversine
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon / 2) * SIN(dlon / 2);
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN R * c;
END;
$$;

-- 5. Fonction pour vérifier si une localisation est dans le rayon autorisé
CREATE OR REPLACE FUNCTION is_location_within_radius(
  session_lat DECIMAL,
  session_lon DECIMAL,
  attendance_lat DECIMAL,
  attendance_lon DECIMAL,
  radius_meters INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  distance DECIMAL;
BEGIN
  IF session_lat IS NULL OR session_lon IS NULL OR attendance_lat IS NULL OR attendance_lon IS NULL THEN
    RETURN false;
  END IF;
  
  distance := calculate_distance_meters(session_lat, session_lon, attendance_lat, attendance_lon);
  
  RETURN distance <= radius_meters;
END;
$$;

-- 6. Commentaires pour la documentation
COMMENT ON COLUMN public.attendance.latitude IS 'Latitude GPS de l''émargement';
COMMENT ON COLUMN public.attendance.longitude IS 'Longitude GPS de l''émargement';
COMMENT ON COLUMN public.attendance.location_accuracy IS 'Précision de la localisation en mètres';
COMMENT ON COLUMN public.attendance.location_address IS 'Adresse résolue depuis les coordonnées GPS';
COMMENT ON COLUMN public.attendance.location_method IS 'Méthode de capture de la localisation (manual, qr_code, gps, ip)';
COMMENT ON COLUMN public.attendance.location_verified IS 'Indique si la localisation a été vérifiée comme étant dans le rayon autorisé';
COMMENT ON COLUMN public.sessions.latitude IS 'Latitude GPS du lieu de la session';
COMMENT ON COLUMN public.sessions.longitude IS 'Longitude GPS du lieu de la session';
COMMENT ON COLUMN public.sessions.require_location_for_attendance IS 'Exiger la géolocalisation pour l''émargement';
COMMENT ON COLUMN public.sessions.allowed_attendance_radius_meters IS 'Rayon autorisé en mètres pour l''émargement';


