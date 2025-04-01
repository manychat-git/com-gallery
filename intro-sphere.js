const VERTEX_SHADER = 
"attribute vec4 aPosition;\n" +
"attribute vec2 aTexCoord;\n" +
"varying vec2 vUv;\n" +
"varying vec2 vScreenPosition;\n" +
"\n" +
"void main() {\n" +
"    gl_Position = aPosition;\n" +
"    vUv = aTexCoord;\n" +
"    vScreenPosition = aPosition.xy;\n" +
"}";

const FRAGMENT_SHADER = 
"precision highp float;\n" +
"\n" +
"uniform float uTime;\n" +
"uniform vec2 uResolution;\n" +
"uniform sampler2D uTexture;\n" +
"uniform sampler2D uTextureNext;\n" +
"uniform float uTransition;\n" +
"uniform vec2 uMousePosition;\n" +
"uniform float uDirection;\n" +
"uniform float uAutoRotationX;\n" +
"uniform float uUnwrapProgress;\n" +
"uniform float uRotation;\n" +
"uniform float uStretchV;\n" +
"uniform float uZoom;\n" +
"varying vec2 vUv;\n" +
"varying vec2 vScreenPosition;\n" +
"\n" +
"#define PI 3.1415926535897932384626433832795\n" +
"#define CAMERA_DIST 25.0\n" +
"\n" +
"vec3 getFishEye(vec2 uv, float level) {\n" +
"    float len = length(uv);\n" +
"    float a = len * level;\n" +
"    return vec3(uv / len * sin(a), -cos(a));\n" +
"}\n" +
"\n" +
"vec3 getColor(vec2 p, sampler2D tex) {\n" +
"    vec2 baseUV = (p + 1.0) * 0.5;\n" +
"    \n" +
"    float containerAspect = uResolution.x / uResolution.y;\n" +
"    float scale = 1.0;\n" +
"    \n" +
"    if (containerAspect < 1.0) {\n" +
"        scale = containerAspect;\n" +
"        baseUV.x = baseUV.x * scale + (1.0 - scale) * 0.5;\n" +
"    } else {\n" +
"        scale = 1.0 / containerAspect;\n" +
"        baseUV.y = baseUV.y * scale + (1.0 - scale) * 0.5;\n" +
"    }\n" +
"    \n" +
"    baseUV.y = 1.0 - baseUV.y;\n" +
"    \n" +
"    vec3 baseColor = texture2D(tex, baseUV).xyz;\n" +
"    return baseColor;\n" +
"}\n" +
"\n" +
"void main() {\n" +
"    vec2 p = vScreenPosition.xy;\n" +
"    \n" +
"    vec4 fragColor = vec4(0.0, 0.0, 0.0, 0.0);\n" +
"    \n" +
"    float t = uUnwrapProgress;\n" +
"    \n" +
"    float zoom = pow(2.0 * t, 5.0) + 1.0;\n" +
"    \n" +
"    zoom *= uZoom;\n" +
"    \n" +
"    float aspect = uResolution.x / uResolution.y;\n" +
"    \n" +
"    vec3 dir;\n" +
"    if (aspect >= 1.0) {\n" +
"        dir = normalize(vec3(p.x * aspect * PI, p.y * PI, -zoom * (CAMERA_DIST - 1.0)));\n" +
"    } else {\n" +
"        dir = normalize(vec3(p.x * PI, p.y / aspect * PI, -zoom * (CAMERA_DIST - 1.0)));\n" +
"    }\n" +
"    \n" +
"    float b = CAMERA_DIST * dir.z;\n" +
"    float h = b*b - CAMERA_DIST*CAMERA_DIST + 1.0;\n" +
"    \n" +
"    if (h >= 0.0) {\n" +
"        vec3 q = vec3(0.0, 0.0, CAMERA_DIST) - dir * (b + sqrt(h));\n" +
"        \n" +
"        float cosRot = cos(uRotation * PI * 2.0);\n" +
"        float sinRot = sin(uRotation * PI * 2.0);\n" +
"        mat3 rotationMatrix = mat3(\n" +
"            cosRot, 0.0, -sinRot,\n" +
"            0.0, 1.0, 0.0,\n" +
"            sinRot, 0.0, cosRot\n" +
"        );\n" +
"        \n" +
"        q = rotationMatrix * q;\n" +
"        \n" +
"        vec3 normal = normalize(q);\n" +
"        float u = atan(normal.x, normal.z) / (2.0 * PI);\n" +
"        float v = 1.0 - acos(normal.y) / PI;\n" +
"        vec2 sphereCoords = vec2(u, v);\n" +
"        \n" +
"        p = sphereCoords * zoom;\n" +
"        \n" +
"        vec3 currentColor = getColor(p, uTexture);\n" +
"        vec3 nextColor = getColor(p, uTextureNext);\n" +
"        \n" +
"        float mixFactor = smoothstep(0.0, 1.0, uTransition);\n" +
"        vec3 color = mix(currentColor, nextColor, mixFactor);\n" +
"        \n" +
"        vec3 fisheyeDir = getFishEye(vScreenPosition.xy, 1.4);\n" +
"        \n" +
"        float fisheyeMix = smoothstep(0.0, 1.0, t);\n" +
"        vec2 finalCoords = mix(sphereCoords, fisheyeDir.xy, fisheyeMix);\n" +
"        \n" +
"        currentColor = getColor(finalCoords, uTexture);\n" +
"        nextColor = getColor(finalCoords, uTextureNext);\n" +
"        color = mix(currentColor, nextColor, mixFactor);\n" +
"        \n" +
"        if (t >= 1.0) {\n" +
"            float mouseX = -(uMousePosition.x - 0.5);\n" +
"            float mouseY = -(uMousePosition.y - 0.5);\n" +
"            float mouseInfluenceX = 0.3;\n" +
"            float mouseInfluenceY = 0.2;\n" +
"            \n" +
"            float mouseRotationX = mouseX * mouseInfluenceX * PI;\n" +
"            float mouseRotationY = mouseY * mouseInfluenceY * PI;\n" +
"            \n" +
"            float transitionRotation = uTransition * PI * 2.0 * uDirection;\n" +
"            float autoRotation = uAutoRotationX;\n" +
"            \n" +
"            mat2 mouseRotationMatrixX = mat2(\n" +
"                cos(mouseRotationX), -sin(mouseRotationX),\n" +
"                sin(mouseRotationX), cos(mouseRotationX)\n" +
"            );\n" +
"            \n" +
"            mat2 mouseRotationMatrixY = mat2(\n" +
"                cos(mouseRotationY), -sin(mouseRotationY),\n" +
"                sin(mouseRotationY), cos(mouseRotationY)\n" +
"            );\n" +
"            \n" +
"            mat2 transitionRotationMatrix = mat2(\n" +
"                cos(transitionRotation), -sin(transitionRotation),\n" +
"                sin(transitionRotation), cos(transitionRotation)\n" +
"            );\n" +
"            \n" +
"            mat2 autoRotationMatrix = mat2(\n" +
"                cos(autoRotation), -sin(autoRotation),\n" +
"                sin(autoRotation), cos(autoRotation)\n" +
"            );\n" +
"            \n" +
"            fisheyeDir.xz = mouseRotationMatrixX * fisheyeDir.xz;\n" +
"            fisheyeDir.yz = mouseRotationMatrixY * fisheyeDir.yz;\n" +
"            fisheyeDir.xz = transitionRotationMatrix * fisheyeDir.xz;\n" +
"            fisheyeDir.xz = autoRotationMatrix * fisheyeDir.xz;\n" +
"            \n" +
"            currentColor = getColor(fisheyeDir.xy, uTexture);\n" +
"            nextColor = getColor(fisheyeDir.xy, uTextureNext);\n" +
"            color = mix(currentColor, nextColor, mixFactor);\n" +
"        }\n" +
"        \n" +
"        float fish_eye = smoothstep(2.0, 1.6, length(vScreenPosition.xy)) * 0.15 + 0.85;\n" +
"        \n" +
"        fragColor = vec4(color * fish_eye, 1.0);\n" +
"    }\n" +
"    \n" +
"    gl_FragColor = fragColor;\n" +
"}";

class CustomGallery {
    constructor() {
        this.mainWrapper = document.querySelector('[data-gallery="main-wrapper"]');
        this.container = document.querySelector('[data-gallery="container"]');
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.slides = document.querySelectorAll('[data-gallery="slide"]');
        this.prevButton = document.querySelector('[data-gallery="prev"]');
        this.nextButton = document.querySelector('[data-gallery="next"]');
        this.currentSlide = 0;
        this.slideCount = this.slides.length;
        this.isAnimating = false;
        this.paginationWrapper = document.querySelector('[data-gallery="pagination-wrapper"]');
        this.dots = document.querySelectorAll('[data-gallery="pagination-bullet"]:not([data-template="true"])');
        this.textContainers = document.querySelectorAll('[data-gallery="text-container"]');
        this.initialAnimationPlayed = false;
        this.isInitialAnimationPlaying = false;
        this.textAnimationStarted = false;
        this.autoRotationStartedAfterIntro = false;
        this.splitTextInstances = [];
        this.autoplayInterval = null;
        this.autoplayDelay = 5000; // 5 секунд
        this.addTransitionStyles();
        this.hideElementsDuringIntro();
        this.initSplitText();
        
        if (this.paginationWrapper && (!this.dots || this.dots.length === 0)) {
            this.createPaginationBullets();
        }
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1';
        this.container.appendChild(this.canvas);
        
        this.gl = this.canvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: false
        }) || this.canvas.getContext('experimental-webgl', {
            alpha: true,
            premultipliedAlpha: false
        });
        
        if (!this.gl) {
            console.error('WebGL не поддерживается в этом браузере');
            this.useWebGL = false;
        } else {
            this.useWebGL = true;
            this.initWebGL();
        }
        
        this.startTime = performance.now();
        this.mousePosition = { x: 0.5, y: 0.5 };
        this.targetMousePosition = { x: 0.5, y: 0.5 };
        this.isMouseInputEnabled = false;
        this.mouseInterpolationFactor = 0;
        this.params = {
            transition: 0,
            direction: 1,
            autoRotationX: 0,
            unwrapProgress: 0,
            rotation: 0,
            stretchV: 1.0,
            zoom: 1.0
        };
        
        this.isTouchOnly = false;
        this.detectTouchOnlyDevice();
        
        this.showSlide(this.currentSlide, true);
        this.playInitialAnimation();
        
        this.prevButton.addEventListener('click', () => {
            if (this.isAnimating || this.isInitialAnimationPlaying) return;
            this.params.direction = 1;
            this.changeSlide(-1);
        });
        
        this.nextButton.addEventListener('click', () => {
            if (this.isAnimating || this.isInitialAnimationPlaying) return;
            this.params.direction = -1;
            this.changeSlide(1);
        });
        
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (this.isAnimating || this.isInitialAnimationPlaying) return;
                if (this.currentSlide === index) return;
                
                this.resetAutoplay();
                
                if (this.isTouchOnly) {
                    this.stopAutoRotation();
                }
                
                this.params.direction = index > this.currentSlide ? -1 : 1;
                
                // Get the current slide's text container
                const currentSlide = this.slides[this.currentSlide];
                const textContainer = currentSlide.querySelector('[data-gallery="text-container"]');
                
                // Animate the text container fading out
                if (textContainer && !this.isInitialAnimationPlaying) {
                    this.animateTextOut(textContainer).then(() => {
                        // Change slide after text fades out
                        this.currentSlide = index;
                        this.showSlide(this.currentSlide);
                    });
                } else {
                    // If there's no text container, just change slide directly
                    this.currentSlide = index;
                    this.showSlide(this.currentSlide);
                }
            });
        });
        
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.setupSwipe();
        this.setupKeyboardNavigation();
        this.animate();
    }
    
    initWebGL() {
        this.resizeCanvasToDisplaySize();
        window.addEventListener('resize', () => this.resizeCanvasToDisplaySize());
        
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        this.positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'aTexCoord');
        
        this.timeLocation = this.gl.getUniformLocation(this.program, 'uTime');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
        this.mousePositionLocation = this.gl.getUniformLocation(this.program, 'uMousePosition');
        this.transitionLocation = this.gl.getUniformLocation(this.program, 'uTransition');
        this.directionLocation = this.gl.getUniformLocation(this.program, 'uDirection');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
        this.textureNextLocation = this.gl.getUniformLocation(this.program, 'uTextureNext');
        this.autoRotationXLocation = this.gl.getUniformLocation(this.program, 'uAutoRotationX');
        this.unwrapProgressLocation = this.gl.getUniformLocation(this.program, 'uUnwrapProgress');
        this.rotationLocation = this.gl.getUniformLocation(this.program, 'uRotation');
        this.stretchVLocation = this.gl.getUniformLocation(this.program, 'uStretchV');
        this.zoomLocation = this.gl.getUniformLocation(this.program, 'uZoom');
        
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);
        
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);
        
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        this.texture = this.createTexture();
        this.nextTexture = this.createTexture();
        
        this.loadImageTexture(this.slides[0].querySelector('[data-gallery="image"]').src, this.texture);
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Ошибка компиляции шейдера:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Ошибка линковки программы:', this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    createTexture() {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        const width = 1;
        const height = 1;
        const pixels = new Uint8Array([0, 0, 0, 255]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        
        return texture;
    }
    
    loadImageTexture(src, texture) {
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                resolve();
            };
            image.src = src;
        });
    }
    
    resizeCanvasToDisplaySize(force) {
        const canvas = this.canvas;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            this.gl.viewport(0, 0, width, height);
        }
    }
    
    handleMouseMove(event) {
        if (!this.isMouseInputEnabled || this.isTouchOnly || this.isInitialAnimationPlaying) return;
        
        const x = event.clientX / window.innerWidth;
        const y = 1 - event.clientY / window.innerHeight;
        
        this.targetMousePosition = {
            x: Math.min(Math.max(x, 0), 1),
            y: Math.min(Math.max(y, 0), 1)
        };
    }
    
    async showSlide(index, skipAnimation = false) {
        if (this.isAnimating && !skipAnimation) return;
        this.isAnimating = true;
        
        this.currentSlide = index;
        
        this.dots.forEach((dot, i) => {
            dot.removeAttribute('data-active');
            
            const progress = dot.querySelector('[data-gallery="bullet-progress"]');
            if (progress && !skipAnimation) {
                gsap.to(progress, {
                    scaleX: 0,
                    duration: 0.3,
                    ease: "power1.out"
                });
            }
            
            if (i === index) {
                dot.setAttribute('data-active', 'true');
                
                const progress = dot.querySelector('[data-gallery="bullet-progress"]');
                if (progress && !skipAnimation) {
                    gsap.set(progress, { scaleX: 0 });
                    gsap.to(progress, {
                        scaleX: 1,
                        duration: 1.2,
                        ease: "power2.inOut"
                    });
                }
            }
        });
        
        this.slides.forEach(slide => {
            slide.style.display = 'none';
        });
        
        this.slides[index].style.display = 'block';
        
        if (this.useWebGL) {
            await this.loadImageTexture(this.slides[index].querySelector('[data-gallery="image"]').src, this.nextTexture);
            
            if (skipAnimation) {
                [this.texture, this.nextTexture] = [this.nextTexture, this.texture];
                this.params.transition = 0;
                this.isAnimating = false;
                
                if (this.isTouchOnly && this.initialAnimationPlayed) {
                    this.params.autoRotationX = 0;
                    this.startAutoRotation(0);
                }
                
                return;
            }
            
            const currentAutoRotation = this.params.autoRotationX;
            
            if (this.isTouchOnly && this.initialAnimationPlayed) {
                if (this.autoRotationTween) {
                    this.autoRotationTween.kill();
                    this.autoRotationTween = null;
                }
                
                gsap.to(this.params, {
                    autoRotationX: 0,
                    duration: 1.2,
                    ease: "power2.inOut"
                });
            }
            
            gsap.to(this.params, {
                transition: 1,
                duration: 1.2,
                ease: "power2.inOut",
                onUpdate: () => {
                    if (this.params.transition > 0.95 && !this.textAnimationStarted) {
                        this.textAnimationStarted = true;
                        
                        if (!this.isInitialAnimationPlaying) {
                            const textContainer = this.slides[index].querySelector('[data-gallery="text-container"]');
                            if (textContainer) {
                                gsap.set(textContainer, { opacity: 1 });
                                this.animateTextIn(textContainer);
                            }
                        }
                    }
                },
                onComplete: () => {
                    [this.texture, this.nextTexture] = [this.nextTexture, this.texture];
                    this.params.transition = 0;
                    this.isAnimating = false;
                    this.textAnimationStarted = false;
                    
                    if (this.isTouchOnly && this.initialAnimationPlayed) {
                        this.params.autoRotationX = 0;
                        this.startAutoRotation(0);
                    }
                }
            });
        } else {
            setTimeout(() => {
                this.isAnimating = false;
                
                if (!this.isInitialAnimationPlaying) {
                    const textContainer = this.slides[index].querySelector('[data-gallery="text-container"]');
                    if (textContainer) {
                        gsap.set(textContainer, { opacity: 1 });
                        this.animateTextIn(textContainer);
                    }
                }
            }, 600);
        }
    }
    
    changeSlide(direction) {
        if (this.isAnimating) return;
        
        this.resetAutoplay();
        
        if (this.isTouchOnly) {
            this.stopAutoRotation();
        }
        
        // Get the current slide's text container
        const currentSlide = this.slides[this.currentSlide];
        const textContainer = currentSlide.querySelector('[data-gallery="text-container"]');
        
        // Calculate the new slide index
        const newIndex = (this.currentSlide + direction + this.slideCount) % this.slideCount;
        
        // Animate the text container fading out
        if (textContainer && !this.isInitialAnimationPlaying) {
            this.animateTextOut(textContainer).then(() => {
                this.currentSlide = newIndex;
                this.showSlide(this.currentSlide);
            });
        } else {
            // If there's no text container, just proceed normally
            this.currentSlide = newIndex;
            this.showSlide(this.currentSlide);
        }
    }
    
    stopAutoRotation() {
        if (this.autoRotationTween) {
            this.autoRotationTween.kill();
            this.autoRotationTween = null;
        }
    }
    
    render() {
        if (!this.useWebGL || !this.gl) return;
        
        this.resizeCanvasToDisplaySize();
        
        // Плавно увеличиваем фактор интерполяции после активации мыши
        if (this.isMouseInputEnabled) {
            this.mouseInterpolationFactor += (0.1 - this.mouseInterpolationFactor) * 0.05;
        }
        
        // Разные факторы для X и Y для более естественного движения
        const xFactor = this.mouseInterpolationFactor;
        const yFactor = this.mouseInterpolationFactor * 0.7; // Y-координата движется медленнее
        
        this.mousePosition.x += (this.targetMousePosition.x - this.mousePosition.x) * xFactor;
        this.mousePosition.y += (this.targetMousePosition.y - this.mousePosition.y) * yFactor;
        
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        this.gl.disable(this.gl.CULL_FACE);
        
        this.gl.useProgram(this.program);
        
        this.gl.uniform1f(this.timeLocation, (performance.now() - this.startTime) / 1000);
        
        this.gl.uniform2f(this.resolutionLocation, this.gl.canvas.width, this.gl.canvas.height);
        
        this.gl.uniform2f(this.mousePositionLocation, this.mousePosition.x, this.mousePosition.y);
        
        this.gl.uniform1f(this.transitionLocation, this.params.transition);
        this.gl.uniform1f(this.directionLocation, this.params.direction);
        
        this.gl.uniform1f(this.autoRotationXLocation, this.params.autoRotationX);
        this.gl.uniform1f(this.unwrapProgressLocation, this.params.unwrapProgress);
        this.gl.uniform1f(this.rotationLocation, this.params.rotation);
        this.gl.uniform1f(this.stretchVLocation, this.params.stretchV);
        this.gl.uniform1f(this.zoomLocation, this.params.zoom);
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureLocation, 0);
        
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.nextTexture);
        this.gl.uniform1i(this.textureNextLocation, 1);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    
    setupSwipe() {
        let startX, moveX;
        const threshold = 100;
        
        const handleTouchStart = (e) => {
            if (this.isAnimating) return;
            
            startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            
            document.addEventListener('mousemove', handleTouchMove);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('mouseup', handleTouchEnd);
            document.addEventListener('touchend', handleTouchEnd);
        };
        
        const handleTouchMove = (e) => {
            moveX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        };
        
        const handleTouchEnd = () => {
            if (!moveX || this.isAnimating) return;
            
            const diff = moveX - startX;
            
            if (Math.abs(diff) > threshold) {
                // При свайпе сбрасываем автоплей и начинаем заново
                this.resetAutoplay();
                
                if (this.isTouchOnly) {
                    this.stopAutoRotation();
                }
                
                if (diff > 0) {
                    this.params.direction = 1;
                    this.changeSlide(-1);
                } else {
                    this.params.direction = -1;
                    this.changeSlide(1);
                }
            }
            
            document.removeEventListener('mousemove', handleTouchMove);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('mouseup', handleTouchEnd);
            document.removeEventListener('touchend', handleTouchEnd);
            
            moveX = null;
        };
        
        this.container.addEventListener('mousedown', handleTouchStart);
        this.container.addEventListener('touchstart', handleTouchStart);
        
        // Остановка автоплея при наведении на контейнер
        this.container.addEventListener('mouseenter', () => {
            this.stopAutoplay();
        });
        
        // Запуск автоплея при уходе мыши с контейнера
        this.container.addEventListener('mouseleave', () => {
            if (this.initialAnimationPlayed) {
                this.startAutoplay();
            }
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating || this.isInitialAnimationPlaying) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
                    // Сбрасываем и перезапускаем автоплей
                    this.resetAutoplay();
                    
                    this.params.direction = 1;
                    this.changeSlide(-1);
                    break;
                case 'ArrowRight':
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
                    // Сбрасываем и перезапускаем автоплей
                    this.resetAutoplay();
                    
                    this.params.direction = -1;
                    this.changeSlide(1);
                    break;
            }
        });
    }
    
    animate() {
        this.render();
        requestAnimationFrame(() => this.animate());
    }
    
    playInitialAnimation() {
        if (!this.initialAnimationPlayed && this.useWebGL) {
            if (window.scrollY >= 10) {
                this.skipInitialAnimation();
            } else {
                setTimeout(() => {
                    this.isInitialAnimationPlaying = true;
                    this.params.unwrapProgress = 0;
                    this.params.zoom = 0;
                    this.params.rotation = 0;
                    this.isAnimating = true;

                    const tl = gsap.timeline({
                        onComplete: () => {
                            this.isAnimating = false;
                            this.initialAnimationPlayed = true;
                            this.isInitialAnimationPlaying = false;
                            this.showElementsAfterIntro();
                            if (this.isTouchOnly) {
                                this.params.autoRotationX = 0;
                                this.startAutoRotation(0);
                            }
                            this.startAutoplay();
                            setTimeout(() => {
                                this.isMouseInputEnabled = true;
                                this.mouseInterpolationFactor = 0;
                            }, 800);

                            const event = new CustomEvent('galleryInitialAnimationComplete');
                            document.dispatchEvent(event);
                        }
                    });

                    tl.to(this.params, {
                        rotation: 2,
                        zoom: 0.8,
                        duration: 2,
                        ease: "none"
                    })
                    .to(this.params, {
                        zoom: 1,
                        unwrapProgress: 1,
                        duration: 1.3,
                        ease: "power2.Out"
                    });
                }, 200);
            }
        }
    }
    
    skipInitialAnimation() {
        this.params.unwrapProgress = 1;
        this.params.zoom = 1;
        this.params.rotation = 0;
        this.showElementsAfterIntro();
        this.initialAnimationPlayed = true;
        this.isInitialAnimationPlaying = false;
        this.isMouseInputEnabled = true;
        this.mouseInterpolationFactor = 0;
        if (this.isTouchOnly) {
            this.params.autoRotationX = 0;
            this.startAutoRotation(0);
        }
        this.startAutoplay();

        const event = new CustomEvent('galleryInitialAnimationComplete');
        document.dispatchEvent(event);
    }
    
    hideElementsDuringIntro() {
        if (this.prevButton) this.prevButton.style.opacity = '0';
        if (this.nextButton) this.nextButton.style.opacity = '0';
        
        if (this.paginationWrapper) this.paginationWrapper.style.opacity = '0';
        
        this.textContainers.forEach(container => {
            container.style.opacity = '0';
        });
    }
    
    showElementsAfterIntro() {
        if (this.prevButton) {
            gsap.to(this.prevButton, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
        if (this.nextButton) {
            gsap.to(this.nextButton, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
        
        if (this.paginationWrapper) {
            gsap.to(this.paginationWrapper, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
        
        const activeSlide = this.slides[this.currentSlide];
        if (activeSlide) {
            const textContainer = activeSlide.querySelector('[data-gallery="text-container"]');
            if (textContainer) {
                gsap.set(textContainer, { opacity: 1 });
                this.animateTextIn(textContainer);
            }
        }
    }
    
    createPaginationBullets() {
        const templateBullet = this.paginationWrapper.querySelector('[data-gallery="pagination-bullet"][data-template="true"]');
        
        const existingBullets = this.paginationWrapper.querySelectorAll('[data-gallery="pagination-bullet"]:not([data-template="true"])');
        
        if (existingBullets.length === this.slides.length) {
            existingBullets.forEach((bullet, i) => {
                bullet.removeAttribute('data-active');
                
                if (i === this.currentSlide) {
                    bullet.setAttribute('data-active', 'true');
                }
                
                bullet.addEventListener('click', () => {
                    if (this.isAnimating || this.isInitialAnimationPlaying) return;
                    if (this.currentSlide === i) return;
                    
                    // Сбрасываем автоплей при клике на пагинацию
                    this.resetAutoplay();
                    
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
                    this.params.direction = i > this.currentSlide ? -1 : 1;
                    
                    // Get the current slide's text container
                    const currentSlide = this.slides[this.currentSlide];
                    const textContainer = currentSlide.querySelector('[data-gallery="text-container"]');
                    
                    // Animate the text container fading out
                    if (textContainer && !this.isInitialAnimationPlaying) {
                        this.animateTextOut(textContainer).then(() => {
                            // Change slide after text fades out
                            this.currentSlide = i;
                            this.showSlide(this.currentSlide);
                        });
                    } else {
                        // If there's no text container, just change slide directly
                        this.currentSlide = i;
                        this.showSlide(this.currentSlide);
                    }
                });
            });
            
            this.dots = existingBullets;
            return;
        }
        
        if (!templateBullet) {
            this.paginationWrapper.innerHTML = '';
            
            for (let i = 0; i < this.slides.length; i++) {
                const bullet = document.createElement('div');
                bullet.setAttribute('data-gallery', 'pagination-bullet');
                
                if (i === this.currentSlide) {
                    bullet.setAttribute('data-active', 'true');
                }
                
                const progress = document.createElement('div');
                progress.setAttribute('data-gallery', 'bullet-progress');
                bullet.appendChild(progress);
                
                bullet.addEventListener('click', () => {
                    if (this.isAnimating || this.isInitialAnimationPlaying) return;
                    if (this.currentSlide === i) return;
                    
                    // Сбрасываем автоплей при клике на пагинацию
                    this.resetAutoplay();
                    
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
                    this.params.direction = i > this.currentSlide ? -1 : 1;
                    
                    // Get the current slide's text container
                    const currentSlide = this.slides[this.currentSlide];
                    const textContainer = currentSlide.querySelector('[data-gallery="text-container"]');
                    
                    // Animate the text container fading out
                    if (textContainer && !this.isInitialAnimationPlaying) {
                        this.animateTextOut(textContainer).then(() => {
                            // Change slide after text fades out
                            this.currentSlide = i;
                            this.showSlide(this.currentSlide);
                        });
                    } else {
                        // If there's no text container, just change slide directly
                        this.currentSlide = i;
                        this.showSlide(this.currentSlide);
                    }
                });
                
                this.paginationWrapper.appendChild(bullet);
            }
        } else {
            const template = templateBullet.cloneNode(true);
            
            existingBullets.forEach(bullet => bullet.remove());
            
            for (let i = 0; i < this.slides.length; i++) {
                const bullet = template.cloneNode(true);
                bullet.removeAttribute('data-template');
                bullet.style.display = '';
                
                if (i === this.currentSlide) {
                    bullet.setAttribute('data-active', 'true');
                } else {
                    bullet.removeAttribute('data-active');
                }
                
                bullet.addEventListener('click', () => {
                    if (this.isAnimating || this.isInitialAnimationPlaying) return;
                    if (this.currentSlide === i) return;
                    
                    // Сбрасываем автоплей при клике на пагинацию
                    this.resetAutoplay();
                    
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
                    this.params.direction = i > this.currentSlide ? -1 : 1;
                    
                    // Get the current slide's text container
                    const currentSlide = this.slides[this.currentSlide];
                    const textContainer = currentSlide.querySelector('[data-gallery="text-container"]');
                    
                    // Animate the text container fading out
                    if (textContainer && !this.isInitialAnimationPlaying) {
                        this.animateTextOut(textContainer).then(() => {
                            // Change slide after text fades out
                            this.currentSlide = i;
                            this.showSlide(this.currentSlide);
                        });
                    } else {
                        // If there's no text container, just change slide directly
                        this.currentSlide = i;
                        this.showSlide(this.currentSlide);
                    }
                });
                
                this.paginationWrapper.appendChild(bullet);
            }
        }
        
        this.dots = document.querySelectorAll('[data-gallery="pagination-bullet"]:not([data-template="true"])');
    }
    
    addTransitionStyles() {
        const style = document.createElement('style');
        style.textContent = 
            '[data-gallery="prev"], ' +
            '[data-gallery="next"], ' +
            '[data-gallery="pagination-wrapper"], ' +
            '[data-gallery="text-container"] {' +
            '    transition: opacity 0.3s ease;' +
            '}' +
            
            '[data-gallery="bullet-progress"] {' +
            '    display: block;' +
            '    width: 100%;' +
            '    height: 100%;' +
            '    transform-origin: left center;' +
            '    transform: scaleX(0);' +
            '}' +
            
            '[data-gallery="pagination-bullet"][data-active="true"] [data-gallery="bullet-progress"] {' +
            '    transform: scaleX(1);' +
            '}' +

            '[data-gallery="pagination-bullet"][data-template="true"] {' +
            '    display: none;' +
            '}';
        document.head.appendChild(style);
    }
    
    detectTouchOnlyDevice() {
        this.isTouchOnly = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
                          !window.matchMedia('(pointer: fine)').matches;
        console.log('Touch-only device detected:', this.isTouchOnly);
    }
    
    startAutoRotation(startRotation = 0) {
        if (this.autoRotationTween) {
            this.autoRotationTween.kill();
        }
        
        this.params.autoRotationX = startRotation;
        
        let delay = 0.0;
        
        this.autoRotationTween = gsap.to(this.params, {
            autoRotationX: startRotation + Math.PI * 2, 
            duration: 30,
            ease: "none",
            delay: delay,
            repeat: -1,
            onRepeat: () => {
                this.params.autoRotationX = this.params.autoRotationX % (Math.PI * 2);
            }
        });
    }
    
    initSplitText() {
        // Инициализируем SplitText для всех текстовых элементов
        this.textContainers.forEach(container => {
            const title = container.querySelector('[data-gallery-text="title"]');
            const author = container.querySelector('[data-gallery-text="author"]');
            
            if (title) {
                const titleSplit = new SplitText(title, {
                    type: "chars,words",
                    position: "relative"
                });
                // Скрываем символы сразу после разделения
                gsap.set(titleSplit.chars, { y: 20, opacity: 0 });
                
                // Сохраняем объект SplitText для дальнейшего использования
                this.splitTextInstances.push({
                    element: title,
                    split: titleSplit
                });
            }
            
            if (author) {
                const authorSplit = new SplitText(author, {
                    type: "chars,words",
                    position: "relative"
                });
                // Скрываем символы сразу после разделения
                gsap.set(authorSplit.chars, { y: 20, opacity: 0 });
                
                // Сохраняем объект SplitText для дальнейшего использования
                this.splitTextInstances.push({
                    element: author,
                    split: authorSplit
                });
            }
        });
    }

    // Метод для анимации появления текста
    animateTextIn(container) {
        if (!container) return;
        
        const title = container.querySelector('[data-gallery-text="title"]');
        const author = container.querySelector('[data-gallery-text="author"]');
        
        // Находим соответствующие объекты SplitText
        const titleSplitData = this.splitTextInstances.find(item => item.element === title);
        const authorSplitData = this.splitTextInstances.find(item => item.element === author);
        
        if (titleSplitData) {
            gsap.to(titleSplitData.split.chars, {
                opacity: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.02,
                ease: "power2.out"
            });
        }
        
        if (authorSplitData) {
            gsap.to(authorSplitData.split.chars, {
                opacity: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.02,
                delay: 0.2, // Небольшая задержка после заголовка
                ease: "power2.out"
            });
        }
    }

    // Метод для анимации исчезновения текста
    animateTextOut(container) {
        return new Promise((resolve) => {
            if (!container) {
                resolve();
                return;
            }
            
            const title = container.querySelector('[data-gallery-text="title"]');
            const author = container.querySelector('[data-gallery-text="author"]');
            
            // Находим соответствующие объекты SplitText
            const titleSplitData = this.splitTextInstances.find(item => item.element === title);
            const authorSplitData = this.splitTextInstances.find(item => item.element === author);
            
            if (titleSplitData && authorSplitData) {
                // Ускоряем анимацию исчезновения автора
                gsap.to(authorSplitData.split.chars, {
                    opacity: 0,
                    y: -20,
                    duration: 0.2, // Ускорил с 0.3 до 0.2
                    stagger: 0.01,
                    ease: "power2.in"
                });
                
                // Ускоряем анимацию исчезновения заголовка и убираем задержку
                gsap.to(titleSplitData.split.chars, {
                    opacity: 0,
                    y: -20,
                    duration: 0.2, // Ускорил с 0.3 до 0.2
                    stagger: 0.01,
                    delay: 0.05, // Уменьшил задержку с 0.1 до 0.05
                    ease: "power2.in",
                    onComplete: resolve
                });
            } else {
                // Ускоряем резервную анимацию
                gsap.to(container, {
                    opacity: 0,
                    duration: 0.2, // Ускорил с 0.3 до 0.2
                    ease: "power1.out",
                    onComplete: resolve
                });
            }
        });
    }
    
    // Метод для запуска автоматического переключения слайдов
    startAutoplay() {
        // Очищаем предыдущий интервал, если есть
        this.stopAutoplay();
        
        // Создаем новый интервал
        this.autoplayInterval = setInterval(() => {
            if (!this.isAnimating && !this.isInitialAnimationPlaying) {
                this.params.direction = -1; // Всегда вперед при автопереключении
                this.changeSlide(1);
            }
        }, this.autoplayDelay);
    }
    
    // Метод для остановки автоматического переключения слайдов
    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }
    
    // Метод для сброса и перезапуска автоплея
    resetAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CustomGallery();
});

window.CustomGallery = CustomGallery;
