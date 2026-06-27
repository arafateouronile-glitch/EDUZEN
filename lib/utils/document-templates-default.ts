/**
 * Templates de contenu par défaut pour les 13 types de documents
 * avec toutes les balises (variables) disponibles
 */

import type { DocumentType } from '@/lib/types/document-templates'

export const getDefaultDocumentContent = (type: DocumentType): string => {
  const templates: Record<DocumentType, string> = {
    convention: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        CONVENTION DE FORMATION PROFESSIONNELLE
      </h1>
      
      <p style="text-align: center; margin-bottom: 20px; font-size: 12px;">
        (Article L. 6353-1 du Code du Travail Décret N° 2018-1341 du 28 décembre 2018)
      </p>
      
      <div style="margin-bottom: 30px;">
        <p><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
        <p style="margin-left: 20px; margin-top: 10px;">
          <strong>L'Organisme de Formation :</strong><br/>
          {ecole_nom}<br/>
          N° SIRET : {ecole_numero_siret}<br/>
          {ecole_adresse}<br/>
          {ecole_ville}<br/>
          Téléphone : {ecole_telephone}<br/>
          Email : {ecole_email}
        </p>
        
        <p style="margin-left: 20px; margin-top: 20px;">
          <strong>Le Stagiaire :</strong><br/>
          {eleve_prenom} {eleve_nom}<br/>
          Né(e) le : {eleve_date_naissance}<br/>
          {eleve_adresse}<br/>
          Téléphone : {eleve_telephone}
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">OBJET</h2>
        <p>
          La présente convention a pour objet de définir les conditions dans lesquelles 
          <strong>{eleve_prenom} {eleve_nom}</strong> suivra la formation intitulée :
        </p>
        <p style="text-align: center; font-weight: bold; margin: 15px 0;">
          "{formation_nom}"
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">CONDITIONS DE FORMATION</h2>
        <p><strong>Session :</strong> {session_nom}</p>
        <p><strong>Dates :</strong> Du {session_debut} au {session_fin}</p>
        <p><strong>Durée :</strong> {formation_duree}</p>
        <p><strong>Lieu :</strong> {session_lieu}</p>
        <p><strong>Horaires :</strong> {session_horaires}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">CONDITIONS FINANCIÈRES</h2>
        <p><strong>Montant total de la formation :</strong> {formation_prix}</p>
        <p><strong>Montant en lettres :</strong> {montant_lettres}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ENGAGEMENTS</h2>
        <p>Le stagiaire s'engage à suivre assidûment la formation et à respecter le règlement intérieur.</p>
        <p>L'organisme de formation s'engage à dispenser la formation conformément au programme défini.</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: center; margin-bottom: 50px;">
          Fait à {ecole_ville}, le {date_jour}
        </p>
        <table style="width: 100%; margin-top: 50px;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p><strong>L'Organisme de Formation</strong></p>
              <p style="margin-top: 60px;">________________________</p>
              <p>{ecole_nom}</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p><strong>Le Stagiaire</strong></p>
              <p style="margin-top: 60px;">________________________</p>
              <p>{eleve_prenom} {eleve_nom}</p>
            </td>
          </tr>
        </table>
      </div>
    `,

    facture: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        FACTURE
      </h1>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div style="width: 45%;">
          <p><strong>{ecole_nom}</strong></p>
          <p>{ecole_adresse}</p>
          <p>{ecole_ville}</p>
          <p>Tél : {ecole_telephone}</p>
          <p>Email : {ecole_email}</p>
        </div>
        <div style="width: 45%;">
          <p><strong>Facture N° :</strong> {numero_facture}</p>
          <p><strong>Date d'émission :</strong> {date_emission}</p>
          <p><strong>Échéance :</strong> {date_echeance}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">FACTURATION À :</h2>
        <p>{eleve_prenom} {eleve_nom}</p>
        <p>{eleve_adresse}</p>
        <p>{eleve_ville}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6; border-bottom: 2px solid #000;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Désignation</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Quantité</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Prix unitaire</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">{formation_nom} - {session_nom}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">1</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{montant_ht}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">{montant_ht}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-left: auto; width: 300px; margin-bottom: 30px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px; text-align: right;"><strong>Total HT :</strong></td>
            <td style="padding: 5px; text-align: right;">{montant_ht}</td>
          </tr>
          <tr>
            <td style="padding: 5px; text-align: right;"><strong>TVA ({taux_tva}%) :</strong></td>
            <td style="padding: 5px; text-align: right;">{tva}</td>
          </tr>
          <tr style="font-size: 18px; font-weight: bold; border-top: 2px solid #000;">
            <td style="padding: 10px; text-align: right;"><strong>Total TTC :</strong></td>
            <td style="padding: 10px; text-align: right;">{montant_ttc}</td>
          </tr>
        </table>
      </div>
      
      <p style="text-align: center; margin-top: 40px; font-size: 12px;">
        <strong>Montant en lettres :</strong> {montant_lettres}
      </p>
      
      <div style="margin-top: 50px;">
        <p style="font-size: 12px;">
          <strong>Mode de paiement :</strong> {mode_paiement}<br/>
          <strong>Date de paiement :</strong> {date_paiement}
        </p>
      </div>
    `,

    devis: `
      <div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000;">
        
        <!-- Header -->
        <table style="width: 100%; margin-bottom: 30px;">
          <tr>
            <td style="width: 60%; vertical-align: top;">
              <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">{ecole_nom}</h2>
              <p style="margin: 5px 0 0 0;">{ecole_adresse}</p>
              <p style="margin: 0;">{ecole_code_postal} {ecole_ville}</p>
              <p style="margin: 5px 0 0 0;">Email : {ecole_email}</p>
              <p style="margin: 0;">Tel : {ecole_telephone}</p>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top;">
               <!-- Logo placeholder or variable -->
               <img src="{ecole_logo}" alt="Logo" style="max-height: 80px; max-width: 200px;" />
            </td>
          </tr>
        </table>

        <!-- Title & Date -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 20pt; font-weight: normal; margin: 0;">Devis de formation professionnelle</h1>
        </div>
        <div style="text-align: right; margin-bottom: 30px;">
          <strong>Date du devis : {date_emission}</strong>
        </div>

        <!-- Addresses - Destinataire avec balises explicites -->
        <div style="margin-bottom: 30px;">
          <p style="margin: 0 0 4px 0;"><strong>Destinataire</strong></p>
          <p style="margin: 0 0 2px 0;">Nom de l'entreprise : {entreprise_nom}</p>
          <p style="margin: 0 0 2px 0;">Nom de l'apprenant : {eleve_nom}</p>
          <p style="margin: 0 0 2px 0;">Prénom de l'apprenant : {eleve_prenom}</p>
          <p style="margin: 0 0 2px 0;">Adresse : {eleve_adresse}</p>
          <p style="margin: 0 0 2px 0;">Code postal : {eleve_code_postal}</p>
          <p style="margin: 0 0 2px 0;">Ville : {eleve_ville}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <p style="margin: 0 0 5px 0;"><strong>Organisateur de la formation : {ecole_nom}</strong></p>
          <p style="margin: 0;">Situé : {ecole_adresse} {ecole_code_postal} {ecole_ville}</p>
          <p style="margin: 0;">Déclaration d'activité n° {ecole_numero_declaration}</p>
          <p style="margin: 0;">Numéro SIRET : {ecole_siret}</p>
          <p style="margin: 0;">Représenté par : {ecole_representant}</p>
        </div>

        <!-- 1. Objet, nature et durée -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">1. Objet, nature et durée de la formation</h3>
          <ul style="list-style-type: disc; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 5px;"><strong>Intitulé de la formation :</strong> {formation_nom}</li>
            <li style="margin-bottom: 5px;"><strong>Type d'action de formation (au sens de l'article L6313-1 du Code du Travail) :</strong> Action de formation</li>
            <li style="margin-bottom: 5px;"><strong>Durée :</strong> {formation_duree}</li>
            <li style="margin-bottom: 5px;"><strong>Dates de la formation :</strong> du {session_debut} au {session_fin}</li>
            <li style="margin-bottom: 5px;"><strong>Lieu de la formation :</strong> {session_lieu}</li>
            <li style="margin-bottom: 5px;"><strong>Effectifs formés du bénéficiaire :</strong> {session_effectif}</li>
          </ul>
        </div>

        <!-- 2. Programme -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">2. Programme de la formation et formateur</h3>
          <p style="margin: 0;">La description détaillée du programme de formation et du formateur est fournie en annexe.</p>
        </div>

        <!-- 3. Prix -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">3. Prix de la formation</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="font-weight: bold;">
                <th style="border: 1px solid #000; padding: 5px; text-align: left; width: 50%;">Désignation</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; width: 15%;">Quantité</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: right; width: 15%;">Prix unitaire HT</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: right; width: 20%;">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {FOR:modules}
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Formation<br/>{module_nom}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">{module_quantite}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">{module_prix_ht} €</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">{module_total_ht} €</td>
              </tr>
              {ENDFOR}
              <tr>
                <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">Total HT</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">{montant_ht}</td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: left;">Prestations de formation en exonération de TVA, article 261-4-4a du CGI</td>
                <td style="border: 1px solid #000; padding: 5px;"></td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">Total TTC</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">{montant_ttc}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 4. Validité -->
        <div style="margin-bottom: 40px;">
          <h3 style="font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">4. Durée de validité du devis</h3>
          <p style="margin: 0;">Ce devis sera valable pour une durée de 30 jours.</p>
        </div>

        <!-- Signatures -->
        <table style="width: 100%; margin-top: 30px; page-break-inside: avoid;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <p style="margin-bottom: 10px;"><strong>Pour l'organisme de formation,</strong></p>
              <p style="margin-bottom: 0;"><strong>{ecole_nom},</strong></p>
              <p>{ecole_representant}</p>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px;">
              <p style="margin-bottom: 10px;"><strong>Pour le bénéficiaire, bon pour accord</strong></p>
              <p>{eleve_nom} {eleve_prenom}</p>
            </td>
          </tr>
        </table>

        <!-- Footer (custom content if not using default footer) -->
        <div style="margin-top: 50px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          <p style="margin: 0 0 5px 0;">{ecole_nom} | {ecole_adresse} {ecole_code_postal} {ecole_ville} | Numéro SIRET : {ecole_siret} | N° TVA : {tva}</p>
          <p style="margin: 0 0 5px 0;">Numéro de déclaration d'activité : {ecole_numero_declaration}</p>
          <p style="margin: 0; font-style: italic;">Cet enregistrement ne vaut pas l'agrément de l'État.</p>
        </div>
      </div>
    `,

    convocation: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        CONVOCATION
      </h1>
      
      <div style="margin-bottom: 40px;">
        <p><strong>À l'attention de :</strong> {eleve_prenom} {eleve_nom}</p>
        <p>Numéro d'inscription : {eleve_numero}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p style="text-align: justify;">
          Nous avons le plaisir de vous informer que vous êtes convoqué(e) pour :
        </p>
        <p style="text-align: center; font-weight: bold; font-size: 18px; margin: 20px 0;">
          {session_nom}
        </p>
      </div>
      
      <div style="margin-bottom: 30px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
        <p><strong>📅 Date :</strong> {session_debut}</p>
        <p><strong>⏰ Horaire :</strong> {session_horaires}</p>
        <p><strong>📍 Lieu :</strong> {session_lieu}</p>
        <p><strong>📚 Formation :</strong> {formation_nom}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p><strong>OBJET :</strong></p>
        <p style="margin-left: 20px;">
          {convocation_objet}
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p><strong>DOCUMENTS À PRÉSENTER :</strong></p>
        <ul style="margin-left: 20px;">
          <li>Pièce d'identité en cours de validité</li>
          <li>Carte d'inscription</li>
          <li>Matériel de prise de notes</li>
        </ul>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: center;">
          En cas d'empêchement, merci de nous contacter au plus tard 48h avant la date prévue.
        </p>
        <p style="text-align: center; margin-top: 30px;">
          {ecole_ville}, le {date_jour}
        </p>
      </div>
      
      <div style="margin-top: 50px; text-align: center;">
        <p><strong>Direction</strong></p>
        <p>{ecole_nom}</p>
      </div>
    `,

    contrat: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        CONTRAT DE SCOLARITÉ
      </h1>
      
      <p style="text-align: center; margin-bottom: 30px; font-size: 12px;">
        Année scolaire {annee_scolaire}
      </p>
      
      <div style="margin-bottom: 30px;">
        <p><strong>ENTRE :</strong></p>
        <p style="margin-left: 20px; margin-top: 10px;">
          <strong>L'Établissement :</strong> {ecole_nom}<br/>
          {ecole_adresse}<br/>
          {ecole_ville}<br/>
          Représenté par : {ecole_directeur}
        </p>
        
        <p style="margin-left: 20px; margin-top: 20px;">
          <strong>L'Élève :</strong><br/>
          {eleve_prenom} {eleve_nom}<br/>
          Né(e) le : {eleve_date_naissance}<br/>
          Numéro d'inscription : {eleve_numero}<br/>
          Classe : {eleve_classe}
        </p>
        
        <p style="margin-left: 20px; margin-top: 20px;">
          <strong>Le(s) Responsable(s) légal(aux) :</strong><br/>
          {tuteur_nom}<br/>
          {tuteur_adresse}<br/>
          Téléphone : {tuteur_telephone}
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 1 - OBJET</h2>
        <p>
          Le présent contrat définit les conditions d'inscription et de scolarité de 
          <strong>{eleve_prenom} {eleve_nom}</strong> dans la classe de <strong>{eleve_classe}</strong> 
          pour l'année scolaire <strong>{annee_scolaire}</strong>.
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 2 - DROITS DE SCOLARITÉ</h2>
        <p><strong>Montant annuel :</strong> {montant_ttc}</p>
        <p><strong>Mode de paiement :</strong> {mode_paiement}</p>
        <p><strong>Échéances :</strong> {echeances_paiement}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 3 - ENGAGEMENTS</h2>
        <p>L'élève s'engage à respecter le règlement intérieur et à assister régulièrement aux cours.</p>
        <p>L'établissement s'engage à dispenser un enseignement de qualité conforme aux programmes officiels.</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: center; margin-bottom: 50px;">
          Fait à {ecole_ville}, le {date_jour}
        </p>
        <table style="width: 100%; margin-top: 50px;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p><strong>L'Établissement</strong></p>
              <p style="margin-top: 60px;">________________________</p>
              <p>{ecole_directeur}</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p><strong>Le(s) Responsable(s)</strong></p>
              <p style="margin-top: 60px;">________________________</p>
              <p>{tuteur_nom}</p>
            </td>
          </tr>
        </table>
      </div>
    `,

    attestation_reussite: `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
          ATTESTATION DE RÉUSSITE
        </h1>
        <p style="font-size: 16px; color: #666;">CERTIFICAT DE FORMATION</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 50px;">
        <p style="font-size: 18px; margin-bottom: 30px;">
          L'établissement <strong>{ecole_nom}</strong>
        </p>
        <p style="font-size: 18px; margin-bottom: 30px;">
          Atteste que
        </p>
        <p style="font-size: 24px; font-weight: bold; color: #335ACF; margin: 30px 0;">
          {eleve_prenom} {eleve_nom}
        </p>
        <p style="font-size: 18px; margin-bottom: 30px;">
          Numéro d'inscription : <strong>{eleve_numero}</strong>
        </p>
        <p style="font-size: 18px; margin-bottom: 30px;">
          Né(e) le : <strong>{eleve_date_naissance}</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin: 50px 0; padding: 30px; background-color: #f9fafb; border-radius: 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          a suivi avec succès la formation
        </p>
        <p style="font-size: 20px; font-weight: bold; margin: 20px 0;">
          "{formation_nom}"
        </p>
        <p style="font-size: 16px; margin-top: 20px;">
          Session : {session_nom}<br/>
          Du {session_debut} au {session_fin}<br/>
          Durée : {formation_duree}
        </p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>Résultats obtenus :</strong>
        </p>
        <p style="margin-left: 20px;">
          Moyenne générale : <strong>{moyenne}</strong> / 20<br/>
          Mention : <strong>{mention}</strong>
        </p>
      </div>
      
      <div style="margin-top: 50px; text-align: center;">
        <p style="margin-bottom: 50px;">
          {ecole_ville}, le {date_jour}
        </p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 60px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,

    certificat_scolarite: `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
          CERTIFICAT DE SCOLARITÉ
        </h1>
        <p style="font-size: 14px;">Année scolaire {annee_scolaire}</p>
      </div>
      
      <div style="margin-bottom: 40px;">
        <p style="text-align: justify; font-size: 16px; line-height: 1.8;">
          Le Directeur de l'établissement <strong>{ecole_nom}</strong>, situé au 
          <strong>{ecole_adresse} - {ecole_ville}</strong>,
        </p>
        <p style="text-align: justify; font-size: 16px; line-height: 1.8; margin-top: 20px;">
          Certifie que <strong>{eleve_prenom} {eleve_nom}</strong>, né(e) le 
          <strong>{eleve_date_naissance}</strong>, est régulièrement inscrit(e) dans cet établissement 
          pour l'année scolaire <strong>{annee_scolaire}</strong>.
        </p>
      </div>
      
      <div style="margin: 40px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #335ACF;">
        <p style="margin-bottom: 10px;"><strong>Classe :</strong> {eleve_classe}</p>
        <p style="margin-bottom: 10px;"><strong>Numéro d'inscription :</strong> {eleve_numero}</p>
        <p><strong>Statut :</strong> {eleve_statut}</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: justify; font-size: 14px;">
          Le présent certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.
        </p>
      </div>
      
      <div style="margin-top: 60px; text-align: center;">
        <p style="margin-bottom: 50px;">
          {ecole_ville}, le {date_jour}
        </p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 60px;">________________________</p>
        <p>{ecole_directeur}</p>
        <p style="margin-top: 10px; font-size: 12px;">
          {ecole_nom}<br/>
          {ecole_adresse}<br/>
          {ecole_ville}
        </p>
      </div>
    `,

    releve_notes: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        RELEVÉ DE NOTES
      </h1>
      
      <div style="margin-bottom: 30px;">
        <p><strong>Établissement :</strong> {ecole_nom}</p>
        <p><strong>Année scolaire :</strong> {annee_scolaire}</p>
        <p><strong>Période :</strong> {trimestre}</p>
      </div>
      
      <div style="margin-bottom: 30px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
        <p><strong>Nom :</strong> {eleve_nom}</p>
        <p><strong>Prénom :</strong> {eleve_prenom}</p>
        <p><strong>Numéro :</strong> {eleve_numero}</p>
        <p><strong>Classe :</strong> {eleve_classe}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #335ACF; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Matière</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Note</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Coeff.</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Moyenne × Coeff.</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Matière 1</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">{note_matiere1}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">{coeff_matiere1}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">{moyenne_ponderee1}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">{appreciation_matiere1}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 30px; padding: 15px; background-color: #e0e7ff; border-radius: 8px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px;"><strong>Moyenne générale :</strong></td>
            <td style="padding: 5px; text-align: right; font-size: 18px; font-weight: bold;">{moyenne} / 20</td>
          </tr>
          <tr>
            <td style="padding: 5px;"><strong>Moyenne de la classe :</strong></td>
            <td style="padding: 5px; text-align: right;">{moyenne_classe} / 20</td>
          </tr>
          <tr>
            <td style="padding: 5px;"><strong>Classement :</strong></td>
            <td style="padding: 5px; text-align: right;">{classement} / {effectif_classe}</td>
          </tr>
          <tr>
            <td style="padding: 5px;"><strong>Mention :</strong></td>
            <td style="padding: 5px; text-align: right; font-weight: bold;">{mention}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 40px;">
        <p><strong>Appréciations générales :</strong></p>
        <p style="margin-left: 20px; padding: 15px; background-color: #f9fafb; border-left: 4px solid #335ACF;">
          {appreciations}
        </p>
      </div>
      
      <div style="margin-top: 50px; text-align: center;">
        <p>{ecole_ville}, le {date_jour}</p>
        <p style="margin-top: 50px;"><strong>Le Directeur des Études</strong></p>
        <p style="margin-top: 40px;">________________________</p>
      </div>
    `,

    attestation_entree: `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
          ATTESTATION D'ENTRÉE EN FORMATION
        </h1>
      </div>
      
      <div style="margin-bottom: 40px;">
        <p style="text-align: justify; font-size: 16px; line-height: 1.8;">
          L'établissement <strong>{ecole_nom}</strong>, situé au 
          <strong>{ecole_adresse} - {ecole_ville}</strong>,
        </p>
        <p style="text-align: justify; font-size: 16px; line-height: 1.8; margin-top: 20px;">
          Atteste que <strong>{eleve_prenom} {eleve_nom}</strong>, né(e) le 
          <strong>{eleve_date_naissance}</strong>, numéro d'inscription <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: center; font-size: 18px; font-weight: bold; margin: 30px 0;">
          a été admis(e) et inscrit(e) à la formation
        </p>
        <p style="text-align: center; font-size: 20px; font-weight: bold; color: #335ACF; margin: 20px 0;">
          "{formation_nom}"
        </p>
      </div>
      
      <div style="margin: 40px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #335ACF;">
        <p style="margin-bottom: 10px;"><strong>Session :</strong> {session_nom}</p>
        <p style="margin-bottom: 10px;"><strong>Date de début :</strong> {session_debut}</p>
        <p style="margin-bottom: 10px;"><strong>Date de fin prévue :</strong> {session_fin}</p>
        <p style="margin-bottom: 10px;"><strong>Durée :</strong> {formation_duree}</p>
        <p><strong>Lieu de formation :</strong> {session_lieu}</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: justify; font-size: 14px;">
          Le présent certificat est délivré pour servir et valoir ce que de droit.
        </p>
      </div>
      
      <div style="margin-top: 60px; text-align: center;">
        <p style="margin-bottom: 50px;">
          {ecole_ville}, le {date_jour}
        </p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 60px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,

    reglement_interieur: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
        RÈGLEMENT INTÉRIEUR
      </h1>
      <p style="text-align: center; margin-bottom: 40px; font-size: 14px;">
        {ecole_nom}<br/>
        Année scolaire {annee_scolaire}
      </p>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">PRÉAMBULE</h2>
        <p style="text-align: justify; line-height: 1.8;">
          Le présent règlement intérieur définit les règles de vie et de fonctionnement de l'établissement 
          <strong>{ecole_nom}</strong>. Il s'applique à tous les élèves, enseignants et personnels.
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 1 - PRÉSENTATION DE L'ÉTABLISSEMENT</h2>
        <p><strong>Nom :</strong> {ecole_nom}</p>
        <p><strong>Adresse :</strong> {ecole_adresse}</p>
        <p><strong>Ville :</strong> {ecole_ville}</p>
        <p><strong>Téléphone :</strong> {ecole_telephone}</p>
        <p><strong>Email :</strong> {ecole_email}</p>
        <p><strong>Directeur :</strong> {ecole_directeur}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 2 - HORAIRES ET PRÉSENCE</h2>
        <p><strong>Horaires de cours :</strong></p>
        <ul style="margin-left: 20px;">
          <li>Matin : {horaires_matin}</li>
          <li>Après-midi : {horaires_apres_midi}</li>
        </ul>
        <p style="margin-top: 15px;">Les élèves doivent être présents 5 minutes avant le début des cours.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 3 - ASSIDUITÉ ET PONCTUALITÉ</h2>
        <p>La présence à tous les cours est obligatoire. Toute absence doit être justifiée par écrit.</p>
        <p>Les retards répétés peuvent entraîner des sanctions disciplinaires.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 4 - COMPORTEMENT ET DISCIPLINE</h2>
        <p>Le respect des personnes, du matériel et des locaux est exigé de tous.</p>
        <p>Tout comportement contraire à ces règles peut entraîner des sanctions.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 5 - ÉVALUATION ET NOTES</h2>
        <p>Les évaluations se déroulent conformément au calendrier scolaire.</p>
        <p>Les notes et appréciations sont communiquées régulièrement aux familles.</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: center; margin-bottom: 30px;">
          {ecole_ville}, le {date_jour}
        </p>
        <p style="text-align: center;"><strong>La Direction</strong></p>
        <p style="text-align: center; margin-top: 40px;">________________________</p>
        <p style="text-align: center;">{ecole_directeur}</p>
      </div>
    `,

    cgv: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        CONDITIONS GÉNÉRALES DE VENTE
      </h1>
      
      <div style="margin-bottom: 30px;">
        <p><strong>Éditeur :</strong> {ecole_nom}</p>
        <p><strong>Adresse :</strong> {ecole_adresse}, {ecole_ville}</p>
        <p><strong>Email :</strong> {ecole_email}</p>
        <p><strong>Téléphone :</strong> {ecole_telephone}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 1 - OBJET</h2>
        <p style="text-align: justify;">
          Les présentes Conditions Générales de Vente régissent les relations contractuelles entre 
          <strong>{ecole_nom}</strong> et ses clients concernant la vente de prestations de formation.
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 2 - COMMANDES</h2>
        <p>Toute commande implique l'acceptation sans réserve des présentes CGV.</p>
        <p>L'inscription est définitive après validation et paiement de l'acompte éventuel.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 3 - PRIX</h2>
        <p>Les prix sont indiqués en TTC et peuvent être modifiés à tout moment sans préavis.</p>
        <p>Le prix applicable est celui en vigueur au jour de la commande.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 4 - PAIEMENT</h2>
        <p>Le paiement peut s'effectuer par virement bancaire, chèque ou espèces.</p>
        <p>En cas de retard de paiement, des pénalités de retard seront appliquées.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ARTICLE 5 - DROIT DE RÉTRACTATION</h2>
        <p>Le client dispose d'un délai de 14 jours calendaires pour exercer son droit de rétractation.</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: center;">
          Les présentes CGV sont applicables à compter du {date_jour}
        </p>
      </div>
    `,

    programme: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        PROGRAMME DE FORMATION
      </h1>
      
      <div style="margin-bottom: 40px; text-align: center;">
        <h2 style="font-size: 20px; font-weight: bold; color: #335ACF; margin-bottom: 10px;">
          {formation_nom}
        </h2>
        <p><strong>Code :</strong> {formation_code}</p>
        <p><strong>Durée :</strong> {formation_duree}</p>
        <p><strong>Session :</strong> {session_nom}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">OBJECTIFS DE LA FORMATION</h2>
        <p style="text-align: justify; line-height: 1.8;">
          {formation_objectifs}
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">PUBLIC VISÉ</h2>
        <p>{formation_public}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">CONTENU PÉDAGOGIQUE</h2>
        <p><strong>Module 1 :</strong> {module1_titre}</p>
        <p style="margin-left: 20px; margin-bottom: 10px;">{module1_contenu}</p>
        <p><strong>Durée :</strong> {module1_duree}</p>
        
        <p style="margin-top: 20px;"><strong>Module 2 :</strong> {module2_titre}</p>
        <p style="margin-left: 20px; margin-bottom: 10px;">{module2_contenu}</p>
        <p><strong>Durée :</strong> {module2_duree}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">MÉTHODES PÉDAGOGIQUES</h2>
        <ul style="margin-left: 20px;">
          <li>Cours théoriques</li>
          <li>Travaux pratiques</li>
          <li>Études de cas</li>
          <li>Évaluations continues</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">ÉVALUATION</h2>
        <p>L'évaluation se fait par contrôle continu et examen final.</p>
        <p>La moyenne minimale pour la validation est de 10/20.</p>
      </div>
      
      <div style="margin-top: 50px;">
        <p style="text-align: center;">
          Programme valable pour la session {session_nom}<br/>
          Année {annee_scolaire}
        </p>
      </div>
    `,

    certificat_realisation: `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
          CERTIFICAT DE RÉALISATION
        </h1>
      </div>
      
      <div style="margin-bottom: 40px;">
        <p style="text-align: justify; font-size: 16px; line-height: 1.8;">
          L'établissement <strong>{ecole_nom}</strong> certifie que 
          <strong>{eleve_prenom} {eleve_nom}</strong> a réalisé avec succès la formation 
          <strong>"{formation_nom}"</strong>.
        </p>
      </div>
      
      <div style="margin-top: 60px; text-align: center;">
        <p style="margin-bottom: 50px;">{ecole_ville}, le {date_jour}</p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 60px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,
    attestation: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        ATTESTATION DE FORMATION
      </h1>
      
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
        <p style="margin-top: 60px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,
    livret_accueil: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        LIVRET D'ACCUEIL
      </h1>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">BIENVENUE</h2>
        <p>Bienvenue à <strong>{ecole_nom}</strong>.</p>
        <p>Ce livret vous présente les informations essentielles de notre établissement.</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">PRÉSENTATION</h2>
        <p><strong>Établissement :</strong> {ecole_nom}</p>
        <p><strong>Adresse :</strong> {ecole_adresse}, {ecole_ville}</p>
        <p><strong>Contact :</strong> {ecole_telephone} | {ecole_email}</p>
      </div>
    `,
    emargement: `
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
        FEUILLE D'ÉMARGEMENT
      </h1>
      
      <div style="margin-bottom: 30px;">
        <p><strong>Formation :</strong> {formation_nom}</p>
        <p><strong>Session :</strong> {session_nom}</p>
        <p><strong>Date :</strong> {session_debut}</p>
        <p><strong>Lieu :</strong> {session_lieu}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Nom et Prénom</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Signature</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">{eleve_prenom} {eleve_nom}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">________________</td>
          </tr>
        </tbody>
      </table>
    `,
    attestation_assiduite: `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
          ATTESTATION D'ASSIDUITÉ
        </h1>
      </div>

      <div style="margin-bottom: 40px;">
        <p style="text-align: justify; font-size: 16px; line-height: 1.8;">
          Le Directeur de l'établissement <strong>{ecole_nom}</strong>, situé au
          <strong>{ecole_adresse} - {ecole_ville}</strong>,
        </p>
        <p style="text-align: justify; font-size: 16px; line-height: 1.8; margin-top: 20px;">
          Atteste que <strong>{eleve_prenom} {eleve_nom}</strong>, né(e) le
          <strong>{eleve_date_naissance}</strong>, numéro d'inscription <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: center; font-size: 18px; font-weight: bold; margin: 30px 0;">
          a suivi la formation
        </p>
        <p style="text-align: center; font-size: 20px; font-weight: bold; color: #335ACF; margin: 20px 0;">
          "{formation_nom}"
        </p>
        <p style="text-align: center; font-size: 16px; margin-top: 20px;">
          avec une assiduité conforme aux exigences réglementaires.
        </p>
      </div>

      <div style="margin: 40px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #335ACF;">
        <p style="margin-bottom: 10px;"><strong>Session :</strong> {session_nom}</p>
        <p style="margin-bottom: 10px;"><strong>Période :</strong> Du {session_debut} au {session_fin}</p>
        <p style="margin-bottom: 10px;"><strong>Durée totale :</strong> {formation_duree}</p>
        <p style="margin-bottom: 10px;"><strong>Heures effectuées :</strong> {heures_effectuees} heures</p>
        <p><strong>Taux de présence :</strong> {taux_presence}%</p>
      </div>

      <div style="margin-top: 50px;">
        <p style="text-align: justify; font-size: 14px;">
          Le présent document est délivré pour servir et valoir ce que de droit.
        </p>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <p style="margin-bottom: 50px;">
          {ecole_ville}, le {date_jour}
        </p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 60px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,
    convention_formateur: `
      <h1 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 10px;">
        CONVENTION DE PRESTATION DE SERVICES
      </h1>
      <h2 style="text-align: center; font-size: 16px; font-weight: normal; margin-bottom: 30px;">
        Animation de Formation Professionnelle
      </h2>
      <p style="text-align: center; font-size: 12px; color: #666; margin-bottom: 30px;">
        (Articles L.6353-1 et suivants du Code du Travail)
      </p>

      <div style="margin-bottom: 30px;">
        <p><strong>ENTRE :</strong></p>
        <p style="margin-left: 20px; margin-top: 10px;">
          <strong>L'Organisme de Formation :</strong> {ecole_nom}<br/>
          SIRET : {ecole_siret}<br/>
          Déclaration d'activité N° {ecole_numero_declaration}<br/>
          {ecole_adresse}, {ecole_code_postal} {ecole_ville}<br/>
          Représenté(e) par : {ecole_representant}
        </p>
        <p style="margin-left: 20px; margin-top: 20px;">
          <strong>Et le Formateur :</strong><br/>
          {formateur_prenom} {formateur_nom}<br/>
          SIRET : {formateur_siret}<br/>
          Statut : {formateur_statut}<br/>
          {formateur_adresse}, {formateur_code_postal} {formateur_ville}<br/>
          Email : {formateur_email} — Tél : {formateur_telephone}
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Article 1 — Objet</h2>
        <p>Prestation d'animation de formation : <strong>{formateur_specialite}</strong></p>
        <p>Du {convention_date_debut} au {convention_date_fin} — {convention_heures_total} heures — {convention_lieu_formation}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Article 2 — Honoraires</h2>
        <p>Tarif : {convention_tarif_horaire} €/h × {convention_heures_total} h = <strong>{convention_montant_total} € HT</strong></p>
        <p>Modalités : {convention_modalites_paiement}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Article 3 — Obligations</h2>
        <p>Le Formateur s'engage à réaliser les prestations avec professionnalisme, à fournir les supports pédagogiques, émarger les feuilles de présence et respecter la confidentialité. Il atteste de son indépendance et fournira une attestation de vigilance URSSAF sur demande.</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Article 4 — Clauses particulières</h2>
        <p>{convention_notes}</p>
      </div>

      <div style="margin-top: 50px; text-align: center;">
        <p style="margin-bottom: 50px;">Fait à {ecole_ville}, le {date_jour}</p>
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p><strong>Pour l'Organisme de Formation</strong></p>
              <p>{ecole_nom} — {ecole_representant}</p>
              <p style="margin-top: 60px;">________________________</p>
              <p>Signature et cachet</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p><strong>Le Formateur</strong></p>
              <p>{formateur_prenom} {formateur_nom}</p>
              <p style="margin-top: 60px;">________________________</p>
              <p>Lu et approuvé</p>
            </td>
          </tr>
        </table>
      </div>
    `,
    ordre_de_mission: `
      <h1 style="text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 6px;">
        ORDRE DE MISSION
      </h1>
      <p style="text-align: center; font-size: 13px; color: #666; margin-bottom: 4px;">Formation Professionnelle Continue</p>
      <p style="text-align: center; font-size: 11px; color: #888; margin-bottom: 30px; font-style: italic;">
        (Arrêté du 20 décembre 2002 — Barèmes URSSAF en vigueur)
      </p>

      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-bottom: 20px;">
        <span>Réf. : {mission_reference}</span>
        <span>NDA : {ecole_numero_declaration}</span>
        <span>Date : {date_aujourd_hui}</span>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 25px;">
        <div style="flex: 1; border: 1px solid #ddd; padding: 12px;">
          <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 6px;">Mandant</p>
          <p style="font-weight: bold;">{ecole_nom}</p>
          <p style="font-size: 12px;">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</p>
          <p style="font-size: 12px;">SIRET : {ecole_siret}</p>
          <p style="font-size: 12px;">Représenté par : {mission_autorisant_nom}, {mission_autorisant_qualite}</p>
        </div>
        <div style="flex: 1; border: 1px solid #ddd; padding: 12px;">
          <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 6px;">Missionnaire</p>
          <p style="font-weight: bold;">{formateur_prenom} {formateur_nom}</p>
          <p style="font-size: 12px;">{formateur_statut}</p>
          <p style="font-size: 12px;">{formateur_adresse}, {formateur_code_postal} {formateur_ville}</p>
          <p style="font-size: 12px;">{formateur_email} — {formateur_telephone}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 10px;">Article 1 — Objet de la mission</h2>
        <p style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">{mission_objet}</p>
        <p style="font-size: 12px;">Formation : {mission_formation}</p>
        <p style="font-size: 12px;">Réf. session : {mission_session_ref}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 10px;">Article 2 — Lieu, dates et durée</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f5f5f5; width: 35%; font-weight: bold;">Lieu d'intervention</td>
            <td style="padding: 6px 10px; border: 1px solid #ddd;">{mission_lieu} — {mission_lieu_adresse}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Période</td>
            <td style="padding: 6px 10px; border: 1px solid #ddd;">Du {mission_date_debut} au {mission_date_fin}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Horaires</td>
            <td style="padding: 6px 10px; border: 1px solid #ddd;">{mission_horaires}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Durée</td>
            <td style="padding: 6px 10px; border: 1px solid #ddd;">{mission_duree_jours} jour(s) — {mission_duree_heures} heure(s)</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Transport autorisé</td>
            <td style="padding: 6px 10px; border: 1px solid #ddd;">{mission_transport_autorise}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 10px;">Article 3 — Remboursement des frais</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #333; color: white;">
            <th style="padding: 6px 10px; text-align: left;">Nature</th>
            <th style="padding: 6px 10px; text-align: center;">Base</th>
            <th style="padding: 6px 10px; text-align: right;">Plafond</th>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">Indemnités km (barème fiscal)</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: center;">{mission_distance_aller} km A/R</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{mission_indemnite_km} €/km</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">Repas midi (plafond URSSAF)</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: center;">Sur justificatif</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{mission_frais_repas_midi} €</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">Repas soir (grand déplacement)</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: center;">Sur justificatif</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{mission_frais_repas_soir} €</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 6px 10px;">Hébergement (nuit complète)</td>
            <td style="padding: 6px 10px; text-align: center;">Sur justificatif</td>
            <td style="padding: 6px 10px; text-align: right; font-weight: bold;">{mission_frais_hebergement} €/nuit</td>
          </tr>
        </table>
        <p style="font-size: 11px; color: #666; margin-top: 6px; font-style: italic;">Grand déplacement : > 50 km du domicile, sans possibilité de retour quotidien (circ. DSS/SDFSS/5B du 7 janv. 2003). Justificatifs à remettre sous 30 jours.</p>
        <p style="font-size: 12px; margin-top: 8px;">Avance sur frais accordée : <strong>{mission_avance} €</strong></p>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 10px;">Article 4 — Notes particulières</h2>
        <p style="font-size: 13px;">{mission_notes}</p>
      </div>

      <div style="margin-top: 50px; text-align: center;">
        <p style="margin-bottom: 40px;">Fait à {ecole_ville}, le {date_aujourd_hui}</p>
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p><strong>Pour l'Organisme de Formation</strong></p>
              <p style="font-size: 12px;">{ecole_nom} — {mission_autorisant_nom}</p>
              <p style="margin-top: 60px;">________________________</p>
              <p style="font-size: 12px;">Signature et cachet</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p><strong>Le Formateur missionnaire</strong></p>
              <p style="font-size: 12px;">{formateur_prenom} {formateur_nom}</p>
              <p style="margin-top: 60px;">________________________</p>
              <p style="font-size: 12px;">Lu et approuvé — Bon pour accord</p>
            </td>
          </tr>
        </table>
      </div>
    `,
    attestation_defraiement: `
      <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 6px;">
        ATTESTATION DE DÉFRAIEMENT
      </h1>
      <p style="text-align: center; font-size: 13px; color: #555; margin-bottom: 4px;">Membre de Jury — Certification Professionnelle</p>
      <p style="text-align: center; font-size: 11px; color: #888; font-style: italic; margin-bottom: 25px;">
        (Art. R.6113-10 à R.6113-13 C. trav. — Décret n° 2019-958 du 13/09/2019 — Arrêté du 20/12/2002)
      </p>

      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-bottom: 16px;">
        <span>Réf. défraiement : {defraiement_reference}</span>
        <span>Examen réf. : {examen_reference}</span>
        <span>Date : {date_aujourd_hui}</span>
      </div>

      <div style="display: flex; gap: 14px; margin-bottom: 20px;">
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px;">
          <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 6px;">Organisme</p>
          <p style="font-weight: bold;">{ecole_nom}</p>
          <p style="font-size: 12px;">SIRET : {ecole_siret}</p>
          <p style="font-size: 12px;">NDA : {ecole_numero_declaration}</p>
          <p style="font-size: 12px;">{ecole_adresse}, {ecole_code_postal} {ecole_ville}</p>
          <p style="font-size: 12px;">Représenté par : {ecole_representant}</p>
        </div>
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px;">
          <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 6px;">Membre du jury</p>
          <p style="font-weight: bold;">{jury_prenom} {jury_nom}</p>
          <p style="font-size: 12px;">Qualité : {jury_qualite}</p>
          <p style="font-size: 12px;">{jury_adresse}, {jury_code_postal} {jury_ville}</p>
          <p style="font-size: 12px;">{jury_email}</p>
        </div>
      </div>

      <div style="margin-bottom: 18px;">
        <h2 style="font-size: 13px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 8px;">Article 1 — Mission de jury</h2>
        <p style="font-weight: bold; font-size: 13px; margin-bottom: 3px;">{examen_nom}</p>
        <p style="font-size: 12px;">Type : {examen_type}</p>
        <p style="font-size: 12px;">Session : {session_nom}</p>
        <p style="font-size: 12px;">Date(s) : {examen_date}</p>
        <p style="font-size: 12px;">Lieu : {examen_lieu}</p>
      </div>

      <div style="margin-bottom: 18px;">
        <h2 style="font-size: 13px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 8px;">Article 2 — Détail du défraiement</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #333; color: white;">
            <th style="padding: 6px 8px; text-align: left;">Nature</th>
            <th style="padding: 6px 8px; text-align: center;">Base de calcul</th>
            <th style="padding: 6px 8px; text-align: right;">Montant</th>
          </tr>
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Vacations de jury</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">{defraiement_nb_heures} h × {defraiement_taux_vacation} €/h</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{defraiement_vacations} €</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">Frais de transport</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">{defraiement_distance_km} km A/R × {defraiement_taux_km} €/km</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{defraiement_transport} €</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">Indemnités repas</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">Sur justificatif — plafond URSSAF</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{defraiement_repas} €</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 6px 8px; border-bottom: 2px solid #333;">Frais d'hébergement</td>
            <td style="padding: 6px 8px; border-bottom: 2px solid #333; text-align: center;">Sur justificatif — plafond URSSAF</td>
            <td style="padding: 6px 8px; border-bottom: 2px solid #333; text-align: right; font-weight: bold;">{defraiement_hebergement} €</td>
          </tr>
          <tr style="background: #333; color: white;">
            <td colspan="2" style="padding: 7px 8px; font-weight: bold;">TOTAL À VERSER</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: bold; font-size: 13px;">{defraiement_total} €</td>
          </tr>
        </table>
        <p style="font-size: 10px; color: #666; font-style: italic; margin-top: 5px;">
          Grand déplacement (> 50 km, sans retour quotidien) : plafonds repas 20,90 €/repas, hébergement 70 €/nuit (82,30 € en Île-de-France) — circ. DSS/SDFSS/5B du 7 janv. 2003.
        </p>
      </div>

      <div style="margin-bottom: 18px;">
        <h2 style="font-size: 13px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 8px;">Article 3 — Modalités de versement</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #ddd; background: #f5f5f5; width: 30%; font-weight: bold;">IBAN</td>
            <td style="padding: 5px 8px; border: 1px solid #ddd; font-family: monospace;">{jury_iban}</td>
          </tr>
          <tr>
            <td style="padding: 5px 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">BIC</td>
            <td style="padding: 5px 8px; border: 1px solid #ddd; font-family: monospace;">{jury_bic}</td>
          </tr>
        </table>
        <p style="font-size: 11px; margin-top: 5px; color: #555;">Virement sous 30 jours calendaires suivant la date de l'examen.</p>
      </div>

      <div style="margin-bottom: 18px; background: #fff8e1; border: 1px solid #f59e0b; padding: 10px; border-radius: 3px;">
        <p style="font-size: 11px; font-weight: bold; color: #92400e; margin-bottom: 5px;">⚠ Information fiscale — Article 4</p>
        <p style="font-size: 11px; color: #78350f; line-height: 1.6;">
          Les vacations de jury sont des revenus imposables à déclarer en <strong>BNC (art. 92 CGI)</strong> ou en revenus salariaux selon le statut du bénéficiaire. Les remboursements de frais dans les limites URSSAF ne sont pas soumis à cotisations sociales (arrêté 20/12/2002).
        </p>
      </div>

      <div style="margin-top: 45px; text-align: center;">
        <p style="margin-bottom: 35px;">Fait à {ecole_ville}, le {date_aujourd_hui}</p>
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p><strong>Pour l'Organisme</strong></p>
              <p style="font-size: 12px;">{ecole_nom} — {ecole_representant}</p>
              <p style="margin-top: 55px;">________________________</p>
              <p style="font-size: 11px;">Signature et cachet</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p><strong>Le Membre du Jury</strong></p>
              <p style="font-size: 12px;">{jury_prenom} {jury_nom}</p>
              <p style="margin-top: 55px;">________________________</p>
              <p style="font-size: 11px;">Lu et approuvé — Bon pour paiement</p>
            </td>
          </tr>
        </table>
      </div>
    `,

    formulaire_inscription: `
      <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase;">
        Formulaire d'inscription
      </h1>
      <p style="text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; font-style: italic;">{formulaire_titre}</p>
      <div style="border-top: 2px solid #1A1A1A; margin-bottom: 20px;"></div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 6px 8px; background: #f3f4f6; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #ddd; width: 40%;">Champ</th>
            <th style="text-align: left; padding: 6px 8px; background: #f3f4f6; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #ddd;">Valeur</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">Prénom</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0;">{eleve_prenom}</td>
          </tr>
          <tr>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">Nom</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0;">{eleve_nom}</td>
          </tr>
          <tr>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">Email</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0;">{eleve_email}</td>
          </tr>
          <tr>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">Formation souhaitée</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0;">{formation_nom}</td>
          </tr>
          <tr>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">Session</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #f0f0f0;">{session_debut} → {session_fin}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 30px;">
        <p style="font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 4px;">Signatures</p>
        <p style="text-align: center; font-size: 11px; color: #555; margin-bottom: 20px;">Fait à {ecole_ville}, le {date_soumission}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr>
            <td style="width: 48%; text-align: center; vertical-align: top; padding: 0 10px;">
              <p style="font-weight: bold; margin-bottom: 4px;">Signature du candidat</p>
              <p style="color: #888; font-style: italic; font-size: 10px; margin-bottom: 50px;">Lu et approuvé</p>
              <div style="border-top: 1px solid #1A1A1A; padding-top: 6px;">
                <p style="font-size: 10px; color: #888;">{eleve_prenom} {eleve_nom}</p>
              </div>
            </td>
            <td style="width: 4%;"></td>
            <td style="width: 48%; text-align: center; vertical-align: top; padding: 0 10px;">
              <p style="font-weight: bold; margin-bottom: 4px;">Cachet et signature de l'organisme</p>
              <p style="color: #888; font-style: italic; font-size: 10px; margin-bottom: 50px;">{ecole_nom}</p>
              <div style="border-top: 1px solid #1A1A1A; padding-top: 6px;">
                <p style="font-size: 10px; color: #888;">{ecole_representant}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `,
  }

  return templates[type] || ''
}

/**
 * Génère le contenu header par défaut avec logo et informations
 */
export const getDefaultHeaderContent = (): string => {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px;">
      <div style="flex: 1;">
        <div style="width: 80px; height: 80px; background-color: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 12px; color: #6b7280;">{ecole_logo}</span>
        </div>
      </div>
      <div style="flex: 2; text-align: right;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #1f2937;">{ecole_nom}</h2>
        <p style="font-size: 11px; color: #6b7280; margin: 0;">{ecole_adresse}</p>
        <p style="font-size: 11px; color: #6b7280; margin: 0;">{ecole_telephone} | {ecole_email}</p>
      </div>
    </div>
  `
}

/**
 * Génère le contenu footer par défaut avec pagination
 */
export const getDefaultFooterContent = (): string => {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; font-size: 10px; color: #6b7280;">
      <div>
        <p style="margin: 0;">{ecole_nom}</p>
        <p style="margin: 0;">{ecole_telephone} | {ecole_email}</p>
      </div>
      <div style="text-align: center;">
        <p style="margin: 0;">Page {numero_page} / {total_pages}</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0;">Document généré le {date_generation}</p>
      </div>
    </div>
  `
}

