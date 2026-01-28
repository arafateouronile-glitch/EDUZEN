/**
 * EduZen - Vidéo Format Carré (1080x1080)
 * Optimisé pour Instagram, LinkedIn, Facebook
 * Durée : 30 secondes (900 frames à 30fps)
 */

import { AbsoluteFill, interpolate, useCurrentFrame, spring, Sequence } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';

// Design System (même que EduZenVideo.tsx)
const COLORS = {
  brandBlue: '#335ACF',
  brandBlueDark: '#2847A3',
  brandCyan: '#34B9EE',
  brandCyanDark: '#2A95BF',
  brandBluePale: '#C7D5F5',
  brandCyanPale: '#BFEAFB',
  textPrimary: '#000000',
  textSecondary: '#1A1A1A',
  textTertiary: '#4D4D4D',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray200: '#E5E7EB',
};

const GRADIENTS = {
  primary: `linear-gradient(135deg, ${COLORS.brandBlue} 0%, ${COLORS.brandCyan} 100%)`,
};

const { fontFamily: interFont } = loadFont();
const { fontFamily: spaceGroteskFont } = loadSpaceGrotesk();

// Background animé (version simplifiée pour format carré)
const AnimatedBackground: React.FC<{ variant?: 'light' | 'gradient' }> = ({ variant = 'light' }) => {
  const frame = useCurrentFrame();
  const blobY = Math.sin(frame / 60) * 20;
  
  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: variant === 'gradient' 
          ? GRADIENTS.primary 
          : `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.gray50} 100%)`,
      }} />
      
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-20%',
        width: 600,
        height: 600,
        background: `${COLORS.brandBlue}30`,
        borderRadius: '50%',
        filter: 'blur(100px)',
        transform: `translateY(${blobY}px)`,
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-20%',
        width: 500,
        height: 500,
        background: `${COLORS.brandCyan}25`,
        borderRadius: '50%',
        filter: 'blur(100px)',
      }} />
    </AbsoluteFill>
  );
};

// Texte animé compact
const AnimatedText: React.FC<{
  children: string;
  delay?: number;
  style?: React.CSSProperties;
  gradient?: boolean;
}> = ({ children, delay = 0, style = {}, gradient = false }) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 15 } });
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(progress, [0, 1], [30, 0]);
  
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

// Logo compact
const Logo: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - delay, fps: 30, config: { damping: 12 } });
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transform: `scale(${scale})`,
      opacity,
    }}>
      <div style={{
        width: 56,
        height: 56,
        background: GRADIENTS.primary,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 15px 30px ${COLORS.brandBlue}40`,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <span style={{
        fontFamily: spaceGroteskFont,
        fontSize: 36,
        fontWeight: 700,
        background: GRADIENTS.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        EduZen
      </span>
    </div>
  );
};

// Scene 1: Intro (0-150 frames / 0-5s)
const Scene1: React.FC = () => (
  <AbsoluteFill>
    <AnimatedBackground />
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 60,
      gap: 40,
    }}>
      <Logo delay={10} />
      <AnimatedText
        delay={30}
        style={{
          fontFamily: spaceGroteskFont,
          fontSize: 42,
          fontWeight: 700,
          color: COLORS.textPrimary,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        Gérez votre organisme de formation
      </AnimatedText>
      <AnimatedText
        delay={45}
        gradient
        style={{
          fontFamily: spaceGroteskFont,
          fontSize: 52,
          fontWeight: 800,
          textAlign: 'center',
        }}
      >
        avec simplicité
      </AnimatedText>
    </div>
  </AbsoluteFill>
);

// Scene 2: Features (150-450 frames / 5-15s)
const Scene2: React.FC = () => {
  const features = [
    { icon: '🎓', text: 'Gestion des formations' },
    { icon: '💳', text: 'Facturation CPF automatisée' },
    { icon: '✅', text: 'Conformité Qualiopi' },
    { icon: '📊', text: 'Reporting en temps réel' },
  ];
  
  return (
    <AbsoluteFill>
      <AnimatedBackground />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 50,
        gap: 30,
      }}>
        <AnimatedText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.textPrimary,
            marginBottom: 20,
          }}
        >
          Une solution complète
        </AnimatedText>
        
        {features.map((f, i) => (
          <AnimatedText
            key={i}
            delay={20 + i * 20}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '20px 32px',
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              fontSize: 24,
              fontFamily: interFont,
              fontWeight: 600,
              color: COLORS.textSecondary,
              width: '100%',
              maxWidth: 500,
            }}
          >
            {f.icon} {f.text}
          </AnimatedText>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Stats (450-690 frames / 15-23s)
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const stats = [
    { value: '500+', label: 'Organismes' },
    { value: '98%', label: 'Satisfaction' },
    { value: '-70%', label: 'Temps admin' },
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
        padding: 50,
        gap: 50,
      }}>
        <AnimatedText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.white,
          }}
        >
          Ils nous font confiance
        </AnimatedText>
        
        <div style={{ display: 'flex', gap: 40 }}>
          {stats.map((stat, i) => {
            const delay = 20 + i * 15;
            const scale = spring({ frame: frame - delay, fps: 30, config: { damping: 12 } });
            const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
            
            return (
              <div key={i} style={{ textAlign: 'center', transform: `scale(${scale})`, opacity }}>
                <div style={{
                  fontFamily: spaceGroteskFont,
                  fontSize: 56,
                  fontWeight: 800,
                  color: COLORS.white,
                  textShadow: `0 0 30px ${COLORS.white}40`,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: interFont,
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: CTA (690-900 frames / 23-30s)
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - 30, fps: 30, config: { damping: 10 } });
  const opacity = interpolate(frame - 30, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill>
      <AnimatedBackground />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 50,
        gap: 40,
      }}>
        <Logo delay={0} />
        
        <AnimatedText
          delay={15}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.textPrimary,
            textAlign: 'center',
          }}
        >
          Transformez votre organisme
        </AnimatedText>
        
        <div style={{
          position: 'relative',
          transform: `scale(${scale})`,
          opacity,
        }}>
          <div style={{
            position: 'absolute',
            inset: -4,
            background: GRADIENTS.primary,
            borderRadius: 100,
            filter: 'blur(15px)',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'relative',
            padding: '20px 48px',
            background: GRADIENTS.primary,
            borderRadius: 100,
            fontFamily: interFont,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.white,
          }}>
            Essayer gratuitement →
          </div>
        </div>
        
        <AnimatedText
          delay={50}
          style={{
            fontFamily: interFont,
            fontSize: 18,
            fontWeight: 500,
            color: COLORS.textTertiary,
          }}
        >
          14 jours gratuits • Sans carte bancaire
        </AnimatedText>
        
        <AnimatedText
          delay={60}
          gradient
          style={{
            fontFamily: interFont,
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          eduzen.fr
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};

// Composition principale format carré
export const EduZenVideoSquare: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
    <Sequence from={0} durationInFrames={150}>
      <Scene1 />
    </Sequence>
    <Sequence from={150} durationInFrames={300}>
      <Scene2 />
    </Sequence>
    <Sequence from={450} durationInFrames={240}>
      <Scene3 />
    </Sequence>
    <Sequence from={690} durationInFrames={210}>
      <Scene4 />
    </Sequence>
  </AbsoluteFill>
);

export default EduZenVideoSquare;
