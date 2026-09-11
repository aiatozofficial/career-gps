'use client';
import { cn } from '@/lib/utils';

export function GradientBackground({
  children,
  className = '',
  overlay = false,
  overlayOpacity = 0.55,
  enableCenterContent = false,
}) {
  return (
    <div className={cn('w-full relative min-h-screen overflow-hidden bg-transparent', className)}>
      {/* Solid Light Pastel Blue-Gray Background Layer */}
      <div className="absolute inset-0 bg-[#edf2f7] pointer-events-none z-0" />

      {/* Optional Contrast Protection Overlay */}
      {overlay && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-10"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content Wrapper */}
      {children && (
        <div
          className={cn(
            'relative z-20 flex min-h-screen w-full',
            enableCenterContent ? 'items-center justify-center' : 'flex-col'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
