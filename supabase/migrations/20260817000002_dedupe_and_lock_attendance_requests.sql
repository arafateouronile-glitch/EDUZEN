-- launchAttendanceSession recréait une deuxième ligne electronic_attendance_requests
-- par apprenant en plus de celle déjà insérée par createAttendanceSession, à
-- chaque lancement d'un créneau par email. Conséquence : submitPublicEmargement
-- (signature par QR code / lien public) fait un .select(...).single() sur
-- (attendance_session_id, student_id), qui échoue dès que deux lignes matchent
-- → "Cet apprenant n'est pas inscrit à cette session" pour tout le monde,
-- juste après l'envoi des demandes par email.
--
-- 1) Dédoublonnage : on garde la ligne signée si elle existe (ne jamais perdre
--    une signature), sinon celle avec un access_token (la "vraie", utilisée
--    pour le lien email), sinon la plus récente.
-- 2) Contrainte d'unicité pour empêcher toute récidive, quel que soit le code
--    applicatif qui insère dans cette table à l'avenir.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY attendance_session_id, student_id
      ORDER BY
        (status = 'signed') DESC,
        (access_token IS NOT NULL) DESC,
        created_at DESC
    ) AS rn
  FROM public.electronic_attendance_requests
  WHERE student_id IS NOT NULL
)
DELETE FROM public.electronic_attendance_requests
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_electronic_attendance_requests_unique_student
  ON public.electronic_attendance_requests (attendance_session_id, student_id)
  WHERE student_id IS NOT NULL;
