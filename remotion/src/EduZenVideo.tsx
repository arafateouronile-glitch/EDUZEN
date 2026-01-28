/**
 * EduZen - Vidéo de Présentation Motion Design
 * Script Remotion Ultra-Optimisé
 * 
 * Durée totale : ~60 secondes (1800 frames à 30fps)
 * Format : 1920x1080 (16:9) - Adapté pour YouTube, LinkedIn, site web
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, Sequence, Audio, Img } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';

// ============================================
// CONFIGURATION DESIGN SYSTEM EDUZEN
// ============================================
const COLORS = {
  // Couleurs principales (cohérentes avec globals.css)
  brandBlue: '#335ACF',
  brandBlueDark: '#2847A3',
  brandBlueDarker: '#1E3578',
  brandBlueLight: '#5C7DD9',
  brandBluePale: '#C7D5F5',
  brandBlueGhost: '#E8EEF9',
  
  brandCyan: '#34B9EE',
  brandCyanDark: '#2A95BF',
  brandCyanLight: '#5CCBF3',
  brandCyanPale: '#BFEAFB',
  
  // Textes
  textPrimary: '#000000',
  textSecondary: '#1A1A1A',
  textTertiary: '#4D4D4D',
  
  // Backgrounds
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
};

const GRADIENTS = {
  primary: `linear-gradient(135deg, ${COLORS.brandBlue} 0%, ${COLORS.brandCyan} 100%)`,
  primarySoft: `linear-gradient(135deg, ${COLORS.brandBlueLight} 0%, ${COLORS.brandCyanLight} 100%)`,
  radialBlue: `radial-gradient(circle, ${COLORS.brandBlue}30 0%, transparent 70%)`,
  radialCyan: `radial-gradient(circle, ${COLORS.brandCyan}30 0%, transparent 70%)`,
};

// Charger les polices (même que l'app)
const { fontFamily: interFont } = loadFont();
const { fontFamily: spaceGroteskFont } = loadSpaceGrotesk();

// ============================================
// COMPOSANTS RÉUTILISABLES
// ============================================

// Fond avec dégradé mesh animé (comme le Hero)
const AnimatedBackground: React.FC<{ variant?: 'light' | 'gradient' }> = ({ variant = 'light' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const blobY1 = Math.sin(frame / 60) * 30;
  const blobY2 = Math.cos(frame / 80) * 40;
  const blobScale = interpolate(Math.sin(frame / 100), [-1, 1], [0.95, 1.05]);
  
  return (
    <AbsoluteFill>
      {/* Base background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: variant === 'gradient' 
          ? GRADIENTS.primary 
          : `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.gray50} 50%, ${COLORS.white} 100%)`,
      }} />
      
      {/* Blobs animés */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: 700,
        height: 700,
        background: `linear-gradient(135deg, ${COLORS.brandBlue}40 0%, ${COLORS.brandCyan}25 100%)`,
        borderRadius: '50%',
        filter: 'blur(120px)',
        transform: `translateY(${blobY1}px) scale(${blobScale})`,
        opacity: 0.5,
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: 800,
        height: 800,
        background: `linear-gradient(45deg, ${COLORS.brandCyan}30 0%, ${COLORS.brandBlue}20 100%)`,
        borderRadius: '50%',
        filter: 'blur(120px)',
        transform: `translateY(${blobY2}px)`,
        opacity: 0.5,
      }} />
      
      {/* Grille subtile */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${COLORS.brandBlue}08 1px, transparent 1px),
          linear-gradient(90deg, ${COLORS.brandBlue}08 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black, transparent)',
      }} />
    </AbsoluteFill>
  );
};

// Logo EduZen animé
const AnimatedLogo: React.FC<{ delay?: number; size?: number }> = ({ delay = 0, size = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      transform: `scale(${scale})`,
      opacity,
    }}>
      {/* Icon */}
      <div style={{
        width: size,
        height: size,
        background: GRADIENTS.primary,
        borderRadius: size * 0.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 20px 40px ${COLORS.brandBlue}40`,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      {/* Text */}
      <span style={{
        fontFamily: spaceGroteskFont,
        fontSize: size * 0.6,
        fontWeight: 700,
        background: GRADIENTS.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
      }}>
        EduZen
      </span>
    </div>
  );
};

// Texte avec animation de révélation
const AnimatedText: React.FC<{
  children: string;
  delay?: number;
  style?: React.CSSProperties;
  gradient?: boolean;
}> = ({ children, delay = 0, style = {}, gradient = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(progress, [0, 1], [40, 0]);
  
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

// Card Feature avec glass morphism
const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  delay?: number;
  index: number;
}> = ({ icon, title, description, delay = 0, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(scale, [0, 1], [60, 0]);
  
  const iconBgColors = [
    COLORS.brandBluePale,
    COLORS.brandCyanPale,
    COLORS.brandBlueGhost,
  ];
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(40px)',
      borderRadius: 24,
      padding: 40,
      border: `2px solid ${COLORS.gray200}`,
      boxShadow: `0 20px 60px ${COLORS.brandBlue}15`,
      transform: `translateY(${y}px) scale(${scale})`,
      opacity,
      width: 380,
    }}>
      {/* Icon */}
      <div style={{
        width: 64,
        height: 64,
        background: iconBgColors[index % 3],
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        fontSize: 32,
      }}>
        {icon}
      </div>
      
      {/* Title */}
      <h3 style={{
        fontFamily: spaceGroteskFont,
        fontSize: 24,
        fontWeight: 700,
        color: COLORS.textPrimary,
        marginBottom: 12,
        lineHeight: 1.2,
      }}>
        {title}
      </h3>
      
      {/* Description */}
      <p style={{
        fontFamily: interFont,
        fontSize: 16,
        color: COLORS.textTertiary,
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
};

// Badge avec glow effect
const GlowBadge: React.FC<{ children: string; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const pulseScale = interpolate(Math.sin(frame / 20), [-1, 1], [1, 1.05]);
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 28px',
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(20px)',
      borderRadius: 100,
      border: `1px solid ${COLORS.brandBluePale}`,
      boxShadow: `0 8px 32px ${COLORS.brandBlue}20`,
      transform: `scale(${scale * pulseScale})`,
      opacity,
    }}>
      {/* Dot indicator */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 10,
          height: 10,
          background: COLORS.brandCyan,
          borderRadius: '50%',
          boxShadow: `0 0 20px ${COLORS.brandCyan}80`,
        }} />
        <div style={{
          position: 'absolute',
          inset: -4,
          background: COLORS.brandCyan,
          borderRadius: '50%',
          opacity: 0.4,
          animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        }} />
      </div>
      
      <span style={{
        fontFamily: interFont,
        fontSize: 18,
        fontWeight: 600,
        background: GRADIENTS.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        {children}
      </span>
    </div>
  );
};

// CTA Button animé
const AnimatedCTA: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 100 },
  });
  
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const shimmerX = interpolate(frame, [0, 60], [-200, 400], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      position: 'relative',
      transform: `scale(${scale})`,
      opacity,
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        inset: -4,
        background: GRADIENTS.primary,
        borderRadius: 100,
        filter: 'blur(20px)',
        opacity: 0.6,
      }} />
      
      {/* Button */}
      <div style={{
        position: 'relative',
        padding: '24px 56px',
        background: GRADIENTS.primary,
        borderRadius: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
      }}>
        {/* Shimmer */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: shimmerX,
          width: 100,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        }} />
        
        <span style={{
          fontFamily: interFont,
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.white,
          position: 'relative',
        }}>
          {text}
        </span>
        
        {/* Arrow */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: 'relative' }}>
          <path d="M5 12h14m-7-7l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};

// ============================================
// SCÈNES DE LA VIDÉO
// ============================================

// Scene 1: Intro avec Logo (0-90 frames / 0-3s)
const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill>
      <AnimatedBackground />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 40,
      }}>
        <AnimatedLogo delay={10} size={100} />
        
        <AnimatedText
          delay={30}
          style={{
            fontFamily: interFont,
            fontSize: 28,
            color: COLORS.textTertiary,
            fontWeight: 500,
          }}
        >
          La référence pour les organismes de formation
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Problème / Pain Points (90-270 frames / 3-9s)
const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  
  const problems = [
    { icon: '😫', text: 'Gestion administrative chronophage' },
    { icon: '📄', text: 'Documents éparpillés partout' },
    { icon: '💸', text: 'Facturation CPF complexe' },
    { icon: '⚠️', text: 'Conformité Qualiopi stressante' },
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
        padding: 80,
      }}>
        <AnimatedText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.textPrimary,
            textAlign: 'center',
            marginBottom: 60,
          }}
        >
          Vous en avez assez de...
        </AnimatedText>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 24,
          maxWidth: 1000,
        }}>
          {problems.map((problem, i) => (
            <AnimatedText
              key={i}
              delay={20 + i * 15}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '24px 32px',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: 16,
                border: `1px solid ${COLORS.gray200}`,
                fontFamily: interFont,
                fontSize: 22,
                color: COLORS.textSecondary,
              }}
            >
              {problem.icon} {problem.text}
            </AnimatedText>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Solution / Headline (270-450 frames / 9-15s)
const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill>
      <AnimatedBackground variant="gradient" />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 80,
      }}>
        <GlowBadge delay={0}>
          Découvrez EduZen
        </GlowBadge>
        
        <div style={{ marginTop: 60, textAlign: 'center' }}>
          <AnimatedText
            delay={20}
            style={{
              fontFamily: spaceGroteskFont,
              fontSize: 72,
              fontWeight: 300,
              color: COLORS.white,
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Gérez votre organisme
          </AnimatedText>
          
          <AnimatedText
            delay={35}
            style={{
              fontFamily: spaceGroteskFont,
              fontSize: 72,
              fontWeight: 500,
              fontStyle: 'italic',
              color: COLORS.white,
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            de formation avec
          </AnimatedText>
          
          <AnimatedText
            delay={50}
            style={{
              fontFamily: spaceGroteskFont,
              fontSize: 96,
              fontWeight: 800,
              color: COLORS.white,
              letterSpacing: '-0.03em',
              textShadow: `0 0 80px ${COLORS.white}60`,
            }}
          >
            simplicité
          </AnimatedText>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Features (450-900 frames / 15-30s)
const Scene4Features: React.FC = () => {
  const frame = useCurrentFrame();
  
  const features = [
    { icon: '🎓', title: 'Gestion Formations', desc: 'Sessions, stagiaires, formateurs centralisés' },
    { icon: '💳', title: 'Facturation CPF', desc: 'Automatisation complète des paiements' },
    { icon: '✅', title: 'Conformité Qualiopi', desc: 'Documents générés automatiquement' },
  ];
  
  // Animation de slide des cards
  const slideProgress = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill>
      <AnimatedBackground />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 60,
      }}>
        <AnimatedText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textPrimary,
            marginBottom: 60,
            textAlign: 'center',
          }}
        >
          <span style={{ fontWeight: 300, fontStyle: 'italic' }}>Tout ce dont vous avez besoin pour </span>
          <span style={{
            background: GRADIENTS.primary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            réussir
          </span>
        </AnimatedText>
        
        <div style={{
          display: 'flex',
          gap: 32,
          justifyContent: 'center',
        }}>
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.desc}
              delay={20 + i * 20}
              index={i}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: Plus de Features (900-1200 frames / 30-40s)
const Scene5MoreFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  
  const features = [
    { icon: '📊', title: 'Reporting Avancé', desc: 'Tableaux de bord en temps réel' },
    { icon: '📧', title: 'Messagerie Intégrée', desc: 'Communication centralisée' },
    { icon: '🔒', title: 'Sécurité RGPD', desc: 'Données protégées et conformes' },
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
        padding: 60,
      }}>
        <AnimatedText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textPrimary,
            marginBottom: 60,
            textAlign: 'center',
          }}
        >
          Et bien plus encore...
        </AnimatedText>
        
        <div style={{
          display: 'flex',
          gap: 32,
          justifyContent: 'center',
        }}>
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.desc}
              delay={20 + i * 20}
              index={i}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 6: Social Proof / Stats (1200-1440 frames / 40-48s)
const Scene6Stats: React.FC = () => {
  const frame = useCurrentFrame();
  
  const stats = [
    { value: '500+', label: 'Organismes de formation' },
    { value: '98%', label: 'Taux de satisfaction' },
    { value: '-70%', label: 'Temps admin économisé' },
    { value: '100%', label: 'Conformité Qualiopi' },
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
        padding: 80,
      }}>
        <AnimatedText
          delay={0}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 48,
            fontWeight: 600,
            color: COLORS.white,
            marginBottom: 80,
            textAlign: 'center',
          }}
        >
          Ils nous font confiance
        </AnimatedText>
        
        <div style={{
          display: 'flex',
          gap: 48,
          justifyContent: 'center',
        }}>
          {stats.map((stat, i) => {
            const delay = 20 + i * 15;
            const scale = spring({
              frame: frame - delay,
              fps: 30,
              config: { damping: 12, stiffness: 100 },
            });
            const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
            
            return (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  transform: `scale(${scale})`,
                  opacity,
                }}
              >
                <div style={{
                  fontFamily: spaceGroteskFont,
                  fontSize: 72,
                  fontWeight: 800,
                  color: COLORS.white,
                  textShadow: `0 0 40px ${COLORS.white}40`,
                  marginBottom: 12,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: interFont,
                  fontSize: 20,
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

// Scene 7: CTA Final (1440-1800 frames / 48-60s)
const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  
  const trustBadges = [
    '✓ 14 jours d\'essai gratuit',
    '✓ Pas de carte requise',
    '✓ Support 24/7',
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
        padding: 80,
      }}>
        <AnimatedLogo delay={0} size={80} />
        
        <AnimatedText
          delay={20}
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.textPrimary,
            textAlign: 'center',
            marginTop: 48,
            marginBottom: 24,
            lineHeight: 1.2,
          }}
        >
          Prêt à transformer
        </AnimatedText>
        
        <AnimatedText
          delay={35}
          gradient
          style={{
            fontFamily: spaceGroteskFont,
            fontSize: 64,
            fontWeight: 800,
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          votre organisme ?
        </AnimatedText>
        
        <div style={{ marginTop: 20 }}>
          <AnimatedCTA text="Essayer gratuitement" delay={50} />
        </div>
        
        <div style={{
          display: 'flex',
          gap: 32,
          marginTop: 48,
        }}>
          {trustBadges.map((badge, i) => (
            <AnimatedText
              key={i}
              delay={70 + i * 10}
              style={{
                fontFamily: interFont,
                fontSize: 18,
                fontWeight: 500,
                color: COLORS.textTertiary,
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: 100,
                border: `1px solid ${COLORS.gray200}`,
              }}
            >
              {badge}
            </AnimatedText>
          ))}
        </div>
        
        <AnimatedText
          delay={100}
          style={{
            fontFamily: interFont,
            fontSize: 20,
            fontWeight: 600,
            marginTop: 48,
          }}
          gradient
        >
          eduzen.fr
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// COMPOSITION PRINCIPALE
// ============================================

export const EduZenVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      {/* Scene 1: Intro (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <Scene1Intro />
      </Sequence>
      
      {/* Scene 2: Problem (3-9s) */}
      <Sequence from={90} durationInFrames={180}>
        <Scene2Problem />
      </Sequence>
      
      {/* Scene 3: Solution (9-15s) */}
      <Sequence from={270} durationInFrames={180}>
        <Scene3Solution />
      </Sequence>
      
      {/* Scene 4: Features Part 1 (15-30s) */}
      <Sequence from={450} durationInFrames={450}>
        <Scene4Features />
      </Sequence>
      
      {/* Scene 5: Features Part 2 (30-40s) */}
      <Sequence from={900} durationInFrames={300}>
        <Scene5MoreFeatures />
      </Sequence>
      
      {/* Scene 6: Stats (40-48s) */}
      <Sequence from={1200} durationInFrames={240}>
        <Scene6Stats />
      </Sequence>
      
      {/* Scene 7: CTA (48-60s) */}
      <Sequence from={1440} durationInFrames={360}>
        <Scene7CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

export default EduZenVideo;
