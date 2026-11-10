import React from 'react';

export interface TransivoLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textColor?: string;
}

export const TransivoLogo: React.FC<TransivoLogoProps> = ({
  size = 38,
  showText = true,
  className = '',
  textColor = '#FFFFFF',
}) => {
  // Optimized Transivo brand emblem metrics from public/transivo-logo.webp (512x381, intrinsic ratio 1.344):
  // Directly cropped to the authentic emblem artwork with transparent alpha channel.
  // Preserves 100% of the authentic brand identity, colors, and geometry without scaling hacks.
  const emblemWidth = Math.round(size * 1.344);

  return (
    <div
      className={`transivo-logo-container ${className}`}
      dir="ltr"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.round(size * 0.25)}px`,
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* Authentic Transivo Emblem */}
      <div
        className="transivo-emblem-frame"
        style={{
          height: `${size}px`,
          width: `${emblemWidth}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <img
          src="/transivo-logo.webp"
          alt="Transivo"
          width={512}
          height={381}
          style={{
            height: '100%',
            width: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <span
          className="transivo-wordmark"
          style={{
            color: textColor,
            fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
            fontWeight: 800,
            fontSize: `${Math.round(size * 0.58)}px`,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            lineHeight: 1,
          }}
        >
          TRANSIVO
        </span>
      )}
    </div>
  );
};
