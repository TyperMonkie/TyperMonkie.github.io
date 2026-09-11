import { useEffect, useRef } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

function ParticleCar({ rebuildKey = 0, themeScatter = 190, active = true }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!container || !canvas || !context) return undefined;

    let particles = [];
    let animationFrame = null;
    let resizeFrame = null;
    let gathering = true;
    let gatherStart = performance.now();
    let width = 0;
    let height = 0;
    let dpr = 1;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 };
    const image = new Image();

    const build = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!image.complete || !image.naturalWidth) return;

      // The supplied image has wide white margins. Crop to the physical car first,
      // then intentionally scale past the viewport for a clear editorial close-up.
      const sourceX = image.naturalWidth * 0.18;
      const sourceY = image.naturalHeight * 0.01;
      const sourceWidth = image.naturalWidth * 0.58;
      const sourceHeight = image.naturalHeight * 0.98;
      const sourceRatio = sourceWidth / sourceHeight;
      const displayHeight = height * (width < 720 ? 1.18 : 1.32);
      const displayWidth = displayHeight * sourceRatio;
      const offsetX = width / 2 - displayWidth / 2;
      const offsetY = height * 0.56 - displayHeight / 2;

      const sample = document.createElement('canvas');
      const sampleContext = sample.getContext('2d', { willReadFrequently: true });
      sample.width = Math.max(1, Math.round(displayWidth));
      sample.height = Math.max(1, Math.round(displayHeight));
      sampleContext.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sample.width,
        sample.height
      );

      const imageData = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
      const targets = [];
      const density = width < 720 ? 3 : 2;

      for (let y = 0; y < sample.height; y += density) {
        for (let x = 0; x < sample.width; x += density) {
          const index = (y * sample.width + x) * 4;
          const r = imageData[index];
          const g = imageData[index + 1];
          const b = imageData[index + 2];
          const luminance = r * 0.299 + g * 0.587 + b * 0.114;
          const orange = r > 175 && g > 50 && g < 195 && b < 125;

          if (luminance < 196 || orange) {
            targets.push({
              x: offsetX + x,
              y: offsetY + y,
              strength: clamp((215 - luminance) / 170, 0.35, 1),
              accent: orange
            });
          }
        }
      }

      const maxParticles = width < 720 ? 6500 : 14000;
      const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      const selected = targets.filter((_, index) => index % stride === 0);
      // Keep the first reveal composed, then let theme changes break the form
      // apart more dramatically before the car gathers back into focus.
      const scatter = reducedMotion ? 0 : rebuildKey > 0 ? themeScatter : 76;

      particles = selected.map((target, index) => {
        const seed = ((index * 9301 + 49297) % 233280) / 233280;
        const depth = 0.55 + (((index * 233 + 97) % 1000) / 1000) * 0.65;
        const angle = seed * Math.PI * 2;
        const distance = scatter * (0.3 + depth * 0.65);
        const startX = target.x + Math.cos(angle) * distance;
        const startY = target.y + Math.sin(angle) * distance;

        return {
          x: reducedMotion ? target.x : startX,
          y: reducedMotion ? target.y : startY,
          startX,
          startY,
          targetX: target.x,
          targetY: target.y,
          seed,
          depth,
          strength: target.strength,
          accent: target.accent,
          size: target.accent ? 2.05 : 1.05 + target.strength * 1.05,
          delay: reducedMotion ? 0 : seed * 240
        };
      });

      gatherStart = performance.now();
      gathering = !reducedMotion;
      pointer.x = pointer.smoothX = width / 2;
      pointer.y = pointer.smoothY = height / 2;
    };

    const render = now => {
      context.clearRect(0, 0, width, height);
      const styles = getComputedStyle(document.documentElement);
      const baseColor = styles.getPropertyValue('--particle');
      const accentColor = styles.getPropertyValue('--particle-hot');
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;
      let complete = true;

      particles.forEach(particle => {
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;

        if (gathering) {
          const local = (now - gatherStart - particle.delay) / 1180;
          progress = clamp(local, 0, 1);
          const eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        } else if (!reducedMotion) {
          // Preserve the ParticleText idle motion, but keep it sub-pixel so the
          // vehicle silhouette remains optically locked and immediately legible.
          const driftTime = now * 0.001;
          baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * 0.55 * particle.depth;
          baseY += Math.cos(driftTime * 0.75 + particle.depth * 10) * 0.55 * particle.depth;
        }

        if (pointer.active && !reducedMotion) {
          const dx = baseX - pointer.smoothX;
          const dy = baseY - pointer.smoothY;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < 210) {
            const force = Math.pow(1 - distance / 210, 2) * 70;
            baseX += (dx / distance) * force;
            baseY += (dy / distance) * force;
          }
        }

        const follow = reducedMotion ? 1 : 0.22;
        particle.x += (baseX - particle.x) * follow;
        particle.y += (baseY - particle.y) * follow;
        context.globalAlpha = particle.accent
          ? 0.98
          : clamp(0.58 + particle.strength * 0.4, 0, 1);
        context.fillStyle = particle.accent ? accentColor : baseColor;

        if (particle.size <= 2.1) {
          context.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
          );
        } else {
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
          context.fill();
        }
      });

      context.globalAlpha = 1;
      if (gathering && complete) gathering = false;
      animationFrame = requestAnimationFrame(render);
    };

    const handlePointerMove = event => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const handlePointerLeave = () => { pointer.active = false; };
    const queueBuild = () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(build);
    };

    image.onload = build;
    image.src = '/reference-car.png';
    const observer = new ResizeObserver(queueBuild);
    observer.observe(container);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    animationFrame = requestAnimationFrame(render);

    return () => {
      image.onload = null;
      observer.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    };
  }, [active, rebuildKey, themeScatter]);

  return <div ref={containerRef} className="particle-car" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

export default ParticleCar;
