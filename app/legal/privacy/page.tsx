import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité - EDUZEN',
  description: 'Politique de Confidentialité et protection des données personnelles sur la plateforme EDUZEN',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Politique de Confidentialité
        </h1>
        <p className="text-gray-600 mb-8">
          Dernière mise à jour : 14 Janvier 2026
        </p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-700 mb-3">
              La présente Politique de Confidentialité décrit comment EDUZEN collecte, utilise, partage et protège les
              données personnelles de ses utilisateurs, conformément au Règlement Général sur la Protection des Données
              (RGPD).
            </p>
            <p className="text-gray-700 mb-3">
              EDUZEN s'engage à protéger la vie privée des utilisateurs et à traiter leurs données personnelles de
              manière transparente, sécurisée et confidentielle.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Responsable du Traitement
            </h2>
            <p className="text-gray-700 mb-3">
              Le responsable du traitement des données personnelles est :
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Société :</strong> EDUZEN SAS</li>
              <li><strong>Adresse :</strong> [Adresse de l'entreprise]</li>
              <li><strong>Email :</strong> dpo@eduzen.io</li>
              <li><strong>Téléphone :</strong> +33 (0)1 XX XX XX XX</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Données Collectées
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              3.1 Données d'Identification
            </h3>
            <p className="text-gray-700 mb-3">
              Nous collectons les données suivantes lors de la création de votre compte :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Adresse postale</li>
              <li>Date de naissance (pour les apprenants)</li>
              <li>Photo de profil (optionnel)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              3.2 Données d'Utilisation
            </h3>
            <p className="text-gray-700 mb-3">
              Nous collectons automatiquement certaines informations lors de votre utilisation du Service :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Adresse IP</li>
              <li>Type de navigateur et version</li>
              <li>Système d'exploitation</li>
              <li>Pages consultées et durée des visites</li>
              <li>Date et heure d'accès</li>
              <li>Données de localisation (si émargement géolocalisé activé)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              3.3 Données Pédagogiques et Administratives
            </h3>
            <p className="text-gray-700 mb-3">
              Dans le cadre de l'utilisation du Service, nous traitons :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Informations d'inscription aux formations</li>
              <li>Résultats et évaluations</li>
              <li>Présences et absences</li>
              <li>Documents pédagogiques et administratifs</li>
              <li>Factures et paiements</li>
              <li>Historique de communication (messages)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              3.4 Cookies et Technologies Similaires
            </h3>
            <p className="text-gray-700 mb-3">
              Nous utilisons des cookies pour améliorer votre expérience. Pour plus d'informations, consultez notre
              Politique de Cookies (section 11).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Finalités du Traitement
            </h2>
            <p className="text-gray-700 mb-3">
              Vos données personnelles sont collectées et traitées pour les finalités suivantes :
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              4.1 Gestion du Service
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Création et gestion de votre compte</li>
              <li>Authentification et sécurité</li>
              <li>Fourniture des fonctionnalités du Service</li>
              <li>Support technique et assistance</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              4.2 Gestion Administrative et Pédagogique
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Inscription et suivi des apprenants</li>
              <li>Planification et organisation des formations</li>
              <li>Suivi des présences et évaluations</li>
              <li>Génération de documents (attestations, certificats)</li>
              <li>Communication avec les apprenants et parents</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              4.3 Gestion Financière
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Facturation et paiements</li>
              <li>Gestion des abonnements</li>
              <li>Prévention de la fraude</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              4.4 Amélioration du Service
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Analyse de l'utilisation du Service</li>
              <li>Statistiques anonymisées</li>
              <li>Développement de nouvelles fonctionnalités</li>
              <li>Correction de bugs</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              4.5 Communication Marketing (avec consentement)
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Envoi de newsletters</li>
              <li>Information sur les nouveautés</li>
              <li>Offres promotionnelles</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Base Légale du Traitement
            </h2>
            <p className="text-gray-700 mb-3">
              Le traitement de vos données repose sur les bases légales suivantes :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Exécution du contrat :</strong> Pour fournir le Service conformément aux CGU</li>
              <li><strong>Obligation légale :</strong> Pour respecter les obligations comptables, fiscales et réglementaires</li>
              <li><strong>Consentement :</strong> Pour les communications marketing et certains cookies</li>
              <li><strong>Intérêt légitime :</strong> Pour améliorer le Service, prévenir la fraude, assurer la sécurité</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Durée de Conservation
            </h2>
            <p className="text-gray-700 mb-3">
              Vos données personnelles sont conservées pendant les durées suivantes :
            </p>

            <table className="w-full border-collapse border border-gray-300 text-gray-700 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Type de données</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Données de compte</td>
                  <td className="border border-gray-300 px-4 py-2">Durée de l'abonnement + 3 ans</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Données pédagogiques</td>
                  <td className="border border-gray-300 px-4 py-2">10 ans (obligation légale OF)</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Données financières</td>
                  <td className="border border-gray-300 px-4 py-2">10 ans (obligation comptable)</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Logs de connexion</td>
                  <td className="border border-gray-300 px-4 py-2">12 mois</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Cookies</td>
                  <td className="border border-gray-300 px-4 py-2">13 mois maximum</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Données marketing</td>
                  <td className="border border-gray-300 px-4 py-2">3 ans sans interaction</td>
                </tr>
              </tbody>
            </table>

            <p className="text-gray-700 mt-3">
              À l'expiration de ces délais, vos données sont supprimées ou anonymisées, sauf obligation légale de
              conservation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Destinataires des Données
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              7.1 Destinataires Internes
            </h3>
            <p className="text-gray-700 mb-3">
              Vos données sont accessibles uniquement aux employés d'EDUZEN qui en ont besoin pour leurs fonctions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              7.2 Sous-traitants
            </h3>
            <p className="text-gray-700 mb-3">
              Nous faisons appel à des prestataires de services pour :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Hébergement :</strong> Supabase (Europe), Vercel (Europe)</li>
              <li><strong>Paiement :</strong> Stripe (conforme PCI-DSS)</li>
              <li><strong>Emails :</strong> Resend, SendGrid</li>
              <li><strong>Monitoring :</strong> Sentry</li>
              <li><strong>Analytics :</strong> Plausible Analytics (respectueux RGPD)</li>
            </ul>
            <p className="text-gray-700 mb-3">
              Ces prestataires sont contractuellement tenus de respecter la confidentialité et la sécurité de vos données.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              7.3 Autorités
            </h3>
            <p className="text-gray-700 mb-3">
              Vos données peuvent être communiquées aux autorités compétentes en cas d'obligation légale (justice,
              police, administration fiscale).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Transferts Internationaux
            </h2>
            <p className="text-gray-700 mb-3">
              Vos données personnelles sont hébergées et traitées au sein de l'Union Européenne.
            </p>
            <p className="text-gray-700 mb-3">
              En cas de transfert hors UE, nous nous assurons que :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Le pays bénéficie d'une décision d'adéquation de la Commission Européenne</li>
              <li>Ou des garanties appropriées sont mises en place (clauses contractuelles types)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Droits des Utilisateurs (RGPD)
            </h2>
            <p className="text-gray-700 mb-3">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.1 Droit d'Accès
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez obtenir la confirmation que vos données sont traitées et accéder à une copie de celles-ci.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.2 Droit de Rectification
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez corriger vos données inexactes ou incomplètes.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.3 Droit à l'Effacement ("Droit à l'oubli")
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez demander la suppression de vos données, sauf si une obligation légale impose leur conservation.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.4 Droit à la Limitation du Traitement
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez demander la limitation du traitement de vos données dans certaines situations.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.5 Droit à la Portabilité
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez recevoir vos données dans un format structuré et couramment utilisé (JSON, CSV).
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.6 Droit d'Opposition
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez vous opposer au traitement de vos données pour des raisons tenant à votre situation particulière,
              ou pour prospection commerciale.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.7 Retrait du Consentement
            </h3>
            <p className="text-gray-700 mb-3">
              Lorsque le traitement repose sur votre consentement, vous pouvez le retirer à tout moment.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.8 Exercice de Vos Droits
            </h3>
            <p className="text-gray-700 mb-3">
              Pour exercer vos droits, contactez-nous :
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Email :</strong> dpo@eduzen.io</li>
              <li><strong>Formulaire :</strong> Paramètres → Données → Demande RGPD (dans l'application)</li>
              <li><strong>Courrier :</strong> EDUZEN SAS - DPO, [Adresse]</li>
            </ul>
            <p className="text-gray-700 mb-3">
              Nous répondrons à votre demande dans un délai d'un mois.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              9.9 Réclamation
            </h3>
            <p className="text-gray-700 mb-3">
              Vous avez le droit d'introduire une réclamation auprès de la CNIL :
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Site :</strong> www.cnil.fr</li>
              <li><strong>Adresse :</strong> 3 Place de Fontenoy, 75007 Paris</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Sécurité des Données
            </h2>
            <p className="text-gray-700 mb-3">
              Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données contre :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>L'accès non autorisé</li>
              <li>La modification, la divulgation ou la destruction</li>
              <li>La perte accidentelle</li>
            </ul>
            <p className="text-gray-700 mb-3 mt-4">
              Ces mesures incluent :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Chiffrement :</strong> SSL/TLS pour les communications, chiffrement des données sensibles</li>
              <li><strong>Authentification forte :</strong> Mots de passe robustes, 2FA disponible</li>
              <li><strong>Contrôle d'accès :</strong> Accès limité aux seules personnes autorisées</li>
              <li><strong>Sauvegardes :</strong> Sauvegardes quotidiennes chiffrées</li>
              <li><strong>Monitoring :</strong> Surveillance des accès et détection d'anomalies</li>
              <li><strong>Audits :</strong> Audits de sécurité réguliers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Cookies et Technologies Similaires
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.1 Qu'est-ce qu'un Cookie ?
            </h3>
            <p className="text-gray-700 mb-3">
              Un cookie est un petit fichier texte déposé sur votre terminal lors de la visite d'un site.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.2 Types de Cookies Utilisés
            </h3>
            
            <h4 className="font-semibold text-gray-900 mb-2 mt-3">
              Cookies Strictement Nécessaires (pas de consentement requis)
            </h4>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Authentification et sécurité</li>
              <li>Maintien de session</li>
              <li>Préférences d'interface</li>
            </ul>

            <h4 className="font-semibold text-gray-900 mb-2 mt-3">
              Cookies de Performance (avec consentement)
            </h4>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Analytics anonymisées (Plausible)</li>
              <li>Mesure d'audience</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.3 Gestion des Cookies
            </h3>
            <p className="text-gray-700 mb-3">
              Vous pouvez gérer vos préférences cookies :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Via la bannière cookies lors de votre première visite</li>
              <li>Dans Paramètres → Confidentialité → Cookies</li>
              <li>Via les paramètres de votre navigateur</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Mineurs
            </h2>
            <p className="text-gray-700 mb-3">
              Le Service est accessible aux mineurs dans le cadre d'une formation, avec le consentement des parents/tuteurs
              légaux.
            </p>
            <p className="text-gray-700 mb-3">
              Les parents/tuteurs peuvent exercer les droits RGPD au nom de leur enfant mineur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Modifications de la Politique
            </h2>
            <p className="text-gray-700 mb-3">
              Nous nous réservons le droit de modifier cette Politique de Confidentialité à tout moment.
            </p>
            <p className="text-gray-700 mb-3">
              Vous serez informé par email de toute modification majeure au moins 30 jours avant son entrée en vigueur.
            </p>
            <p className="text-gray-700 mb-3">
              Nous vous encourageons à consulter régulièrement cette page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Contact
            </h2>
            <p className="text-gray-700 mb-3">
              Pour toute question relative à cette Politique de Confidentialité ou à la protection de vos données :
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Délégué à la Protection des Données (DPO) :</strong></li>
              <li><strong>Email :</strong> dpo@eduzen.io</li>
              <li><strong>Adresse :</strong> EDUZEN SAS - DPO, [Adresse]</li>
              <li><strong>Formulaire :</strong> Disponible dans l'application (Paramètres → Données)</li>
            </ul>
          </section>

          <div className="bg-gray-100 p-6 rounded-lg mt-12">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Dernière mise à jour :</strong> 14 Janvier 2026
            </p>
            <p className="text-sm text-gray-700">
              Version 1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
