# Tickets / TODOs planifiés

Tickets issus de l’audit et des TODOs identifiés dans le code. À prioriser en sprint.

---

## PDF / Export

| Id   | Titre | Fichier | Description | Priorité |
|------|--------|---------|-------------|----------|
| T-PDF-1 | Export PDF BPF (Cerfa) | `app/(dashboard)/dashboard/bpf/[year]/page.tsx` | Implémenter la génération PDF réelle avec jspdf (ou lib équivalente) pour l’export du BPF ; actuellement un toast « en cours » uniquement. | Moyenne |
| T-PDF-2 | Export PDF portail auditeur | `app/(audit)/audit/[token]/page.tsx` | Implémenter l’export PDF du portail auditeur ; actuellement `window.print()`. | Moyenne |

---

## Référence

- Audit appliqué : `docs/AUDIT_APPLIQUE_2026-02.md`
- Ces tickets peuvent être recopiés dans un outil de suivi (Jira, GitHub Issues, etc.).
