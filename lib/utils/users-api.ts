/** Appel de /api/users/[id] (modification, désactivation, suppression d'un utilisateur) */
export async function callUsersApi(
  userId: string,
  method: 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/users/${userId}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Erreur lors de la mise à jour')
  return json
}
