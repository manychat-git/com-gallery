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
uniform float uAutoRotationX;
uniform float uUnwrap;
varying vec2 vUv;
varying vec2 vScreenPosition;

#define PI 3.1415926535897932384626433832795

// Простое отображение точки сферы на плоскость
vec2 sphereToPlane(vec2 p) {
    float r = length(p);
    
    // Точки за пределами единичного круга не на сфере
    if (r > 1.0) {
        return vec2(-10.0); // Метка для прозрачности
    }
    
    // Сферические координаты
    float phi = atan(p.y, p.x);
    float theta = r * PI * 0.5;
    
    // Стандартный мэппинг текстуры на сферу (экваториальная проекция)
    float u = 0.5 + phi / (2.0 * PI);
    float v = 1.0 - theta / PI;
    
    return vec2(u, v);
}

// Эффект рыбьего глаза
vec2 fishEye(vec2 uv, float strength) {
    float d = length(uv);
    float z = sqrt(1.0 - d * d);
    float r = atan(d, z) / PI;
    r *= strength;
    
    float phi = atan(uv.y, uv.x);
    
    return vec2(r * cos(phi), r * sin(phi));
}

void main() {
    vec2 uv = vScreenPosition.xy;
    
    // Начальное значение цвета - прозрачный
    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
    
    if (uUnwrap < 0.01) {
        // Начальное состояние - чистая сфера
        vec2 sphereUV = sphereToPlane(uv);
        
        if (sphereUV.x > -5.0) { // Если точка на сфере
            // Применяем вращение к сфере (автовращение и взаимодействие с мышью)
            float rotX = uAutoRotationX - uMousePosition.x * 0.5;
            float rotY = uMousePosition.y * 0.5;
            
            // Матрица поворота
            sphereUV.x = mod(sphereUV.x + rotX, 1.0);
            sphereUV.y = clamp(sphereUV.y + rotY, 0.0, 1.0);
            
            // Получаем цвет из текстуры
            color = texture2D(uTexture, sphereUV);
        }
    } else if (uUnwrap >= 1.0) {
        // Конечное состояние - плоское изображение с эффектом рыбьего глаза
        vec2 fisheye = fishEye(uv, 1.4);
        
        // Ограничиваем область видимости изображения
        if (length(fisheye) <= 1.0) {
            // Нормализуем координаты от -1..1 к 0..1
            vec2 normalizedUV = (fisheye + 1.0) * 0.5;
            
            // Добавляем эффект вращения
            float rotX = uAutoRotationX - uMousePosition.x * 0.5;
            normalizedUV.x = mod(normalizedUV.x + rotX, 1.0);
            normalizedUV.y = clamp(normalizedUV.y + uMousePosition.y * 0.5, 0.0, 1.0);
            
            // Получаем цвет из текстуры
            color = texture2D(uTexture, normalizedUV);
            
            // Добавляем затемнение по краям
            float vignette = 1.0 - length(uv) * 0.5;
            color.rgb *= vignette;
        }
    } else {
        // Анимация перехода между сферой и плоскостью
        float t = uUnwrap;
        
        // Интерполяция между сферическими и плоскими координатами
        vec2 sphereUV = sphereToPlane(uv);
        vec2 fisheyeUV = fishEye(uv, 1.4);
        
        if (sphereUV.x > -5.0 || length(fisheyeUV) <= 1.0) {
            // Для точек, которые видны хотя бы на одной из проекций
            
            // Нормализуем fisheye координаты
            vec2 normalizedFisheye = (fisheyeUV + 1.0) * 0.5;
            
            // Применяем вращение к обеим проекциям
            float rotX = uAutoRotationX - uMousePosition.x * 0.5;
            float rotY = uMousePosition.y * 0.5;
            
            // Вращение для сферы
            if (sphereUV.x > -5.0) {
                sphereUV.x = mod(sphereUV.x + rotX, 1.0);
                sphereUV.y = clamp(sphereUV.y + rotY, 0.0, 1.0);
            }
            
            // Вращение для плоскости
            normalizedFisheye.x = mod(normalizedFisheye.x + rotX, 1.0);
            normalizedFisheye.y = clamp(normalizedFisheye.y + rotY, 0.0, 1.0);
            
            // Выбираем подходящие координаты UV
            vec2 finalUV;
            float alpha = 1.0;
            
            if (sphereUV.x > -5.0 && length(fisheyeUV) <= 1.0) {
                // Точка видна в обеих проекциях - смешиваем
                finalUV = mix(sphereUV, normalizedFisheye, t);
            } else if (sphereUV.x > -5.0) {
                // Точка видна только на сфере - постепенно исчезает
                finalUV = sphereUV;
                alpha = 1.0 - t;
            } else {
                // Точка видна только на плоскости - постепенно появляется
                finalUV = normalizedFisheye;
                alpha = t;
            }
            
            // Получаем цвет из текстуры
            color = texture2D(uTexture, finalUV);
            
            // Применяем прозрачность
            color.a *= alpha;
            
            // Добавляем затемнение по краям
            float vignette = 1.0 - length(uv) * 0.5 * t;
            color.rgb *= vignette;
        }
    }
    
    // Если есть переход между слайдами, смешиваем с следующей текстурой
    if (uTransition > 0.0) {
        vec2 uv2 = vScreenPosition.xy;
        vec2 dir2 = vec2(cos(uDirection * PI), sin(uDirection * PI));
        uv2 += dir2 * uTransition;
        
        vec2 nextUV;
        if (uUnwrap < 0.5) {
            nextUV = sphereToPlane(uv2);
        } else {
            vec2 fisheyeUV = fishEye(uv2, 1.4);
            nextUV = (fisheyeUV + 1.0) * 0.5;
        }
        
        if (nextUV.x > -5.0 && nextUV.x < 1.0 && nextUV.y > 0.0 && nextUV.y < 1.0) {
            vec4 nextColor = texture2D(uTextureNext, nextUV);
            color = mix(color, nextColor, uTransition);
        }
    }
    
    gl_FragColor = color;
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
        
        // Флаг для отслеживания запуска автовращения после интро
        this.autoRotationStartedAfterIntro = false;
        
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
            direction: 1, // 1 для вправо, -1 для влево
            autoRotationX: 0, // Параметр для автоматического вращения по оси X
            unwrap: 0.0    // Добавляем параметр для эффекта unwrap
        };
        
        // Флаг для определения touch-only устройства
        this.isTouchOnly = false;
        this.detectTouchOnlyDevice();
        
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
                
                // Если на мобильном устройстве, останавливаем автоматическое вращение
                if (this.isTouchOnly) {
                    this.stopAutoRotation();
                }
                
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
        this.autoRotationXLocation = this.gl.getUniformLocation(this.program, 'uAutoRotationX');
        this.unwrapLocation = this.gl.getUniformLocation(this.program, 'uUnwrap');
        
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
        
        // Если это touch-only устройство, не обрабатываем движение мыши
        if (this.isTouchOnly) return;
        
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
        
        // При переходе на новый слайд мы хотим сбросить автовращение,
        // но сделать это плавно, в течение анимации перехода
        
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
                
                // На мобильных устройствах запускаем автоматическое вращение с нуля
                if (this.isTouchOnly && this.initialAnimationPlayed) {
                    this.params.autoRotationX = 0;
                    this.startAutoRotation(0);
                }
                
                return;
            }
            
            // Запоминаем текущее значение автовращения
            const currentAutoRotation = this.params.autoRotationX;
            
            // Создаем временную анимацию для плавного сброса автовращения во время перехода
            if (this.isTouchOnly && this.initialAnimationPlayed) {
                // Останавливаем текущую анимацию автовращения
                if (this.autoRotationTween) {
                    this.autoRotationTween.kill();
                    this.autoRotationTween = null;
                }
                
                // Плавно анимируем автовращение к 0 параллельно с переходом слайдов
                gsap.to(this.params, {
                    autoRotationX: 0,
                    duration: 1.2, // Такая же длительность как у перехода
                    ease: "power2.inOut" // Такой же тип анимации как у перехода
                });
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
                    
                    // Запускаем автоматическое вращение на touch устройствах с нуля
                    if (this.isTouchOnly && this.initialAnimationPlayed) {
                        // Убедимся, что autoRotationX точно равен 0
                        this.params.autoRotationX = 0;
                        this.startAutoRotation(0);
                    }
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
        
        // Если на мобильном устройстве, останавливаем автоматическое вращение
        if (this.isTouchOnly) {
            this.stopAutoRotation();
        }
        
        const newIndex = (this.currentSlide + direction + this.slideCount) % this.slideCount;
        this.currentSlide = newIndex;
        this.showSlide(this.currentSlide);
    }
    
    // Метод для остановки автоматического вращения
    stopAutoRotation() {
        if (this.autoRotationTween) {
            this.autoRotationTween.kill();
            this.autoRotationTween = null;
            // Не сохраняем значение вращения, так как мы хотим,
            // чтобы при переключении оно начиналось с нуля
        }
    }
    
    // Основной метод рендеринга WebGL
    render() {
        if (!this.useWebGL || !this.gl) return;
        
        this.resizeCanvas();
        
        // Интерполяция позиции мыши для плавного эффекта
        const interpolationFactor = 0.1;
        this.mousePosition.x += (this.targetMousePosition.x - this.mousePosition.x) * interpolationFactor;
        this.mousePosition.y += (this.targetMousePosition.y - this.mousePosition.y) * interpolationFactor;
        
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
        
        // Устанавливаем параметр автоматического вращения
        this.gl.uniform1f(this.autoRotationXLocation, this.params.autoRotationX);
        
        // Устанавливаем параметр unwrap
        this.gl.uniform1f(this.unwrapLocation, this.params.unwrap || 0.0);
        
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
                // Если на мобильном устройстве, останавливаем автоматическое вращение
                if (this.isTouchOnly) {
                    this.stopAutoRotation();
                }
                
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
                    // Если на мобильном устройстве, останавливаем автоматическое вращение
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
                    // Переход к предыдущему слайду (стрелка влево)
                    this.params.direction = 1;
                    this.changeSlide(-1);
                    break;
                case 'ArrowRight':
                    // Если на мобильном устройстве, останавливаем автоматическое вращение
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
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
        
        // Сохраняем и устанавливаем начальную позицию мыши (центр)
        const originalMousePosition = { ...this.mousePosition };
        const centerPosition = { x: 0.5, y: 0.5 };
        this.mousePosition = { ...centerPosition };
        this.targetMousePosition = { ...centerPosition };
        
        // Принудительно устанавливаем unwrap в 0 (сфера)
        this.params.unwrap = 0.0;
        
        // Создаем анимацию с паузой в начале
        gsap.timeline()
            // Пауза для отображения сферы (3 секунды)
            .to({}, {
                duration: 3, 
                onStart: () => {
                    console.log("Showing sphere...");
                    this.isAnimating = true;
                }
            })
            // Анимация разворачивания
            .to(this.params, {
                unwrap: 1.0,
                duration: 2.5,
                ease: "power2.inOut",
                onStart: () => {
                    console.log("Starting unwrap animation...");
                },
                onComplete: () => {
                    console.log("Animation complete!");
                    
                    // Восстанавливаем состояние
                    this.isAnimating = false;
                    this.initialAnimationPlayed = true;
                    this.isInitialAnimationPlaying = false;
                    
                    // Восстанавливаем позицию мыши
                    this.mousePosition = { ...originalMousePosition };
                    this.targetMousePosition = { ...originalMousePosition };
                    
                    // Показываем навигацию, пагинацию и текст
                    this.showElementsAfterIntro();
                    
                    // Запускаем автоматическое вращение на touch устройствах
                    if (this.isTouchOnly) {
                        this.params.autoRotationX = 0;
                        this.startAutoRotation(0);
                    }
                    
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
                    
                    // Если на мобильном устройстве, останавливаем автоматическое вращение
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
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
                    
                    // Если на мобильном устройстве, останавливаем автоматическое вращение
                    if (this.isTouchOnly) {
                        this.stopAutoRotation();
                    }
                    
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
    
    // Определяем touch-only устройство
    detectTouchOnlyDevice() {
        // Используем более надежное определение touch-only устройства
        this.isTouchOnly = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
                          !window.matchMedia('(pointer: fine)').matches;
        console.log('Touch-only device detected:', this.isTouchOnly);
    }
    
    // Запуск автоматического вращения на мобильных устройствах
    startAutoRotation(startRotation = 0) {
        // Останавливаем предыдущую анимацию если она уже запущена
        if (this.autoRotationTween) {
            this.autoRotationTween.kill();
        }
        
        // Используем переданное начальное значение вращения
        this.params.autoRotationX = startRotation;
        
        // Используем минимальную задержку для всех слайдов
        let delay = 0.0;
        
        // Создаем непрерывную анимацию вращения на 360 градусов
        this.autoRotationTween = gsap.to(this.params, {
            // Анимируем к полному обороту, начиная с текущего положения
            autoRotationX: startRotation + Math.PI * 2, 
            duration: 30, // Медленное вращение (30 секунд на полный оборот)
            ease: "none",
            delay: delay, // Минимальная задержка
            repeat: -1, // Бесконечное повторение
            onRepeat: () => {
                // Сбрасываем значение для избежания проблем с большими числами
                // но сохраняем текущее положение
                this.params.autoRotationX = this.params.autoRotationX % (Math.PI * 2);
            }
        });
    }
}

// Инициализация слайдера после загрузки
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, не была ли галерея уже инициализирована через HTML
    if (!window.customGalleryInitialized) {
        window.customGalleryInitialized = true;
        new CustomGallery();
    }
});

// В HTML можно использовать:
// window.addEventListener('load', function() {
//     window.customGalleryInitialized = true;
//     new CustomGallery();
//     
//     setTimeout(function() {
//         document.getElementById('gallery-preloader').classList.add('hidden');
//     }, 500);
// });
