import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation - EDUZEN',
  description: 'Conditions Générales d\'Utilisation de la plateforme EDUZEN',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-gray-600 mb-8">
          Dernière mise à jour : 14 Janvier 2026
        </p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Définitions
            </h2>
            <p className="text-gray-700 mb-3">
              Les termes suivants, lorsqu'ils sont utilisés avec une majuscule, ont la signification suivante :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>« Service »</strong> : désigne la plateforme EDUZEN accessible à l'adresse app.eduzen.io</li>
              <li><strong>« Utilisateur »</strong> : désigne toute personne physique ou morale utilisant le Service</li>
              <li><strong>« Organisation »</strong> : désigne l'établissement d'enseignement ou organisme de formation utilisant le Service</li>
              <li><strong>« Apprenant »</strong> : désigne l'étudiant, stagiaire ou participant inscrit via le Service</li>
              <li><strong>« CGU »</strong> : désigne les présentes Conditions Générales d'Utilisation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Objet et Champ d'Application
            </h2>
            <p className="text-gray-700 mb-3">
              Les présentes CGU ont pour objet de définir les conditions et modalités d'utilisation du Service EDUZEN,
              plateforme SaaS de gestion de formations et d'établissements d'enseignement.
            </p>
            <p className="text-gray-700 mb-3">
              En accédant ou en utilisant le Service, l'Utilisateur reconnaît avoir pris connaissance des présentes CGU
              et s'engage à les respecter sans réserve.
            </p>
            <p className="text-gray-700">
              L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Acceptation des CGU
            </h2>
            <p className="text-gray-700 mb-3">
              L'acceptation des présentes CGU est matérialisée par :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>La case à cocher lors de la création du compte</li>
              <li>L'utilisation du Service après cette acceptation</li>
            </ul>
            <p className="text-gray-700 mb-3">
              L'Utilisateur reconnaît que cette acceptation électronique a la même valeur qu'une signature manuscrite.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Description du Service
            </h2>
            <p className="text-gray-700 mb-3">
              EDUZEN est une plateforme SaaS (Software as a Service) permettant aux organismes de formation et
              établissements d'enseignement de gérer :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Les inscriptions et dossiers des apprenants</li>
              <li>La planification et le suivi des formations</li>
              <li>Les émargements et présences</li>
              <li>La génération de documents pédagogiques et administratifs</li>
              <li>La facturation et les paiements</li>
              <li>La communication interne (messagerie)</li>
              <li>Le portail apprenant et portail parent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Inscription et Compte Utilisateur
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              5.1 Création de Compte
            </h3>
            <p className="text-gray-700 mb-3">
              Pour utiliser le Service, l'Utilisateur doit créer un compte en fournissant des informations exactes,
              à jour et complètes.
            </p>
            <p className="text-gray-700 mb-3">
              L'Utilisateur s'engage à :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Ne créer qu'un seul compte</li>
              <li>Fournir des informations véridiques</li>
              <li>Maintenir ses informations à jour</li>
              <li>Ne pas usurper l'identité d'une autre personne</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              5.2 Sécurité du Compte
            </h3>
            <p className="text-gray-700 mb-3">
              L'Utilisateur est responsable de la confidentialité de ses identifiants de connexion. Il s'engage à :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Choisir un mot de passe robuste</li>
              <li>Ne pas partager ses identifiants</li>
              <li>Informer immédiatement EDUZEN en cas d'utilisation non autorisée</li>
              <li>Activer la double authentification (2FA) lorsque disponible</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Tarification et Facturation
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              6.1 Abonnement
            </h3>
            <p className="text-gray-700 mb-3">
              Le Service est accessible par abonnement selon les formules tarifaires en vigueur, disponibles sur le site
              eduzen.io/tarifs.
            </p>
            <p className="text-gray-700 mb-3">
              Les tarifs sont indiqués hors taxes (HT) et font l'objet d'une facturation mensuelle ou annuelle.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              6.2 Paiement
            </h3>
            <p className="text-gray-700 mb-3">
              Le paiement s'effectue par :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Carte bancaire (prélèvement automatique)</li>
              <li>Virement bancaire (sur facture)</li>
              <li>Prélèvement SEPA</li>
            </ul>
            <p className="text-gray-700 mb-3">
              En cas de défaut de paiement, EDUZEN se réserve le droit de suspendre l'accès au Service après mise en
              demeure restée sans effet pendant 15 jours.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              6.3 Modification des Tarifs
            </h3>
            <p className="text-gray-700 mb-3">
              EDUZEN se réserve le droit de modifier ses tarifs à tout moment.
            </p>
            <p className="text-gray-700 mb-3">
              En cas d'augmentation, l'Utilisateur sera informé au moins 30 jours avant l'application des nouveaux tarifs
              et pourra résilier son abonnement sans frais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Obligations de l'Utilisateur
            </h2>
            
            <p className="text-gray-700 mb-3">
              L'Utilisateur s'engage à :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Utiliser le Service conformément à sa destination</li>
              <li>Respecter la législation en vigueur</li>
              <li>Ne pas porter atteinte aux droits de tiers</li>
              <li>Ne pas tenter d'accéder de manière non autorisée au Service</li>
              <li>Ne pas introduire de virus ou code malveillant</li>
              <li>Ne pas copier, modifier ou distribuer le Service ou son contenu</li>
              <li>Ne pas utiliser le Service à des fins illégales ou frauduleuses</li>
              <li>Respecter les droits de propriété intellectuelle d'EDUZEN</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Propriété Intellectuelle
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              8.1 Propriété d'EDUZEN
            </h3>
            <p className="text-gray-700 mb-3">
              L'ensemble des éléments du Service (structure, design, textes, graphismes, logiciels, bases de données, etc.)
              est la propriété exclusive d'EDUZEN ou fait l'objet d'une licence d'utilisation.
            </p>
            <p className="text-gray-700 mb-3">
              Toute reproduction, représentation, utilisation ou adaptation, sous quelque forme que ce soit, sans
              l'autorisation expresse d'EDUZEN, est interdite.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              8.2 Propriété des Données Utilisateur
            </h3>
            <p className="text-gray-700 mb-3">
              L'Utilisateur conserve l'entière propriété des données qu'il saisit ou importe dans le Service.
            </p>
            <p className="text-gray-700 mb-3">
              L'Utilisateur accorde à EDUZEN une licence d'utilisation de ses données uniquement pour l'exécution du
              Service et pour la durée de l'abonnement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Protection des Données Personnelles
            </h2>
            <p className="text-gray-700 mb-3">
              La collecte et le traitement des données personnelles sont régis par la Politique de Confidentialité
              d'EDUZEN, disponible à l'adresse{' '}
              <a href="/legal/privacy" className="text-blue-600 hover:underline">
                app.eduzen.io/legal/privacy
              </a>.
            </p>
            <p className="text-gray-700 mb-3">
              EDUZEN s'engage à respecter le Règlement Général sur la Protection des Données (RGPD) et à garantir la
              sécurité des données personnelles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Responsabilité
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              10.1 Disponibilité du Service
            </h3>
            <p className="text-gray-700 mb-3">
              EDUZEN s'engage à fournir un Service accessible 24h/24 et 7j/7, sauf interruptions pour maintenance ou cas
              de force majeure.
            </p>
            <p className="text-gray-700 mb-3">
              EDUZEN ne garantit pas que le Service sera exempt d'erreurs ou d'interruptions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              10.2 Limitation de Responsabilité
            </h3>
            <p className="text-gray-700 mb-3">
              EDUZEN ne pourra être tenu responsable :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Des dommages indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le Service</li>
              <li>De la perte de données résultant d'une action de l'Utilisateur</li>
              <li>Des actes frauduleux de tiers</li>
              <li>De l'utilisation du Service non conforme aux présentes CGU</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Durée et Résiliation
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.1 Durée
            </h3>
            <p className="text-gray-700 mb-3">
              Le contrat est conclu pour la durée de l'abonnement souscrit (mensuel ou annuel) et se renouvelle
              tacitement sauf résiliation.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.2 Résiliation par l'Utilisateur
            </h3>
            <p className="text-gray-700 mb-3">
              L'Utilisateur peut résilier son abonnement à tout moment depuis son compte, avec un préavis de 30 jours.
            </p>
            <p className="text-gray-700 mb-3">
              Aucun remboursement ne sera effectué pour la période en cours.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.3 Résiliation par EDUZEN
            </h3>
            <p className="text-gray-700 mb-3">
              EDUZEN peut résilier le contrat en cas de :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Violation des présentes CGU</li>
              <li>Défaut de paiement persistant</li>
              <li>Utilisation frauduleuse du Service</li>
              <li>Atteinte à la sécurité ou à la réputation d'EDUZEN</li>
            </ul>
            <p className="text-gray-700 mb-3">
              La résiliation prendra effet immédiatement après notification.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">
              11.4 Effets de la Résiliation
            </h3>
            <p className="text-gray-700 mb-3">
              En cas de résiliation :
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>L'accès au Service est immédiatement suspendu</li>
              <li>L'Utilisateur dispose de 30 jours pour exporter ses données</li>
              <li>Passé ce délai, les données pourront être supprimées définitivement</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Modifications des CGU
            </h2>
            <p className="text-gray-700 mb-3">
              EDUZEN se réserve le droit de modifier les présentes CGU à tout moment.
            </p>
            <p className="text-gray-700 mb-3">
              L'Utilisateur sera informé par email de toute modification majeure au moins 30 jours avant son entrée en
              vigueur.
            </p>
            <p className="text-gray-700 mb-3">
              La poursuite de l'utilisation du Service après l'entrée en vigueur des nouvelles CGU vaut acceptation de
              celles-ci.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Droit Applicable et Juridiction
            </h2>
            <p className="text-gray-700 mb-3">
              Les présentes CGU sont régies par le droit français.
            </p>
            <p className="text-gray-700 mb-3">
              En cas de litige, les parties s'efforceront de trouver une solution amiable.
            </p>
            <p className="text-gray-700 mb-3">
              À défaut, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Contact
            </h2>
            <p className="text-gray-700 mb-3">
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter :
            </p>
            <ul className="list-none text-gray-700 space-y-2">
              <li><strong>Email :</strong> legal@eduzen.io</li>
              <li><strong>Adresse :</strong> [Adresse de l'entreprise]</li>
              <li><strong>Téléphone :</strong> +33 (0)1 XX XX XX XX</li>
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
