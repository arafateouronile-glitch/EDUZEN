---
title: Statut des Tables E-learning dans Supabase
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# ✅ Statut des Tables E-learning dans Supabase

**Date :** 2024-12-03  
**Vérification :** ✅ **Tables principales confirmées**

---

## 📊 Tables Confirmées dans Supabase

### ✅ Tables Principales (Confirmées)

| Table | Statut | Description |
|-------|--------|-------------|
| `courses` | ✅ **Créée** | Séquences e-learning |
| `course_sections` | ✅ **Créée** | Sections de cours |
| `lessons` | ✅ **Créée** | Leçons (stocke les blocs JSON dans `content`) |
| `course_enrollments` | ✅ **Créée** | Inscriptions aux cours |
| `quizzes` | ✅ **Créée** | Quiz |
| `quiz_questions` | ✅ **Créée** | Questions de quiz |

---

## 📋 Tables Supplémentaires (À Vérifier)

### Tables de Progression
- `lesson_progress` - Progression des leçons par étudiant
- `quiz_attempts` - Tentatives de quiz

### Tables de Devoirs
- `assignments` - Devoirs/assignments
- `assignment_submissions` - Soumissions de devoirs

### Tables de Certificats et Avis
- `course_certificates` - Certificats de complétion
- `course_reviews` - Avis et notes sur les cours

---

## 💾 Stockage des Blocs de Contenu

### Structure dans `lessons.content`

Les blocs de contenu (texte, média, quiz, sondage) sont stockés dans le champ **`content`** (TEXT) de la table **`lessons`** au format JSON :

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

## ✅ Fonctionnalités Disponibles

### Avec les Tables Existantes

1. **Créer des séquences e-learning** (`courses`) ✅
2. **Créer des sections** (`course_sections`) ✅
3. **Créer des leçons avec blocs de contenu** (`lessons.content`) ✅
   - Texte
   - Médias
   - Quiz (évaluable)
   - Sondage (non évaluable)
4. **Gérer les inscriptions** (`course_enrollments`) ✅
5. **Créer des quiz séparés** (`quizzes`, `quiz_questions`) ✅

### À Implémenter (si tables manquantes)

- **Progression des leçons** : Nécessite `lesson_progress`
- **Tentatives de quiz** : Nécessite `quiz_attempts`
- **Réponses aux sondages** : Peut être stocké dans une table séparée ou dans le JSON

---

## 🔍 Vérification Complète

Pour vérifier toutes les tables e-learning dans Supabase :

```sql
-- Vérifier toutes les tables e-learning
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('courses', 'course_sections', 'lessons', 'course_enrollments', 'quizzes', 'quiz_questions') THEN '✅ Principale'
    WHEN table_name IN ('lesson_progress', 'quiz_attempts') THEN '✅ Progression/Quiz'
    WHEN table_name IN ('assignments', 'assignment_submissions') THEN '✅ Devoirs'
    WHEN table_name IN ('course_certificates', 'course_reviews') THEN '✅ Certificats/Avis'
    ELSE '⚠️ Autre'
  END as type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%course%' 
    OR table_name LIKE '%lesson%'
    OR table_name LIKE '%quiz%'
    OR table_name LIKE '%assignment%'
  )
ORDER BY 
  CASE 
    WHEN table_name IN ('courses', 'course_sections', 'lessons', 'course_enrollments') THEN 1
    WHEN table_name IN ('quizzes', 'quiz_questions', 'quiz_attempts') THEN 2
    WHEN table_name IN ('lesson_progress', 'assignments', 'assignment_submissions') THEN 3
    ELSE 4
  END,
  table_name;
```

---

## ✅ Conclusion

**Les 6 tables principales sont créées et fonctionnelles !**

- ✅ **Création de séquences** : Possible
- ✅ **Création de leçons avec blocs** : Possible
- ✅ **Stockage des contenus** : JSON dans `lessons.content`
- ✅ **Gestion des quiz** : Tables dédiées disponibles
- ✅ **Inscriptions** : Table disponible

**L'application peut maintenant créer et gérer des séquences e-learning complètes !**

---

**Statut :** ✅ **Prêt pour utilisation**---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.