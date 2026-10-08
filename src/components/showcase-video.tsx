import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export const showcaseVideos = {
  castle: '/videos/rumpelstiltskin-castle.mp4',
  forest: '/videos/rumpelstiltskin-forest.mp4',
  ballroom: '/videos/rumpelstiltskin-ballroom.mp4',
};

/** Muted samples only play while visible; reduced-motion users get controls. */
export function ShowcaseVideo({
  src,
  label,
  className,
  controls = true,
}: {
  src: string;
  label: string;
  className?: string;
  controls?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let globallyPaused =
      document.documentElement.dataset.showcasePaused === 'true';
    const sync = () => {
      video.controls = controls;
      if (visible && !motion.matches && !globallyPaused && !document.hidden) {
        void video.play().catch(() => {
          video.controls = controls;
        });
      } else video.pause();
    };
    const toggle = (event: Event) => {
      globallyPaused = (event as CustomEvent<boolean>).detail;
      sync();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.15 }
    );
    observer.observe(video);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('showcase-motion', toggle);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('showcase-motion', toggle);
      video.pause();
    };
  }, [src, controls]);
  return (
    <video
      ref={ref}
      src={src}
      poster={src.replace('.mp4', '.jpg')}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      controls={controls}
      aria-label={label}
    />
  );
}

export function ShowcasePlaybackControl({
  pauseLabel,
  playLabel,
}: {
  pauseLabel: string;
  playLabel: string;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      className="rumpel-video-toggle"
      aria-pressed={paused}
      onClick={() => {
        const next = !paused;
        document.documentElement.dataset.showcasePaused = String(next);
        window.dispatchEvent(
          new CustomEvent('showcase-motion', { detail: next })
        );
        setPaused(next);
      }}
    >
      {paused ? <Play size={14} /> : <Pause size={14} />}
      {paused ? playLabel : pauseLabel}
    </button>
  );
}
