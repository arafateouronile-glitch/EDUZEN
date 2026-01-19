module.exports=[61356,652931,e=>{"use strict";var t,r,a=e.i(981838),n=((t={}).AUTH_REQUIRED="AUTH_1001",t.AUTH_INVALID_CREDENTIALS="AUTH_1002",t.AUTH_SESSION_EXPIRED="AUTH_1003",t.AUTH_INSUFFICIENT_PERMISSIONS="AUTH_1004",t.AUTH_2FA_REQUIRED="AUTH_1005",t.AUTH_2FA_INVALID="AUTH_1006",t.VALIDATION_ERROR="VALID_2001",t.VALIDATION_REQUIRED_FIELD="VALID_2002",t.VALIDATION_INVALID_FORMAT="VALID_2003",t.VALIDATION_UNIQUE_CONSTRAINT="VALID_2004",t.DB_CONNECTION_ERROR="DB_3001",t.DB_QUERY_ERROR="DB_3002",t.DB_NOT_FOUND="DB_3003",t.DB_CONSTRAINT_VIOLATION="DB_3004",t.DB_FOREIGN_KEY_CONSTRAINT="DB_3006",t.DB_RLS_POLICY_VIOLATION="DB_3005",t.NETWORK_ERROR="NET_4001",t.API_TIMEOUT="NET_4002",t.API_RATE_LIMIT="NET_4003",t.API_SERVER_ERROR="NET_4004",t.API_NOT_FOUND="NET_4005",t.API_BAD_REQUEST="NET_4006",t.BUSINESS_LOGIC_ERROR="BIZ_5001",t.RESOURCE_LOCKED="BIZ_5002",t.OPERATION_NOT_ALLOWED="BIZ_5003",t.QUOTA_EXCEEDED="BIZ_5004",t.INTERNAL_ERROR="SYS_6001",t.CONFIGURATION_ERROR="SYS_6002",t.SERVICE_UNAVAILABLE="SYS_6003",t);(r={}).LOW="low",r.MEDIUM="medium",r.HIGH="high",r.CRITICAL="critical";class i extends Error{code;severity;userMessage;retryable;context;originalError;constructor(e,t="SYS_6001",r="medium",a={},n){super(e),this.name="AppError",this.code=t,this.severity=r,this.userMessage=a.userMessage||this.getDefaultUserMessage(t),this.retryable=a.retryable??this.isRetryable(t),this.context={...a,code:t,severity:r,timestamp:new Date().toISOString()},this.originalError=n,Error.captureStackTrace&&Error.captureStackTrace(this,i)}getDefaultUserMessage(e){return({AUTH_1001:"Vous devez être connecté pour effectuer cette action.",AUTH_1002:"Email ou mot de passe incorrect.",AUTH_1003:"Votre session a expiré. Veuillez vous reconnecter.",AUTH_1004:"Vous n'avez pas les permissions nécessaires.",AUTH_1005:"Authentification à deux facteurs requise.",AUTH_1006:"Code d'authentification invalide.",VALID_2001:"Les données fournies ne sont pas valides.",VALID_2002:"Certains champs obligatoires sont manquants.",VALID_2003:"Le format des données est incorrect.",VALID_2004:"Cette valeur existe déjà.",DB_3001:"Impossible de se connecter à la base de données.",DB_3002:"Erreur lors de l'exécution de la requête.",DB_3003:"Ressource introuvable.",DB_3004:"Cette opération viole une contrainte de la base de données.",DB_3006:"Cette opération viole une contrainte de clé étrangère.",DB_3005:"Vous n'avez pas accès à cette ressource.",NET_4001:"Erreur de connexion réseau. Vérifiez votre connexion internet.",NET_4002:"La requête a pris trop de temps. Veuillez réessayer.",NET_4003:"Trop de requêtes. Veuillez patienter quelques instants.",NET_4004:"Erreur serveur. Veuillez réessayer plus tard.",NET_4005:"Ressource introuvable.",NET_4006:"Requête invalide.",BIZ_5001:"Cette opération n'est pas autorisée dans le contexte actuel.",BIZ_5002:"Cette ressource est actuellement verrouillée.",BIZ_5003:"Cette opération n'est pas autorisée.",BIZ_5004:"Vous avez atteint la limite autorisée.",SYS_6001:"Une erreur interne est survenue. Veuillez réessayer.",SYS_6002:"Erreur de configuration du système.",SYS_6003:"Service temporairement indisponible."})[e]||"Une erreur inattendue est survenue."}isRetryable(e){return["NET_4001","NET_4002","NET_4004","DB_3001","SYS_6003"].includes(e)}toJSON(){return{name:this.name,message:this.message,code:this.code,severity:this.severity,userMessage:this.userMessage,retryable:this.retryable,context:this.context,stack:this.stack,originalError:this.originalError instanceof Error?{name:this.originalError.name,message:this.originalError.message,stack:this.originalError.stack}:this.originalError}}}let s=new class{handleError(e,t={}){if(e instanceof i)return this.logError(e),e;if(e instanceof Error)return this.handleStandardError(e,t);if(this.isSupabaseError(e))return this.handleSupabaseError(e,t);let r=new i("Une erreur inattendue est survenue.","SYS_6001","high",t,e);return this.logError(r),r}handleStandardError(e,t){let r=e.message.toLowerCase(),a="SYS_6001",n="medium";r.includes("network")||r.includes("fetch")?(a="NET_4001",n="medium"):r.includes("timeout")?(a="NET_4002",n="medium"):r.includes("unauthorized")||r.includes("401")?(a="AUTH_1001",n="high"):r.includes("forbidden")||r.includes("403")?(a="AUTH_1004",n="high"):r.includes("not found")||r.includes("404")?(a="DB_3003",n="low"):(r.includes("validation")||r.includes("invalid"))&&(a="VALID_2001",n="low");let s=new i(e.message,a,n,t,e);return this.logError(s),s}handleSupabaseError(e,t){let r=e.code||e.status,a=e.message||"Erreur Supabase",n=t.code||"DB_3002",s="medium";if(!t.code)switch(r){case"PGRST116":case"42P01":n="DB_3003",s="low";break;case"42501":n="DB_3005",s="high";break;case"23505":n="VALID_2004",s="low";break;case"23503":n="DB_3004",s="medium";break;case"PGRST301":case"400":n="NET_4006",s="low";break;case"401":n="AUTH_1001",s="high";break;case"403":n="AUTH_1004",s="high";break;case"404":n="NET_4005",s="low";break;case"500":n="NET_4004",s="high"}"DB_3006"===n&&(s="medium");let o=new i(a,n,s,t,e);return this.logError(o),o}isSupabaseError(e){return e&&(e.code||e.status||e.message)&&("string"==typeof e.code||"number"==typeof e.status)}logError(e){let t={...e.context,code:e.code,severity:e.severity,retryable:e.retryable};switch(e.severity){case"critical":case"high":a.logger.error(e.message,e.originalError||e,t);break;case"medium":a.logger.warn(e.message,t);break;case"low":a.logger.info(`Error: ${e.message}`,t)}}createValidationError(e,t){return new i(e,"VALID_2001","low",{field:t,userMessage:e})}createAuthError(e,t){return new i(t||"Erreur d'authentification",e,"high")}createDatabaseError(e,t){return new i(e,"DB_3002","medium",{},t)}createNotFoundError(e,t){return new i(e,"DB_3003","low",t)}};e.s(["AppError",()=>i,"ErrorCode",()=>n,"errorHandler",0,s],652931),e.s([],61356)},338992,e=>{"use strict";let t=new class{async blobToBase64(e){return new Promise((t,r)=>{let a=new FileReader;a.onloadend=()=>{t(a.result.split(",")[1])},a.onerror=r,a.readAsDataURL(e)})}async sendEmail(e){try{let t=e.attachments?await Promise.all(e.attachments.map(async e=>{let t;if(e.content instanceof Blob)t=await this.blobToBase64(e.content);else if(e.content instanceof ArrayBuffer){let r=new Blob([e.content],{type:e.contentType});t=await this.blobToBase64(r)}else t=e.content;return{filename:e.filename,content:t,contentType:e.contentType}})):void 0,r=await fetch("/api/email/send",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({to:e.to,subject:e.subject,html:e.html,text:e.text,attachments:t,cc:e.cc,bcc:e.bcc,replyTo:e.replyTo})});if(!r.ok){let e=await r.json();throw Error(e.message||"Erreur lors de l'envoi de l'email")}let a=await r.json();return{success:!0,message:a.message||"Email envoyé avec succès"}}catch(e){throw Error(e instanceof Error?e.message:"Erreur lors de l'envoi de l'email")}}async sendDocument(e,t,r,a,n,i){return this.sendEmail({to:e,subject:t,html:n,text:i,attachments:[{filename:a,content:r,contentType:"application/pdf"}]})}async sendMultipleDocuments(e,t,r,a,n){return this.sendEmail({to:e,subject:t,html:a,text:n,attachments:r.map(e=>({filename:e.filename,content:e.blob,contentType:"application/pdf"}))})}};e.s(["emailService",0,t])},916637,e=>{"use strict";var t=e.i(703755);e.i(61356);var r=e.i(652931),a=e.i(981838),n=e.i(338992);let i=new class{supabase;constructor(e){this.supabase=e||(0,t.createClient)()}async createSignatureRequest(e){try{let{data:t}=await this.supabase.auth.getUser();if(!t.user)throw r.errorHandler.createAuthError(r.ErrorCode.AUTH_REQUIRED,"Utilisateur non authentifié");let{data:n,error:i}=await this.supabase.from("documents").select("id, title, file_url, organization_id").eq("id",e.documentId).single();if(i||!n)throw r.errorHandler.createNotFoundError("Document introuvable",{documentId:e.documentId});let s=this.generateSignatureToken(),o=e.expiresAt||new Date(Date.now()+2592e6).toISOString(),u={document_id:e.documentId,organization_id:e.organizationId,requester_id:t.user.id,recipient_email:e.recipientEmail,recipient_name:e.recipientName,recipient_type:e.recipientType,recipient_id:e.recipientId||null,subject:e.subject||`Demande de signature : ${n.title}`,message:e.message||null,status:"pending",signature_token:s,expires_at:o,requires_notarization:e.requiresNotarization||!1,reminder_frequency:e.reminderFrequency||"none"},{data:l,error:d}=await this.supabase.from("signature_requests").insert(u).select(`
          *,
          document:documents(id, title, file_url),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `).single();if(d)throw d;let c=this.generateSignatureUrl(s);return await this.sendSignatureRequestEmail({to:e.recipientEmail,recipientName:e.recipientName,documentTitle:n.title||"Document",signatureUrl:c,message:e.message,expiresAt:o,requesterName:t.user.user_metadata?.full_name||"Un utilisateur"}),a.logger.info("Demande de signature créée et email envoyé",{requestId:l.id,documentId:e.documentId,recipientEmail:e.recipientEmail}),l}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"createSignatureRequest",documentId:e.documentId})}}async createBulkSignatureRequests(e,t,n,i){try{let r=await Promise.allSettled(n.map(r=>this.createSignatureRequest({documentId:e,organizationId:t,recipientEmail:r.email,recipientName:r.name,recipientType:r.type,recipientId:r.id,subject:i?.subject,message:i?.message,expiresAt:i?.expiresAt}))),s=r.filter(e=>"fulfilled"===e.status),o=r.filter(e=>"rejected"===e.status);return a.logger.info("Demandes de signature en masse",{total:n.length,successful:s.length,failed:o.length}),{successful:s.map(e=>e.value),failed:o.map(e=>e.reason),total:n.length}}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"createBulkSignatureRequests",documentId:e})}}async getSignatureRequestByToken(e){try{let{data:t,error:a}=await this.supabase.from("signature_requests").select(`
          *,
          document:documents(id, title, file_url, type),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `).eq("signature_token",e).single();if(a){if("PGRST116"===a.code)throw r.errorHandler.createNotFoundError("Demande de signature introuvable",{token:e});throw a}if(t.expires_at&&new Date(t.expires_at)<new Date)throw r.errorHandler.createValidationError("La demande de signature a expiré","expires_at");return t}catch(e){if(e instanceof r.AppError)throw e;throw r.errorHandler.handleError(e,{operation:"getSignatureRequestByToken"})}}async getSignatureRequestsByDocument(e){try{let{data:t,error:r}=await this.supabase.from("signature_requests").select(`
          *,
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `).eq("document_id",e).order("created_at",{ascending:!1});if(r)throw r;return t||[]}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getSignatureRequestsByDocument",documentId:e})}}async getSignatureRequestsByOrganization(e,t){try{let r=this.supabase.from("signature_requests").select(`
          *,
          document:documents(id, title, type),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `).eq("organization_id",e);t?.status&&(r=r.eq("status",t.status)),t?.recipientType&&(r=r.eq("recipient_type",t.recipientType));let{data:a,error:n}=await r.order("created_at",{ascending:!1});if(n)throw n;return a||[]}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"getSignatureRequestsByOrganization",organizationId:e})}}async updateSignatureRequestStatus(e,t,n){try{let r={status:t};"signed"===t&&n&&(r.signature_id=n,r.signed_at=new Date().toISOString());let{data:i,error:s}=await this.supabase.from("signature_requests").update(r).eq("id",e).select().single();if(s)throw s;return a.logger.info("Statut de demande de signature mis à jour",{requestId:e,status:t}),i}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"updateSignatureRequestStatus",requestId:e})}}async cancelSignatureRequest(e){return this.updateSignatureRequestStatus(e,"cancelled")}async sendReminder(e){try{let{data:t,error:n}=await this.supabase.from("signature_requests").select(`
          *,
          document:documents(id, title, file_url),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `).eq("id",e).single();if(n||!t)throw r.errorHandler.createNotFoundError("Demande de signature introuvable",{requestId:e});if("pending"!==t.status)throw r.errorHandler.createValidationError("Impossible d'envoyer un rappel pour une demande qui n'est pas en attente","status");let i=this.generateSignatureUrl(t.signature_token);return await this.sendSignatureReminderEmail({to:t.recipient_email,recipientName:t.recipient_name,documentTitle:t.document?.title||"Document",signatureUrl:i,expiresAt:t.expires_at,requesterName:t.requester?.full_name||"Un utilisateur"}),await this.supabase.from("signature_requests").update({reminder_count:(t.reminder_count||0)+1,last_reminder_sent_at:new Date().toISOString()}).eq("id",e),a.logger.info("Rappel de signature envoyé",{requestId:e}),!0}catch(t){if(t instanceof r.AppError)throw t;throw r.errorHandler.handleError(t,{operation:"sendReminder",requestId:e})}}generateSignatureToken(){let e=Date.now().toString(36),t=Math.random().toString(36).substring(2,15),r=Math.random().toString(36).substring(2,15);return`${e}-${t}-${r}`}generateSignatureUrl(e){return`http://localhost:3000/signature/${e}`}async sendSignatureRequestEmail(e){let t=new Date(e.expiresAt).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),r=`
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
              background: #667eea;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #5568d3;
            }
            .info-box {
              background: white;
              border-left: 4px solid #667eea;
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
            <h1 style="margin: 0;">📝 Demande de signature</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${e.recipientName}</strong>,</p>

            <p>${e.requesterName} vous demande de signer le document suivant :</p>

            <div class="info-box">
              <strong>📄 ${e.documentTitle}</strong>
            </div>

            ${e.message?`<p><em>${e.message}</em></p>`:""}

            <p>Pour consulter et signer ce document, veuillez cliquer sur le bouton ci-dessous :</p>

            <div style="text-align: center;">
              <a href="${e.signatureUrl}" class="button">Signer le document</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Ou copiez ce lien dans votre navigateur :<br>
              <a href="${e.signatureUrl}" style="color: #667eea;">${e.signatureUrl}</a>
            </p>

            <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <strong>⏰ Date d'expiration :</strong> ${t}
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Cette demande de signature est conforme aux normes eIDAS et garantit la validit\xe9 juridique de votre signature \xe9lectronique.
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
            <p style="font-size: 12px;">Si vous n'\xeates pas le destinataire de ce message, veuillez l'ignorer.</p>
          </div>
        </body>
      </html>
    `,a=`
Bonjour ${e.recipientName},

${e.requesterName} vous demande de signer le document suivant :

Document : ${e.documentTitle}

${e.message?`Message : ${e.message}

`:""}

Pour consulter et signer ce document, veuillez cliquer sur ce lien :
${e.signatureUrl}

Date d'expiration : ${t}

Cette demande de signature est conforme aux normes eIDAS et garantit la validit\xe9 juridique de votre signature \xe9lectronique.

---
EDUZEN - Plateforme de gestion de formation
Si vous n'\xeates pas le destinataire de ce message, veuillez l'ignorer.
    `;await n.emailService.sendEmail({to:e.to,subject:`Demande de signature : ${e.documentTitle}`,html:r,text:a})}async sendSignatureReminderEmail(e){let t=e.expiresAt?`Expire le ${new Date(e.expiresAt).toLocaleDateString("fr-FR")}`:"",r=`
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
            <h1 style="margin: 0;">🔔 Rappel de signature</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${e.recipientName}</strong>,</p>

            <p>Ceci est un rappel concernant la demande de signature du document suivant :</p>

            <p><strong>📄 ${e.documentTitle}</strong></p>

            <p>Ce document est en attente de votre signature.</p>

            ${t?`<p style="color: #f59e0b;"><strong>⏰ ${t}</strong></p>`:""}

            <div style="text-align: center;">
              <a href="${e.signatureUrl}" class="button">Signer maintenant</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Lien de signature :<br>
              <a href="${e.signatureUrl}" style="color: #f59e0b;">${e.signatureUrl}</a>
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
          </div>
        </body>
      </html>
    `,a=`
Bonjour ${e.recipientName},

Ceci est un rappel concernant la demande de signature du document suivant :

Document : ${e.documentTitle}

Ce document est en attente de votre signature.

${t}

Pour signer ce document, veuillez cliquer sur ce lien :
${e.signatureUrl}

---
EDUZEN - Plateforme de gestion de formation
    `;await n.emailService.sendEmail({to:e.to,subject:`Rappel : Signature en attente - ${e.documentTitle}`,html:r,text:a})}};e.s(["signatureRequestService",0,i])}];

//# sourceMappingURL=lib_eb3957d0._.js.map