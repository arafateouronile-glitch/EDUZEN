import JSZip from 'jszip'

export interface ScormPackageContents {
  manifest: string
  files: Map<string, Uint8Array>
}

export async function extractScormPackage(
  zipBuffer: ArrayBuffer
): Promise<ScormPackageContents> {
  const zip = await JSZip.loadAsync(zipBuffer)

  // Cherche imsmanifest.xml à la racine ou dans un sous-dossier
  let manifestFile = zip.file('imsmanifest.xml')
  let basePath = ''

  if (!manifestFile) {
    // Cherche dans les sous-dossiers (profondeur 1)
    const entries = Object.keys(zip.files)
    const manifestPath = entries.find((p) => p.endsWith('/imsmanifest.xml'))
    if (manifestPath) {
      manifestFile = zip.file(manifestPath)
      basePath = manifestPath.replace('imsmanifest.xml', '')
    }
  }

  if (!manifestFile) {
    throw new Error('imsmanifest.xml introuvable dans le package SCORM')
  }

  const manifest = await manifestFile.async('string')

  const files = new Map<string, Uint8Array>()

  await Promise.all(
    Object.entries(zip.files).map(async ([path, file]) => {
      if (file.dir) return
      const relativePath = basePath ? path.replace(basePath, '') : path
      if (!relativePath) return
      const content = await file.async('uint8array')
      files.set(relativePath, content)
    })
  )

  // Inclut imsmanifest.xml dans les fichiers si pas déjà présent à la racine
  if (!files.has('imsmanifest.xml')) {
    files.set('imsmanifest.xml', new TextEncoder().encode(manifest))
  }

  return { manifest, files }
}
