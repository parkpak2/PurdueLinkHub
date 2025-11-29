document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const TASK_STORAGE_KEY = 'todoTasks_v3'; 
    let taskData = []; 
    let lastClickedId = null;

    // --- DOM Elements ---
    const todoOverlay = document.getElementById('todoOverlay');
    const closeBtn = document.getElementById('closeTodo');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addSubtaskBtn = document.getElementById('addSubtaskBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const taskList = document.getElementById('todoList');
    const colorBtn = document.getElementById('colorBtn');
    const colorModal = document.getElementById('colorModal');
    const closeColorModalBtn = document.getElementById('closeColorModalBtn');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const dateBtn = document.getElementById('dateBtn');
    const dateModal = document.getElementById('dateModal');
    const modalDateInput = document.getElementById('modalDateInput');
    const saveDateBtn = document.getElementById('saveDateBtn');
    const clearDateBtn = document.getElementById('clearDateBtn');
    const closeDateModalBtn = document.getElementById('closeDateModalBtn');
    const linkBtn = document.getElementById('addLinkBtn'); 
    const linkModal = document.getElementById('linkModal');
    const modalLinkInput = document.getElementById('modalLinkInput');
    const saveLinkBtn = document.getElementById('saveLinkBtn');
    const clearLinkBtn = document.getElementById('clearLinkBtn');
    const closeLinkModalBtn = document.getElementById('closeLinkModalBtn');
    
    // ==========================================
    // 1. Data & Storage
    // ==========================================

    function loadTasks() {
        const stored = localStorage.getItem(TASK_STORAGE_KEY);
        if (stored) {
            taskData = JSON.parse(stored);
        } else {
            taskData = [
                { 
                    id: Date.now(), text: 'Welcome Task', dueDate: '', completed: false, 
                    subtasks: [] 
                }
            ];
        }
        renderTasks();
    }

    function saveTasks() {
        localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskData));
        updateTaskCount();
    }

    // ==========================================
    // 2. Rendering
    // ==========================================

    function renderTasks() {
        if (!taskList) return;
        taskList.innerHTML = ''; 

        taskData.forEach(task => {
            taskList.appendChild(createTaskDOM(task, 0));
        });

        updateTaskCount();
        
        if (lastClickedId) {
            const el = document.querySelector(`.todo-item[data-id="${lastClickedId}"]`);
            if (el) el.classList.add('selected');
        }
    }

    // Helper: Format Date nicely (e.g. "Nov 28, 2:30 PM")
    function formatDisplayDate(dateString) {
        if (!dateString) return 'No Date';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit'
        });
    }

    // --- HELPER: Calculate Deadline Status ---
    function getDeadlineStatus(dateString) {
        if (!dateString) return null;
        
        const taskDate = new Date(dateString);
        const now = new Date();

        // 1. Check for OVERDUE
        // If the task time is in the past, it is overdue.
        if (taskDate < now) {
            return { text: "Overdue", className: "overdue" };
        }

        // 2. Check for TODAY
        // If it's not overdue, but the Year, Month, and Date are the same as now.
        const isSameDay = taskDate.getDate() === now.getDate() &&
                          taskDate.getMonth() === now.getMonth() &&
                          taskDate.getFullYear() === now.getFullYear();

        if (isSameDay) {
            // Format time: "2:30 PM"
            const timeStr = taskDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
            return { text: `Today, ${timeStr}`, className: "today" };
        }

        // 3. FUTURE DATE (Standard)
        // Format: "Nov 29, 2:30 PM"
        const display = taskDate.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
        return { text: display, className: "" }; // No special class
    }

    // Recursive function to build DOM
    function createTaskDOM(task, level) {
        const wrapper = document.createDocumentFragment();

        const itemDiv = document.createElement('div');
        const colorClass = task.colorClass || ''; 
        itemDiv.className = `todo-item level-${level} ${colorClass}`;
        itemDiv.dataset.id = task.id;
        
        const checked = task.completed ? 'checked' : '';
        const textStyle = task.completed ? 'style="text-decoration: line-through; opacity: 0.6;"' : '';
        
        // 1. Date Logic
        let dateHtml = '';
        if (task.dueDate) {
            const status = getDeadlineStatus(task.dueDate);
            dateHtml = `<span class="task-date-badge ${status.className}">📅 ${status.text}</span>`;
        }

        // 2. Link Logic (NEW)
        let linkHtml = '';
        if (task.link) {
            // Prevent the row selection when clicking the link
            // We use onmousedown to stop propagation immediately
            linkHtml = `<a href="${task.link}" target="_blank" class="task-link-icon" onmousedown="event.stopPropagation()">🔗</a>`;
        }

        itemDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${checked}>
            
            <div class="todo-text-group">
                <div class="task-text" contenteditable="true" ${textStyle}>${task.text}</div>
                
                <div style="display: flex; align-items: center; margin-left: auto;">
                    ${linkHtml}
                    ${dateHtml}
                </div>
            </div>
        `;

        wrapper.appendChild(itemDiv);

        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(sub => {
                wrapper.appendChild(createTaskDOM(sub, level + 1));
            });
        }

        return wrapper;
    }

    // ==========================================
    // 3. Helper: Find Node
    // ==========================================
    function findNodeRecursive(id, currentArray, currentDepth) {
        for (let i = 0; i < currentArray.length; i++) {
            const task = currentArray[i];
            if (task.id.toString() === id.toString()) {
                return { node: task, parentArray: currentArray, index: i, depth: currentDepth };
            }
            if (task.subtasks && task.subtasks.length > 0) {
                const result = findNodeRecursive(id, task.subtasks, currentDepth + 1);
                if (result) return result;
            }
        }
        return null;
    }

    // ==========================================
    // 4. UI Actions
    // ==========================================

    // --- ADD TASK ---
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const newTask = { id: Date.now(), text: '', dueDate: '', completed: false, subtasks: [] };
            
            if (lastClickedId) {
                const found = findNodeRecursive(lastClickedId, taskData, 0);
                if (found) {
                    found.parentArray.splice(found.index + 1, 0, newTask);
                } else {
                    taskData.push(newTask);
                }
            } else {
                taskData.push(newTask);
            }

            saveTasks();
            renderTasks();
            focusTask(newTask.id);
        });
    }

    // --- ADD SUBTASK ---
    if (addSubtaskBtn) {
        addSubtaskBtn.addEventListener('click', () => {
            if (!lastClickedId) {
                alert("Please select a task to add a subtask to.");
                return;
            }
            const found = findNodeRecursive(lastClickedId, taskData, 0);
            if (found) {
                if (found.depth >= 2) {
                    alert("Maximum nesting level reached.");
                    return;
                }
                const newSub = { id: Date.now(), text: '', completed: false, subtasks: [] };
                if (!found.node.subtasks) found.node.subtasks = [];
                found.node.subtasks.push(newSub);
                found.node.completed = false; 

                saveTasks();
                renderTasks();
                focusTask(newSub.id);
            }
        });
    }

    // --- COLOR MODAL LOGIC ---

    // 1. Open Modal
    if (colorBtn) {
        colorBtn.addEventListener('click', () => {
            if (!lastClickedId) {
                alert("Please select a task to color.");
                return;
            }
            colorModal.style.display = 'flex';
        });
    }

    // 2. Click on a Color Swatch
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            if (!lastClickedId) return;

            const selectedColor = e.target.getAttribute('data-color'); // e.g., "color-red"
            
            const found = findNodeRecursive(lastClickedId, taskData, 0);
            if (found) {
                // Remove old color classes first (optional, but cleaner)
                // We'll just overwrite the property, the render function handles the class list
                
                // Save the class name (or empty string for reset)
                found.node.colorClass = selectedColor; 
                
                saveTasks();
                renderTasks();
            }
            colorModal.style.display = 'none';
        });
    });

    // 3. Close Modal
    if (closeColorModalBtn) {
        closeColorModalBtn.addEventListener('click', () => {
            colorModal.style.display = 'none';
        });
    }

    // Close on background click
    window.addEventListener('click', (e) => {
        if (e.target === colorModal) colorModal.style.display = 'none';
    });

    // --- LINK MODAL LOGIC ---

    // 1. Open Link Modal
    if (linkBtn) {
        linkBtn.addEventListener('click', () => {
            if (!lastClickedId) {
                alert("Please select a task to add a link.");
                return;
            }
            
            const found = findNodeRecursive(lastClickedId, taskData, 0);
            if (found) {
                // Pre-fill input if a link already exists
                modalLinkInput.value = found.node.link || ''; 
                linkModal.style.display = 'flex';
                modalLinkInput.focus();
            }
        });
    }

    // 2. Save Link
    if (saveLinkBtn) {
        saveLinkBtn.addEventListener('click', () => {
            if (lastClickedId) {
                const found = findNodeRecursive(lastClickedId, taskData, 0);
                if (found) {
                    let url = modalLinkInput.value.trim();
                    if (url) {
                        // Basic check to ensure it starts with http/https
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'https://' + url;
                        }
                        found.node.link = url;
                    } else {
                        delete found.node.link; // Remove property if empty
                    }
                    saveTasks();
                    renderTasks();
                }
            }
            linkModal.style.display = 'none';
        });
    }

    // 3. Remove Link
    if (clearLinkBtn) {
        clearLinkBtn.addEventListener('click', () => {
            if (lastClickedId) {
                const found = findNodeRecursive(lastClickedId, taskData, 0);
                if (found) {
                    delete found.node.link; // Wipe it
                    saveTasks();
                    renderTasks();
                }
            }
            linkModal.style.display = 'none';
        });
    }

    // 4. Close Modal
    if (closeLinkModalBtn) {
        closeLinkModalBtn.addEventListener('click', () => {
            linkModal.style.display = 'none';
        });
    }

    // Close on background click
    window.addEventListener('click', (e) => {
        if (e.target === linkModal) linkModal.style.display = 'none';
    });

    // --- DATE MODAL LOGIC ---

    // 1. Open Modal when "Date" button is clicked
    if (dateBtn) {
        dateBtn.addEventListener('click', () => {
            if (!lastClickedId) {
                alert("Please select a task to set a date.");
                return;
            }
            
            // Find the task data
            const found = findNodeRecursive(lastClickedId, taskData, 0);
            if (found) {
                // Pre-fill the input with the existing date (if any)
                modalDateInput.value = found.node.dueDate || ''; 
                dateModal.style.display = 'flex'; // Show the modal
                modalDateInput.focus();
            }
        });
    }

    // 2. Save Button (Inside Modal)
    if (saveDateBtn) {
        saveDateBtn.addEventListener('click', () => {
            if (lastClickedId) {
                const found = findNodeRecursive(lastClickedId, taskData, 0);
                if (found) {
                    found.node.dueDate = modalDateInput.value; // Update data
                    saveTasks();   // Save to local storage
                    renderTasks(); // Re-draw list to show the new badge
                }
            }
            dateModal.style.display = 'none'; // Close modal
        });
    }

    // 3. Remove Button (Inside Modal)
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            if (lastClickedId) {
                const found = findNodeRecursive(lastClickedId, taskData, 0);
                if (found) {
                    found.node.dueDate = ''; // Clear data
                    saveTasks();
                    renderTasks();
                }
            }
            dateModal.style.display = 'none';
        });
    }

    // 4. Cancel/Close Button
    if (closeDateModalBtn) {
        closeDateModalBtn.addEventListener('click', () => {
            dateModal.style.display = 'none';
        });
    }
    
    // Close if clicking the dark background
    window.addEventListener('click', (e) => {
        if (e.target === dateModal) dateModal.style.display = 'none';
    });
    
    // --- DELETE ---
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.task-checkbox:checked');
            // 1. Start with the explicit selections
            const idsToDelete = new Set();
            checkedBoxes.forEach(box => idsToDelete.add(box.closest('.todo-item').dataset.id));
            if (lastClickedId) idsToDelete.add(lastClickedId);

            if (idsToDelete.size === 0) return;

            // 2. [NEW] Expand the list: If a parent is deleted, all its children must be in the list too.
            // We need this so our "Next Item" logic knows to skip the children.
            function collectChildrenIds(arr) {
                arr.forEach(task => {
                    // If the parent is marked, mark the children
                    if (idsToDelete.has(task.id.toString())) {
                        if (task.subtasks) {
                            // Helper to recursively add all descendants
                            const addAllDescendants = (subs) => {
                                subs.forEach(sub => {
                                    idsToDelete.add(sub.id.toString());
                                    if (sub.subtasks) addAllDescendants(sub.subtasks);
                                });
                            };
                            addAllDescendants(task.subtasks);
                        }
                    } else {
                        // Parent not marked, but check deeper levels
                        if (task.subtasks) collectChildrenIds(task.subtasks);
                    }
                });
            }
            collectChildrenIds(taskData);

            // 3. [NEW] Calculate Next Selection
            // We use a LOOP now. If the next neighbor is also in "idsToDelete", we skip it.
            let nextIdToSelect = null;
            
            if (lastClickedId && idsToDelete.has(lastClickedId.toString())) {
                const currentEl = document.querySelector(`.todo-item[data-id="${lastClickedId}"]`);
                if (currentEl) {
                    
                    // A. Try going DOWN
                    let candidate = currentEl.nextElementSibling;
                    while (candidate && candidate.classList.contains('todo-item')) {
                        // If this candidate is NOT in the delete list, it's our winner
                        if (!idsToDelete.has(candidate.dataset.id)) {
                            nextIdToSelect = candidate.dataset.id;
                            break;
                        }
                        // Otherwise, keep skipping down
                        candidate = candidate.nextElementSibling;
                    }

                    // B. If we couldn't go down, Try going UP
                    if (!nextIdToSelect) {
                        candidate = currentEl.previousElementSibling;
                        while (candidate && candidate.classList.contains('todo-item')) {
                            if (!idsToDelete.has(candidate.dataset.id)) {
                                nextIdToSelect = candidate.dataset.id;
                                break;
                            }
                            candidate = candidate.previousElementSibling;
                        }
                    }
                }
            }

            // 4. Perform the actual deletion
            function deleteRecursive(currentArray) {
                for (let i = currentArray.length - 1; i >= 0; i--) {
                    const task = currentArray[i];
                    if (idsToDelete.has(task.id.toString())) {
                        currentArray.splice(i, 1);
                    } else if (task.subtasks && task.subtasks.length > 0) {
                        deleteRecursive(task.subtasks);
                    }
                }
            }

            deleteRecursive(taskData);
            
            // 5. Select the new survivor
            lastClickedId = nextIdToSelect; 
            
            saveTasks();
            renderTasks();
        });
    }

    // --- LISTENERS ---
    if (taskList) {
        // 1. CLICK (Select)
        taskList.addEventListener('click', (e) => {
            // Don't trigger select if clicking inputs
            if (e.target.classList.contains('task-checkbox') || 
                e.target.classList.contains('task-date-input')) return;

            const item = e.target.closest('.todo-item');
            if (!item) return;

            if (item.classList.contains('selected')) {
                document.querySelectorAll('.todo-item').forEach(t => t.classList.remove('selected'));
                lastClickedId = null;
            } else {
                document.querySelectorAll('.todo-item').forEach(t => t.classList.remove('selected'));
                item.classList.add('selected');
                lastClickedId = item.dataset.id;
            }
        });

        // 2. INPUT (Text Edit) & CHANGE (Date/Checkbox)
        // We use 'input' for text to save while typing
        taskList.addEventListener('input', (e) => {
            const item = e.target.closest('.todo-item');
            if (!item) return;
            const id = item.dataset.id;
            
            const found = findNodeRecursive(id, taskData, 0);
            if (found && e.target.classList.contains('task-text')) {
                found.node.text = e.target.textContent;
                saveTasks();
            }
        });

        // 3. KEYBOARD NAVIGATION 
        document.addEventListener('keydown', (e) => {
            if (!lastClickedId) return;

            const active = document.activeElement;
            const isEditing = active.isContentEditable || active.tagName === 'INPUT';

            // IF EDITING: Allow Left/Right/Backspace to handle text normally.
            // Only interrupt if the user presses Up or Down.
            if (isEditing && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

            const currentEl = document.querySelector(`.todo-item[data-id="${lastClickedId}"]`);
            if (!currentEl) return;

            // --- UP / DOWN ARROWS ---
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault(); 
                
                const targetEl = e.key === 'ArrowUp' 
                    ? currentEl.previousElementSibling 
                    : currentEl.nextElementSibling;

                if (targetEl && targetEl.classList.contains('todo-item')) {
                    // 1. Update Selection Visuals
                    document.querySelectorAll('.todo-item').forEach(t => t.classList.remove('selected'));
                    targetEl.classList.add('selected');
                    targetEl.scrollIntoView({ block: 'nearest' });
                    lastClickedId = targetEl.dataset.id;

                    // 2. If we were typing, focus the NEW task's text immediately
                    // This keeps the "flow" going so you can type, hit down, and keep typing.
                    if (isEditing) {
                        const textDiv = targetEl.querySelector('.task-text');
                        if (textDiv) {
                            textDiv.focus();
                            // Optional: Move cursor to end of text
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.selectNodeContents(textDiv);
                            range.collapse(false); // false = end, true = start
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }
                }
            } 
            // --- DELETE ---
            else if (e.key === 'Delete' || (e.key === 'Backspace' && !isEditing)) {
                // Only trigger delete button if we are NOT editing text
                if (deleteBtn) deleteBtn.click();
            }
        });

        // We use 'change' for Checkboxes AND Date Inputs
        taskList.addEventListener('change', (e) => {
            const item = e.target.closest('.todo-item');
            if (!item) return;
            const id = item.dataset.id;
            const found = findNodeRecursive(id, taskData, 0);

            if (found) {
                // A. Checkbox Changed
                if (e.target.classList.contains('task-checkbox')) {
                    found.node.completed = e.target.checked;
                    // Visual update
                    const textDiv = item.querySelector('.task-text');
                    if (e.target.checked) {
                        if(textDiv) { textDiv.style.textDecoration = 'line-through'; textDiv.style.opacity = '0.6'; }
                        item.classList.add('selected');
                    } else {
                        if(textDiv) { textDiv.style.textDecoration = 'none'; textDiv.style.opacity = '1'; }
                        item.classList.remove('selected');
                    }
                    saveTasks();
                    updateTaskCount();
                }
                
                // B. Date Input Changed (The Calendar)
                if (e.target.classList.contains('task-date-input')) {
                    found.node.dueDate = e.target.value; // Saves "YYYY-MM-DDTHH:mm"
                    
                    // Update the visible label immediately
                    const displaySpan = item.querySelector('.task-date-display');
                    if (displaySpan) {
                        displaySpan.textContent = formatDisplayDate(e.target.value);
                    }
                    saveTasks();
                }
            }
        });
    }

    // --- UTILS ---
    function focusTask(id) {
        setTimeout(() => {
            const el = document.querySelector(`.todo-item[data-id="${id}"] .task-text`);
            if (el) el.focus();
        }, 50);
    }

    function updateTaskCount() {
        let count = 0;
        function countRecursive(arr) {
            arr.forEach(t => {
                if (!t.completed) count++;
                if (t.subtasks) countRecursive(t.subtasks);
            });
        }
        countRecursive(taskData);

        const linkCard = document.querySelector('.link-card[data-id="todo-list"]');
        const countDisplay = linkCard ? linkCard.querySelector('.task-count') : null;
        if (countDisplay) countDisplay.textContent = count;
    }

    // --- WINDOW MGMT (Overlay + Resize) ---
    window.openTodoModal = function() {
        if (todoOverlay) todoOverlay.style.display = 'flex';
    };

    if (closeBtn) closeBtn.addEventListener('click', () => {
        if (todoOverlay) todoOverlay.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === todoOverlay) todoOverlay.style.display = 'none';
    });

    const todoPanel = document.getElementById('todoCardPanel');
    const todoHeader = document.getElementById('todoHeader');
    const todoResize = document.getElementById('todoResize');

    let isDraggingWin = false; 
    let startX=0, startY=0;

    let isResizingWin = false;
    let startResizeW = 0, startResizeH = 0, startResizeX = 0, startResizeY = 0;
    
    // Drag Header
    if (todoHeader && todoPanel) {
        todoHeader.addEventListener('mousedown', (e) => {
            if(e.target !== todoHeader && e.target.tagName !== 'H2') return; // Only drag on blank header space or title
            isDraggingWin = true;
            const rect = todoPanel.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
        });
    }

    // Resize Handle
    if (todoResize && todoPanel) {
        todoResize.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isResizingWin = true;
            const rect = todoPanel.getBoundingClientRect();
            startResizeW = rect.width;
            startResizeH = rect.height;
            startResizeX = e.clientX;
            startResizeY = e.clientY;
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (isDraggingWin && todoPanel) {
            todoPanel.style.left = (e.clientX - startX) + 'px';
            todoPanel.style.top = (e.clientY - startY) + 'px';
        } else if (isResizingWin && todoPanel) {
            const newWidth = startResizeW + (e.clientX - startResizeX);
            const newHeight = startResizeH + (e.clientY - startResizeY);
            todoPanel.style.width = Math.max(320, newWidth) + 'px';
            todoPanel.style.height = Math.max(200, newHeight) + 'px';
        }
    });

    document.addEventListener('mouseup', () => { 
        isDraggingWin = false; 
        isResizingWin = false;
    });

    loadTasks();
});