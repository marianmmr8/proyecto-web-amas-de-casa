(function () {
    "use strict";

    const storageKey = "hogar-en-equilibrio-horario";
    const days = [
        { id: "lunes", label: "Lunes" },
        { id: "martes", label: "Martes" },
        { id: "miercoles", label: "Miércoles" },
        { id: "jueves", label: "Jueves" },
        { id: "viernes", label: "Viernes" },
        { id: "sabado", label: "Sábado" },
        { id: "domingo", label: "Domingo" }
    ];
    const form = document.getElementById("task-form");
    const dayInput = document.getElementById("task-day");
    const taskInput = document.getElementById("task-name");
    const weekGrid = document.getElementById("week-grid");
    const taskCount = document.getElementById("task-count");
    const statusMessage = document.getElementById("status-message");
    const clearButton = document.getElementById("clear-schedule");
    let tasks = [];
    let storageAvailable = true;
    let editingTaskId = null;

    function showMessage(message, isError) {
        statusMessage.textContent = message;
        statusMessage.classList.toggle("is-error", isError);
    }

    function readTasks() {
        const savedTasks = window.localStorage.getItem(storageKey);
        if (savedTasks === null) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);
        if (!Array.isArray(parsedTasks) || !parsedTasks.every(function (task) {
            return task &&
                typeof task.id === "string" &&
                typeof task.day === "string" &&
                days.some(function (day) { return day.id === task.day; }) &&
                typeof task.name === "string" &&
                task.name.trim().length > 0;
        })) {
            throw new Error("El horario guardado no tiene un formato válido.");
        }
        return parsedTasks;
    }

    function saveTasks() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(tasks));
            storageAvailable = true;
            return true;
        } catch (error) {
            storageAvailable = false;
            showMessage("No se pudo guardar el horario en este navegador. Comprueba el espacio disponible o los permisos de almacenamiento.", true);
            return false;
        }
    }

    function renderTasks() {
        weekGrid.replaceChildren();

        days.forEach(function (day) {
            const dayTasks = tasks.filter(function (task) {
                return task.day === day.id;
            });
            const card = document.createElement("article");
            const heading = document.createElement("h3");
            const list = document.createElement("ul");

            card.className = "day-card";
            heading.textContent = day.label;
            card.appendChild(heading);

            if (dayTasks.length === 0) {
                const emptyMessage = document.createElement("p");
                emptyMessage.className = "empty-day";
                emptyMessage.textContent = "Día libre de tareas";
                card.appendChild(emptyMessage);
            } else {
                dayTasks.forEach(function (task) {
                    const item = document.createElement("li");
                    const name = document.createElement("span");
                    const actions = document.createElement("div");

                    name.textContent = task.name;
                    actions.className = "task-actions";

                    if (editingTaskId === task.id) {
                        const editForm = document.createElement("form");
                        const nameInput = document.createElement("input");
                        const daySelect = document.createElement("select");
                        const saveButton = document.createElement("button");
                        const cancelButton = document.createElement("button");

                        editForm.className = "task-edit-form";
                        nameInput.className = "task-edit-input";
                        nameInput.type = "text";
                        nameInput.maxLength = 80;
                        nameInput.value = task.name;
                        nameInput.required = true;
                        nameInput.setAttribute("aria-label", "Modificar tarea");

                        daySelect.className = "task-day-select";
                        daySelect.setAttribute("aria-label", "Día de la tarea");
                        days.forEach(function (day) {
                            const option = document.createElement("option");
                            option.value = day.id;
                            option.textContent = day.label;
                            option.selected = day.id === task.day;
                            daySelect.appendChild(option);
                        });

                        saveButton.className = "task-action save-day";
                        saveButton.type = "submit";
                        saveButton.textContent = "Guardar";
                        editForm.addEventListener("submit", function (event) {
                            event.preventDefault();
                            updateTask(task.id, daySelect.value, nameInput.value);
                        });

                        cancelButton.className = "task-action cancel-edit";
                        cancelButton.type = "button";
                        cancelButton.textContent = "Cancelar";
                        cancelButton.addEventListener("click", function () {
                            editingTaskId = null;
                            renderTasks();
                        });

                        editForm.append(nameInput, daySelect, saveButton, cancelButton);
                        item.append(editForm);
                        list.appendChild(item);
                        nameInput.focus();
                        return;
                    }

                    const editButton = document.createElement("button");
                    editButton.className = "task-action edit-day";
                    editButton.type = "button";
                    editButton.textContent = "Modificar";
                    editButton.setAttribute("aria-label", "Modificar tarea: " + task.name);
                    editButton.addEventListener("click", function () {
                        editingTaskId = task.id;
                        renderTasks();
                    });

                    const removeButton = document.createElement("button");
                    removeButton.className = "task-action remove-task";
                    removeButton.type = "button";
                    removeButton.textContent = "Quitar";
                    removeButton.setAttribute("aria-label", "Quitar tarea: " + task.name);
                    removeButton.addEventListener("click", function () {
                        removeTask(task.id);
                    });
                    actions.append(editButton, removeButton);
                    item.append(name, actions);
                    list.appendChild(item);
                });
                card.appendChild(list);
            }
            weekGrid.appendChild(card);
        });

        const total = tasks.length;
        taskCount.textContent = total === 0
            ? "Aún no has añadido tareas."
            : total + (total === 1 ? " tarea en tu semana." : " tareas en tu semana.");
    }

    function removeTask(taskId) {
        const previousTasks = tasks;
        tasks = tasks.filter(function (task) {
            return task.id !== taskId;
        });
        if (saveTasks()) {
            editingTaskId = null;
            renderTasks();
            showMessage("Tarea eliminada del horario.", false);
        } else {
            tasks = previousTasks;
            renderTasks();
        }
    }

    function updateTask(taskId, day, name) {
        const updatedName = name.trim();
        if (!days.some(function (item) { return item.id === day; })) {
            showMessage("Elige un día válido para continuar.", true);
            return;
        }
        if (updatedName.length === 0) {
            showMessage("Escribe una tarea para continuar.", true);
            return;
        }

        const task = tasks.find(function (item) { return item.id === taskId; });
        if (!task) {
            return;
        }

        const duplicate = tasks.some(function (item) {
            return item.id !== taskId &&
                item.day === day &&
                item.name.toLocaleLowerCase("es") === updatedName.toLocaleLowerCase("es");
        });
        if (duplicate) {
            showMessage("Ya existe esa tarea para el día elegido. Cambia el texto o el día.", true);
            return;
        }

        const previousTasks = tasks;
        tasks = tasks.map(function (item) {
            return item.id === taskId ? { id: item.id, day: day, name: updatedName } : item;
        });
        if (saveTasks()) {
            editingTaskId = null;
            renderTasks();
            showMessage("Tarea modificada.", false);
        } else {
            tasks = previousTasks;
            renderTasks();
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const day = dayInput.value;
        const name = taskInput.value.trim();

        if (!days.some(function (item) { return item.id === day; }) || name.length === 0) {
            showMessage("Elige un día y escribe una tarea para continuar.", true);
            return;
        }

        const duplicate = tasks.some(function (task) {
            return task.day === day && task.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es");
        });
        if (duplicate) {
            showMessage("Esa tarea ya está apuntada para ese día. Elige otro día o una tarea diferente.", true);
            return;
        }

        const previousTasks = tasks;
        tasks = tasks.concat({
            id: window.crypto && typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID()
                : String(Date.now()) + "-" + String(Math.random()).slice(2),
            day: day,
            name: name
        });
        if (!saveTasks()) {
            tasks = previousTasks;
            renderTasks();
            return;
        }

        editingTaskId = null;
        renderTasks();
        form.reset();
        taskInput.focus();
        showMessage("Tarea añadida al horario.", false);
    });

    clearButton.addEventListener("click", function () {
        if (tasks.length === 0) {
            showMessage("El horario ya está vacío.", false);
            return;
        }
        if (!window.confirm("¿Quieres quitar todas las tareas del horario?")) {
            return;
        }

        const previousTasks = tasks;
        tasks = [];
        if (saveTasks()) {
            editingTaskId = null;
            renderTasks();
            showMessage("Horario vaciado.", false);
        } else {
            tasks = previousTasks;
            renderTasks();
        }
    });

    try {
        tasks = readTasks();
    } catch (error) {
        storageAvailable = false;
        showMessage("No se pudo leer el horario guardado. Borra los datos de este sitio o vuelve a intentarlo en otro navegador.", true);
    }
    renderTasks();
    if (storageAvailable && tasks.length > 0) {
        showMessage("Se ha cargado tu horario guardado.", false);
    }
}());
