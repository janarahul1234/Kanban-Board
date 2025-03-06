const boardColumns = document.getElementById("board-columns");
const modelContainer = document.getElementById("model-container");
const addBoardButton = document.getElementById("add-board-button");

const boardTemplate = document.getElementById("board-template");
const taskTemplate = document.getElementById("task-template");
const boardModelTemplate = document.getElementById("board-model-template");
const taskModelTemplate = document.getElementById("task-model-template");

const Storage = (() => {
  const STORAGE_KEY = "boards";

  const DUMMY_DATA = [
    {
      id: 1001,
      title: "To Do",
      description: "Tasks that need to be started",
      color: "green",
      tasks: [
        { id: 2001, task: "Write project documentation" },
        { id: 2002, task: "Plan the database schema" },
      ],
    },
    {
      id: 1002,
      title: "Doing",
      description: "Tasks currently in progress",
      color: "yellow",
      tasks: [
        { id: 2003, task: "Develop user authentication" },
        { id: 2004, task: "Design the homepage UI" },
        { id: 2005, task: "Integrate API endpoints" },
      ],
    },
    {
      id: 1003,
      title: "Done",
      description: "Tasks awaiting approval or blocked",
      color: "orange",
      tasks: [
        { id: 2006, task: "Fix UI bugs in the dashboard" },
        { id: 2007, task: "Review database queries" },
      ],
    },
  ];

  const save = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const load = () => {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data || data.length === 0) {
      save(DUMMY_DATA);
      return DUMMY_DATA;
    }
    return data;
  };

  return { save, load };
})();

const boards = Storage.load();
const saveBoards = () => Storage.save(boards);

const generateId = () => 1000 + Math.floor(Math.random() * 9000);

const insertBoard = (values) => {
  boards.push(values);
  saveBoards();
};

const selectBoard = (boardId) => {
  const board = boards.find(({ id }) => id === boardId);
  return { ...board };
};

const updateBoard = (boardId, { title, description, color }) => {
  const board = boards.find(({ id }) => id === boardId);
  if (board) {
    board.title = title ?? board.title;
    board.description = description ?? board.description;
    board.color = color ?? board.color;
  }
  saveBoards();
};

const deleteBoard = (boardId) => {
  const index = boards.findIndex(({ id }) => id === boardId);
  if (index !== -1) boards.splice(index, 1);
  saveBoards();
};

const insertTask = (boardId, values) => {
  const board = boards.find(({ id }) => id === boardId);
  board?.tasks.push(values);
  saveBoards();
};

const selectTask = (taskId) => {
  const task = boards
    .flatMap(({ tasks }) => tasks)
    .find((t) => t.id === taskId);
  return { ...task };
};

const updateTask = (taskId, task) => {
  const updateTask = boards
    .flatMap(({ tasks }) => tasks)
    .find((t) => t.id === taskId);
  if (updateTask) updateTask.task = task ?? updateTask.task;
  saveBoards();
};

const deleteTask = (taskId) => {
  for (const board of boards) {
    const index = board.tasks.findIndex(({ id }) => id === taskId);
    if (index !== -1) {
      board.tasks.splice(index, 1);
      saveBoards();
      return;
    }
  }
};

const swapTask = (boardId, taskId) => {
  const task = selectTask(taskId);
  deleteTask(taskId);
  insertTask(boardId, task);
  saveBoards();
};

const cloneTemplate = (template) => template.content.cloneNode(true);
const getElement = (parent, selector) => parent.querySelector(selector);

const createForm = ({
  type,
  title,
  defaultValues = {},
  onSubmit = () => {},
}) => {
  if (type === "") return;

  const fragment = document.createDocumentFragment();
  let modelElement;
  let formData = {};

  if (type === "task") {
    const { task } = defaultValues;
    modelElement = cloneTemplate(taskModelTemplate);
    getElement(modelElement, "#task-name").value = task ?? "";
  }

  if (type === "board") {
    const { title, description, color } = defaultValues;
    modelElement = cloneTemplate(boardModelTemplate);

    getElement(modelElement, "#title").value = title ?? "";
    getElement(modelElement, "#description").value = description ?? "";

    modelElement
      .querySelectorAll("input[name='color']")
      .forEach((inputColor) => {
        if (!color) return;
        if (inputColor.value === color) {
          inputColor.setAttribute("checked", true);
        }
      });
  }

  const modelTitle = getElement(modelElement, "#title-modal");
  const modelForm = getElement(modelElement, "#model-form");
  const closeButton = getElement(modelElement, "#close-model-button");
  const cancelButton = getElement(modelElement, "#cancel-modal-button");

  modelTitle.textContent = title;

  const removeModel = () => {
    modelContainer.removeChild(modelContainer.firstElementChild);
  };

  modelForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;

    if (type === "task") {
      formData.task = getElement(form, "#task-name").value.trim();
      if (!formData?.task) return;
    }

    if (type === "board") {
      formData.title = getElement(form, "#title").value.trim();
      formData.description = getElement(form, "#description").value.trim();
      formData.color = getElement(form, "input[name='color']:checked").value;

      if (!formData?.title || !formData?.description) return;
    }

    onSubmit(formData);
    removeModel();
  });

  closeButton.addEventListener("click", removeModel);
  cancelButton.addEventListener("click", removeModel);

  fragment.appendChild(modelElement);
  modelContainer.appendChild(fragment);
};

const getBoardElement = ({ id, title, description, color, tasks = [] }) => {
  const boardElement = cloneTemplate(boardTemplate);

  const boardColumn = getElement(boardElement, "#board-column");
  const boardTitle = getElement(boardElement, "#board-title");
  const boardDescription = getElement(boardElement, "#board-description");
  const taskCount = getElement(boardElement, "#task-count");
  const boardTasks = getElement(boardElement, "#board-tasks");
  const addTaskButton = getElement(boardElement, "#add-task-button");
  const editButton = getElement(boardElement, "#edit-board-button");
  const removeButton = getElement(boardElement, "#remove-board-button");

  const appendTask = (id, title, task) => {
    boardTasks.appendChild(
      getTaskElement({
        id,
        header: title,
        task,
        onEdit: handleEditTask,
        onRemove: handleRemoveTask,
        onDragEnd: handleDragEnd,
      })
    );
  };

  const handleAddTask = () => {
    createForm({
      type: "task",
      title: "Add task",
      onSubmit: ({ task }) => {
        const data = { id: generateId(), task };

        taskCount.textContent = Number(taskCount.textContent) + 1;
        appendTask(data.id, title, task);
        insertTask(id, data);
      },
    });
  };

  const handleEditTask = (e, id) => {
    const taskText = getElement(e, "#task-content");
    createForm({
      type: "task",
      title: "Edit task",
      onSubmit: ({ task }) => {
        taskText.textContent = task;
        updateTask(id, task);
      },
      defaultValues: { task: taskText.textContent },
    });
  };

  const handleRemoveTask = (e, id) => {
    e.remove();
    deleteTask(id);
    updateTaskCount();
  };

  const handleEditBoard = (e) => {
    const title = getElement(e, "#board-title");
    const description = getElement(e, "#board-description");

    createForm({
      type: "board",
      title: "Edit board",
      onSubmit: (values) => {
        title.textContent = values.title;
        description.textContent = values.description;
        e.dataset.color = values.color;
        updateBoard(id, values);
      },
      defaultValues: {
        title: title.textContent,
        description: description.textContent,
        color: e.dataset.color,
      },
    });
  };

  const handleRemoveBoard = (e) => {
    e.remove();
    deleteBoard(id);
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const dragTask = document.querySelector(".grabbing");
    getElement(dragTask, "#task-header").textContent = boardTitle.textContent;

    boardTasks.appendChild(dragTask);
    swapTask(id, Number(dragTask.id));
  };

  const handleDragEnd = () => updateTaskCount();

  addTaskButton.addEventListener("click", handleAddTask);
  editButton.addEventListener("click", () => handleEditBoard(boardColumn));
  removeButton.addEventListener("click", () => handleRemoveBoard(boardColumn));
  boardColumn.addEventListener("dragover", (e) => e.preventDefault());
  boardColumn.addEventListener("drop", handleDrop);

  boardColumn.id = id;
  boardColumn.setAttribute("data-color", color);
  boardTitle.textContent = title;
  boardDescription.textContent = description;
  taskCount.textContent = tasks.length;
  tasks.forEach(({ id, task }) => appendTask(id, title, task));
  return boardElement;
};

const getTaskElement = ({ id, header, task, onEdit, onRemove, onDragEnd }) => {
  const taskElement = cloneTemplate(taskTemplate);

  const boardTask = getElement(taskElement, "#board-task");
  const taskHeader = getElement(taskElement, "#task-header");
  const taskContent = getElement(taskElement, "#task-content");
  const editButton = getElement(taskElement, "#edit-task-button");
  const removeButton = getElement(taskElement, "#remove-task-button");

  editButton.addEventListener("click", () => onEdit(boardTask, id));
  removeButton.addEventListener("click", () => onRemove(boardTask, id));

  boardTask.addEventListener("dragstart", (e) => {
    const original = boardTask;
    const dragImage = original.cloneNode(true);

    boardTask.classList.add("grabbing");
    e.dataTransfer.effectAllowed = "move";

    dragImage.style.width = "200px";
    dragImage.style.height = "auto";
    dragImage.style.opacity = "0.8";
    dragImage.style.border = "2px solid #3b82f6";

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 100, 35);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  });

  boardTask.addEventListener("dragend", () => {
    boardTask.classList.remove("grabbing");
    onDragEnd();
  });

  boardTask.id = id;
  taskHeader.textContent = header;
  taskContent.textContent = task;
  return taskElement;
};

const renderBoards = () => {
  const fragment = document.createDocumentFragment();
  boards.forEach((board) => fragment.appendChild(getBoardElement(board)));
  boardColumns.appendChild(fragment);
};

const updateTaskCount = () => {
  [...boardColumns.children].forEach((board) => {
    const { tasks } = selectBoard(Number(board.id));
    getElement(board, "#task-count").textContent = tasks.length;
  });
};

addBoardButton.addEventListener("click", () => {
  createForm({
    type: "board",
    title: "Add board",
    onSubmit: (values) => {
      const board = { id: generateId(), ...values, tasks: [] };

      const fragment = document.createDocumentFragment();
      fragment.appendChild(getBoardElement(board));
      boardColumns.appendChild(fragment);
      insertBoard(board);
    },
  });
});

renderBoards();
