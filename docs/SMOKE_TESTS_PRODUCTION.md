# 🧪 Guide des Smoke Tests Production

**Date** : 16 Janvier 2026  
**Objectif** : Vérifier que toutes les fonctionnalités critiques fonctionnent en production

---

## 📋 Vue d'Ensemble

Les smoke tests sont des tests rapides qui vérifient que les fonctionnalités essentielles de l'application fonctionnent correctement en production.

**Durée estimée** : 1-2 heures  
**Fréquence** : Avant chaque déploiement majeur, après incidents

---

## ✅ CHECKLIST DES SMOKE TESTS

### 1. 🔐 Authentification

**URL** : `https://votre-domaine.com/auth/login`

#### Test 1.1 : Connexion Standard
- [ ] Accéder à la page de connexion
- [ ] Entrer email et mot de passe valides
- [ ] Cliquer sur "Se connecter"
- [ ] ✅ Vérifier redirection vers `/dashboard`
- [ ] ✅ Vérifier que la session est active

#### Test 1.2 : Connexion avec 2FA
- [ ] Se connecter avec un compte ayant 2FA activé
- [ ] Entrer le code 2FA (depuis l'app d'authentification)
- [ ] ✅ Vérifier connexion réussie
- [ ] ✅ Vérifier redirection vers `/dashboard`

#### Test 1.3 : Déconnexion
- [ ] Cliquer sur "Déconnexion"
- [ ] ✅ Vérifier redirection vers `/auth/login`
- [ ] ✅ Vérifier que la session est fermée

#### Test 1.4 : Mot de Passe Oublié
- [ ] Cliquer sur "Mot de passe oublié"
- [ ] Entrer un email valide
- [ ] ✅ Vérifier réception de l'email de réinitialisation
- [ ] Cliquer sur le lien dans l'email
- [ ] ✅ Vérifier accès au formulaire de réinitialisation
- [ ] Réinitialiser le mot de passe
- [ ] ✅ Vérifier connexion avec le nouveau mot de passe

**Résultat attendu** : ✅ Tous les tests passent

---

### 2. 🏢 Création d'Organisation

**URL** : `https://votre-domaine.com/auth/register`

#### Test 2.1 : Inscription Nouvelle Organisation
- [ ] Accéder à la page d'inscription
- [ ] Remplir le formulaire :
  - Nom de l'organisation
  - Email
  - Mot de passe
  - Informations de contact
- [ ] Accepter les CGU
- [ ] Soumettre le formulaire
- [ ] ✅ Vérifier création du compte
- [ ] ✅ Vérifier email de confirmation
- [ ] Confirmer l'email
- [ ] ✅ Vérifier accès au dashboard

**Résultat attendu** : ✅ Organisation créée avec succès

---

### 3. 👥 Création d'Étudiant

**URL** : `https://votre-domaine.com/dashboard/students/new`

#### Test 3.1 : Création Complète
- [ ] Se connecter en tant qu'admin
- [ ] Aller dans Dashboard → Étudiants → "+ Nouvel étudiant"
- [ ] Remplir le formulaire :
  - Nom, Prénom
  - Date de naissance
  - Email
  - Téléphone
  - Adresse complète
- [ ] Enregistrer
- [ ] ✅ Vérifier création réussie
- [ ] ✅ Vérifier redirection vers la fiche étudiant
- [ ] ✅ Vérifier que l'étudiant apparaît dans la liste

#### Test 3.2 : Création Rapide
- [ ] Utiliser le mode "Création rapide"
- [ ] Remplir uniquement : Nom, Prénom, Email
- [ ] Enregistrer
- [ ] ✅ Vérifier création réussie

**Résultat attendu** : ✅ Étudiant créé avec succès

---

### 4. 📄 Création de Facture

**URL** : `https://votre-domaine.com/dashboard/payments/invoices/new`

#### Test 4.1 : Facture Simple
- [ ] Se connecter en tant qu'admin
- [ ] Aller dans Dashboard → Paiements → "+ Nouvelle facture"
- [ ] Sélectionner un étudiant
- [ ] Ajouter une ligne de facturation :
  - Description : "Formation Test"
  - Quantité : 1
  - Prix unitaire : 1000€
- [ ] Définir date d'échéance
- [ ] Générer la facture
- [ ] ✅ Vérifier création réussie
- [ ] ✅ Vérifier numéro de facture généré
- [ ] ✅ Vérifier montant total correct

#### Test 4.2 : Téléchargement PDF
- [ ] Ouvrir la facture créée
- [ ] Cliquer sur "Télécharger PDF"
- [ ] ✅ Vérifier téléchargement du PDF
- [ ] ✅ Vérifier contenu du PDF (logo, informations, montant)

**Résultat attendu** : ✅ Facture créée et PDF généré

---

### 5. 💰 Paiement

**URL** : `https://votre-domaine.com/dashboard/payments`

#### Test 5.1 : Enregistrement Paiement
- [ ] Ouvrir une facture existante
- [ ] Cliquer sur "Enregistrer un paiement"
- [ ] Remplir :
  - Montant : 500€ (paiement partiel)
  - Mode : Carte bancaire
  - Date : Aujourd'hui
- [ ] Enregistrer
- [ ] ✅ Vérifier paiement enregistré
- [ ] ✅ Vérifier solde restant mis à jour
- [ ] ✅ Vérifier statut de la facture (partiellement payée)

#### Test 5.2 : Paiement Complet
- [ ] Enregistrer le solde restant
- [ ] ✅ Vérifier statut "Payée"
- [ ] ✅ Vérifier solde à 0€

**Résultat attendu** : ✅ Paiements enregistrés correctement

---

### 6. 📑 Génération de Document PDF

**URL** : `https://votre-domaine.com/dashboard/documents`

#### Test 6.1 : Génération Convention
- [ ] Aller dans Dashboard → Documents → "+ Nouveau document"
- [ ] Sélectionner template "Convention de formation"
- [ ] Sélectionner un étudiant
- [ ] Sélectionner une session
- [ ] Prévisualiser
- [ ] ✅ Vérifier prévisualisation correcte
- [ ] Générer le PDF
- [ ] ✅ Vérifier téléchargement du PDF
- [ ] ✅ Vérifier contenu du PDF :
  - Logo présent
  - Informations étudiant correctes
  - Informations session correctes
  - Variables remplacées

#### Test 6.2 : Génération Attestation
- [ ] Répéter avec template "Attestation"
- [ ] ✅ Vérifier génération réussie

#### Test 6.3 : Génération Certificat
- [ ] Répéter avec template "Certificat"
- [ ] ✅ Vérifier génération réussie

**Résultat attendu** : ✅ Tous les types de documents générés correctement

---

### 7. 📧 Envoi d'Email

#### Test 7.1 : Email depuis l'Application
- [ ] Aller dans la fiche d'un étudiant
- [ ] Cliquer sur "Envoyer un email"
- [ ] Remplir le formulaire :
  - Sujet : "Test Email"
  - Message : "Ceci est un test"
- [ ] Envoyer
- [ ] ✅ Vérifier message de confirmation
- [ ] ✅ Vérifier réception de l'email dans la boîte de l'étudiant

#### Test 7.2 : Email Automatique
- [ ] Créer une facture avec échéance aujourd'hui
- [ ] Attendre le cron job (ou déclencher manuellement)
- [ ] ✅ Vérifier réception de l'email de rappel

**Résultat attendu** : ✅ Emails envoyés et reçus

---

### 8. 📤 Upload de Fichier

**URL** : `https://votre-domaine.com/dashboard/students/[id]`

#### Test 8.1 : Upload Document
- [ ] Ouvrir la fiche d'un étudiant
- [ ] Aller dans l'onglet "Documents"
- [ ] Cliquer sur "+ Ajouter un document"
- [ ] Sélectionner un fichier (PDF, JPG, PNG, DOCX)
- [ ] Catégoriser le document
- [ ] Uploader
- [ ] ✅ Vérifier upload réussi
- [ ] ✅ Vérifier document visible dans la liste
- [ ] ✅ Vérifier téléchargement du document

#### Test 8.2 : Upload Logo Organisation
- [ ] Aller dans Paramètres → Organisation
- [ ] Cliquer sur "Changer le logo"
- [ ] Sélectionner une image (PNG/JPG, max 2MB)
- [ ] Uploader
- [ ] ✅ Vérifier logo mis à jour
- [ ] ✅ Vérifier logo visible dans le dashboard

**Résultat attendu** : ✅ Fichiers uploadés et accessibles

---

### 9. 💬 Messagerie

**URL** : `https://votre-domaine.com/dashboard/messages`

#### Test 9.1 : Envoi Message
- [ ] Aller dans Dashboard → Messages
- [ ] Cliquer sur "+ Nouveau message"
- [ ] Sélectionner un destinataire (étudiant ou utilisateur)
- [ ] Remplir le message
- [ ] Envoyer
- [ ] ✅ Vérifier message envoyé
- [ ] ✅ Vérifier message visible dans la conversation

#### Test 9.2 : Réception Message
- [ ] Se connecter avec le compte destinataire
- [ ] Aller dans Messages
- [ ] ✅ Vérifier nouveau message visible
- [ ] Ouvrir le message
- [ ] ✅ Vérifier contenu du message
- [ ] Répondre
- [ ] ✅ Vérifier réponse envoyée

**Résultat attendu** : ✅ Messagerie fonctionnelle

---

### 10. 🎓 Portail Apprenant

**URL** : `https://votre-domaine.com/portal`

#### Test 10.1 : Accès Étudiant
- [ ] Se connecter avec un compte étudiant
- [ ] Accéder au portail
- [ ] ✅ Vérifier dashboard visible
- [ ] ✅ Vérifier emploi du temps
- [ ] ✅ Vérifier présences
- [ ] ✅ Vérifier notes
- [ ] ✅ Vérifier documents
- [ ] ✅ Vérifier paiements

#### Test 10.2 : Accès Parent
- [ ] Se connecter avec un compte parent
- [ ] Accéder au portail
- [ ] ✅ Vérifier liste des enfants
- [ ] ✅ Vérifier accès aux données de chaque enfant

**Résultat attendu** : ✅ Portail fonctionnel pour étudiants et parents

---

## 📊 RAPPORT DE SMOKE TESTS

### Template de Rapport

```markdown
# Rapport Smoke Tests - [DATE]

## Résumé
- Tests effectués : X/10
- Tests réussis : X
- Tests échoués : X
- Taux de réussite : XX%

## Détails par Test

### 1. Authentification
- ✅ Connexion standard : OK
- ✅ Connexion 2FA : OK
- ✅ Déconnexion : OK
- ❌ Mot de passe oublié : ÉCHEC (détails...)

### 2. Création Organisation
- ✅ Inscription : OK

[...]

## Problèmes Identifiés

1. [Description du problème]
   - Impact : Critique / Moyen / Faible
   - Solution : [Description]

## Conclusion

[ ] GO - Prêt pour production
[ ] NO-GO - Problèmes bloquants identifiés
```

---

## 🔧 OUTILS UTILES

### Vérification Rapide

```bash
# Vérifier que l'application répond
curl -I https://votre-domaine.com

# Vérifier HTTPS
curl -I https://votre-domaine.com | grep -i "strict-transport-security"

# Vérifier headers de sécurité
curl -I https://votre-domaine.com | grep -i "x-frame-options"
```

### Logs à Surveiller

- **Vercel Logs** : Dashboard → Deployments → [Dernier déploiement] → Logs
- **Sentry** : Dashboard → Issues
- **Supabase Logs** : Dashboard → Logs

---

## ⚠️ PROBLÈMES COURANTS

### Problème : Erreur 500 sur une route
**Solution** : Vérifier les logs Vercel et Sentry, vérifier les variables d'environnement

### Problème : PDF ne se génère pas
**Solution** : Vérifier que Puppeteer fonctionne sur Vercel, vérifier les logs

### Problème : Email non reçu
**Solution** : Vérifier configuration Resend, vérifier les logs d'envoi

### Problème : Upload échoue
**Solution** : Vérifier configuration Storage Supabase, vérifier les policies RLS

---

## ✅ CHECKLIST FINALE

Avant de considérer les smoke tests comme réussis :

- [ ] ✅ Tous les tests passent (10/10)
- [ ] ✅ Aucune erreur critique dans les logs
- [ ] ✅ Performance acceptable (< 3s pour les pages principales)
- [ ] ✅ Pas d'erreurs console dans le navigateur
- [ ] ✅ Tous les emails sont reçus
- [ ] ✅ Tous les PDF sont générés correctement
- [ ] ✅ Tous les uploads fonctionnent

---

## 📝 NOTES

- Effectuer les smoke tests après chaque déploiement majeur
- Documenter tous les problèmes rencontrés
- Ne pas passer en production si des tests critiques échouent

---

**Dernière mise à jour** : 16 Janvier 2026
