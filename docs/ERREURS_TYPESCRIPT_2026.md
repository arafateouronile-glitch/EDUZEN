# Relevé des erreurs TypeScript

**Date :** 9 mars 2026  
**Commande :** `npx tsc --noEmit`  
**Total :** 720 erreurs

---

## Résumé par fichier (ordre décroissant)

| Erreurs | Fichier |
|--------:|---------|
| 46 | `app/(learner)/learner/documents/page.tsx` |
| 41 | `app/api/sign/submit/route.ts` |
| 40 | `lib/utils/cpf/xml-parser.ts` |
| 34 | `app/(dashboard)/dashboard/elearning/page.tsx` |
| 30 | `app/(dashboard)/dashboard/attendance/session/[sessionId]/page.tsx` |
| 28 | `lib/services/document-template.service.ts` |
| 18 | `app/(dashboard)/dashboard/sessions/[id]/sections/config-apprenants.tsx` |
| 17 | `app/(dashboard)/dashboard/settings/notifications/page.tsx` |
| 15 | `lib/utils/document-templates.ts` |
| 15 | `lib/services/esignature-webhook-handler.service.ts` |
| 15 | `app/(portal)/portal/portfolios/page.tsx` |
| 15 | `app/(dashboard)/dashboard/cpf/catalog-sync/page.tsx` |
| 14 | `lib/services/notification-scheduler.service.ts` |
| 14 | `app/(dashboard)/dashboard/sessions/[id]/sections/gestion-finances.tsx` |
| 12 | `app/(dashboard)/dashboard/tutorials/page.tsx` |
| 12 | `app/(dashboard)/dashboard/programs/[id]/enrollments/page.tsx` |
| 11 | `app/api/document-templates/reset-defaults/route.ts` |
| 11 | `app/(dashboard)/dashboard/settings/calendar/page.tsx` |
| 10 | `components/accessibility/accommodation-form.tsx` |
| 9 | `lib/utils/document-generation/template-converter.ts` |
| 9 | `components/qualiopi/premium/qualiopi-dashboard-premium.tsx` |
| 9 | `app/(dashboard)/dashboard/sessions/[id]/sections/gestion-convocations.tsx` |
| 9 | `app/(dashboard)/dashboard/dashboard/page.tsx` |
| 9 | `app/(dashboard)/dashboard/compliance/controls/page.tsx` |
| 8 | `app/programmes/[id]/page.tsx` |
| 8 | `app/(portal)/portal/portfolios/[id]/page.tsx` |
| 8 | `app/(portal)/portal/documents/page.tsx` |
| 8 | `app/(dashboard)/dashboard/settings/document-templates/[type]/edit/page.tsx` |
| 8 | `app/(dashboard)/dashboard/sessions/page.tsx` |
| 8 | `app/(dashboard)/dashboard/messages/[id]/page.tsx` |
| 8 | `app/(dashboard)/dashboard/compliance/incidents/page.tsx` |
| 8 | `app/(dashboard)/dashboard/certifications/page.tsx` |
| 7 | `lib/utils/document-generation/variable-extractor.ts` |
| 7 | `lib/services/mobile-money.service.ts` |
| 7 | `lib/services/diploma-expiry-alert.service.ts` |
| 6 | `lib/services/learner-notifications.service.ts` |
| 6 | `app/api/sign/process-pdf/route.ts` |
| 6 | `app/api/sign/process-pdf-url/route.ts` |
| 6 | `app/(learner)/learner/planning/page.tsx` |
| 6 | `app/(enterprise)/enterprise/trainings/request/page.tsx` |
| 6 | `app/(dashboard)/dashboard/sessions/[id]/sections/gestion-conventions.tsx` |
| 6 | `app/(dashboard)/dashboard/evaluations/report-cards/page.tsx` |
| 5 | `components/super-admin/dashboard/subscriptions-chart.tsx` |
| 5 | `app/(dashboard)/dashboard/qualiopi/auditor-links/page.tsx` |
| 5 | `app/(dashboard)/dashboard/admin/health/page.tsx` |
| 4 | `lib/utils/pdf-generator.ts` |
| 4 | `lib/utils/document-generation/variable-mapper.ts` |
| 4 | `lib/utils/document-generation/signature-processor.ts` |
| 4 | `lib/utils/document-generation/conditional-processor.ts` |
| 4 | `lib/services/organization-setup.service.ts` |
| 4 | `lib/services/email-schedule.service.ts` |
| 4 | `lib/services/electronic-attendance.service.ts` |
| 4 | `components/console-error-filter.tsx` |
| 4 | `app/(learner)/learner/certificates/page.tsx` |
| 4 | `app/(dashboard)/dashboard/settings/document-templates/page.tsx` |
| 4 | `app/(dashboard)/dashboard/financial-reports/page.tsx` |
| 4 | `app/(dashboard)/dashboard/evaluations/page.tsx` |
| 4 | `app/(dashboard)/dashboard/cpf/configuration/page.tsx` |
| 3 | `lib/services/attendance.service.ts` |
| 3 | `app/api/documents/scheduled/execute/route.ts` |
| 3 | `app/api/document-templates/[id]/route.ts` |
| 3 | `app/(dashboard)/dashboard/students/[id]/page.tsx` |
| 3 | `app/(dashboard)/dashboard/settings/email-templates/page.tsx` |
| 3 | `app/(dashboard)/dashboard/compliance/audits/page.tsx` |
| 2 | `lib/utils/send-email-resend.ts` |
| 2 | `lib/utils/program-export.ts` |
| 2 | `lib/utils/document-generation/pdf-generator.tsx` |
| 2 | `lib/utils/document-generation/form-field-processor.ts` |
| 2 | `components/landing/BentoShowcase.tsx` |
| 2 | `app/programmes/page.tsx` |
| 2 | `app/api/opco-access/[token]/route.ts` |
| 2 | `app/api/document-templates/[id]/copy-header-footer/route.ts` |
| 2 | `app/(enterprise)/enterprise/page.tsx` |
| 2 | `app/(dashboard)/dashboard/support/[id]/page.tsx` |
| 2 | `app/(dashboard)/dashboard/sessions/[id]/page.tsx` |
| 2 | `app/(dashboard)/dashboard/programs/[id]/page.tsx` |
| 2 | `app/(dashboard)/dashboard/payments/[id]/page.tsx` |
| 2 | `app/(dashboard)/dashboard/cpf/page.tsx` |
| 1 | `lib/utils/number-generator.ts` |
| 1 | `lib/services/template-security.service.ts` |

*(Et d’autres fichiers avec 1–2 erreurs.)*

---

## Types d’erreurs fréquents

- **TS2322** : type non assignable (ex. `string | null` vs `string`, `unknown` vs `ReactNode`)
- **TS2345** : argument non assignable (callbacks `.map` / `.forEach` avec types Supabase `| null` vs types locaux)
- **TS2339** : propriété inexistante sur un type (objet typé trop étroit ou `{}`)
- **TS2769** : aucun overload ne correspond (useQuery, useMutation, etc.)
- **TS18047** / **TS18048** : valeur possibly `null` / `undefined`
- **TS2538** : `null` ou `undefined` utilisé comme index

---

## Fichiers de détail

- **Liste complète (une ligne par erreur) :** `tsc-errors-list.txt` à la racine du projet
- **Regroupement par fichier :** `tsc-errors-by-file.txt`

Pour régénérer le relevé :

```bash
npx tsc --noEmit 2>&1 | grep "error TS" > tsc-errors-list.txt
```
