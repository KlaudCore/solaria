// ===== INICIALIZACIÓN =====
const travelFrame = document.querySelector("#travelFrame");
const foamField = document.querySelector("#foamField");
const foamShadow = document.querySelector("#foamShadow");
const foamMain = document.querySelector("#foamMain");
const foamSpark = document.querySelector("#foamSpark");
const foamBand = document.querySelector("#foamBand");
const foamSpray = document.querySelector("#foamSpray");

const clamp = gsap.utils.clamp(0, 1);
const mapRange = gsap.utils.mapRange;

const SVGNS = "http://www.w3.org/2000/svg";
const sprayParticles = [];
for (let i = 0; i < 16; i += 1) {
  const dot = document.createElementNS(SVGNS, "circle");
  const particle = {
    el: dot,
    baseX: ((i + 0.5) / 16) * 100,
    drift: (i % 2 ? 1 : -1) * (1.4 + (i % 3) * 0.6),
    lift: 1.6 + (i % 4) * 1.1,
    phase: i * 0.83,
    r: 0.45 + (i % 3) * 0.15
  };
  dot.setAttribute("r", particle.r.toFixed(2));
  foamSpray.appendChild(dot);
  sprayParticles.push(particle);
}

gsap.registerPlugin(ScrollTrigger);
gsap.set(".ocean-plate", { scale: 1.02 });

const scrubTl = gsap.timeline({
  defaults: { ease: "none" },
  scrollTrigger: {
    trigger: ".scroll-track",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.65,
    invalidateOnRefresh: true,
    onUpdate: (self) => renderShoreline(self.progress)
  }
});

scrubTl
  .to(".ocean-plate", { yPercent: -9, scale: 1.08 }, 0)
  .to(".beach-copy .headline", { yPercent: -8 }, 0)
  .to(".destination-copy .headline", { yPercent: -4 }, 0);

// ===== PARALLAX EN RATÓN (solo si pointer fine y no reduce motion) =====
const finePointer = window.matchMedia("(pointer: fine)").matches;
const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (finePointer && motionOk) {
  const parallaxLayers = [
    { el: document.querySelector(".ocean-plate"), x: -5, y: -4 },
    { el: document.querySelector(".beach-copy"), x: -13, y: -9 },
    { el: document.querySelector(".destination-copy"), x: -9, y: -6 }
  ].filter((layer) => layer.el);

  const pointer = { tx: 0, ty: 0, cx: 0, cy: 0 };

  travelFrame.addEventListener("pointermove", (event) => {
    const rect = travelFrame.getBoundingClientRect();
    pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  travelFrame.addEventListener("pointerleave", () => {
    pointer.tx = 0;
    pointer.ty = 0;
  });

  gsap.ticker.add(() => {
    pointer.cx += (pointer.tx - pointer.cx) * 0.07;
    pointer.cy += (pointer.ty - pointer.cy) * 0.07;
    parallaxLayers.forEach((layer) => {
      gsap.set(layer.el, { x: layer.x * pointer.cx, y: layer.y * pointer.cy });
    });
  });
}

// ===== FUNCIÓN PRINCIPAL DE REVELADO =====
function renderShoreline(progress) {
  const reveal = clamp(mapRange(0.08, 0.82, 0, 1, progress));
  const eased = 1 - Math.pow(1 - reveal, 3);
  const yBase = gsap.utils.interpolate(112, -10, eased);
  const amplitude = gsap.utils.interpolate(5.8, 1.4, eased);
  const phase = progress * 8.5;
  const points = [];
  const pathPoints = [];

  for (let i = 0; i <= 38; i += 1) {
    const x = (i / 38) * 100;
    const longSwell = Math.sin((x * 0.105) + phase) * amplitude;
    const chop = Math.sin((x * 0.49) - phase * 1.35) * amplitude * 0.34;
    const diagonal = (x - 50) * 0.025;
    const y = yBase + longSwell + chop + diagonal;
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    pathPoints.push([x, y]);
  }

  travelFrame.style.setProperty("--sand-clip", `polygon(${points.join(", ")}, 100% 100%, 0% 100%)`);
  travelFrame.style.setProperty("--start-alpha", String(clamp(mapRange(0.56, 0.36, 0, 1, progress))));
  travelFrame.style.setProperty("--cue-alpha", String(clamp(mapRange(0.25, 0.16, 0, 1, progress))));
  travelFrame.style.setProperty("--details-alpha", String(clamp(mapRange(0.58, 0.75, 0, 1, progress))));
  travelFrame.style.setProperty("--sand-nav-alpha", String(clamp(mapRange(0.14, 0.25, 0, 1, progress))));

  const d = pathPoints
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`)
    .join(" ");

  foamShadow.setAttribute("d", d);
  foamMain.setAttribute("d", d);
  foamSpark.setAttribute("d", d);
  foamSpark.style.strokeDashoffset = String(-progress * 120);

  const bandHeight = gsap.utils.interpolate(8, 3, eased);
  let bandD = d;
  for (let i = pathPoints.length - 1; i >= 0; i -= 1) {
    const [bx, by] = pathPoints[i];
    const ripple = Math.sin((bx * 0.32) - phase * 1.1) * (bandHeight * 0.16);
    bandD += ` L ${bx.toFixed(3)} ${(by + bandHeight + ripple).toFixed(3)}`;
  }
  bandD += " Z";
  foamBand.setAttribute("d", bandD);
  const bandEnv =
    clamp(mapRange(0.12, 0.26, 0, 1, progress)) *
    clamp(mapRange(0.86, 0.66, 0, 1, progress));
  foamBand.setAttribute("opacity", (0.5 + 0.5 * bandEnv).toFixed(3));

  const sprayEnv =
    clamp(mapRange(0.16, 0.32, 0, 1, progress)) *
    clamp(mapRange(0.78, 0.6, 0, 1, progress));
  sprayParticles.forEach((p) => {
    const sx = p.baseX + Math.sin(phase * 0.6 + p.phase) * p.drift;
    const swell = Math.sin((sx * 0.105) + phase) * amplitude;
    const chopS = Math.sin((sx * 0.49) - phase * 1.35) * amplitude * 0.34;
    const crestY = yBase + swell + chopS + (sx - 50) * 0.025;
    const twinkle = 0.5 + 0.5 * Math.sin(phase * 1.8 + p.phase * 1.7);
    p.el.setAttribute("cx", sx.toFixed(2));
    p.el.setAttribute("cy", (crestY - p.lift * (0.6 + 0.4 * twinkle)).toFixed(2));
    p.el.setAttribute("opacity", (sprayEnv * (0.35 + 0.65 * twinkle)).toFixed(3));
  });

  foamField.style.opacity = String(
    clamp(mapRange(0.08, 0.2, 0, 1, progress)) *
    clamp(mapRange(0.95, 0.78, 0, 1, progress))
  );
}

renderShoreline(0);
window.addEventListener("load", () => ScrollTrigger.refresh());

// ===== ROUGH NOTATION (subrayados activos) =====
if (window.RoughNotation) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const underlineTargets = [
    { selector: ".water-nav .nav-links a.active", color: "#e65100" },
    { selector: ".sand-nav .nav-links a.active", color: "#e65100" }
  ];

  document.fonts.ready.then(() => {
    underlineTargets.forEach(({ selector, color }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      RoughNotation.annotate(el, {
        type: "underline",
        color,
        strokeWidth: 2.5,
        padding: 3,
        iterations: 2,
        animationDuration: 800,
        animate: !reduceMotion
      }).show();
    });
  });
}