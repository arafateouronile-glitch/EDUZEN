/**
 * EduZen - Vidéo Format Vertical (1080x1920)
 * Optimisé pour Instagram Stories, TikTok, YouTube Shorts
 * Durée : 15 secondes (450 frames à 30fps)
 */

import { AbsoluteFill, interpolate, useCurrentFrame, spring, Sequence } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';

// Design System EduZen
const COLORS = {
  brandBlue: '#335ACF',
  brandCyan: '#34B9EE',
  brandBluePale: '#C7D5F5',
  textPrimary: '#000000',
  textTertiary: '#4D4D4D',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
};

const GRADIENTS = {
  primary: `linear-gradient(135deg, ${COLORS.brandBlue} 0%, ${COLORS.brandCyan} 100%)`,
};

const { fontFamily: interFont } = loadFont();
const { fontFamily: spaceGroteskFont } = loadSpaceGrotesk();

// Background dynamique vertical
const AnimatedBackground: React.FC<{ variant?: 'light' | 'gradient' }> = ({ variant = 'light' }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 30), [-1, 1], [0.9, 1.1]);
  
  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: variant === 'gradient' 
          ? GRADIENTS.primary 
          : `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.gray50} 100%)`,
      }} />
      
      {/* Cercles décoratifs */}
      <div style={{
        position: 'absolute',
        top: '5%',
        left: '50%',
        transform: `translateX(-50%) scale(${pulse})`,
        width: 400,
        height: 400,
        background: variant === 'gradient' 
          ? `${COLORS.white}15` 
          : `${COLORS.brandBlue}20`,
        borderRadius: '50%',
        filter: 'blur(80px)',
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 300,
        height: 300,
        background: variant === 'gradient' 
          ? `${COLORS.white}10` 
          : `${COLORS.brandCyan}15`,
        borderRadius: '50%',
        filter: 'blur(60px)',
      }} />
    </AbsoluteFill>
  );
};

// Logo animé compact
const Logo: React.FC<{ delay?: number; white?: boolean }> = ({ delay = 0, white = false }) => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - delay, fps: 30, config: { damping: 12 } });
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transform: `scale(${scale})`,
      opacity,
    }}>
      <div style={{
        width: 48,
        height: 48,
        background: white ? COLORS.white : GRADIENTS.primary,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: white 
          ? `0 10px 30px ${COLORS.white}40`
          : `0 10px 30px ${COLORS.brandBlue}40`,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill={white ? COLORS.brandBlue : 'white'}/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={white ? COLORS.brandBlue : 'white'} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <span style={{
        fontFamily: spaceGroteskFont,
        fontSize: 32,
        fontWeight: 700,
        color: white ? COLORS.white : undefined,
        background: white ? undefined : GRADIENTS.primary,
        WebkitBackgroundClip: white ? undefined : 'text',
        WebkitTextFillColor: white ? undefined : 'transparent',
      }}>
        EduZen
      </span>
    </div>
  );
};

// Texte animé rapide
const QuickText: React.FC<{
  children: string;
  delay?: number;
  style?: React.CSSProperties;
  gradient?: boolean;
}> = ({ children, delay = 0, style = {}, gradient = false }) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 20, stiffness: 120 } });
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(progress, [0, 1], [25, 0]);
  
  return (
    <div style={{
      transform: `translateY(${y}px)`,
      opacity,
      ...style,
      ...(gradient && {
        background: GRADIENTS.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }),
    }}>
      {children}
    </div>
  );
};

// Scene 1: Hook rapide (0-120 frames / 0-4s)
const Scene1: React.FC = () => (
  <AbsoluteFill>
    <AnimatedBackground />
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 40,
      gap: 50,
    }}>
      <Logo delay={5} />
      
      <div style={{ textAlign: 'center', marginTop: 60 }}>
        <QuickText
          delay={15}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 48,
            fontWeight: 300,
            color: COLORS.textPrimary,
            lineHeight: 1.2,
          }}
        >
          Organismes de
        </QuickText>
        <QuickText
          delay={25}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 48,
            fontWeight: 600,
            fontStyle: 'italic',
            color: COLORS.textPrimary,
            lineHeight: 1.2,
          }}
        >
          formation
        </QuickText>
        <QuickText
          delay={35}
          gradient
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: 20,
          }}
        >
          simplifiez-vous
        </QuickText>
        <QuickText
          delay={45}
          gradient
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          la vie !
        </QuickText>
      </div>
    </div>
  </AbsoluteFill>
);

// Scene 2: Features rapides (120-300 frames / 4-10s)
const Scene2: React.FC = () => {
  const features = [
    '🎓 Gestion formations',
    '💳 Facturation CPF',
    '✅ Qualiopi ready',
    '📊 Analytics',
  ];
  
  return (
    <AbsoluteFill>
      <AnimatedBackground variant="gradient" />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 40,
        gap: 30,
      }}>
        <QuickText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 40,
            fontWeight: 700,
            color: COLORS.white,
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          Tout-en-un
        </QuickText>
        
        {features.map((f, i) => (
          <QuickText
            key={i}
            delay={15 + i * 15}
            style={{
              padding: '18px 36px',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              fontFamily: interFont,
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.textPrimary,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            }}
          >
            {f}
          </QuickText>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: CTA (300-450 frames / 10-15s)
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - 20, fps: 30, config: { damping: 10 } });
  const opacity = interpolate(frame - 20, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const shimmerX = interpolate(frame, [0, 45], [-150, 300], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill>
      <AnimatedBackground />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 40,
        gap: 40,
      }}>
        <Logo delay={0} />
        
        <QuickText
          delay={10}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.textPrimary,
            textAlign: 'center',
            lineHeight: 1.3,
            marginTop: 40,
          }}
        >
          Essayez gratuitement
        </QuickText>
        
        <QuickText
          delay={20}
          style={{
            fontFamily: interFont,
            fontSize: 20,
            color: COLORS.textTertiary,
            textAlign: 'center',
          }}
        >
          14 jours • Sans engagement
        </QuickText>
        
        {/* CTA Button */}
        <div style={{
          position: 'relative',
          transform: `scale(${scale})`,
          opacity,
          marginTop: 30,
        }}>
          <div style={{
            position: 'absolute',
            inset: -4,
            background: GRADIENTS.primary,
            borderRadius: 100,
            filter: 'blur(20px)',
            opacity: 0.7,
          }} />
          <div style={{
            position: 'relative',
            padding: '22px 50px',
            background: GRADIENTS.primary,
            borderRadius: 100,
            overflow: 'hidden',
          }}>
            {/* Shimmer */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: shimmerX,
              width: 80,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            }} />
            <span style={{
              position: 'relative',
              fontFamily: interFont,
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.white,
            }}>
              Commencer →
            </span>
          </div>
        </div>
        
        {/* URL */}
        <QuickText
          delay={35}
          gradient
          style={{
            fontFamily: interFont,
            fontSize: 26,
            fontWeight: 700,
            marginTop: 40,
          }}
        >
          eduzen.fr
        </QuickText>
      </div>
    </AbsoluteFill>
  );
};

// Composition principale format vertical
export const EduZenVideoVertical: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
    <Sequence from={0} durationInFrames={120}>
      <Scene1 />
    </Sequence>
    <Sequence from={120} durationInFrames={180}>
      <Scene2 />
    </Sequence>
    <Sequence from={300} durationInFrames={150}>
      <Scene3 />
    </Sequence>
  </AbsoluteFill>
);

export default EduZenVideoVertical;
