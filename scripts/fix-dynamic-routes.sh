#!/bin/bash

# Script pour corriger toutes les routes dynamiques Next.js 16
# params: { id: string } → params: Promise<{ id: string }>

FILES=(
  "app/api/document-templates/[id]/route.ts"
  "app/api/v1/document-templates/[id]/route.ts"
  "app/api/electronic-attendance/requests/[id]/route.ts"
  "app/api/electronic-attendance/sessions/[id]/route.ts"
  "app/api/signature-requests/[id]/route.ts"
  "app/api/resources/[id]/download/route.ts"
  "app/api/mobile-money/status/[transactionId]/route.ts"
  "app/api/payments/stripe/status/[paymentIntentId]/route.ts"
  "app/api/payments/sepa/status/[paymentId]/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file"
    # This is a placeholder - actual fixes will be done manually
  fi
done
