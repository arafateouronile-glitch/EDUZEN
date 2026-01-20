# Guide d'Audit de Pénétration - EDUZEN

Ce document fournit un guide complet pour effectuer un audit de sécurité (penetration testing) sur l'application EDUZEN.

## Table des Matières

1. [Préparation](#1-préparation)
2. [Tests d'Authentification](#2-tests-dauthentification)
3. [Tests d'Autorisation](#3-tests-dautorisation)
4. [Tests d'Injection](#4-tests-dinjection)
5. [Tests XSS](#5-tests-xss)
6. [Tests CSRF](#6-tests-csrf)
7. [Tests de Configuration](#7-tests-de-configuration)
8. [Tests API](#8-tests-api)
9. [Tests de Session](#9-tests-de-session)
10. [Checklist Finale](#10-checklist-finale)

---

## 1. Préparation

### 1.1 Environnement de Test

```bash
# Ne JAMAIS tester en production
# Utiliser un environnement de staging dédié

# Variables d'environnement de test
NEXT_PUBLIC_SUPABASE_URL=https://your-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-key
```

### 1.2 Outils Recommandés

| Outil | Usage |
|-------|-------|
| **Burp Suite** | Proxy d'interception, scanner de vulnérabilités |
| **OWASP ZAP** | Alternative open-source à Burp Suite |
| **SQLMap** | Tests d'injection SQL automatisés |
| **XSStrike** | Tests XSS automatisés |
| **Nuclei** | Scanner de vulnérabilités basé sur des templates |
| **Nmap** | Scan de ports et services |
| **WFuzz** | Fuzzing de paramètres |

### 1.3 Comptes de Test

Créer des comptes avec différents niveaux de privilèges :

```
- admin@test.com (super_admin)
- orgadmin@test.com (admin d'organisation)
- user@test.com (utilisateur standard)
- learner@test.com (apprenant)
```

---

## 2. Tests d'Authentification

### 2.1 Brute Force Login

```bash
# Test avec Hydra
hydra -l admin@test.com -P /path/to/wordlist.txt \
  https://staging.eduzen.com/api/auth/login \
  http-post-form "email=^USER^&password=^PASS^:Invalid credentials"

# Vérifier le rate limiting
# Attendu: Blocage après 5 tentatives en 15 minutes
```

### 2.2 Tests 2FA

- [ ] Tenter de bypasser la 2FA en manipulant les cookies
- [ ] Vérifier que le token 2FA est bien httpOnly
- [ ] Tester le brute force des codes 2FA (6 chiffres)
- [ ] Vérifier l'expiration des codes de récupération

```javascript
// Test du cookie 2FA
// Le cookie NE DOIT PAS être accessible via JavaScript
console.log(document.cookie.includes('2fa_session')) // Doit être false
```

### 2.3 Password Reset

- [ ] Vérifier l'expiration des tokens de reset
- [ ] Tester la réutilisation des tokens
- [ ] Vérifier les messages d'erreur (pas d'énumération d'utilisateurs)

---

## 3. Tests d'Autorisation

### 3.1 IDOR (Insecure Direct Object Reference)

```bash
# Tester l'accès à des ressources d'autres organisations

# Avec un compte de l'organisation A, tenter d'accéder aux données de B
curl -X GET "https://staging.eduzen.com/api/students/[ID_ORG_B]" \
  -H "Authorization: Bearer [TOKEN_ORG_A]"

# Attendu: 403 Forbidden ou 404 Not Found
```

### 3.2 Privilege Escalation

- [ ] Tenter de modifier son propre rôle via l'API
- [ ] Vérifier l'accès aux routes admin avec un compte user
- [ ] Tester la création d'utilisateurs avec des rôles élevés

```bash
# Test d'escalade de privilèges
curl -X PATCH "https://staging.eduzen.com/api/users/me" \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"role": "super_admin"}'

# Attendu: Erreur ou champ ignoré
```

### 3.3 RLS Supabase

```sql
-- Vérifier que les politiques RLS fonctionnent
-- Se connecter avec un utilisateur de l'organisation A
-- Tenter de sélectionner des données de l'organisation B

SELECT * FROM students WHERE organization_id = 'ORG_B_ID';
-- Attendu: Aucun résultat (filtré par RLS)
```

---

## 4. Tests d'Injection

### 4.1 SQL Injection

```bash
# Points d'entrée à tester
- /api/students?search=
- /api/documentation/search?q=
- /api/payments?filter=

# Payloads de test
' OR '1'='1
'; DROP TABLE users; --
' UNION SELECT * FROM users --
1' AND SLEEP(5) --

# Avec SQLMap
sqlmap -u "https://staging.eduzen.com/api/students?search=test" \
  --cookie="auth_token=XXX" --level=5 --risk=3
```

### 4.2 NoSQL Injection (si applicable)

```json
// Payloads MongoDB-style
{"$gt": ""}
{"$ne": null}
{"$where": "sleep(5000)"}
```

### 4.3 Command Injection

```bash
# Tester les endpoints qui peuvent exécuter des commandes
# (export PDF, génération de documents, etc.)

# Payloads
; ls -la
| cat /etc/passwd
$(whoami)
`id`
```

---

## 5. Tests XSS

### 5.1 Reflected XSS

```html
<!-- Tester dans les paramètres URL -->
?search=<script>alert('XSS')</script>
?name=<img src=x onerror=alert('XSS')>
?redirect=javascript:alert('XSS')

<!-- Payloads avancés -->
<svg onload=alert('XSS')>
<body onpageshow=alert('XSS')>
<input onfocus=alert('XSS') autofocus>
```

### 5.2 Stored XSS

```html
<!-- Tester dans les champs de formulaire -->
Nom: <script>alert('XSS')</script>
Description: <img src=x onerror=alert('XSS')>
Commentaire: <svg/onload=alert('XSS')>

<!-- Points d'entrée prioritaires -->
- Noms d'étudiants
- Descriptions de formations
- Messages/commentaires
- Noms de fichiers uploadés
```

### 5.3 DOM XSS

```javascript
// Vérifier l'utilisation de:
// - innerHTML
// - document.write
// - eval()
// - location.href avec input utilisateur

// Tester avec les hash fragments
#<script>alert('XSS')</script>
```

### 5.4 Vérification CSP

```bash
# Vérifier les headers CSP
curl -I https://staging.eduzen.com | grep -i content-security-policy

# Vérifier que unsafe-inline n'est PAS présent en production
# (devrait utiliser des nonces à la place)
```

---

## 6. Tests CSRF

### 6.1 Vérification des Tokens

```html
<!-- Créer une page malveillante -->
<html>
<body>
  <form action="https://staging.eduzen.com/api/users/delete" method="POST">
    <input type="hidden" name="user_id" value="TARGET_USER_ID">
    <input type="submit" value="Win a prize!">
  </form>
</body>
</html>

<!-- Attendu: La requête doit échouer sans token CSRF valide -->
```

### 6.2 Vérification SameSite

```bash
# Vérifier les cookies
curl -I https://staging.eduzen.com | grep -i set-cookie

# Attendu: SameSite=Strict ou SameSite=Lax
```

---

## 7. Tests de Configuration

### 7.1 Headers de Sécurité

```bash
# Vérifier tous les headers de sécurité
curl -I https://staging.eduzen.com

# Headers attendus:
# - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
# - Content-Security-Policy: ...
# - Referrer-Policy: strict-origin-when-cross-origin
# - Permissions-Policy: ...
```

### 7.2 SSL/TLS

```bash
# Test avec testssl.sh
./testssl.sh https://staging.eduzen.com

# Vérifications:
# - TLS 1.2 minimum
# - Pas de protocoles obsolètes (SSL, TLS 1.0, 1.1)
# - Cipher suites sécurisés
# - Certificat valide
```

### 7.3 Fichiers Sensibles

```bash
# Tenter d'accéder à des fichiers sensibles
curl https://staging.eduzen.com/.env
curl https://staging.eduzen.com/.git/config
curl https://staging.eduzen.com/server.log
curl https://staging.eduzen.com/backup.sql

# Attendu: 404 Not Found pour tous
```

---

## 8. Tests API

### 8.1 Rate Limiting

```bash
# Tester le rate limiting
for i in {1..200}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://staging.eduzen.com/api/auth/login
done

# Attendu: 429 Too Many Requests après la limite
```

### 8.2 Validation des Entrées

```bash
# Tester avec des données invalides
curl -X POST https://staging.eduzen.com/api/students \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email", "age": -5, "name": ""}'

# Attendu: 400 Bad Request avec messages de validation
```

### 8.3 Réponses d'Erreur

```bash
# Vérifier que les erreurs ne révèlent pas d'informations sensibles
curl -X GET https://staging.eduzen.com/api/nonexistent

# Attendu:
# - Pas de stack traces en production
# - Pas de noms de tables/colonnes DB
# - Messages d'erreur génériques
```

---

## 9. Tests de Session

### 9.1 Session Fixation

```bash
# Vérifier que le session ID change après login
# 1. Noter le session ID avant login
# 2. Se connecter
# 3. Vérifier que le session ID a changé

# Attendu: Nouveau session ID après authentification
```

### 9.2 Session Timeout

```bash
# Vérifier l'expiration des sessions
# 1. Se connecter
# 2. Attendre le délai d'expiration
# 3. Tenter une action authentifiée

# Attendu: Redirection vers login après expiration
```

### 9.3 Logout

```bash
# Vérifier que le logout invalide bien la session
# 1. Se connecter, noter le token
# 2. Se déconnecter
# 3. Tenter d'utiliser l'ancien token

curl -X GET https://staging.eduzen.com/api/users/me \
  -H "Authorization: Bearer [OLD_TOKEN]"

# Attendu: 401 Unauthorized
```

---

## 10. Checklist Finale

### Authentification
- [ ] Rate limiting fonctionnel
- [ ] 2FA correctement implémenté
- [ ] Tokens de reset sécurisés
- [ ] Pas d'énumération d'utilisateurs

### Autorisation
- [ ] RLS Supabase correctement configuré
- [ ] Pas d'IDOR
- [ ] Pas d'escalade de privilèges

### Injection
- [ ] Pas de SQL injection
- [ ] Pas de command injection
- [ ] Inputs sanitizés

### XSS
- [ ] Pas de XSS réfléchi
- [ ] Pas de XSS stocké
- [ ] CSP avec nonces

### CSRF
- [ ] Tokens CSRF sur les formulaires
- [ ] Cookies SameSite

### Configuration
- [ ] Headers de sécurité présents
- [ ] TLS correctement configuré
- [ ] Pas de fichiers sensibles exposés

### API
- [ ] Rate limiting actif
- [ ] Validation des entrées
- [ ] Erreurs sécurisées

### Sessions
- [ ] Pas de session fixation
- [ ] Timeout configuré
- [ ] Logout fonctionnel

---

## Rapport de Vulnérabilités

Utiliser ce template pour documenter les vulnérabilités trouvées :

```markdown
## Vulnérabilité: [NOM]

**Sévérité**: Critique / Haute / Moyenne / Basse
**CVSS Score**: X.X

### Description
[Description détaillée de la vulnérabilité]

### Étapes de Reproduction
1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

### Impact
[Impact potentiel si exploité]

### Preuve de Concept
```
[Code ou commandes pour reproduire]
```

### Recommandation
[Comment corriger la vulnérabilité]

### Références
- [OWASP: Nom de la vulnérabilité]
- [CVE si applicable]
```

---

## Contacts

Pour signaler une vulnérabilité critique :
- Email: security@eduzen.com
- Délai de réponse: 24-48h
