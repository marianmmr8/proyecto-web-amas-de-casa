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
                    const removeButton = document.createElement("button");

                    name.textContent = task.name;
                    removeButton.className = "remove-task";
                    removeButton.type = "button";
                    removeButton.textContent = "Quitar";
                    removeButton.setAttribute("aria-label", "Quitar tarea: " + task.name);
                    removeButton.addEventListener("click", function () {
                        removeTask(task.id);
                    });
                    item.append(name, removeButton);
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
            renderTasks();
            showMessage("Tarea eliminada del horario.", false);
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
