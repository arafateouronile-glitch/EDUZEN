#!/usr/bin/env python3
"""
Script pour appliquer l'en-tête et le bas de page de convention par défaut
à tous les documents markdown du projet.
"""

import os
import re
from datetime import datetime
from pathlib import Path

# Format de l'en-tête (frontmatter YAML)
HEADER_TEMPLATE = """---
title: {title}
date: {date}
version: 1.0
author: EDUZEN Team
---

"""

# Format du bas de page
FOOTER_TEMPLATE = """
---

**Document EDUZEN** | [Retour à la documentation principale]({readme_link}) | Dernière mise à jour : {date}
© 2024 EDUZEN. Tous droits réservés.
"""

def extract_title(content):
    """Extrait le titre du document depuis le premier #"""
    lines = content.split('\n')
    for line in lines:
        if line.strip().startswith('# '):
            # Enlève le # et les emojis éventuels
            title = line.strip()[1:].strip()
            # Enlève les emojis
            title = re.sub(r'[^\w\s\-\(\)]', '', title).strip()
            return title
    return "Document EDUZEN"

def has_frontmatter(content):
    """Vérifie si le document a déjà un frontmatter YAML"""
    return content.strip().startswith('---')

def has_footer(content):
    """Vérifie si le document a déjà un bas de page EDUZEN"""
    return '**Document EDUZEN**' in content or '© 2024 EDUZEN' in content

def get_readme_link(file_path, project_root):
    """Détermine le lien correct vers README.md selon l'emplacement du fichier"""
    relative_path = file_path.relative_to(project_root)
    depth = len(relative_path.parent.parts)
    
    if depth == 0:
        # Fichier à la racine
        return "README.md"
    else:
        # Fichier dans un sous-dossier
        return "../" * depth + "README.md"

def process_markdown_file(file_path, project_root):
    """Traite un fichier markdown pour ajouter l'en-tête et le bas de page"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Erreur lors de la lecture de {file_path}: {e}")
        return False

    original_content = content
    date_str = datetime.now().strftime('%Y-%m-%d')
    
    # Extraire le titre
    title = extract_title(content)
    
    # Nettoyer le contenu (enlever l'ancien frontmatter s'il existe)
    if has_frontmatter(content):
        # Extraire le frontmatter existant
        match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
        if match:
            content = content[match.end():]
    
    # Ajouter l'en-tête si nécessaire
    if not has_frontmatter(original_content):
        header = HEADER_TEMPLATE.format(title=title, date=date_str)
        content = header + content
    
    # Ajouter ou mettre à jour le bas de page
    readme_link = get_readme_link(file_path, project_root)
    footer = FOOTER_TEMPLATE.format(date=date_str, readme_link=readme_link)
    
    if has_footer(content):
        # Remplacer l'ancien bas de page
        # Chercher le dernier "---" suivi du bas de page
        pattern = r'\n---\n\n\*\*Document EDUZEN\*\*.*?© 2024 EDUZEN\. Tous droits réservés\.\s*$'
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, footer.strip(), content, flags=re.DOTALL)
        else:
            # Si le pattern ne correspond pas, ajouter le nouveau bas de page
            content = content.rstrip() + footer
    else:
        # Ajouter le bas de page si nécessaire
        content = content.rstrip() + footer
    
    # Écrire le fichier modifié
    if content != original_content:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Erreur lors de l'écriture de {file_path}: {e}")
            return False
    
    return False

def main():
    """Fonction principale"""
    project_root = Path(__file__).parent.parent
    markdown_files = []
    
    # Trouver tous les fichiers markdown (hors node_modules et .git)
    for root, dirs, files in os.walk(project_root):
        # Ignorer node_modules et .git
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'playwright-report', 'test-results']]
        
        for file in files:
            if file.endswith('.md'):
                file_path = Path(root) / file
                markdown_files.append(file_path)
    
    print(f"Traitement de {len(markdown_files)} fichiers markdown...")
    
    modified_count = 0
    for file_path in markdown_files:
        if process_markdown_file(file_path, project_root):
            modified_count += 1
            print(f"✓ Modifié : {file_path.relative_to(project_root)}")
    
    print(f"\n✓ {modified_count} fichiers modifiés sur {len(markdown_files)} fichiers traités.")

if __name__ == '__main__':
    main()

