import { NextResponse } from 'next/server'

// À incrémenter à chaque release du plugin WordPress
const PLUGIN_VERSION = '1.0.0'

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.fr'

  return NextResponse.json({
    version:      PLUGIN_VERSION,
    download_url: `${appUrl}/downloads/eduzen-wordpress-plugin.zip`,
    requires:     '5.0',
    tested:       '6.7',
    requires_php: '7.4',
    last_updated: '2026-06-26',
    sections: {
      description: 'Connectez votre site WordPress à EDUZEN pour afficher automatiquement vos programmes, sessions et formations avec des shortcodes simples.',
      changelog:   '<h4>1.0.0</h4><ul><li>Version initiale — shortcodes [eduzen_programs], [eduzen_sessions], [eduzen_formations]</li></ul>',
    },
  })
}
