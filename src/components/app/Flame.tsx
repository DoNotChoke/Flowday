type FlameProps = { size: number; lit: boolean; flicker?: boolean; label?: string };

// A lit flame for a day or a streak that counts, a grey one otherwise.
export function Flame({ size, lit, flicker = false, label }: FlameProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={flicker ? "origin-[50%_92%] animate-flicker motion-reduce:animate-none" : undefined}
    >
      <path
        d="M12 22c4.4 0 7.5-3 7.5-7.2 0-3.4-2-5.6-3.6-7.6-.4 1.6-1.3 2.7-2.4 3.2.3-3.4-1.2-6.5-4.5-8.4.3 3.1-1.4 5-3 6.9C4.6 10.8 4.5 12.6 4.5 14.8 4.5 19 7.6 22 12 22z"
        fill={lit ? "#F47258" : "#D6D6D1"}
        stroke="#151515"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {lit && <path d="M12 22c-2 0-3.3-1.4-3.3-3.3 0-1.8 1.4-3 2.4-4.2.3 1 .9 1.6 1.7 1.8 0-1.2.6-2.3 1.4-3 .5 1.6 2.1 2.8 2.1 5.2 0 2-1.6 3.5-4.3 3.5z" fill="#FFC94A" />}
    </svg>
  );
}
