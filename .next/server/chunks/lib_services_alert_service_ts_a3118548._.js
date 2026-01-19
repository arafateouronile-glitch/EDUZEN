module.exports=[737492,e=>{"use strict";var t=e.i(981838),r=e.i(338992);class a{async sendAlert(e){let{level:r,title:a,message:l,details:i={},channel:n="email",recipients:o,organizationId:s}=e;try{t.logger["critical"===r||"error"===r?"error":"warn"](`[ALERT ${r.toUpperCase()}] ${a}: ${l}`,i);let o=[];("email"===n||"both"===n)&&o.push(this.sendEmailAlert(e)),("slack"===n||"both"===n)&&o.push(this.sendSlackAlert(e)),await Promise.allSettled(o)}catch(e){t.logger.error("Failed to send alert:",e)}}async sendEmailAlert(e){let{level:a,title:l,message:i,details:n,recipients:o,organizationId:s}=e,d=[];if(0===(d=o&&o.length>0?o:await this.getAdminEmails(s)).length)return void t.logger.warn("No email recipients found for alert");let c=`[${a.toUpperCase()}] ${l}`,g=this.buildEmailContent(a,l,i,n);for(let e of d)try{await r.emailService.sendEmail({to:e,subject:c,html:g})}catch(r){t.logger.error(`Failed to send alert email to ${e}:`,r)}}async sendSlackAlert(e){let{level:r,title:a,message:l,details:i,organizationId:n}=e,o=process.env.SLACK_WEBHOOK_URL;if(!o)return void t.logger.warn("SLACK_WEBHOOK_URL not configured, skipping Slack alert");try{let e={text:`*[${r.toUpperCase()}] ${a}*`,attachments:[{color:{info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[r],fields:[{title:"Message",value:l,short:!1},...n?[{title:"Organization ID",value:n,short:!0}]:[],...i&&Object.keys(i).length>0?[{title:"Details",value:"```"+JSON.stringify(i,null,2)+"```",short:!1}]:[],{title:"Timestamp",value:new Date().toISOString(),short:!0}]}]},t=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw Error(`Slack API returned ${t.status}`)}catch(e){throw t.logger.error("Failed to send Slack alert:",e),e}}async getAdminEmails(e){let t=process.env.ADMIN_EMAILS?.split(",")||[];if(t.length>0)return t.filter(e=>e.trim().length>0);let r=process.env.SUPPORT_EMAIL;return r?[r]:[]}buildEmailContent(e,t,r,a){let l={info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[e],i=new Date().toLocaleString("fr-FR",{dateStyle:"full",timeStyle:"long"});return`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${l}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .details { background-color: white; padding: 15px; margin-top: 15px; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>[${e.toUpperCase()}] ${t}</h2>
            </div>
            <div class="content">
              <p><strong>Message:</strong></p>
              <p>${r}</p>
              ${a&&Object.keys(a).length>0?`
                <div class="details">
                  <p><strong>D\xe9tails:</strong></p>
                  <pre>${JSON.stringify(a,null,2)}</pre>
                </div>
              `:""}
            </div>
            <div class="footer">
              <p>Alert g\xe9n\xe9r\xe9e le ${i}</p>
              <p>EDUZEN - Syst\xe8me de gestion scolaire</p>
            </div>
          </div>
        </body>
      </html>
    `}async sendCriticalError(e,t){await this.sendAlert({level:"critical",title:"Erreur Critique",message:e.message,details:{error:e.name,stack:e.stack,...t},channel:"both"})}async sendSystemError(e,t){await this.sendAlert({level:"error",title:"Erreur Système",message:e,details:t,channel:"email"})}async sendWarning(e,t){await this.sendAlert({level:"warning",title:"Avertissement",message:e,details:t,channel:"email"})}async sendInfo(e,t){await this.sendAlert({level:"info",title:"Information",message:e,details:t,channel:"email"})}}let l=new a;e.s(["AlertService",()=>a,"alertService",0,l])}];

//# sourceMappingURL=lib_services_alert_service_ts_a3118548._.js.map