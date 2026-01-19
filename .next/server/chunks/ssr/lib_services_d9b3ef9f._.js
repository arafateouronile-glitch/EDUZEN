module.exports=[193767,a=>{"use strict";let b=new class{async blobToBase64(a){return new Promise((b,c)=>{let d=new FileReader;d.onloadend=()=>{b(d.result.split(",")[1])},d.onerror=c,d.readAsDataURL(a)})}async sendEmail(a){try{let b=a.attachments?await Promise.all(a.attachments.map(async a=>{let b;if(a.content instanceof Blob)b=await this.blobToBase64(a.content);else if(a.content instanceof ArrayBuffer){let c=new Blob([a.content],{type:a.contentType});b=await this.blobToBase64(c)}else b=a.content;return{filename:a.filename,content:b,contentType:a.contentType}})):void 0,c=await fetch("/api/email/send",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({to:a.to,subject:a.subject,html:a.html,text:a.text,attachments:b,cc:a.cc,bcc:a.bcc,replyTo:a.replyTo})});if(!c.ok){let a=await c.json();throw Error(a.message||"Erreur lors de l'envoi de l'email")}let d=await c.json();return{success:!0,message:d.message||"Email envoyé avec succès"}}catch(a){throw Error(a instanceof Error?a.message:"Erreur lors de l'envoi de l'email")}}async sendDocument(a,b,c,d,e,f){return this.sendEmail({to:a,subject:b,html:e,text:f,attachments:[{filename:d,content:c,contentType:"application/pdf"}]})}async sendMultipleDocuments(a,b,c,d,e){return this.sendEmail({to:a,subject:b,html:d,text:e,attachments:c.map(a=>({filename:a.filename,content:a.blob,contentType:"application/pdf"}))})}};a.s(["emailService",0,b])},418048,a=>{"use strict";var b=a.i(325383),c=a.i(193767);class d{async sendAlert(a){let{level:c,title:d,message:e,details:f={},channel:g="email",recipients:h,organizationId:i}=a;try{b.logger["critical"===c||"error"===c?"error":"warn"](`[ALERT ${c.toUpperCase()}] ${d}: ${e}`,f);let h=[];("email"===g||"both"===g)&&h.push(this.sendEmailAlert(a)),("slack"===g||"both"===g)&&h.push(this.sendSlackAlert(a)),await Promise.allSettled(h)}catch(a){b.logger.error("Failed to send alert:",a)}}async sendEmailAlert(a){let{level:d,title:e,message:f,details:g,recipients:h,organizationId:i}=a,j=[];if(0===(j=h&&h.length>0?h:await this.getAdminEmails(i)).length)return void b.logger.warn("No email recipients found for alert");let k=`[${d.toUpperCase()}] ${e}`,l=this.buildEmailContent(d,e,f,g);for(let a of j)try{await c.emailService.sendEmail({to:a,subject:k,html:l})}catch(c){b.logger.error(`Failed to send alert email to ${a}:`,c)}}async sendSlackAlert(a){let{level:c,title:d,message:e,details:f,organizationId:g}=a,h=process.env.SLACK_WEBHOOK_URL;if(!h)return void b.logger.warn("SLACK_WEBHOOK_URL not configured, skipping Slack alert");try{let a={text:`*[${c.toUpperCase()}] ${d}*`,attachments:[{color:{info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[c],fields:[{title:"Message",value:e,short:!1},...g?[{title:"Organization ID",value:g,short:!0}]:[],...f&&Object.keys(f).length>0?[{title:"Details",value:"```"+JSON.stringify(f,null,2)+"```",short:!1}]:[],{title:"Timestamp",value:new Date().toISOString(),short:!0}]}]},b=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!b.ok)throw Error(`Slack API returned ${b.status}`)}catch(a){throw b.logger.error("Failed to send Slack alert:",a),a}}async getAdminEmails(a){let b=process.env.ADMIN_EMAILS?.split(",")||[];if(b.length>0)return b.filter(a=>a.trim().length>0);let c=process.env.SUPPORT_EMAIL;return c?[c]:[]}buildEmailContent(a,b,c,d){let e={info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[a],f=new Date().toLocaleString("fr-FR",{dateStyle:"full",timeStyle:"long"});return`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${e}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .details { background-color: white; padding: 15px; margin-top: 15px; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>[${a.toUpperCase()}] ${b}</h2>
            </div>
            <div class="content">
              <p><strong>Message:</strong></p>
              <p>${c}</p>
              ${d&&Object.keys(d).length>0?`
                <div class="details">
                  <p><strong>D\xe9tails:</strong></p>
                  <pre>${JSON.stringify(d,null,2)}</pre>
                </div>
              `:""}
            </div>
            <div class="footer">
              <p>Alert g\xe9n\xe9r\xe9e le ${f}</p>
              <p>EDUZEN - Syst\xe8me de gestion scolaire</p>
            </div>
          </div>
        </body>
      </html>
    `}async sendCriticalError(a,b){await this.sendAlert({level:"critical",title:"Erreur Critique",message:a.message,details:{error:a.name,stack:a.stack,...b},channel:"both"})}async sendSystemError(a,b){await this.sendAlert({level:"error",title:"Erreur Système",message:a,details:b,channel:"email"})}async sendWarning(a,b){await this.sendAlert({level:"warning",title:"Avertissement",message:a,details:b,channel:"email"})}async sendInfo(a,b){await this.sendAlert({level:"info",title:"Information",message:a,details:b,channel:"email"})}}let e=new d;a.s(["AlertService",()=>d,"alertService",0,e])}];

//# sourceMappingURL=lib_services_d9b3ef9f._.js.map