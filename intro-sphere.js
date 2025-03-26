// Определяем шейдеры, взятые из webflow-gallery.min.js
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
"// Определяем функцию getFishEye до ее использования\n" +
"vec3 getFishEye(vec2 uv, float level) {\n" +
"    float len = length(uv);\n" +
"    float a = len * level;\n" +
"    return vec3(uv / len * sin(a), -cos(a));\n" +
"}\n" +
"\n" +
"vec3 getColor(vec2 p, sampler2D tex) {\n" +
"    // Адаптируем p от [-1,1] к [0,1] для текстурных координат\n" +
"    vec2 baseUV = (p + 1.0) * 0.5;\n" +
"    \n" +
"    // Используем тот же подход к маппингу, что и в unwrap шейдере\n" +
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
"    // Инвертируем Y координату для правильной ориентации текстуры\n" +
"    baseUV.y = 1.0 - baseUV.y;\n" +
"    \n" +
"    // Применяем текстурные координаты\n" +
"    vec3 baseColor = texture2D(tex, baseUV).xyz;\n" +
"    return baseColor;\n" +
"}\n" +
"\n" +
"void main() {\n" +
"    // Нормализуем координаты для создания идеально круглой сферы\n" +
"    vec2 p = vScreenPosition.xy;\n" +
"    \n" +
"    // Задаем цвет фона как полностью прозрачный\n" +
"    vec4 fragColor = vec4(0.0, 0.0, 0.0, 0.0);\n" +
"    \n" +
"    // t - коэффициент анимации от 0 до 1\n" +
"    float t = uUnwrapProgress;\n" +
"    \n" +
"    // Вычисляем коэффициент масштабирования согласно формуле из шейдера unwrap\n" +
"    float zoom = pow(2.0 * t, 5.0) + 1.0;\n" +
"    \n" +
"    // Применяем начальное масштабирование сферы\n" +
"    zoom *= uZoom;\n" +
"    \n" +
"    // Соотношение сторон для правильной проекции\n" +
"    float aspect = uResolution.x / uResolution.y;\n" +
"    \n" +
"    // Применяем правильную проекцию к направлению луча\n" +
"    // Используем фиксированное поле зрения по вертикали (y) и масштабируем по горизонтали (x)\n" +
"    vec3 dir;\n" +
"    if (aspect >= 1.0) {\n" +
"        // Горизонтальный экран: фиксируем y, масштабируем x\n" +
"        dir = normalize(vec3(p.x * aspect * PI, p.y * PI, -zoom * (CAMERA_DIST - 1.0)));\n" +
"    } else {\n" +
"        // Вертикальный экран: фиксируем x, масштабируем y\n" +
"        dir = normalize(vec3(p.x * PI, p.y / aspect * PI, -zoom * (CAMERA_DIST - 1.0)));\n" +
"    }\n" +
"    \n" +
"    // Вычисляем параметры для определения пересечения луча со сферой\n" +
"    float b = CAMERA_DIST * dir.z;\n" +
"    float h = b*b - CAMERA_DIST*CAMERA_DIST + 1.0;\n" +
"    \n" +
"    // Если есть пересечение со сферой (h >= 0)\n" +
"    if (h >= 0.0) {\n" +
"        // Вычисляем точку пересечения луча со сферой\n" +
"        vec3 q = vec3(0.0, 0.0, CAMERA_DIST) - dir * (b + sqrt(h));\n" +
"        \n" +
"        // Создаем матрицу поворота вокруг оси Y\n" +
"        float cosRot = cos(uRotation * PI * 2.0);\n" +
"        float sinRot = sin(uRotation * PI * 2.0);\n" +
"        mat3 rotationMatrix = mat3(\n" +
"            cosRot, 0.0, -sinRot,\n" +
"            0.0, 1.0, 0.0,\n" +
"            sinRot, 0.0, cosRot\n" +
"        );\n" +
"        \n" +
"        // Применяем поворот к точке на сфере\n" +
"        q = rotationMatrix * q;\n" +
"        \n" +
"        // Преобразуем точку на сфере в текстурные координаты\n" +
"        vec3 normal = normalize(q);\n" +
"        float u = atan(normal.x, normal.z) / (2.0 * PI);\n" +
"        float v = 1.0 - acos(normal.y) / PI;\n" +
"        vec2 sphereCoords = vec2(u, v);\n" +
"        \n" +
"        // Применяем масштабирование\n" +
"        p = sphereCoords * zoom;\n" +
"        \n" +
"        // Получаем базовые цвета из текстур\n" +
"        vec3 currentColor = getColor(p, uTexture);\n" +
"        vec3 nextColor = getColor(p, uTextureNext);\n" +
"        \n" +
"        // Смешиваем цвета для анимации перехода между слайдами\n" +
"        float mixFactor = smoothstep(0.0, 1.0, uTransition);\n" +
"        vec3 color = mix(currentColor, nextColor, mixFactor);\n" +
"        \n" +
"        // Применяем Fisheye эффект\n" +
"        vec3 fisheyeDir = getFishEye(vScreenPosition.xy, 1.4);\n" +
"        \n" +
"        // Плавно смешиваем между сферическими и Fisheye координатами\n" +
"        float fisheyeMix = smoothstep(0.0, 1.0, t);\n" +
"        vec2 finalCoords = mix(sphereCoords, fisheyeDir.xy, fisheyeMix);\n" +
"        \n" +
"        // Получаем цвет с учетом смешивания\n" +
"        currentColor = getColor(finalCoords, uTexture);\n" +
"        nextColor = getColor(finalCoords, uTextureNext);\n" +
"        color = mix(currentColor, nextColor, mixFactor);\n" +
"        \n" +
"        // Применяем повороты при контроле мышью\n" +
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
"            // Применяем повороты\n" +
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
"            // Получаем цвет для Fisheye эффекта\n" +
"            currentColor = getColor(fisheyeDir.xy, uTexture);\n" +
"            nextColor = getColor(fisheyeDir.xy, uTextureNext);\n" +
"            color = mix(currentColor, nextColor, mixFactor);\n" +
"        }\n" +
"        \n" +
"        // Применяем угасание по краям\n" +
"        float fish_eye = smoothstep(2.0, 1.6, length(vScreenPosition.xy)) * 0.15 + 0.85;\n" +
"        \n" +
"        fragColor = vec4(color * fish_eye, 1.0);\n" +
"    }\n" +
"    \n" +
"    gl_FragColor = fragColor;\n" +
"}";

// Обработка прелоадера
window.addEventListener('load', function() {
    setTimeout(function() {
        document.getElementById('gallery-preloader').classList.add('hidden');
    }, 100);
});

class CustomGallery {
    constructor() {
        // Основной враппер
        this.mainWrapper = document.querySelector('[data-gallery="main-wrapper"]');
        
        // Контейнер слайдов
        this.container = document.querySelector('[data-gallery="container"]');
        this.container.style.width = '100%';
        this.container.style.height = '100%';
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
        
        // Состояние для WebGL анимации
        this.startTime = performance.now();
        this.mousePosition = { x: 0.5, y: 0.5 };
        this.targetMousePosition = { x: 0.5, y: 0.5 };
        this.params = {
            transition: 0,
            direction: 1, // 1 для вправо, -1 для влево
            autoRotationX: 0, // Добавляем параметр для автоматического вращения по оси X
            unwrapProgress: 0, // Добавили новый параметр для анимации разворота сферы
            rotation: 0,    // Параметр для вращения текстуры
            stretchV: 1.0,  // Параметр для вертикального растяжения текстуры
            zoom: 1.0      // Параметр для масштабирования сферы
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
        this.resizeCanvasToDisplaySize();
        window.addEventListener('resize', () => this.resizeCanvasToDisplaySize());
        
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
        this.unwrapProgressLocation = this.gl.getUniformLocation(this.program, 'uUnwrapProgress');
        this.rotationLocation = this.gl.getUniformLocation(this.program, 'uRotation');
        this.stretchVLocation = this.gl.getUniformLocation(this.program, 'uStretchV');
        this.zoomLocation = this.gl.getUniformLocation(this.program, 'uZoom');
        
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
        
        // Обновляем размеры canvas
        this.resizeCanvasToDisplaySize();
        
        // Интерполяция позиции мыши для плавного эффекта
        const interpolationFactor = 0.1;
        this.mousePosition.x += (this.targetMousePosition.x - this.mousePosition.x) * interpolationFactor;
        this.mousePosition.y += (this.targetMousePosition.y - this.mousePosition.y) * interpolationFactor;
        
        // Очищаем canvas на прозрачный фон
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Включаем двусторонний рендеринг, чтобы видеть все пиксели
        this.gl.disable(this.gl.CULL_FACE);
        
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
        this.gl.uniform1f(this.unwrapProgressLocation, this.params.unwrapProgress);
        this.gl.uniform1f(this.rotationLocation, this.params.rotation);
        this.gl.uniform1f(this.stretchVLocation, this.params.stretchV);
        this.gl.uniform1f(this.zoomLocation, this.params.zoom);
        
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
        
        // Добавляем задержку 100мс перед началом анимации
        setTimeout(() => {
            // Блокируем обработку движения мыши на время анимации
            this.isInitialAnimationPlaying = true;
            
            // Устанавливаем начальные значения
            this.params.unwrapProgress = 0; // Начинаем со сферы, видимой на расстоянии
            this.params.zoom = 0; // Начинаем с полностью невидимой сферы
            this.params.rotation = 0; // Начинаем с нулевого вращения
            
            // Создаем анимацию
            this.isAnimating = true;
            
            // Создаем timeline для последовательной анимации
            const timeline = gsap.timeline({
                onComplete: () => {
                    // Восстанавливаем состояние после анимации
                    this.isAnimating = false;
                    this.initialAnimationPlayed = true;
                    this.isInitialAnimationPlaying = false; // Разблокируем обработку движения мыши
                    
                    // Показываем навигацию, пагинацию и текст
                    this.showElementsAfterIntro();
                    
                    // Запускаем автоматическое вращение на touch устройствах
                    if (this.isTouchOnly) {
                        // Устанавливаем autoRotationX в 0
                        this.params.autoRotationX = 0;
                        this.startAutoRotation(0);
                    }
                    
                    // Диспатчим событие завершения начальной анимации
                    const event = new CustomEvent('galleryInitialAnimationComplete');
                    document.dispatchEvent(event);
                }
            });

            // Добавляем анимации параллельно
            timeline.to(this.params, {
                rotation: 2, // Два оборота (2 = 720 градусов)
                zoom: 0.8, // Увеличиваем до среднего размера
                duration: 2.0, // 4 секунды на вращение и увеличение
                ease: "none", // Более плавная анимация
            });

            // Затем только увеличиваем и разворачиваем
            timeline.to(this.params, {
                zoom: 1, // Увеличиваем до нормального размера
                unwrapProgress: 1, // Конечное значение - плоское изображение
                duration: 1.3, // 3 секунды на увеличение и разворачивание
                ease: "power2.Out", // Более плавная анимация
            });
        }, 100);
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

// Инициализация слайдера после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Создаем экземпляр галереи
    new CustomGallery();
});

// Экспортируем класс в глобальное пространство имен
window.CustomGallery = CustomGallery;
