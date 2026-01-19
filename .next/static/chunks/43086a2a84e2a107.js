(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,348572,e=>{"use strict";var t=e.i(271645),o=e.i(674824),n=e.i(647163),i=e.i(875976);async function a(e){let t={fr:{title:"CONVENTION DE FORMATION PROFESSIONNELLE",between:"ENTRE",theOrganization:"L'organisme de formation",representedBy:"représenté(e) par",director:"Directeur(trice)",and:"ET",theClient:"Le client",company:"Entreprise",object:"ARTICLE 1 - OBJET",conventionObject:"La présente convention a pour objet de définir les conditions dans lesquelles",willProvide:"s'engage à dispenser la formation professionnelle suivante",program:"Programme",formation:"Intitulé de la formation",session:"Session",dates:"Dates de formation",location:"Lieu de formation",duration:"Durée",hours:"heures",schedule:"Horaires",objectives:"Objectifs pédagogiques",prerequisites:"Prérequis",targetAudience:"Public visé",terms:"ARTICLE 2 - MODALITÉS DE DÉROULEMENT",termsContent:"La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d'évaluation sont détaillés dans le programme remis au client.",financial:"ARTICLE 3 - CONDITIONS FINANCIÈRES",price:"Montant total de la formation",paymentTerms:"Modalités de paiement",paymentTermsContent:"Le paiement s'effectuera selon les modalités convenues entre les parties. Un acompte peut être demandé à la signature de la présente convention.",cancellation:"ARTICLE 4 - ANNULATION",cancellationContent:"En cas d'annulation par le client moins de 15 jours avant le début de la formation, des frais d'annulation pourront être appliqués. L'organisme de formation se réserve le droit d'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.",signature:"Signature et cachet",doneAt:"Fait à",on:"le",inDuplicate:"En double exemplaire",for:"Pour",andAccept:"et accepté"},en:{title:"PROFESSIONAL TRAINING AGREEMENT",between:"BETWEEN",theOrganization:"The training organization",representedBy:"represented by",director:"Director",and:"AND",theClient:"The client",company:"Company",object:"ARTICLE 1 - OBJECT",conventionObject:"This agreement defines the conditions under which",willProvide:"commits to provide the following professional training",program:"Program",formation:"Training title",session:"Session",dates:"Training dates",location:"Training location",duration:"Duration",hours:"hours",schedule:"Schedule",objectives:"Learning objectives",prerequisites:"Prerequisites",targetAudience:"Target audience",terms:"ARTICLE 2 - TRAINING MODALITIES",termsContent:"The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the client.",financial:"ARTICLE 3 - FINANCIAL CONDITIONS",price:"Total training amount",paymentTerms:"Payment terms",paymentTermsContent:"Payment will be made according to the terms agreed between the parties. A deposit may be required upon signing this agreement.",cancellation:"ARTICLE 4 - CANCELLATION",cancellationContent:"In case of cancellation by the client less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.",signature:"Signature and stamp",doneAt:"Done at",on:"on",inDuplicate:"In duplicate",for:"For",andAccept:"and accepted"}}[e.language||"fr"],i=(e.language,`
    <div id="convention-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: 'Times New Roman', serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px; border: 1px solid #000; padding: 15px;">
        <p style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">{between}</p>
        
        <div style="margin-bottom: 20px;">
          <p style="margin-bottom: 5px;"><strong>{the_organization}</strong> : {organization_name}</p>
          {IF organization_address}<p style="margin-left: 20px; margin-bottom: 3px;">{organization_address}</p>{ENDIF}
          {IF organization_phone}<p style="margin-left: 20px; margin-bottom: 3px;">T\xe9l: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p style="margin-left: 20px; margin-bottom: 3px;">Email: {organization_email}</p>{ENDIF}
          {IF organization_siret}<p style="margin-left: 20px; margin-bottom: 3px;">SIRET: {organization_siret}</p>{ENDIF}
          {IF organization_rcs}<p style="margin-left: 20px; margin-bottom: 3px;">RCS: {organization_rcs}</p>{ENDIF}
          {IF organization_vat_number}<p style="margin-left: 20px;">N\xb0 TVA: {organization_vat_number}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 20px; margin-bottom: 15px;"><strong>{and}</strong></p>
        
        <div>
          {IF client_name}<p style="margin-bottom: 5px;"><strong>{client_label}</strong> : {client_name}</p>
          {IF client_address}<p style="margin-left: 20px; margin-bottom: 3px;">{client_address}</p>{ENDIF}
          {IF client_phone}<p style="margin-left: 20px; margin-bottom: 3px;">T\xe9l: {client_phone}</p>{ENDIF}
          {IF client_email}<p style="margin-left: 20px;">Email: {client_email}</p>{ENDIF}
          {ELSE}<p style="margin-bottom: 5px;"><strong>{the_client}</strong> : [Nom du client/entreprise]</p>
            <p style="margin-left: 20px; margin-bottom: 3px;">[Adresse]</p>
          <p style="margin-left: 20px;">[T\xe9l\xe9phone/Email]</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {object}
        </h2>
        <p style="line-height: 1.8; text-align: justify; margin-bottom: 15px;">
          {convention_object} <strong>{organization_name}</strong> {will_provide} :
        </p>
        <div style="margin-left: 30px; margin-top: 15px; line-height: 2;">
          {IF program_name}<p><strong>{program}:</strong> {program_name}</p>{ENDIF}
          <p><strong>{formation}:</strong> {formation_name}{IF formation_code} (Code: {formation_code}){ENDIF}</p>
          <p><strong>{session}:</strong> {session_name}</p>
          <p><strong>{dates}:</strong> Du {session_start_date} au {session_end_date}</p>
          {IF session_start_time && session_end_time}<p><strong>{schedule}:</strong> {session_start_time} - {session_end_time}</p>{ENDIF}
          {IF session_location}<p><strong>{location}:</strong> {session_location}</p>{ENDIF}
          {IF formation_duration_hours}<p><strong>{duration}:</strong> {formation_duration_hours} {hours}</p>{ENDIF}
          {IF formation_objectives}<p style="margin-top: 10px;"><strong>{objectives}:</strong> {formation_objectives}</p>{ENDIF}
          {IF formation_prerequisites}<p><strong>{prerequisites}:</strong> {formation_prerequisites}</p>{ENDIF}
          {IF formation_target_audience}<p><strong>{target_audience}:</strong> {formation_target_audience}</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {terms}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {terms_content}
        </p>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {financial}
        </h2>
        <div style="margin-left: 20px; line-height: 2;">
          {IF formation_price}<p><strong>{price}:</strong> {formation_price_formatted} TTC</p>{ENDIF}
          <p style="margin-top: 10px;"><strong>{payment_terms}:</strong></p>
          <p style="margin-left: 20px; text-align: justify;">{payment_terms_content}</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {cancellation}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {cancellation_content}
        </p>
      </div>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{organization_name}</p>
          <p style="margin-top: 5px; font-size: 11px;">{director}</p>
        </div>
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{client_name_or_label}</p>
        </div>
      </div>
      
      <div style="margin-top: 50px; text-align: center; font-size: 12px;">
        <p><strong>{done_at}</strong> {organization_address}, <strong>{on}</strong> <strong>{issue_date}</strong></p>
        <p style="margin-top: 10px; font-style: italic;">{in_duplicate}</p>
      </div>
    </div>
  `),a={organisation_logo:e.organization.logo_url||"",title:t.title,between:t.between,the_organization:t.theOrganization,organization_name:e.organization.name,organization_address:e.organization.address||"",organization_phone:e.organization.phone||"",organization_email:e.organization.email||"",organization_siret:e.organization.siret||"",organization_rcs:e.organization.rcs||"",organization_vat_number:e.organization.vat_number||"",and:t.and,client_name:e.client?.name||"",client_label:e.client?.name?e.client?.name?t.company:t.theClient:"",client_address:e.client?.address||"",client_phone:e.client?.phone||"",client_email:e.client?.email||"",the_client:t.theClient,object:t.object,convention_object:t.conventionObject,will_provide:t.willProvide,program:t.program,program_name:e.program?.name||"",formation:t.formation,formation_name:e.formation.name,formation_code:e.formation.code||"",session:t.session,session_name:e.session.name,dates:t.dates,session_start_date:(0,o.formatDateForDocument)(e.session.start_date),session_end_date:(0,o.formatDateForDocument)(e.session.end_date),session_start_time:e.session.start_time||"",session_end_time:e.session.end_time||"",schedule:t.schedule,location:t.location,session_location:e.session.location||"",duration:t.duration,formation_duration_hours:e.formation.duration_hours||0,hours:t.hours,objectives:t.objectives,formation_objectives:e.formation.objectives||"",prerequisites:t.prerequisites,formation_prerequisites:e.formation.prerequisites||"",target_audience:t.targetAudience,formation_target_audience:e.formation.targetAudience||"",terms:t.terms,terms_content:t.termsContent,financial:t.financial,price:t.price,formation_price:e.formation.price||0,formation_price_formatted:e.formation.price?(0,n.formatCurrency)(e.formation.price,"EUR"):"",payment_terms:t.paymentTerms,payment_terms_content:t.paymentTermsContent,cancellation:t.cancellation,cancellation_content:t.cancellationContent,signature:t.signature,director:t.director,client_name_or_label:e.client?.name||t.theClient,done_at:t.doneAt,on:t.on,issue_date:(0,o.formatDateForDocument)(e.issueDate),in_duplicate:t.inDuplicate};return await p(i,a,e.documentId,e.organizationId)}async function r(e){let t={fr:{title:"CONTRAT PARTICULIER DE FORMATION PROFESSIONNELLE",between:"ENTRE",theOrganization:"L'organisme de formation",representedBy:"représenté(e) par",director:"Directeur(trice)",and:"ET",theTrainee:"Le stagiaire",dateOfBirth:"Né(e) le",address:"Adresse",email:"Email",phone:"Téléphone",studentNumber:"N° stagiaire",nationalId:"N° pièce d'identité",object:"ARTICLE 1 - OBJET",contractObject:"La présente convention a pour objet de définir les conditions dans lesquelles",willProvide:"s'engage à dispenser la formation professionnelle suivante au stagiaire",program:"Programme",formation:"Intitulé de la formation",session:"Session",dates:"Dates de formation",location:"Lieu de formation",duration:"Durée",hours:"heures",schedule:"Horaires",objectives:"Objectifs pédagogiques",prerequisites:"Prérequis",targetAudience:"Public visé",financial:"ARTICLE 2 - CONDITIONS FINANCIÈRES",price:"Montant total de la formation",paid:"Montant payé",remaining:"Reste à payer",enrollmentDate:"Date d'inscription",paymentMethod:"Mode de paiement",paymentSchedule:"Échéancier de paiement",terms:"ARTICLE 3 - MODALITÉS DE DÉROULEMENT",termsContent:"La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d'évaluation sont détaillés dans le programme remis au stagiaire.",attendance:"ARTICLE 4 - ASSIDUITÉ",attendanceContent:"Le stagiaire s'engage à suivre assidûment la formation. En cas d'absence non justifiée, l'organisme de formation se réserve le droit de refuser la délivrance de l'attestation de formation.",cancellation:"ARTICLE 5 - ANNULATION",cancellationContent:"En cas d'annulation par le stagiaire moins de 15 jours avant le début de la formation, des frais d'annulation pourront être appliqués. L'organisme de formation se réserve le droit d'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.",signature:"Signature et cachet",doneAt:"Fait à",on:"le",inDuplicate:"En double exemplaire",for:"Pour",andAccept:"et accepté"},en:{title:"INDIVIDUAL PROFESSIONAL TRAINING CONTRACT",between:"BETWEEN",theOrganization:"The training organization",representedBy:"represented by",director:"Director",and:"AND",theTrainee:"The trainee",dateOfBirth:"Born on",address:"Address",email:"Email",phone:"Phone",studentNumber:"Trainee number",nationalId:"ID number",object:"ARTICLE 1 - OBJECT",contractObject:"This contract defines the conditions under which",willProvide:"commits to provide the following professional training to the trainee",program:"Program",formation:"Training title",session:"Session",dates:"Training dates",location:"Training location",duration:"Duration",hours:"hours",schedule:"Schedule",objectives:"Learning objectives",prerequisites:"Prerequisites",targetAudience:"Target audience",financial:"ARTICLE 2 - FINANCIAL CONDITIONS",price:"Total training amount",paid:"Amount paid",remaining:"Remaining",enrollmentDate:"Enrollment date",paymentMethod:"Payment method",paymentSchedule:"Payment schedule",terms:"ARTICLE 3 - TRAINING MODALITIES",termsContent:"The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the trainee.",attendance:"ARTICLE 4 - ATTENDANCE",attendanceContent:"The trainee undertakes to attend the training regularly. In case of unjustified absence, the training organization reserves the right to refuse the issuance of the training certificate.",cancellation:"ARTICLE 5 - CANCELLATION",cancellationContent:"In case of cancellation by the trainee less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.",signature:"Signature and stamp",doneAt:"Done at",on:"on",inDuplicate:"In duplicate",for:"For",andAccept:"and accepted"}}[e.language||"fr"],i=e.enrollment.total_amount-e.enrollment.paid_amount,a=(e.language,`
    <div id="contract-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: 'Times New Roman', serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px; border: 1px solid #000; padding: 15px;">
        <p style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">{between}</p>
        
        <div style="margin-bottom: 20px;">
          <p style="margin-bottom: 5px;"><strong>{the_organization}</strong> : {organization_name}</p>
          {IF organization_address}<p style="margin-left: 20px; margin-bottom: 3px;">{organization_address}</p>{ENDIF}
          {IF organization_phone}<p style="margin-left: 20px; margin-bottom: 3px;">T\xe9l: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p style="margin-left: 20px; margin-bottom: 3px;">Email: {organization_email}</p>{ENDIF}
          {IF organization_siret}<p style="margin-left: 20px; margin-bottom: 3px;">SIRET: {organization_siret}</p>{ENDIF}
          {IF organization_rcs}<p style="margin-left: 20px; margin-bottom: 3px;">RCS: {organization_rcs}</p>{ENDIF}
          {IF organization_vat_number}<p style="margin-left: 20px;">N\xb0 TVA: {organization_vat_number}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 20px; margin-bottom: 15px;"><strong>{and}</strong></p>
        
        <div>
          <p style="margin-bottom: 5px;"><strong>{the_trainee}</strong> : {student_first_name} {student_last_name}</p>
          <div style="margin-left: 20px; margin-top: 10px;">
            {IF student_date_of_birth}<p style="margin-bottom: 3px;">{date_of_birth}: {student_date_of_birth}</p>{ENDIF}
            {IF student_address}<p style="margin-bottom: 3px;">{address}: {student_address}</p>{ENDIF}
            {IF student_email}<p style="margin-bottom: 3px;">{email}: {student_email}</p>{ENDIF}
            {IF student_phone}<p style="margin-bottom: 3px;">{phone}: {student_phone}</p>{ENDIF}
            {IF student_number}<p style="margin-bottom: 3px;">{student_number_label}: {student_number}</p>{ENDIF}
            {IF student_national_id}<p>{national_id}: {student_national_id}</p>{ENDIF}
          </div>
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {object}
        </h2>
        <p style="line-height: 1.8; text-align: justify; margin-bottom: 15px;">
          {contract_object} <strong>{organization_name}</strong> {will_provide} :
        </p>
        <div style="margin-left: 30px; margin-top: 15px; line-height: 2;">
          {IF program_name}<p><strong>{program}:</strong> {program_name}</p>{ENDIF}
          <p><strong>{formation}:</strong> {formation_name}{IF formation_code} (Code: {formation_code}){ENDIF}</p>
          <p><strong>{session}:</strong> {session_name}</p>
          <p><strong>{dates}:</strong> Du {session_start_date} au {session_end_date}</p>
          {IF session_start_time && session_end_time}<p><strong>{schedule}:</strong> {session_start_time} - {session_end_time}</p>{ENDIF}
          {IF session_location}<p><strong>{location}:</strong> {session_location}</p>{ENDIF}
          {IF formation_duration_hours}<p><strong>{duration}:</strong> {formation_duration_hours} {hours}</p>{ENDIF}
          {IF formation_objectives}<p style="margin-top: 10px;"><strong>{objectives}:</strong> {formation_objectives}</p>{ENDIF}
          {IF formation_prerequisites}<p><strong>{prerequisites}:</strong> {formation_prerequisites}</p>{ENDIF}
          {IF formation_target_audience}<p><strong>{target_audience}:</strong> {formation_target_audience}</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {financial}
        </h2>
        <div style="margin-left: 20px; line-height: 2;">
          <p><strong>{price}:</strong> {total_amount_formatted} TTC</p>
          <p><strong>{paid}:</strong> {paid_amount_formatted}</p>
          <p><strong>{remaining}:</strong> {remaining_amount_formatted}</p>
          <p><strong>{enrollment_date_label}:</strong> {enrollment_date}</p>
          {IF payment_method}<p><strong>{payment_method_label}:</strong> {payment_method}</p>{ENDIF}
          {IF payment_schedule}<p><strong>{payment_schedule_label}:</strong> {payment_schedule}</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {terms}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {terms_content}
        </p>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {attendance}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {attendance_content}
        </p>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {cancellation}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {cancellation_content}
        </p>
      </div>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{organization_name}</p>
          <p style="margin-top: 5px; font-size: 11px;">{director}</p>
        </div>
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{student_first_name} {student_last_name}</p>
          <p style="margin-top: 5px; font-size: 11px;">{the_trainee}</p>
        </div>
      </div>
      
      <div style="margin-top: 50px; text-align: center; font-size: 12px;">
        <p><strong>{done_at}</strong> {organization_address}, <strong>{on}</strong> <strong>{issue_date}</strong></p>
        <p style="margin-top: 10px; font-style: italic;">{in_duplicate}</p>
      </div>
    </div>
  `),r={organisation_logo:e.organization.logo_url||"",title:t.title,between:t.between,the_organization:t.theOrganization,organization_name:e.organization.name,organization_address:e.organization.address||"",organization_phone:e.organization.phone||"",organization_email:e.organization.email||"",organization_siret:e.organization.siret||"",organization_rcs:e.organization.rcs||"",organization_vat_number:e.organization.vat_number||"",and:t.and,the_trainee:t.theTrainee,student_first_name:e.student.first_name,student_last_name:e.student.last_name,student_date_of_birth:e.student.date_of_birth?(0,o.formatDateForDocument)(e.student.date_of_birth):"",date_of_birth:t.dateOfBirth,address:t.address,student_address:e.student.address||"",email:t.email,student_email:e.student.email||"",phone:t.phone,student_phone:e.student.phone||"",student_number_label:t.studentNumber,student_number:e.student.student_number||"",national_id:t.nationalId,student_national_id:e.student.national_id||"",object:t.object,contract_object:t.contractObject,will_provide:t.willProvide,program:t.program,program_name:e.program?.name||"",formation:t.formation,formation_name:e.formation.name,formation_code:e.formation.code||"",session:t.session,session_name:e.session.name,dates:t.dates,session_start_date:(0,o.formatDateForDocument)(e.session.start_date),session_end_date:(0,o.formatDateForDocument)(e.session.end_date),schedule:t.schedule,session_start_time:e.session.start_time||"",session_end_time:e.session.end_time||"",location:t.location,session_location:e.session.location||"",duration:t.duration,formation_duration_hours:e.formation.duration_hours||0,hours:t.hours,objectives:t.objectives,formation_objectives:e.formation.objectives||"",prerequisites:t.prerequisites,formation_prerequisites:e.formation.prerequisites||"",target_audience:t.targetAudience,formation_target_audience:e.formation.targetAudience||"",financial:t.financial,price:t.price,total_amount_formatted:(0,n.formatCurrency)(e.enrollment.total_amount,"EUR"),paid:t.paid,paid_amount_formatted:(0,n.formatCurrency)(e.enrollment.paid_amount,"EUR"),remaining:t.remaining,remaining_amount_formatted:(0,n.formatCurrency)(i,"EUR"),enrollment_date_label:t.enrollmentDate,enrollment_date:(0,o.formatDateForDocument)(e.enrollment.enrollment_date),payment_method:e.enrollment.payment_method||"",payment_method_label:t.paymentMethod,payment_schedule:e.enrollment.payment_schedule||"",payment_schedule_label:t.paymentSchedule,terms:t.terms,terms_content:t.termsContent,attendance:t.attendance,attendance_content:t.attendanceContent,cancellation:t.cancellation,cancellation_content:t.cancellationContent,signature:t.signature,director:t.director,done_at:t.doneAt,on:t.on,issue_date:(0,o.formatDateForDocument)(e.issueDate),in_duplicate:t.inDuplicate};return await p(a,r,e.documentId,e.organizationId)}async function s(e){let t={fr:{title:"CONVOCATION À UNE FORMATION",dear:"Madame, Monsieur",weInform:"Nous vous informons que vous êtes convoqué(e) à la session de formation suivante",program:"Programme",formation:"Formation",session:"Session",dates:"Dates",times:"Horaires",location:"Lieu",contact:"Pour toute information complémentaire, vous pouvez nous contacter",seeYou:"Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",bestRegards:"Cordialement",signature:"Signature et cachet",doneAt:"Fait à",on:"le"},en:{title:"TRAINING INVITATION",dear:"Dear Sir/Madam",weInform:"We inform you that you are invited to the following training session",program:"Program",formation:"Training",session:"Session",dates:"Dates",times:"Schedule",location:"Location",contact:"For any additional information, you can contact us",seeYou:"Yours sincerely",bestRegards:"Best regards",signature:"Signature and stamp",doneAt:"Done at",on:"on"}}[e.language||"fr"],n=(e.language,`
    <div id="convocation-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; color: #000;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px;">
        <p><strong>{organization_name}</strong></p>
        {IF organization_address}<p>{organization_address}</p>{ENDIF}
        {IF organization_phone}<p>T\xe9l: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p>Email: {organization_email}</p>{ENDIF}
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <p style="margin-bottom: 10px;"><strong>{student_first_name} {student_last_name}</strong></p>
        {IF student_email}<p>{student_email}</p>{ENDIF}
        {IF student_phone}<p>{student_phone}</p>{ENDIF}
      </div>
      
      <div style="margin-top: 40px; line-height: 1.8;">
        <p style="margin-bottom: 20px;">{dear},</p>
        <p style="text-align: justify; margin-bottom: 30px;">
          {we_inform} :
        </p>
        
        <div style="margin-left: 30px; margin-top: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          {IF program_name}<p><strong>{program}:</strong> {program_name}</p>{ENDIF}
          <p><strong>{formation}:</strong> {formation_name}{IF formation_code} ({formation_code}){ENDIF}</p>
          <p><strong>{session}:</strong> {session_name}</p>
          <p><strong>{dates}:</strong> {session_start_date} - {session_end_date}</p>
          {IF session_start_time && session_end_time}<p><strong>{times}:</strong> {session_start_time} - {session_end_time}</p>{ENDIF}
          {IF session_location}<p><strong>{location}:</strong> {session_location}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 30px; text-align: justify;">
          {contact} :
        </p>
        <div style="margin-left: 30px; margin-top: 10px;">
          {IF organization_phone}<p>T\xe9l\xe9phone: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p>Email: {organization_email}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 40px; text-align: justify;">
          {see_you}
        </p>
        
        <p style="margin-top: 30px;">
          {best_regards}
        </p>
      </div>
      
      <div style="margin-top: 60px; text-align: right;">
        <p style="margin-bottom: 40px;">{signature}</p>
        <p>_________________________</p>
        <p style="margin-top: 5px; font-size: 12px;">{organization_name}</p>
      </div>
      
      <div style="margin-top: 40px; text-align: center;">
        <p>{done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong></p>
      </div>
    </div>
  `),i={organisation_logo:e.organization.logo_url||"",title:t.title,organization_name:e.organization.name,organization_address:e.organization.address||"",organization_phone:e.organization.phone||"",organization_email:e.organization.email||"",student_first_name:e.student.first_name,student_last_name:e.student.last_name,student_email:e.student.email||"",student_phone:e.student.phone||"",dear:t.dear,we_inform:t.weInform,program:t.program,program_name:e.program?.name||"",formation:t.formation,formation_name:e.formation.name,formation_code:e.formation.code||"",session:t.session,session_name:e.session.name,dates:t.dates,session_start_date:(0,o.formatDateForDocument)(e.session.start_date),session_end_date:(0,o.formatDateForDocument)(e.session.end_date),times:t.times,session_start_time:e.session.start_time||"",session_end_time:e.session.end_time||"",location:t.location,session_location:e.session.location||"",contact:t.contact,see_you:t.seeYou,best_regards:t.bestRegards,signature:t.signature,done_at:t.doneAt,on:t.on,issue_date:(0,o.formatDateForDocument)(e.issueDate)};return await p(n,i,e.documentId,e.organizationId)}async function d(e){let t={fr:{title:"PROGRAMME DE FORMATION",subtitle:"Description du programme",program:"Programme",formation:"Formation",code:"Code",duration:"Durée",hours:"heures",objectives:"Objectifs pédagogiques",content:"Contenu de la formation",learnerProfile:"Profil des apprenants",doneAt:"Fait à",on:"le"},en:{title:"TRAINING PROGRAM",subtitle:"Program description",program:"Program",formation:"Training",code:"Code",duration:"Duration",hours:"hours",objectives:"Pedagogical objectives",content:"Training content",learnerProfile:"Learner profile",doneAt:"Done at",on:"on"}}[e.language||"fr"],n=(e.language,`
    <div id="program-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}

      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>

      <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #1e40af;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {program}: {program_name}
        </h2>
        {IF program_description}<p style="margin-top: 10px; color: #374151;">{program_description}</p>{ENDIF}
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {formation}: {formation_name}
        </h2>
        {IF formation_subtitle}<p style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">{formation_subtitle}</p>{ENDIF}
        {IF formation_code}<p style="margin-top: 10px;"><strong>{code}:</strong> {formation_code}</p>{ENDIF}
        {IF formation_duration_hours}<p style="margin-top: 10px;"><strong>{duration}:</strong> {formation_duration_hours} {hours}</p>{ENDIF}
      </div>

      {IF formation_objectives}<div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af;">
          {objectives}
        </h3>
        <div style="white-space: pre-wrap; color: #374151;">{formation_objectives}</div>
      </div>{ENDIF}

      {IF formation_content}<div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af;">
          {content}
        </h3>
        <div style="white-space: pre-wrap; color: #374151;">{formation_content}</div>
      </div>{ENDIF}

      {IF formation_learner_profile}<div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af;">
          {learner_profile}
        </h3>
        <div style="white-space: pre-wrap; color: #374151;">{formation_learner_profile}</div>
      </div>{ENDIF}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">T\xe9l: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `),i={organisation_logo:e.organization.logo_url||"",title:t.title,subtitle:t.subtitle,program:t.program,program_name:e.program.name,program_description:e.program.description||"",formation:t.formation,formation_name:e.formation.name,formation_subtitle:e.formation.subtitle||"",code:t.code,formation_code:e.formation.code||"",duration:t.duration,formation_duration_hours:e.formation.duration_hours||0,hours:t.hours,objectives:t.objectives,formation_objectives:e.formation.objectives||"",content:t.content,formation_content:e.formation.content||"",learner_profile:t.learnerProfile,formation_learner_profile:e.formation.learner_profile||"",organization_name:e.organization.name,organization_address:e.organization.address||"",organization_phone:e.organization.phone||"",organization_email:e.organization.email||"",done_at:t.doneAt,on:t.on,issue_date:(0,o.formatDateForDocument)(e.issueDate)};return await p(n,i,e.documentId,e.organizationId)}async function l(e){let t={fr:{title:"CONDITIONS GÉNÉRALES DE VENTE",subtitle:"CGV",intro:"Les présentes Conditions Générales de Vente régissent les relations entre",and:"et les clients pour tous les services de formation proposés.",doneAt:"Fait à",on:"le"},en:{title:"TERMS AND CONDITIONS",subtitle:"T&C",intro:"These Terms and Conditions govern the relationship between",and:"and customers for all training services offered.",doneAt:"Done at",on:"on"}}[e.language||"fr"],n=(e.language,`
    <div id="terms-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}

      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>

      <div style="margin-bottom: 30px;">
        <p style="margin-bottom: 20px; text-align: justify;">
          {intro} <strong>{organization_name}</strong> {and}
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">T\xe9l: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `),i={organisation_logo:e.organization.logo_url||"",title:t.title,subtitle:t.subtitle,intro:t.intro,organization_name:e.organization.name,and:t.and,organization_address:e.organization.address||"",organization_phone:e.organization.phone||"",organization_email:e.organization.email||"",done_at:t.doneAt,on:t.on,issue_date:(0,o.formatDateForDocument)(e.issueDate)};return await p(n,i,e.documentId,e.organizationId)}async function m(e){let t={fr:{title:"POLITIQUE DE CONFIDENTIALITÉ",subtitle:"Protection des données personnelles",intro:"La présente Politique de Confidentialité décrit comment",collects:"collecte, utilise et protège vos données personnelles.",doneAt:"Fait à",on:"le"},en:{title:"PRIVACY POLICY",subtitle:"Personal data protection",intro:"This Privacy Policy describes how",collects:"collects, uses and protects your personal data.",doneAt:"Done at",on:"on"}}[e.language||"fr"],n=(e.language,`
    <div id="privacy-policy-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}

      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>

      <div style="margin-bottom: 30px;">
        <p style="margin-bottom: 20px; text-align: justify;">
          {intro} <strong>{organization_name}</strong> {collects}
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">T\xe9l: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `),i={organisation_logo:e.organization.logo_url||"",title:t.title,subtitle:t.subtitle,intro:t.intro,organization_name:e.organization.name,collects:t.collects,organization_address:e.organization.address||"",organization_phone:e.organization.phone||"",organization_email:e.organization.email||"",done_at:t.doneAt,on:t.on,issue_date:(0,o.formatDateForDocument)(e.issueDate)};return await p(n,i,e.documentId,e.organizationId)}async function p(e,t,o,n){let a={id:o||"temp",name:"Template",type:"convention",content:{pageSize:"A4",margins:{top:20,right:20,bottom:20,left:20},elements:[{type:"html",html:e}]},header:null,footer:null,header_enabled:!1,footer_enabled:!1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),organization_id:n||""};return(await (0,i.generateHTML)(a,t,o,n)).html}var g=e.i(6799),c=e.i(790224),u=e.i(669671);function _({sessionData:e,formation:i,program:p,organization:_}){let{addToast:f}=(0,g.useToast)(),[v,h]=(0,t.useState)(!1),[y,b]=(0,t.useState)({current:0,total:0}),[x,I]=(0,t.useState)(null),z=async t=>{if(!e||!i||!_||!t)return;let a=t.students;if(!a||!a.email)return void f({type:"error",title:"Erreur",description:"L'étudiant n'a pas d'adresse email."});try{let t=await s({student:{first_name:a.first_name,last_name:a.last_name,email:a.email||void 0,phone:a.phone||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,start_time:e.start_time||void 0,end_time:e.end_time||void 0,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),r=document.createElement("div");r.innerHTML=t,r.style.position="absolute",r.style.left="-9999px",document.body.appendChild(r);let d=r.querySelector('[id$="-document"]');if(!d)throw document.body.removeChild(r),Error("Élément de document non trouvé");d.id=`temp-convocation-email-${Date.now()}`,await new Promise(e=>setTimeout(e,500));let l=await (0,o.generatePDFBlobFromHTML)(d.id);document.body.removeChild(r);let m=`Convocation - ${e.name}`,g=`
        <p>Bonjour ${a.first_name} ${a.last_name},</p>
        <p>Vous \xeates convoqu\xe9(e) pour la session de formation suivante :</p>
        <ul>
          <li><strong>Formation :</strong> ${i.name}</li>
          <li><strong>Session :</strong> ${e.name}</li>
          <li><strong>Date de d\xe9but :</strong> ${(0,n.formatDate)(e.start_date)}</li>
          <li><strong>Date de fin :</strong> ${(0,n.formatDate)(e.end_date)}</li>
          ${e.location?`<li><strong>Lieu :</strong> ${e.location}</li>`:""}
        </ul>
        <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
        <p>Cordialement,<br>${_.name}</p>
      `;await u.emailService.sendDocument(a.email,m,l,`convocation_${a.last_name}_${a.first_name}.pdf`,g),f({type:"success",title:"Email envoyé",description:`La convocation a \xe9t\xe9 envoy\xe9e \xe0 ${a.email}.`})}catch(e){c.logger.error("Erreur lors de l'envoi de la convocation par email",e,{enrollmentId:t.id,studentId:t.student_id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},D=async t=>{if(!e||!i||!_)return;let o=t.filter(e=>e.students&&e.students.email&&"cancelled"!==e.status);if(0===o.length)return void f({type:"error",title:"Erreur",description:"Aucun étudiant avec une adresse email valide trouvé."});h(!0),b({current:0,total:o.length});try{let e=0,t=0;for(let n of o){try{await z(n),e++}catch(e){t++,c.logger.error("Erreur lors de l'envoi de la convocation",e,{enrollmentId:n.id})}b(e=>({...e,current:e.current+1}))}f({type:e>0?"success":"error",title:"Envoi terminé",description:`${e} email(s) envoy\xe9(s) avec succ\xe8s${t>0?`, ${t} erreur(s)`:""}.`})}catch(e){c.logger.error("Erreur lors de l'envoi groupé des convocations",e),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi groupé."})}finally{h(!1),b({current:0,total:0})}};return{isGeneratingZip:v,zipGenerationProgress:y,lastZipGeneration:x,handleGenerateConvention:async()=>{if(!e||!i||!_)return void f({type:"error",title:"Erreur",description:"Données manquantes pour générer la convention."});try{let t=await a({session:{name:e.name,start_date:e.start_date,end_date:e.end_date,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0,price:i.price||void 0,duration_hours:i.duration_hours||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),n=document.createElement("div");n.innerHTML=t,n.style.position="absolute",n.style.left="-9999px",document.body.appendChild(n);let r=n.querySelector('[id$="-document"]');r&&(r.id=`temp-convention-${Date.now()}`,await new Promise(e=>setTimeout(e,500)),await (0,o.generatePDFFromHTML)(r.id,`convention_${e.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(n),f({type:"success",title:"Convention générée",description:"La convention a été générée et téléchargée avec succès."})}catch(t){c.logger.error("Erreur lors de la génération de la convention",t,{sessionId:e?.id,formationId:i?.id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération de la convention."})}},handleGenerateContract:async t=>{if(!e||!i||!_||!t)return;let n=t.students;if(n)try{let a=await r({student:{first_name:n.first_name,last_name:n.last_name,email:n.email||void 0,phone:n.phone||void 0,address:n.address||void 0,date_of_birth:n.date_of_birth||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0,price:i.price||void 0,duration_hours:i.duration_hours||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},enrollment:{enrollment_date:t.enrollment_date||"",total_amount:t.total_amount||0,paid_amount:t.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),s=document.createElement("div");s.innerHTML=a,s.style.position="absolute",s.style.left="-9999px",document.body.appendChild(s);let d=s.querySelector('[id$="-document"]');d&&(d.id=`temp-contract-${Date.now()}`,await new Promise(e=>setTimeout(e,500)),await (0,o.generatePDFFromHTML)(d.id,`contrat_${n.last_name}_${n.first_name}.pdf`)),document.body.removeChild(s),f({type:"success",title:"Contrat généré",description:"Le contrat a été généré et téléchargé avec succès."})}catch(e){c.logger.error("Erreur lors de la génération du contrat",e,{enrollmentId:t.id,studentId:t.student_id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du contrat."})}},handleGenerateConvocation:async t=>{if(!e||!i||!_||!t)return;let n=t.students;if(n)try{let t=await s({student:{first_name:n.first_name,last_name:n.last_name,email:n.email||void 0,phone:n.phone||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,start_time:e.start_time||void 0,end_time:e.end_time||void 0,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),a=document.createElement("div");a.innerHTML=t,a.style.position="absolute",a.style.left="-9999px",document.body.appendChild(a);let r=a.querySelector('[id$="-document"]');r&&(r.id=`temp-convocation-${Date.now()}`,await new Promise(e=>setTimeout(e,500)),await (0,o.generatePDFFromHTML)(r.id,`convocation_${n.last_name}_${n.first_name}.pdf`)),document.body.removeChild(a),f({type:"success",title:"Convocation générée",description:"La convocation a été générée et téléchargée avec succès."})}catch(e){c.logger.error("Erreur lors de la génération de la convocation",e,{enrollmentId:t.id,studentId:t.student_id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération de la convocation."})}},handleGenerateProgram:async()=>{if(e&&i&&p&&_)try{let e=await d({program:{name:p.name},formation:{name:i.name,code:i.code||void 0},organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),t=document.createElement("div");t.innerHTML=e,t.style.position="absolute",t.style.left="-9999px",document.body.appendChild(t);let n=t.querySelector('[id$="-document"]');n&&(n.id=`temp-program-${Date.now()}`,await new Promise(e=>setTimeout(e,500)),await (0,o.generatePDFFromHTML)(n.id,`programme_${p.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(t),f({type:"success",title:"Programme généré",description:"Le programme a été généré et téléchargé avec succès."})}catch(e){c.logger.error("Erreur lors de la génération du programme",e),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du programme."})}},handleGenerateTerms:async()=>{if(_)try{let e=await l({organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),t=document.createElement("div");t.innerHTML=e,t.style.position="absolute",t.style.left="-9999px",document.body.appendChild(t);let n=t.querySelector('[id$="-document"]');n&&(n.id=`temp-terms-${Date.now()}`,await new Promise(e=>setTimeout(e,500)),await (0,o.generatePDFFromHTML)(n.id,`cgv_${_.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(t),f({type:"success",title:"CGV générée",description:"Les conditions générales de vente ont été générées avec succès."})}catch(e){c.logger.error("Erreur lors de la génération des CGV",e),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération des CGV."})}},handleGeneratePrivacyPolicy:async()=>{if(_)try{let e=await m({organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),t=document.createElement("div");t.innerHTML=e,t.style.position="absolute",t.style.left="-9999px",document.body.appendChild(t);let n=t.querySelector('[id$="-document"]');n&&(n.id=`temp-privacy-${Date.now()}`,await new Promise(e=>setTimeout(e,500)),await (0,o.generatePDFFromHTML)(n.id,`politique_confidentialite_${_.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(t),f({type:"success",title:"Politique générée",description:"La politique de confidentialité a été générée avec succès."})}catch(e){c.logger.error("Erreur lors de la génération de la politique de confidentialité",e),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération de la politique de confidentialité."})}},handleGenerateAllConventionsZip:async t=>{if(e&&i&&_){h(!0),b({current:0,total:t.length+1});try{let n=[],s=await a({session:{name:e.name,start_date:e.start_date,end_date:e.end_date,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0,price:i.price||void 0,duration_hours:i.duration_hours||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),d=document.createElement("div");d.innerHTML=s,d.style.position="absolute",d.style.left="-9999px",document.body.appendChild(d);let l=d.querySelector('[id$="-document"]');if(l){l.id=`temp-convention-zip-${Date.now()}`,await new Promise(e=>setTimeout(e,500));let e=await (0,o.generatePDFBlobFromHTML)(l.id);n.push({name:"convention_generale.pdf",blob:e})}for(let a of(document.body.removeChild(d),b(e=>({...e,current:e.current+1})),t)){let t=a.students;if(!t)continue;let s=await r({student:{first_name:t.first_name,last_name:t.last_name,email:t.email||void 0,phone:t.phone||void 0,address:t.address||void 0,date_of_birth:t.date_of_birth||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0,price:i.price||void 0,duration_hours:i.duration_hours||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},enrollment:{enrollment_date:a.enrollment_date||"",total_amount:a.total_amount||0,paid_amount:a.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),d=document.createElement("div");d.innerHTML=s,d.style.position="absolute",d.style.left="-9999px",document.body.appendChild(d);let l=d.querySelector('[id$="-document"]');if(l){l.id=`temp-contract-zip-${Date.now()}-${a.id}`,await new Promise(e=>setTimeout(e,500));let e=await (0,o.generatePDFBlobFromHTML)(l.id);n.push({name:`contrat_${t.last_name}_${t.first_name}.pdf`,blob:e})}document.body.removeChild(d),b(e=>({...e,current:e.current+1}))}await (0,o.createZipFromPDFs)(n,`conventions_contrats_${e.name.replace(/\s+/g,"_")}.zip`),I(new Date),f({type:"success",title:"ZIP généré",description:`Le fichier ZIP contenant ${n.length} document(s) a \xe9t\xe9 g\xe9n\xe9r\xe9 avec succ\xe8s.`})}catch(e){c.logger.error("Erreur lors de la génération du ZIP",e,{type:"conventions",count:t?.length||0}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du ZIP."})}finally{h(!1),b({current:0,total:0})}}},handleGenerateAllConvocationsZip:async t=>{if(e&&i&&_){h(!0),b({current:0,total:t.length});try{let n=[];for(let a of t){let t=a.students;if(!t)continue;let r=await s({student:{first_name:t.first_name,last_name:t.last_name,email:t.email||void 0,phone:t.phone||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,start_time:e.start_time||void 0,end_time:e.end_time||void 0,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),d=document.createElement("div");d.innerHTML=r,d.style.position="absolute",d.style.left="-9999px",document.body.appendChild(d);let l=d.querySelector('[id$="-document"]');if(l){l.id=`temp-convocation-zip-${Date.now()}-${a.id}`,await new Promise(e=>setTimeout(e,500));let e=await (0,o.generatePDFBlobFromHTML)(l.id);n.push({name:`convocation_${t.last_name}_${t.first_name}.pdf`,blob:e})}document.body.removeChild(d),b(e=>({...e,current:e.current+1}))}await (0,o.createZipFromPDFs)(n,`convocations_${e.name.replace(/\s+/g,"_")}.zip`),I(new Date),f({type:"success",title:"ZIP généré",description:`Le fichier ZIP contenant ${n.length} convocation(s) a \xe9t\xe9 g\xe9n\xe9r\xe9 avec succ\xe8s.`})}catch(e){c.logger.error("Erreur lors de la génération du ZIP",e,{type:"conventions",count:t?.length||0}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du ZIP."})}finally{h(!1),b({current:0,total:0})}}},handleGenerateSessionReport:async()=>{f({type:"info",title:"Fonctionnalité à venir",description:"La génération du rapport de session sera implémentée prochainement."})},handleGenerateCertificate:async e=>{f({type:"info",title:"Fonctionnalité à venir",description:"La génération de certificat sera implémentée prochainement."})},handleSendConvocationByEmail:z,handleSendConvocationByEmailWithCustomContent:async(t,n,a)=>{if(!e||!i||!_||!t)return;let r=t.students;if(!r)return void f({type:"error",title:"Erreur",description:"Données étudiant manquantes."});try{let t=await s({student:{first_name:r.first_name,last_name:r.last_name,email:r.email||void 0,phone:r.phone||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,start_time:e.start_time||void 0,end_time:e.end_time||void 0,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),d=document.createElement("div");d.innerHTML=t,d.style.position="absolute",d.style.left="-9999px",document.body.appendChild(d);let l=d.querySelector('[id$="-document"]');if(!l)throw document.body.removeChild(d),Error("Élément de document non trouvé");l.id=`temp-convocation-email-${Date.now()}`,await new Promise(e=>setTimeout(e,500));let m=await (0,o.generatePDFBlobFromHTML)(l.id);document.body.removeChild(d);let g=a.replace(/\n/g,"<br>");await u.emailService.sendDocument(r.email||"",n,m,`convocation_${r.last_name}_${r.first_name}.pdf`,g),f({type:"success",title:"Email envoyé",description:`La convocation a \xe9t\xe9 envoy\xe9e \xe0 ${r.email||"l'adresse spécifiée"}.`})}catch(e){c.logger.error("Erreur lors de l'envoi de la convocation par email",e,{enrollmentId:t.id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},handleSendAllConvocationsByEmail:D,handleSendContractByEmail:async t=>{if(!e||!i||!_||!t)return;let n=t.students;if(!n||!n.email)return void f({type:"error",title:"Erreur",description:"L'étudiant n'a pas d'adresse email."});try{let a=await r({student:{first_name:n.first_name,last_name:n.last_name,email:n.email||void 0,phone:n.phone||void 0,address:n.address||void 0,date_of_birth:n.date_of_birth||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0,price:i.price||void 0,duration_hours:i.duration_hours||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},enrollment:{enrollment_date:t.enrollment_date||"",total_amount:t.total_amount||0,paid_amount:t.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),s=document.createElement("div");s.innerHTML=a,s.style.position="absolute",s.style.left="-9999px",document.body.appendChild(s);let d=s.querySelector('[id$="-document"]');if(!d)throw document.body.removeChild(s),Error("Élément de document non trouvé");d.id=`temp-contract-email-${Date.now()}`,await new Promise(e=>setTimeout(e,500));let l=await (0,o.generatePDFBlobFromHTML)(d.id);document.body.removeChild(s);let m=`Contrat de formation - ${i.name}`,g=`
        <p>Bonjour ${n.first_name} ${n.last_name},</p>
        <p>Veuillez trouver ci-joint votre contrat de formation pour la session "${e.name}".</p>
        <p>Cordialement,<br>${_.name}</p>
      `;await u.emailService.sendDocument(n.email,m,l,`contrat_${n.last_name}_${n.first_name}.pdf`,g),f({type:"success",title:"Email envoyé",description:`Le contrat a \xe9t\xe9 envoy\xe9 \xe0 ${n.email}.`})}catch(e){c.logger.error("Erreur lors de l'envoi du contrat par email",e,{enrollmentId:t.id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},handleSendContractByEmailWithCustomContent:async(t,n,a)=>{if(!e||!i||!_||!t)return;let s=t.students;if(!s)return void f({type:"error",title:"Erreur",description:"Données étudiant manquantes."});try{let d=await r({student:{first_name:s.first_name,last_name:s.last_name,email:s.email||void 0,phone:s.phone||void 0,address:s.address||void 0,date_of_birth:s.date_of_birth||void 0},session:{name:e.name,start_date:e.start_date,end_date:e.end_date,location:e.location||void 0},formation:{name:i.name,code:i.code||void 0,price:i.price||void 0,duration_hours:i.duration_hours||void 0},program:p?{name:p.name}:void 0,organization:{name:_.name,address:_.address||void 0,phone:_.phone||void 0,email:_.email||void 0,logo_url:_.logo_url||void 0},enrollment:{enrollment_date:t.enrollment_date||"",total_amount:t.total_amount||0,paid_amount:t.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),l=document.createElement("div");l.innerHTML=d,l.style.position="absolute",l.style.left="-9999px",document.body.appendChild(l);let m=l.querySelector('[id$="-document"]');if(!m)throw document.body.removeChild(l),Error("Élément de document non trouvé");m.id=`temp-contract-email-${Date.now()}`,await new Promise(e=>setTimeout(e,500));let g=await (0,o.generatePDFBlobFromHTML)(m.id);document.body.removeChild(l);let c=a.replace(/\n/g,"<br>");await u.emailService.sendDocument(s.email||"",n,g,`contrat_${s.last_name}_${s.first_name}.pdf`,c),f({type:"success",title:"Email envoyé",description:`Le contrat a \xe9t\xe9 envoy\xe9 \xe0 ${s.email||"l'adresse spécifiée"}.`})}catch(e){c.logger.error("Erreur lors de l'envoi du contrat par email",e,{enrollmentId:t.id}),f({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},prepareConvocationEmail:t=>{if(!e||!i||!_||!t)return null;let o=t.students;if(!o||!o.email)return null;let a=`Convocation - ${e.name}`,r=`
      <p>Bonjour ${o.first_name} ${o.last_name},</p>
      <p>Vous \xeates convoqu\xe9(e) pour la session de formation suivante :</p>
      <ul>
        <li><strong>Formation :</strong> ${i.name}</li>
        <li><strong>Session :</strong> ${e.name}</li>
        <li><strong>Date de d\xe9but :</strong> ${(0,n.formatDate)(e.start_date)}</li>
        <li><strong>Date de fin :</strong> ${(0,n.formatDate)(e.end_date)}</li>
        ${e.location?`<li><strong>Lieu :</strong> ${e.location}</li>`:""}
      </ul>
      <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
      <p>Cordialement,<br>${_.name}</p>
    `;return{to:o.email,subject:a,body:r,studentName:`${o.first_name} ${o.last_name}`,enrollment:t}},prepareContractEmail:t=>{if(!e||!i||!_||!t)return null;let o=t.students;if(!o||!o.email)return null;let n=`Contrat de formation - ${i.name}`,a=`
      <p>Bonjour ${o.first_name} ${o.last_name},</p>
      <p>Veuillez trouver ci-joint votre contrat de formation pour la session "${e.name}".</p>
      <p>Cordialement,<br>${_.name}</p>
    `;return{to:o.email,subject:n,body:a,studentName:`${o.first_name} ${o.last_name}`,enrollment:t}}}}e.s(["useDocumentGeneration",()=>_],348572)}]);