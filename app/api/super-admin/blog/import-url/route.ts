import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier les permissions super-admin
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const isBlogAdmin =
      admin?.role === 'super_admin' ||
      admin?.role === 'content_admin' ||
      !!(admin?.permissions as Record<string, unknown>)?.manage_blog

    if (!admin || !isBlogAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { url } = body as { url?: string }

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return NextResponse.json({ error: 'URL invalide (doit commencer par http:// ou https://)' }, { status: 400 })
    }

    // Fetch the remote page
    let htmlText: string
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: `La page a retourné le code HTTP ${res.status}` },
          { status: 422 }
        )
      }
      htmlText = await res.text()
    } catch (fetchErr) {
      const message = fetchErr instanceof Error ? fetchErr.message : 'Erreur réseau'
      return NextResponse.json({ error: `Impossible de récupérer la page : ${message}` }, { status: 422 })
    }

    // Extract title: <title> then <h1>
    let title = ''
    const titleMatch = htmlText.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch?.[1]) {
      title = titleMatch[1].trim()
    } else {
      const h1Match = htmlText.match(/<h1[^>]*>([^<]*)<\/h1>/i)
      if (h1Match?.[1]) {
        title = h1Match[1].trim()
      }
    }
    if (!title) {
      title = url
    }

    // Extract body HTML
    const bodyStartMatch = htmlText.match(/<body[^>]*>/i)
    const bodyEndIndex = htmlText.lastIndexOf('</body>')
    let html: string
    if (bodyStartMatch && bodyEndIndex !== -1) {
      const bodyStartIndex = htmlText.indexOf(bodyStartMatch[0]) + bodyStartMatch[0].length
      html = htmlText.slice(bodyStartIndex, bodyEndIndex)
    } else {
      html = htmlText
    }

    return NextResponse.json({ title, html })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
