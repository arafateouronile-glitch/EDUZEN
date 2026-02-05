/**
 * Stub pour le module canvas (Node.js uniquement).
 * pdfjs-dist require("canvas") côté client ; ce stub évite "Module not found"
 * et fournit createCanvas pour ne pas planter si le code l'appelle.
 */
module.exports = {
  createCanvas: function () {
    return {}
  },
}
