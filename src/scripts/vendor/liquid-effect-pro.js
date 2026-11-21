/**
 * Fluid Cursor Effect - Liquid Pro
 * Standalone implementation for any website
 * Just include this script and it will work automatically
 */

class FluidCursor {
  constructor(options = {}) {
    // Configuration
    this.config = {
      simResolution: options.simResolution || 128,
      dyeResolution: options.dyeResolution || 1440,
      captureResolution: options.captureResolution || 512,
      densityDissipation: options.densityDissipation || 3.5,
      velocityDissipation: options.velocityDissipation || 2,
      pressure: options.pressure || 0.1,
      pressureIterations: options.pressureIterations || 20,
      curl: options.curl || 3,
      splatRadius: options.splatRadius || 0.2,
      splatForce: options.splatForce || 6000,
      shading: options.shading !== false,
      colorUpdateSpeed: options.colorUpdateSpeed || 10,
      backColor: options.backColor || { r: 0.5, g: 0, b: 0 },
      transparent: options.transparent !== false,
    };

    this.canvas = null;
    this.gl = null;
    this.ext = null;
    this.pointers = [this.pointerPrototype()];
    this.lastUpdateTime = Date.now();
    this.colorUpdateTimer = 0;

    this.init();
  }

  pointerPrototype() {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: { r: 0, g: 0, b: 0 },
    };
  }

  init() {
    // Create canvas element
    this.canvas = document.createElement("canvas");
    this.canvas.id = "fluid-cursor";
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999;
    `;
    document.body.appendChild(this.canvas);

    // Get WebGL context
    const glContext = this.getWebGLContext(this.canvas);
    this.gl = glContext.gl;
    this.ext = glContext.ext;

    if (!this.gl || !this.ext) {
      console.error("Unable to initialize WebGL");
      return;
    }

    // Reduce resolution if no linear filtering
    if (!this.ext.supportLinearFiltering) {
      this.config.dyeResolution = 256;
      this.config.shading = false;
    }

    this.initPrograms();
    this.initFramebuffers();
    this.updateKeywords();
    this.setupEventListeners();
    this.startRendering();
  }

  getWebGLContext(canvas) {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };

    let gl = canvas.getContext("webgl2", params);
    if (!gl) {
      gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
    }

    if (!gl) {
      throw new Error("Unable to initialize WebGL.");
    }

    const isWebGL2 = "drawBuffers" in gl;
    let supportLinearFiltering = false;
    let halfFloat = null;

    if (isWebGL2) {
      gl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
    }

    gl.clearColor(0, 0, 0, 1);

    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES) || 0;

    const formatRGBA = this.getSupportedFormat(
      gl,
      isWebGL2 ? gl.RGBA16F : gl.RGBA,
      gl.RGBA,
      halfFloatTexType
    );
    const formatRG = this.getSupportedFormat(
      gl,
      isWebGL2 ? gl.RG16F : gl.RGBA,
      isWebGL2 ? gl.RG : gl.RGBA,
      halfFloatTexType
    );
    const formatR = this.getSupportedFormat(
      gl,
      isWebGL2 ? gl.R16F : gl.RGBA,
      isWebGL2 ? gl.RED : gl.RGBA,
      halfFloatTexType
    );

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering,
      },
    };
  }

  getSupportedFormat(gl, internalFormat, format, type) {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      if ("drawBuffers" in gl) {
        switch (internalFormat) {
          case gl.R16F:
            return this.getSupportedFormat(gl, gl.RG16F, gl.RG, type);
          case gl.RG16F:
            return this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
          default:
            return null;
        }
      }
      return null;
    }
    return { internalFormat, format };
  }

  supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    if (!texture) return false;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    if (!fbo) return false;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  hashCode(s) {
    if (!s.length) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  addKeywords(source, keywords) {
    if (!keywords) return source;
    let keywordsString = "";
    for (const keyword of keywords) {
      keywordsString += `#define ${keyword}\n`;
    }
    return keywordsString + source;
  }

  compileShader(type, source, keywords = null) {
    const shaderSource = this.addKeywords(source, keywords);
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, shaderSource);
    this.gl.compileShader(shader);
    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    if (!vertexShader || !fragmentShader) return null;
    const program = this.gl.createProgram();
    if (!program) return null;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    return program;
  }

  getUniforms(program) {
    const uniforms = {};
    const uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(program, i);
      if (uniformInfo) {
        uniforms[uniformInfo.name] = this.gl.getUniformLocation(program, uniformInfo.name);
      }
    }
    return uniforms;
  }

  Program(vertexShader, fragmentShader) {
    return {
      program: this.createProgram(vertexShader, fragmentShader),
      uniforms: this.getUniforms(this.createProgram(vertexShader, fragmentShader)),
      bind: function () {
        if (this.program) this.gl.useProgram(this.program);
      },
    };
  }

  initPrograms() {
    const baseVertexShader = this.compileShader(
      this.gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
    
        void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `
    );

    const copyShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
    
        void main () {
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `
    );

    const clearShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
    
        void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `
    );

    const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform vec2 texelSize;
    
        vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
        }
    
        void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;
    
            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);
    
            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);
    
            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
          #endif
    
          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
        }
      `;

    const splatShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
    
        void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
        }
      `
    );

    const advectionShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
    
        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);
    
          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    
          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }
    
        void main () {
          #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
        }
      `,
      this.ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]
    );

    const divergenceShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
    
        void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;
    
          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }
    
          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `
    );

    const curlShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
    
        void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `
    );

    const vorticityShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
    
        void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;
    
          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;
    
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity += force * dt;
          velocity = min(max(velocity, -1000.0), 1000.0);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `
    );

    const pressureShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
    
        void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float C = texture2D(uPressure, vUv).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `
    );

    const gradientSubtractShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
    
        void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `
    );

    this.copyProgram = this.createProgram(baseVertexShader, copyShader);
    this.clearProgram = this.createProgram(baseVertexShader, clearShader);
    this.splatProgram = this.createProgram(baseVertexShader, splatShader);
    this.advectionProgram = this.createProgram(baseVertexShader, advectionShader);
    this.divergenceProgram = this.createProgram(baseVertexShader, divergenceShader);
    this.curlProgram = this.createProgram(baseVertexShader, curlShader);
    this.vorticityProgram = this.createProgram(baseVertexShader, vorticityShader);
    this.pressureProgram = this.createProgram(baseVertexShader, pressureShader);
    this.gradientSubtractProgram = this.createProgram(baseVertexShader, gradientSubtractShader);
    this.displayMaterial = { program: null, uniforms: {}, shader: displayShaderSource };
    this.updateDisplayMaterial();
  }

  updateDisplayMaterial() {
    const keywords = this.config.shading ? ["SHADING"] : [];
    const keywordsString = keywords.map((k) => `#define ${k}\n`).join("");
    const source = keywordsString + this.displayMaterial.shader;

    const vertexShader = this.compileShader(
      this.gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
    
        void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `
    );

    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, source);
    this.displayMaterial.program = this.createProgram(vertexShader, fragmentShader);
    this.displayMaterial.uniforms = this.getUniforms(this.displayMaterial.program);
  }

  initBlit() {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      this.gl.STATIC_DRAW
    );
    const elemBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, elemBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      this.gl.STATIC_DRAW
    );
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(0);
  }

  blit(target, doClear = false) {
    if (!target) {
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    } else {
      this.gl.viewport(0, 0, target.width, target.height);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
    }
    if (doClear) {
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  }

  createFBO(w, h, internalFormat, format, type, param) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, param);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, param);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );
    this.gl.viewport(0, 0, w, h);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const texelSizeX = 1 / w;
    const texelSizeY = 1 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach: (id) => {
        this.gl.activeTexture(this.gl.TEXTURE0 + id);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  createDoubleFBO(w, h, internalFormat, format, type, param) {
    const fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    const fbo2 = this.createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      read: fbo1,
      write: fbo2,
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
    };
  }

  resizeFBO(target, w, h, internalFormat, format, type, param) {
    const newFBO = this.createFBO(w, h, internalFormat, format, type, param);
    this.gl.useProgram(this.copyProgram);
    this.gl.uniform1i(this.getUniforms(this.copyProgram).uTexture, target.attach(0));
    this.blit(newFBO, false);
    return newFBO;
  }

  resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = this.createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1 / w;
    target.texelSizeY = 1 / h;
    return target;
  }

  getResolution(resolution) {
    const w = this.gl.drawingBufferWidth;
    const h = this.gl.drawingBufferHeight;
    const aspectRatio = w / h;
    const aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspect);
    if (w > h) {
      return { width: max, height: min };
    }
    return { width: min, height: max };
  }

  scaleByPixelRatio(input) {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  initFramebuffers() {
    const simRes = this.getResolution(this.config.simResolution);
    const dyeRes = this.getResolution(this.config.dyeResolution);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST;

    this.gl.disable(this.gl.BLEND);

    this.dye = this.createDoubleFBO(
      dyeRes.width,
      dyeRes.height,
      rgba.internalFormat,
      rgba.format,
      texType,
      filtering
    );

    this.velocity = this.createDoubleFBO(
      simRes.width,
      simRes.height,
      rg.internalFormat,
      rg.format,
      texType,
      filtering
    );

    this.divergence = this.createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      this.gl.NEAREST
    );

    this.curl = this.createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      this.gl.NEAREST
    );

    this.pressure = this.createDoubleFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      this.gl.NEAREST
    );

    this.initBlit();
  }

  updateKeywords() {
    if (this.config.shading) {
      this.updateDisplayMaterial();
    }
  }

  updateFrame() {
    const dt = this.calcDeltaTime();
    if (this.resizeCanvas()) this.initFramebuffers();
    this.updateColors(dt);
    this.applyInputs();
    this.step(dt);
    this.render(null);
    requestAnimationFrame(() => this.updateFrame());
  }

  calcDeltaTime() {
    const now = Date.now();
    let dt = (now - this.lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    this.lastUpdateTime = now;
    return dt;
  }

  resizeCanvas() {
    const width = this.scaleByPixelRatio(this.canvas.clientWidth);
    const height = this.scaleByPixelRatio(this.canvas.clientHeight);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      return true;
    }
    return false;
  }

  updateColors(dt) {
    this.colorUpdateTimer += dt * this.config.colorUpdateSpeed;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach((p) => {
        p.color = this.generateColor();
      });
    }
  }

  applyInputs() {
    for (const p of this.pointers) {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    }
  }

  step(dt) {
    this.gl.disable(this.gl.BLEND);

    // Curl
    this.gl.useProgram(this.curlProgram);
    const curlUniforms = this.getUniforms(this.curlProgram);
    this.gl.uniform2f(
      curlUniforms.texelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY
    );
    this.gl.uniform1i(curlUniforms.uVelocity, this.velocity.read.attach(0));
    this.blit(this.curl);

    // Vorticity
    this.gl.useProgram(this.vorticityProgram);
    const vorticityUniforms = this.getUniforms(this.vorticityProgram);
    this.gl.uniform2f(
      vorticityUniforms.texelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY
    );
    this.gl.uniform1i(vorticityUniforms.uVelocity, this.velocity.read.attach(0));
    this.gl.uniform1i(vorticityUniforms.uCurl, this.curl.attach(1));
    this.gl.uniform1f(vorticityUniforms.curl, this.config.curl);
    this.gl.uniform1f(vorticityUniforms.dt, dt);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // Divergence
    this.gl.useProgram(this.divergenceProgram);
    const divergenceUniforms = this.getUniforms(this.divergenceProgram);
    this.gl.uniform2f(
      divergenceUniforms.texelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY
    );
    this.gl.uniform1i(divergenceUniforms.uVelocity, this.velocity.read.attach(0));
    this.blit(this.divergence);

    // Clear pressure
    this.gl.useProgram(this.clearProgram);
    const clearUniforms = this.getUniforms(this.clearProgram);
    this.gl.uniform1i(clearUniforms.uTexture, this.pressure.read.attach(0));
    this.gl.uniform1f(clearUniforms.value, this.config.pressure);
    this.blit(this.pressure.write);
    this.pressure.swap();

    // Pressure
    this.gl.useProgram(this.pressureProgram);
    const pressureUniforms = this.getUniforms(this.pressureProgram);
    this.gl.uniform2f(
      pressureUniforms.texelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY
    );
    this.gl.uniform1i(pressureUniforms.uDivergence, this.divergence.attach(0));
    for (let i = 0; i < this.config.pressureIterations; i++) {
      this.gl.uniform1i(pressureUniforms.uPressure, this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    // Gradient Subtract
    this.gl.useProgram(this.gradientSubtractProgram);
    const gradientUniforms = this.getUniforms(this.gradientSubtractProgram);
    this.gl.uniform2f(
      gradientUniforms.texelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY
    );
    this.gl.uniform1i(gradientUniforms.uPressure, this.pressure.read.attach(0));
    this.gl.uniform1i(gradientUniforms.uVelocity, this.velocity.read.attach(1));
    this.blit(this.velocity.write);
    this.velocity.swap();

    // Advection - velocity
    this.gl.useProgram(this.advectionProgram);
    const advectionUniforms = this.getUniforms(this.advectionProgram);
    this.gl.uniform2f(
      advectionUniforms.texelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY
    );
    if (!this.ext.supportLinearFiltering) {
      this.gl.uniform2f(
        advectionUniforms.dyeTexelSize,
        this.velocity.texelSizeX,
        this.velocity.texelSizeY
      );
    }
    const velocityId = this.velocity.read.attach(0);
    this.gl.uniform1i(advectionUniforms.uVelocity, velocityId);
    this.gl.uniform1i(advectionUniforms.uSource, velocityId);
    this.gl.uniform1f(advectionUniforms.dt, dt);
    this.gl.uniform1f(advectionUniforms.dissipation, this.config.velocityDissipation);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // Advection - dye
    if (!this.ext.supportLinearFiltering) {
      this.gl.uniform2f(
        advectionUniforms.dyeTexelSize,
        this.dye.texelSizeX,
        this.dye.texelSizeY
      );
    }
    this.gl.uniform1i(advectionUniforms.uVelocity, this.velocity.read.attach(0));
    this.gl.uniform1i(advectionUniforms.uSource, this.dye.read.attach(1));
    this.gl.uniform1f(advectionUniforms.dissipation, this.config.densityDissipation);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  render(target) {
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.BLEND);
    this.drawDisplay(target);
  }

  drawDisplay(target) {
    const width = target ? target.width : this.gl.drawingBufferWidth;
    const height = target ? target.height : this.gl.drawingBufferHeight;
    this.gl.useProgram(this.displayMaterial.program);
    if (this.config.shading) {
      this.gl.uniform2f(this.displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
    }
    this.gl.uniform1i(this.displayMaterial.uniforms.uTexture, this.dye.read.attach(0));
    this.blit(target, false);
  }

  splatPointer(pointer) {
    const dx = pointer.deltaX * this.config.splatForce;
    const dy = pointer.deltaY * this.config.splatForce;
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  clickSplat(pointer) {
    const color = this.generateColor();
    color.r *= 10;
    color.g *= 10;
    color.b *= 10;
    const dx = 10 * (Math.random() - 0.5);
    const dy = 30 * (Math.random() - 0.5);
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
  }

  splat(x, y, dx, dy, color) {
    this.gl.useProgram(this.splatProgram);
    const splatUniforms = this.getUniforms(this.splatProgram);
    this.gl.uniform1i(splatUniforms.uTarget, this.velocity.read.attach(0));
    this.gl.uniform1f(splatUniforms.aspectRatio, this.canvas.width / this.canvas.height);
    this.gl.uniform2f(splatUniforms.point, x, y);
    this.gl.uniform3f(splatUniforms.color, dx, dy, 0);
    this.gl.uniform1f(splatUniforms.radius, this.correctRadius(this.config.splatRadius / 100));
    this.blit(this.velocity.write);
    this.velocity.swap();

    this.gl.uniform1i(splatUniforms.uTarget, this.dye.read.attach(0));
    this.gl.uniform3f(splatUniforms.color, color.r, color.g, color.b);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  correctRadius(radius) {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1 - posY / this.canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = this.generateColor();
  }

  updatePointerMoveData(pointer, posX, posY, color) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / this.canvas.width;
    pointer.texcoordY = 1 - posY / this.canvas.height;
    pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  updatePointerUpData(pointer) {
    pointer.down = false;
  }

  correctDeltaX(delta) {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  correctDeltaY(delta) {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  generateColor() {
    const c = this.HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }

  HSVtoRGB(h, s, v) {
    let r = 0;
    let g = 0;
    let b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    return { r, g, b };
  }

  wrap(value, min, max) {
    const range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  }

  setupEventListeners() {
    window.addEventListener("mousedown", (e) => {
      const pointer = this.pointers[0];
      const posX = this.scaleByPixelRatio(e.clientX);
      const posY = this.scaleByPixelRatio(e.clientY);
      this.updatePointerDownData(pointer, -1, posX, posY);
      this.clickSplat(pointer);
    });

    let firstMove = true;
    window.addEventListener("mousemove", (e) => {
      const pointer = this.pointers[0];
      const posX = this.scaleByPixelRatio(e.clientX);
      const posY = this.scaleByPixelRatio(e.clientY);
      const color = pointer.color;
      if (firstMove) {
        firstMove = false;
      }
      this.updatePointerMoveData(pointer, posX, posY, color);
    });

    let firstTouch = true;
    window.addEventListener("touchstart", (e) => {
      const touches = e.targetTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        const posX = this.scaleByPixelRatio(touches[i].clientX);
        const posY = this.scaleByPixelRatio(touches[i].clientY);
        if (firstTouch) {
          firstTouch = false;
        }
        this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
      }
    });

    window.addEventListener("touchmove", (e) => {
      const touches = e.targetTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        const posX = this.scaleByPixelRatio(touches[i].clientX);
        const posY = this.scaleByPixelRatio(touches[i].clientY);
        this.updatePointerMoveData(pointer, posX, posY, pointer.color);
      }
    });

    window.addEventListener("touchend", (e) => {
      const touches = e.changedTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        this.updatePointerUpData(pointer);
      }
    });
  }

  startRendering() {
    this.updateFrame();
  }
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new FluidCursor();
  });
} else {
  new FluidCursor();
}
