# ❓ FAQ - Questions Fréquentes

Réponses aux questions les plus courantes sur EDUZEN.

---

## 📋 Table des Matières

1. [Général](#général)
2. [Compte et Connexion](#compte-et-connexion)
3. [Étudiants](#étudiants)
4. [Formations](#formations)
5. [Paiements](#paiements)
6. [Documents](#documents)
7. [Présences](#présences)
8. [Technique](#technique)

---

## 🌐 Général

### Qu'est-ce qu'EDUZEN ?

EDUZEN est une solution SaaS complète pour la gestion de formations et d'établissements d'enseignement. Elle couvre :
- Gestion des apprenants
- Gestion administrative et financière
- Suivi pédagogique
- Génération de documents
- Communication interne

### EDUZEN est-il conforme au RGPD ?

Oui, EDUZEN est conforme au RGPD (Règlement Général sur la Protection des Données) :
- Toutes les données sont hébergées en Europe
- Vous contrôlez vos données
- Droit à l'oubli respecté
- Consentement explicite requis

### Quelle est la différence entre les rôles ?

| Rôle | Accès | Cas d'usage |
|------|-------|-------------|
| **Admin** | Complet | Directeur, gérant |
| **Secrétaire** | Administratif | Gestion quotidienne |
| **Formateur** | Pédagogique | Cours, évaluations, présences |
| **Comptable** | Finances | Facturation, paiements |
| **Étudiant** | Lecture seule | Consultation via portail |
| **Parent** | Lecture enfants | Suivi via portail |

---

## 🔐 Compte et Connexion

### J'ai oublié mon mot de passe

1. Sur la page de connexion, cliquez sur **"Mot de passe oublié"**
2. Entrez votre email
3. Vous recevrez un email avec un lien de réinitialisation
4. Cliquez sur le lien et définissez un nouveau mot de passe

### Comment activer la double authentification (2FA) ?

1. Dashboard → Paramètres → Sécurité
2. Activez **"Authentification à deux facteurs"**
3. Scannez le QR code avec votre application (Google Authenticator, Authy)
4. Entrez le code de vérification

**Recommandé** pour tous les administrateurs.

### Puis-je utiliser EDUZEN sur mobile ?

Oui ! EDUZEN est responsive et fonctionne sur :
- 📱 Mobile (iOS, Android)
- 💻 Tablette
- 🖥️ Desktop

Il n'y a pas d'application native, mais l'interface web est optimisée.

### Comment changer mon email de connexion ?

1. Dashboard → Paramètres → Profil
2. Section "Email"
3. Cliquez sur **"Modifier"**
4. Entrez le nouvel email
5. Confirmez via l'email de vérification

---

## 👥 Étudiants

### Comment importer plusieurs étudiants en une fois ?

Utilisez l'import Excel :
1. Dashboard → Étudiants → **"Import Excel"**
2. Téléchargez le template
3. Remplissez-le avec vos données
4. Uploadez le fichier
5. Vérifiez la prévisualisation et confirmez

### Un étudiant ne reçoit pas les emails

Vérifiez :
1. L'email est correct dans sa fiche
2. Il n'est pas dans les spams
3. Son compte email existe et est actif
4. Dashboard → Messages → Historique pour voir si l'email a été envoyé

Si le problème persiste, contactez le support.

### Comment archiver un étudiant sans le supprimer ?

Changez son statut en **"Inactif"** :
1. Fiche étudiant → Modifier
2. Statut : **Inactif**
3. Enregistrez

Il n'apparaîtra plus dans les listes par défaut mais restera accessible.

### Peut-on fusionner deux fiches étudiants en doublon ?

Oui :
1. Identifiez les deux fiches
2. Choisissez la fiche principale à conserver
3. Dashboard → Étudiants → Actions → **"Fusionner"**
4. Sélectionnez la fiche à fusionner
5. Confirmez

Toutes les données (inscriptions, paiements) seront transférées.

---

## 📚 Formations

### Quelle est la différence entre Formation et Session ?

- **Formation** : C'est le programme (ex: "Développeur Web")
  - Contenu fixe
  - Durée définie
  - Prix de référence

- **Session** : C'est une occurrence de la formation (ex: "Développeur Web - Janvier 2026")
  - Dates précises
  - Capacité d'accueil
  - Formateur(s) assigné(s)
  - Liste d'étudiants inscrits

### Comment dupliquer une formation ?

1. Dashboard → Formations
2. Cliquez sur la formation à dupliquer
3. Cliquez sur **"Dupliquer"**
4. Modifiez le nom et les informations si nécessaire
5. Enregistrez

### Comment gérer une liste d'attente ?

Si une session est complète :
1. Les nouvelles demandes d'inscription sont automatiquement en liste d'attente
2. Dashboard → Formations → [Session] → Onglet "Liste d'attente"
3. Quand une place se libère, cliquez sur **"Inscrire"** pour le premier de la liste

---

## 💰 Paiements

### Comment faire un paiement en plusieurs fois ?

Deux méthodes :

**Méthode 1 : Paiements partiels**
1. Créez une facture totale (ex: 1500€)
2. Enregistrez les paiements partiels au fur et à mesure (ex: 500€, puis 500€, puis 500€)

**Méthode 2 : Échéancier**
1. Créez une facture totale
2. Cliquez sur **"Créer un échéancier"**
3. Définissez les mensualités
4. Des factures intermédiaires sont créées automatiquement

### Une facture a été payée en espèces, comment l'enregistrer ?

1. Ouvrez la facture
2. Cliquez sur **"Enregistrer un paiement"**
3. Mode de paiement : **Espèces**
4. Entrez le montant et la date
5. Validez

**Bonne pratique** : Émettez un reçu papier également.

### Comment annuler une facture déjà envoyée ?

1. Ouvrez la facture
2. Cliquez sur **"Annuler"**
3. Confirmez

La facture passe en statut "Annulée" mais reste visible pour traçabilité.

**Si déjà payée** : Créez un avoir pour rembourser.

### Où trouver le récapitulatif annuel pour la comptabilité ?

1. Dashboard → Paiements → Rapports
2. Sélectionnez la période (ex: 2026)
3. Cliquez sur **"Exporter FEC"** (Fichier des Écritures Comptables)
4. Transmettez ce fichier à votre comptable

---

## 📄 Documents

### Puis-je personnaliser les templates de documents ?

Oui :
1. Dashboard → Paramètres → Templates de documents
2. Sélectionnez un template (ex: Attestation)
3. Cliquez sur **"Modifier"**
4. Personnalisez :
   - Logo
   - En-tête/Pied de page
   - Contenu (texte, variables)
   - Mise en page
5. Enregistrez

### Quelles sont les variables disponibles dans les templates ?

Variables courantes :
- `{nom_etudiant}`, `{prenom_etudiant}`
- `{nom_formation}`, `{duree_formation}`
- `{date_debut}`, `{date_fin}`
- `{nom_organisation}`, `{adresse_organisation}`
- `{date_du_jour}`
- `{numero_facture}`, `{montant}`

Liste complète : Paramètres → Templates → **"Variables disponibles"**

### Comment envoyer un document à plusieurs étudiants ?

**Envoi groupé** :
1. Dashboard → Étudiants
2. Sélectionnez les étudiants (cases à cocher)
3. Cliquez sur **"Actions groupées"** → **"Générer et envoyer un document"**
4. Choisissez le template
5. Prévisualisez
6. Envoyez

Chaque étudiant reçoit son document personnalisé.

### Les documents sont-ils signés électroniquement ?

Oui, EDUZEN propose la **signature électronique** :
1. Générez un document nécessitant signature (contrat, convention)
2. Envoyez une demande de signature
3. L'étudiant reçoit un email avec un lien sécurisé
4. Il signe électroniquement
5. Le document signé est archivé automatiquement

**Valeur légale** : Conforme eIDAS (règlement européen).

---

## ✅ Présences

### Comment faire émarger les étudiants ?

Trois méthodes :

**1. Émargement manuel**
- Dashboard → Présences → [Session]
- Cochez les présents
- Validez

**2. Émargement électronique - QR Code**
- Générez un QR code unique par session
- Les étudiants scannent avec leur téléphone
- Présence enregistrée automatiquement

**3. Émargement électronique - Lien**
- Générez un lien unique
- Envoyez-le par email ou SMS
- Les étudiants cliquent pour émarger

### Combien de temps le QR code est-il valide ?

Par défaut, le QR code est valide :
- 15 minutes avant le début de la session
- 15 minutes après le début

Configurable dans : Paramètres → Présences → Fenêtre d'émargement

### Comment justifier une absence ?

1. Dashboard → Présences → [Session]
2. Cliquez sur l'étudiant absent
3. Cliquez sur **"Justifier l'absence"**
4. Uploadez le justificatif (certificat médical, etc.)
5. L'absence devient "justifiée" 🟡 (au lieu de "non justifiée" 🔴)

### Comment exporter les feuilles d'émargement ?

1. Dashboard → Présences → [Session]
2. Cliquez sur **"Exporter PDF"**
3. La feuille d'émargement au format Cerfa est générée
4. Imprimez ou archivez

---

## 🔧 Technique

### EDUZEN fonctionne sur quels navigateurs ?

**Navigateurs supportés** :
- ✅ Chrome (recommandé)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ❌ Internet Explorer (non supporté)

**Versions** : Toujours utiliser la dernière version.

### Mes données sont-elles sauvegardées ?

Oui, automatiquement :
- **Sauvegarde quotidienne** : Toutes les données
- **Rétention** : 30 jours
- **Serveurs** : Hébergement sécurisé en Europe

Vous pouvez également exporter vos données à tout moment.

### Puis-je exporter toutes mes données ?

Oui, conformément au RGPD :
1. Dashboard → Paramètres → Données
2. Cliquez sur **"Exporter toutes mes données"**
3. Vous recevrez un email avec un lien de téléchargement
4. Archive ZIP contenant toutes vos données au format JSON/CSV

### Comment contacter le support ?

**Plusieurs canaux** :

- **📧 Email** : support@eduzen.io (réponse sous 24h)
- **💬 Chat en ligne** : Disponible dans l'application (coin inférieur droit)
- **📞 Téléphone** : +33 (0)1 XX XX XX XX (Lun-Ven, 9h-18h)
- **📚 Documentation** : docs.eduzen.io

**Conseil** : Joignez des captures d'écran pour une résolution plus rapide.

### Y a-t-il des mises à jour ?

Oui, EDUZEN est régulièrement mis à jour :
- **Fréquence** : 1-2 fois par mois
- **Type** : Nouvelles fonctionnalités, corrections de bugs, améliorations
- **Déploiement** : Automatique, aucune action requise
- **Changelog** : Disponible dans Paramètres → À propos

Vous recevez une notification pour chaque mise à jour majeure.

---

## 🆘 Problèmes Courants

### "Erreur de connexion"

1. Vérifiez votre connexion internet
2. Actualisez la page (F5 ou Cmd+R)
3. Videz le cache du navigateur
4. Si le problème persiste, contactez le support

### "La page ne charge pas"

1. Vérifiez que vous utilisez un navigateur supporté
2. Désactivez temporairement les extensions (bloqueurs de pub)
3. Essayez en navigation privée
4. Contactez le support si le problème continue

### "Je ne trouve pas une fonctionnalité"

1. Utilisez la **recherche globale** (Ctrl+K ou Cmd+K)
2. Consultez cette FAQ
3. Consultez la documentation complète
4. Contactez le support pour une démo personnalisée

---

## 📞 Contact

**Vous n'avez pas trouvé votre réponse ?**

- Email : support@eduzen.io
- Chat : Disponible dans l'application
- Documentation : Consultez les guides complets

Notre équipe est là pour vous aider ! 🚀
