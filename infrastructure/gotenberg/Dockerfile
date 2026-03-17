# Gotenberg 8.x pour EDUZEN – contrats Qualiopi, émargements, BPF
# Polices système + support PDF/A (métadonnées) + polices personnalisées
# Déploiement : Railway, Docker Compose, ou tout hébergeur Docker

FROM gotenberg/gotenberg:8 AS base

USER root

# Polices système (Arial, Helvetica, Times, etc.) pour un rendu cohérent
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
    fonts-liberation2 \
    fonts-dejavu-core \
    fonts-urw-base35 \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Dossier pour polices personnalisées (charte graphique EDUZEN)
# Copier vos .ttf dans infrastructure/gotenberg/fonts/ avant build
RUN mkdir -p /usr/share/fonts/eduzen
COPY fonts/ /usr/share/fonts/eduzen/

# Reconstruire le cache des polices
RUN fc-cache -fv

# Entrypoint pour Railway (utilise $PORT dynamique)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER gotenberg

# Variables d'environnement optionnelles (surchargeables au run)
# GOTENBERG_API_DISABLE_HEALTH_CHECK_LOGGING=true
# GOTENBERG_CHROMIUM_FAIL_FAST=true
# GOTENBERG_CHROMIUM_MAX_QUEUE_SIZE=...

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
