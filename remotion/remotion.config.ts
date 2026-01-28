/**
 * EduZen - Configuration Remotion
 * Optimisé pour le rendu haute qualité
 */

import { Config } from '@remotion/cli/config';

// Configuration de base
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Configuration du codec pour export haute qualité
Config.setCodec('h264');

// Optimisation du rendu
Config.setConcurrency(4);

// Configuration du navigateur pour le rendu
Config.setChromiumOpenGlRenderer('angle');
