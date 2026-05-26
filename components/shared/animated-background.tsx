"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-radial" />
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-rex-orange/15 blur-3xl animate-glow" />
      <div className="absolute top-1/2 -right-32 w-[40rem] h-[40rem] rounded-full bg-rex-cyan/10 blur-3xl animate-glow" />
      <div className="absolute bottom-0 left-1/3 w-[36rem] h-[36rem] rounded-full bg-violet-500/8 blur-3xl animate-glow" />
    </div>
  );
}
