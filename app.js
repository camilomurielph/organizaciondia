// ============================================================
//  MÓDULO POMODORO
// ============================================================
const Pomodoro = (() => {
    let timerInterval = null;
    let currentMode = 'stopped'; // 'stopped' | 'work' | 'rest'
    let remainingSeconds = 25 * 60; // 25 min
    const WORK_TIME = 25 * 60;
    const REST_TIME = 5 * 60;

    const timerEl = document.getElementById('pomodoroTimer');
    const statusEl = document.getElementById('pomodoroStatus');
    const btnWork = document.getElementById('btnWork');
    const btnRest = document.getElementById('btnRest');

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateDisplay() {
        timerEl.textContent = formatTime(remainingSeconds);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function startTimer(mode) {
        stopTimer();
        if (mode === 'work') {
            remainingSeconds = WORK_TIME;
            currentMode = 'work';
            statusEl.textContent = '⏳ Trabajando...';
        } else if (mode === 'rest') {
            remainingSeconds = REST_TIME;
            currentMode = 'rest';
            statusEl.textContent = '☕ Descansando...';
        } else {
            return;
        }
        updateDisplay();

        timerInterval = setInterval(() => {
            remainingSeconds--;
            updateDisplay();
            if (remainingSeconds <= 0) {
                stopTimer();
                currentMode = 'stopped';
                statusEl.textContent = '⏸ Tiempo finalizado';
                // Pequeña alerta visual
                timerEl.style.color = '#ff6b6b';
                setTimeout(() => (timerEl.style.color = '#ffffff'), 500);
            }
        }, 1000);
    }

    function reset() {
        stopTimer();
        currentMode = 'stopped';
        remainingSeconds = WORK_TIME;
        updateDisplay();
        statusEl.textContent = '⏸ Detenido';
        timerEl.style.color = '#ffffff';
    }

    // Eventos
    btnWork.addEventListener('click', () => startTimer('work'));
    btnRest.addEventListener('click', () => startTimer('rest'));

    // Botón de reinicio (desde el panel)
    document.querySelector('[data-module="pomodoro"]').addEventListener('click', reset);

    // Inicializar
    reset();

    return { reset };
})();

// ============================================================
//  MÓDULO CHECKLIST
// ============================================================
const Checklist = (() => {
    const STORAGE_KEY = 'checklist_tasks';
    let tasks = [];

    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addTaskBtn');
    const activeList = document.getElementById('activeTasks');
    const completedList = document.getElementById('completedTasks');

    // Cargar desde localStorage
    function loadTasks() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                tasks = JSON.parse(stored);
            } catch (e) {
                tasks = [];
            }
        } else {
            tasks = [];
        }
        render();
    }

    function saveTasks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }

    function render() {
        const active = tasks.filter(t => !t.completed);
        const completed = tasks.filter(t => t.completed);

        activeList.innerHTML = '';
        completedList.innerHTML = '';

        active.forEach(task => createTaskElement(task, activeList));
        completed.forEach(task => createTaskElement(task, completedList));
    }

    function createTaskElement(task, list) {
        const li = document.createElement('li');
        li.dataset.id = task.id;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = task.completed;
        cb.addEventListener('change', () => {
            task.completed = cb.checked;
            saveTasks();
            render();
        });

        const textSpan = document.createElement('span');
        textSpan.className = 'task-text' + (task.completed ? ' completed' : '');
        textSpan.textContent = task.text;
        textSpan.contentEditable = false;

        // Doble clic para editar
        textSpan.addEventListener('dblclick', () => {
            if (task.completed) return; // no editar completadas
            textSpan.contentEditable = true;
            textSpan.classList.add('editing');
            textSpan.focus();
            // Seleccionar todo
            const range = document.createRange();
            range.selectNodeContents(textSpan);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });

        textSpan.addEventListener('blur', () => {
            if (textSpan.contentEditable === 'true') {
                const newText = textSpan.textContent.trim();
                if (newText.length > 0) {
                    task.text = newText;
                    saveTasks();
                    render();
                } else {
                    // Si queda vacío, revertir
                    render();
                }
            }
        });

        textSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textSpan.blur();
            }
            if (e.key === 'Escape') {
                textSpan.textContent = task.text;
                textSpan.blur();
            }
        });

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Eliminar tarea';
        deleteBtn.addEventListener('click', () => {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            render();
        });

        actions.appendChild(deleteBtn);

        li.appendChild(cb);
        li.appendChild(textSpan);
        li.appendChild(actions);
        list.appendChild(li);
    }

    function addTask(text) {
        text = text.trim();
        if (!text) return;
        const newTask = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            text: text,
            completed: false,
        };
        tasks.push(newTask);
        saveTasks();
        render();
        taskInput.value = '';
        taskInput.focus();
    }

    function reset() {
        if (confirm('¿Eliminar todas las tareas?')) {
            tasks = [];
            saveTasks();
            render();
        }
    }

    // Eventos
    addBtn.addEventListener('click', () => addTask(taskInput.value));
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTask(taskInput.value);
        }
    });

    document.querySelector('[data-module="checklist"]').addEventListener('click', reset);

    loadTasks();

    return { reset };
})();

// ============================================================
//  MÓDULO TIMEBLOCKING
// ============================================================
const Timeblocking = (() => {
    const STORAGE_KEY = 'timeblocking_blocks';
    let blocks = [];
    let nextId = 1;

    // Elementos DOM
    const grid = document.getElementById('timeGrid');
    const labelsContainer = document.getElementById('timeLabels');
    const tbStart = document.getElementById('tbStart');
    const tbDuration = document.getElementById('tbDuration');
    const tbTitle = document.getElementById('tbTitle');
    const addBtn = document.getElementById('addBlockBtn');

    // Configuración de horas (de 6 AM a 10 PM = 16 horas)
    const HOUR_START = 6;
    const HOUR_END = 22;
    const HOUR_HEIGHT = 60; // px por hora

    // Colores predefinidos
    const COLORS = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6', 'color-7', 'color-8'];

    // ===== Renderizado de etiquetas =====
    function renderLabels() {
        labelsContainer.innerHTML = '';
        for (let h = HOUR_START; h <= HOUR_END; h++) {
            const label = document.createElement('div');
            label.className = 'time-label';
            const hourStr = h < 10 ? `0${h}` : `${h}`;
            const ampm = h < 12 ? 'AM' : 'PM';
            const displayHour = h > 12 ? h - 12 : h;
            label.textContent = `${displayHour}:00 ${ampm}`;
            labelsContainer.appendChild(label);
        }
        // Ajustar altura del contenedor
        const totalHours = HOUR_END - HOUR_START;
        const container = document.querySelector('.timeblocking-container');
        container.style.height = `${totalHours * HOUR_HEIGHT + 20}px`;
    }

    // ===== Cargar y guardar =====
    function loadBlocks() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                blocks = JSON.parse(stored);
                // Asegurar que cada bloque tenga id
                blocks.forEach(b => { if (!b.id) b.id = nextId++; });
                nextId = blocks.reduce((max, b) => Math.max(max, b.id), 0) + 1;
            } catch (e) {
                blocks = [];
            }
        } else {
            blocks = [];
        }
        renderBlocks();
    }

    function saveBlocks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
    }

    // ===== Renderizar bloques =====
    function renderBlocks() {
        grid.innerHTML = '';
        blocks.forEach(block => {
            const el = createBlockElement(block);
            grid.appendChild(el);
        });
    }

    function createBlockElement(block) {
        const el = document.createElement('div');
        el.className = `tb-block ${block.color || 'color-1'}`;
        el.dataset.id = block.id;

        // Posición y tamaño
        const topPx = (block.start - HOUR_START) * HOUR_HEIGHT;
        const heightPx = (block.duration / 60) * HOUR_HEIGHT;
        el.style.top = `${topPx}px`;
        el.style.height = `${heightPx}px`;
        el.style.width = '100%';

        // Título
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tb-title';
        titleSpan.textContent = block.title || 'Sin título';
        el.appendChild(titleSpan);

        // Hora
        const timeSpan = document.createElement('span');
        timeSpan.className = 'tb-time';
        const startStr = formatHour(block.start);
        const endStr = formatHour(block.start + block.duration / 60);
        timeSpan.textContent = `${startStr} - ${endStr}`;
        el.appendChild(timeSpan);

        // Botón eliminar
        const del = document.createElement('button');
        del.className = 'tb-delete';
        del.textContent = '✕';
        del.addEventListener('mousedown', (e) => e.stopPropagation());
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBlock(block.id);
        });
        el.appendChild(del);

        // Handle de redimensionamiento (abajo)
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startResize(e, block);
        });
        el.appendChild(handle);

        // Arrastrar (mover)
        el.addEventListener('mousedown', (e) => {
            if (e.target.closest('.resize-handle') || e.target.closest('.tb-delete')) return;
            startDrag(e, block);
        });

        return el;
    }

    function formatHour(h) {
        const hours = Math.floor(h);
        const minutes = Math.round((h - hours) * 60);
        const ampm = hours < 12 ? 'AM' : 'PM';
        const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }

    // ===== CRUD =====
    function addBlock(start, duration, title) {
        if (duration < 15) duration = 15;
        const newBlock = {
            id: nextId++,
            start: start,
            duration: duration,
            title: title || 'Sin título',
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
        blocks.push(newBlock);
        saveBlocks();
        renderBlocks();
    }

    function deleteBlock(id) {
        blocks = blocks.filter(b => b.id !== id);
        saveBlocks();
        renderBlocks();
    }

    function updateBlock(id, newStart, newDuration) {
        const block = blocks.find(b => b.id === id);
        if (block) {
            block.start = newStart;
            block.duration = newDuration;
            saveBlocks();
            renderBlocks();
        }
    }

    // ===== Arrastrar =====
    let dragData = null;

    function startDrag(e, block) {
        const el = e.currentTarget;
        const rect = grid.getBoundingClientRect();
        const startY = e.clientY;
        const startTop = block.start;

        dragData = {
            block: block,
            el: el,
            startY: startY,
            startTop: startTop,
            type: 'drag'
        };

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        e.preventDefault();
    }

    function startResize(e, block) {
        const el = e.currentTarget.closest('.tb-block');
        const rect = grid.getBoundingClientRect();
        const startY = e.clientY;
        const startHeight = block.duration / 60; // en horas

        dragData = {
            block: block,
            el: el,
            startY: startY,
            startHeight: startHeight,
            type: 'resize'
        };

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        e.preventDefault();
    }

    function onDragMove(e) {
        if (!dragData) return;
        const { block, el, startY, type } = dragData;
        const deltaY = (e.clientY - startY) / HOUR_HEIGHT; // en horas

        if (type === 'drag') {
            let newStart = dragData.startTop + deltaY;
            // Limitar al rango de horas
            newStart = Math.max(HOUR_START, Math.min(HOUR_END - block.duration / 60, newStart));
            // Redondear a 15 minutos
            newStart = Math.round(newStart * 4) / 4;
            block.start = newStart;
            saveBlocks();
            renderBlocks();
        } else if (type === 'resize') {
            let newDurationHours = dragData.startHeight + deltaY;
            newDurationHours = Math.max(0.25, Math.min(HOUR_END - HOUR_START, newDurationHours));
            // Redondear a 15 minutos
            let newDuration = Math.round(newDurationHours * 4) / 4;
            // Asegurar que no exceda el final del día
            if (block.start + newDuration > HOUR_END) {
                newDuration = HOUR_END - block.start;
            }
            block.duration = newDuration * 60;
            saveBlocks();
            renderBlocks();
        }
    }

    function onDragEnd() {
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        dragData = null;
    }

    // ===== Añadir desde formulario =====
    function addFromForm() {
        const timeVal = tbStart.value;
        if (!timeVal) return;
        const [hour, minute] = timeVal.split(':').map(Number);
        let start = hour + minute / 60;
        // Si la hora es menor que HOUR_START, ajustar
        if (start < HOUR_START) start = HOUR_START;
        if (start > HOUR_END) start = HOUR_END;

        let duration = parseInt(tbDuration.value, 10);
        if (isNaN(duration) || duration < 15) duration = 60;
        if (start + duration / 60 > HOUR_END) {
            duration = (HOUR_END - start) * 60;
            if (duration < 15) {
                alert('No hay suficiente tiempo en el día para este bloque.');
                return;
            }
        }
        const title = tbTitle.value.trim() || 'Sin título';
        addBlock(start, duration, title);
        tbTitle.value = '';
    }

    // ===== Reset =====
    function reset() {
        if (confirm('¿Eliminar todos los bloques de tiempo?')) {
            blocks = [];
            saveBlocks();
            renderBlocks();
        }
    }

    // ===== Inicialización =====
    renderLabels();
    loadBlocks();

    // Eventos
    addBtn.addEventListener('click', addFromForm);

    // También permitir hacer clic en el grid para crear bloque de 1 hora
    grid.addEventListener('dblclick', (e) => {
        const rect = grid.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const hours = y / HOUR_HEIGHT + HOUR_START;
        let start = Math.round(hours * 4) / 4;
        if (start < HOUR_START) start = HOUR_START;
        if (start > HOUR_END - 0.25) start = HOUR_END - 0.25;
        const duration = 60; // 1 hora
        addBlock(start, duration, 'Nuevo bloque');
    });

    document.querySelector('[data-module="timeblocking"]').addEventListener('click', reset);

    return { reset };
})();
