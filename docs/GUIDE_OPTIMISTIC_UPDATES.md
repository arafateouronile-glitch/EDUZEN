---
title: Guide - Optimistic Updates
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🚀 Guide - Optimistic Updates

**Date :** 2024-12-03  
**Objectif :** Améliorer l'UX avec des mises à jour optimistes

---

## 📋 Mutations à Optimiser

### 1. ✅ Paiements (`app/(dashboard)/dashboard/payments/[id]/page.tsx`)
- **Mutation :** `recordPaymentMutation`
- **Action :** Enregistrer un paiement
- **Impact :** Haute fréquence, feedback immédiat nécessaire

### 2. ⏳ Présence (`app/(dashboard)/dashboard/attendance/...`)
- **Mutations :** Mise à jour du statut de présence
- **Action :** Marquer présent/absent/retard
- **Impact :** Très haute fréquence, besoin de feedback instantané

### 3. ⏳ Inscriptions (`app/(dashboard)/dashboard/programs/[id]/sessions/page.tsx`)
- **Mutation :** `createEnrollmentMutation`
- **Action :** Inscrire un étudiant à une session
- **Impact :** Fréquence moyenne, amélioration UX

---

## 🎯 Implémentation

### Exemple : Paiements

```typescript
const recordPaymentMutation = useMutation({
  mutationFn: async () => {
    // ... logique existante
  },
  // Optimistic update
  onMutate: async (newPayment) => {
    // Annuler les requêtes en cours
    await queryClient.cancelQueries({ queryKey: ['invoice', invoiceId] })
    await queryClient.cancelQueries({ queryKey: ['payments', invoiceId] })

    // Snapshot des valeurs précédentes
    const previousInvoice = queryClient.getQueryData(['invoice', invoiceId])
    const previousPayments = queryClient.getQueryData(['payments', invoiceId])

    // Mise à jour optimiste
    queryClient.setQueryData(['invoice', invoiceId], (old: any) => ({
      ...old,
      paid_amount: (old.paid_amount || 0) + newPayment.amount,
      remaining_amount: (old.total_amount || 0) - ((old.paid_amount || 0) + newPayment.amount),
    }))

    queryClient.setQueryData(['payments', invoiceId], (old: any[]) => [
      ...(old || []),
      {
        ...newPayment,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      },
    ])

    return { previousInvoice, previousPayments }
  },
  onError: (err, newPayment, context) => {
    // Rollback en cas d'erreur
    if (context?.previousInvoice) {
      queryClient.setQueryData(['invoice', invoiceId], context.previousInvoice)
    }
    if (context?.previousPayments) {
      queryClient.setQueryData(['payments', invoiceId], context.previousPayments)
    }
  },
  onSettled: () => {
    // Rafraîchir les données après succès ou erreur
    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] })
  },
})
```

---

## ✅ Checklist

- [ ] Implémenter optimistic updates pour paiements
- [ ] Implémenter optimistic updates pour présence
- [ ] Implémenter optimistic updates pour inscriptions
- [ ] Tester les rollbacks en cas d'erreur
- [ ] Vérifier la cohérence des données

---

**Statut :** Guide créé, à implémenter---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.