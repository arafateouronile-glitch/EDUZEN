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
  <div style="width: 100%; padding: 5px 0 3px 0; margin-bottom: 0; font-family: 'Times New Roman', Times, serif;">
    <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0; table-layout: fixed;">
      <tr>
        <td style="width: 70%; vertical-align: top; padding-right: 15px; border: 0; text-align: left;">
          <p style="font-weight: bold; font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; margin: 0 0 2px 0; color: #1A1A1A; line-height: 1.1;">
            {ecole_nom}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 0; line-height: 1.2;">
            {ecole_adresse}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 0; line-height: 1.2;">
            {ecole_code_postal} {ecole_ville}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 0; line-height: 1.2;">
            Email : {ecole_email}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 0; line-height: 1.2;">
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
  <div style="padding: 4px 0 3px 0; margin-top: 0; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
    <p style="font-size: 6.5pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.2;">
      {ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | SIRET: {ecole_siret}
    </p>
    <p style="font-size: 6.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0 0 0; text-align: center; line-height: 1.1;">
      Déclaration d'activité: {ecole_numero_declaration} <em>(préfet de région: {ecole_region})</em> - Cet enregistrement ne vaut pas agrément de l'État.
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
          <tr>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Date</th>
            <th style="padding: 5px 8px; text-align: center; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Heure</th>
            <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Lieu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc;">du {session_debut} au {session_fin}</td>
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cccccc;">en présentiel</td>
            <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">en présentiel</td>
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
          <tr>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Description</th>
            <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc;">Formation</td>
            <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{montant_ttc}€</td>
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
  // FACTURE - Style INSSI FORMATION
  // ==========================================
  facture: {
    type: 'facture',
    name: 'Facture',
    headerContent: premiumHeader,
    bodyContent: `
      <!-- Numéro de facture et date -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 10px; border: 0; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <td style="width: 60%; vertical-align: top; border: 0;">
            <h1 style="margin: 0; font-size: 12pt; font-weight: bold; color: #000;">Facture n°{numero_facture}</h1>
            {IF reference_devis}<p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">Devis de référence : {reference_devis}</p>{ENDIF}
          </td>
          <td style="width: 40%; vertical-align: top; border: 0; text-align: right;">
            <p style="margin: 0; font-size: 8pt; color: #333;">Date de facture : {date_emission}</p>
          </td>
        </tr>
      </table>

      <!-- Destinataire (gauche) et Détails formation (droite) -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 10px; border: 0; font-family: 'Times New Roman', Times, serif; font-size: 8pt;">
        <tr>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 2px 0;"><strong>Destinataire :</strong> {destinataire_du_devis}</p>
            <p style="margin: 0 0 1px 0;">{adresse_destinataire}</p>
            <p style="margin: 0 0 1px 0;">{code_postal_destinataire} {ville_destinataire}</p>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 1px 0;"><strong>Intitulé de la formation :</strong> {formation_nom}</p>
            <p style="margin: 0 0 1px 0;">Lieu de la formation : {session_lieu}</p>
            <p style="margin: 0 0 1px 0;">Dates de la formation : du {session_debut} au {session_fin}</p>
            <p style="margin: 0; font-size: 8pt; color: #333;">Durée de la formation : {formation_duree}</p>
          </td>
        </tr>
      </table>

      <!-- Tableau des prestations (une ligne par module) -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 8px; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 8pt;">
        <thead>
          <tr>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Désignation</th>
            <th style="padding: 5px 8px; text-align: center; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 60px;">Quantité</th>
            <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 90px;">Prix unitaire HT</th>
            <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 90px;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {FOR:modules}
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc;">Formation<br/>{module_nom}</td>
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cccccc;">1</td>
            <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{module_prix_ht} €</td>
            <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{module_total_ht} €</td>
          </tr>
          {ENDFOR}
        </tbody>
      </table>

      <!-- Totaux -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 10px; border: 0; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <td style="width: 55%; border: 0;"></td>
          <td style="width: 45%; border: 0;">
            <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 8pt;">
              <tr>
                <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">Total HT</td>
                <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; width: 90px;">{montant_ht} €</td>
              </tr>
              <tr>
                <td style="padding: 5px 8px; text-align: left; border: 1px solid #cccccc; font-size: 7pt;">Prestations de formation en exonération de TVA, article 261-4-4a du CGI</td>
                <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;"></td>
              </tr>
              <tr>
                <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; font-weight: bold;">Total TTC</td>
                <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; font-weight: bold;">{montant_ttc} €</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Date d'échéance -->
      <div style="margin-bottom: 12px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0; font-size: 9pt; font-weight: bold;">
          Date d'échéance : {date_echeance} (paiement à 30 jours)
        </p>
      </div>

      <!-- Informations bancaires -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 0; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 7pt;">
        <thead>
          <tr>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">IBAN</th>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 120px;">BIC</th>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 50px;">Monnaie</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc;">{iban}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc;">{bic}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc;">EUR</td>
          </tr>
        </tbody>
      </table>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // DEVIS - Style INSSI FORMATION (compact)
  // ==========================================
  devis: {
    type: 'devis',
    name: 'Devis de formation professionnelle',
    headerContent: premiumHeader,
    bodyContent: `
      <!-- Titre et date -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 6px; border: 0; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <td style="width: 70%; vertical-align: top; border: 0;">
            <h1 style="margin: 0; font-size: 11pt; font-weight: bold; color: #000;">
              Devis de formation professionnelle
            </h1>
          </td>
          <td style="width: 30%; vertical-align: top; border: 0; text-align: right;">
            <p style="margin: 0; font-size: 8pt; color: #333;">Date : {date_emission}</p>
          </td>
        </tr>
      </table>

      <!-- Destinataire et Organisme -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 6px; border: 0; font-family: 'Times New Roman', Times, serif; font-size: 8pt;">
        <tr>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 2px 0;"><strong>Destinataire</strong></p>
            <p style="margin: 0 0 1px 0;">{destinataire_du_devis}</p>
            <p style="margin: 0 0 1px 0;">{adresse_destinataire}</p>
            <p style="margin: 0 0 1px 0;">{code_postal_destinataire} {ville_destinataire}</p>
            <p style="margin: 0; color: #333;">Représenté par : {tuteur_nom}</p>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 1px 0;"><strong>Organisme :</strong> {ecole_nom}</p>
            <p style="margin: 0; color: #333;">SIRET : {ecole_siret} | Décl. : {ecole_numero_declaration}</p>
            <p style="margin: 0; color: #333;">Représenté par : {ecole_representant}</p>
          </td>
        </tr>
      </table>

      <!-- Section 1: Objet, nature et durée -->
      <div style="margin-bottom: 6px; font-family: 'Times New Roman', Times, serif;">
        <h2 style="margin: 0 0 3px 0; font-size: 9pt; font-weight: bold; color: #000;">1. Objet, nature et durée de la formation</h2>
        <p style="margin: 0; font-size: 8pt; line-height: 1.4;">
          <strong>Intitulé :</strong> {formation_nom} | <strong>Nature :</strong> Action de formation (art. L6313-1 Code du Travail)<br/>
          <strong>Durée :</strong> {formation_duree} | <strong>Dates :</strong> du {session_debut} au {session_fin} | <strong>Effectifs :</strong> {session_effectif}
        </p>
      </div>

      <!-- Section 2: Programme -->
      <div style="margin-bottom: 6px; font-family: 'Times New Roman', Times, serif;">
        <h2 style="margin: 0 0 2px 0; font-size: 9pt; font-weight: bold; color: #000;">2. Programme de la formation</h2>
        <p style="margin: 0; font-size: 8pt;">Le programme détaillé est en annexes.</p>
      </div>

      <!-- Section 3: Prix -->
      <div style="margin-bottom: 6px; font-family: 'Times New Roman', Times, serif;">
        <h2 style="margin: 0 0 3px 0; font-size: 9pt; font-weight: bold; color: #000;">3. Prix de la formation</h2>

        <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 4px; border-collapse: collapse; font-size: 8pt;">
          <thead>
            <tr>
              <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Désignation</th>
              <th style="padding: 5px 8px; text-align: center; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 40px;">Qté</th>
              <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 70px;">Prix unit. HT</th>
              <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 70px;">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {FOR:modules}
            <tr>
              <td style="padding: 5px 8px; border: 1px solid #cccccc;">Formation<br/>{module_nom}</td>
              <td style="padding: 5px 8px; text-align: center; border: 1px solid #cccccc;">{module_quantite}</td>
              <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{module_prix_ht} €</td>
              <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{module_total_ht} €</td>
            </tr>
            {ENDFOR}
          </tbody>
        </table>

        <!-- Totaux -->
        <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0;">
          <tr>
            <td style="width: 60%; border: 0;"></td>
            <td style="width: 40%; border: 0;">
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 8pt;">
                <tr>
                  <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">Total HT</td>
                  <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; width: 70px;">{montant_ht}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; font-size: 7pt;">TVA exonérée (art. 261 CGI)</td>
                  <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{tva}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; font-weight: bold;">Total TTC</td>
                  <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; font-weight: bold;">{montant_ttc}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Section 4: Validité -->
      <div style="margin-bottom: 8px; font-family: 'Times New Roman', Times, serif;">
        <h2 style="margin: 0 0 2px 0; font-size: 9pt; font-weight: bold; color: #000;">4. Durée de validité</h2>
        <p style="margin: 0; font-size: 8pt;">Ce devis est valable 30 jours.</p>
      </div>

      <!-- Signatures -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 10px; border: 0; font-family: 'Times New Roman', Times, serif; font-size: 8pt;">
        <tr>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 2px 0; font-weight: bold;">Pour l'organisme de formation,</p>
            <p style="margin: 0;">{ecole_nom}, {ecole_representant}</p>
            <p style="margin: 25px 0 0 0; width: 70%;">Signature</p>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 2px 0; font-weight: bold;">Pour le bénéficiaire, bon pour accord</p>
            <p style="margin: 0;">{entreprise_nom}</p>
            <p style="margin: 25px 0 0 0; width: 70%;">Signature</p>
          </td>
        </tr>
      </table>
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
      <!-- Titre et date -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 6px; border: 0; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <td style="width: 70%; vertical-align: top; border: 0;">
            <h1 style="margin: 0; font-size: 16pt; font-weight: bold; color: #000;">
              CONVOCATION
            </h1>
          </td>
          <td style="width: 30%; vertical-align: top; border: 0; text-align: right;">
            <p style="margin: 0; font-size: 8pt; color: #333;">Date : {date_jour}</p>
          </td>
        </tr>
      </table>

      <!-- Destinataire et Organisme -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 25px; border: 0; font-family: 'Times New Roman', Times, serif; font-size: 8pt;">
        <tr>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 2px 0;"><strong>Destinataire</strong></p>
            <p style="margin: 0 0 1px 0;">{destinataire_du_devis}</p>
            <p style="margin: 0 0 1px 0;">{adresse_destinataire}</p>
            <p style="margin: 0 0 1px 0;">{code_postal_destinataire} {ville_destinataire}</p>
            <p style="margin: 0; color: #333;">Représenté par : {tuteur_nom}</p>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 1px 0;"><strong>Organisme :</strong> {ecole_nom}</p>
            <p style="margin: 0; color: #333;">SIRET : {ecole_siret} | Décl. : {ecole_numero_declaration}</p>
            <p style="margin: 0; color: #333;">Représenté par : {ecole_representant}</p>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 25px; font-family: 'Times New Roman', Times, serif;">
        <p style="font-size: 10pt; margin: 0 0 15px 0;">Madame, Monsieur,</p>
        <p style="font-size: 10pt; margin: 0 0 10px 0; text-align: justify; line-height: 1.6;">
          Nous avons l'honneur de vous convier à la session de formation suivante :
        </p>
      </div>

      <!-- Détails -->
      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Objet :</strong> {convocation_objet}</p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Date :</strong> {convocation_date}</p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Heure :</strong> {convocation_heure}</p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Lieu :</strong> {convocation_lieu}</p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Adresse :</strong> {convocation_adresse}</p>
        <p style="margin: 0; font-size: 10pt;"><strong>Durée prévue :</strong> {convocation_duree}</p>
      </div>

      <!-- Participant -->
      <div style="margin-bottom: 25px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0 0 5px 0; font-size: 10pt;"><strong>Participant(s) :</strong></p>
        <p style="margin: 0; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
        <p style="margin: 2px 0 0 0; font-size: 10pt;">Numéro d'élève : {eleve_numero}</p>
        <p style="margin: 2px 0 0 0; font-size: 10pt;">Formation : {formation_nom}</p>
      </div>

      <!-- Ordre du jour -->
      <div style="margin-bottom: 25px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0 0 5px 0; font-size: 10pt;"><strong>Ordre du jour :</strong></p>
        <div style="margin-left: 15px; font-size: 10pt;">
          {convocation_contenu}
        </div>
      </div>

      <!-- Note importante -->
      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 25px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #92400E;">Note importante :</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt; color: #78350F;">
          Veuillez confirmer votre présence avant le {date_confirmation} en répondant à ce message ou en contactant 
          le {ecole_telephone}.
        </p>
      </div>

      <p style="margin: 25px 0 10px 0; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">Nous restons à votre disposition pour tout complément d'information.</p>
      <p style="margin: 10px 0 20px 0; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">Cordialement,</p>
      
      <div style="margin-top: 30px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">{ecole_representant}</p>
        <p style="margin: 3px 0; font-size: 10pt;">{ecole_nom}</p>
      </div>

      <p style="margin-top: 25px; font-size: 9pt; color: #666; font-family: 'Times New Roman', Times, serif;">
        Fait à {ecole_ville}, le {date_jour}
      </p>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // CONTRAT DE FORMATION PROFESSIONNELLE
  // ==========================================
  contrat: {
    type: 'contrat',
    name: 'Contrat de formation professionnelle',
    headerContent: premiumHeader,
    bodyContent: `
      <!-- En-tête spécifique au contrat -->
      <div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4;">
        <h1 style="text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 5px;">Contrat de formation professionnelle</h1>
        <p style="text-align: center; font-size: 10pt; font-style: italic; margin-top: 0; margin-bottom: 20px;">
          (Article L. 6353-1 du Code du Travail Décret N° 2018-1341 du 28 décembre 2018)
        </p>

        <p style="margin-bottom: 10px;"><strong>Entre l'organisme de formation : {ecole_nom}</strong></p>
        <p style="margin-left: 20px; margin-bottom: 5px;">immatriculée au RCS de sous le numéro {ecole_siret}</p>
        <p style="margin-left: 20px; margin-bottom: 5px;">Dont le siège social est situé {ecole_adresse} {ecole_code_postal} {ecole_ville}.</p>
        <p style="margin-left: 20px; margin-bottom: 5px;">Représentée aux fins des présentes par {ecole_representant} en sa qualité de représentant, dûment habilité(e).</p>
        <p style="margin-left: 20px; margin-bottom: 15px;">Déclaration d'activité n°{ecole_numero_declaration} auprès de la préfecture de la région {ecole_region}.</p>
        
        <p style="text-align: right; margin-bottom: 20px;"><strong>Ci-après dénommée « l'Organisme de Formation »<br/>D'une part</strong></p>

        <p style="margin-bottom: 10px;"><strong>Et {eleve_prenom} {eleve_nom}</strong></p>
        
        <p style="text-align: right; margin-bottom: 20px;"><strong>Ci-après dénommée « le Bénéficiaire »<br/>D'autre part</strong></p>

        <p style="margin-bottom: 20px;">Ci-après individuellement ou collectivement désigné(s) la ou les « Partie(s) »</p>

        <p style="text-align: justify; margin-bottom: 20px;">
          Il est conclu un contrat de formation professionnelle conformément aux dispositions des articles L. 6311-1 à
          L. 6363-2 du Code du Travail, et également en application des dispositions du Livre III de la 6ème partie et
          des catégories prévues à l'article L6313.1 du Code du Travail relatif à la formation professionnelle continue
          tout au long de la vie
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">1. Objet du contrat</h3>
        <p style="margin-bottom: 10px;">
          Aux termes du présent contrat, l'Organisme de Formation s'engage à organiser l'action de formation suivante :
        </p>
        <p style="font-weight: bold; margin-bottom: 15px; text-align: center;">
          {formation_nom} DU {session_debut} au {session_fin}
        </p>
        
        <p style="margin-bottom: 5px;"><strong>Catégorie de l'action de formation (art. L6313-1 du code du travail) :</strong></p>
        <p style="margin-bottom: 15px;">Action de formation</p>

        <p style="margin-bottom: 5px;"><strong>Diplôme visé :</strong> Certification (dont CQP) ou habilitation enregistrée au Répertoire National des Certifications Professionnelles (RNCP)</p>

        <p style="margin-bottom: 5px;"><strong>Objectifs :</strong> {formation_objectifs}</p>
        
        <p style="margin-bottom: 5px;"><strong>Contenu de l'action de formation et moyens prévus :</strong> Annexe 1</p>
        
        <p style="margin-bottom: 5px;"><strong>Durée :</strong> {formation_duree}</p>
        
        <p style="margin-bottom: 5px;"><strong>Lieu de la formation :</strong> {session_lieu}</p>
        
        <p style="margin-bottom: 15px;"><strong>Effectifs formés :</strong> {session_effectif}</p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Date</th>
              <th style="padding: 5px 8px; text-align: center; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Heure</th>
              <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Lieu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 5px 8px; border: 1px solid #cccccc;">du {session_debut} au {session_fin}</td>
              <td style="padding: 5px 8px; text-align: center; border: 1px solid #cccccc;">{formation_duree}</td>
              <td style="padding: 5px 8px; border: 1px solid #cccccc;">{session_lieu}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">2. Effectif formé</h3>
        <p style="margin-bottom: 5px;"><strong>Public visé au sens de l'article L 6313-3 du Code du Travail :</strong></p>
        <ul style="margin-top: 5px; margin-bottom: 15px;">
          <li>les actions de formation ont pour objet de permettre à toute personne sans qualification professionnelle ou sans contrat de travail d'accéder dans les meilleures conditions à un emploi</li>
          <li>favoriser l'adaptation des travailleurs à leur poste de travail, à l'évolution des emplois ainsi que leur maintien dans l'emploi et de participer au développement des compétences en lien ou non avec leur poste de travail. Elles peuvent permettre à des travailleurs d'acquérir une qualification plus élevée</li>
          <li>réduire, pour les travailleurs dont l'emploi est menacé, les risques résultant d'une qualification inadaptée à l'évolution des techniques et des structures des entreprises, en les préparant à une mutation d'activité soit dans le cadre, soit en dehors de leur entreprise. Elles peuvent permettre à des salariés dont le contrat de travail est rompu d'accéder à des emplois exigeant une qualification différente, ou à des non-salariés d'accéder à de nouvelles activités professionnelles</li>
          <li>favoriser la mobilité professionnelle.</li>
        </ul>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">3. Prix de la formation</h3>
        <p style="text-align: justify; margin-bottom: 15px;">
          En contrepartie de cette action de formation, le bénéficiaire (ou le financeur dans le cadre d'une subrogation de paiement) s'acquittera des coûts suivants qui couvrent l'intégralité des frais engagés par l'organisme de formation pour cette session :
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <thead>
            <tr>
              <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Description</th>
              <th style="padding: 5px 8px; text-align: right; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Prix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 5px 8px; border: 1px solid #cccccc;">{formation_nom}</td>
              <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc;">{montant_ht} €</td>
            </tr>
            <tr>
              <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold;">TOTAL NET DE TAXES</td>
              <td style="padding: 5px 8px; text-align: right; border: 1px solid #cccccc; font-weight: bold;">{montant_ht} €</td>
            </tr>
          </tbody>
        </table>
        <p style="font-style: italic; margin-bottom: 20px;">L'organisme de formation atteste être exonéré de TVA.</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">4. Modalités de déroulement et de suivi</h3>
        <p style="margin-bottom: 10px;">La Formation s'effectue Formation présentielle.</p>
        <p style="margin-bottom: 10px;">
          Des feuilles de présence seront signées par les Stagiaires et le(s) formateur(s) par demi-journée de formation, l'objectif étant de justifier la réalisation de la Formation.
        </p>
        <p style="margin-bottom: 20px;">
          L'appréciation des résultats se fera à travers la mise en œuvre QCM et/ou grilles d'évaluation et/ou travaux pratiques et/ou fiches d'évaluation et/ou mises en situation et/ou autre.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">5. Moyens de sanction</h3>
        <p style="margin-bottom: 20px;">
          À l'issue de la Formation, l'Organisme de Formation délivre au Stagiaire le en cas de réussite (diplôme, titre professionnel, certification, attestation de fin de formation ou autres).
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">6. Dédit ou abandon</h3>
        <p style="text-align: justify; margin-bottom: 10px;">
          En cas de dédit par le Bénéficiaire à moins de 7 jours francs avant le début de l'action mentionnée à l'article 1, ou d'abandon en cours de Formation par un ou plusieurs Stagiaire(s), l'Organisme de Formation (i) remboursera sur le coût total, les sommes qu'il n'aura pas réellement dépensées ou engagées pour la réalisation de ladite action et/ou (ii) proposera une nouvelle date de Formation.
        </p>
        <p style="text-align: justify; margin-bottom: 20px;">
          Le cas échéant, le Bénéficiaire s'engage au versement d'un montant de 20 % du coût total de la Formation à titre de dédommagement, cette somme ne pouvant faire l'objet d'un financement par fonds publics ou paritaires.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">7. Modalités de règlement</h3>
        <p style="margin-bottom: 20px;">
          Le paiement sera dû en totalité à réception d'une facture émise par l'Organisme de Formation à destination du Bénéficiaire.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">8. Propriété intellectuelle</h3>
        <p style="text-align: justify; margin-bottom: 20px;">
          Les supports de formation, quelle qu'en soit la forme, et les contenus de toute nature (textes, images, visuels, musiques, logos, marques, base de données, etc.) exploités par l'Organisme de Formation dans le cadre de l'action de formation sont protégés par tous droits de propriété intellectuelle ou droits des producteurs de bases de données en vigueur. Tous désassemblages, décompilations, décryptages, extractions, réutilisations, copies et plus généralement, tous actes de reproduction, représentation, diffusion et utilisation de l'un quelconque de ces éléments, en tout ou partie, sans l'autorisation de l'Organisme de Formation sont strictement interdits et pourront faire l'objet de poursuites judiciaires.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">9. Données à caractère personnel</h3>
        <p style="margin-bottom: 20px;">
          L'Organisme de Formation pratique une politique de protection des données personnelles dont les caractéristiques sont explicitées dans la politique de confidentialité.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin-top: 1.8em; margin-bottom: 10px; background-color: #f0f0f0; padding: 5px;">10. Différents éventuels</h3>
        <p style="margin-bottom: 30px;">
          Si une contestation ou un différend ne peuvent être réglés à l'amiable, le Tribunal de {ecole_ville} sera seul compétent pour régler le litige.
        </p>

        <p style="margin-bottom: 30px;">
          Document réalisé en 2 exemplaires à {ecole_ville}, le {date_jour}.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <strong>Pour l'Organisme de Formation</strong><br/>
              {ecole_nom}<br/><br/><br/><br/>
              Signature
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px;">
              <strong>Pour le Bénéficiaire</strong><br/>
              {eleve_nom} {eleve_prenom}<br/><br/><br/><br/>
              Signature
            </td>
          </tr>
        </table>

        <!-- Annexe 1 : Programme -->
        <div style="page-break-before: always;">
          <h2 style="text-align: center; padding-bottom: 10px; margin-bottom: 20px;">Annexe 1 : Programme de formation</h2>
          
          <p style="margin-bottom: 15px;"><strong>Nom de la session :</strong> {formation_nom} DU {session_debut} au {session_fin}</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">DURÉE ET LIEU DE FORMATION</h3>
          <p><strong>Durée en heures :</strong> {formation_duree}</p>
          <p><strong>Lieu :</strong> {session_lieu}</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">PUBLIC CONCERNÉ</h3>
          <p>{formation_public_concerne}</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">PRÉREQUIS</h3>
          <p>{formation_prerequis}</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">QUALITÉ ET INDICATEURS DE RÉSULTATS</h3>
          <p>{formation_qualite_et_resultats}</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">ACCESSIBILITÉ</h3>
          <p>Formation accessible aux personnes en situation de handicap. Pour toutes demandes d'adaptation, veuillez contacter notre référent handicap.</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">OBJECTIFS</h3>
          <p>{formation_objectifs}</p>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">CONTENU DE LA FORMATION</h3>
          <div style="margin-left: 20px;">{formation_contenu}</div>

          <h3 style="font-size: 11pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">ORGANISATION DE LA FORMATION</h3>
          <p><strong>Équipe pédagogique :</strong> {formation_equipe_pedagogique}</p>
          <p><strong>Ressources pédagogiques et techniques prévues :</strong> {formation_ressources}</p>
          <p>accueil des Stagiaires dans une salle dédiée à la formation.</p>
        </div>

        <!-- Annexe 2 : Règlement Intérieur -->
        <div style="page-break-before: always;">
          <h2 style="text-align: center; padding-bottom: 10px; margin-bottom: 20px;">Annexe 2 : Règlement Intérieur</h2>
          
          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 1 - Objet et champ d'application</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Conformément aux dispositions des articles L.6352-3, L.6352-4 et R.6352-1 à R.6352-15 du Code du Travail, le présent règlement a pour objet de déterminer les principales mesures applicables en matière de santé, de sécurité et de discipline aux stagiaires de l'organisme de formation, dénommé ci-après.<br/>
            Tout stagiaire doit respecter les termes du présent règlement durant toute la durée de l'action de formation. Toutefois, lorsque la formation se déroule dans une entreprise déjà dotée d'un règlement intérieur, les mesures de santé et de sécurité applicables aux stagiaires sont celles de ce règlement.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 2 - Hygiène et sécurité</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 5px;">Chaque stagiaire doit veiller au respect des consignes générales et particulières en matière d'hygiène et de sécurité, sous peine de sanctions disciplinaires.</p>
          <ul style="font-size: 9pt; margin-bottom: 10px; padding-left: 20px;">
            <li><strong>Propreté des locaux :</strong> Les stagiaires doivent maintenir en ordre et en état de propreté constante les locaux où se déroule la formation. À ce titre, il leur est interdit de manger dans les salles de cours.</li>
            <li><strong>Alcool et produits stupéfiants :</strong> L'introduction et la consommation de produits stupéfiants ou de boissons alcoolisées est strictement interdite. Il est également interdit de pénétrer ou de demeurer dans l'établissement en état d'ivresse ou sous l'emprise de produits stupéfiants.</li>
            <li><strong>Consignes de sécurité – Incendie :</strong> Les consignes d'incendie et notamment un plan de localisation des extincteurs et des issues de secours sont affichés dans les locaux de formation. Les stagiaires sont tenu·e·s d'exécuter sans délai l'ordre d'évacuation donné.</li>
            <li><strong>Accident - déclaration :</strong> Tout accident ou incident survenu à l'occasion ou en cours de formation doit être immédiatement déclaré. Conformément à l'article R. 6342-3 du Code du Travail, l'organisme de formation effectue la déclaration auprès de la caisse de sécurité sociale.</li>
            <li><strong>Interdiction de fumer ou de vapoter :</strong> Il est interdit de fumer ou de vapoter dans les locaux de formation.</li>
          </ul>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 3 – Horaires, absences et retards</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Les horaires de la formation seront communiqués aux stagiaires au préalable. Les stagiaires sont tenu·e·s de respecter ces horaires. Sauf autorisation express, les stagiaires ne peuvent pas s'absenter pendant les heures de formation.<br/>
            L'émargement devra être fait au début ou à la fin de chaque atelier. En cas d'absence ou retard, les stagiaires en informent l'organisme de formation. L'employeur est informé des absences. Pour les stagiaires financés par un tiers, les absences non justifiées entraînent une retenue.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 4 - Comportement</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Il est demandé à tout stagiaire d'avoir un comportement garantissant le respect des règles élémentaires de savoir vivre. Il est formellement interdit de modifier/diffuser les supports sans autorisation, modifier les réglages informatiques, ou utiliser les téléphones portables à des fins personnelles durant les sessions.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 5 : Accès aux locaux</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Les stagiaires ont accès aux locaux exclusivement pour suivre le stage. Il leur est interdit d'être accompagné·e·s de personnes non inscrites.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 6 - Utilisation du matériel</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Tout·e stagiaire est tenu·e de conserver en bon état le matériel et la documentation. L'utilisation à d'autres fins est interdite. Il est interdit de diffuser les codes d'accès. La documentation est protégée par droits d'auteur. Il est interdit d'enregistrer ou filmer les sessions sans autorisation.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 7 : Vol ou dégradation des biens personnels</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            L'organisme de formation décline toute responsabilité en cas de perte, vol ou détérioration des objets personnels des stagiaires.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 8 - Sanctions</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Tout agissement fautif pourra faire l'objet de sanctions : rappel à l'ordre, avertissement écrit, blâme, exclusion temporaire ou définitive.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 9 - Procédure disciplinaire</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            En application de l'article R.6352-4 du Code du Travail, aucune sanction ne peut être prononcée sans information préalable des griefs. Une procédure d'entretien préalable est prévue, avec possibilité d'assistance. La sanction est notifiée par écrit.
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 10 : Représentation des stagiaires</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Dans les stages d'une durée supérieure à 500 heures, il est procédé à l'élection de délégués (titulaire et suppléant).
          </p>

          <h4 style="font-weight: bold; margin-bottom: 5px;">Article 11 : Publicité</h4>
          <p style="text-align: justify; font-size: 9pt; margin-bottom: 10px;">
            Le présent règlement est affiché dans les locaux et sur le site internet. Un exemplaire est remis à chaque stagiaire.
          </p>

          <p style="margin-top: 20px;">Fait à {ecole_ville}</p>
          <p>Le {date_jour}</p>
        </div>
      </div>
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
          <tr>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Matière</th>
            <th style="padding: 5px 8px; text-align: center; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 70px;">Coeff.</th>
            <th style="padding: 5px 8px; text-align: center; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold; width: 80px;">Note /20</th>
            <th style="padding: 5px 8px; text-align: left; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; font-weight: bold;">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: 500;">{matiere_1}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; text-align: center;">{coef_1}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; text-align: center; font-weight: bold;">{note_1}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt; color: #666;">{appreciation_1}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: 500;">{matiere_2}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; text-align: center;">{coef_2}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; text-align: center; font-weight: bold;">{note_2}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt; color: #666;">{appreciation_2}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: 500;">{matiere_3}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; text-align: center;">{coef_3}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; text-align: center; font-weight: bold;">{note_3}</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt; color: #666;">{appreciation_3}</td>
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
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CONDITIONS GÉNÉRALES DE VENTE
        </h1>
        <p style="font-size: 10pt; color: #666; margin: 0;">Applicables aux prestations de formation professionnelle</p>
        <p style="font-size: 10pt; color: #666; margin: 5px 0 0 0; font-weight: bold;">{ecole_nom}</p>
      </div>

      <div style="padding: 10px 15px; background-color: #f9fafb; border-left: 3px solid #335ACF; margin-bottom: 20px;">
        <p style="font-size: 9pt; margin: 0;">
          <strong>Organisme de formation :</strong> {ecole_nom}<br/>
          <strong>SIRET :</strong> {ecole_siret}<br/>
          <strong>N° déclaration d'activité :</strong> {ecole_numero_declaration}<br/>
          <strong>Adresse :</strong> {ecole_adresse}, {ecole_code_postal} {ecole_ville}
        </p>
      </div>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 1 - Objet et champ d'application</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les prestations de formation
        professionnelle conclues entre <strong>{ecole_nom}</strong> et ses clients. Toute inscription ou commande
        implique l'acceptation sans réserve par le client des présentes CGV.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 2 - Inscriptions et commandes</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Toute inscription à une formation doit être formalisée par la signature d'une convention de formation
        ou l'acceptation d'un devis. L'inscription est définitive à réception du contrat signé accompagné
        du règlement ou d'un accord de prise en charge par un organisme financeur.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 3 - Prix et modalités de paiement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Les prix des formations sont indiqués en euros et sont exonérés de TVA en vertu de l'article 261-4-4° du CGI.
        Le règlement s'effectue selon l'échéancier prévu au contrat, par virement bancaire ou chèque.
        En cas de retard de paiement, des pénalités au taux de 3 fois le taux d'intérêt légal seront appliquées,
        ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 4 - Délai de rétractation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Conformément aux articles L.6353-5 et L.6353-6 du Code du travail, le stagiaire dispose d'un délai de
        10 jours à compter de la signature de la convention pour se rétracter par lettre recommandée avec AR.
        Ce délai est porté à 14 jours pour les contrats conclus à distance (article L.221-18 du Code de la consommation).
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 5 - Annulation et report</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        En cas d'annulation par le client moins de 15 jours avant le début de la formation, 30% du montant
        total sera facturé. Moins de 7 jours avant, 50% sera facturé. En cas d'absence non signalée,
        l'intégralité des frais sera due. L'organisme se réserve le droit d'annuler ou reporter une session
        en cas d'effectif insuffisant, avec proposition de dates alternatives ou remboursement intégral.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 6 - Déroulement des formations</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Le stagiaire s'engage à respecter le règlement intérieur de l'organisme et à signer les feuilles
        d'émargement. Une attestation de fin de formation sera délivrée au stagiaire. L'organisme s'engage
        à fournir des moyens pédagogiques adaptés et à évaluer les acquis de la formation.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 7 - Responsabilité</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        L'organisme s'engage sur une obligation de moyens. Sa responsabilité ne saurait être engagée en cas
        de non-atteinte des objectifs pédagogiques du fait du stagiaire. L'organisme décline toute responsabilité
        en cas de vol ou dommages aux biens personnels des stagiaires sur le lieu de formation.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 8 - Propriété intellectuelle</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Les supports pédagogiques sont la propriété exclusive de l'organisme. Leur reproduction, diffusion
        ou utilisation à des fins commerciales est strictement interdite sans autorisation écrite préalable.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 9 - Protection des données personnelles</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        Conformément au RGPD, les données personnelles collectées sont nécessaires au traitement des inscriptions
        et au suivi pédagogique. Le client dispose d'un droit d'accès, de rectification et de suppression
        de ses données en contactant : {ecole_email}.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #335ACF;">Article 10 - Litiges et médiation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9pt; margin: 0;">
        En cas de litige, les parties s'engagent à rechercher une solution amiable. Conformément à l'article
        L.612-1 du Code de la consommation, le client peut recourir gratuitement à un médiateur de la consommation.
        À défaut de résolution amiable, les tribunaux de {ecole_ville} seront seuls compétents.
      </p>

      <div style="margin-top: 25px; padding: 12px; background-color: #f9fafb; border-radius: 5px;">
        <p style="margin: 0; font-size: 9pt; text-align: center;">
          <strong>Date d'entrée en vigueur :</strong> {date_jour}<br/>
          Ces CGV sont susceptibles d'être modifiées à tout moment. La version applicable est celle en vigueur
          à la date de signature du contrat.
        </p>
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
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #000000;">
        <p style="font-size: 10pt; font-weight: bold; margin: 0 0 2px 0; color: #000000; text-transform: uppercase; letter-spacing: 2px;">Programme de formation</p>
        <p style="font-size: 14pt; font-weight: bold; margin: 8px 0 4px 0; color: #000000;">{programme_nom}</p>
        <p style="font-size: 10pt; margin: 0 0 8px 0; font-style: italic; color: #000000;">{programme_sous_titre}</p>
        <p style="font-size: 9pt; color: #000000; margin: 0;">Code : {programme_code} · Durée : {programme_duree_heures} · Type : {programme_type_action}</p>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Description</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6; text-align: justify;">{programme_description}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Objectifs pédagogiques</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_objectifs}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Public concerné</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_profil_apprenants}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Prérequis</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_prerequis}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Méthodes pédagogiques</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_methodes_pedagogiques}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Contenu de la formation</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_contenu}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Suivi et évaluation</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_suivi_execution}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Modalités de certification</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_modalites_certification}</div>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Informations pratiques</p>
        <p style="margin: 0 0 3px 0; font-size: 10pt; color: #000000;">Tarif entreprise : <strong>{programme_prix_entreprise}</strong></p>
        <p style="margin: 0 0 3px 0; font-size: 10pt; color: #000000;">Tarif particulier : <strong>{programme_prix_particulier}</strong></p>
        <p style="margin: 0 0 3px 0; font-size: 10pt; color: #000000;">Éligible CPF : <strong>{programme_eligible_cpf}</strong> — Code CPF : <strong>{programme_code_cpf}</strong></p>
        <p style="margin: 0; font-size: 10pt; color: #000000;">Délai d'accès moyen : <strong>{programme_delai_acces}</strong></p>
      </div>

      <div style="margin-bottom: 16px; border-bottom: 1px solid #000000; padding-bottom: 14px;">
        <p style="margin: 0 0 6px 0; font-size: 10pt; font-weight: bold; color: #000000; text-transform: uppercase;">Accessibilité</p>
        <div style="font-size: 10pt; color: #000000; line-height: 1.6;">{programme_accessibilite}</div>
      </div>

      <div style="margin-top: 30px; padding-top: 16px; border-top: 2px solid #000000; display: flex; justify-content: space-between; align-items: flex-end;">
        <p style="margin: 0; font-size: 9pt; color: #000000;">Document établi le {date_jour}</p>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt; color: #000000;">{ecole_representant}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt; color: #000000;">Responsable pédagogique</p>
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

  // ==========================================
  // CERTIFICAT DE RÉALISATION
  // ==========================================
  certificat_realisation: {
    type: 'certificat_realisation',
    name: 'Certificat de réalisation',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          CERTIFICAT DE RÉALISATION
        </h1>
        <p style="font-size: 9pt; color: #666; margin-top: 8px; font-style: italic;">
          (Article L.6353-1 du Code du travail)
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; font-size: 11pt; line-height: 1.8;">
          Je soussigné(e), <strong>{ecole_representant}</strong>, représentant(e) légal(e) de l'organisme de formation
          <strong>{ecole_nom}</strong>, atteste que :
        </p>
      </div>

      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #335ACF;">
        <p style="font-size: 12pt; font-weight: bold; margin-bottom: 15px; color: #1A1A1A;">
          {eleve_prenom} {eleve_nom}
        </p>
        <p style="font-size: 10pt; margin-bottom: 5px;">Né(e) le : {eleve_date_naissance}</p>
        <p style="font-size: 10pt;">Adresse : {eleve_adresse}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; font-size: 11pt; line-height: 1.8;">
          a suivi l'action de formation suivante :
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; width: 40%; background-color: #f2f2f2; font-size: 10pt;">Intitulé de la formation</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{formation_nom}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 10pt;">Objectifs de la formation</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{formation_objectifs}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 10pt;">Nature de l'action</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">Action de formation</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 10pt;">Durée totale</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{formation_duree}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 10pt;">Dates de réalisation</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">Du {session_debut} au {session_fin}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 10pt;">Lieu de formation</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{session_lieu}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 10pt;">Modalité</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{session_modalite}</td>
        </tr>
      </table>

      <div style="margin-top: 30px; padding: 15px; border: 1px solid #e5e7eb; background-color: #fff;">
        <p style="font-size: 10pt; line-height: 1.6;">
          <strong>Attestation :</strong> Le bénéficiaire a bien réalisé l'intégralité du parcours de formation défini
          dans le programme de formation et les conditions d'exécution ont été conformes aux dispositions prévues.
        </p>
      </div>

      <div style="margin-top: 40px;">
        <p style="text-align: right; margin-bottom: 30px; font-size: 10pt;">
          Fait à {ecole_ville}, le {date_jour}
        </p>
        <div style="text-align: right;">
          <p style="font-weight: bold; font-size: 10pt;">Pour l'organisme de formation</p>
          <p style="font-size: 10pt; margin-top: 5px;">{ecole_nom}</p>
          <p style="margin-top: 50px; font-size: 10pt;">________________________</p>
          <p style="font-size: 10pt;">{ecole_representant}</p>
          <p style="font-size: 9pt; color: #666;">Cachet et signature</p>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // ATTESTATION (GÉNÉRIQUE)
  // ==========================================
  attestation: {
    type: 'attestation',
    name: 'Attestation de Formation',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION DE FORMATION
        </h1>
      </div>

      <div style="margin-bottom: 40px;">
        <p style="text-align: justify; font-size: 16px; line-height: 1.8;">
          L'établissement <strong>{ecole_nom}</strong> certifie que 
          <strong>{eleve_prenom} {eleve_nom}</strong> a suivi la formation 
          <strong>"{formation_nom}"</strong>.
        </p>
      </div>
      
      <div style="margin-top: 60px; text-align: center;">
        <p style="margin-bottom: 50px;">{ecole_ville}, le {date_jour}</p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 40px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // LIVRET D'ACCUEIL
  // ==========================================
  livret_accueil: {
    type: 'livret_accueil',
    name: 'Livret d\'accueil',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); border-radius: 8px;">
        <h1 style="font-size: 20pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          LIVRET D'ACCUEIL
        </h1>
        <p style="font-size: 11pt; color: #666; margin-top: 10px;">
          {ecole_nom}
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 13pt; font-weight: bold; margin-bottom: 12px; color: #335ACF; border-bottom: 2px solid #335ACF; padding-bottom: 5px;">
          1. MOT DE BIENVENUE
        </h2>
        <p style="text-align: justify; font-size: 10pt; line-height: 1.7;">
          Nous sommes heureux de vous accueillir au sein de <strong>{ecole_nom}</strong>.
          Ce livret a pour objectif de vous fournir toutes les informations pratiques nécessaires
          au bon déroulement de votre formation. N'hésitez pas à le consulter régulièrement.
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 13pt; font-weight: bold; margin-bottom: 12px; color: #335ACF; border-bottom: 2px solid #335ACF; padding-bottom: 5px;">
          2. PRÉSENTATION DE L'ORGANISME
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; background-color: #f2f2f2; font-weight: bold; width: 35%; font-size: 10pt;">Raison sociale</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{ecole_nom}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; background-color: #f2f2f2; font-weight: bold; font-size: 10pt;">Adresse</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; background-color: #f2f2f2; font-weight: bold; font-size: 10pt;">Téléphone</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{ecole_telephone}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; background-color: #f2f2f2; font-weight: bold; font-size: 10pt;">Email</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{ecole_email}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; background-color: #f2f2f2; font-weight: bold; font-size: 10pt;">N° SIRET</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{ecole_siret}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; background-color: #f2f2f2; font-weight: bold; font-size: 10pt;">N° déclaration d'activité</td>
            <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 10pt;">{ecole_numero_declaration}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 13pt; font-weight: bold; margin-bottom: 12px; color: #335ACF; border-bottom: 2px solid #335ACF; padding-bottom: 5px;">
          3. INFORMATIONS PRATIQUES
        </h2>
        <h3 style="font-size: 11pt; font-weight: bold; margin: 15px 0 8px 0;">Horaires d'ouverture</h3>
        <p style="font-size: 10pt; line-height: 1.6; margin-left: 15px;">
          Du lundi au vendredi : {horaires_ouverture}
        </p>
        <h3 style="font-size: 11pt; font-weight: bold; margin: 15px 0 8px 0;">Accès</h3>
        <p style="font-size: 10pt; line-height: 1.6; margin-left: 15px;">
          {ecole_adresse}, {ecole_code_postal} {ecole_ville}
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 13pt; font-weight: bold; margin-bottom: 12px; color: #335ACF; border-bottom: 2px solid #335ACF; padding-bottom: 5px;">
          4. DÉROULEMENT DE LA FORMATION
        </h2>
        <ul style="font-size: 10pt; line-height: 1.8; margin-left: 20px;">
          <li>La formation se déroule selon le programme prévu et communiqué en amont.</li>
          <li>Une feuille d'émargement sera à signer à chaque demi-journée de formation.</li>
          <li>Les supports pédagogiques vous seront remis au fur et à mesure de la formation.</li>
          <li>Des évaluations seront réalisées pour mesurer l'atteinte des objectifs.</li>
        </ul>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 13pt; font-weight: bold; margin-bottom: 12px; color: #335ACF; border-bottom: 2px solid #335ACF; padding-bottom: 5px;">
          5. RÈGLES DE VIE
        </h2>
        <ul style="font-size: 10pt; line-height: 1.8; margin-left: 20px;">
          <li><strong>Ponctualité :</strong> Merci de respecter les horaires de formation.</li>
          <li><strong>Téléphone :</strong> Veuillez mettre votre téléphone en mode silencieux.</li>
          <li><strong>Respect :</strong> Le respect mutuel entre stagiaires et formateurs est essentiel.</li>
          <li><strong>Propreté :</strong> Veillez à maintenir les locaux propres.</li>
          <li><strong>Interdictions :</strong> Il est interdit de fumer dans l'enceinte de l'établissement.</li>
        </ul>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 13pt; font-weight: bold; margin-bottom: 12px; color: #335ACF; border-bottom: 2px solid #335ACF; padding-bottom: 5px;">
          6. CONTACTS UTILES
        </h2>
        <p style="font-size: 10pt; line-height: 1.6;">
          <strong>Responsable pédagogique :</strong> {ecole_representant}<br/>
          <strong>Contact administratif :</strong> {ecole_telephone}<br/>
          <strong>Email :</strong> {ecole_email}
        </p>
      </div>

      <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="font-size: 10pt; font-style: italic; color: #666;">
          Nous vous souhaitons une excellente formation au sein de notre établissement !
        </p>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // FEUILLE D'ÉMARGEMENT
  // ==========================================
  emargement: {
    type: 'emargement',
    name: 'Feuille d\'émargement',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          FEUILLE D'ÉMARGEMENT
        </h1>
        <p style="font-size: 9pt; color: #666; margin-top: 5px; font-style: italic;">
          (Article L.6353-1 du Code du travail)
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; width: 30%; background-color: #f2f2f2; font-size: 9pt;">Formation</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt;">{formation_nom}</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; width: 15%; background-color: #f2f2f2; font-size: 9pt;">Durée</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt;">{formation_duree}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 9pt;">Session</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt;">{session_nom}</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 9pt;">Horaires</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt;">{session_horaires}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 9pt;">Date</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt;">{session_debut}</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-weight: bold; background-color: #f2f2f2; font-size: 9pt;">Lieu</td>
          <td style="padding: 5px 8px; border: 1px solid #cccccc; font-size: 9pt;">{session_lieu}</td>
        </tr>
      </table>

      <p style="font-size: 9pt; margin-bottom: 10px; font-style: italic; color: #666;">
        Les stagiaires sont tenus d'émarger à chaque demi-journée de formation.
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 5px 8px; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; text-align: left; font-size: 9pt; width: 30%; font-weight: bold;">Nom et Prénom</th>
            <th style="padding: 5px 8px; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; text-align: center; font-size: 9pt; width: 17.5%; font-weight: bold;">Matin<br/><span style="font-weight: normal; font-size: 8pt;">Arrivée</span></th>
            <th style="padding: 5px 8px; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; text-align: center; font-size: 9pt; width: 17.5%; font-weight: bold;">Matin<br/><span style="font-weight: normal; font-size: 8pt;">Départ</span></th>
            <th style="padding: 5px 8px; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; text-align: center; font-size: 9pt; width: 17.5%; font-weight: bold;">Après-midi<br/><span style="font-weight: normal; font-size: 8pt;">Arrivée</span></th>
            <th style="padding: 5px 8px; background-color: #f2f2f2; border: 1px solid #000000; border-bottom: 2px solid #333333; text-align: center; font-size: 9pt; width: 17.5%; font-weight: bold;">Après-midi<br/><span style="font-weight: normal; font-size: 8pt;">Départ</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;">{eleve_prenom} {eleve_nom}</td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; font-size: 9pt;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center; height: 40px;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
            <td style="padding: 12px 8px; border: 1px solid #cccccc; text-align: center;"></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 25px; display: flex; justify-content: space-between;">
        <div style="width: 48%;">
          <p style="font-size: 9pt; font-weight: bold; margin-bottom: 5px;">Formateur :</p>
          <p style="font-size: 9pt; margin-bottom: 30px;">Nom : ____________________________</p>
          <p style="font-size: 9pt;">Signature :</p>
        </div>
        <div style="width: 48%; text-align: right;">
          <p style="font-size: 9pt; font-weight: bold; margin-bottom: 5px;">Responsable pédagogique :</p>
          <p style="font-size: 9pt; margin-bottom: 30px;">Nom : ____________________________</p>
          <p style="font-size: 9pt;">Signature et cachet :</p>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // CONVENTION DE PRESTATION FORMATEUR
  // ==========================================
  convention_formateur: {
    type: 'convention_formateur',
    name: 'Convention de prestation avec formateur indépendant',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 15pt; font-weight: bold; margin: 0 0 6px 0; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px;">
          Convention de Prestation de Services
        </h1>
        <h2 style="font-size: 11pt; font-weight: normal; margin: 0 0 4px 0; color: #444;">
          Animation de Formation Professionnelle
        </h2>
        <p style="font-size: 8.5pt; color: #666; margin: 0; font-style: italic;">
          (Articles L.6353-1 et suivants du Code du Travail — Formation professionnelle continue)
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold; font-size: 10.5pt; margin: 0 0 14px 0; color: #1A1A1A;">ENTRE LES SOUSSIGNÉS :</p>

        <div style="background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px; margin-bottom: 14px;">
          <p style="font-weight: bold; font-size: 10pt; margin: 0 0 4px 0;">{ecole_nom}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">SIRET : {ecole_siret}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">Déclaration d'activité N° {ecole_numero_declaration} (Préfet de région : {ecole_region})</p>
          <p style="font-size: 9.5pt; margin: 8px 0 2px 0; color: #333;">Représenté(e) par : <strong>{ecole_representant}</strong></p>
          <p style="font-size: 8.5pt; color: #666; margin: 4px 0 0 0; font-style: italic;">Ci-après dénommé « l'Organisme de Formation »</p>
        </div>

        <p style="font-size: 10pt; font-weight: bold; text-align: center; margin: 12px 0; color: #555;">ET</p>

        <div style="background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px; margin-bottom: 14px;">
          <p style="font-weight: bold; font-size: 10pt; margin: 0 0 4px 0;">{formateur_prenom} {formateur_nom}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">{formateur_adresse}, {formateur_code_postal} {formateur_ville}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">Email : {formateur_email} — Tél : {formateur_telephone}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">SIRET : {formateur_siret}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">Statut : {formateur_statut}</p>
          <p style="font-size: 9.5pt; margin: 0 0 2px 0; color: #333;">Spécialité : {formateur_specialite}</p>
          <p style="font-size: 8.5pt; color: #666; margin: 4px 0 0 0; font-style: italic;">Ci-après dénommé « le Formateur »</p>
        </div>

        <p style="font-size: 9.5pt; color: #444; font-style: italic; margin: 10px 0 0 0;">
          Il a été convenu ce qui suit :
        </p>
      </div>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 20px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 1 — Objet de la convention
      </h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt; margin: 0 0 8px 0;">
        La présente convention a pour objet de définir les conditions dans lesquelles le Formateur intervient en qualité de prestataire indépendant au profit de l'Organisme de Formation pour assurer des actions de formation professionnelle continue au sens des articles L.6313-1 et suivants du Code du Travail.
      </p>
      <p style="text-align: justify; line-height: 1.6; font-size: 9.5pt; margin: 0;">
        Le Formateur agit en qualité de prestataire indépendant et n'est lié à l'Organisme de Formation par aucun lien de subordination. La présente convention ne saurait être requalifiée en contrat de travail.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 2 — Nature et durée de la prestation
      </h2>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0 0 6px 0;">
        Le Formateur s'engage à réaliser la prestation suivante : <strong>{formateur_specialite}</strong>
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 10px 0;">
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold; width: 40%;">Période de la prestation</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">Du {convention_date_debut} au {convention_date_fin}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Volume horaire total</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{convention_heures_total} heures</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Lieu de la formation</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{convention_lieu_formation}</td>
        </tr>
      </table>
      <p style="font-size: 9pt; color: #555; font-style: italic; margin: 6px 0 0 0;">
        Le calendrier précis des interventions sera communiqué au Formateur au moins 15 jours avant chaque session. Toute modification de planning fera l'objet d'une concertation préalable entre les parties.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 3 — Honoraires et modalités de paiement
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 10px 0;">
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold; width: 40%;">Tarif horaire HT</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{convention_tarif_horaire} €/heure</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Volume horaire</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{convention_heures_total} heures</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Montant total HT</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc; font-weight: bold; font-size: 10.5pt;">{convention_montant_total} €</td>
        </tr>
      </table>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 8px 0 0 0;">
        <strong>Modalités de paiement :</strong> {convention_modalites_paiement}
      </p>
      <p style="font-size: 9pt; color: #555; margin: 6px 0 0 0; font-style: italic;">
        Le paiement sera effectué sur présentation de facture émise par le Formateur, conformément à son statut juridique. En cas de TVA applicable, celle-ci sera indiquée sur la facture et facturée en sus du montant HT indiqué ci-dessus.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 4 — Obligations du Formateur
      </h2>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0 0 6px 0;">Le Formateur s'engage à :</p>
      <ul style="font-size: 9.5pt; line-height: 1.7; margin: 0 0 0 18px; padding: 0;">
        <li>Réaliser les prestations avec professionnalisme et dans le respect des règles pédagogiques en vigueur ;</li>
        <li>Se conformer au programme de formation défini conjointement avec l'Organisme de Formation ;</li>
        <li>Assurer la remise des documents pédagogiques nécessaires aux stagiaires (supports de cours, exercices, etc.) ;</li>
        <li>Émarger les feuilles de présence à chaque séance et transmettre tout document requis par l'Organisme ;</li>
        <li>Signaler sans délai toute difficulté susceptible de compromettre le bon déroulement de la formation ;</li>
        <li>Respecter les règles de confidentialité relatives aux stagiaires et à l'activité de l'Organisme de Formation ;</li>
        <li>Souscrire et maintenir une assurance responsabilité civile professionnelle couvrant son activité.</li>
      </ul>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 5 — Obligations de l'Organisme de Formation
      </h2>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0 0 6px 0;">L'Organisme de Formation s'engage à :</p>
      <ul style="font-size: 9.5pt; line-height: 1.7; margin: 0 0 0 18px; padding: 0;">
        <li>Mettre à disposition du Formateur les locaux, équipements et ressources pédagogiques nécessaires au bon déroulement des formations ;</li>
        <li>Communiquer au Formateur les informations relatives aux stagiaires (niveaux, prérequis, objectifs attendus) ;</li>
        <li>Régler les honoraires dans les délais convenus, sur présentation de facture conforme ;</li>
        <li>Informer le Formateur de toute modification de planning dans les meilleurs délais.</li>
      </ul>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 6 — Propriété intellectuelle
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0;">
        Les supports et contenus pédagogiques spécifiquement créés par le Formateur dans le cadre de la présente convention et destinés exclusivement à l'Organisme de Formation sont cédés à ce dernier à titre non exclusif pour la durée légale de protection. Le Formateur conserve la propriété intellectuelle de ses outils et méthodes préexistants. Toute reproduction ou diffusion des supports originaux du Formateur est soumise à son accord préalable écrit.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 7 — Confidentialité
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0;">
        Les parties s'engagent mutuellement à garder confidentielles toutes les informations sensibles échangées dans le cadre de la présente convention (données personnelles des stagiaires, informations commerciales, contenu pédagogique propriétaire), et ce pendant toute la durée de la convention et pour une période de 3 ans après son expiration, conformément à la réglementation RGPD en vigueur.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 8 — Indépendance des parties et régime social
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0;">
        Le Formateur exerce son activité en toute indépendance et sous sa propre responsabilité. Il est seul responsable de ses obligations fiscales et sociales découlant de son statut de travailleur indépendant. L'Organisme de Formation ne peut être tenu responsable de tout manquement du Formateur à ses obligations déclaratives. Le Formateur s'engage à fournir, à première demande, une attestation de vigilance délivrée par l'URSSAF conformément à l'article L.8222-1 du Code du Travail.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 9 — Résiliation
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0 0 6px 0;">
        Chaque partie peut mettre fin à la présente convention par lettre recommandée avec accusé de réception, moyennant un préavis de 15 jours calendaires, sauf accord mutuel pour un délai plus court.
      </p>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0;">
        En cas de manquement grave d'une partie à ses obligations, l'autre partie peut résilier la présente convention de plein droit, sans préavis ni indemnité, par lettre recommandée avec accusé de réception, après mise en demeure restée sans effet pendant 8 jours ouvrés. Les prestations effectuées avant la résiliation sont dues et seront réglées dans les conditions prévues à l'article 3.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 10 — Force majeure
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0;">
        Aucune des parties ne saurait être tenue responsable d'un manquement à ses obligations en cas de survenance d'un événement de force majeure au sens de l'article 1218 du Code civil. La partie concernée doit informer l'autre dans les plus brefs délais. Si la situation de force majeure persiste au-delà de 30 jours, chacune des parties peut résilier la convention sans indemnité.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 11 — Clauses particulières
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0; min-height: 40px;">
        {convention_notes}
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 12 — Loi applicable et règlement des litiges
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0;">
        La présente convention est soumise au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire. À défaut d'accord amiable dans un délai de 30 jours, le litige sera soumis aux tribunaux compétents du ressort du siège social de l'Organisme de Formation.
      </p>

      <div style="margin-top: 30px;">
        <p style="text-align: center; font-size: 9.5pt; margin-bottom: 20px; color: #555;">
          Fait en deux exemplaires originaux, à {ecole_ville}, le {date_jour}
        </p>

        <div style="display: flex; justify-content: space-between; margin-top: 10px;">
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; font-size: 9.5pt; margin-bottom: 4px;">Pour l'Organisme de Formation</p>
            <p style="font-size: 9pt; color: #444; margin-bottom: 50px;">{ecole_nom}<br/>{ecole_representant}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
              <p style="font-size: 8.5pt; color: #666;">Signature et cachet</p>
            </div>
          </div>
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; font-size: 9.5pt; margin-bottom: 4px;">Le Formateur</p>
            <p style="font-size: 9pt; color: #444; margin-bottom: 50px;">{formateur_prenom} {formateur_nom}<br/>Lu et approuvé</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
              <p style="font-size: 8.5pt; color: #666;">Signature</p>
            </div>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  ordre_de_mission: {
    type: 'ordre_de_mission',
    name: 'Ordre de mission formateur',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 15pt; font-weight: bold; margin: 0 0 6px 0; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px;">
          Ordre de Mission
        </h1>
        <h2 style="font-size: 11pt; font-weight: normal; margin: 0 0 4px 0; color: #444;">
          Formation Professionnelle Continue
        </h2>
        <p style="font-size: 8.5pt; color: #666; margin: 0; font-style: italic;">
          (Arrêté du 20 décembre 2002 relatif aux frais professionnels — Barèmes URSSAF en vigueur)
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 8.5pt; color: #666; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <span>Réf. mission : <strong>{mission_reference}</strong></span>
        <span>NDA : {ecole_numero_declaration}</span>
        <span>Émis le : {date_aujourd_hui}</span>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold; font-size: 10.5pt; margin: 0 0 14px 0; color: #1A1A1A;">L'ORGANISME MANDANT DONNE ORDRE À :</p>

        <div style="display: flex; gap: 16px; margin-bottom: 14px;">
          <div style="flex: 1; background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px;">
            <p style="font-size: 8pt; text-transform: uppercase; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">Organisme mandant</p>
            <p style="font-weight: bold; font-size: 10pt; margin: 0 0 3px 0;">{ecole_nom}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">SIRET : {ecole_siret} — NDA : {ecole_numero_declaration}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</p>
            <p style="font-size: 9pt; margin: 4px 0 0 0; color: #333;">Représenté par : <strong>{mission_autorisant_nom}</strong>, {mission_autorisant_qualite}</p>
          </div>
          <div style="flex: 1; background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px;">
            <p style="font-size: 8pt; text-transform: uppercase; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">Formateur missionnaire</p>
            <p style="font-weight: bold; font-size: 10pt; margin: 0 0 3px 0;">{formateur_prenom} {formateur_nom}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">Statut : {formateur_statut}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">{formateur_adresse}, {formateur_code_postal} {formateur_ville}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">{formateur_email} — {formateur_telephone}</p>
          </div>
        </div>
      </div>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 20px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 1 — Objet de la mission
      </h2>
      <div style="background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px; margin-bottom: 10px;">
        <p style="font-weight: bold; font-size: 10.5pt; margin: 0 0 4px 0;">{mission_objet}</p>
        <p style="font-size: 9.5pt; color: #333; margin: 0 0 2px 0;">Formation : {mission_formation}</p>
        <p style="font-size: 9pt; color: #666; margin: 0;">Réf. session : {mission_session_ref}</p>
      </div>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0;">
        Le missionnaire est autorisé à se déplacer pour réaliser la mission de formation définie ci-dessus, dans le cadre des activités de formation professionnelle continue de l'organisme (art. L.6313-1 et suivants du Code du Travail).
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 2 — Lieu, dates et durée
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0;">
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold; width: 40%;">Lieu d'intervention</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{mission_lieu}<br/><span style="font-size: 9pt; color: #555;">{mission_lieu_adresse}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Période</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">Du {mission_date_debut} au {mission_date_fin}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Horaires</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{mission_horaires}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Durée totale</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{mission_duree_jours} jour(s) — {mission_duree_heures} heure(s) de formation</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ccc; background: #f2f2f2; font-weight: bold;">Transport autorisé</td>
          <td style="padding: 6px 10px; border: 1px solid #ccc;">{mission_transport_autorise}</td>
        </tr>
      </table>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 3 — Remboursement des frais professionnels
      </h2>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0 0 8px 0;">
        Conformément à l'arrêté du 20 décembre 2002 relatif aux frais professionnels déductibles pour le calcul des cotisations de sécurité sociale, et aux barèmes URSSAF en vigueur, les frais engagés par le missionnaire sont remboursés dans les limites suivantes :
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0;">
        <thead>
          <tr style="background: #1A1A1A; color: white;">
            <th style="padding: 7px 10px; text-align: left; font-weight: bold;">Nature des frais</th>
            <th style="padding: 7px 10px; text-align: center; font-weight: bold;">Base de remboursement</th>
            <th style="padding: 7px 10px; text-align: right; font-weight: bold;">Plafond</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #f9f9f9;">
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd;">Indemnités kilométriques (véhicule personnel)</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: center;">{mission_distance_aller} km A/R × barème fiscal en vigueur</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{mission_indemnite_km} €/km</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd;">Repas du midi (déplacement hors résidence)</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: center;">Sur justificatif — art. 4 arrêté 20/12/2002</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{mission_frais_repas_midi} €</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd;">Repas du soir (grand déplacement)</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: center;">Sur justificatif — art. 4 arrêté 20/12/2002</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{mission_frais_repas_soir} €</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px;">Hébergement (grand déplacement, nuit complète)</td>
            <td style="padding: 7px 10px; text-align: center;">Sur justificatif — plafond URSSAF zone concernée</td>
            <td style="padding: 7px 10px; text-align: right; font-weight: bold;">{mission_frais_hebergement} €/nuit</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 8.5pt; color: #666; margin: 6px 0 0 0; font-style: italic;">
        Est considéré comme « grand déplacement » tout déplacement à plus de 50 km du domicile habituel du missionnaire ne pouvant donner lieu à retour quotidien (circ. DSS/SDFSS/5B du 7 janvier 2003). Les justificatifs originaux doivent être remis à l'organisme dans un délai de 30 jours suivant la fin de la mission.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 4 — Avance sur frais
      </h2>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0 0 6px 0;">
        Une avance sur frais de <strong>{mission_avance} €</strong> sera versée au missionnaire préalablement à la mission, à valoir sur le remboursement définitif. Tout solde débiteur au terme de la mission devra être reversé à l'organisme dans un délai de 15 jours calendaires.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 5 — Obligations du missionnaire
      </h2>
      <ul style="font-size: 9.5pt; line-height: 1.7; margin: 0 0 0 18px; padding: 0;">
        <li>Respecter scrupuleusement le programme de formation et les horaires fixés ;</li>
        <li>Émarger les feuilles de présence à chaque séance conformément aux exigences Qualiopi (indicateur 7 du Référentiel National Qualité) ;</li>
        <li>Signaler immédiatement tout incident, annulation ou modification pouvant affecter le bon déroulement de la mission ;</li>
        <li>Conserver et remettre l'intégralité des justificatifs de frais originaux dans les délais impartis ;</li>
        <li>Respecter la confidentialité des données à caractère personnel des stagiaires (RGPD — Règlement UE 2016/679) ;</li>
        <li>Fournir, sur demande, tout compte-rendu ou bilan pédagogique requis par l'organisme ;</li>
        <li>N'effectuer que les déplacements strictement nécessaires à l'exécution de la mission, par les moyens de transport autorisés.</li>
      </ul>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 6 — Annulation et force majeure
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0 0 6px 0;">
        Toute annulation ou report de la mission doit être signalée dans les meilleurs délais. Seuls les frais engagés et justifiés avant l'annulation seront remboursés. En cas de force majeure au sens de l'article 1218 du Code civil (pandémie, grève des transports, catastrophe naturelle), le présent ordre de mission est suspendu sans pénalité, avec report éventuel sur accord des parties.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 7 — Notes particulières
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; line-height: 1.6; margin: 0; min-height: 30px;">
        {mission_notes}
      </p>

      <div style="margin-top: 30px;">
        <p style="text-align: center; font-size: 9.5pt; margin-bottom: 20px; color: #555;">
          Fait en deux exemplaires originaux, à {ecole_ville}, le {date_aujourd_hui}
        </p>
        <div style="display: flex; justify-content: space-between; margin-top: 10px;">
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; font-size: 9.5pt; margin-bottom: 4px;">Pour l'Organisme de Formation</p>
            <p style="font-size: 9pt; color: #444; margin-bottom: 50px;">{ecole_nom}<br/>{mission_autorisant_nom} — {mission_autorisant_qualite}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
              <p style="font-size: 8.5pt; color: #666;">Signature et cachet</p>
            </div>
          </div>
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; font-size: 9.5pt; margin-bottom: 4px;">Le Formateur missionnaire</p>
            <p style="font-size: 9pt; color: #444; margin-bottom: 50px;">{formateur_prenom} {formateur_nom}<br/>Lu et approuvé — bon pour accord</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
              <p style="font-size: 8.5pt; color: #666;">Signature</p>
            </div>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  attestation_defraiement: {
    type: 'attestation_defraiement',
    name: 'Attestation de défraiement — Membre de jury',
    headerContent: premiumHeader,
    bodyContent: `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 15pt; font-weight: bold; margin: 0 0 6px 0; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px;">
          Attestation de Défraiement
        </h1>
        <h2 style="font-size: 11pt; font-weight: normal; margin: 0 0 4px 0; color: #444;">
          Membre de Jury — Certification Professionnelle
        </h2>
        <p style="font-size: 8.5pt; color: #666; margin: 0; font-style: italic;">
          (Art. R.6113-10 à R.6113-13 Code du Travail — Décret n° 2019-958 du 13 septembre 2019 — Arrêté du 20 décembre 2002)
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 8.5pt; color: #666; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <span>Réf. : <strong>{defraiement_reference}</strong></span>
        <span>Examen réf. : {examen_reference}</span>
        <span>Émis le : {date_aujourd_hui}</span>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="display: flex; gap: 16px; margin-bottom: 14px;">
          <div style="flex: 1; background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px;">
            <p style="font-size: 8pt; text-transform: uppercase; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">Organisme certificateur / de formation</p>
            <p style="font-weight: bold; font-size: 10pt; margin: 0 0 3px 0;">{ecole_nom}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">SIRET : {ecole_siret} — NDA : {ecole_numero_declaration}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</p>
            <p style="font-size: 9pt; margin: 4px 0 0 0; color: #333;">Représenté par : <strong>{ecole_representant}</strong></p>
          </div>
          <div style="flex: 1; background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px;">
            <p style="font-size: 8pt; text-transform: uppercase; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">Membre du jury</p>
            <p style="font-weight: bold; font-size: 10pt; margin: 0 0 3px 0;">{jury_prenom} {jury_nom}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">Qualité : {jury_qualite}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">{jury_adresse}, {jury_code_postal} {jury_ville}</p>
            <p style="font-size: 9pt; margin: 0 0 2px 0; color: #333;">{jury_email}</p>
          </div>
        </div>
      </div>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 20px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 1 — Nature et objet de la mission de jury
      </h2>
      <div style="background: #f9f9f9; border-left: 3px solid #1A1A1A; padding: 10px 14px; margin-bottom: 10px;">
        <p style="font-weight: bold; font-size: 10.5pt; margin: 0 0 4px 0;">{examen_nom}</p>
        <p style="font-size: 9.5pt; color: #333; margin: 0 0 2px 0;">Type : {examen_type}</p>
        <p style="font-size: 9.5pt; color: #333; margin: 0 0 2px 0;">Session : {session_nom} — Réf. {session_nom}</p>
        <p style="font-size: 9.5pt; color: #333; margin: 0 0 2px 0;">Date(s) : {examen_date}</p>
        <p style="font-size: 9.5pt; color: #333; margin: 0;">Lieu : {examen_lieu}</p>
      </div>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0;">
        La présente attestation est établie conformément aux articles R.6113-10 à R.6113-13 du Code du Travail et au Décret n° 2019-958 du 13 septembre 2019 relatif aux jurys de certification professionnelle. Elle certifie la participation du membre de jury susmentionné et justifie le remboursement des frais exposés dans l'exercice de sa mission.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 2 — Détail du défraiement
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0;">
        <thead>
          <tr style="background: #1A1A1A; color: white;">
            <th style="padding: 7px 10px; text-align: left; font-weight: bold;">Nature</th>
            <th style="padding: 7px 10px; text-align: center; font-weight: bold;">Détail / Base de calcul</th>
            <th style="padding: 7px 10px; text-align: right; font-weight: bold;">Montant (€)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #f9f9f9;">
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Vacations de jury</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: center;">{defraiement_nb_heures} h × {defraiement_taux_vacation} €/h</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{defraiement_vacations} €</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd;">Frais de transport</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: center;">{defraiement_distance_km} km A/R × {defraiement_taux_km} €/km (barème fiscal) ou sur justificatif</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{defraiement_transport} €</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd;">Indemnités repas</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: center;">Sur justificatif — plafond URSSAF en vigueur</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{defraiement_repas} €</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; border-bottom: 2px solid #1A1A1A;">Frais d'hébergement</td>
            <td style="padding: 7px 10px; border-bottom: 2px solid #1A1A1A; text-align: center;">Sur justificatif — plafond URSSAF en vigueur</td>
            <td style="padding: 7px 10px; border-bottom: 2px solid #1A1A1A; text-align: right; font-weight: bold;">{defraiement_hebergement} €</td>
          </tr>
          <tr style="background: #1A1A1A; color: white;">
            <td colspan="2" style="padding: 8px 10px; font-weight: bold; font-size: 10pt;">TOTAL À VERSER</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; font-size: 11pt;">{defraiement_total} €</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 8.5pt; color: #666; margin: 6px 0 0 0; font-style: italic;">
        Frais remboursés conformément à l'arrêté du 20 décembre 2002 relatif aux frais professionnels et aux barèmes URSSAF. Grand déplacement (> 50 km, sans possibilité de retour quotidien) : plafonds repas 20,90 €/repas, hébergement 70 €/nuit (82,30 € en Île-de-France) — circ. DSS/SDFSS/5B du 7 janvier 2003.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 3 — Modalités de versement
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0;">
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f2f2f2; font-weight: bold; width: 30%;">Mode de versement</td>
          <td style="padding: 6px 10px; border: 1px solid #ddd;">Virement bancaire</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f2f2f2; font-weight: bold;">IBAN</td>
          <td style="padding: 6px 10px; border: 1px solid #ddd; font-family: monospace;">{jury_iban}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f2f2f2; font-weight: bold;">BIC / SWIFT</td>
          <td style="padding: 6px 10px; border: 1px solid #ddd; font-family: monospace;">{jury_bic}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f2f2f2; font-weight: bold;">Délai de versement</td>
          <td style="padding: 6px 10px; border: 1px solid #ddd;">Dans un délai de 30 jours calendaires suivant la date de l'examen</td>
        </tr>
      </table>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 4 — Information fiscale et sociale
      </h2>
      <div style="background: #fff8e1; border: 1px solid #f59e0b; border-radius: 3px; padding: 10px 14px; margin-bottom: 8px;">
        <p style="font-size: 9pt; font-weight: bold; margin: 0 0 4px 0; color: #92400e;">⚠ Déclaration fiscale obligatoire</p>
        <p style="font-size: 9pt; line-height: 1.6; color: #78350f; margin: 0;">
          Les vacations de jury constituent des revenus imposables. Elles doivent être déclarées par le bénéficiaire dans la catégorie des <strong>Bénéfices Non Commerciaux (BNC)</strong> au titre de l'impôt sur le revenu, conformément à l'article 92 du Code Général des Impôts, ou intégrées aux revenus salariaux si le bénéficiaire est salarié de l'organisme. L'organisme peut être tenu de remettre une attestation annuelle si le total des vacations versées excède 1 200 €/an.
        </p>
      </div>
      <p style="font-size: 9pt; line-height: 1.6; margin: 0; color: #555;">
        Les frais de transport, de repas et d'hébergement remboursés sur justificatifs dans les limites réglementaires ne sont pas soumis à cotisations sociales (art. 4 de l'arrêté du 20 décembre 2002). En revanche, tout remboursement dépassant les plafonds URSSAF doit être soumis à cotisations.
      </p>

      <h2 style="font-size: 11pt; font-weight: bold; margin: 18px 0 8px 0; color: #1A1A1A; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
        Article 5 — Notes particulières
      </h2>
      <p style="font-size: 9.5pt; line-height: 1.6; margin: 0; min-height: 25px;">{defraiement_notes}</p>

      <div style="margin-top: 30px;">
        <p style="text-align: center; font-size: 9.5pt; margin-bottom: 20px; color: #555;">
          Fait en deux exemplaires, à {ecole_ville}, le {date_aujourd_hui}
        </p>
        <div style="display: flex; justify-content: space-between; margin-top: 10px;">
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; font-size: 9.5pt; margin-bottom: 4px;">Pour l'Organisme</p>
            <p style="font-size: 9pt; color: #444; margin-bottom: 50px;">{ecole_nom}<br/>{ecole_representant}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
              <p style="font-size: 8.5pt; color: #666;">Signature et cachet</p>
            </div>
          </div>
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; font-size: 9.5pt; margin-bottom: 4px;">Le Membre du Jury</p>
            <p style="font-size: 9pt; color: #444; margin-bottom: 50px;">{jury_prenom} {jury_nom}<br/>Lu et approuvé — Bon pour paiement</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
              <p style="font-size: 8.5pt; color: #666;">Signature</p>
            </div>
          </div>
        </div>
      </div>
    `,
    footerContent: premiumFooter,
  },

  // ==========================================
  // FORMULAIRE D'INSCRIPTION APPRENANT
  // ==========================================
  formulaire_inscription: {
    type: 'formulaire_inscription',
    name: 'Formulaire d\'inscription',
    headerContent: premiumHeader,
    bodyContent: `
      <!-- Titre -->
      <div style="text-align: center; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
        <h1 style="font-size: 14pt; font-weight: bold; margin: 0 0 4px 0; color: #1A1A1A; letter-spacing: 0.5px; text-transform: uppercase;">
          Formulaire d'inscription
        </h1>
        <p style="font-size: 8pt; color: #888; margin: 0; font-style: italic;">{formulaire_titre}</p>
        <div style="width: 60px; height: 2px; background: #1A1A1A; margin: 10px auto 0;"></div>
      </div>

      <!-- Métadonnées : candidat + session -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 16px; border: 0; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt;">
        <tr>
          <td style="width: 50%; vertical-align: top; border: 0; padding-right: 12px;">
            <p style="margin: 0 0 2px 0; font-weight: bold; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #888;">Candidat</p>
            <p style="margin: 0; font-size: 9pt; font-weight: bold; color: #1A1A1A;">{eleve_prenom} {eleve_nom}</p>
            <p style="margin: 1px 0 0 0; font-size: 8pt; color: #555;">{eleve_email}</p>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <p style="margin: 0 0 2px 0; font-weight: bold; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #888;">Session</p>
            <p style="margin: 0; font-size: 9pt; font-weight: bold; color: #1A1A1A;">{formation_nom}</p>
            <p style="margin: 1px 0 0 0; font-size: 8pt; color: #555;">Du {session_debut} au {session_fin}</p>
          </td>
        </tr>
      </table>

      <div style="border-top: 1px solid #E5E7EB; margin-bottom: 16px;"></div>

      <!-- Renseignements du candidat -->
      <div style="margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0 0 10px 0; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #888; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px;">
          Renseignements du candidat
        </p>
        <!-- Les champs du formulaire sont générés dynamiquement -->
        {formulaire_champs}
      </div>

      <!-- Documents fournis -->
      <div style="margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0 0 10px 0; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #888; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px;">
          Documents fournis
        </p>
        {formulaire_documents}
      </div>

      <!-- Zone de signatures -->
      <div style="margin-top: 28px; font-family: 'Times New Roman', Times, serif;">
        <p style="margin: 0 0 10px 0; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #888; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px;">
          Signatures
        </p>
        <p style="text-align: center; font-size: 8.5pt; margin: 0 0 20px 0; color: #555;">
          Fait à {ecole_ville}, le {date_soumission}
        </p>
        <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt;">
          <tr>
            <td style="width: 48%; vertical-align: top; border: 0; text-align: center;">
              <p style="font-weight: bold; margin: 0 0 4px 0;">Signature du candidat</p>
              <p style="color: #888; font-size: 8pt; font-style: italic; margin-bottom: 48px;">Lu et approuvé</p>
              <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
                <p style="font-size: 8pt; color: #888;">{eleve_prenom} {eleve_nom}</p>
              </div>
            </td>
            <td style="width: 4%; border: 0;"></td>
            <td style="width: 48%; vertical-align: top; border: 0; text-align: center;">
              <p style="font-weight: bold; margin: 0 0 4px 0;">Cachet et signature de l'organisme</p>
              <p style="color: #888; font-size: 8pt; font-style: italic; margin-bottom: 48px;">{ecole_nom}</p>
              <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 6px;">
                <p style="font-size: 8pt; color: #888;">{ecole_representant}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `,
    footerContent: premiumFooter,
  },
}

/**
 * Récupère le template par défaut pour un type de document.
 * Convention et contrat partagent le même design (contrat de formation professionnelle).
 */
export function getDefaultTemplateContent(type: DocumentType): DocumentTemplateDefault {
  // Alias pour compatibilité API/DB (quote -> devis, invoice -> facture)
  const normalizedType: keyof typeof documentTemplateDefaults =
    type === 'convention' ? 'convention'
    : (type as string) === 'quote' ? 'devis'
    : (type as string) === 'invoice' ? 'facture'
    : (type as keyof typeof documentTemplateDefaults)

  if (normalizedType === 'convention') {
    const contratDefault = documentTemplateDefaults['contrat']
    return {
      type: 'convention',
      name: 'Convention de formation',
      headerContent: contratDefault.headerContent,
      bodyContent: contratDefault.bodyContent,
      footerContent: contratDefault.footerContent,
    }
  }
  const entry = documentTemplateDefaults[normalizedType]
  if (!entry) return documentTemplateDefaults['devis'] // fallback sûr
  return entry
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
