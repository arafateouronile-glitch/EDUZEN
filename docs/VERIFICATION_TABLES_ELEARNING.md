---
title: Vérification - Tables E-learning dans Supabase
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# ✅ Vérification - Tables E-learning dans Supabase

**Date :** 2024-12-03  
**Statut :** ✅ **Tables créées**

---

## 📊 Tables E-learning Existantes

### ✅ Tables Principales

#### 1. **`courses`** - Séquences e-learning
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- ✅ Vérifiée/corrigée dans `20241203000011_ensure_courses_tables_exist.sql`
- **Champs principaux :**
  - `id`, `organization_id`, `formation_id`
  - `title`, `slug`, `description`, `short_description`
  - `instructor_id`, `thumbnail_url`, `cover_image_url`
  - `is_published`, `is_featured`, `difficulty_level`
  - `estimated_duration_hours`, `total_lessons`, `total_students`
  - `price`, `currency`, `is_free`
  - `tags`, `published_at`, `created_at`, `updated_at`

#### 2. **`course_sections`** - Sections de cours
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- **Champs :**
  - `id`, `course_id`, `title`, `description`
  - `order_index`, `created_at`, `updated_at`

#### 3. **`lessons`** - Leçons
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- **Champs principaux :**
  - `id`, `course_id`, `section_id`
  - `title`, `slug`, `description`
  - **`content`** (TEXT) - **Stocke le JSON des blocs de contenu**
  - `lesson_type` (video, text, quiz, assignment, live)
  - `video_url`, `video_duration_minutes`
  - `attachments` (JSONB), `resources` (JSONB)
  - `is_preview`, `is_required`, `order_index`
  - `created_at`, `updated_at`

#### 4. **`course_enrollments`** - Inscriptions
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- ✅ Vérifiée dans `20241203000011_ensure_courses_tables_exist.sql`
- **Champs :**
  - `id`, `course_id`, `student_id`
  - `enrollment_status`, `progress_percentage`
  - `completed_lessons` (INTEGER[]), `last_accessed_lesson_id`
  - `enrolled_at`, `completed_at`, `last_accessed_at`

#### 5. **`lesson_progress`** - Progression des leçons
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- **Champs :**
  - `id`, `lesson_id`, `student_id`
  - `is_completed`, `completion_percentage`
  - `time_spent_minutes`
  - `started_at`, `completed_at`, `last_accessed_at`

### ✅ Tables pour les Quiz

#### 6. **`quizzes`** - Quiz
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- **Champs :**
  - `id`, `lesson_id`, `course_id`
  - `title`, `description`
  - `passing_score`, `time_limit_minutes`, `max_attempts`
  - `shuffle_questions`, `show_results_immediately`
  - `created_at`, `updated_at`

#### 7. **`quiz_questions`** - Questions de quiz
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- **Champs :**
  - `id`, `quiz_id`
  - `question_text`, `question_type`
  - `options` (JSONB) - Pour multiple_choice: [{text, is_correct}, ...]
  - `correct_answer`, `explanation`
  - `points`, `order_index`
  - `created_at`, `updated_at`

#### 8. **`quiz_attempts`** - Tentatives de quiz
- ✅ Créée dans `20241202000030_create_elearning_system.sql`
- **Champs :**
  - `id`, `quiz_id`, `student_id`
  - `score`, `total_questions`, `correct_answers`, `is_passed`
  - `answers` (JSONB)
  - `started_at`, `completed_at`, `time_taken_minutes`

### ✅ Tables pour les Assignments

#### 9. **`assignments`** - Devoirs
- ✅ Créée dans `20241202000030_create_elearning_system.sql`

#### 10. **`assignment_submissions`** - Soumissions de devoirs
- ✅ Créée dans `20241202000030_create_elearning_system.sql`

---

## 📝 Stockage des Blocs de Contenu

### Structure Actuelle

Les **blocs de contenu** (texte, média, quiz, sondage) sont stockés dans le champ **`content`** de la table **`lessons`** au format **JSON** :

```json
[
  {
    "id": "abc123",
    "type": "text",
    "data": {
      "content": "Contenu du texte..."
    }
  },
  {
    "id": "def456",
    "type": "media",
    "data": {
      "mediaType": "image",
      "mediaUrl": "https://...",
      "caption": "Légende"
    }
  },
  {
    "id": "ghi789",
    "type": "quiz",
    "data": {
      "question": "Quelle est la question ?",
      "options": [
        { "id": "1", "text": "Option 1", "isCorrect": true },
        { "id": "2", "text": "Option 2", "isCorrect": false }
      ],
      "points": 1,
      "explanation": "Explication..."
    }
  },
  {
    "id": "jkl012",
    "type": "poll",
    "data": {
      "pollQuestion": "Quelle est votre question ?",
      "pollOptions": [
        { "id": "1", "text": "Option 1" },
        { "id": "2", "text": "Option 2" }
      ]
    }
  }
]
```

---

## ⚠️ Note sur les Sondages

**Les sondages sont stockés dans le JSON du champ `content`** de la table `lessons`, comme les autres blocs de contenu.

**Pas de table séparée** pour les sondages car :
- ✅ Ils sont intégrés dans le contenu de la leçon
- ✅ Ils ne nécessitent pas d'évaluation (contrairement aux quiz)
- ✅ Les réponses peuvent être stockées dans une table séparée si nécessaire

**Si besoin d'une table pour les réponses aux sondages**, on peut créer :
- `poll_responses` (id, poll_block_id, student_id, selected_option_id, responded_at)

---

## ✅ Migrations à Exécuter

### Migration Principale
- **`20241202000030_create_elearning_system.sql`** - Crée toutes les tables e-learning

### Migrations de Vérification/Correction
- **`20241203000011_ensure_courses_tables_exist.sql`** - S'assure que `courses` et `course_enrollments` existent
- **`20241203000010_fix_courses_relations.sql`** - Corrige les relations

---

## 🚀 Vérification

Pour vérifier que les tables existent dans Supabase :

```sql
-- Vérifier les tables e-learning
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'courses',
    'course_sections',
    'lessons',
    'course_enrollments',
    'lesson_progress',
    'quizzes',
    'quiz_questions',
    'quiz_attempts',
    'assignments',
    'assignment_submissions'
  )
ORDER BY table_name;
```

---

## ✅ Conclusion

**Toutes les tables nécessaires pour l'e-learning sont créées dans Supabase !**

- ✅ Tables principales : `courses`, `course_sections`, `lessons`, `course_enrollments`
- ✅ Tables quiz : `quizzes`, `quiz_questions`, `quiz_attempts`
- ✅ Tables assignments : `assignments`, `assignment_submissions`
- ✅ Stockage des blocs : JSON dans le champ `content` de `lessons`

**Les sondages sont stockés dans le JSON des blocs de contenu**, ce qui est suffisant pour l'instant.

---

**Statut :** ✅ **Toutes les tables sont créées et prêtes**---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.