/**
 * Templates par défaut pour chaque type de document
 * Style Premium inspiré de INSSI FORMATION
 * 
 * Caractéristiques du style :
 * - En-tête professionnel avec logo à droite et infos à gauche
 * - Pied de page avec SIRET, déclaration d'activité et pagination
 * - Mise en page cohérente sur tous les types de documents
 */

import type { DocumentType } from '@/lib/types/document-templates'

export interface DocumentTemplateDefault {
  type: DocumentType
  name: string
  headerContent: string
  bodyContent: string
  footerContent: string
}

/**
 * Header Premium - Structure standardisée
 * Tableau de 2 colonnes et 1 ligne avec contours invisibles
 * Le tableau prend toute la largeur de l'en-tête (100%)
 * Colonne gauche : Informations de l'organisme de formation
 * Colonne droite : Logo
 * Toutes les écritures en Times New Roman, taille 8pt
 */
const premiumHeader = `
  <div style="width: 100%; padding: 10px 0 10px 0; margin-bottom: 12px; font-family: 'Times New Roman', Times, serif;">
    <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0; table-layout: fixed;">
      <tr>
        <td style="width: 70%; vertical-align: top; padding-right: 15px; border: 0; text-align: left;">
          <p style="font-weight: bold; font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; margin: 0 0 3px 0; color: #1A1A1A; line-height: 1.2;">
            {ecole_nom}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            {ecole_adresse}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            {ecole_code_postal} {ecole_ville}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            Email : {ecole_email}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            Tel : {ecole_telephone}
          </p>
        </td>
        <td style="width: 30%; vertical-align: top; border: 0; text-align: right;">
          {ecole_logo}
        </td>
      </tr>
    </table>
  </div>
`

/**
 * Footer Premium - Style INSSI FORMATION
 * SIRET, déclaration d'activité, mention légale et pagination
 */
const premiumFooter = `
  <div style="padding: 8px 0 6px 0; margin-top: 10px; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
    <p style="font-size: 7pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.3;">
      {ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | Numéro SIRET: {ecole_siret}
    </p>
    <p style="font-size: 7pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 2px 0 0 0; text-align: center; line-height: 1.2;">
      Numéro de déclaration d'activité: {ecole_numero_declaration} <em>(auprès du préfet de région de: {ecole_region})</em>
    </p>
    <p style="font-size: 7pt; font-family: 'Times New Roman', Times, serif; color: #888; font-style: italic; margin: 2px 0 0 0; text-align: center; line-height: 1.2;">
      Cet enregistrement ne vaut pas l'agrément de l'État.
    </p>
  </div>
`

/**
 * Séparateur horizontal simple
 */
const separator = '<div style="border-top: 1px solid #E5E7EB; margin: 20px 0;"></div>'

/**
 * Génère la section "Entre les soussignés" pour les contrats
 */
function generatePartiesSection(): string {
  return `
    <div style="margin-bottom: 25px;">
      <p style="font-weight: bold; margin: 0 0 12px 0; font-size: 11pt;">Entre l'organisme de formation : {ecole_nom}</p>
      <p style="margin: 0 0 3px 0; font-size: 10pt;">immatriculée au RCS de sous le numéro {ecole_siret}</p>
      <p style="margin: 0 0 10px 0; font-size: 10pt;">Dont le siège social est situé {ecole_adresse} {ecole_code_postal} {ecole_ville}.</p>
      
      <p style="margin: 12px 0 0 0; font-size: 10pt;">
        Représentée aux fins des présentes par {ecole_representant} en sa qualité de représentant, dûment habilité(e).
      </p>
      <p style="margin: 5px 0 0 0; font-size: 10pt;">
        Déclaration d'activité n°{ecole_numero_declaration} auprès de la préfecture de la région .
      </p>
      
      <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
        Ci-après dénommée « l'Organisme de Formation »
      </p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'une part</p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">Et {eleve_prenom} {eleve_nom}</p>
      
      <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
        Ci-après dénommée « le Bénéficiaire »
      </p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'autre part</p>
      
      <p style="margin: 20px 0 15px 0; font-style: italic; font-size: 10pt;">
        Ci-après individuellement ou collectivement désigné(s) la ou les « Partie(s) »
      </p>
    </div>
  `
}

/**
 * Génère une section de signatures
 */
function generateSignatureSection(leftTitle: string, rightTitle: string): string {
  return `
    <div style="margin-top: 40px;">
      <p style="text-align: center; margin-bottom: 25px; font-size: 10pt;">
        Fait à {ecole_ville}, le {date_jour}
      </p>
      
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 45%; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">${leftTitle}</p>
          <p style="margin-bottom: 8px; font-size: 10pt;">{ecole_nom}</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
            <p style="font-size: 9pt; color: #666;">Signature</p>
          </div>
        </div>
        <div style="width: 45%; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">${rightTitle}</p>
          <p style="margin-bottom: 8px; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
            <p style="font-size: 9pt; color: #666;">Signature</p>
          </div>
        </div>
      </div>
    </div>
  `
}

/**
 * Templates par défaut pour tous les types de documents
 */
export const documentTemplateDefaults: Record<DocumentType, DocumentTemplateDefault> = {
  // ==========================================
  // CONTRAT DE FORMATION PROFESSIONNELLE
  // ==========================================
  convention: {
    type: 'convention',
    name: 'Contrat de formation professionnelle',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          Contrat de formation professionnelle
        </h1>
        <p style="font-size: 9pt; color: #666; margin: 0; font-style: italic;">
          (Article L. 6353-1 du Code du Travail Décret N° 2018-1341 du 28 décembre 2018)
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="font-weight: bold; margin: 0 0 12px 0; font-size: 11pt;">Entre l'organisme de formation : {ecole_nom}</p>
        <p style="margin: 0 0 3px 0; font-size: 10pt;">immatriculée au RCS de sous le numéro {ecole_siret}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;">Dont le siège social est situé {ecole_adresse} {ecole_code_postal} {ecole_ville}.</p>
        
        <p style="margin: 12px 0 0 0; font-size: 10pt;">
          Représentée aux fins des présentes par {ecole_representant} en sa qualité de représentant, dûment habilité(e).
        </p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">
          Déclaration d'activité n°{ecole_numero_declaration} auprès de la préfecture de la région {ecole_region}.
        </p>
        
        <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
          Ci-après dénommée « l'Organisme de Formation »
        </p>
        
        <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'une part</p>
        
        <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">Et {eleve_prenom} {eleve_nom}</p>
        
        <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
          Ci-après dénommée « le Bénéficiaire »
        </p>
        
        <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'autre part</p>
        
        <p style="margin: 20px 0 15px 0; font-style: italic; font-size: 10pt;">
          Ci-après individuellement ou collectivement désigné(s) la ou les « Partie(s) »
        </p>
      </div>

      <p style="text-align: justify; line-height: 1.6; margin: 20px 0; font-size: 10pt;">
        Il est conclu un contrat de formation professionnelle conformément aux dispositions des articles L. 6311-1 à L. 6363-2 du Code du Travail, et 
        également en application des dispositions du Livre III de la 6ème partie et des catégories prévues à l'article L6313.1 du Code du Travail relatif à la 
        formation professionnelle continue tout au long de la vie
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">1. Objet du contrat</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        Aux termes du présent contrat, l'Organisme de Formation s'engage à organiser l'action de formation suivante :
      </p>
      <p style="font-weight: bold; font-size: 11pt; margin: 10px 0;">{formation_nom} DU {session_debut} au {session_fin}</p>
      
      <p style="margin: 10px 0 5px 0; font-size: 10pt;">
        Catégorie de l'action de formation (art. L6313-1 du code du travail) :<br/>
        <strong>Action de formation</strong>
      </p>
      
      <p style="margin: 15px 0 8px 0; font-size: 10pt;">
        Diplôme visé : <strong>Certification (dont CQP) ou habilitation enregistrée au Répertoire National des Certifications Professionnelles (RNCP)</strong>
      </p>
      
      <p style="margin: 15px 0 5px 0; font-size: 10pt;">Objectifs : {formation_objectifs}</p>
      <p style="margin: 5px 0; font-size: 10pt;">Contenu de l'action de formation et moyens prévus : Annexe 1</p>
      <p style="margin: 5px 0; font-size: 10pt;">Durée : <strong>{formation_duree}</strong></p>
      <p style="margin: 5px 0; font-size: 10pt;">Lieu de la formation : <strong>{session_lieu}</strong></p>
      <p style="margin: 5px 0; font-size: 10pt;">Effectifs formés : <strong>{session_effectif}</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #F3F4F6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #E5E7EB; font-weight: bold;">Date</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #E5E7EB; font-weight: bold;">Heure</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #E5E7EB; font-weight: bold;">Lieu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">du {session_debut} au {session_fin}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #E5E7EB;">en présentiel</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #E5E7EB;">en présentiel</td>
          </tr>
        </tbody>
      </table>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">2. Effectif formé</h2>
      
      <p style="font-size: 10pt; margin: 0 0 10px 0;"><strong>Public visé au sens de l'article L 6313-3 du Code du Travail :</strong></p>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>les actions de formation ont pour objet de permettre à toute personne sans qualification professionnelle ou sans contrat de travail d'accéder dans les meilleures conditions à un emploi</li>
        <li>favoriser l'adaptation des travailleurs à leur poste de travail, à l'évolution des emplois ainsi que leur maintien dans l'emploi et de participer au développement des compétences en lien ou non avec leur poste de travail. Elles peuvent permettre à des travailleurs d'acquérir une qualification plus élevée</li>
        <li>réduire, pour les travailleurs dont l'emploi est menacé, les risques résultant d'une qualification inadaptée à l'évolution des techniques et des structures des entreprises, en les préparant à une mutation d'activité soit dans le cadre, soit en dehors de leur entreprise. Elles peuvent permettre à des salariés dont le contrat de travail est rompu d'accéder à des emplois exigeant une qualification différente, ou à des non-salariés d'accéder à de nouvelles activités professionnelles</li>
        <li>favoriser la mobilité professionnelle.</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">3. Prix de la formation</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        En contrepartie de cette action de formation, le bénéficiaire (ou le financeur dans le cadre d'une subrogation de paiement) s'acquittera des coûts 
        suivants qui couvrent l'intégralité des frais engagés par l'organisme de formation pour cette session :
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #F3F4F6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #E5E7EB; font-weight: bold;">Description</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #E5E7EB; font-weight: bold;">Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">Formation</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #E5E7EB;">{montant_ttc}€</td>
          </tr>
        </tbody>
      </table>
      
      <p style="margin: 10px 0 5px 0; font-size: 10pt;">L'organisme de formation atteste être exonéré de TVA.</p>
      <p style="margin: 5px 0; font-size: 10pt; font-weight: bold;">TOTAL NET DE TAXES : {montant_ttc}€</p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">4. Modalités de déroulement (présentiel, à distance, mixte, en situation de travail) et de suivi</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        La Formation s'effectue Formation présentielle.
      </p>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        Des feuilles de présence seront signées par les Stagiaires et le(s) formateur(s) par demi-journée de formation, l'objectif étant de justifier la 
        réalisation de la Formation.
      </p>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        L'appréciation des résultats se fera à travers la mise en œuvre QCM et/ou grilles d'évaluation et/ou travaux pratiques et/ou fiches d'évaluation 
        et/ou mises en situation et/ou autre.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">5. Moyens de sanction (diplôme, titre professionnel, certification, attestation de fin de formation ou autres)</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        À l'issue de la Formation, l'Organisme de Formation délivre au Stagiaire le {diplome_ou_certification} en cas de réussite.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">6. Dédit ou abandon</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        En cas de dédit par le Bénéficiaire à moins de 7 jours francs avant le début de l'action mentionnée à l'article 1, ou d'abandon en cours de 
        Formation par un ou plusieurs Stagiaire(s), l'Organisme de Formation (i) remboursera sur le coût total, les sommes qu'il n'aura pas réellement 
        dépensées ou engagées pour la réalisation de ladite action et/ou (ii) proposera une nouvelle date de Formation.
      </p>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Le cas échéant, le Bénéficiaire s'engage au versement d'un montant de 20 % du coût total de la Formation à titre de dédommagement, cette 
        somme ne pouvant faire l'objet d'un financement par fonds publics ou paritaires.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">7. Modalités de règlement</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Le paiement sera dû en totalité à réception d'une facture émise par l'Organisme de Formation à destination du Bénéficiaire.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">8. Propriété intellectuelle</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Les supports de formation, quelle qu'en soit la forme, et les contenus de toute nature (textes, images, visuels, musiques, logos, marques, base de 
        données, etc.) exploités par l'Organisme de Formation dans le cadre de l'action de formation sont protégés par tous droits de propriété 
        intellectuelle ou droits des producteurs de bases de données en vigueur. Tous désassemblages, décompilations, décryptages, extractions, 
        réutilisations, copies et plus généralement, tous actes de reproduction, représentation, diffusion et utilisation de l'un quelconque de ces 
        éléments, en tout ou partie, sans l'autorisation de l'Organisme de Formation sont strictement interdits et pourront faire l'objet de poursuites 
        judiciaires.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">9. Données à caractère personnel</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        L'Organisme de Formation pratique une politique de protection des données personnelles dont les caractéristiques sont explicitées dans la 
        politique de confidentialité.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">10. Différents éventuels</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Si une contestation ou un différend ne peuvent être réglés à l'amiable, le Tribunal de {ecole_ville} sera seul compétent pour régler le litige.
      </p>

      <p style="text-align: center; margin: 30px 0 20px 0; font-size: 10pt;">
        Document réalisé en 2 exemplaires à {ecole_ville}, le {date_jour}.
      </p>

      <div style="margin-top: 40px;">
        <p style="text-align: center; margin-bottom: 25px; font-size: 10pt;">
          Pour l'organisme de formation,
        </p>
        
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">Pour l'Organisme de Formation</p>
            <p style="margin-bottom: 8px; font-size: 10pt;">{ecole_nom}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
              <p style="font-size: 9pt; color: #666;">Signature</p>
            </div>
          </div>
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">Pour le Bénéficiaire</p>
            <p style="margin-bottom: 8px; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
              <p style="font-size: 9pt; color: #666;">Signature</p>
            </div>
          </div>
        </div>
      </div>

      <div style="page-break-before: always; margin-top: 40px;">
        <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Annexe 1 : Programme de formation</h2>
        <p style="font-size: 10pt; margin: 0 0 10px 0;"><strong>Nom de la session :</strong> {formation_nom} DU {session_debut} au {session_fin}</p>
        
        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">DURÉE ET LIEU DE FORMATION</h3>
        <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
          <li>Durée en heures : {formation_duree}</li>
          <li>Lieu : {session_lieu}</li>
        </ul>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">PUBLIC CONCERNÉ</h3>
        <p style="font-size: 10pt; margin: 0 0 20px 0;">{formation_public_concerne}</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">PRÉREQUIS</h3>
        <div style="font-size: 10pt; margin: 0 0 20px 0;">
          {formation_prerequis}
        </div>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">QUALITÉ ET INDICATEURS DE RÉSULTATS</h3>
        <p style="font-size: 10pt; margin: 0 0 20px 0;">{formation_qualite_et_resultats}</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">ACCESSIBILITÉ</h3>
        <p style="font-size: 10pt; margin: 0 0 20px 0;">Formation accessible aux personnes en situation de handicap. Pour toutes demandes d'adaptation, veuillez contacter notre référent handicap.</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">OBJECTIFS</h3>
        <div style="font-size: 10pt; margin: 0 0 20px 0;">
          {formation_objectifs}
        </div>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">CONTENU DE LA FORMATION</h3>
        <div style="font-size: 10pt; margin: 0 0 20px 0;">
          {formation_contenu}
        </div>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">ORGANISATION DE LA FORMATION</h3>
        <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
          <li><strong>Équipe pédagogique :</strong> {formation_equipe_pedagogique}</li>
          <li><strong>Ressources pédagogiques et techniques prévues :</strong> {formation_ressources}</li>
          <li>accueil des Stagiaires dans une salle dédiée à la formation,</li>
          <li>fourniture des supports de formation : {formation_supports}</li>
        </ul>
      </div>

      <div style="page-break-before: always; margin-top: 40px;">
        <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Annexe 2 : Règlement Intérieur</h2>
        
        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 1 - Objet et champ d'application</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 15px 0; font-size: 10pt;">
          Conformément aux dispositions des articles L.6352-3, L.6352-4 et R.6352-1 à R.6352-15 du Code du Travail, le présent règlement a pour objet de 
          déterminer les principales mesures applicables en matière de santé, de sécurité et de discipline aux stagiaires de l'organisme de formation, 
          dénommé ci-après.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 15px 0; font-size: 10pt;">
          Tout stagiaire doit respecter les termes du présent règlement durant toute la durée de l'action de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Toutefois, lorsque la formation se déroule dans une entreprise déjà dotée d'un règlement intérieur, les mesures de santé et de sécurité 
          applicables aux stagiaires sont celles de ce règlement.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 2 - Hygiène et sécurité</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Chaque stagiaire doit veiller au respect des consignes générales et particulières en matière d'hygiène et de sécurité, sous peine de sanctions 
          disciplinaires.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Propreté des locaux</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les stagiaires doivent maintenir en ordre et en état de propreté constante les locaux où se déroule la formation. À ce titre, il leur est interdit de 
          manger dans les salles de cours.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Alcool et produits stupéfiants</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'introduction et la consommation de produits stupéfiants ou de boissons alcoolisées est strictement interdite.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Il est également interdit de pénétrer ou de demeurer dans l'établissement en état d'ivresse ou sous l'emprise de produits stupéfiants.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Consignes de sécurité – Incendie</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les consignes d'incendie et notamment un plan de localisation des extincteurs et des issues de secours sont affichés dans les locaux de formation 
          de manière à être connus des stagiaires.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les stagiaires sont tenu·e·s d'exécuter sans délai l'ordre d'évacuation donné par l'animateur de la formation ou par un salarié de l'entreprise où 
          se déroule la formation.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Accident - déclaration</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tout accident ou incident survenu à l'occasion ou en cours de formation doit être immédiatement déclaré par le·la stagiaire accidenté·e ou les 
          personnes témoins de l'accident, à l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Conformément à l'article R. 6342-3 du Code du Travail, l'accident survenu au·à la stagiaire pendant qu'il·elle se trouve sur le lieu de formation ou 
          pendant qu'il·elle s'y rend ou en revient, fait l'objet d'une déclaration par l'organisme de formation auprès de la caisse de sécurité sociale.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Interdiction de fumer ou de vapoter</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Il est interdit de fumer ou de vapoter (utilisation d'une cigarette électronique) dans les locaux de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Les stagiaires sont toutefois autorisé·e·s pendant leur temps de pause à aller fumer ou vapoter à l'extérieur de l'établissement.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 3 – Horaires, absences et retards</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les horaires de la formation seront communiqués aux stagiaires au préalable. Les stagiaires sont tenu·e·s de respecter ces horaires.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Sauf autorisation express, les stagiaires ne peuvent pas s'absenter pendant les heures de formation. L'émargement devra être fait au début ou à 
          la fin de chaque atelier selon la pratique de l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          En cas d'absence ou retard, les stagiaires en informent dans les plus brefs délais l'organisme de formation et s'en justifier.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'employeur du stagiaire est informé des absences dans les meilleurs délais qui suivent la connaissance par l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          De plus, pour les stagiaires dont le coût de la formation est pris en charge par un financeur externe (OPCO, Pôle Emploi, Caisse des Dépôts), les 
          absences non justifiées entraînent une retenue sur la prise en charge du coût de la formation, proportionnelle à la durée de l'absence.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 4 - Comportement</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Il est demandé à tout stagiaire d'avoir un comportement garantissant le respect des règles élémentaires de savoir vivre, de savoir être en 
          collectivité et le bon déroulement des formations.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">À titre d'exemple, il est formellement interdit aux stagiaires :</p>
        <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
          <li>De modifier, d'utiliser à une fin tierce ou de diffuser les supports de formation sans l'autorisation express de l'organisme de formation ;</li>
          <li>De modifier les réglages des paramètres de l'ordinateur ;</li>
          <li>D'utiliser leurs téléphones portables durant les sessions à des fins autres que celles de la formation.</li>
        </ul>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 5 : Accès aux locaux</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les stagiaires ont accès aux locaux où se déroule la formation exclusivement pour suivre le stage auquel ils·elles sont inscrit·e·s. Ils·elles ne 
          peuvent y entrer ou y demeurer à d'autres fins, sauf autorisation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Il leur est interdit d'être accompagné·e·s de personnes non inscrites au stage.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 6 - Utilisation du matériel</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tout·e stagiaire est tenu·e de conserver en bon état le matériel et la documentation mis à la disposition par l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'utilisation du matériel à d'autres fins, notamment personnelles est interdite, sauf pour le matériel mis à disposition à cet effet.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Il est formellement interdit de diffuser les codes personnels nécessaires pour se connecter à l'espace extranet.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          A la fin du stage, le·la stagiaire est tenu·e de restituer tout matériel et document en sa possession appartenant à l'organisme de formation, sauf 
          les documents pédagogiques distribués en cours de formation ou présents sur son extranet.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          La documentation pédagogique remise lors des sessions de formation est protégée au titre des droits d'auteur et ne peut être réutilisée que pour 
          un strict usage personnel.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Il est formellement interdit pour le.la stagiaire, sauf dérogation expresse, d'enregistrer ou de filmer les sessions de formation.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 7 : Vol ou dégradation des biens personnels des stagiaires</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          L'organisme de formation décline toute responsabilité en cas de perte, vol ou détérioration des objets personnels de toute nature déposés par 
          les stagiaires dans les locaux de formation.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 8 - Sanctions</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tout agissement considéré comme fautif pourra, en fonction de sa gravité, faire l'objet de l'une ou l'autre des sanctions ci-après, sans 
          nécessairement suivre l'ordre de ce classement :
        </p>
        <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
          <li>rappel à l'ordre ;</li>
          <li>avertissement écrit ;</li>
          <li>blâme ;</li>
          <li>exclusion temporaire de la formation ;</li>
          <li>exclusion définitive de la formation.</li>
        </ul>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          L'organisme de formation informe de la sanction prise le cas échéant : l'employeur du·de la stagiaire ou l'administration de l'agent stagiaire ; 
          et/ou le financeur du stage.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 9 - Procédure disciplinaire</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          En application de l'article R.6352-4 du Code du Travail, « aucune sanction ne peut être prononcée à l'encontre du stagiaire sans que celui-ci ait 
          été informé au préalable des griefs retenus contre lui ».
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Lorsque l'organisme de formation envisage une prise de sanction, il convoque le la stagiaire par lettre recommandée avec accusé de réception ou 
          remise à l'intéressé́ contre décharge en lui indiquant l'objet de la convocation, la date, l'heure et le lieu de l'entretien, sauf si la sanction 
          envisagée n'a pas d'incidence sur la présence du de la stagiaire pour la suite de la formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Au cours de l'entretien, le.la stagiaire a la possibilité de se faire assister par une personne de son choix, stagiaire ou salarié de l'organisme de 
          formation. La convocation mentionnée à l'article précèdent fait état de cette faculté. Lors de l'entretien, le motif de la sanction envisagée est 
          indiqué au à la stagiaire : celui.celle-ci a alors la possibilité de donner toute explication ou justification des faits qui lui sont reprochés.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Lorsqu'une mesure conservatoire d'exclusion temporaire à effet immédiat est considérée comme indispensable par l'organisme de formation, 
          aucune sanction définitive relative à l'agissement fautif à l'origine de cette exclusion ne peut être prise sans que le la stagiaire n'ait été au 
          préalable informé des griefs retenus contre lui elle et, éventuellement, qu'il elle ait été convoqué(e) à un entretien et ait eu la possibilité́ de 
          s'expliquer devant un Commission de discipline.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          La sanction ne peut intervenir moins d'un jour franc ni plus de 15 jours après l'entretien où, le cas échéant, après avis de la Commission de 
          discipline.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Elle fait l'objet d'une notification écrite et motivée au à la stagiaire sous forme lettre recommandée, ou d'une lettre remise contre décharge.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          L'organisme de formation informe concomitamment l'employeur, et éventuellement l'organisme paritaire prenant à sa charge les frais de 
          formation, de la sanction prise.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 10 : Représentation des stagiaires</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Dans les stages d'une durée supérieure à 500 heures, il est procédé simultanément à l'élection d'un délégué titulaire et d'un délégué suppléant 
          conformément aux dispositions des articles R.6352-9 et suivants du Code du Travail.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tous les stagiaires sont électeurs et éligibles, sauf les détenus admis à participer à une action de formation professionnelle.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'organisme de formation organise le scrutin qui a lieu pendant les heures de formation, au plus tôt 20 heures, au plus tard 40 heures après le 
          début du stage. En cas d'impossibilité́ de désigner les représentants des stagiaires, l'organisme de formation dresse un PV de carence qu'il 
          transmet au préfet de région territorialement compétent.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les délégués sont élus pour la durée de la formation. Leurs fonctions prennent fin lorsqu'ils cessent, pour quelque cause que ce soit, de participer 
          à la formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Si le délégué titulaire et le délégué suppléant ont cessé leurs fonctions avant la fin de la session de formation, il est procédé à une nouvelle 
          élection dans les conditions prévues aux articles R.6352-9 à R.6352-12.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Les représentants des stagiaires font toute suggestion pour améliorer le déroulement des stages et les conditions de vie des stagiaires dans 
          l'organisme de formation. Ils présentent toutes les réclamations individuelles ou collectives relatives à ces matières, aux conditions d'hygiène et 
          de sécurité ́ et à l'application du règlement intérieur.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 11 : Publicité</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Le présent règlement est affiché dans les locaux et sur le site internet de l'organisme de formation. En outre, un exemplaire est remis à chaque 
          stagiaire.
        </p>

        <p style="margin-top: 30px; font-size: 10pt;">Fait à {ecole_ville}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Le {date_jour}</p>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // FACTURE - ULTRA PREMIUM (1 page compacte)
  // ==========================================
  facture: {
    type: 'facture',
    name: 'Facture',
    headerContent: premiumHeader,
    bodyContent: `
      <!-- En-tête Facture Ultra Premium Compact -->
      <div style="margin-bottom: 5px;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0;">
          <tr>
            <td style="width: 60%; vertical-align: top; border: 0;">
              <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%); color: white; padding: 6px 12px; border-radius: 3px; display: inline-block;">
                <p style="margin: 0; font-size: 16pt; font-weight: 800; letter-spacing: 0.3px; font-family: 'Times New Roman', Times, serif;">FACTURE</p>
              </div>
              <p style="margin: 3px 0 0 0; font-size: 10pt; font-weight: 700; color: #1E3A5F; font-family: 'Times New Roman', Times, serif;">N° {numero_facture}</p>
            </td>
            <td style="width: 40%; vertical-align: top; border: 0; text-align: right;">
              <table cellpadding="0" cellspacing="0" style="margin-left: auto; border: 0;">
                <tr>
                  <td style="padding: 1px 5px 1px 0; font-size: 6.5pt; color: #64748B; border: 0; text-align: right;">Date d'émission</td>
                  <td style="padding: 1px 0; font-size: 7.5pt; font-weight: 600; color: #1E293B; border: 0;">{date_emission}</td>
                </tr>
                <tr>
                  <td style="padding: 1px 5px 1px 0; font-size: 6.5pt; color: #64748B; border: 0; text-align: right;">Échéance</td>
                  <td style="padding: 1px 0; font-size: 7.5pt; font-weight: 600; color: #DC2626; border: 0;">{date_echeance}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Séparateur élégant -->
      <div style="height: 1px; background: linear-gradient(90deg, #2563EB 0%, #60A5FA 50%, transparent 100%); margin: 4px 0;"></div>

      <!-- Informations Client Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 5px; border: 0;">
        <tr>
          <td style="width: 55%; vertical-align: top; padding-right: 8px; border: 0;">
            <div style="background: #F8FAFC; border-left: 2px solid #2563EB; padding: 4px 8px; border-radius: 0 2px 2px 0;">
              <p style="margin: 0 0 2px 0; font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #64748B;">Facturé à</p>
              <p style="margin: 0 0 1px 0; font-size: 9pt; font-weight: 700; color: #0F172A;">{eleve_prenom} {eleve_nom}</p>
              <p style="margin: 0 0 1px 0; font-size: 7pt; color: #475569; line-height: 1.15;">{eleve_adresse}</p>
              <p style="margin: 0 0 1px 0; font-size: 7pt; color: #475569; line-height: 1.15;">{eleve_code_postal} {eleve_ville}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #475569; line-height: 1.15;">{eleve_email} | {eleve_telephone}</p>
            </div>
          </td>
          <td style="width: 45%; vertical-align: top; border: 0;">
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 4px 8px; border-radius: 2px;">
              <p style="margin: 0 0 2px 0; font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #1D4ED8;">Référence client</p>
              <p style="margin: 0 0 1px 0; font-size: 8.5pt; font-weight: 700; color: #1E40AF;">N° {eleve_numero}</p>
              <p style="margin: 0; font-size: 7pt; color: #3B82F6; line-height: 1.15;">{formation_nom}</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- Tableau des prestations Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 5px; border-collapse: collapse; font-size: 7.5pt;">
        <thead>
          <tr>
            <th style="padding: 5px 6px; text-align: left; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.2px;">Description</th>
            <th style="padding: 5px 4px; text-align: center; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; width: 35px;">Qté</th>
            <th style="padding: 5px 4px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; width: 65px;">P.U. HT</th>
            <th style="padding: 5px 6px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; width: 65px;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #FFFFFF;">
            <td style="padding: 6px; border-bottom: 1px solid #E2E8F0; border-left: 1px solid #E2E8F0;">
              <p style="margin: 0 0 1px 0; font-weight: 600; font-size: 8pt; color: #0F172A;">{formation_nom}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #64748B; line-height: 1.15;">{session_debut} → {session_fin} | {formation_duree}</p>
            </td>
            <td style="padding: 6px 4px; text-align: center; border-bottom: 1px solid #E2E8F0; font-weight: 500; color: #334155; font-size: 7.5pt;">1</td>
            <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #E2E8F0; font-weight: 500; color: #334155; font-size: 7.5pt;">{montant_ht} €</td>
            <td style="padding: 6px; text-align: right; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 7.5pt;">{montant_ht} €</td>
          </tr>
        </tbody>
      </table>

      <!-- Bloc Totaux Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 5px; border: 0;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 8px; border: 0;">
            <!-- Montant en lettres -->
            <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 4px 8px; border-radius: 2px;">
              <p style="margin: 0 0 1px 0; font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; color: #166534;">Arrêté à la somme de</p>
              <p style="margin: 0; font-size: 7.5pt; font-style: italic; color: #15803D; line-height: 1.15;">{montant_lettres}</p>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7pt; color: #64748B; border: 1px solid #E2E8F0;">Sous-total HT</td>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7.5pt; font-weight: 600; color: #334155; border: 1px solid #E2E8F0; width: 70px;">{montant_ht} €</td>
              </tr>
              <tr>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7pt; color: #64748B; border: 1px solid #E2E8F0;">TVA ({taux_tva}%)</td>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7.5pt; font-weight: 500; color: #334155; border: 1px solid #E2E8F0;">{tva} €</td>
              </tr>
              <tr>
                <td style="padding: 5px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-size: 8pt; font-weight: 700; border-radius: 0 0 0 2px;">TOTAL TTC</td>
                <td style="padding: 5px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-size: 9.5pt; font-weight: 800; border-radius: 0 0 2px 0;">{montant_ttc} €</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Informations de paiement Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 4px; border: 0;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 4px; border: 0;">
            <div style="background: #FEF3C7; border-left: 2px solid #F59E0B; padding: 4px 8px; border-radius: 0 2px 2px 0;">
              <p style="margin: 0 0 2px 0; font-size: 6.5pt; font-weight: 700; color: #92400E;">💳 PAIEMENT</p>
              <p style="margin: 0 0 1px 0; font-size: 6.5pt; color: #78350F; line-height: 1.1;"><strong>Mode:</strong> {mode_paiement}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #78350F; line-height: 1.1;"><strong>IBAN:</strong> {iban}</p>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 4px; border: 0;">
            <div style="background: #FEF2F2; border-left: 2px solid #EF4444; padding: 4px 8px; border-radius: 0 2px 2px 0;">
              <p style="margin: 0 0 2px 0; font-size: 6.5pt; font-weight: 700; color: #991B1B;">⚠️ RETARD</p>
              <p style="margin: 0; font-size: 6pt; color: #7F1D1D; line-height: 1.1;">Taux × 3 + 40€ (L441-10)</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- Mentions légales ultra compactes -->
      <div style="background: #F1F5F9; padding: 3px 8px; border-radius: 2px; margin-top: 3px;">
        <p style="margin: 0; font-size: 6pt; color: #64748B; text-align: center; line-height: 1.2;">
          TVA non applicable (art. 293B CGI) • SIRET: {ecole_siret} • Déclaration: {ecole_numero_declaration}
        </p>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // DEVIS
  // ==========================================
  devis: {
    type: 'devis',
    name: 'Devis',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
        <div style="flex: 1;">
          <h1 style="font-size: 20pt; font-weight: bold; margin: 0; color: #1A1A1A;">DEVIS</h1>
          <p style="font-size: 12pt; margin: 8px 0 0 0; color: #666;">N° {numero_devis}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10pt; margin: 0;"><strong>Date d'émission :</strong> {date_emission}</p>
          <p style="font-size: 10pt; margin: 5px 0;"><strong>Valable jusqu'au :</strong> {validite_devis}</p>
        </div>
      </div>

      ${separator}

      <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
        <div style="width: 48%; padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A;">
          <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 10pt; text-transform: uppercase; color: #666;">Devis pour :</p>
          <p style="margin: 0; font-size: 11pt; font-weight: bold;">{eleve_nom} {eleve_prenom}</p>
          <p style="margin: 5px 0; font-size: 10pt; color: #666;">{eleve_adresse}</p>
          <p style="margin: 3px 0; font-size: 10pt; color: #666;">Tél : {eleve_telephone}</p>
          <p style="margin: 3px 0; font-size: 10pt; color: #666;">Email : {eleve_email}</p>
        </div>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 11pt; font-weight: 600;">
          Objet : Devis pour la formation "{formation_nom}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 10pt; color: #333;">{formation_description}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #1A1A1A; color: white;">
            <th style="padding: 10px 12px; text-align: left; font-weight: bold;">Description de la formation</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: bold; width: 80px;">Durée</th>
            <th style="padding: 10px 12px; text-align: right; font-weight: bold; width: 100px;">Prix HT</th>
            <th style="padding: 10px 12px; text-align: right; font-weight: bold; width: 100px;">Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 12px;">
              <p style="margin: 0; font-weight: 600;">{formation_nom}</p>
              <p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">Période : {session_debut} au {session_fin}</p>
              <p style="margin: 2px 0 0 0; font-size: 9pt; color: #666;">Lieu : {session_lieu}</p>
            </td>
            <td style="padding: 12px; text-align: center; font-weight: 500;">{formation_duree}</td>
            <td style="padding: 12px; text-align: right; font-weight: 500;">{montant_ht} €</td>
            <td style="padding: 12px; text-align: right; font-weight: 600;">{montant_ht} €</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
        <table style="width: 280px; border-collapse: collapse; font-size: 10pt;">
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB;">Sous-total HT :</td>
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB; font-weight: 600;">{montant_ht} €</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB;">TVA ({taux_tva}%) :</td>
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB;">{tva} €</td>
          </tr>
          <tr style="background-color: #1A1A1A; color: white;">
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 12pt;">TOTAL TTC :</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 12pt;">{montant_ttc} €</td>
          </tr>
        </table>
      </div>

      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 10pt; font-weight: 600; color: #92400E;">
          Conditions et validité du devis
        </p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6; color: #78350F;">
          <li>Ce devis est valable jusqu'au <strong>{validite_devis}</strong></li>
          <li>Modalités de paiement : <strong>{mode_paiement}</strong></li>
          <li>La réservation est définitive après acceptation écrite du présent devis</li>
          <li>En cas d'acceptation, un acompte de 30% peut être demandé</li>
        </ul>
      </div>

      <div style="padding: 15px; background-color: #F0FDF4; border-left: 3px solid #10B981;">
        <p style="margin: 0; font-size: 10pt; line-height: 1.6; color: #166534;">
          <strong>Pour accepter ce devis :</strong><br/>
          Veuillez retourner ce document signé par courrier, email ({ecole_email}) ou directement à notre secrétariat 
          avant le {validite_devis}.
        </p>
      </div>

      ${generateSignatureSection('L\'Organisme de Formation', 'Le Client (Bon pour accord)')}
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // CONVOCATION
  // ==========================================
  convocation: {
    type: 'convocation',
    name: 'Convocation',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          CONVOCATION
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="font-size: 10pt; margin: 0 0 15px 0;">Madame, Monsieur,</p>
        <p style="font-size: 10pt; margin: 0 0 10px 0; text-align: justify; line-height: 1.6;">
          Nous avons l'honneur de vous convier à :
        </p>
      </div>

      <div style="padding: 20px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px;">
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Objet :</strong> {convocation_objet}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Date :</strong> {convocation_date}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Heure :</strong> {convocation_heure}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Lieu :</strong> {convocation_lieu}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Adresse :</strong> {convocation_adresse}</p>
        <p style="margin: 0; font-size: 10pt;"><strong>Durée prévue :</strong> {convocation_duree}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Participant(s) :</strong></p>
        <p style="margin: 0; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Numéro d'élève : {eleve_numero}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Formation : {formation_nom}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Ordre du jour :</strong></p>
        <div style="margin-left: 15px; font-size: 10pt;">
          {convocation_contenu}
        </div>
      </div>

      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #92400E;">Note importante :</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt; color: #78350F;">
          Veuillez confirmer votre présence avant le {date_confirmation} en répondant à ce message ou en contactant 
          le {ecole_telephone}.
        </p>
      </div>

      <p style="margin: 25px 0 10px 0; font-size: 10pt;">Nous restons à votre disposition pour tout complément d'information.</p>
      <p style="margin: 10px 0 20px 0; font-size: 10pt;">Cordialement,</p>
      
      <div style="margin-top: 30px;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">{ecole_representant}</p>
        <p style="margin: 3px 0; font-size: 10pt;">{ecole_nom}</p>
      </div>

      <p style="margin-top: 25px; font-size: 9pt; color: #666;">
        Fait à {ecole_ville}, le {date_jour}
      </p>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // CONTRAT DE SCOLARITÉ
  // ==========================================
  contrat: {
    type: 'contrat',
    name: 'Contrat de scolarité',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CONTRAT DE SCOLARITÉ
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Année scolaire {annee_scolaire}</p>
      </div>

      ${generatePartiesSection()}

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 1 - Inscription et scolarité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">
        L'élève <strong>{eleve_nom} {eleve_prenom}</strong> est inscrit(e) pour l'année scolaire <strong>{annee_scolaire}</strong> 
        dans la classe <strong>{eleve_classe}</strong> de l'établissement <strong>{ecole_nom}</strong>.
      </p>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin-top: 10px;">
        La scolarité débute le {session_debut} et se termine le {session_fin}. 
        Les cours sont dispensés selon le calendrier scolaire et les horaires définis par l'établissement.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 2 - Frais de scolarité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">
        Les frais de scolarité pour l'année scolaire <strong>{annee_scolaire}</strong> s'élèvent à 
        <strong>{montant_ttc} €</strong> (en toutes lettres : {montant_lettres}).
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 10pt;"><strong>Modalités de paiement :</strong></p>
      <p style="font-size: 10pt; margin: 0;">{mode_paiement}</p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 3 - Obligations de l'élève</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">L'élève s'engage à :</p>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Suivre assidûment tous les cours et activités pédagogiques</li>
        <li>Respecter le règlement intérieur de l'établissement</li>
        <li>Acquitter les frais de scolarité dans les délais convenus</li>
        <li>Participer activement aux évaluations</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 4 - Engagements de l'établissement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">L'établissement s'engage à :</p>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Dispenser un enseignement de qualité conforme aux programmes</li>
        <li>Fournir les moyens pédagogiques nécessaires</li>
        <li>Assurer le suivi pédagogique et l'évaluation des acquis</li>
        <li>Délivrer les documents administratifs nécessaires</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 5 - Résiliation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">
        Le présent contrat peut être résilié par l'une ou l'autre des parties, sous réserve d'un préavis d'un mois. 
        En cas de résiliation par l'élève ou sa famille, les frais de scolarité dus pour la période déjà écoulée 
        restent acquis à l'établissement.
      </p>

      ${generateSignatureSection('L\'Établissement', 'L\'Élève / Représentant légal')}
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // ATTESTATION DE RÉUSSITE
  // ==========================================
  attestation_reussite: {
    type: 'attestation_reussite',
    name: 'Attestation de réussite',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION DE RÉUSSITE
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, établissement situé à <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>ATTESTE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, né(e) le 
          <strong>{eleve_date_naissance}</strong>, numéro d'élève <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          a suivi avec <strong>assiduité</strong> et a <strong>réussi</strong> la formation intitulée 
          <strong>"{formation_nom}"</strong>
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          qui s'est déroulée du <strong>{session_debut}</strong> au <strong>{session_fin}</strong> 
          (durée : {formation_duree}).
        </p>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">Résultats :</p>
        <p style="margin: 8px 0 0 0; font-size: 10pt;">Moyenne générale : <strong>{moyenne}/20</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Mention : <strong>{mention}</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Classement : <strong>{classement}</strong></p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 30px 0;">
        La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // CERTIFICAT DE SCOLARITÉ
  // ==========================================
  certificat_scolarite: {
    type: 'certificat_scolarite',
    name: 'Certificat de scolarité',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CERTIFICAT DE SCOLARITÉ
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Année scolaire {annee_scolaire}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, établissement situé à <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>CERTIFIE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, né(e) le 
          <strong>{eleve_date_naissance}</strong>, numéro d'élève <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          est régulièrement inscrit(e) dans cet établissement pour l'année scolaire <strong>{annee_scolaire}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          en classe de <strong>{eleve_classe}</strong>.
        </p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 40px 0;">
        Le présent certificat est délivré à l'intéressé(e) pour servir et valoir ce que de droit.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // RELEVÉ DE NOTES
  // ==========================================
  releve_notes: {
    type: 'releve_notes',
    name: 'Relevé de notes',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          RELEVÉ DE NOTES
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Année scolaire {annee_scolaire} - {trimestre}</p>
      </div>

      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <tr><td style="padding: 4px 0; width: 150px; font-weight: 600;">Nom :</td><td style="padding: 4px 0; font-weight: bold;">{eleve_nom}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Prénom :</td><td style="padding: 4px 0; font-weight: bold;">{eleve_prenom}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Numéro d'élève :</td><td style="padding: 4px 0;">{eleve_numero}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Classe :</td><td style="padding: 4px 0;">{eleve_classe}</td></tr>
        </table>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #1A1A1A; color: white;">
            <th style="padding: 10px 12px; text-align: left; font-weight: bold;">Matière</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: bold; width: 70px;">Coeff.</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: bold; width: 80px;">Note /20</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: bold;">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #E5E7EB; background-color: #FAFAFA;">
            <td style="padding: 10px 12px; font-weight: 500;">{matiere_1}</td>
            <td style="padding: 10px 12px; text-align: center;">{coef_1}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: bold;">{note_1}</td>
            <td style="padding: 10px 12px; font-size: 9pt; color: #666;">{appreciation_1}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 10px 12px; font-weight: 500;">{matiere_2}</td>
            <td style="padding: 10px 12px; text-align: center;">{coef_2}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: bold;">{note_2}</td>
            <td style="padding: 10px 12px; font-size: 9pt; color: #666;">{appreciation_2}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB; background-color: #FAFAFA;">
            <td style="padding: 10px 12px; font-weight: 500;">{matiere_3}</td>
            <td style="padding: 10px 12px; text-align: center;">{coef_3}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: bold;">{note_3}</td>
            <td style="padding: 10px 12px; font-size: 9pt; color: #666;">{appreciation_3}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 25px;">
        <div style="flex: 1;">
          <p style="margin: 0 0 8px 0; font-size: 11pt;">
            <strong>Moyenne générale :</strong> <span style="font-size: 14pt; font-weight: bold;">{moyenne}/20</span>
          </p>
          <p style="margin: 0 0 5px 0; font-size: 10pt; color: #666;">Moyenne de la classe : {moyenne_classe}/20</p>
          <p style="margin: 0; font-size: 10pt; color: #666;">Classement : {classement} sur {effectif_classe} élèves</p>
        </div>
        <div style="text-align: right; padding-left: 20px;">
          <div style="padding: 10px 15px; background-color: #FEF3C7; border-radius: 4px; display: inline-block;">
            <p style="margin: 0; font-size: 9pt; font-weight: 600; color: #92400E; text-transform: uppercase;">Mention</p>
            <p style="margin: 4px 0 0 0; font-size: 12pt; font-weight: bold; color: #78350F;">{mention}</p>
          </div>
        </div>
      </div>

      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px;">
        <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 10pt;">Appréciation générale :</p>
        <p style="text-align: justify; line-height: 1.6; font-size: 10pt; color: #333; margin: 0;">
          {appreciations}
        </p>
      </div>

      <div style="margin-top: 40px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 30px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // ATTESTATION D'ENTRÉE EN FORMATION
  // ==========================================
  attestation_entree: {
    type: 'attestation_entree',
    name: 'Attestation d\'entrée en formation',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION D'ENTRÉE EN FORMATION
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, établissement situé à <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>ATTESTE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, né(e) le 
          <strong>{eleve_date_naissance}</strong>, numéro d'élève <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          a été admis(e) et s'est inscrit(e) dans la formation intitulée <strong>"{formation_nom}"</strong>
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          qui débutera le <strong>{session_debut}</strong> et se terminera le <strong>{session_fin}</strong> 
          (durée : {formation_duree}).
        </p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 40px 0;">
        La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit, 
        notamment pour l'établissement des droits sociaux et administratifs.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // RÈGLEMENT INTÉRIEUR
  // ==========================================
  reglement_interieur: {
    type: 'reglement_interieur',
    name: 'Règlement intérieur',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          RÈGLEMENT INTÉRIEUR
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Année scolaire {annee_scolaire}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 12pt; font-weight: bold; margin: 0 0 12px 0; color: #1A1A1A;">PRÉAMBULE</h2>
        <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
          Le présent règlement intérieur a pour objet de fixer les règles de vie collective applicables 
          à tous les membres de la communauté éducative de <strong>{ecole_nom}</strong>. Il s'applique 
          à l'ensemble des personnes présentes dans l'établissement.
        </p>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 1 : Principes généraux</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'établissement <strong>{ecole_nom}</strong> a pour mission de dispenser un enseignement de qualité 
        dans le respect des valeurs de la République : liberté, égalité, fraternité, laïcité.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 2 : Horaires</h2>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Horaires d'ouverture : {horaires_ouverture}</li>
        <li>Horaires des cours : {horaires_cours}</li>
        <li>Les élèves doivent arriver à l'heure et assister à tous les cours</li>
        <li>Tout retard ou absence doit être justifié</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 3 : Assiduité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'assiduité est obligatoire pour tous les cours et activités pédagogiques. 
        Les absences doivent être signalées et justifiées dans les meilleurs délais.
        En cas d'absences répétées et non justifiées, l'établissement se réserve le droit de prendre 
        les mesures appropriées.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 4 : Comportement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les élèves doivent adopter un comportement respectueux envers tous les membres de la communauté 
        éducative et se conformer aux règles de politesse et de civilité.
        Tout acte de violence, de harcèlement ou de discrimination est strictement interdit et peut 
        donner lieu à des sanctions disciplinaires.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 5 : Sanctions disciplinaires</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        En cas de manquement au règlement intérieur, des sanctions peuvent être prononcées selon 
        la gravité des faits : avertissement, exclusion temporaire ou définitive.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 6 : Hygiène et sécurité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les consignes de sécurité affichées dans l'établissement doivent être respectées.
        L'usage du tabac, de l'alcool et de toute substance illicite est strictement interdit.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 7 : Publicité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Le présent règlement est affiché dans les locaux et sur le site internet de l'organisme de formation. En outre, un exemplaire est remis à chaque 
        stagiaire.
      </p>

      <div style="margin-top: 40px;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Le {date_jour}</p>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // CONDITIONS GÉNÉRALES DE VENTE
  // ==========================================
  cgv: {
    type: 'cgv',
    name: 'Conditions Générales de Vente',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CONDITIONS GÉNÉRALES DE VENTE
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">{ecole_nom}</p>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 1 - Objet</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre 
        <strong>{ecole_nom}</strong> et ses clients dans le cadre de la vente de formations et de services éducatifs.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 2 - Commandes</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Toute commande de formation implique l'acceptation sans réserve des présentes CGV. 
        La commande devient ferme et définitive après acceptation de l'établissement.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 3 - Prix</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les prix des formations sont indiqués en euros TTC. Ils sont fermes et non révisables pendant 
        la durée de validité indiquée sur le devis.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 4 - Modalités de paiement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Le paiement s'effectue selon les modalités définies dans le contrat ou le devis accepté. 
        En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux légal 
        peuvent être appliquées.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 5 - Droit de rétractation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Conformément à la législation en vigueur, le client dispose d'un délai de 14 jours calendaires 
        pour exercer son droit de rétractation à compter de l'acceptation de la commande.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 6 - Annulation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        En cas d'annulation par le client, des frais d'annulation peuvent être appliqués selon 
        les conditions prévues dans le contrat. L'établissement se réserve le droit d'annuler 
        une formation en cas d'insuffisance d'inscriptions.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 7 - Responsabilité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'établissement s'engage à dispenser les formations dans les conditions de qualité 
        prévues. La responsabilité de l'établissement est limitée aux dommages directs et prévisibles.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 8 - Litiges</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        En cas de litige, les parties conviennent de rechercher une solution amiable avant toute 
        action judiciaire. À défaut, les tribunaux de {ecole_ville} seront seuls compétents.
      </p>

      <div style="margin-top: 40px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 30px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // PROGRAMME DE FORMATION
  // ==========================================
  programme: {
    type: 'programme',
    name: 'Programme de formation',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          PROGRAMME DE FORMATION
        </h1>
        <p style="font-size: 14pt; font-weight: bold; margin: 10px 0 0 0; color: #333;">
          {programme_nom}
        </p>
        <p style="font-size: 10pt; color: #666; margin: 5px 0 0 0;">
          Code : {programme_code} | Durée totale : {programme_duree_totale}
        </p>
      </div>

      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11pt; font-weight: bold;">📋 Description du programme :</p>
        <p style="margin: 0; text-align: justify; line-height: 1.6; font-size: 10pt;">
          {programme_description}
        </p>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11pt; font-weight: bold;">🎯 Objectifs du programme :</p>
        <p style="margin: 0; text-align: justify; line-height: 1.6; font-size: 10pt;">
          {programme_objectifs}
        </p>
      </div>

      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11pt; font-weight: bold;">👥 Public concerné :</p>
        <p style="margin: 0; line-height: 1.6; font-size: 10pt;">
          {programme_public_concerne}
        </p>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Prérequis</h2>
      <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
        <li>{prerequis_1}</li>
        <li>{prerequis_2}</li>
        <li>{prerequis_3}</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">CONTENU PÉDAGOGIQUE</h2>

      <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0;">Module 1 : {module_1_titre}</h3>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Durée :</strong> {module_1_duree}</p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6;">
          <li>{module_1_contenu_1}</li>
          <li>{module_1_contenu_2}</li>
          <li>{module_1_contenu_3}</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0;">Module 2 : {module_2_titre}</h3>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Durée :</strong> {module_2_duree}</p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6;">
          <li>{module_2_contenu_1}</li>
          <li>{module_2_contenu_2}</li>
          <li>{module_2_contenu_3}</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0;">Module 3 : {module_3_titre}</h3>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Durée :</strong> {module_3_duree}</p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6;">
          <li>{module_3_contenu_1}</li>
          <li>{module_3_contenu_2}</li>
          <li>{module_3_contenu_3}</li>
        </ul>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">MÉTHODES PÉDAGOGIQUES</h2>
      <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Cours théoriques et pratiques</li>
        <li>Travaux dirigés et études de cas</li>
        <li>Projets et mises en situation</li>
        <li>Évaluations continues</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">MODALITÉS D'ÉVALUATION</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'évaluation se fait par contrôle continu, travaux pratiques et examen final. 
        Une attestation de réussite est délivrée aux participants ayant obtenu une moyenne 
        minimale de 10/20.
      </p>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Dates de formation :</strong></p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;">Du {session_debut} au {session_fin}</p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Lieu :</strong> {session_lieu}</p>
        <p style="margin: 0; font-size: 10pt;"><strong>Horaires :</strong> {session_horaires}</p>
      </div>

      <div style="margin-top: 30px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 20px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // ATTESTATION D'ASSIDUITÉ
  // ==========================================
  attestation_assiduite: {
    type: 'attestation_assiduite',
    name: 'Attestation d\'assiduité',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION D'ASSIDUITÉ
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, établissement situé à <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>ATTESTE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, né(e) le 
          <strong>{eleve_date_naissance}</strong>, numéro d'élève <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          a suivi avec <strong>assiduité</strong> la formation intitulée <strong>"{formation_nom}"</strong>
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          qui s'est déroulée du <strong>{session_debut}</strong> au <strong>{session_fin}</strong> 
          (durée totale : {formation_duree}).
        </p>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">Taux de présence :</p>
        <p style="margin: 8px 0 0 0; font-size: 10pt;">Heures suivies : <strong>{heures_suivies}</strong> sur <strong>{heures_totales}</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Taux d'assiduité : <strong>{taux_assiduite}%</strong></p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 40px 0;">
        La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit, 
        notamment pour l'établissement des droits sociaux, administratifs et pour justifier de sa 
        présence en formation.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait à {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },
}

/**
 * Récupère le template par défaut pour un type de document
 */
export function getDefaultTemplateContent(type: DocumentType): DocumentTemplateDefault {
  return documentTemplateDefaults[type]
}

/**
 * Génère le contenu HTML complet pour un document avec le style premium
 */
export function generateDocumentHTML(
  type: DocumentType,
  headerContent: string,
  bodyContent: string,
  footerContent: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #1A1A1A;
          margin: 0;
          padding: 0;
        }
        
        .document-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 0;
          background: white;
        }
        
        h1, h2, h3 {
          color: #1A1A1A;
          margin: 0;
        }
        
        p {
          margin: 0;
        }
        
        table {
          border-collapse: collapse;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <!-- Header -->
        ${headerContent}
        
        <!-- Body -->
        <div class="document-body">
          ${bodyContent}
        </div>
        
        <!-- Footer -->
        ${footerContent}
      </div>
    </body>
    </html>
  `
}

/**
 * Exporte le header premium pour réutilisation
 */
export function getPremiumHeader(): string {
  return premiumHeader
}

/**
 * Exporte le footer premium pour réutilisation
 */
export function getPremiumFooter(): string {
  return premiumFooter
}
