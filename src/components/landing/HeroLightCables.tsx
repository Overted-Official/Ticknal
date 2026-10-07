'use client';

import React, { useEffect, useRef } from 'react';

/**
 * HeroLightCables
 * 
 * High-performance WebGL light cables background confined strictly to the Hero Section.
 * - Elegant organic curvature: cables flare outward in a sweeping arched bell curve.
 * - Rich brand gradient: Electric Cyan (#00a6ff) -> Royal Blue (#2962ff) -> Deep Violet (#941af5) -> Radiant Purple (#d924ff).
 * - Per-cable chromatic progression so vibrant purple and violet glow prominently on the outer wings and pulses.
 * - Monotonic hardware-VSync clock timing for perfectly smooth, jitter-free pulsing.
 * - Capped DPR (1.0) and dimensions for silky 60 FPS across all devices.
 * - Intelligent scroll culling: pauses rendering when scrolled past the hero section.
 */

const VERT_SRC = `
attribute vec2 a_pos;
void main() { 
    gl_Position = vec4(a_pos, 0.0, 1.0); 
}
`;

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uOriginY;

float sat(float x) { return clamp(x, 0.0, 1.0); }

vec3 getBrandGradient(float s) {
    vec3 c0 = vec3(0.00, 0.65, 1.00); // Electric Cyan #00a6ff
    vec3 c1 = vec3(0.16, 0.38, 1.00); // Royal Blue #2962ff
    vec3 c2 = vec3(0.58, 0.10, 0.96); // Vivid Violet #941af5
    vec3 c3 = vec3(0.85, 0.14, 1.00); // Radiant Purple #d924ff

    float t = sat(s);
    if (t < 0.20) return mix(c0, c1, t / 0.20);
    else if (t < 0.50) return mix(c1, c2, (t - 0.20) / 0.30);
    else return mix(c2, c3, (t - 0.50) / 0.50);
}

void main() {
    float ar = uRes.x / max(uRes.y, 1.0);
    vec2 uv = gl_FragCoord.xy / uRes;
    float s01 = 1.0 - uv.y;
    float across = (uv.x - 0.5) * ar;

    vec3 col = vec3(0.0);
    vec3 acc = vec3(0.0);
    float t = uTime;

    // Atmospheric CTA bloom directly behind the "Get started" button
    vec2 ctaGlowPos = vec2(across * 1.5, s01 - uOriginY);
    col += getBrandGradient(0.40) * exp(-dot(ctaGlowPos * vec2(2.0, 4.0), ctaGlowPos * vec2(2.0, 4.0)) * 14.0) * 0.55;

    // Progress normalized starting from the CTA button
    float relY = (s01 - uOriginY) / max(1.0 - uOriginY, 0.001);

    // Smooth emission right at the CTA: no harsh horizontal cut
    float emission = smoothstep(uOriginY - 0.02, uOriginY + 0.04, s01);

    // Fast sweeping trumpet flare starting right at button width
    float flare = mix(0.05, 3.85, pow(max(relY, 0.0), 0.70));

    // Fluid S-curve and waves
    float globalSCurve = 0.038 * sin(relY * 2.8 + 0.3) * (0.2 + 0.8 * max(relY, 0.0));
    float invThick = 1.0 / 0.0048;

    for (int i = 0; i < 30; i++) {
        float fi = float(i) / 29.0;
        float o = fi - 0.5;
        float rnd = fract(sin(fi * 78.233) * 43758.5453);

        float arch = o * (1.0 + abs(o) * 1.52) * flare * 1.15;
        float wave = 0.020 * sin(relY * 4.8 + fi * 9.5 + t * 0.45) * (0.25 + 0.75 * max(relY, 0.0));
        float yy = arch + globalSCurve + wave;

        float dd = (across - yy) * invThick;
        float core = 1.0 / (1.0 + dd * dd * 9.2);
        float sheath = 1.0 / (1.0 + dd * dd * 0.45);

        // Pulses flowing down from the CTA
        float ph = relY * 3.2 - t * 0.75 - rnd * 0.22;
        float f = fract(ph);
        float diff = (f - 0.50) * 6.0;
        float pulse = exp(-diff * diff);
        float w = (0.28 + 2.0 * pulse) * (0.65 + 0.35 * rnd);

        // Brand chromatic progression: cyan core to vibrant radiant purple wings
        float cableGradPos = sat(relY * 0.65 + abs(o) * 0.75);
        vec3 brandCol = getBrandGradient(cableGradPos);
        vec3 coreCol = mix(brandCol, vec3(0.85, 0.94, 1.0), 0.30);
        vec3 sheathCol = brandCol * 1.45;

        acc += (coreCol * core * 1.75 + sheathCol * sheath * 0.52) * w;
    }

    // Gentle bottom dissipation
    float bottomFade = 1.0 - smoothstep(0.85, 1.10, s01) * 0.35;
    col += acc * emission * bottomFade * 0.65;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('HeroLightCables compile:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function HeroLightCables() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let raf = 0;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });

    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return;
    }

    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const locs: Record<string, WebGLUniformLocation | null> = {};
    const u = (name: string) => {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
      return locs[name];
    };

    const render = (now: number) => {
      if (isCancelled) return;

      // If user scrolled far below the hero section, skip drawing to save 100% GPU
      const heroHeight = container.clientHeight || 900;
      if (typeof window !== 'undefined' && window.scrollY > heroHeight + 80) {
        raf = requestAnimationFrame(render);
        return;
      }

      // Monotonic hardware-clock timing: perfectly smooth 60fps
      const clock = (now * 0.00075) % 3600;

      // Capped DPR (1.0) & clamped dimensions for smooth 60 FPS
      const width = Math.min(container.clientWidth || window.innerWidth, 1440);
      const height = Math.min(container.clientHeight || 800, 950);
      const bw = Math.floor(width);
      const bh = Math.floor(height);

      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        gl.viewport(0, 0, bw, bh);
      }

      // Measure CTA button position dynamically
      let originY = 0.25;
      const cta = container.parentElement?.querySelector('a[href="/login"]');
      if (cta) {
        const ctaRect = cta.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        if (contRect.height > 0) {
          originY = (ctaRect.top + ctaRect.height * 0.5 - contRect.top) / contRect.height;
          originY = Math.max(0.18, Math.min(originY, 0.36));
        }
      } else {
        originY = (typeof window !== 'undefined' && window.innerWidth < 768) ? 0.32 : 0.25;
      }

      // Uniforms
      gl.uniform2f(u('uRes'), bw, bh);
      gl.uniform1f(u('uTime'), clock);
      gl.uniform1f(u('uOriginY'), originY);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      isCancelled = true;
      if (raf) cancelAnimationFrame(raf);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-black"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />
    </div>
  );
}
