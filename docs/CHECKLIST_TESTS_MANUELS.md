# ✅ Checklist de tests manuels - Flux critiques

## Vue d'ensemble

Cette checklist couvre les flux critiques à tester manuellement avant la mise en production.

**Durée estimée :** 2-3 heures  
**Fréquence :** Avant chaque déploiement majeur

---

## 🔐 1. Authentification

### 1.1 Connexion

- [ ] Connexion avec email/mot de passe valides
- [ ] Affichage message d'erreur avec identifiants invalides
- [ ] Redirection après connexion réussie
- [ ] Mémorisation de session (cookie)
- [ ] Fonction "Se souvenir de moi" fonctionne

### 1.2 Inscription

- [ ] Création de compte avec formulaire valide
- [ ] Validation des champs (email, mot de passe)
- [ ] Gestion des erreurs (email déjà utilisé)
- [ ] Confirmation par email (si applicable)
- [ ] Redirection après inscription

### 1.3 Déconnexion

- [ ] Déconnexion depuis le menu utilisateur
- [ ] Session supprimée après déconnexion
- [ ] Redirection vers page de connexion
- [ ] Impossible d'accéder aux pages protégées après déconnexion

### 1.4 Récupération de mot de passe

- [ ] Demande de réinitialisation fonctionne
- [ ] Email de réinitialisation reçu
- [ ] Lien de réinitialisation fonctionne
- [ ] Mise à jour du mot de passe réussie
- [ ] Connexion avec nouveau mot de passe

### 1.5 Gestion de session

- [ ] Expiration de session après inactivité
- [ ] Rafraîchissement automatique de session
- [ ] Multiples onglets gérés correctement
- [ ] Déconnexion sur tous les onglets si session expirée

---

## 📊 2. Dashboard

### 2.1 Chargement

- [ ] Dashboard se charge correctement
- [ ] Temps de chargement acceptable (< 3s)
- [ ] Statistiques affichées correctement
- [ ] Graphiques rendus (si présents)
- [ ] Données à jour

### 2.2 Statistiques

- [ ] Nombre d'étudiants correct
- [ ] Revenus mensuels corrects
- [ ] Taux de présence correct
- [ ] Nombre de sessions actives correct
- [ ] Calculs financiers corrects

### 2.3 Navigation

- [ ] Tous les liens du menu fonctionnent
- [ ] Breadcrumbs affichés correctement
- [ ] Navigation arrière/avant navigateur fonctionne
- [ ] URL correctes pour chaque page

### 2.4 Responsive

- [ ] Dashboard utilisable sur mobile
- [ ] Graphiques adaptés au mobile
- [ ] Menu responsive fonctionne
- [ ] Pas de débordement horizontal

---

## 💳 3. Paiements

### 3.1 Création de facture

- [ ] Formulaire de création fonctionne
- [ ] Sélection d'étudiant fonctionne
- [ ] Calcul automatique du montant
- [ ] Application des réductions/remises
- [ ] Génération PDF réussie
- [ ] Facture sauvegardée en base

### 3.2 Liste des factures

- [ ] Toutes les factures affichées
- [ ] Filtrage par statut fonctionne
- [ ] Recherche par étudiant fonctionne
- [ ] Pagination fonctionne (si applicable)
- [ ] Tri par date/montant fonctionne

### 3.3 Paiements

- [ ] Enregistrement d'un paiement fonctionne
- [ ] Mise à jour du statut de facture
- [ ] Calcul du solde restant correct
- [ ] Historique des paiements affiché
- [ ] Export des paiements fonctionne

### 3.4 Intégration Stripe (si applicable)

- [ ] Création de session Stripe fonctionne
- [ ] Redirection vers Stripe correcte
- [ ] Retour après paiement fonctionne
- [ ] Webhook Stripe reçu et traité
- [ ] Facture marquée comme payée

### 3.5 Rapports financiers

- [ ] Export CSV fonctionne
- [ ] Export Excel fonctionne (si applicable)
- [ ] Données exportées correctes
- [ ] Filtres appliqués à l'export

---

## 👥 4. Gestion des étudiants

### 4.1 Création

- [ ] Formulaire de création fonctionne
- [ ] Validation des champs (email, téléphone, etc.)
- [ ] Upload de photo fonctionne
- [ ] Étudiant créé et visible dans la liste
- [ ] Email de bienvenue envoyé (si applicable)

### 4.2 Modification

- [ ] Édition d'un étudiant fonctionne
- [ ] Tous les champs modifiables
- [ ] Sauvegarde réussie
- [ ] Données mises à jour dans la liste

### 4.3 Suppression

- [ ] Suppression avec confirmation fonctionne
- [ ] Vérification des dépendances (inscriptions, paiements)
- [ ] Message d'erreur si dépendances existent
- [ ] Étudiant supprimé de la liste

### 4.4 Inscriptions

- [ ] Inscription à une session fonctionne
- [ ] Vérification des places disponibles
- [ ] Confirmation d'inscription
- [ ] Liste des inscriptions correcte

---

## 📚 5. Sessions et formations

### 5.1 Création de session

- [ ] Formulaire de création fonctionne
- [ ] Sélection de formation fonctionne
- [ ] Dates de début/fin valides
- [ ] Créneaux horaires configurés
- [ ] Session créée et visible

### 5.2 Gestion des présences

- [ ] Marquage présence/absence fonctionne
- [ ] Calcul du taux de présence automatique
- [ ] Historique des présences affiché
- [ ] Export des présences fonctionne

### 5.3 Évaluations

- [ ] Création d'évaluation fonctionne
- [ ] Attribution aux étudiants fonctionne
- [ ] Saisie des notes fonctionne
- [ ] Calcul de la moyenne automatique
- [ ] Bulletins générés correctement

---

## 📄 6. Documents

### 6.1 Génération

- [ ] Sélection du template fonctionne
- [ ] Génération de document réussie
- [ ] Variables remplacées correctement
- [ ] Téléchargement PDF fonctionne
- [ ] Document sauvegardé dans Storage

### 6.2 Templates

- [ ] Édition de template fonctionne
- [ ] Prévisualisation fonctionne
- [ ] Sauvegarde du template réussie
- [ ] Variables disponibles listées

### 6.3 Archivage

- [ ] Documents archivés visibles
- [ ] Recherche dans les documents fonctionne
- [ ] Filtrage par type fonctionne
- [ ] Suppression de document fonctionne

---

## 🔔 7. Notifications

### 7.1 Envoi

- [ ] Notification envoyée correctement
- [ ] Email reçu (si applicable)
- [ ] Notification dans l'interface affichée
- [ ] Push notification reçue (si applicable)

### 7.2 Gestion

- [ ] Liste des notifications affichée
- [ ] Marquage comme lu fonctionne
- [ ] Suppression de notification fonctionne
- [ ] Préférences de notification configurables

---

## 🔒 8. Sécurité et permissions

### 8.1 RLS (Row Level Security)

- [ ] Utilisateur A ne voit pas données utilisateur B
- [ ] Isolation par organisation fonctionne
- [ ] Accès refusé aux ressources non autorisées
- [ ] Messages d'erreur appropriés

### 8.2 Permissions

- [ ] Admin peut tout faire
- [ ] Secrétaire a accès limité
- [ ] Professeur a accès limité
- [ ] Apprenant a accès limité
- [ ] Changement de rôle fonctionne

### 8.3 Authentification

- [ ] Token expiré géré correctement
- [ ] Refresh token fonctionne
- [ ] Déconnexion forcée si token invalide
- [ ] Pas d'exposition de données sensibles dans les logs

---

## 📱 9. Responsive et accessibilité

### 9.1 Mobile

- [ ] Interface utilisable sur mobile
- [ ] Formulaire remplissable sur mobile
- [ ] Navigation mobile fonctionne
- [ ] Graphiques lisibles sur mobile

### 9.2 Accessibilité

- [ ] Navigation au clavier fonctionne
- [ ] Contrastes de couleurs suffisants
- [ ] Labels ARIA présents
- [ ] Screen reader compatible (si testable)

---

## 🌐 10. Performance

### 10.1 Chargement

- [ ] Temps de chargement < 3s
- [ ] Pas de lags lors des interactions
- [ ] Images optimisées et chargées rapidement
- [ ] Lazy loading fonctionne (si applicable)

### 10.2 Requêtes

- [ ] Pas de requêtes inutiles
- [ ] Pagination fonctionne (pas de chargement complet)
- [ ] Cache fonctionne correctement
- [ ] Optimisation des requêtes Supabase

---

## 🐛 11. Gestion des erreurs

### 11.1 Erreurs réseau

- [ ] Message d'erreur affiché en cas de perte réseau
- [ ] Retry automatique fonctionne (si applicable)
- [ ] État de chargement affiché
- [ ] Pas de crash de l'application

### 11.2 Erreurs serveur

- [ ] Message d'erreur 500 géré
- [ ] Message d'erreur 404 géré
- [ ] Message d'erreur 403 géré
- [ ] Redirection appropriée en cas d'erreur

### 11.3 Validation

- [ ] Erreurs de validation affichées
- [ ] Messages d'erreur clairs
- [ ] Champs invalides mis en évidence
- [ ] Formulaire non soumis si erreurs

---

## ✅ 12. Checklist finale

### Avant de marquer comme terminé

- [ ] Tous les tests critiques passent
- [ ] Aucun bug bloquant identifié
- [ ] Performance acceptable
- [ ] Sécurité vérifiée
- [ ] Responsive vérifié
- [ ] Accessibilité vérifiée
- [ ] Documentation à jour

### Notes

- **Date de test :** ___________
- **Testeur :** ___________
- **Version testée :** ___________
- **Problèmes identifiés :** ___________
- **Commentaires :** ___________

---

## 📝 Template de rapport de bugs

Pour chaque bug identifié :

```
**Titre :** [Description courte]
**Priorité :** [CRITIQUE / HAUTE / MOYENNE / BASSE]
**Module :** [Auth / Dashboard / Payments / etc.]
**Étapes pour reproduire :**
1. ...
2. ...
3. ...
**Résultat attendu :** ...
**Résultat actuel :** ...
**Screenshot :** [si applicable]
**Environnement :** [Navigateur, OS, etc.]
```

---

## 🔗 Ressources

- Guide tests automatisés : `docs/GUIDE_TESTS_PRODUCTION.md`
- Checklist de production : `docs/PRODUCTION_CHECKLIST.md`
- Rapport de tests : `docs/TESTS_RESULTS_REPORT.md`


