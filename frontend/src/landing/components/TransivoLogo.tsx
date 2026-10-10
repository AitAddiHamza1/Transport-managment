import React from 'react';

interface TransivoLogoProps {
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
  // SVG artwork metrics from public/favicon.svg (1536x1024):
  // Non-transparent emblem occupies minX: 370, maxX: 1248 (w=878), minY: 192, maxY: 845 (h=654).
  // Emblem intrinsic aspect ratio is 878 / 654 = ~1.342.
  // The emblem height represents 654 / 1024 = 63.87% of the total SVG canvas height.
  // Scaling factor 1.565 brings the visible emblem to exactly the container's height (size),
  // removing empty transparent borders while preserving 100% of the SVG artwork without distortion.
  const emblemWidth = Math.round(size * 1.34);
  const imgHeight = Math.round(size * 1.565);

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
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <img
          src="/favicon.svg"
          alt="Transivo"
          style={{
            height: `${imgHeight}px`,
            width: 'auto',
            maxWidth: 'none',
            objectFit: 'contain',
            display: 'block',
            // Centers the emblem horizontally (cx: 809 vs canvas center: 768)
            transform: 'translateX(2.6%)',
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
