# Audit des services – code mort potentiel

## Objectif

Repérer les services dans `lib/services/` qui ne sont jamais importés par l’app (hors tests), pour envisager suppression ou regroupement.

## Méthode

1. **Lister les services**  
   `ls lib/services/*.ts` (exclure `*.client.ts` et `_example-*.ts`).

2. **Rechercher les usages** (hors tests)  
   Depuis la racine du projet :
   ```bash
   rg "from '@/lib/services/([a-zA-Z0-9-]+)" --type-add 'app:glob:app/**/*.{ts,tsx}' -t app -t ts -t tsx -o '$1' | sort -u
   ```
   Comparer avec la liste des fichiers pour repérer les services jamais référencés.

3. **Knip** (si la config est valide)  
   `npx knip` peut signaler des exports inutilisés. En cas d’erreur de config (`workspaces` etc.), corriger `knip.jsonc` ou lancer knip par répertoire.

## Services jamais importés (hors tests) – liste actualisée

Recherche effectuée dans `app/`, `components/`, `lib/**/*.{ts,tsx}` (hors `tests/` et `docs/`).  
Un service peut tout de même être utilisé par un **import dynamique** ou par un **autre service** ; en cas de doute, vérifier manuellement.

| Fichier | Remarque |
|---------|----------|
| `predictive-analytics.service.ts` | Déplacé dans `lib/services/_deprecated/` |
| `ai-recommendations.service.ts` | Déplacé dans `lib/services/_deprecated/` |
| `videoconference.service.ts` | Déplacé dans `lib/services/_deprecated/` (dépendance retirée de `session.service.ts`) |

**Services utilisés** (usage confirmé, éventuellement via import dynamique ou autre service) : `anomaly-detection.service`, `template-marketplace.service`, `shared-calendar.service`, `user-management.service`, `report-card.service`, `learner-notifications.service`, `notification-scheduler.service`, `learning-portal.service`, `financial-report.service`, `payment-reminder.service`, `esignature-integration.service`, `external-data.service`, `template-library.service`, `session-management.service`, `global-document-layout.service`, `crm.service`, `lms.service` — ainsi que `workflow-validation.service`, `support.service`, `gdpr.service`, `opco.service`, `cpf.service`, `fec-export.service`, `push-notifications.service`, `template-collaboration.service`, `messaging.service`, `api.service`, `resource-library.service`, `email-schedule.service`, `docx-generator.service` (via `auto-docx-generator.service`), `knowledge-base.service`, `feedback.service`, `tutorial-videos.service`, `document-template.service`, `template-security.service`, `public-catalog-settings.service`, `documentation.service`, etc.

## Comment régénérer cette liste

Depuis la racine du projet :

```bash
# Lister les noms de services (fichiers *.service.ts, hors *.client.ts et _example*)
ls lib/services/*.service.ts | xargs -I{} basename {} .service.ts | sed 's/\.service//' | sort -u

# Pour chaque service, vérifier s'il est importé (exemple pour un seul)
rg "from '@/lib/services/predictive-analytics" --type ts -g '!tests/**' -g '!docs/**' app components lib
```

Remplacer `predictive-analytics` par le nom du fichier sans `.service.ts`. Si la commande ne retourne rien, le service est candidat à la liste « jamais importé ». Penser à vérifier les imports dynamiques (`import('@/lib/services/...')`) avec une recherche sur le chemin du service.

## Actions recommandées

1. Exécuter la recherche d’imports (étape 2) et lister les services sans usage hors tests.
2. Pour chaque service sans usage : vérifier s’il est appelé dynamiquement (`import()` ou chaîne) ou par un autre service.
3. Si vraiment inutilisé : supprimer le fichier ou le déplacer dans `lib/services/_deprecated/` et mettre à jour les éventuels imports.
4. Réexécuter les tests et le build après toute suppression.

## Fichiers exclus de l’audit

- `*.client.ts` : wrappers côté client, souvent utilisés depuis l’app.
- `_example-standardized.service.ts` : déjà ignoré (exemple).
- Fichiers dans `tests/` : compter comme usage seulement si le service est censé être utilisé par l’app.
