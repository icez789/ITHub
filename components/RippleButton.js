'use client';

export default function RippleButton({ children, className = '', rippleColor, ...props }) {
  void rippleColor;
  return (
    <button className={`transition-colors ${className}`} {...props}>
      <span className="flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}
