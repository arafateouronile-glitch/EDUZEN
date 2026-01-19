module.exports=[242255,a=>{"use strict";var b=a.i(572131),c=a.i(716802),d=a.i(497895),e=a.i(789001);async function f(a){let b={fr:{title:"CONVENTION DE FORMATION PROFESSIONNELLE",between:"ENTRE",theOrganization:"L'organisme de formation",representedBy:"représenté(e) par",director:"Directeur(trice)",and:"ET",theClient:"Le client",company:"Entreprise",object:"ARTICLE 1 - OBJET",conventionObject:"La présente convention a pour objet de définir les conditions dans lesquelles",willProvide:"s'engage à dispenser la formation professionnelle suivante",program:"Programme",formation:"Intitulé de la formation",session:"Session",dates:"Dates de formation",location:"Lieu de formation",duration:"Durée",hours:"heures",schedule:"Horaires",objectives:"Objectifs pédagogiques",prerequisites:"Prérequis",targetAudience:"Public visé",terms:"ARTICLE 2 - MODALITÉS DE DÉROULEMENT",termsContent:"La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d'évaluation sont détaillés dans le programme remis au client.",financial:"ARTICLE 3 - CONDITIONS FINANCIÈRES",price:"Montant total de la formation",paymentTerms:"Modalités de paiement",paymentTermsContent:"Le paiement s'effectuera selon les modalités convenues entre les parties. Un acompte peut être demandé à la signature de la présente convention.",cancellation:"ARTICLE 4 - ANNULATION",cancellationContent:"En cas d'annulation par le client moins de 15 jours avant le début de la formation, des frais d'annulation pourront être appliqués. L'organisme de formation se réserve le droit d'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.",signature:"Signature et cachet",doneAt:"Fait à",on:"le",inDuplicate:"En double exemplaire",for:"Pour",andAccept:"et accepté"},en:{title:"PROFESSIONAL TRAINING AGREEMENT",between:"BETWEEN",theOrganization:"The training organization",representedBy:"represented by",director:"Director",and:"AND",theClient:"The client",company:"Company",object:"ARTICLE 1 - OBJECT",conventionObject:"This agreement defines the conditions under which",willProvide:"commits to provide the following professional training",program:"Program",formation:"Training title",session:"Session",dates:"Training dates",location:"Training location",duration:"Duration",hours:"hours",schedule:"Schedule",objectives:"Learning objectives",prerequisites:"Prerequisites",targetAudience:"Target audience",terms:"ARTICLE 2 - TRAINING MODALITIES",termsContent:"The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the client.",financial:"ARTICLE 3 - FINANCIAL CONDITIONS",price:"Total training amount",paymentTerms:"Payment terms",paymentTermsContent:"Payment will be made according to the terms agreed between the parties. A deposit may be required upon signing this agreement.",cancellation:"ARTICLE 4 - CANCELLATION",cancellationContent:"In case of cancellation by the client less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.",signature:"Signature and stamp",doneAt:"Done at",on:"on",inDuplicate:"In duplicate",for:"For",andAccept:"and accepted"}}[a.language||"fr"],e=(a.language,`
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
  `),f={organisation_logo:a.organization.logo_url||"",title:b.title,between:b.between,the_organization:b.theOrganization,organization_name:a.organization.name,organization_address:a.organization.address||"",organization_phone:a.organization.phone||"",organization_email:a.organization.email||"",organization_siret:a.organization.siret||"",organization_rcs:a.organization.rcs||"",organization_vat_number:a.organization.vat_number||"",and:b.and,client_name:a.client?.name||"",client_label:a.client?.name?a.client?.name?b.company:b.theClient:"",client_address:a.client?.address||"",client_phone:a.client?.phone||"",client_email:a.client?.email||"",the_client:b.theClient,object:b.object,convention_object:b.conventionObject,will_provide:b.willProvide,program:b.program,program_name:a.program?.name||"",formation:b.formation,formation_name:a.formation.name,formation_code:a.formation.code||"",session:b.session,session_name:a.session.name,dates:b.dates,session_start_date:(0,c.formatDateForDocument)(a.session.start_date),session_end_date:(0,c.formatDateForDocument)(a.session.end_date),session_start_time:a.session.start_time||"",session_end_time:a.session.end_time||"",schedule:b.schedule,location:b.location,session_location:a.session.location||"",duration:b.duration,formation_duration_hours:a.formation.duration_hours||0,hours:b.hours,objectives:b.objectives,formation_objectives:a.formation.objectives||"",prerequisites:b.prerequisites,formation_prerequisites:a.formation.prerequisites||"",target_audience:b.targetAudience,formation_target_audience:a.formation.targetAudience||"",terms:b.terms,terms_content:b.termsContent,financial:b.financial,price:b.price,formation_price:a.formation.price||0,formation_price_formatted:a.formation.price?(0,d.formatCurrency)(a.formation.price,"EUR"):"",payment_terms:b.paymentTerms,payment_terms_content:b.paymentTermsContent,cancellation:b.cancellation,cancellation_content:b.cancellationContent,signature:b.signature,director:b.director,client_name_or_label:a.client?.name||b.theClient,done_at:b.doneAt,on:b.on,issue_date:(0,c.formatDateForDocument)(a.issueDate),in_duplicate:b.inDuplicate};return await l(e,f,a.documentId,a.organizationId)}async function g(a){let b={fr:{title:"CONTRAT PARTICULIER DE FORMATION PROFESSIONNELLE",between:"ENTRE",theOrganization:"L'organisme de formation",representedBy:"représenté(e) par",director:"Directeur(trice)",and:"ET",theTrainee:"Le stagiaire",dateOfBirth:"Né(e) le",address:"Adresse",email:"Email",phone:"Téléphone",studentNumber:"N° stagiaire",nationalId:"N° pièce d'identité",object:"ARTICLE 1 - OBJET",contractObject:"La présente convention a pour objet de définir les conditions dans lesquelles",willProvide:"s'engage à dispenser la formation professionnelle suivante au stagiaire",program:"Programme",formation:"Intitulé de la formation",session:"Session",dates:"Dates de formation",location:"Lieu de formation",duration:"Durée",hours:"heures",schedule:"Horaires",objectives:"Objectifs pédagogiques",prerequisites:"Prérequis",targetAudience:"Public visé",financial:"ARTICLE 2 - CONDITIONS FINANCIÈRES",price:"Montant total de la formation",paid:"Montant payé",remaining:"Reste à payer",enrollmentDate:"Date d'inscription",paymentMethod:"Mode de paiement",paymentSchedule:"Échéancier de paiement",terms:"ARTICLE 3 - MODALITÉS DE DÉROULEMENT",termsContent:"La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d'évaluation sont détaillés dans le programme remis au stagiaire.",attendance:"ARTICLE 4 - ASSIDUITÉ",attendanceContent:"Le stagiaire s'engage à suivre assidûment la formation. En cas d'absence non justifiée, l'organisme de formation se réserve le droit de refuser la délivrance de l'attestation de formation.",cancellation:"ARTICLE 5 - ANNULATION",cancellationContent:"En cas d'annulation par le stagiaire moins de 15 jours avant le début de la formation, des frais d'annulation pourront être appliqués. L'organisme de formation se réserve le droit d'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.",signature:"Signature et cachet",doneAt:"Fait à",on:"le",inDuplicate:"En double exemplaire",for:"Pour",andAccept:"et accepté"},en:{title:"INDIVIDUAL PROFESSIONAL TRAINING CONTRACT",between:"BETWEEN",theOrganization:"The training organization",representedBy:"represented by",director:"Director",and:"AND",theTrainee:"The trainee",dateOfBirth:"Born on",address:"Address",email:"Email",phone:"Phone",studentNumber:"Trainee number",nationalId:"ID number",object:"ARTICLE 1 - OBJECT",contractObject:"This contract defines the conditions under which",willProvide:"commits to provide the following professional training to the trainee",program:"Program",formation:"Training title",session:"Session",dates:"Training dates",location:"Training location",duration:"Duration",hours:"hours",schedule:"Schedule",objectives:"Learning objectives",prerequisites:"Prerequisites",targetAudience:"Target audience",financial:"ARTICLE 2 - FINANCIAL CONDITIONS",price:"Total training amount",paid:"Amount paid",remaining:"Remaining",enrollmentDate:"Enrollment date",paymentMethod:"Payment method",paymentSchedule:"Payment schedule",terms:"ARTICLE 3 - TRAINING MODALITIES",termsContent:"The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the trainee.",attendance:"ARTICLE 4 - ATTENDANCE",attendanceContent:"The trainee undertakes to attend the training regularly. In case of unjustified absence, the training organization reserves the right to refuse the issuance of the training certificate.",cancellation:"ARTICLE 5 - CANCELLATION",cancellationContent:"In case of cancellation by the trainee less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.",signature:"Signature and stamp",doneAt:"Done at",on:"on",inDuplicate:"In duplicate",for:"For",andAccept:"and accepted"}}[a.language||"fr"],e=a.enrollment.total_amount-a.enrollment.paid_amount,f=(a.language,`
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
  `),g={organisation_logo:a.organization.logo_url||"",title:b.title,between:b.between,the_organization:b.theOrganization,organization_name:a.organization.name,organization_address:a.organization.address||"",organization_phone:a.organization.phone||"",organization_email:a.organization.email||"",organization_siret:a.organization.siret||"",organization_rcs:a.organization.rcs||"",organization_vat_number:a.organization.vat_number||"",and:b.and,the_trainee:b.theTrainee,student_first_name:a.student.first_name,student_last_name:a.student.last_name,student_date_of_birth:a.student.date_of_birth?(0,c.formatDateForDocument)(a.student.date_of_birth):"",date_of_birth:b.dateOfBirth,address:b.address,student_address:a.student.address||"",email:b.email,student_email:a.student.email||"",phone:b.phone,student_phone:a.student.phone||"",student_number_label:b.studentNumber,student_number:a.student.student_number||"",national_id:b.nationalId,student_national_id:a.student.national_id||"",object:b.object,contract_object:b.contractObject,will_provide:b.willProvide,program:b.program,program_name:a.program?.name||"",formation:b.formation,formation_name:a.formation.name,formation_code:a.formation.code||"",session:b.session,session_name:a.session.name,dates:b.dates,session_start_date:(0,c.formatDateForDocument)(a.session.start_date),session_end_date:(0,c.formatDateForDocument)(a.session.end_date),schedule:b.schedule,session_start_time:a.session.start_time||"",session_end_time:a.session.end_time||"",location:b.location,session_location:a.session.location||"",duration:b.duration,formation_duration_hours:a.formation.duration_hours||0,hours:b.hours,objectives:b.objectives,formation_objectives:a.formation.objectives||"",prerequisites:b.prerequisites,formation_prerequisites:a.formation.prerequisites||"",target_audience:b.targetAudience,formation_target_audience:a.formation.targetAudience||"",financial:b.financial,price:b.price,total_amount_formatted:(0,d.formatCurrency)(a.enrollment.total_amount,"EUR"),paid:b.paid,paid_amount_formatted:(0,d.formatCurrency)(a.enrollment.paid_amount,"EUR"),remaining:b.remaining,remaining_amount_formatted:(0,d.formatCurrency)(e,"EUR"),enrollment_date_label:b.enrollmentDate,enrollment_date:(0,c.formatDateForDocument)(a.enrollment.enrollment_date),payment_method:a.enrollment.payment_method||"",payment_method_label:b.paymentMethod,payment_schedule:a.enrollment.payment_schedule||"",payment_schedule_label:b.paymentSchedule,terms:b.terms,terms_content:b.termsContent,attendance:b.attendance,attendance_content:b.attendanceContent,cancellation:b.cancellation,cancellation_content:b.cancellationContent,signature:b.signature,director:b.director,done_at:b.doneAt,on:b.on,issue_date:(0,c.formatDateForDocument)(a.issueDate),in_duplicate:b.inDuplicate};return await l(f,g,a.documentId,a.organizationId)}async function h(a){let b={fr:{title:"CONVOCATION À UNE FORMATION",dear:"Madame, Monsieur",weInform:"Nous vous informons que vous êtes convoqué(e) à la session de formation suivante",program:"Programme",formation:"Formation",session:"Session",dates:"Dates",times:"Horaires",location:"Lieu",contact:"Pour toute information complémentaire, vous pouvez nous contacter",seeYou:"Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",bestRegards:"Cordialement",signature:"Signature et cachet",doneAt:"Fait à",on:"le"},en:{title:"TRAINING INVITATION",dear:"Dear Sir/Madam",weInform:"We inform you that you are invited to the following training session",program:"Program",formation:"Training",session:"Session",dates:"Dates",times:"Schedule",location:"Location",contact:"For any additional information, you can contact us",seeYou:"Yours sincerely",bestRegards:"Best regards",signature:"Signature and stamp",doneAt:"Done at",on:"on"}}[a.language||"fr"],d=(a.language,`
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
  `),e={organisation_logo:a.organization.logo_url||"",title:b.title,organization_name:a.organization.name,organization_address:a.organization.address||"",organization_phone:a.organization.phone||"",organization_email:a.organization.email||"",student_first_name:a.student.first_name,student_last_name:a.student.last_name,student_email:a.student.email||"",student_phone:a.student.phone||"",dear:b.dear,we_inform:b.weInform,program:b.program,program_name:a.program?.name||"",formation:b.formation,formation_name:a.formation.name,formation_code:a.formation.code||"",session:b.session,session_name:a.session.name,dates:b.dates,session_start_date:(0,c.formatDateForDocument)(a.session.start_date),session_end_date:(0,c.formatDateForDocument)(a.session.end_date),times:b.times,session_start_time:a.session.start_time||"",session_end_time:a.session.end_time||"",location:b.location,session_location:a.session.location||"",contact:b.contact,see_you:b.seeYou,best_regards:b.bestRegards,signature:b.signature,done_at:b.doneAt,on:b.on,issue_date:(0,c.formatDateForDocument)(a.issueDate)};return await l(d,e,a.documentId,a.organizationId)}async function i(a){let b={fr:{title:"PROGRAMME DE FORMATION",subtitle:"Description du programme",program:"Programme",formation:"Formation",code:"Code",duration:"Durée",hours:"heures",objectives:"Objectifs pédagogiques",content:"Contenu de la formation",learnerProfile:"Profil des apprenants",doneAt:"Fait à",on:"le"},en:{title:"TRAINING PROGRAM",subtitle:"Program description",program:"Program",formation:"Training",code:"Code",duration:"Duration",hours:"hours",objectives:"Pedagogical objectives",content:"Training content",learnerProfile:"Learner profile",doneAt:"Done at",on:"on"}}[a.language||"fr"],d=(a.language,`
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
  `),e={organisation_logo:a.organization.logo_url||"",title:b.title,subtitle:b.subtitle,program:b.program,program_name:a.program.name,program_description:a.program.description||"",formation:b.formation,formation_name:a.formation.name,formation_subtitle:a.formation.subtitle||"",code:b.code,formation_code:a.formation.code||"",duration:b.duration,formation_duration_hours:a.formation.duration_hours||0,hours:b.hours,objectives:b.objectives,formation_objectives:a.formation.objectives||"",content:b.content,formation_content:a.formation.content||"",learner_profile:b.learnerProfile,formation_learner_profile:a.formation.learner_profile||"",organization_name:a.organization.name,organization_address:a.organization.address||"",organization_phone:a.organization.phone||"",organization_email:a.organization.email||"",done_at:b.doneAt,on:b.on,issue_date:(0,c.formatDateForDocument)(a.issueDate)};return await l(d,e,a.documentId,a.organizationId)}async function j(a){let b={fr:{title:"CONDITIONS GÉNÉRALES DE VENTE",subtitle:"CGV",intro:"Les présentes Conditions Générales de Vente régissent les relations entre",and:"et les clients pour tous les services de formation proposés.",doneAt:"Fait à",on:"le"},en:{title:"TERMS AND CONDITIONS",subtitle:"T&C",intro:"These Terms and Conditions govern the relationship between",and:"and customers for all training services offered.",doneAt:"Done at",on:"on"}}[a.language||"fr"],d=(a.language,`
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
  `),e={organisation_logo:a.organization.logo_url||"",title:b.title,subtitle:b.subtitle,intro:b.intro,organization_name:a.organization.name,and:b.and,organization_address:a.organization.address||"",organization_phone:a.organization.phone||"",organization_email:a.organization.email||"",done_at:b.doneAt,on:b.on,issue_date:(0,c.formatDateForDocument)(a.issueDate)};return await l(d,e,a.documentId,a.organizationId)}async function k(a){let b={fr:{title:"POLITIQUE DE CONFIDENTIALITÉ",subtitle:"Protection des données personnelles",intro:"La présente Politique de Confidentialité décrit comment",collects:"collecte, utilise et protège vos données personnelles.",doneAt:"Fait à",on:"le"},en:{title:"PRIVACY POLICY",subtitle:"Personal data protection",intro:"This Privacy Policy describes how",collects:"collects, uses and protects your personal data.",doneAt:"Done at",on:"on"}}[a.language||"fr"],d=(a.language,`
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
  `),e={organisation_logo:a.organization.logo_url||"",title:b.title,subtitle:b.subtitle,intro:b.intro,organization_name:a.organization.name,collects:b.collects,organization_address:a.organization.address||"",organization_phone:a.organization.phone||"",organization_email:a.organization.email||"",done_at:b.doneAt,on:b.on,issue_date:(0,c.formatDateForDocument)(a.issueDate)};return await l(d,e,a.documentId,a.organizationId)}async function l(a,b,c,d){let f={id:c||"temp",name:"Template",type:"convention",content:{pageSize:"A4",margins:{top:20,right:20,bottom:20,left:20},elements:[{type:"html",html:a}]},header:null,footer:null,header_enabled:!1,footer_enabled:!1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),organization_id:d||""};return(await (0,e.generateHTML)(f,b,c,d)).html}var m=a.i(864037),n=a.i(325383),o=a.i(193767);function p({sessionData:a,formation:e,program:l,organization:p}){let{addToast:q}=(0,m.useToast)(),[r,s]=(0,b.useState)(!1),[t,u]=(0,b.useState)({current:0,total:0}),[v,w]=(0,b.useState)(null),x=async b=>{if(!a||!e||!p||!b)return;let f=b.students;if(!f||!f.email)return void q({type:"error",title:"Erreur",description:"L'étudiant n'a pas d'adresse email."});try{let b=await h({student:{first_name:f.first_name,last_name:f.last_name,email:f.email||void 0,phone:f.phone||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,start_time:a.start_time||void 0,end_time:a.end_time||void 0,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),g=document.createElement("div");g.innerHTML=b,g.style.position="absolute",g.style.left="-9999px",document.body.appendChild(g);let i=g.querySelector('[id$="-document"]');if(!i)throw document.body.removeChild(g),Error("Élément de document non trouvé");i.id=`temp-convocation-email-${Date.now()}`,await new Promise(a=>setTimeout(a,500));let j=await (0,c.generatePDFBlobFromHTML)(i.id);document.body.removeChild(g);let k=`Convocation - ${a.name}`,m=`
        <p>Bonjour ${f.first_name} ${f.last_name},</p>
        <p>Vous \xeates convoqu\xe9(e) pour la session de formation suivante :</p>
        <ul>
          <li><strong>Formation :</strong> ${e.name}</li>
          <li><strong>Session :</strong> ${a.name}</li>
          <li><strong>Date de d\xe9but :</strong> ${(0,d.formatDate)(a.start_date)}</li>
          <li><strong>Date de fin :</strong> ${(0,d.formatDate)(a.end_date)}</li>
          ${a.location?`<li><strong>Lieu :</strong> ${a.location}</li>`:""}
        </ul>
        <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
        <p>Cordialement,<br>${p.name}</p>
      `;await o.emailService.sendDocument(f.email,k,j,`convocation_${f.last_name}_${f.first_name}.pdf`,m),q({type:"success",title:"Email envoyé",description:`La convocation a \xe9t\xe9 envoy\xe9e \xe0 ${f.email}.`})}catch(a){n.logger.error("Erreur lors de l'envoi de la convocation par email",a,{enrollmentId:b.id,studentId:b.student_id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},y=async b=>{if(!a||!e||!p)return;let c=b.filter(a=>a.students&&a.students.email&&"cancelled"!==a.status);if(0===c.length)return void q({type:"error",title:"Erreur",description:"Aucun étudiant avec une adresse email valide trouvé."});s(!0),u({current:0,total:c.length});try{let a=0,b=0;for(let d of c){try{await x(d),a++}catch(a){b++,n.logger.error("Erreur lors de l'envoi de la convocation",a,{enrollmentId:d.id})}u(a=>({...a,current:a.current+1}))}q({type:a>0?"success":"error",title:"Envoi terminé",description:`${a} email(s) envoy\xe9(s) avec succ\xe8s${b>0?`, ${b} erreur(s)`:""}.`})}catch(a){n.logger.error("Erreur lors de l'envoi groupé des convocations",a),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi groupé."})}finally{s(!1),u({current:0,total:0})}};return{isGeneratingZip:r,zipGenerationProgress:t,lastZipGeneration:v,handleGenerateConvention:async()=>{if(!a||!e||!p)return void q({type:"error",title:"Erreur",description:"Données manquantes pour générer la convention."});try{let b=await f({session:{name:a.name,start_date:a.start_date,end_date:a.end_date,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0,price:e.price||void 0,duration_hours:e.duration_hours||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),d=document.createElement("div");d.innerHTML=b,d.style.position="absolute",d.style.left="-9999px",document.body.appendChild(d);let g=d.querySelector('[id$="-document"]');g&&(g.id=`temp-convention-${Date.now()}`,await new Promise(a=>setTimeout(a,500)),await (0,c.generatePDFFromHTML)(g.id,`convention_${a.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(d),q({type:"success",title:"Convention générée",description:"La convention a été générée et téléchargée avec succès."})}catch(b){n.logger.error("Erreur lors de la génération de la convention",b,{sessionId:a?.id,formationId:e?.id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération de la convention."})}},handleGenerateContract:async b=>{if(!a||!e||!p||!b)return;let d=b.students;if(d)try{let f=await g({student:{first_name:d.first_name,last_name:d.last_name,email:d.email||void 0,phone:d.phone||void 0,address:d.address||void 0,date_of_birth:d.date_of_birth||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0,price:e.price||void 0,duration_hours:e.duration_hours||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},enrollment:{enrollment_date:b.enrollment_date||"",total_amount:b.total_amount||0,paid_amount:b.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),h=document.createElement("div");h.innerHTML=f,h.style.position="absolute",h.style.left="-9999px",document.body.appendChild(h);let i=h.querySelector('[id$="-document"]');i&&(i.id=`temp-contract-${Date.now()}`,await new Promise(a=>setTimeout(a,500)),await (0,c.generatePDFFromHTML)(i.id,`contrat_${d.last_name}_${d.first_name}.pdf`)),document.body.removeChild(h),q({type:"success",title:"Contrat généré",description:"Le contrat a été généré et téléchargé avec succès."})}catch(a){n.logger.error("Erreur lors de la génération du contrat",a,{enrollmentId:b.id,studentId:b.student_id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du contrat."})}},handleGenerateConvocation:async b=>{if(!a||!e||!p||!b)return;let d=b.students;if(d)try{let b=await h({student:{first_name:d.first_name,last_name:d.last_name,email:d.email||void 0,phone:d.phone||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,start_time:a.start_time||void 0,end_time:a.end_time||void 0,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),f=document.createElement("div");f.innerHTML=b,f.style.position="absolute",f.style.left="-9999px",document.body.appendChild(f);let g=f.querySelector('[id$="-document"]');g&&(g.id=`temp-convocation-${Date.now()}`,await new Promise(a=>setTimeout(a,500)),await (0,c.generatePDFFromHTML)(g.id,`convocation_${d.last_name}_${d.first_name}.pdf`)),document.body.removeChild(f),q({type:"success",title:"Convocation générée",description:"La convocation a été générée et téléchargée avec succès."})}catch(a){n.logger.error("Erreur lors de la génération de la convocation",a,{enrollmentId:b.id,studentId:b.student_id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération de la convocation."})}},handleGenerateProgram:async()=>{if(a&&e&&l&&p)try{let a=await i({program:{name:l.name},formation:{name:e.name,code:e.code||void 0},organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),b=document.createElement("div");b.innerHTML=a,b.style.position="absolute",b.style.left="-9999px",document.body.appendChild(b);let d=b.querySelector('[id$="-document"]');d&&(d.id=`temp-program-${Date.now()}`,await new Promise(a=>setTimeout(a,500)),await (0,c.generatePDFFromHTML)(d.id,`programme_${l.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(b),q({type:"success",title:"Programme généré",description:"Le programme a été généré et téléchargé avec succès."})}catch(a){n.logger.error("Erreur lors de la génération du programme",a),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du programme."})}},handleGenerateTerms:async()=>{if(p)try{let a=await j({organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),b=document.createElement("div");b.innerHTML=a,b.style.position="absolute",b.style.left="-9999px",document.body.appendChild(b);let d=b.querySelector('[id$="-document"]');d&&(d.id=`temp-terms-${Date.now()}`,await new Promise(a=>setTimeout(a,500)),await (0,c.generatePDFFromHTML)(d.id,`cgv_${p.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(b),q({type:"success",title:"CGV générée",description:"Les conditions générales de vente ont été générées avec succès."})}catch(a){n.logger.error("Erreur lors de la génération des CGV",a),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération des CGV."})}},handleGeneratePrivacyPolicy:async()=>{if(p)try{let a=await k({organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),b=document.createElement("div");b.innerHTML=a,b.style.position="absolute",b.style.left="-9999px",document.body.appendChild(b);let d=b.querySelector('[id$="-document"]');d&&(d.id=`temp-privacy-${Date.now()}`,await new Promise(a=>setTimeout(a,500)),await (0,c.generatePDFFromHTML)(d.id,`politique_confidentialite_${p.name.replace(/\s+/g,"_")}.pdf`)),document.body.removeChild(b),q({type:"success",title:"Politique générée",description:"La politique de confidentialité a été générée avec succès."})}catch(a){n.logger.error("Erreur lors de la génération de la politique de confidentialité",a),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération de la politique de confidentialité."})}},handleGenerateAllConventionsZip:async b=>{if(a&&e&&p){s(!0),u({current:0,total:b.length+1});try{let d=[],h=await f({session:{name:a.name,start_date:a.start_date,end_date:a.end_date,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0,price:e.price||void 0,duration_hours:e.duration_hours||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),i=document.createElement("div");i.innerHTML=h,i.style.position="absolute",i.style.left="-9999px",document.body.appendChild(i);let j=i.querySelector('[id$="-document"]');if(j){j.id=`temp-convention-zip-${Date.now()}`,await new Promise(a=>setTimeout(a,500));let a=await (0,c.generatePDFBlobFromHTML)(j.id);d.push({name:"convention_generale.pdf",blob:a})}for(let f of(document.body.removeChild(i),u(a=>({...a,current:a.current+1})),b)){let b=f.students;if(!b)continue;let h=await g({student:{first_name:b.first_name,last_name:b.last_name,email:b.email||void 0,phone:b.phone||void 0,address:b.address||void 0,date_of_birth:b.date_of_birth||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0,price:e.price||void 0,duration_hours:e.duration_hours||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},enrollment:{enrollment_date:f.enrollment_date||"",total_amount:f.total_amount||0,paid_amount:f.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),i=document.createElement("div");i.innerHTML=h,i.style.position="absolute",i.style.left="-9999px",document.body.appendChild(i);let j=i.querySelector('[id$="-document"]');if(j){j.id=`temp-contract-zip-${Date.now()}-${f.id}`,await new Promise(a=>setTimeout(a,500));let a=await (0,c.generatePDFBlobFromHTML)(j.id);d.push({name:`contrat_${b.last_name}_${b.first_name}.pdf`,blob:a})}document.body.removeChild(i),u(a=>({...a,current:a.current+1}))}await (0,c.createZipFromPDFs)(d,`conventions_contrats_${a.name.replace(/\s+/g,"_")}.zip`),w(new Date),q({type:"success",title:"ZIP généré",description:`Le fichier ZIP contenant ${d.length} document(s) a \xe9t\xe9 g\xe9n\xe9r\xe9 avec succ\xe8s.`})}catch(a){n.logger.error("Erreur lors de la génération du ZIP",a,{type:"conventions",count:b?.length||0}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du ZIP."})}finally{s(!1),u({current:0,total:0})}}},handleGenerateAllConvocationsZip:async b=>{if(a&&e&&p){s(!0),u({current:0,total:b.length});try{let d=[];for(let f of b){let b=f.students;if(!b)continue;let g=await h({student:{first_name:b.first_name,last_name:b.last_name,email:b.email||void 0,phone:b.phone||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,start_time:a.start_time||void 0,end_time:a.end_time||void 0,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),i=document.createElement("div");i.innerHTML=g,i.style.position="absolute",i.style.left="-9999px",document.body.appendChild(i);let j=i.querySelector('[id$="-document"]');if(j){j.id=`temp-convocation-zip-${Date.now()}-${f.id}`,await new Promise(a=>setTimeout(a,500));let a=await (0,c.generatePDFBlobFromHTML)(j.id);d.push({name:`convocation_${b.last_name}_${b.first_name}.pdf`,blob:a})}document.body.removeChild(i),u(a=>({...a,current:a.current+1}))}await (0,c.createZipFromPDFs)(d,`convocations_${a.name.replace(/\s+/g,"_")}.zip`),w(new Date),q({type:"success",title:"ZIP généré",description:`Le fichier ZIP contenant ${d.length} convocation(s) a \xe9t\xe9 g\xe9n\xe9r\xe9 avec succ\xe8s.`})}catch(a){n.logger.error("Erreur lors de la génération du ZIP",a,{type:"conventions",count:b?.length||0}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la génération du ZIP."})}finally{s(!1),u({current:0,total:0})}}},handleGenerateSessionReport:async()=>{q({type:"info",title:"Fonctionnalité à venir",description:"La génération du rapport de session sera implémentée prochainement."})},handleGenerateCertificate:async a=>{q({type:"info",title:"Fonctionnalité à venir",description:"La génération de certificat sera implémentée prochainement."})},handleSendConvocationByEmail:x,handleSendConvocationByEmailWithCustomContent:async(b,d,f)=>{if(!a||!e||!p||!b)return;let g=b.students;if(!g)return void q({type:"error",title:"Erreur",description:"Données étudiant manquantes."});try{let b=await h({student:{first_name:g.first_name,last_name:g.last_name,email:g.email||void 0,phone:g.phone||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,start_time:a.start_time||void 0,end_time:a.end_time||void 0,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},issueDate:new Date().toISOString(),language:"fr"}),i=document.createElement("div");i.innerHTML=b,i.style.position="absolute",i.style.left="-9999px",document.body.appendChild(i);let j=i.querySelector('[id$="-document"]');if(!j)throw document.body.removeChild(i),Error("Élément de document non trouvé");j.id=`temp-convocation-email-${Date.now()}`,await new Promise(a=>setTimeout(a,500));let k=await (0,c.generatePDFBlobFromHTML)(j.id);document.body.removeChild(i);let m=f.replace(/\n/g,"<br>");await o.emailService.sendDocument(g.email||"",d,k,`convocation_${g.last_name}_${g.first_name}.pdf`,m),q({type:"success",title:"Email envoyé",description:`La convocation a \xe9t\xe9 envoy\xe9e \xe0 ${g.email||"l'adresse spécifiée"}.`})}catch(a){n.logger.error("Erreur lors de l'envoi de la convocation par email",a,{enrollmentId:b.id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},handleSendAllConvocationsByEmail:y,handleSendContractByEmail:async b=>{if(!a||!e||!p||!b)return;let d=b.students;if(!d||!d.email)return void q({type:"error",title:"Erreur",description:"L'étudiant n'a pas d'adresse email."});try{let f=await g({student:{first_name:d.first_name,last_name:d.last_name,email:d.email||void 0,phone:d.phone||void 0,address:d.address||void 0,date_of_birth:d.date_of_birth||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0,price:e.price||void 0,duration_hours:e.duration_hours||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},enrollment:{enrollment_date:b.enrollment_date||"",total_amount:b.total_amount||0,paid_amount:b.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),h=document.createElement("div");h.innerHTML=f,h.style.position="absolute",h.style.left="-9999px",document.body.appendChild(h);let i=h.querySelector('[id$="-document"]');if(!i)throw document.body.removeChild(h),Error("Élément de document non trouvé");i.id=`temp-contract-email-${Date.now()}`,await new Promise(a=>setTimeout(a,500));let j=await (0,c.generatePDFBlobFromHTML)(i.id);document.body.removeChild(h);let k=`Contrat de formation - ${e.name}`,m=`
        <p>Bonjour ${d.first_name} ${d.last_name},</p>
        <p>Veuillez trouver ci-joint votre contrat de formation pour la session "${a.name}".</p>
        <p>Cordialement,<br>${p.name}</p>
      `;await o.emailService.sendDocument(d.email,k,j,`contrat_${d.last_name}_${d.first_name}.pdf`,m),q({type:"success",title:"Email envoyé",description:`Le contrat a \xe9t\xe9 envoy\xe9 \xe0 ${d.email}.`})}catch(a){n.logger.error("Erreur lors de l'envoi du contrat par email",a,{enrollmentId:b.id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},handleSendContractByEmailWithCustomContent:async(b,d,f)=>{if(!a||!e||!p||!b)return;let h=b.students;if(!h)return void q({type:"error",title:"Erreur",description:"Données étudiant manquantes."});try{let i=await g({student:{first_name:h.first_name,last_name:h.last_name,email:h.email||void 0,phone:h.phone||void 0,address:h.address||void 0,date_of_birth:h.date_of_birth||void 0},session:{name:a.name,start_date:a.start_date,end_date:a.end_date,location:a.location||void 0},formation:{name:e.name,code:e.code||void 0,price:e.price||void 0,duration_hours:e.duration_hours||void 0},program:l?{name:l.name}:void 0,organization:{name:p.name,address:p.address||void 0,phone:p.phone||void 0,email:p.email||void 0,logo_url:p.logo_url||void 0},enrollment:{enrollment_date:b.enrollment_date||"",total_amount:b.total_amount||0,paid_amount:b.paid_amount||0},issueDate:new Date().toISOString(),language:"fr"}),j=document.createElement("div");j.innerHTML=i,j.style.position="absolute",j.style.left="-9999px",document.body.appendChild(j);let k=j.querySelector('[id$="-document"]');if(!k)throw document.body.removeChild(j),Error("Élément de document non trouvé");k.id=`temp-contract-email-${Date.now()}`,await new Promise(a=>setTimeout(a,500));let m=await (0,c.generatePDFBlobFromHTML)(k.id);document.body.removeChild(j);let n=f.replace(/\n/g,"<br>");await o.emailService.sendDocument(h.email||"",d,m,`contrat_${h.last_name}_${h.first_name}.pdf`,n),q({type:"success",title:"Email envoyé",description:`Le contrat a \xe9t\xe9 envoy\xe9 \xe0 ${h.email||"l'adresse spécifiée"}.`})}catch(a){n.logger.error("Erreur lors de l'envoi du contrat par email",a,{enrollmentId:b.id}),q({type:"error",title:"Erreur",description:"Une erreur est survenue lors de l'envoi de l'email."})}},prepareConvocationEmail:b=>{if(!a||!e||!p||!b)return null;let c=b.students;if(!c||!c.email)return null;let f=`Convocation - ${a.name}`,g=`
      <p>Bonjour ${c.first_name} ${c.last_name},</p>
      <p>Vous \xeates convoqu\xe9(e) pour la session de formation suivante :</p>
      <ul>
        <li><strong>Formation :</strong> ${e.name}</li>
        <li><strong>Session :</strong> ${a.name}</li>
        <li><strong>Date de d\xe9but :</strong> ${(0,d.formatDate)(a.start_date)}</li>
        <li><strong>Date de fin :</strong> ${(0,d.formatDate)(a.end_date)}</li>
        ${a.location?`<li><strong>Lieu :</strong> ${a.location}</li>`:""}
      </ul>
      <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
      <p>Cordialement,<br>${p.name}</p>
    `;return{to:c.email,subject:f,body:g,studentName:`${c.first_name} ${c.last_name}`,enrollment:b}},prepareContractEmail:b=>{if(!a||!e||!p||!b)return null;let c=b.students;if(!c||!c.email)return null;let d=`Contrat de formation - ${e.name}`,f=`
      <p>Bonjour ${c.first_name} ${c.last_name},</p>
      <p>Veuillez trouver ci-joint votre contrat de formation pour la session "${a.name}".</p>
      <p>Cordialement,<br>${p.name}</p>
    `;return{to:c.email,subject:d,body:f,studentName:`${c.first_name} ${c.last_name}`,enrollment:b}}}}a.s(["useDocumentGeneration",()=>p],242255)}];

//# sourceMappingURL=b33f8_%28dashboard%29_dashboard_sessions_%5Bid%5D_hooks_use-document-generation_ts_5493718e._.js.map