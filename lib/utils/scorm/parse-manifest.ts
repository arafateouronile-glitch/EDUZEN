import { XMLParser } from 'fast-xml-parser'
import type { ScormManifestData, ScormVersion } from '@/lib/types/scorm.types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,  // supprime les préfixes namespace (imscp:, adlcp:, etc.)
  isArray: (name) => ['resource', 'item', 'organization', 'dependency'].includes(name),
})

export function parseScormManifest(xmlContent: string): ScormManifestData {
  const doc = parser.parse(xmlContent)
  const manifest = doc?.manifest ?? doc

  const schemaVersion: string | number =
    manifest?.metadata?.schemaversion ??
    manifest?.metadata?.['imscp:schemaversion'] ??
    ''

  const version = detectVersion(schemaVersion)
  const title = extractTitle(manifest)
  const entryPoint = extractEntryPoint(manifest)

  return {
    version,
    title: title || 'Sans titre',
    entryPoint: entryPoint || 'index.html',
    identifier: manifest?.['@_identifier'],
  }
}

function detectVersion(schemaVersion: string | number): ScormVersion {
  const v = String(schemaVersion).toLowerCase()
  if (v.includes('cam 1.3') || v.includes('2004') || v.includes('1.3')) {
    return '2004'
  }
  return '1.2'
}

function extractTitle(manifest: Record<string, unknown>): string {
  // SCORM title peut être dans organizations > organization > title
  const orgs = manifest?.organizations as Record<string, unknown> | undefined
  if (orgs) {
    const orgList = (orgs?.organization as Record<string, unknown>[]) ?? []
    const firstOrg = Array.isArray(orgList) ? orgList[0] : orgList
    if (firstOrg?.title) return String(firstOrg.title)
  }
  // Fallback: metadata > title
  const metaTitle = (manifest?.metadata as Record<string, unknown>)?.title
  if (metaTitle) return String(metaTitle)
  return ''
}

function extractEntryPoint(manifest: Record<string, unknown>): string {
  const resources = manifest?.resources as Record<string, unknown> | undefined
  if (!resources) return ''

  const resourceList = (resources.resource as Record<string, unknown>[]) ?? []
  const list = Array.isArray(resourceList) ? resourceList : [resourceList]

  // Cherche la ressource de type SCO (sco ou webcontent avec scormtype)
  const sco = list.find(
    (r) =>
      r?.['@_adlcp:scormtype'] === 'sco' ||
      r?.['@_scormtype'] === 'sco' ||
      (r?.['@_type'] as string)?.toLowerCase().includes('webcontent')
  )

  const entry = sco?.['@_href'] ?? list[0]?.['@_href']
  return entry ? String(entry) : ''
}
