(() => {
  "use strict";

  const STORAGE_KEY = "task-orbit.tasks.v1";

  const form = document.querySelector("#task-form");
  const taskInput = document.querySelector("#task-input");
  const taskList = document.querySelector("#task-list");
  const taskCount = document.querySelector("#task-count");
  const pendingCount = document.querySelector("#pending-count");
  const clearCompletedButton = document.querySelector("#clear-completed");
  const errorMessage = document.querySelector("#error-message");
  const emptyStateTemplate = document.querySelector("#empty-state-template");

  if (
    !form ||
    !taskInput ||
    !taskList ||
    !taskCount ||
    !pendingCount ||
    !clearCompletedButton ||
    !errorMessage ||
    !emptyStateTemplate
  ) {
    return;
  }

  const state = {
    tasks: loadTasks(),
  };

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((task) => task && typeof task === "object")
        .map((task) => ({
          id: typeof task.id === "string" ? task.id : generateId(),
          text: sanitizeText(task.text),
          completed: Boolean(task.completed),
        }))
        .filter((task) => task.text.length > 0);
    } catch (error) {
      console.error("Failed to load tasks from storage.", error);
      return [];
    }
  }

  function persistTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }

  function sanitizeText(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setError(message) {
    errorMessage.textContent = message;
  }

  function clearError() {
    setError("");
  }

  function createTask(text) {
    return {
      id: generateId(),
      text,
      completed: false,
    };
  }

  function addTask(rawText) {
    const text = sanitizeText(rawText);

    if (!text) {
      setError("Please enter a task before adding.");
      return false;
    }

    state.tasks.unshift(createTask(text));
    persistTasks();
    render();
    clearError();
    return true;
  }

  function toggleTask(taskId) {
    state.tasks = state.tasks.map((task) => {
      if (task.id !== taskId) return task;
      return { ...task, completed: !task.completed };
    });
    persistTasks();
    render();
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    persistTasks();
    render();
  }

  function clearCompleted() {
    const beforeCount = state.tasks.length;
    state.tasks = state.tasks.filter((task) => !task.completed);

    if (state.tasks.length !== beforeCount) {
      persistTasks();
      render();
    }
  }

  function updateStats() {
    const total = state.tasks.length;
    const pending = state.tasks.filter((task) => !task.completed).length;
    const completedExists = total > pending;

    taskCount.textContent = `${total} task${total === 1 ? "" : "s"}`;
    pendingCount.textContent = `${pending} pending`;
    clearCompletedButton.disabled = !completedExists;
  }

  function renderTask(task) {
    const listItem = document.createElement("li");
    listItem.className = "task-item";
    listItem.dataset.id = task.id;

    if (task.completed) {
      listItem.classList.add("is-complete");
    }

    const taskMain = document.createElement("label");
    taskMain.className = "task-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    taskMain.append(checkbox, text);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "task-delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete task: ${task.text}`);

    listItem.append(taskMain, deleteButton);
    return listItem;
  }

  function renderEmptyState() {
    const clone = emptyStateTemplate.content.firstElementChild?.cloneNode(true);
    if (clone) {
      taskList.append(clone);
    }
  }

  function render() {
    taskList.innerHTML = "";

    if (state.tasks.length === 0) {
      renderEmptyState();
      updateStats();
      return;
    }

    const fragment = document.createDocumentFragment();
    state.tasks.forEach((task) => {
      fragment.append(renderTask(task));
    });
    taskList.append(fragment);

    updateStats();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const didAdd = addTask(taskInput.value);

    if (didAdd) {
      form.reset();
      taskInput.focus();
    }
  });

  taskList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains("task-check")) {
      return;
    }

    const taskItem = target.closest(".task-item");
    const taskId = taskItem?.dataset.id;

    if (taskId) {
      toggleTask(taskId);
    }
  });

  taskList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("task-delete")) {
      return;
    }

    const taskItem = target.closest(".task-item");
    const taskId = taskItem?.dataset.id;

    if (taskId) {
      deleteTask(taskId);
      clearError();
    }
  });

  clearCompletedButton.addEventListener("click", () => {
    clearCompleted();
    clearError();
  });

  taskInput.addEventListener("input", () => {
    if (sanitizeText(taskInput.value)) {
      clearError();
    }
  });

  render();
  taskInput.focus();
})();
