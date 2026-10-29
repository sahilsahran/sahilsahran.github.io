import { useEffect, useRef } from 'react';
import { readColorToken } from '@/lib/theme';

interface ParallaxGridProps {
  visible: boolean;
  paused?: boolean;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec2  u_resolution;
  uniform float u_offset;
  uniform vec3  u_line;   // --c-grid
  uniform vec3  u_bg;     // --c-bg

  void main() {
    vec2 px = gl_FragCoord.xy;
    vec2 shifted = vec2(px.x + u_offset, px.y);
    vec2 cell = fract(shifted / 40.0) * 40.0;
    float line = step(39.0, cell.x) + step(39.0, cell.y);
    gl_FragColor = vec4(mix(u_bg, u_line, clamp(line, 0.0, 1.0)), 1.0);
  }
`;

const TARGET_FPS = 20;            // 20 redraws/sec
const FRAME_MS = 1000 / TARGET_FPS;

function initWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error('VS error:', gl.getShaderInfoLog(vs));
    return null;
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FRAGMENT_SHADER);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error('FS error:', gl.getShaderInfoLog(fs));
    return null;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Link error:', gl.getProgramInfoLog(prog));
    return null;
  }

  gl.useProgram(prog);

  const verts = new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  (gl as any).__prog = prog;
  (gl as any).__uRes = gl.getUniformLocation(prog, 'u_resolution');
  (gl as any).__uOff = gl.getUniformLocation(prog, 'u_offset');
  (gl as any).__uLine = gl.getUniformLocation(prog, 'u_line');
  (gl as any).__uBg = gl.getUniformLocation(prog, 'u_bg');

  return gl;
}

export function ParallaxGrid({ visible, paused = false }: ParallaxGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const startRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);

  // One-time WebGL setup + ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = initWebGL(canvas);
    if (!gl) {
      return; // the canvas's CSS background shows instead
    }
    glRef.current = gl;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    requestAnimationFrame(resize);

    return () => {
      observer.disconnect();
      const prog = (gl as any).__prog;
      if (prog) gl.deleteProgram(prog);
    };
  }, []);

  // Throttled draw loop — only fires at TARGET_FPS, not display refresh rate
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!visible || !glRef.current) return;

    if (paused) {
      pauseStartRef.current = performance.now();
      return;
    } else if (pauseStartRef.current > 0 && startRef.current > 0) {
      // Adjust start time to ignore the duration we were paused
      startRef.current += (performance.now() - pauseStartRef.current);
      pauseStartRef.current = 0;
    }

    const gl = glRef.current;
    const canvas = canvasRef.current!;

    const draw = () => {
      if (!startRef.current) startRef.current = performance.now();
      const elapsed = (performance.now() - startRef.current) / 1000;
      const offset = (elapsed * 5) % 40;

      const uRes = (gl as any).__uRes;
      const uOff = (gl as any).__uOff;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uOff, offset);
      // Colors follow the active theme (cheap to read at this frame rate)
      gl.uniform3fv((gl as any).__uLine, readColorToken('grid'));
      gl.uniform3fv((gl as any).__uBg, readColorToken('bg'));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // Initial draw
    draw();
    // Then at throttled rate
    timerRef.current = window.setInterval(draw, FRAME_MS);

    return () => clearInterval(timerRef.current);
  }, [visible, paused]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{
        display: visible ? 'block' : 'none',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgb(var(--c-bg))',
      }}
    />
  );
}
