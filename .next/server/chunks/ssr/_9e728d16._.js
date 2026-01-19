module.exports=[400210,a=>{"use strict";let b=(0,a.i(170106).default)("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);a.s(["ArrowLeft",()=>b],400210)},641710,a=>{"use strict";let b=(0,a.i(170106).default)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);a.s(["Clock",()=>b],641710)},555074,a=>{"use strict";var b=a.i(269240);let c=async(a,b)=>(console.warn("videoconferenceService.createMeetingForSession not implemented"),null),d=new class{supabase;constructor(a){this.supabase=a||(0,b.createClient)()}async getAllSessions(a,b){let c=this.supabase.from("sessions").select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `).eq("formations.organization_id",a);b?.formationId&&(c=c.eq("formation_id",b.formationId)),b?.status&&(c=c.eq("status",b.status)),b?.startDate&&(c=c.gte("start_date",b.startDate)),b?.endDate&&(c=c.lte("end_date",b.endDate)),b?.search&&(c=c.ilike("name",`%${b.search}%`));let{data:d,error:e}=await c.order("start_date",{ascending:!0});if(e)throw e;return d}async getSessionById(a){let{data:b,error:c}=await this.supabase.from("sessions").select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `).eq("id",a).single();if(c)throw c;let{data:d,error:e}=await this.supabase.from("session_programs").select(`
        program_id,
        programs(*)
      `).eq("session_id",a);if(e)throw e;return{...b,session_programs:d?.map(a=>a.programs).filter(Boolean)||[]}}async createSession(a,b,c){if(a.formation_id){let{data:b,error:c}=await this.supabase.from("formations").select("id, organization_id").eq("id",a.formation_id).single();if(c)throw console.error("Erreur lors de la vérification de la formation:",c),Error(`Formation non trouv\xe9e: ${c.message}`);if(!b)throw Error("Formation non trouvée");console.log("Formation trouvée:",b)}let{data:d,error:e}=await this.supabase.from("sessions").insert(a).select().single();if(e)throw console.error("Erreur RLS lors de la création de la session:",{code:e.code,message:e.message,details:e.details,hint:e.hint,formation_id:a.formation_id}),e;if(b&&b.length>0&&d){let{data:a}=await this.supabase.from("formations").select("organization_id").eq("id",d.formation_id).single();if(a){let c=b.map(b=>({session_id:d.id,program_id:b,organization_id:a.organization_id})),{error:e}=await this.supabase.from("session_programs").insert(c);e&&console.error("Erreur lors de la création des associations session-programme:",e),a.organization_id&&await this.syncWithCalendars(d.id,a.organization_id,"create").catch(a=>{console.error("Erreur lors de la synchronisation calendrier:",a)}),a.organization_id&&await this.createVideoconferenceMeeting(d.id,a.organization_id).catch(a=>{console.error("Erreur lors de la création de la réunion visioconférence:",a)})}}return console.log("Session créée avec succès:",d),d}async updateSessionPrograms(a,b,c){let{error:d}=await this.supabase.from("session_programs").delete().eq("session_id",a);if(d)throw d;if(b.length>0){let d=b.map(b=>({session_id:a,program_id:b,organization_id:c})),{error:e}=await this.supabase.from("session_programs").insert(d);if(e)throw e}return!0}async getSessionPrograms(a){let{data:b,error:c}=await this.supabase.from("session_programs").select(`
        program_id,
        programs(*)
      `).eq("session_id",a);if(c)throw c;return b?.map(a=>a.programs).filter(Boolean)||[]}async updateSession(a,b){let{data:c}=await this.supabase.from("sessions").select("formation_id, formations(organization_id)").eq("id",a).single(),{data:d,error:e}=await this.supabase.from("sessions").update(b).eq("id",a).select().single();if(e)throw e;let f=c?.formations;return c&&f?.organization_id&&await this.syncWithCalendars(a,f.organization_id,"update").catch(a=>{console.error("Erreur lors de la synchronisation calendrier:",a)}),d}async deleteSession(a){let{data:b}=await this.supabase.from("sessions").select("formation_id, formations(organization_id)").eq("id",a).single(),c=b?.formations;b&&c?.organization_id&&await this.syncWithCalendars(a,c.organization_id,"delete").catch(a=>{console.error("Erreur lors de la suppression de l'événement calendrier:",a)});let{error:d}=await this.supabase.from("sessions").delete().eq("id",a);if(d)throw d}async createVideoconferenceMeeting(a,b){let{data:d}=await this.supabase.from("videoconference_integrations").select("*").eq("organization_id",b).eq("is_active",!0).eq("auto_create_meetings",!0);if(d&&0!==d.length)for(let e of d)try{await c(a,{organizationId:b,provider:e.provider})}catch(a){console.error(`Erreur lors de la cr\xe9ation de r\xe9union avec ${e.provider}:`,a)}}async syncWithCalendars(a,b,c){let{data:d}=await this.supabase.from("calendar_integrations").select("*").eq("organization_id",b).eq("is_active",!0).eq("sync_sessions",!0).eq("create_events_for_sessions",!0);if(d&&0!==d.length)for(let a of d)try{console.warn(`Calendar sync for ${c} not implemented yet for provider ${a.provider}`)}catch(b){console.error(`Erreur lors de la synchronisation avec ${a.provider}:`,b)}}async getUpcomingSessions(a,b=10){let c=new Date().toISOString().split("T")[0],{data:d,error:e}=await this.supabase.from("sessions").select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `).eq("formations.organization_id",a).gte("start_date",c).eq("status","planned").order("start_date",{ascending:!0}).limit(b);if(e)throw e;return d}async getOngoingSessions(a){let b=new Date().toISOString().split("T")[0],{data:c,error:d}=await this.supabase.from("sessions").select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `).eq("formations.organization_id",a).lte("start_date",b).gte("end_date",b).eq("status","ongoing").order("start_date",{ascending:!0});if(d)throw d;return c}async addSessionToFormations(a,b,c){let d=b.map((b,d)=>({session_id:a,formation_id:b,organization_id:c,order_index:d})),{data:e,error:f}=await this.supabase.from("formation_sessions").insert(d).select();if(f)throw f;return e}async removeSessionFromFormation(a,b){let{error:c}=await this.supabase.from("formation_sessions").delete().eq("session_id",a).eq("formation_id",b);if(c)throw c;return!0}async updateSessionFormations(a,b,c){let{error:d}=await this.supabase.from("formation_sessions").delete().eq("session_id",a);if(d)throw d;return b.length>0?this.addSessionToFormations(a,b,c):[]}async getSessionFormations(a){let{data:b,error:c}=await this.supabase.from("formation_sessions").select(`
        formation_id,
        order_index,
        formations(*)
      `).eq("session_id",a).order("order_index",{ascending:!0});if(c)throw c;return b?.map(a=>a.formations).filter(Boolean)||[]}async getFormationSessions(a){let{data:b,error:c}=await this.supabase.from("formation_sessions").select(`
        session_id,
        order_index,
        sessions(*)
      `).eq("formation_id",a).order("order_index",{ascending:!0});if(c)throw c;return b?.map(a=>a.sessions).filter(Boolean)||[]}async createIndependentSession(a,b,c){let{data:d,error:e}=await this.supabase.from("sessions").insert({...a,formation_id:null}).select().single();if(e)throw e;return b&&b.length>0&&d&&await this.updateSessionPrograms(d.id,b,a.organization_id),c&&c.length>0&&d&&await this.addSessionToFormations(d.id,c,a.organization_id),d}};a.s(["sessionService",0,d],555074)},496384,a=>{a.v(a=>Promise.resolve().then(()=>a(269240)))}];

//# sourceMappingURL=_9e728d16._.js.map