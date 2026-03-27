import React from 'react';

type AllowedTag = 'h1' | 'h2' | 'h3' | 'span' | 'div';

interface GlitchTextProps {
  text: string;
  tag?: AllowedTag;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * Renders text with a cyberpunk glitch effect using CSS pseudo-elements.
 * The global.css `.glitch-text` class drives the animation;
 * `data-intensity` controls speed via CSS attribute selectors.
 */
const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  tag = 'span',
  className = '',
  intensity = 'medium',
}) => {
  const Tag = tag;

  return (
    <Tag
      className={`glitch-text ${className}`}
      data-text={text}
      data-intensity={intensity}
      style={{
        /* Ensure the base text is visible and properly colored */
        color: 'var(--color-text-bright)',
      }}
    >
      {text}
    </Tag>
  );
};

export default GlitchText;
