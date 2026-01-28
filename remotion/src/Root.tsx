/**
 * EduZen - Remotion Root Configuration
 * Point d'entrée pour toutes les compositions vidéo
 */

import { Composition } from 'remotion';
import { EduZenVideo } from './EduZenVideo';
import { EduZenVideoSquare } from './EduZenVideoSquare';
import { EduZenVideoVertical } from './EduZenVideoVertical';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ========================================
          FORMAT 16:9 - YOUTUBE / SITE WEB
          ======================================== */}
      
      {/* Vidéo principale - 60 secondes (1920x1080) */}
      <Composition
        id="EduZenVideo"
        component={EduZenVideo}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      
      {/* ========================================
          FORMAT CARRÉ - INSTAGRAM / LINKEDIN
          ======================================== */}
      
      {/* Version carrée - 30 secondes (1080x1080) */}
      <Composition
        id="EduZenVideoSquare"
        component={EduZenVideoSquare}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{}}
      />
      
      {/* ========================================
          FORMAT VERTICAL - STORIES / REELS / TIKTOK
          ======================================== */}
      
      {/* Version verticale - 15 secondes (1080x1920) */}
      <Composition
        id="EduZenVideoVertical"
        component={EduZenVideoVertical}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
