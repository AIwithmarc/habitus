/**
 * Goals Module for Habitus
 * Handles goal management functionality with role association
 */
const Goals = (() => {
    'use strict';

    // Private state
    let goals = [];

    // DOM Elements
    const elements = {
        goalInput: null,
        goalRoleSelect: null,
        goalsList: null,
        addGoalBtn: null,
        goalsView: null
    };

    // Color palette for goals (coherente con el diseño actual)
    const GOAL_COLORS = [
        '#4F46E5', // Indigo principal
        '#7C3AED', // Violeta
        '#059669', // Verde esmeralda
        '#DC2626', // Rojo
        '#EA580C', // Naranja
        '#0891B2', // Cian
        '#7C2D12', // Marrón
        '#6B7280', // Gris
        '#EC4899', // Rosa
        '#8B5CF6'  // Púrpura
    ];

    // Initialize goals module
    function init() {
        try {
            console.log('[Goals] Initializing module...');
            
            // Cache DOM elements
            elements.goalInput = document.getElementById('goalInput');
            elements.goalRoleSelect = document.getElementById('goalRoleSelect');
            elements.goalsList = document.getElementById('goalsList');
            elements.addGoalBtn = document.getElementById('addGoalBtn');
            elements.goalsView = document.getElementById('goalsView');

            // Update goal role options
            updateGoalRoleOptions();

            // Load saved goals
            loadGoals();

            // Create default goals for existing roles
            createDefaultGoals();

            // Update goal options in tasks module
            if (window.Tasks && window.Tasks.updateGoalOptions) {
                window.Tasks.updateGoalOptions();
            }

            // Set up event listeners
            setupEventListeners();

            // Render goals view
            renderGoalsView();

            console.log('[Goals] Module initialized successfully');
        } catch (error) {
            console.error('[Goals] Error during initialization:', error);
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add goal button
        elements.addGoalBtn?.addEventListener('click', addGoal);

        // Goal input enter key
        elements.goalInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addGoal();
            }
        });

        // Role select change
        elements.goalRoleSelect?.addEventListener('change', updateGoalInputPlaceholder);
    }

    // Load goals from localStorage
    function loadGoals() {
        const storedGoals = localStorage.getItem('habitus_goals');
        if (storedGoals) {
            goals = JSON.parse(storedGoals);
            updateGoalRoleOptions();
        }
    }

    // Save goals to localStorage
    function saveGoals() {
        localStorage.setItem('habitus_goals', JSON.stringify(goals));
    }

    // Update goal role select options
    function updateGoalRoleOptions() {
        if (!elements.goalRoleSelect) return;

        // Clear current options except placeholder
        elements.goalRoleSelect.innerHTML = '<option value="" disabled selected>Seleccionar Rol</option>';
        
        // Get current roles
        const roles = Roles.getRoles();
        
        // Add role options
        roles.forEach(role => {
            const opt = document.createElement('option');
            opt.value = role;
            opt.textContent = role;
            elements.goalRoleSelect.appendChild(opt);
        });
    }

    // Update goal input placeholder based on selected role
    function updateGoalInputPlaceholder() {
        if (!elements.goalInput || !elements.goalRoleSelect) return;
        
        const selectedRole = elements.goalRoleSelect.value;
        if (selectedRole) {
            elements.goalInput.placeholder = `Meta para el rol: ${selectedRole}`;
        } else {
            elements.goalInput.placeholder = 'Nombre de la meta...';
        }
    }

    // Create default goals for existing roles
    function createDefaultGoals() {
        const roles = Roles.getRoles();
        
        roles.forEach(role => {
            // Check if default goal already exists for this role
            const existingDefault = goals.find(g => g.role === role && g.isDefault);
            
            if (!existingDefault) {
                const defaultGoal = {
                    id: generateSecureId(),
                    name: `Otras Prioridades (${role})`,
                    role: role,
                    description: `Tareas generales y misceláneas para el rol de ${role}`,
                    isDefault: true,
                    color: GOAL_COLORS[0], // Use primary color for default goals
                    createdAt: new Date().toISOString()
                };
                
                goals.push(defaultGoal);
                console.log(`[Goals] Created default goal for role: ${role}`);
            }
        });
        
        saveGoals();
    }

    // Add a new goal
    function addGoal(goalData = null) {
        let finalGoalData;
        
        if (goalData) {
            // Called from external module (e.g., Perhaps)
            finalGoalData = {
                name: goalData.name || '',
                role: goalData.role || '',
                description: goalData.description || '',
                isDefault: false
            };
        } else {
            // Called from UI form
            if (!elements.goalInput || !elements.goalRoleSelect) return;
            
            finalGoalData = {
                name: elements.goalInput.value.trim(),
                role: elements.goalRoleSelect.value,
                description: '',
                isDefault: false
            };
        }

        // Validate goal data
        const validation = HabitusValidator.validateGoal(finalGoalData);
        
        if (!validation.valid) {
            const errorMessage = validation.errors?.[0]?.error || 'Datos de meta inválidos';
            if (window.App && window.App.showNotification) {
                window.App.showNotification(errorMessage, 'error');
            }
            return;
        }

        // Create goal with validated data
        const newGoal = {
            ...validation.data,
            id: generateSecureId(),
            color: goalData?.color || getNextAvailableColor(),
            createdAt: new Date().toISOString()
        };

        goals.push(newGoal);
        saveGoals();
        
        // Only update UI elements if called from form
        if (!goalData) {
            updateGoalRoleOptions();
            // Clear inputs
            elements.goalInput.value = '';
            elements.goalRoleSelect.value = '';
            elements.goalInput.placeholder = 'Nombre de la meta...';
        }
        
        renderGoalsView();
        
        // Update goal options in tasks module
        console.log('[Goals] Attempting to update goal options in Tasks module...');
        
        // Add a small delay to ensure Tasks module is ready
        setTimeout(() => {
            if (window.Tasks && window.Tasks.updateGoalOptions) {
                console.log('[Goals] Tasks module and updateGoalOptions function found, calling...');
                window.Tasks.updateGoalOptions();
                console.log('[Goals] updateGoalOptions called successfully');
            } else {
                console.error('[Goals] Tasks module or updateGoalOptions function not found');
                if (!window.Tasks) {
                    console.error('[Goals] window.Tasks is undefined');
                } else {
                    console.error('[Goals] updateGoalOptions function is undefined');
                }
            }
        }, 100);

        // Show success notification only if called from form
        if (!goalData) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Meta creada correctamente', 'success');
            }
        }
        
        return newGoal; // Return the created goal for external callers
    }

    // Get next available color for new goals
    function getNextAvailableColor() {
        const usedColors = goals.map(g => g.color);
        const availableColors = GOAL_COLORS.filter(color => !usedColors.includes(color));
        
        if (availableColors.length > 0) {
            return availableColors[0];
        }
        
        // If all colors are used, return a random one
        return GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)];
    }

    // Delete a goal (only non-default goals)
    function deleteGoal(goalId) {
        const goalIndex = goals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) return;

        const goal = goals[goalIndex];
        
        // Prevent deletion of default goals
        if (goal.isDefault) {
            App.showNotification('No se pueden eliminar las metas por defecto', 'warning');
            return;
        }

        // Check if goal has associated tasks
        const hasTasks = Tasks.hasTasksForGoal(goalId);
        if (hasTasks) {
            if (!confirm('Esta meta tiene tareas asociadas. ¿Estás seguro de que quieres eliminarla? Las tareas se moverán a la meta por defecto.')) {
                return;
            }
            
            // Move tasks to default goal
            Tasks.moveTasksToDefaultGoal(goalId, goal.role);
        }

        goals.splice(goalIndex, 1);
        saveGoals();
        renderGoalsView();
        
        // Update goal options in tasks module
        if (window.Tasks && window.Tasks.updateGoalOptions) {
            window.Tasks.updateGoalOptions();
        }

        // Show success notification
        App.showNotification('Meta eliminada correctamente', 'success');
    }

    // Edit goal name
    function editGoal(goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (!goal || goal.isDefault) return;

        const newName = prompt('Editar nombre de la meta:', goal.name);
        if (newName && newName.trim() !== goal.name) {
            goal.name = newName.trim();
            saveGoals();
            renderGoalsView();
            
            // Update goal options in tasks module
            if (window.Tasks && window.Tasks.updateGoalOptions) {
                window.Tasks.updateGoalOptions();
            }
            
            App.showNotification('Meta actualizada correctamente', 'success');
        }
    }

    // Change goal color
    function changeGoalColor(goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        // Create color picker
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = goal.color;
        colorPicker.style.position = 'absolute';
        colorPicker.style.left = '-9999px';
        
        colorPicker.addEventListener('change', (e) => {
            goal.color = e.target.value;
            saveGoals();
            renderGoalsView();
            
            // Update goal options in tasks module
            if (window.Tasks && window.Tasks.updateGoalOptions) {
                window.Tasks.updateGoalOptions();
            }
            
            App.showNotification('Color de meta actualizado', 'success');
        });
        
        document.body.appendChild(colorPicker);
        colorPicker.click();
        document.body.removeChild(colorPicker);
    }

    // Render goals view
    function renderGoalsView() {
        if (!elements.goalsView) return;

        elements.goalsView.innerHTML = '';

        if (goals.length === 0) {
            elements.goalsView.innerHTML = '<p class="text-sm text-gray-500">* No hay metas definidas *</p>';
            return;
        }

        // Group goals by role
        const goalsByRole = {};
        goals.forEach(goal => {
            if (!goalsByRole[goal.role]) {
                goalsByRole[goal.role] = [];
            }
            goalsByRole[goal.role].push(goal);
        });

        // Render goals grouped by role
        Object.entries(goalsByRole).forEach(([role, roleGoals]) => {
            const roleSection = document.createElement('div');
            roleSection.className = 'mb-4';
            
            const roleHeader = document.createElement('h3');
            roleHeader.className = 'text-lg font-semibold text-gray-700 mb-3 flex items-center';
            roleHeader.innerHTML = `
                <span class="mr-2">🎭</span>
                ${role}
            `;
            
            // Add drop zone attributes to role section
            roleSection.dataset.role = role;
            roleSection.addEventListener('dragover', handleDragOver);
            roleSection.addEventListener('drop', handleDrop);
            
            roleSection.appendChild(roleHeader);

            roleGoals.forEach(goal => {
                const goalItem = document.createElement('div');
                goalItem.className = 'flex items-center justify-between bg-white p-3 rounded-lg shadow-sm mb-2 border-l-4 cursor-move';
                goalItem.style.borderLeftColor = goal.color;
                
                // Add drag and drop attributes (only for non-default goals)
                if (!goal.isDefault) {
                    goalItem.draggable = true;
                    goalItem.dataset.goalId = goal.id;
                    goalItem.dataset.currentRole = goal.role;
                    goalItem.dataset.goalName = goal.name;
                    
                    // Add drag event listeners
                    goalItem.addEventListener('dragstart', handleDragStart);
                    goalItem.addEventListener('dragend', handleDragEnd);
                }
                
                const goalInfo = document.createElement('div');
                goalInfo.className = 'flex-1';
                
                const goalName = document.createElement('div');
                goalName.className = 'font-medium text-gray-800';
                goalName.textContent = goal.name;
                
                const goalMeta = document.createElement('div');
                goalMeta.className = 'text-xs text-gray-500 mt-1';
                goalMeta.textContent = goal.isDefault ? 'Meta por defecto' : 'Meta personalizada';
                
                goalInfo.appendChild(goalName);
                goalInfo.appendChild(goalMeta);
                
                const goalActions = document.createElement('div');
                goalActions.className = 'flex items-center gap-2';
                
                // Color picker button (for all goals)
                const colorBtn = document.createElement('button');
                colorBtn.className = 'p-1 rounded hover:bg-gray-100 transition-colors';
                colorBtn.innerHTML = '🎨';
                colorBtn.title = 'Cambiar color';
                colorBtn.onclick = () => changeGoalColor(goal.id);
                
                goalActions.appendChild(colorBtn);
                
                // Edit button (only for non-default goals)
                if (!goal.isDefault) {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'p-1 rounded hover:bg-gray-100 transition-colors text-blue-600';
                    editBtn.innerHTML = '✏️';
                    editBtn.title = 'Editar meta';
                    editBtn.onclick = () => editGoal(goal.id);
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'p-1 rounded hover:bg-gray-100 transition-colors text-red-600';
                    deleteBtn.innerHTML = '🗑️';
                    deleteBtn.title = 'Eliminar meta';
                    deleteBtn.onclick = () => deleteGoal(goal.id);
                    
                    goalActions.appendChild(editBtn);
                    goalActions.appendChild(deleteBtn);
                }
                
                goalItem.appendChild(goalInfo);
                goalItem.appendChild(goalActions);
                roleSection.appendChild(goalItem);
            });
            
            elements.goalsView.appendChild(roleSection);
        });
    }

    // Get all goals
    function getGoals() {
        return [...goals];
    }

    // Get goals for a specific role
    function getGoalsForRole(role) {
        return goals.filter(g => g.role === role);
    }

    // Get goal by ID
    function getGoalById(goalId) {
        return goals.find(g => g.id === goalId);
    }

    // Get default goal for a role
    function getDefaultGoalForRole(role) {
        console.log('[Goals] getDefaultGoalForRole called for role:', role);
        console.log('[Goals] Available goals:', goals);
        
        const defaultGoal = goals.find(g => g.role === role && g.isDefault);
        console.log('[Goals] Default goal found:', defaultGoal);
        
        return defaultGoal;
    }

    // Check if role has goals
    function hasGoalsForRole(role) {
        return goals.some(g => g.role === role);
    }

    // Update goals when roles change
    function onRolesChanged() {
        updateGoalRoleOptions();
        createDefaultGoals();
        renderGoalsView();
        
        // Update goal options in tasks module
        if (window.Tasks && window.Tasks.updateGoalOptions) {
            window.Tasks.updateGoalOptions();
        }
    }

    // Helper function to generate secure IDs
    function generateSecureId() {
        return 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Drag and Drop handlers
    function handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.goalId);
        e.target.classList.add('opacity-50');
        console.log('[Goals] Drag started for goal:', e.target.dataset.goalName);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        console.log('[Goals] Drag ended for goal:', e.target.dataset.goalName);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Add visual feedback
        const roleSection = e.currentTarget;
        if (!roleSection.classList.contains('bg-blue-50')) {
            roleSection.classList.add('bg-blue-50', 'border-2', 'border-blue-300', 'rounded-lg');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        
        const goalId = e.dataTransfer.getData('text/plain');
        const newRole = e.currentTarget.dataset.role;
        
        // Remove visual feedback
        e.currentTarget.classList.remove('bg-blue-50', 'border-2', 'border-blue-300');
        
        if (goalId && newRole) {
            console.log('[Goals] Dropping goal', goalId, 'to role:', newRole);
            moveGoalToRole(goalId, newRole);
        }
    }

    // Move goal to different role
    function moveGoalToRole(goalId, newRole) {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
            console.error('[Goals] Goal not found:', goalId);
            return;
        }

        if (goal.isDefault) {
            App.showNotification('No se pueden mover las metas por defecto', 'warning');
            return;
        }

        const oldRole = goal.role;
        if (oldRole === newRole) {
            console.log('[Goals] Goal already in this role');
            return;
        }

        // Check if there are tasks associated with this goal
        if (window.Tasks && window.Tasks.hasTasksForGoal) {
            const hasTasks = window.Tasks.hasTasksForGoal(goalId);
            if (hasTasks) {
                if (!confirm(`Esta meta tiene tareas asociadas. ¿Estás seguro de que quieres moverla de "${oldRole}" a "${newRole}"? Las tareas se moverán con la meta.`)) {
                    return;
                }
                
                // Move associated tasks to the new role
                const tasks = window.Tasks.getTasks();
                tasks.forEach(task => {
                    if (task.goal === goalId) {
                        task.role = newRole;
                    }
                });
                
                // Save updated tasks
                window.Tasks.saveData();
                console.log('[Goals] Moved associated tasks to new role');
            }
        }

        // Update goal role
        goal.role = newRole;
        saveGoals();
        
        // Update UI
        renderGoalsView();
        
        // Update goal options in tasks module
        if (window.Tasks && window.Tasks.updateGoalOptions) {
            window.Tasks.updateGoalOptions();
        }
        
        // Update goal options in tasks module
        if (window.Tasks && window.Tasks.updateUI) {
            window.Tasks.updateUI();
        }

        App.showNotification(`Meta "${goal.name}" movida de "${oldRole}" a "${newRole}"`, 'success');
        console.log('[Goals] Goal moved successfully');
    }

    // Public API
    return {
        init,
        addGoal,
        getGoals,
        getGoalsForRole,
        getGoalById,
        getDefaultGoalForRole,
        hasGoalsForRole,
        onRolesChanged,
        renderGoalsView,
        createDefaultGoals
    };
})();

// Make Goals available globally
window.Goals = Goals; 