'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export type MascotColor = string | number[];

export const TICKNAL_PLATFORM_GRADIENT: MascotColor[] = [
  '#00BCE6', // Cyan
  '#2962FF', // Electric Blue
  '#7928CA', // Vivid Violet
  '#D500F9', // Electric Magenta
  '#090C20', // Deep Space Midnight base
];

export const TICKNAL_PLATFORM_GRADIENT_GL: number[][] = [
  [0.0, 0.737, 0.902, 1.0], // #00BCE6 Cyan
  [0.161, 0.384, 1.0, 1.0], // #2962FF Electric Blue
  [0.475, 0.157, 0.792, 1.0], // #7928CA Vivid Violet
  [0.835, 0.0, 0.976, 1.0], // #D500F9 Electric Magenta
  [0.035, 0.047, 0.125, 1.0], // #090C20 Deep Midnight Navy
];

function parseColorToGl(color: MascotColor): number[] {
  if (Array.isArray(color)) {
    if (color.length === 3) return [color[0], color[1], color[2], 1.0];
    return color;
  }
  if (typeof color === 'string') {
    let hex = color.trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1.0];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return [r, g, b, a];
    }
  }
  return [1.0, 1.0, 1.0, 1.0];
}

interface GhostMascotProps {
  className?: string;
  width?: number;
  height?: number;
  colors?: MascotColor[];
  distortion?: number;
  swirl?: number;
}

const VS_SOURCE = `#version 300 es
precision mediump float;
layout(location = 0) in vec4 a_position;
out vec2 v_objectUV;
void main() {
  gl_Position = a_position;
  v_objectUV = a_position.xy * 0.5;
}
`;

const FS_SOURCE = `#version 300 es
precision mediump float;
uniform float u_time;
uniform vec4 u_colors[10];
uniform float u_colorsCount;
uniform float u_distortion;
uniform float u_swirl;
in vec2 v_objectUV;
out vec4 fragColor;

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

vec2 getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + mod(float(i), 3.) * .3;
  float c = .8 + mod(float(i + 1), 4.) * 0.25;
  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);
  return .5 + .5 * vec2(x, y);
}

void main() {
  vec2 shape_uv = v_objectUV;
  shape_uv += .5;
  float t = .5 * u_time;

  float radius = smoothstep(0., 1., length(shape_uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    shape_uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., shape_uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., shape_uv.y));
    shape_uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., shape_uv.x));
  }

  vec2 uvRotated = shape_uv;
  uvRotated -= vec2(.5);
  float angle = 3. * u_swirl * radius;
  uvRotated = rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < 10; i++) {
    if (i >= int(u_colorsCount)) break;
    vec2 pos = getPosition(i, t);
    vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
    float opacityFraction = u_colors[i].a;
    float dist = length(uvRotated - pos);
    dist = pow(dist, 3.5);
    float weight = 1. / (dist + 1e-3);
    color += colorFraction * weight;
    opacity += opacityFraction * weight;
    totalWeight += weight;
  }

  color /= totalWeight;
  opacity /= totalWeight;
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
  fragColor = vec4(color, opacity);
}
`;

const GHOST_PATH_D =
  'M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z';

export default function GhostMascot({
  className = '',
  width = 150,
  height = 190,
  colors = TICKNAL_PLATFORM_GRADIENT,
  distortion = 0.8,
  swirl = 0.1,
}: GhostMascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  const colorsKey = JSON.stringify(colors);

  // 1. Mouse Tracking for Ghost Eyes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) * 0.08;
      const dy = (e.clientY - centerY) * 0.08;
      const maxOffset = 10;
      setEyeOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, dx)),
        y: Math.max(-maxOffset, Math.min(maxOffset, dy)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 2. Native WebGL2 Liquid Shader Setup & Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) {
      console.warn('WebGL2 not supported');
      return;
    }

    function createShader(type: number, source: string) {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const activeColors = (colors && colors.length > 0 ? colors : TICKNAL_PLATFORM_GRADIENT)
      .slice(0, 10)
      .map(parseColorToGl);

    const flatColors = activeColors.flat();
    const colorsLoc = gl.getUniformLocation(program, 'u_colors');
    gl.uniform4fv(colorsLoc, new Float32Array(flatColors));

    gl.uniform1f(gl.getUniformLocation(program, 'u_colorsCount'), activeColors.length);
    gl.uniform1f(gl.getUniformLocation(program, 'u_distortion'), distortion);
    gl.uniform1f(gl.getUniformLocation(program, 'u_swirl'), swirl);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    let animId: number;
    const start = performance.now();

    function render() {
      if (!gl || !canvas) return;
      const now = performance.now();
      const elapsed = (now - start) * 0.001;
      gl.uniform1f(timeLoc, elapsed);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [colorsKey, distortion, swirl]);

  return (
    <motion.div
      ref={containerRef}
      className={`relative select-none pointer-events-none ${className}`}
      style={{ width, height, transformOrigin: 'top center' }}
      animate={{ y: [0, -8, 0], scaleY: [1, 1.06, 1] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* SVG Canvas Container with Responsive Vector Clipping */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 231 289"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <clipPath id="ghostShapeClip">
            <path d={GHOST_PATH_D} />
          </clipPath>
        </defs>

        {/* 1. WebGL Canvas inside SVG foreignObject clipped to the Ghost shape */}
        <foreignObject width="231" height="289" clipPath="url(#ghostShapeClip)">
          <div className="w-full h-full">
            <canvas
              ref={canvasRef}
              width={462}
              height={578}
              className="w-full h-full block"
            />
          </div>
        </foreignObject>

        {/* 2. Interactive Eyes with spring tracking & autonomous blinking */}
        <motion.ellipse
          rx="19"
          ry="29"
          fill="#ffffff"
          className="animate-blink"
          animate={{ cx: 80 + eyeOffset.x, cy: 120 + eyeOffset.y }}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        />
        <motion.ellipse
          rx="19"
          ry="29"
          fill="#ffffff"
          className="animate-blink"
          animate={{ cx: 151 + eyeOffset.x, cy: 120 + eyeOffset.y }}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        />
      </svg>

      {/* Autonomous Blinking Animation */}
      <style jsx>{`
        .animate-blink {
          animation: ghostBlink 3.2s infinite ease-in-out;
          transform-origin: center;
        }

        @keyframes ghostBlink {
          0%,
          88%,
          100% {
            transform: scaleY(1);
          }
          94% {
            transform: scaleY(0.08);
          }
        }
      `}</style>
    </motion.div>
  );
}
