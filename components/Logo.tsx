interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  darkBackground?: boolean;
  showText?: boolean;
}

const sizeConfig = {
  sm: { circle: 28, srFont: 10, wordmark: 'text-base' },
  md: { circle: 36, srFont: 13, wordmark: 'text-xl' },
  lg: { circle: 48, srFont: 17, wordmark: 'text-2xl' },
};

export default function Logo({ size = 'md', darkBackground = true, showText = false }: LogoProps) {
  const cfg = sizeConfig[size];
  const setColor = darkBackground ? 'text-white' : 'text-[#1a1a2e]';

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-full bg-[#F59E0B] flex-shrink-0"
        style={{ width: cfg.circle, height: cfg.circle }}
      >
        <span
          className="font-bold text-[#1a1a2e] leading-none select-none"
          style={{ fontSize: cfg.srFont }}
        >
          SR
        </span>
      </span>
      {showText && (
        <span className={`font-bold tracking-tight ${cfg.wordmark}`}>
          <span className={setColor}>Set</span>
          <span className="text-[#F59E0B]">Ready</span>
        </span>
      )}
    </span>
  );
}
