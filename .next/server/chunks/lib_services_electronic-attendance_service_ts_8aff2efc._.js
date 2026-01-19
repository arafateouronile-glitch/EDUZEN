module.exports=[451232,e=>{"use strict";var t=e.i(703755);e.i(61356);var r=e.i(652931),a=e.i(981838),n=e.i(338992),s=e.i(725953);class i{supabase;constructor(e){this.supabase=e||(0,t.createClient)()}async getAll(e,t){try{let r={};return t?.studentId&&(r.student_id=t.studentId),t?.classId&&(r.class_id=t.classId),t?.programSessionId&&(r.session_id=t.programSessionId),t?.date&&(r.date=t.date),t?.status&&(r.status=t.status),(0,s.getAllByOrganization)(this.supabase,"attendance",e,{select:"*, students(id, first_name, last_name, student_number), classes(id, name), sessions(id, title, start_time)",filters:r,orderBy:{column:"date",ascending:!1}})}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{organizationId:e,operation:"getAll"})}}async getByClassAndDate(e,t){try{let{data:a,error:n}=await this.supabase.from("attendance").select("*, students(id, first_name, last_name, student_number)").eq("class_id",e).eq("date",t).order("students(last_name)",{ascending:!0});if(n)throw r.errorHandler.handleError(n,{operation:"getByClassAndDate",classId:e,date:t});return a||[]}catch(a){if(a instanceof r.AppError)throw a;throw r.errorHandler.handleError(a,{operation:"getByClassAndDate",classId:e,date:t})}}async getBySessionAndDate(e,t){try{let{data:a,error:n}=await this.supabase.from("attendance").select("*, students(id, first_name, last_name, student_number)").eq("session_id",e).eq("date",t).order("students(last_name)",{ascending:!0});if(n)throw r.errorHandler.handleError(n,{operation:"getBySessionAndDate",sessionId:e,date:t});return a||[]}catch(a){if(a instanceof r.AppError)throw a;throw r.errorHandler.handleError(a,{operation:"getBySessionAndDate",sessionId:e,date:t})}}async upsert(e){if(e.session_id&&(e.latitude||e.longitude)){let t=await this.validateLocation(e.session_id,e.latitude,e.longitude);if(!t.valid)throw r.errorHandler.createValidationError(t.error||"Localisation invalide","location");e.location_verified=t.verified}try{let{data:t,error:n}=await this.supabase.from("attendance").upsert(e,{onConflict:"student_id,class_id,session_id,date"}).select().single();if(n){if("42501"===n.code)throw r.errorHandler.handleError(n,{code:r.ErrorCode.DB_RLS_POLICY_VIOLATION,operation:"upsert"});throw r.errorHandler.handleError(n,{operation:"upsert",attendance:e})}return a.logger.info("Émargement créé/mis à jour avec succès",{id:t?.id,studentId:e.student_id,date:e.date}),t}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"upsert",attendance:e})}}async validateLocation(e,t,r){if(!t||!r)return{valid:!1,verified:!1,error:"Coordonnées GPS manquantes"};let{data:a,error:n}=await this.supabase.from("sessions").select("latitude, longitude, require_location_for_attendance, allowed_attendance_radius_meters").eq("id",e).single();if(n||!a)return{valid:!1,verified:!1,error:"Session non trouvée"};if(!a.require_location_for_attendance)return{valid:!0,verified:!1};if(!a.latitude||!a.longitude)return{valid:!0,verified:!1,error:"Session sans coordonnées GPS"};let s=this.calculateDistance(a.latitude,a.longitude,t,r);return a.allowed_attendance_radius_meters&&s>a.allowed_attendance_radius_meters?{valid:!1,verified:!1,error:`Vous \xeates trop loin de la session (${Math.round(s)}m, maximum: ${a.allowed_attendance_radius_meters}m)`,distance:s}:{valid:!0,verified:!0,distance:s}}calculateDistance(e,t,r,a){let n=e*Math.PI/180,s=r*Math.PI/180,i=(r-e)*Math.PI/180,o=(a-t)*Math.PI/180,d=Math.sin(i/2)*Math.sin(i/2)+Math.cos(n)*Math.cos(s)*Math.sin(o/2)*Math.sin(o/2);return 2*Math.atan2(Math.sqrt(d),Math.sqrt(1-d))*6371e3}async update(e,t){try{let{data:n,error:s}=await this.supabase.from("attendance").update(t).eq("id",e).select().single();if(s){if("PGRST116"===s.code||"42P01"===s.code)throw r.errorHandler.handleError(s,{code:r.ErrorCode.DB_NOT_FOUND,operation:"update",id:e});if("42501"===s.code)throw r.errorHandler.handleError(s,{code:r.ErrorCode.DB_RLS_POLICY_VIOLATION,operation:"update",id:e});throw r.errorHandler.handleError(s,{operation:"update",id:e,updates:t})}if(!n)throw r.errorHandler.createDatabaseError(`\xc9margement avec l'ID ${e} introuvable pour la mise \xe0 jour`,{id:e});return a.logger.info("Émargement mis à jour avec succès",{id:e,updates:t}),n}catch(a){if(a instanceof r.AppError)throw a;throw r.errorHandler.handleError(a,{operation:"update",id:e,updates:t})}}async markMultiple(e,t){let n=t.map(t=>({organization_id:e,...t,late_minutes:t.late_minutes||0}));try{if(!t||0===t.length)throw r.errorHandler.createValidationError("Aucun enregistrement à marquer","records");let{data:s,error:i}=await this.supabase.from("attendance").upsert(n,{onConflict:"student_id,class_id,session_id,date"}).select();if(i)throw r.errorHandler.handleError(i,{operation:"markMultiple",organizationId:e,count:t.length});return a.logger.info("Présences marquées en masse avec succès",{organizationId:e,count:s?.length||0}),s||[]}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"markMultiple",organizationId:e})}}async getStudentStats(e,t,a){let n=this.supabase.from("attendance").select("status, date").eq("student_id",e);t&&(n=n.gte("date",t)),a&&(n=n.lte("date",a));try{let{data:e,error:t}=await n;if(t)throw t;let r=e?.length||0,a=e?.filter(e=>"present"===e.status).length||0,s=e?.filter(e=>"absent"===e.status).length||0,i=e?.filter(e=>"late"===e.status).length||0,o=e?.filter(e=>"excused"===e.status).length||0;return{total:r,present:a,absent:s,late:i,excused:o,attendanceRate:r>0?a/r*100:0}}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getStudentStats",studentId:e})}}async getClassStats(e,t){let a=this.supabase.from("attendance").select("status").eq("class_id",e);t&&(a=a.eq("date",t));try{let{data:n,error:s}=await a;if(s)throw r.errorHandler.handleError(s,{operation:"getClassStats",classId:e,date:t});let i=n?.length||0,o=n?.filter(e=>"present"===e.status).length||0,d=n?.filter(e=>"absent"===e.status).length||0;return{total:i,present:o,absent:d,attendanceRate:i>0?o/i*100:0}}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getClassStats",classId:e})}}async saveTeacherSignature(e,t){return this.update(e,{teacher_signature_url:t})}}new i;class o{supabase;attendanceService;constructor(e){this.supabase=e||(0,t.createClient)(),this.attendanceService=new i(this.supabase)}async createAttendanceSession(e){try{let{data:t}=await this.supabase.auth.getUser();if(!t.user)throw r.errorHandler.createAuthError(r.ErrorCode.AUTH_REQUIRED,"Utilisateur non authentifié");let{data:n,error:s}=await this.supabase.from("enrollments").select("student_id, students(id, first_name, last_name, email)").eq("session_id",e.sessionId).in("status",["confirmed","active"]);if(s)throw s;let i=n?.map(e=>e.students).filter(e=>e&&e.email),o=null;e.qrCodeEnabled&&(o=this.generateQRCodeData());let d={organization_id:e.organizationId,session_id:e.sessionId,title:e.title,date:e.date,start_time:e.startTime||null,end_time:e.endTime||null,status:"draft",mode:e.mode||"electronic",require_signature:!1!==e.requireSignature,require_geolocation:e.requireGeolocation||!1,allowed_radius_meters:e.allowedRadiusMeters||100,qr_code_enabled:e.qrCodeEnabled||!1,qr_code_data:o,latitude:e.latitude||null,longitude:e.longitude||null,location_name:e.locationName||null,opens_at:e.opensAt||null,closes_at:e.closesAt||null,total_expected:i?.length||0,created_by:t.user.id},{data:l,error:c}=await this.supabase.from("electronic_attendance_sessions").insert(d).select(`
          *,
          session:sessions(id, title, start_date, end_date)
        `).single();if(c)throw c;return a.logger.info("Session d'émargement créée",{attendanceSessionId:l.id,sessionId:e.sessionId,expectedStudents:i?.length||0}),l}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"createAttendanceSession",sessionId:e.sessionId})}}async launchAttendanceSession(e,t=!0){try{let{data:n,error:s}=await this.supabase.from("electronic_attendance_sessions").select("*, session:sessions(id, title)").eq("id",e).single();if(s||!n)throw r.errorHandler.createNotFoundError("Session d'émargement introuvable",{attendanceSessionId:e});if("draft"!==n.status)throw r.errorHandler.createValidationError("La session d'émargement a déjà été lancée","status");let{data:i,error:o}=await this.supabase.from("enrollments").select("student_id, students(id, first_name, last_name, email)").eq("session_id",n.session_id).in("status",["confirmed","active"]);if(o)throw o;let d=(i?.map(e=>e.students).filter(e=>e&&e.email)||[]).map(t=>({organization_id:n.organization_id,attendance_session_id:e,student_id:t.id,student_email:t.email,student_name:`${t.first_name} ${t.last_name}`,status:"pending",signature_token:this.generateSignatureToken()})),{data:l,error:c}=await this.supabase.from("electronic_attendance_requests").insert(d).select();if(c)throw c;let{error:u}=await this.supabase.from("electronic_attendance_sessions").update({status:"active"}).eq("id",e);if(u)throw u;return t&&l&&await this.sendAttendanceRequestEmails(l,n,n.session?.title||n.title),a.logger.info("Session d'émargement lancée",{attendanceSessionId:e,requestsSent:l?.length||0,emailsSent:t}),{attendanceSession:n,requests:l}}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"launchAttendanceSession",attendanceSessionId:e})}}async getAttendanceSessionById(e){try{let{data:t,error:a}=await this.supabase.from("electronic_attendance_sessions").select(`
          *,
          session:sessions(id, title, start_date, end_date),
          requests:electronic_attendance_requests(*)
        `).eq("id",e).single();if(a){if("PGRST116"===a.code)throw r.errorHandler.createNotFoundError("Session d'émargement introuvable",{id:e});throw a}return t}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getAttendanceSessionById",id:e})}}async getAttendanceSessionsBySession(e){try{let{data:t,error:r}=await this.supabase.from("electronic_attendance_sessions").select(`
          *,
          requests:electronic_attendance_requests(
            id,
            student_name,
            student_email,
            status,
            signed_at
          )
        `).eq("session_id",e).order("date",{ascending:!1});if(r)throw r;return t||[]}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getAttendanceSessionsBySession",sessionId:e})}}async getAttendanceSessionsByOrganization(e,t){try{let r=this.supabase.from("electronic_attendance_sessions").select(`
          *,
          session:sessions(id, title),
          requests:electronic_attendance_requests(
            id,
            status
          )
        `).eq("organization_id",e);t?.status&&(r=r.eq("status",t.status)),t?.date&&(r=r.eq("date",t.date)),t?.sessionId&&(r=r.eq("session_id",t.sessionId));let{data:a,error:n}=await r.order("date",{ascending:!1});if(n)throw n;return a||[]}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getAttendanceSessionsByOrganization",organizationId:e})}}async getAttendanceRequestByToken(e){try{let{data:t,error:a}=await this.supabase.from("electronic_attendance_requests").select(`
          *,
          attendance_session:electronic_attendance_sessions(
            id,
            title,
            date,
            start_time,
            end_time,
            require_signature,
            require_geolocation,
            allowed_radius_meters,
            latitude,
            longitude,
            location_name,
            status,
            closes_at
          )
        `).eq("signature_token",e).single();if(a){if("PGRST116"===a.code)throw r.errorHandler.createNotFoundError("Demande d'émargement introuvable",{token:e});throw a}let n=t.attendance_session;if(n?.status==="closed")throw r.errorHandler.createValidationError("La session d'émargement est fermée","status");if(n?.closes_at&&new Date(n.closes_at)<new Date)throw r.errorHandler.createValidationError("La session d'émargement a expiré","closes_at");return t}catch(e){if(e instanceof r.AppError)throw e;throw r.errorHandler.handleError(e,{operation:"getAttendanceRequestByToken"})}}async signAttendanceRequest(e,t,n,s){try{let i=await this.getAttendanceRequestByToken(e);if("signed"===i.status)throw r.errorHandler.createValidationError("Cette demande a déjà été signée","status");let o=i.attendance_session,d=!1;if(o?.require_geolocation&&n){let e=await this.validateAttendanceLocation(o.latitude,o.longitude,n.latitude,n.longitude,o.allowed_radius_meters);if(!e.valid)throw r.errorHandler.createValidationError(e.error||"Localisation invalide","location");d=e.verified}let l={organization_id:i.organization_id,student_id:i.student_id,session_id:o?.session_id,date:o?.date,status:"present",signature_url:t,latitude:n?.latitude,longitude:n?.longitude,location_accuracy:n?.accuracy,location_verified:d},c=await this.attendanceService.upsert(l),{data:u,error:h}=await this.supabase.from("electronic_attendance_requests").update({status:"signed",signature_data:t,signed_at:new Date().toISOString(),attendance_id:c.id,latitude:n?.latitude||null,longitude:n?.longitude||null,location_accuracy:n?.accuracy||null,location_verified:d,ip_address:s?.ipAddress||null,user_agent:s?.userAgent||null}).eq("signature_token",e).select().single();if(h)throw h;return a.logger.info("Émargement électronique signé",{requestId:i.id,studentId:i.student_id,attendanceId:c.id,locationVerified:d}),{request:u,attendance:c}}catch(e){if(e instanceof r.AppError)throw e;throw r.errorHandler.handleError(e,{operation:"signAttendanceRequest"})}}async closeAttendanceSession(e){try{let{data:t,error:r}=await this.supabase.from("electronic_attendance_sessions").update({status:"closed"}).eq("id",e).select().single();if(r)throw r;return await this.supabase.from("electronic_attendance_requests").update({status:"expired"}).eq("attendance_session_id",e).eq("status","pending"),a.logger.info("Session d'émargement fermée",{attendanceSessionId:e}),t}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"closeAttendanceSession",attendanceSessionId:e})}}async sendAttendanceReminder(e){try{let{data:t,error:n}=await this.supabase.from("electronic_attendance_requests").select(`
          *,
          attendance_session:electronic_attendance_sessions(
            id,
            title,
            date,
            start_time,
            session:sessions(title)
          )
        `).eq("id",e).single();if(n||!t)throw r.errorHandler.createNotFoundError("Demande d'émargement introuvable",{requestId:e});if("pending"!==t.status)throw r.errorHandler.createValidationError("Impossible d'envoyer un rappel pour une demande qui n'est pas en attente","status");let s=t.attendance_session,i=this.generateAttendanceUrl(t.signature_token);return await this.sendAttendanceReminderEmail(t.student_email,t.student_name,s?.session?.title||s?.title||"Formation",s?.date,i),await this.supabase.from("electronic_attendance_requests").update({reminder_count:(t.reminder_count||0)+1,last_reminder_sent_at:new Date().toISOString()}).eq("id",e),a.logger.info("Rappel d'émargement envoyé",{requestId:e}),!0}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"sendAttendanceReminder",requestId:e})}}async validateAttendanceLocation(e,t,r,a,n=100){if(!e||!t)return{valid:!0,verified:!1,error:"Pas de coordonnées de référence"};let s=e*Math.PI/180,i=r*Math.PI/180,o=(r-e)*Math.PI/180,d=(a-t)*Math.PI/180,l=Math.sin(o/2)*Math.sin(o/2)+Math.cos(s)*Math.cos(i)*Math.sin(d/2)*Math.sin(d/2),c=2*Math.atan2(Math.sqrt(l),Math.sqrt(1-l))*6371e3;return c>n?{valid:!1,verified:!1,error:`Vous \xeates trop loin du lieu de formation (${Math.round(c)}m, maximum: ${n}m)`,distance:c}:{valid:!0,verified:!0,distance:c}}generateSignatureToken(){let e=Date.now().toString(36),t=Math.random().toString(36).substring(2,15),r=Math.random().toString(36).substring(2,15);return`att-${e}-${t}-${r}`}generateQRCodeData(){return`qr-${Date.now()}-${Math.random().toString(36).substring(2,15)}`}generateAttendanceUrl(e){return`http://localhost:3000/attendance/${e}`}async sendAttendanceRequestEmails(e,t,r){let n=await Promise.allSettled(e.map(async e=>{let a=this.generateAttendanceUrl(e.signature_token);return this.sendAttendanceRequestEmail(e.student_email,e.student_name,r,t.date,t.start_time||null,a)})),s=n.filter(e=>"fulfilled"===e.status).length,i=n.filter(e=>"rejected"===e.status).length;a.logger.info("Emails d'émargement envoyés",{total:e.length,successful:s,failed:i})}async sendAttendanceRequestEmail(e,t,r,a,s,i){let o=new Date(a).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),d=s?` \xe0 ${s}`:"",l=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .info-box {
              background: white;
              border-left: 4px solid #10b981;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">✍️ \xc9margement \xe9lectronique</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${t}</strong>,</p>

            <p>Vous \xeates invit\xe9(e) \xe0 \xe9marger \xe9lectroniquement pour la session suivante :</p>

            <div class="info-box">
              <strong>📚 ${r}</strong><br>
              <strong>📅 ${o}${d}</strong>
            </div>

            <p>Pour valider votre pr\xe9sence, veuillez cliquer sur le bouton ci-dessous :</p>

            <div style="text-align: center;">
              <a href="${i}" class="button">\xc9marger maintenant</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Ou copiez ce lien dans votre navigateur :<br>
              <a href="${i}" style="color: #10b981;">${i}</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Votre signature \xe9lectronique sera enregistr\xe9e de mani\xe8re s\xe9curis\xe9e et conforme aux normes en vigueur.
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
          </div>
        </body>
      </html>
    `,c=`
Bonjour ${t},

Vous \xeates invit\xe9(e) \xe0 \xe9marger \xe9lectroniquement pour la session suivante :

Session : ${r}
Date : ${o}${d}

Pour valider votre pr\xe9sence, veuillez cliquer sur ce lien :
${i}

Votre signature \xe9lectronique sera enregistr\xe9e de mani\xe8re s\xe9curis\xe9e et conforme aux normes en vigueur.

---
EDUZEN - Plateforme de gestion de formation
    `;await n.emailService.sendEmail({to:e,subject:`\xc9margement \xe9lectronique - ${r}`,html:l,text:c})}async sendAttendanceReminderEmail(e,t,r,a,s){let i=new Date(a).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),o=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: #f59e0b;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🔔 Rappel d'\xe9margement</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${t}</strong>,</p>

            <p>Ceci est un rappel concernant l'\xe9margement \xe9lectronique de la session :</p>

            <p><strong>📚 ${r}</strong><br>
            <strong>📅 ${i}</strong></p>

            <p>Vous n'avez pas encore valid\xe9 votre pr\xe9sence. Merci d'\xe9marger d\xe8s que possible.</p>

            <div style="text-align: center;">
              <a href="${s}" class="button">\xc9marger maintenant</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Lien d'\xe9margement :<br>
              <a href="${s}" style="color: #f59e0b;">${s}</a>
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
          </div>
        </body>
      </html>
    `,d=`
Bonjour ${t},

Ceci est un rappel concernant l'\xe9margement \xe9lectronique de la session :

Session : ${r}
Date : ${i}

Vous n'avez pas encore valid\xe9 votre pr\xe9sence. Merci d'\xe9marger d\xe8s que possible :
${s}

---
EDUZEN - Plateforme de gestion de formation
    `;await n.emailService.sendEmail({to:e,subject:`Rappel : \xc9margement en attente - ${r}`,html:o,text:d})}}let d=new o;e.s(["ElectronicAttendanceService",()=>o,"electronicAttendanceService",0,d],451232)}];

//# sourceMappingURL=lib_services_electronic-attendance_service_ts_8aff2efc._.js.map