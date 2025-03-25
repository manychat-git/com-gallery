// Определяем шейдеры, взятые из webflow-gallery.min.js
const VERTEX_SHADER = `
attribute vec4 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUv;
varying vec2 vScreenPosition;

void main() {
    gl_Position = aPosition;
    vUv = aTexCoord;
    vScreenPosition = aPosition.xy;
}`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform sampler2D uTextureNext;
uniform float uTransition;
uniform vec2 uMousePosition;
uniform float uDirection;
varying vec2 vUv;
varying vec2 vScreenPosition;

#define PI 3.1415926535897932384626433832795

vec3 getFishEye(vec2 uv, float level) {
    float len = length(uv);
    float a = len * level;
    return vec3(uv / len * sin(a), -cos(a));
}

vec3 getColor(vec3 ray, sampler2D tex) {
    vec2 baseUV = ray.xy;
    baseUV = (baseUV + 1.0) * 0.5;
    
    float containerAspect = uResolution.x / uResolution.y;
    float scale = 1.0;
    
    if (containerAspect < 1.0) {
        scale = containerAspect;
        baseUV.x = baseUV.x * scale + (1.0 - scale) * 0.5;
    } else {
        scale = 1.0 / containerAspect;
        baseUV.y = baseUV.y * scale + (1.0 - scale) * 0.5;
    }
    
    baseUV.y = 1.0 - baseUV.y;
    vec3 baseColor = texture2D(tex, baseUV).xyz;
    return baseColor;
}

void main() {
    vec2 uv = vScreenPosition.xy;
    vec3 dir = getFishEye(uv, 1.4);
    vec3 color;
    
    // Горизонтальное и вертикальное движение
    float mouseX = -(uMousePosition.x - 0.5);
    float mouseY = -(uMousePosition.y - 0.5);
    float mouseInfluenceX = 0.3;
    float mouseInfluenceY = 0.2;
    
    float mouseRotationX = mouseX * mouseInfluenceX * PI;
    float mouseRotationY = mouseY * mouseInfluenceY * PI;
    
    float transitionRotation = uTransition * PI * 2.0 * uDirection;
    
    // Матрицы поворота
    mat2 mouseRotationMatrixX = mat2(
        cos(mouseRotationX), -sin(mouseRotationX),
        sin(mouseRotationX), cos(mouseRotationX)
    );
    
    mat2 mouseRotationMatrixY = mat2(
        cos(mouseRotationY), -sin(mouseRotationY),
        sin(mouseRotationY), cos(mouseRotationY)
    );
    
    mat2 transitionRotationMatrix = mat2(
        cos(transitionRotation), -sin(transitionRotation),
        sin(transitionRotation), cos(transitionRotation)
    );
    
    // Применяем повороты
    dir.xz = mouseRotationMatrixX * dir.xz;
    dir.yz = mouseRotationMatrixY * dir.yz;
    dir.xz = transitionRotationMatrix * dir.xz;
    
    // Смешивание текстур
    vec3 currentColor = getColor(dir, uTexture);
    vec3 nextColor = getColor(dir, uTextureNext);
    
    float mixFactor = smoothstep(0.0, 1.0, uTransition);
    color = mix(currentColor, nextColor, mixFactor);
    
    float fish_eye = smoothstep(2.0, 1.6, length(uv)) * 0.15 + 0.85;
    gl_FragColor = vec4(color * fish_eye, 1.0);
}`;

class CustomGallery {
    constructor() {
        // Основной враппер
        this.mainWrapper = document.querySelector('[data-gallery="main-wrapper"]');
        
        // Контейнер слайдов
        this.container = document.querySelector('[data-gallery="container"]');
        this.slides = document.querySelectorAll('[data-gallery="slide"]');
        
        // Элементы навигации теперь находятся в отдельном контейнере
        this.prevButton = document.querySelector('[data-gallery="prev"]');
        this.nextButton = document.querySelector('[data-gallery="next"]');
        
        // Инициализация состояния
        this.currentSlide = 0;
        this.slideCount = this.slides.length;
        this.isAnimating = false;
        
        // Контейнер для пагинации и сами буллеты
        this.paginationWrapper = document.querySelector('[data-gallery="pagination-wrapper"]');
        this.dots = document.querySelectorAll('[data-gallery="pagination-bullet"]:not([data-template="true"])');
        
        // Текстовые контейнеры
        this.textContainers = document.querySelectorAll('[data-gallery="text-container"]');
        
        // Флаги для интро-анимации
        this.initialAnimationPlayed = false;
        this.isInitialAnimationPlaying = false;
        this.textAnimationStarted = false;
        
        // Флаг для определения мобильного устройства
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Параметры автоматического вращения для мобильных устройств
        this.autoRotation = {
            active: false,
            angle: 0,
            speed: 0.005 // скорость вращения (уменьшена)
        };
        
        // Добавляем стили для плавных переходов
        this.addTransitionStyles();
        
        // Скрываем навигацию, пагинацию и текст при загрузке
        this.hideElementsDuringIntro();
        
        // Если пагинация пустая, создаем буллеты динамически
        if (this.paginationWrapper && (!this.dots || this.dots.length === 0)) {
            this.createPaginationBullets();
        }
        
        // Создаем canvas для WebGL
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1';
        this.container.appendChild(this.canvas);
        
        // Получаем WebGL контекст
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.error('WebGL не поддерживается в этом браузере');
            this.useWebGL = false;
        } else {
            this.useWebGL = true;
            this.initWebGL();
        }
        
        // Состояние для WebGL анимации
        this.startTime = performance.now();
        this.mousePosition = { x: 0.5, y: 0.5 };
        this.targetMousePosition = { x: 0.5, y: 0.5 };
        this.params = {
            transition: 0,
            direction: 1 // 1 для вправо, -1 для влево
        };
        
        // Устанавливаем начальное состояние без анимации между слайдами
        this.showSlide(this.currentSlide, true);
        
        // Запускаем интро-анимацию
        this.playInitialAnimation();
        
        // Привязка событий
        this.prevButton.addEventListener('click', () => {
            if (this.isInitialAnimationPlaying) return; // Блокируем клики во время интро-анимации
            this.params.direction = 1; // Направление анимации
            this.changeSlide(-1);
        });
        
        this.nextButton.addEventListener('click', () => {
            if (this.isInitialAnimationPlaying) return; // Блокируем клики во время интро-анимации
            this.params.direction = -1; // Направление анимации
            this.changeSlide(1);
        });
        
        // Обработчики для пагинации
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (this.isInitialAnimationPlaying) return; // Блокируем клики во время интро-анимации
                if (this.currentSlide === index) return;
                
                // Определяем направление для анимации
                this.params.direction = index > this.currentSlide ? -1 : 1;
                this.currentSlide = index;
                this.showSlide(this.currentSlide);
            });
        });
        
        // Отслеживание движения мыши для 3D эффекта
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        // Свайп на мобильных
        this.setupSwipe();
        
        // Управление с клавиатуры
        this.setupKeyboardNavigation();
        
        // Запускаем анимацию
        this.animate();
    }
    
    // Инициализация WebGL
    initWebGL() {
        // Настройка размера canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Создаем шейдерную программу
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Получаем местоположение атрибутов и униформ
        this.positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'aTexCoord');
        
        this.timeLocation = this.gl.getUniformLocation(this.program, 'uTime');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
        this.mousePositionLocation = this.gl.getUniformLocation(this.program, 'uMousePosition');
        this.transitionLocation = this.gl.getUniformLocation(this.program, 'uTransition');
        this.directionLocation = this.gl.getUniformLocation(this.program, 'uDirection');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
        this.textureNextLocation = this.gl.getUniformLocation(this.program, 'uTextureNext');
        
        // Создаем геометрию (прямоугольник на весь экран)
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);
        
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        // Создаем текстурные координаты
        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);
        
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        // Создаем текстуры для текущего и следующего слайдов
        this.texture = this.createTexture();
        this.nextTexture = this.createTexture();
        
        // Загружаем начальное изображение
        this.loadImageTexture(this.slides[0].querySelector('[data-gallery="image"]').src, this.texture);
    }
    
    // Вспомогательные методы для WebGL
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
        
        // Устанавливаем параметры текстуры
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        // Создаем пустую текстуру нужного размера
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
    
    resizeCanvas() {
        const displayWidth = this.container.clientWidth;
        const displayHeight = this.container.clientHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        }
    }
    
    // Обработчик движения мыши
    handleMouseMove(event) {
        // Если идет интро-анимация, игнорируем движение мыши
        if (this.isInitialAnimationPlaying) return;
        
        // На мобильных устройствах не обрабатываем mousemove
        if (this.isTouchDevice) return;
        
        const x = event.clientX / window.innerWidth;
        const y = 1 - event.clientY / window.innerHeight;
        
        this.targetMousePosition = {
            x: Math.min(Math.max(x, 0), 1),
            y: Math.min(Math.max(y, 0), 1)
        };
    }
    
    // Показать определенный слайд с WebGL анимацией
    async showSlide(index, skipAnimation = false) {
        if (this.isAnimating && !skipAnimation) return;
        this.isAnimating = true;
        
        // Запоминаем текущий слайд
        this.currentSlide = index;
        
        // Обновляем пагинацию
        this.dots.forEach((dot, i) => {
            // Удаляем активный статус со всех буллетов
            dot.removeAttribute('data-active');
            
            // Находим элемент прогресса внутри буллета для сброса анимации
            const progress = dot.querySelector('[data-gallery="bullet-progress"]');
            if (progress && !skipAnimation) {
                // Сбрасываем анимацию всех буллетов
                gsap.to(progress, {
                    scaleX: 0,
                    duration: 0.3,
                    ease: "power1.out"
                });
            }
            
            // Устанавливаем активный статус для текущего буллета
            if (i === index) {
                dot.setAttribute('data-active', 'true');
                
                // Находим элемент прогресса внутри буллета (если есть)
                const progress = dot.querySelector('[data-gallery="bullet-progress"]');
                if (progress && !skipAnimation) {
                    // Сначала сбрасываем прогресс
                    gsap.set(progress, { scaleX: 0 });
                    // Затем анимируем вместе с переходом слайда
                    gsap.to(progress, {
                        scaleX: 1,
                        duration: 1.2,
                        ease: "power2.inOut"
                    });
                }
            }
        });
        
        // Скрываем все слайды и их текст
        this.slides.forEach(slide => {
            slide.style.display = 'none';
            const textContainer = slide.querySelector('[data-gallery="text-container"]');
            if (textContainer && !this.isInitialAnimationPlaying) {
                textContainer.style.opacity = '0';
            }
        });
        
        // Показываем текущий слайд
        this.slides[index].style.display = 'block';
        
        if (this.useWebGL) {
            // Загружаем новую текстуру для следующего слайда
            await this.loadImageTexture(this.slides[index].querySelector('[data-gallery="image"]').src, this.nextTexture);
            
            if (skipAnimation) {
                // Если пропускаем анимацию, просто устанавливаем текстуру как текущую
                // Используем nextTexture, который мы только что загрузили
                [this.texture, this.nextTexture] = [this.nextTexture, this.texture];
                this.params.transition = 0;
                this.isAnimating = false;
                return;
            }
            
            // Анимируем переход
            gsap.to(this.params, {
                transition: 1,
                duration: 1.2,
                ease: "power2.inOut",
                onUpdate: () => {
                    // Показываем текст слайда, когда анимация близка к завершению
                    if (this.params.transition > 0.95 && !this.textAnimationStarted) {
                        this.textAnimationStarted = true;
                        
                        if (!this.isInitialAnimationPlaying) {
                            const textContainer = this.slides[index].querySelector('[data-gallery="text-container"]');
                            if (textContainer) {
                                gsap.to(textContainer, { 
                                    opacity: 1, 
                                    duration: 0.3,
                                    delay: 0 
                                });
                            }
                        }
                    }
                },
                onComplete: () => {
                    // По завершении анимации меняем текстуры местами
                    [this.texture, this.nextTexture] = [this.nextTexture, this.texture];
                    this.params.transition = 0;
                    this.isAnimating = false;
                    this.textAnimationStarted = false;
                }
            });
        } else {
            // Резервная анимация без WebGL            
            setTimeout(() => {
                this.isAnimating = false;
                
                // Показываем текст нового слайда, если интро-анимация завершена
                if (!this.isInitialAnimationPlaying) {
                    const textContainer = this.slides[index].querySelector('[data-gallery="text-container"]');
                    if (textContainer) {
                        gsap.to(textContainer, { opacity: 1, duration: 0.5, delay: 0.05 });
                    }
                }
            }, 600);
        }
    }
    
    // Переключение слайдов
    changeSlide(direction) {
        if (this.isAnimating) return;
        
        // При смене слайда НЕ сбрасываем автоматическое вращение
        // this.resetAutoRotation();
        
        const newIndex = (this.currentSlide + direction + this.slideCount) % this.slideCount;
        this.currentSlide = newIndex;
        this.showSlide(this.currentSlide);
    }
    
    // Основной метод рендеринга WebGL
    render() {
        if (!this.useWebGL || !this.gl) return;
        
        this.resizeCanvas();
        
        // Обновляем автоматическое вращение для мобильных устройств
        if (this.isTouchDevice && this.autoRotation.active && !this.isAnimating) {
            this.autoRotation.angle += this.autoRotation.speed;
            // Непрерывное вращение только по оси X
            this.mousePosition.x = 0.5 + Math.sin(this.autoRotation.angle) * 0.2;
            // Держим Y постоянным для избежания вертикальных движений
            this.mousePosition.y = 0.5;
        } 
        else if (!this.isTouchDevice && !this.isAnimating) {
            // Интерполяция позиции мыши для плавного эффекта (только для desktop)
            const interpolationFactor = 0.1;
            this.mousePosition.x += (this.targetMousePosition.x - this.mousePosition.x) * interpolationFactor;
            this.mousePosition.y += (this.targetMousePosition.y - this.mousePosition.y) * interpolationFactor;
        }
        
        // Очищаем canvas
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Используем нашу программу
        this.gl.useProgram(this.program);
        
        // Устанавливаем время
        this.gl.uniform1f(this.timeLocation, (performance.now() - this.startTime) / 1000);
        
        // Устанавливаем разрешение
        this.gl.uniform2f(this.resolutionLocation, this.gl.canvas.width, this.gl.canvas.height);
        
        // Устанавливаем позицию мыши
        this.gl.uniform2f(this.mousePositionLocation, this.mousePosition.x, this.mousePosition.y);
        
        // Устанавливаем параметры перехода
        this.gl.uniform1f(this.transitionLocation, this.params.transition);
        this.gl.uniform1f(this.directionLocation, this.params.direction);
        
        // Активируем текстуры
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureLocation, 0);
        
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.nextTexture);
        this.gl.uniform1i(this.textureNextLocation, 1);
        
        // Устанавливаем позиции вершин
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Устанавливаем текстурные координаты
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Рисуем прямоугольник
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    
    // Настройка свайпа
    setupSwipe() {
        let startX, moveX;
        const threshold = 100; // минимальное расстояние для свайпа
        
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
                if (diff > 0) {
                    this.params.direction = 1; // Вправо
                    this.changeSlide(-1); // Свайп вправо -> предыдущий слайд
                } else {
                    this.params.direction = -1; // Влево
                    this.changeSlide(1); // Свайп влево -> следующий слайд
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
    }
    
    // Добавляем метод для управления с клавиатуры
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Если идет анимация или интро-анимация, игнорируем нажатия клавиш
            if (this.isAnimating || this.isInitialAnimationPlaying) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    // Переход к предыдущему слайду (стрелка влево)
                    this.params.direction = 1;
                    this.changeSlide(-1);
                    break;
                case 'ArrowRight':
                    // Переход к следующему слайду (стрелка вправо)
                    this.params.direction = -1;
                    this.changeSlide(1);
                    break;
            }
        });
    }
    
    // Анимационный цикл
    animate() {
        this.render();
        requestAnimationFrame(() => this.animate());
    }
    
    // Метод для запуска интро-анимации
    playInitialAnimation() {
        if (this.initialAnimationPlayed || !this.useWebGL) return;
        
        // Блокируем обработку движения мыши на время анимации
        this.isInitialAnimationPlaying = true;
        
        // Запоминаем начальную позицию мыши (центр)
        const centerPosition = { x: 0.5, y: 0.5 };
        this.mousePosition = { ...centerPosition };
        this.targetMousePosition = { ...centerPosition };
        
        // Запускаем два полных оборота
        gsap.timeline()
            .to(this.params, {
                transition: 2, // Два полных оборота
                duration: 2.5, // Длительность 2.5 секунды
                ease: "expo.inOut", // Эффект easing - быстрый старт и конец
                onStart: () => {
                    // Установим направление анимации на обратное для эффекта
                    this.params.direction = -1;
                    this.isAnimating = true;
                },
                onComplete: () => {
                    // Восстанавливаем состояние после анимации
                    this.params.transition = 0;
                    this.isAnimating = false;
                    this.initialAnimationPlayed = true;
                    this.isInitialAnimationPlaying = false; // Разблокируем обработку движения мыши
                    
                    // Для мобильных устройств активируем автоматическое вращение
                    if (this.isTouchDevice) {
                        // Начинаем с центральной позиции для плавного старта
                        this.autoRotation.angle = 0; 
                        this.autoRotation.active = true;
                    }
                    
                    // Показываем навигацию, пагинацию и текст
                    this.showElementsAfterIntro();
                    
                    // Диспатчим событие завершения начальной анимации
                    const event = new CustomEvent('galleryInitialAnimationComplete');
                    document.dispatchEvent(event);
                }
            });
    }
    
    // Метод для скрытия элементов во время интро-анимации
    hideElementsDuringIntro() {
        // Скрываем навигацию
        if (this.prevButton) this.prevButton.style.opacity = '0';
        if (this.nextButton) this.nextButton.style.opacity = '0';
        
        // Скрываем пагинацию
        if (this.paginationWrapper) this.paginationWrapper.style.opacity = '0';
        
        // Скрываем текст
        this.textContainers.forEach(container => {
            container.style.opacity = '0';
        });
    }
    
    // Метод для показа элементов после интро-анимации
    showElementsAfterIntro() {
        // Показываем навигацию с анимацией
        if (this.prevButton) {
            gsap.to(this.prevButton, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
        if (this.nextButton) {
            gsap.to(this.nextButton, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
        
        // Показываем пагинацию с анимацией
        if (this.paginationWrapper) {
            gsap.to(this.paginationWrapper, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
        
        // Показываем текст активного слайда с анимацией
        const activeSlide = this.slides[this.currentSlide];
        if (activeSlide) {
            const textContainer = activeSlide.querySelector('[data-gallery="text-container"]');
            if (textContainer) {
                gsap.to(textContainer, { opacity: 1, duration: 0.3, delay: 0.1 });
            }
        }
    }
    
    // Добавляем новый метод для создания пагинационных буллетов
    createPaginationBullets() {
        // Находим шаблонный буллет
        const templateBullet = this.paginationWrapper.querySelector('[data-gallery="pagination-bullet"][data-template="true"]');
        
        // Получаем все существующие буллеты, кроме шаблона
        const existingBullets = this.paginationWrapper.querySelectorAll('[data-gallery="pagination-bullet"]:not([data-template="true"])');
        
        // Проверяем, соответствует ли количество буллетов количеству слайдов
        if (existingBullets.length === this.slides.length) {
            // Если соответствует, просто добавляем обработчики событий и устанавливаем активное состояние
            existingBullets.forEach((bullet, i) => {
                // Сначала снимаем активное состояние со всех буллетов
                bullet.removeAttribute('data-active');
                
                // Устанавливаем активное состояние только для текущего слайда
                if (i === this.currentSlide) {
                    bullet.setAttribute('data-active', 'true');
                }
                
                bullet.addEventListener('click', () => {
                    if (this.currentSlide === i) return;
                    this.params.direction = i > this.currentSlide ? -1 : 1;
                    this.currentSlide = i;
                    this.showSlide(this.currentSlide);
                });
            });
            
            // Обновляем ссылку на буллеты
            this.dots = existingBullets;
            return;
        }
        
        // Если шаблонный буллет не найден, или количество буллетов не соответствует, создаем заново
        if (!templateBullet) {
            // Очищаем контейнер
            this.paginationWrapper.innerHTML = '';
            
            // Создаем простые буллеты
            for (let i = 0; i < this.slides.length; i++) {
                const bullet = document.createElement('div');
                bullet.setAttribute('data-gallery', 'pagination-bullet');
                
                // Активный буллет только для текущего слайда
                if (i === this.currentSlide) {
                    bullet.setAttribute('data-active', 'true');
                }
                
                // Добавляем элемент прогресса с атрибутом вместо класса
                const progress = document.createElement('div');
                progress.setAttribute('data-gallery', 'bullet-progress');
                bullet.appendChild(progress);
                
                // Добавляем обработчик клика
                bullet.addEventListener('click', () => {
                    if (this.currentSlide === i) return;
                    this.params.direction = i > this.currentSlide ? -1 : 1;
                    this.currentSlide = i;
                    this.showSlide(this.currentSlide);
                });
                
                this.paginationWrapper.appendChild(bullet);
            }
        } else {
            // Сохраняем шаблонный буллет
            const template = templateBullet.cloneNode(true);
            
            // Удаляем все буллеты, кроме шаблона
            existingBullets.forEach(bullet => bullet.remove());
            
            // Создаем буллеты из шаблона
            for (let i = 0; i < this.slides.length; i++) {
                const bullet = template.cloneNode(true);
                bullet.removeAttribute('data-template');
                bullet.style.display = ''; // Убираем display: none
                
                // Активный буллет только для текущего слайда
                if (i === this.currentSlide) {
                    bullet.setAttribute('data-active', 'true');
                } else {
                    bullet.removeAttribute('data-active');
                }
                
                // Добавляем обработчик клика
                bullet.addEventListener('click', () => {
                    if (this.currentSlide === i) return;
                    this.params.direction = i > this.currentSlide ? -1 : 1;
                    this.currentSlide = i;
                    this.showSlide(this.currentSlide);
                });
                
                this.paginationWrapper.appendChild(bullet);
            }
        }
        
        // Обновляем ссылку на буллеты
        this.dots = document.querySelectorAll('[data-gallery="pagination-bullet"]:not([data-template="true"])');
    }
    
    // Добавляем стили для плавных переходов
    addTransitionStyles() {
        // Создаем элемент стиля
        const style = document.createElement('style');
        style.textContent = `
            [data-gallery="prev"],
            [data-gallery="next"],
            [data-gallery="pagination-wrapper"],
            [data-gallery="text-container"] {
                transition: opacity 0.3s ease;
            }
            
            [data-gallery="bullet-progress"] {
                display: block;
                width: 100%;
                height: 100%;
                transform-origin: left center;
                transform: scaleX(0);
            }
            
            [data-gallery="pagination-bullet"][data-active="true"] [data-gallery="bullet-progress"] {
                transform: scaleX(1);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Метод для плавного сброса автоматического вращения при смене слайда
    // Этот метод больше не используется, но оставлен для совместимости
    resetAutoRotation() {
        // Метод оставлен пустым - не меняем положение при смене слайдов
    }
}

// Инициализация слайдера после загрузки
document.addEventListener('DOMContentLoaded', () => {
    new CustomGallery();
});
