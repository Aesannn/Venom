import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  speedFactor: number;
}

export const AtmosphericCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try to get WebGL context, with fallback to high-perf Canvas2D if WebGL is unavailable
    const gl = canvas.getContext('webgl', { alpha: false, depth: false, antialias: true });
    if (!gl) {
      console.warn('WebGL not supported, falling back to 2D canvas rendering');
      initCanvas2D(canvas);
      return;
    }

    // ==========================================
    // WebGL GENERATIVE SHADER BACKDROP
    // ==========================================

    // Simple quad vertex shader
    const vsSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Dynamic spatial noise fragment shader simulating VisionOS background
    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;

      // Soft cosine color palette generator
      vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
        return a + b * cos( 6.28318 * (c * t + d) );
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        
        // Slow drifting centers for 3-layer light fields
        vec2 p1 = vec2(
          0.5 + 0.25 * sin(uTime * 0.06),
          0.5 + 0.15 * cos(uTime * 0.04)
        );
        vec2 p2 = vec2(
          0.3 + 0.20 * cos(uTime * 0.05 + 1.5),
          0.4 + 0.25 * sin(uTime * 0.07 + 0.8)
        );
        vec2 p3 = vec2(
          0.7 + 0.18 * sin(uTime * 0.033 - 1.2),
          0.6 + 0.22 * cos(uTime * 0.057 + 2.1)
        );

        // Volumetric hover cursor light glow
        vec2 mouseUv = uMouse / uResolution;
        float mouseGlow = 1.0 - smoothstep(0.0, 0.45, distance(uv, mouseUv));
        
        // Calculate smooth radial fields
        float d1 = distance(uv, p1);
        float d2 = distance(uv, p2);
        float d3 = distance(uv, p3);

        // Interlocking color mixing
        float mixVal = sin(d1 * 4.0 - uTime * 0.08) * 0.5 + 0.5;
        mixVal += cos(d2 * 3.5 + uTime * 0.04) * 0.25;

        // Premium dark luxury color palette configuration
        vec3 darkBase = vec3(0.047, 0.047, 0.063); // Deep cosmic void
        vec3 nebulaColor1 = vec3(0.078, 0.118, 0.235); // Soft indigo
        vec3 nebulaColor2 = vec3(0.137, 0.078, 0.216); // Muted deep violet
        vec3 auraGlow = vec3(0.176, 0.275, 0.353); // Translucent steel blue

        vec3 color = darkBase;
        
        // Layer blending
        color = mix(color, nebulaColor1, 1.0 - smoothstep(0.0, 0.9, d1));
        color = mix(color, nebulaColor2, (1.0 - smoothstep(0.0, 0.8, d2)) * 0.85);
        color = mix(color, auraGlow, (1.0 - smoothstep(0.0, 0.95, d3)) * 0.4);
        
        // Add cursor interactive lighting field
        color += vec3(0.078, 0.137, 0.196) * mouseGlow * 0.28;

        // Vignette
        float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
        vignette = clamp(pow(16.0 * vignette, 0.25), 0.0, 1.0);
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Helper to compile shader
    function compileShader(source: string, type: number): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    const positionAttribute = gl.getAttribLocation(program, 'position');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uMouse = gl.getUniformLocation(program, 'uMouse');

    // Create quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // ==========================================
    // FLOATING MICRO-PARTICLES (Drawn via Overlay Canvas)
    // ==========================================
    // Setup a overlay particle simulation rendering on top
    const particleCanvas = document.createElement('canvas');
    particleCanvas.style.position = 'absolute';
    particleCanvas.style.top = '0';
    particleCanvas.style.left = '0';
    particleCanvas.style.width = '100%';
    particleCanvas.style.height = '100%';
    particleCanvas.style.pointerEvents = 'none';
    particleCanvas.style.zIndex = '1';
    particleCanvas.style.opacity = '0.45';
    canvas.parentNode?.insertBefore(particleCanvas, canvas.nextSibling);

    const ctx = particleCanvas.getContext('2d')!;
    const particles: Particle[] = [];
    const maxParticles = 65; // Balanced, restrained count for cinematic neatness

    function initParticles(width: number, height: number) {
      particles.length = 0;
      for (let i = 0; i < maxParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          size: Math.random() * 1.5 + 0.6,
          alpha: 0,
          baseAlpha: Math.random() * 0.35 + 0.15,
          speedFactor: Math.random() * 0.5 + 0.5,
        });
      }
    }

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      particleCanvas.width = w;
      particleCanvas.height = h;
      gl.viewport(0, 0, w, h);
      initParticles(w, h);
    };

    window.addEventListener('resize', resize);
    resize();

    // Mouse tracker
    const handleMouseMove = (e: MouseEvent) => {
      const m = mouseRef.current;
      m.x = e.clientX;
      // Invert Y coordinate for WebGL coordinates
      m.y = window.innerHeight - e.clientY;
      
      const dx = e.clientX - m.lastX;
      const dy = e.clientY - m.lastY;
      m.vx = dx * 0.15;
      m.vy = dy * 0.15;
      m.lastX = e.clientX;
      m.lastY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      time += 0.05;

      // WebGL Shader Draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(uTime, time);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Particle Overlay Draw
      ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      const m = mouseRef.current;

      // Soft decay of mouse velocity
      m.vx *= 0.95;
      m.vy *= 0.95;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Dynamic wind drag equations (particle pushes out of cursor path)
        const dx = p.x - m.lastX;
        const dy = p.y - (window.innerHeight - m.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 180) {
          const force = (180 - dist) / 180;
          const angle = Math.atan2(dy, dx);
          // Apply push + damp back
          p.vx += Math.cos(angle) * force * 0.08 * p.speedFactor;
          p.vy += Math.sin(angle) * force * 0.08 * p.speedFactor;
        }

        // Apply friction and brownian drift
        p.vx = p.vx * 0.92 + (Math.random() - 0.5) * 0.01;
        p.vy = p.vy * 0.92 + (Math.random() - 0.5) * 0.01;

        // Move
        p.x += p.vx + (Math.random() - 0.5) * 0.02;
        p.y += p.vy - 0.03 * p.speedFactor; // slow upward thermal drift

        // Seamless wrap around edges
        if (p.x < 0) p.x = particleCanvas.width;
        if (p.x > particleCanvas.width) p.x = 0;
        if (p.y < 0) p.y = particleCanvas.height;
        if (p.y > particleCanvas.height) p.y = 0;

        // Animate alpha fades
        if (p.alpha < p.baseAlpha) {
          p.alpha += 0.01;
        }

        // Draw micro glow particle
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
        grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha * 0.95})`);
        grad.addColorStop(0.3, `rgba(168, 204, 255, ${p.alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Cleanups
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      particleCanvas.remove();
      gl.deleteBuffer(positionBuffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
    };
  }, []);

  // Standard high-efficiency Canvas 2D fallback for compatibility
  const initCanvas2D = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      time += 0.02;
      const w = canvas.width;
      const h = canvas.height;

      // Volumetric fluid gradient simulation
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);

      // Gradient 1 (Indigo field)
      const x1 = w * 0.5 + Math.sin(time * 0.4) * w * 0.15;
      const y1 = h * 0.5 + Math.cos(time * 0.3) * h * 0.12;
      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, w * 0.55);
      grad1.addColorStop(0, 'rgba(20, 30, 60, 0.45)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      // Gradient 2 (Deep Muted Violet field)
      const x2 = w * 0.35 + Math.cos(time * 0.3) * w * 0.18;
      const y2 = h * 0.45 + Math.sin(time * 0.5) * h * 0.15;
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, w * 0.5);
      grad2.addColorStop(0, 'rgba(35, 20, 55, 0.4)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-[1]"
      style={{ 
        filter: 'contrast(1.05) brightness(0.95)',
        opacity: 0.4,
        mixBlendMode: 'screen'
      }}
    />
  );
};
