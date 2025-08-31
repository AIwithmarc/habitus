/**
 * Perhaps List Module - Gestión de ideas para planificación futura
 * Permite capturar, buscar y convertir ideas en metas o tareas
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        STORAGE_KEY: 'habitus_ideas',
        MAX_IDEAS: 1000
    };

    // State
    let ideas = [];
    let filteredIdeas = [];
    let searchTerm = '';
    let showArchived = false;
    let showImplemented = false;

    // DOM Elements
    const elements = {
        ideaInput: null,
        addIdeaBtn: null,
        searchIdeasInput: null,
        ideasList: null,
        ideasCount: null
    };

    // Initialize module
    async function init() {
        console.log('[Perhaps] Initializing Perhaps List module...');
        
        // Load saved ideas (now async)
        await loadIdeas();
        
        // Force clean duplicates on initialization
        const removedCount = removeDuplicates(true);
        if (removedCount > 0) {
            console.log('[Perhaps] Removed', removedCount, 'duplicates during initialization');
        }
        
        // Setup DOM elements
        setupElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Render initial state
        renderIdeas();
        
        console.log('[Perhaps] Module initialized successfully');
    }

    // Setup DOM elements
    function setupElements() {
        elements.ideaInput = document.getElementById('ideaInput');
        elements.addIdeaBtn = document.getElementById('addIdeaBtn');
        elements.searchIdeasInput = document.getElementById('searchIdeasInput');
        elements.ideasList = document.getElementById('ideasList');
        elements.ideasCount = document.getElementById('ideasCount');
        
        if (!elements.ideaInput || !elements.addIdeaBtn || !elements.searchIdeasInput || !elements.ideasList || !elements.ideasCount) {
            console.warn('[Perhaps] Some DOM elements not found - Ideas tab may not be available');
            return false;
        }
        
        return true;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Add idea button
        if (elements.addIdeaBtn) {
            elements.addIdeaBtn.addEventListener('click', addIdea);
        }
        
        // Enter key in input
        if (elements.ideaInput) {
            elements.ideaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addIdea();
                }
            });
        }
        
        // Search input
        if (elements.searchIdeasInput) {
            elements.searchIdeasInput.addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                filterIdeas();
                renderIdeas();
            });
        }
    }

    // Add a new idea
    async function addIdea() {
        console.log('[Perhaps] addIdea called');
        
        if (!elements.ideaInput) {
            console.error('[Perhaps] ideaInput element not found');
            return;
        }
        
        if (!elements.ideaInput.value.trim()) {
            console.log('[Perhaps] No idea text provided');
            return;
        }

        const ideaText = elements.ideaInput.value.trim();
        console.log('[Perhaps] Adding idea:', ideaText);
        
        // Check if idea already exists
        if (ideas.some(idea => (idea.description || '').toLowerCase() === ideaText.toLowerCase())) {
            console.log('[Perhaps] Idea already exists');
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Esta idea ya existe', 'warning');
            } else {
                alert('Esta idea ya existe');
            }
            return;
        }

        // Create new idea
        const newIdea = {
            id: generateId(),
            description: ideaText,
            createdAt: new Date().toISOString(),
            archived: false,
            implemented: false
        };

        console.log('[Perhaps] Created new idea object:', newIdea);

        // Add to ideas array
        ideas.unshift(newIdea); // Add to beginning for chronological order
        
        // Limit total ideas
        if (ideas.length > CONFIG.MAX_IDEAS) {
            ideas = ideas.slice(0, CONFIG.MAX_IDEAS);
        }

        // Clean duplicates immediately after adding
        const seen = new Set();
        const uniqueIdeas = [];
        
        for (const idea of ideas) {
            const key = idea.id || idea.description || '';
            const normalizedKey = key.toLowerCase().trim();
            
            if (!seen.has(normalizedKey) && normalizedKey !== '') {
                seen.add(normalizedKey);
                uniqueIdeas.push(idea);
            } else {
                console.log('[Perhaps] Removing duplicate after adding new idea:', idea.description);
            }
        }
        
        if (uniqueIdeas.length !== ideas.length) {
            console.log('[Perhaps] Removed', ideas.length - uniqueIdeas.length, 'duplicates after adding new idea');
            ideas = uniqueIdeas;
        }

        console.log('[Perhaps] Ideas array updated, total:', ideas.length);

        // Clear input immediately for better UX
        elements.ideaInput.value = '';
        
        // Update UI immediately
        renderIdeas();
        
        // Save to localStorage only first
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
        
        // Sync to Supabase if authenticated (without reloading)
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                await window.SupabaseIdeas.addIdea(newIdea);
                console.log('[Perhaps] Idea synced to Supabase successfully');
            } catch (error) {
                console.error('[Perhaps] Failed to sync idea to Supabase:', error);
                // Continue with local storage only
            }
        }
        
        // Force a second render to ensure UI is updated
        setTimeout(() => {
            renderIdeas();
            console.log('[Perhaps] Forced UI refresh after adding idea');
        }, 50);
        
        // Show success notification
        if (window.App && window.App.showNotification) {
            window.App.showNotification('Idea agregada exitosamente', 'success');
        } else {
            alert('Idea agregada exitosamente');
        }
        
        console.log('[Perhaps] New idea added successfully:', newIdea);
    }

    // Filter ideas based on search term
    function filterIdeas() {
        if (showArchived) {
            // Show archived ideas
            if (!searchTerm) {
                filteredIdeas = ideas.filter(idea => idea.archived && !idea.implemented);
            } else {
                filteredIdeas = ideas.filter(idea => 
                    idea.archived && !idea.implemented && 
                    (idea.description || '').toLowerCase().includes(searchTerm)
                );
            }
        } else if (showImplemented) {
            // Show implemented ideas
            if (!searchTerm) {
                filteredIdeas = ideas.filter(idea => idea.implemented);
            } else {
                filteredIdeas = ideas.filter(idea => 
                    idea.implemented && 
                    (idea.description || '').toLowerCase().includes(searchTerm)
                );
            }
        } else {
            // Show active ideas
            if (!searchTerm) {
                filteredIdeas = ideas.filter(idea => !idea.archived && !idea.implemented);
            } else {
                filteredIdeas = ideas.filter(idea => 
                    !idea.archived && !idea.implemented && 
                    (idea.description || '').toLowerCase().includes(searchTerm)
                );
            }
        }
    }

    // Render ideas list
    function renderIdeas() {
        if (!elements.ideasList || !elements.ideasCount) return;

        console.log('[Perhaps] renderIdeas called with', ideas.length, 'ideas');

        // FORCE CLEAN DUPLICATES BEFORE RENDERING
        const seen = new Set();
        const uniqueIdeas = [];
        
        for (const idea of ideas) {
            const key = idea.id || idea.description || '';
            const normalizedKey = key.toLowerCase().trim();
            
            if (!seen.has(normalizedKey) && normalizedKey !== '') {
                seen.add(normalizedKey);
                uniqueIdeas.push(idea);
            } else {
                console.log('[Perhaps] Removing duplicate during render:', idea.description);
            }
        }
        
        if (uniqueIdeas.length !== ideas.length) {
            console.log('[Perhaps] Removed', ideas.length - uniqueIdeas.length, 'duplicates during render');
            ideas = uniqueIdeas;
            // Save cleaned data
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                console.log('[Perhaps] Saved cleaned data after render');
            } catch (error) {
                console.error('[Perhaps] Error saving cleaned data:', error);
            }
        }

        // Update count based on current view
        const activeIdeas = ideas.filter(idea => !idea.archived && !idea.implemented).length;
        const archivedIdeas = ideas.filter(idea => idea.archived && !idea.implemented).length;
        const implementedIdeas = ideas.filter(idea => idea.implemented).length;
        
        if (showArchived) {
            elements.ideasCount.textContent = `${archivedIdeas} archivadas`;
        } else if (showImplemented) {
            elements.ideasCount.textContent = `${implementedIdeas} implementadas`;
        } else {
            elements.ideasCount.textContent = activeIdeas;
        }

        // Always filter ideas to ensure we have the latest data
        filterIdeas();
        
        console.log('[Perhaps] Filtered ideas:', filteredIdeas.length);

        // Render ideas
        if (filteredIdeas.length === 0) {
            let emptyMessage, suggestionMessage, icon;
            
            if (showArchived) {
                emptyMessage = searchTerm ? 'No se encontraron ideas archivadas que coincidan con tu búsqueda' : 'No tienes ideas archivadas';
                suggestionMessage = 'Las ideas archivadas aparecen aquí';
                icon = '📁';
            } else if (showImplemented) {
                emptyMessage = searchTerm ? 'No se encontraron ideas implementadas que coincidan con tu búsqueda' : 'No tienes ideas implementadas';
                suggestionMessage = 'Las ideas implementadas aparecen aquí';
                icon = '✅';
            } else {
                emptyMessage = searchTerm ? 'No se encontraron ideas que coincidan con tu búsqueda' : 'No tienes ideas aún';
                suggestionMessage = '¡Agrega tu primera idea!';
                icon = '💭';
            }
            
            elements.ideasList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">${icon}</div>
                    <p>${emptyMessage}</p>
                    <p class="text-sm mt-1">${searchTerm ? 'Intenta con otros términos' : suggestionMessage}</p>
                </div>
            `;
            return;
        }

        elements.ideasList.innerHTML = filteredIdeas.map(idea => renderIdeaItem(idea)).join('');
    }

    // Render individual idea item
    function renderIdeaItem(idea) {
        const createdAt = new Date(idea.createdAt);
        const formattedDate = createdAt.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        let actionButtons;
        if (idea.implemented) {
            actionButtons = `
                <button onclick="Perhaps.deleteIdea('${idea.id}')" 
                        class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 active:bg-red-700 touch-manipulation"
                        title="Eliminar permanentemente">
                    🗑️ Eliminar
                </button>
            `;
        } else if (idea.archived) {
            actionButtons = `
                <button onclick="Perhaps.unarchiveIdea('${idea.id}')" 
                        class="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 active:bg-green-700 touch-manipulation"
                        title="Desarchivar">
                    🔓 Desarchivar
                </button>
                <button onclick="Perhaps.deleteIdea('${idea.id}')" 
                        class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 active:bg-red-700 touch-manipulation"
                        title="Eliminar permanentemente">
                    🗑️ Eliminar
                </button>
            `;
        } else {
            actionButtons = `
                <button onclick="Perhaps.convertToGoal('${idea.id}')" 
                        class="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 active:bg-green-700 touch-manipulation"
                        title="Convertir a Meta">
                    🎯 Meta
                </button>
                <button onclick="Perhaps.convertToTask('${idea.id}')" 
                        class="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 active:bg-blue-700 touch-manipulation"
                        title="Convertir a Tarea">
                    📝 Tarea
                </button>
                <button onclick="Perhaps.archiveIdea('${idea.id}')" 
                        class="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600 active:bg-gray-700 touch-manipulation"
                        title="Archivar">
                    📁 Archivar
                </button>
                <button onclick="Perhaps.deleteIdea('${idea.id}')" 
                        class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 active:bg-red-700 touch-manipulation"
                        title="Eliminar">
                    🗑️ Eliminar
                </button>
            `;
        }

        return `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 idea-item ${idea.archived || idea.implemented ? 'opacity-75' : ''}" data-idea-id="${idea.id}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <p class="text-gray-800 mb-2">${escapeHtml(idea.description || 'Sin descripción')}</p>
                        <p class="text-xs text-gray-500">Creada el ${formattedDate}</p>
                        ${idea.implemented ? '<p class="text-xs text-green-600 mt-1">✅ Implementada</p>' : ''}
                        ${idea.archived ? '<p class="text-xs text-orange-600 mt-1">📁 Archivada</p>' : ''}
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }

    // Convert idea to goal
    function convertToGoal(ideaId) {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        // Check if Goals module is available
        if (!window.Goals || !window.Goals.addGoal) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Módulo de Metas no disponible', 'error');
            }
            return;
        }

        // Get available roles
        const roles = window.Roles ? window.Roles.getRoles() : [];
        if (roles.length === 0) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Primero debes crear roles', 'warning');
            }
            return;
        }

        // Show role selection modal
        showRoleSelectionModal(idea, roles, 'goal');
    }

    // Convert idea to task
    function convertToTask(ideaId) {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        // Check if Tasks module is available
        if (!window.Tasks || !window.Tasks.addTask) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Módulo de Tareas no disponible', 'error');
            }
            return;
        }

        // Check if Goals module is available
        if (!window.Goals || !window.Goals.getGoals) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Módulo de Metas no disponible', 'error');
            }
            return;
        }

        // Get available goals
        const goals = window.Goals.getGoals();
        if (goals.length === 0) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Primero debes crear metas', 'warning');
            }
            return;
        }

        // Show goal selection modal
        showGoalSelectionModal(idea, goals);
    }

    // Archive idea
    async function archiveIdea(ideaId) {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        idea.archived = true;
        await saveIdeas();
        
        // Try to sync with Supabase if authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                await window.SupabaseIdeas.updateIdea(ideaId, idea);
                console.log('[Perhaps] Archived idea synced to Supabase');
            } catch (error) {
                console.error('[Perhaps] Failed to sync archived idea to Supabase:', error);
            }
        }
        
        // Force refresh of ideas list and all views
        setTimeout(() => {
            renderIdeas();
            refreshAllViews();
        }, 100);

        if (window.App && window.App.showNotification) {
            window.App.showNotification('Idea archivada', 'info');
        }

        console.log('[Perhaps] Idea archived:', idea);
    }

    // Unarchive idea
    async function unarchiveIdea(ideaId) {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        idea.archived = false;
        await saveIdeas();
        
        // Try to sync with Supabase if authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                await window.SupabaseIdeas.updateIdea(ideaId, idea);
                console.log('[Perhaps] Unarchived idea synced to Supabase');
            } catch (error) {
                console.error('[Perhaps] Failed to sync unarchived idea to Supabase:', error);
            }
        }
        
        // Force refresh of ideas list and all views
        setTimeout(() => {
            renderIdeas();
            refreshAllViews();
        }, 100);

        if (window.App && window.App.showNotification) {
            window.App.showNotification('Idea desarchivada', 'info');
        }

        console.log('[Perhaps] Idea unarchived:', idea);
    }

    // Mark idea as implemented
    async function markAsImplemented(ideaId) {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        idea.implemented = true;
        idea.archived = false; // Ensure it's not archived
        await saveIdeas();
        
        // Try to sync with Supabase if authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                await window.SupabaseIdeas.updateIdea(ideaId, idea);
                console.log('[Perhaps] Implemented idea synced to Supabase');
            } catch (error) {
                console.error('[Perhaps] Failed to sync implemented idea to Supabase:', error);
            }
        }
        
        // Force refresh of ideas list and all views
        setTimeout(() => {
            renderIdeas();
            refreshAllViews();
        }, 100);

        if (window.App && window.App.showNotification) {
            window.App.showNotification('Idea marcada como implementada', 'success');
        }

        console.log('[Perhaps] Idea marked as implemented:', idea);
    }

    // Show role selection modal for goal conversion
    function showRoleSelectionModal(idea, roles, type) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'roleSelectionModal';

        // Create modal content
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
                <h3 class="text-lg font-semibold mb-4 text-purple-800">
                    🎯 Convertir Idea a Meta
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                    <strong>Idea:</strong> ${escapeHtml(idea.description || 'Sin descripción')}
                </p>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de la Meta:</label>
                    <input type="text" id="goalNameInput" class="w-full border rounded px-3 py-2" 
                           placeholder="Nombre de la meta..." 
                           value="${escapeHtml((idea.description || '').length > 50 ? (idea.description || '').substring(0, 50) + '...' : (idea.description || ''))}">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Rol:</label>
                    <select id="roleSelect" class="w-full border rounded px-3 py-2">
                        <option value="">Seleccionar Rol</option>
                        ${roles.map(role => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join('')}
                    </select>
                </div>
                <div class="flex space-x-3">
                    <button id="cancelRoleBtn" class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 active:bg-gray-500">
                        Cancelar
                    </button>
                    <button id="confirmRoleBtn" class="flex-1 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 active:bg-purple-700">
                        Crear Meta
                    </button>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.appendChild(modal);

        // Get modal elements
        const goalNameInputEl = modal.querySelector('#goalNameInput');
        const roleSelectEl = modal.querySelector('#roleSelect');
        const cancelBtn = modal.querySelector('#cancelRoleBtn');
        const confirmBtn = modal.querySelector('#confirmRoleBtn');

        // Setup event listeners
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        confirmBtn.addEventListener('click', () => {
            const goalName = goalNameInputEl.value.trim();
            const selectedRole = roleSelectEl.value;

            if (!goalName) {
                alert('Por favor ingresa un nombre para la meta');
                return;
            }

            if (!selectedRole) {
                alert('Por favor selecciona un rol');
                return;
            }

            // Create goal
            try {
                const goalData = {
                    name: goalName,
                    role: selectedRole,
                    color: '#8B5CF6' // Purple color for ideas
                };

                window.Goals.addGoal(goalData);
                markAsImplemented(idea.id);

                if (window.App && window.App.showNotification) {
                    window.App.showNotification('Idea convertida a meta exitosamente', 'success');
                }

                console.log('[Perhaps] Idea converted to goal:', idea, goalData);
                
                // Close modal
                document.body.removeChild(modal);
                
                // Refresh goals view if available
                if (window.Goals && window.Goals.renderGoalsView) {
                    window.Goals.renderGoalsView();
                }
                
                // Force refresh of ideas list and all views
                setTimeout(() => {
                    renderIdeas();
                    refreshAllViews();
                }, 100);
            } catch (error) {
                console.error('[Perhaps] Error converting idea to goal:', error);
                if (window.App && window.App.showNotification) {
                    window.App.showNotification('Error al convertir idea a meta', 'error');
                }
            }
        });

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Show goal selection modal for task conversion
    function showGoalSelectionModal(idea, goals) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'goalSelectionModal';

        // Create modal content
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
                <h3 class="text-lg font-semibold mb-4 text-blue-800">
                    📝 Convertir Idea a Tarea
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                    <strong>Idea:</strong> ${escapeHtml(idea.description || 'Sin descripción')}
                </p>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Descripción de la Tarea:</label>
                    <input type="text" id="taskDescriptionInput" class="w-full border rounded px-3 py-2" 
                           placeholder="Descripción de la tarea..." 
                           value="${escapeHtml((idea.description || '').length > 100 ? (idea.description || '').substring(0, 100) + '...' : (idea.description || ''))}">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Meta:</label>
                    <select id="goalSelect" class="w-full border rounded px-3 py-2">
                        <option value="">Seleccionar Meta</option>
                        ${goals.map(goal => `<option value="${goal.id}" data-role="${escapeHtml(goal.role)}">${escapeHtml(goal.name)} (${escapeHtml(goal.role)})</option>`).join('')}
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Cuadrante:</label>
                    <select id="quadrantSelect" class="w-full border rounded px-3 py-2">
                        <option value="1">Q1: Urgente e Importante</option>
                        <option value="2" selected>Q2: Importante, no Urgente</option>
                        <option value="3">Q3: Urgente, no Importante</option>
                        <option value="4">Q4: No Urgente, no Importante</option>
                    </select>
                </div>
                <div class="flex space-x-3">
                    <button id="cancelGoalBtn" class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 active:bg-gray-500">
                        Cancelar
                    </button>
                    <button id="confirmGoalBtn" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 active:bg-blue-700">
                        Crear Tarea
                    </button>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.appendChild(modal);

        // Get modal elements
        const taskDescriptionInput = modal.querySelector('#taskDescriptionInput');
        const goalSelect = modal.querySelector('#goalSelect');
        const quadrantSelect = modal.querySelector('#quadrantSelect');
        const cancelBtn = modal.querySelector('#cancelGoalBtn');
        const confirmBtn = modal.querySelector('#confirmGoalBtn');

        // Setup event listeners
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        confirmBtn.addEventListener('click', () => {
            const taskDescription = taskDescriptionInput.value.trim();
            const selectedGoalId = goalSelect.value;
            const selectedQuadrant = parseInt(quadrantSelect.value);

            if (!taskDescription) {
                alert('Por favor ingresa una descripción para la tarea');
                return;
            }

            if (!selectedGoalId) {
                alert('Por favor selecciona una meta');
                return;
            }

            // Get selected goal details
            const selectedGoal = goals.find(g => g.id === selectedGoalId);
            if (!selectedGoal) {
                alert('Meta seleccionada no válida');
                return;
            }

            // Create task
            try {
                const taskData = {
                    description: taskDescription,
                    role: selectedGoal.role,
                    goal: selectedGoalId,
                    quadrant: selectedQuadrant,
                    completed: false
                };

                window.Tasks.addTask(taskData);
                markAsImplemented(idea.id);

                if (window.App && window.App.showNotification) {
                    window.App.showNotification('Idea convertida a tarea exitosamente', 'success');
                }

                console.log('[Perhaps] Idea converted to task:', idea, taskData);
                
                // Close modal
                document.body.removeChild(modal);
                
                // Refresh tasks view if available
                if (window.Tasks && window.Tasks.updateUI) {
                    window.Tasks.updateUI();
                }
                
                // Force refresh of ideas list and all views
                setTimeout(() => {
                    renderIdeas();
                    refreshAllViews();
                }, 100);
            } catch (error) {
                console.error('[Perhaps] Error converting idea to task:', error);
                if (window.App && window.App.showNotification) {
                    window.App.showNotification('Error al convertir idea a tarea', 'error');
                }
            }
        });

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Toggle implemented view
    function toggleImplementedView() {
        showImplemented = !showImplemented;
        showArchived = false; // Ensure only one view is active
        
        // Update button text
        const toggleBtn = document.getElementById('toggleImplementedBtn');
        if (toggleBtn) {
            toggleBtn.textContent = showImplemented ? '💭 Ver Activas' : '✅ Ver Implementadas';
            toggleBtn.className = showImplemented ? 
                'bg-blue-200 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-300 active:bg-blue-400 touch-manipulation' :
                'bg-green-200 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-300 active:bg-green-400 touch-manipulation';
        }
        
        // Reset archived button
        const archivedBtn = document.getElementById('toggleArchivedBtn');
        if (archivedBtn) {
            archivedBtn.textContent = '📁 Ver Archivadas';
            archivedBtn.className = 'bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300 active:bg-gray-400 touch-manipulation';
        }
        
        // Clear search and re-render
        searchTerm = '';
        if (elements.searchIdeasInput) {
            elements.searchIdeasInput.value = '';
        }
        
        filterIdeas();
        renderIdeas();
        
        console.log('[Perhaps] Toggled implemented view:', showImplemented);
    }

    // Toggle archived view
    function toggleArchivedView() {
        showArchived = !showArchived;
        showImplemented = false; // Ensure only one view is active
        
        // Update button text
        const toggleBtn = document.getElementById('toggleArchivedBtn');
        if (toggleBtn) {
            toggleBtn.textContent = showArchived ? '💭 Ver Activas' : '📁 Ver Archivadas';
            toggleBtn.className = showArchived ? 
                'bg-blue-200 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-300 active:bg-blue-400 touch-manipulation' :
                'bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300 active:bg-gray-400 touch-manipulation';
        }
        
        // Reset implemented button
        const implementedBtn = document.getElementById('toggleImplementedBtn');
        if (implementedBtn) {
            implementedBtn.textContent = '✅ Ver Implementadas';
            implementedBtn.className = 'bg-green-200 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-300 active:bg-green-400 touch-manipulation';
        }
        
        // Clear search and re-render
        searchTerm = '';
        if (elements.searchIdeasInput) {
            elements.searchIdeasInput.value = '';
        }
        
        filterIdeas();
        renderIdeas();
        
        console.log('[Perhaps] Toggled archived view:', showArchived);
    }

    // Delete idea permanently
    async function deleteIdea(ideaId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta idea permanentemente?')) {
            return;
        }

        const ideaIndex = ideas.findIndex(i => i.id === ideaId);
        if (ideaIndex === -1) return;

        const deletedIdea = ideas.splice(ideaIndex, 1)[0];
        await saveIdeas();
        
        // Try to sync with Supabase if authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                await window.SupabaseIdeas.deleteIdea(ideaId);
                console.log('[Perhaps] Deleted idea synced to Supabase');
            } catch (error) {
                console.error('[Perhaps] Failed to sync deleted idea to Supabase:', error);
            }
        }
        
        // Force refresh of ideas list and all views
        setTimeout(() => {
            renderIdeas();
            refreshAllViews();
        }, 100);

        if (window.App && window.App.showNotification) {
            window.App.showNotification('Idea eliminada', 'info');
        }

        console.log('[Perhaps] Idea deleted:', deletedIdea);
    }

    // Save ideas to localStorage and Supabase
    async function saveIdeas() {
        try {
            // Save to localStorage
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
            
            // Try to sync with Supabase if authenticated
            if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
                try {
                    await window.SupabaseIdeas.syncToSupabase(ideas);
                    console.log('[Perhaps] Ideas synced to Supabase successfully');
                } catch (error) {
                    console.error('[Perhaps] Failed to sync ideas to Supabase:', error);
                    // Continue with local storage only
                }
            }
        } catch (error) {
            console.error('[Perhaps] Error saving ideas:', error);
        }
    }

    // Load ideas from localStorage or Supabase
    async function loadIdeas() {
        try {
            // Clear ideas array first
            ideas = [];
            console.log('[Perhaps] Cleared ideas array before loading');
            
            // Try to load from Supabase if authenticated
            if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
                try {
                    const supabaseIdeas = await window.SupabaseIdeas.getAllIdeas();
                    console.log('[Perhaps] Retrieved', supabaseIdeas.length, 'ideas from Supabase');
                    
                    // Remove duplicates from Supabase data before assigning
                    const seen = new Set();
                    const uniqueIdeas = [];
                    
                    for (const idea of supabaseIdeas) {
                        const key = idea.id || idea.description || '';
                        const normalizedKey = key.toLowerCase().trim();
                        
                        if (!seen.has(normalizedKey) && normalizedKey !== '') {
                            seen.add(normalizedKey);
                            uniqueIdeas.push(idea);
                        } else {
                            console.log('[Perhaps] Skipping duplicate from Supabase:', idea.description);
                        }
                    }
                    
                    ideas = uniqueIdeas;
                    console.log('[Perhaps] Loaded', ideas.length, 'unique ideas from Supabase');
                    
                    // Clear localStorage and update with clean Supabase data
                    localStorage.removeItem(CONFIG.STORAGE_KEY);
                    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                    return;
                } catch (error) {
                    console.error('[Perhaps] Failed to load from Supabase, falling back to localStorage:', error);
                }
            }
            
            // Fallback to localStorage ONLY if not authenticated or Supabase failed
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const parsedIdeas = JSON.parse(saved);
                console.log('[Perhaps] Loaded', parsedIdeas.length, 'ideas from localStorage');
                
                // Remove duplicates from localStorage data
                const seen = new Set();
                const uniqueIdeas = [];
                
                for (const idea of parsedIdeas) {
                    const key = idea.id || idea.description || '';
                    const normalizedKey = key.toLowerCase().trim();
                    
                    if (!seen.has(normalizedKey) && normalizedKey !== '') {
                        seen.add(normalizedKey);
                        uniqueIdeas.push(idea);
                    } else {
                        console.log('[Perhaps] Skipping duplicate from localStorage:', idea.description);
                    }
                }
                
                ideas = uniqueIdeas;
                console.log('[Perhaps] Loaded', ideas.length, 'unique ideas from localStorage');
                
                // Save the cleaned data
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
            } else {
                ideas = [];
                console.log('[Perhaps] No saved ideas found, starting with empty array');
            }
        } catch (error) {
            console.error('[Perhaps] Error loading ideas:', error);
            ideas = [];
        }
    }

    // Remove duplicates from ideas array
    function removeDuplicates(saveToStorage = true) {
        const seen = new Set();
        const uniqueIdeas = [];
        const duplicates = [];
        
        for (const idea of ideas) {
            // Use both id and description for better duplicate detection
            const key = idea.id || idea.description || '';
            const normalizedKey = key.toLowerCase().trim();
            
            if (!seen.has(normalizedKey) && normalizedKey !== '') {
                seen.add(normalizedKey);
                uniqueIdeas.push(idea);
            } else if (normalizedKey !== '') {
                duplicates.push(idea);
                console.log('[Perhaps] Found duplicate:', idea.description);
            }
        }
        
        const removedCount = ideas.length - uniqueIdeas.length;
        if (removedCount > 0) {
            console.log('[Perhaps] Removed', removedCount, 'duplicate ideas');
            console.log('[Perhaps] Duplicates found:', duplicates.map(d => d.description));
            ideas = uniqueIdeas;
            
            // Save the cleaned data only if requested
            if (saveToStorage) {
                try {
                    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                    console.log('[Perhaps] Cleaned data saved to localStorage');
                } catch (error) {
                    console.error('[Perhaps] Error saving cleaned data:', error);
                }
            }
        }
        
        return removedCount;
    }

    // Force sync with Supabase
    async function forceSyncWithSupabase() {
        if (!window.HabitusSupabase?.auth?.isAuthenticated() || !window.SupabaseIdeas) {
            console.log('[Perhaps] Cannot sync - not authenticated or SupabaseIdeas not available');
            return false;
        }
        
        try {
            console.log('[Perhaps] Force syncing with Supabase...');
            
            // First remove duplicates locally
            const removedCount = removeDuplicates();
            if (removedCount > 0) {
                console.log('[Perhaps] Removed', removedCount, 'duplicates before syncing');
            }
            
            // Then sync the clean data
            await window.SupabaseIdeas.syncToSupabase(ideas);
            console.log('[Perhaps] Force sync completed');
            return true;
        } catch (error) {
            console.error('[Perhaps] Force sync failed:', error);
            return false;
        }
    }

    // Clean duplicates from both local and Supabase
    async function cleanDuplicatesEverywhere() {
        console.log('[Perhaps] Cleaning duplicates everywhere...');
        
        // Clean local duplicates
        const localRemoved = removeDuplicates();
        console.log('[Perhaps] Local duplicates removed:', localRemoved);
        
        // Clean Supabase duplicates if authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                // Get all ideas from Supabase
                const supabaseIdeas = await window.SupabaseIdeas.getAllIdeas();
                console.log('[Perhaps] Found', supabaseIdeas.length, 'ideas in Supabase');
                
                // Remove duplicates from Supabase data
                const seen = new Set();
                const uniqueSupabaseIdeas = [];
                const duplicatesToDelete = [];
                
                for (const idea of supabaseIdeas) {
                    const key = idea.id || idea.description || '';
                    const normalizedKey = key.toLowerCase().trim();
                    
                    if (!seen.has(normalizedKey) && normalizedKey !== '') {
                        seen.add(normalizedKey);
                        uniqueSupabaseIdeas.push(idea);
                    } else {
                        duplicatesToDelete.push(idea);
                        console.log('[Perhaps] Found duplicate in Supabase:', idea.description);
                    }
                }
                
                const supabaseRemoved = duplicatesToDelete.length;
                if (supabaseRemoved > 0) {
                    console.log('[Perhaps] Supabase duplicates found:', supabaseRemoved);
                    
                    // Delete duplicates from Supabase
                    for (const duplicate of duplicatesToDelete) {
                        try {
                            await window.SupabaseIdeas.deleteIdea(duplicate.id);
                            console.log('[Perhaps] Deleted duplicate from Supabase:', duplicate.description);
                        } catch (error) {
                            console.error('[Perhaps] Error deleting duplicate from Supabase:', error);
                        }
                    }
                    
                    // Update local data with clean Supabase data
                    ideas = uniqueSupabaseIdeas;
                    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                    console.log('[Perhaps] Updated local data with clean Supabase data');
                }
                
                return { local: localRemoved, supabase: supabaseRemoved };
            } catch (error) {
                console.error('[Perhaps] Error cleaning Supabase duplicates:', error);
                return { local: localRemoved, supabase: 0 };
            }
        }
        
        return { local: localRemoved, supabase: 0 };
    }

    // Force clean duplicates on page refresh
    async function forceCleanOnRefresh() {
        console.log('[Perhaps] Force cleaning duplicates on refresh...');
        
        // Clear localStorage completely
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        console.log('[Perhaps] Cleared localStorage');
        
        // Clear the ideas array
        ideas = [];
        console.log('[Perhaps] Cleared ideas array');
        
        // Reload ideas from Supabase if authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                const supabaseIdeas = await window.SupabaseIdeas.getAllIdeas();
                console.log('[Perhaps] Retrieved', supabaseIdeas.length, 'ideas from Supabase');
                
                // Remove duplicates from Supabase data before assigning
                const seen = new Set();
                const uniqueIdeas = [];
                
                for (const idea of supabaseIdeas) {
                    const key = idea.id || idea.description || '';
                    const normalizedKey = key.toLowerCase().trim();
                    
                    if (!seen.has(normalizedKey) && normalizedKey !== '') {
                        seen.add(normalizedKey);
                        uniqueIdeas.push(idea);
                    } else {
                        console.log('[Perhaps] Skipping duplicate from Supabase:', idea.description);
                    }
                }
                
                ideas = uniqueIdeas;
                console.log('[Perhaps] Loaded', ideas.length, 'unique ideas from Supabase');
                
                // Save clean data to localStorage
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                console.log('[Perhaps] Saved clean data to localStorage');
                
                return { reloaded: ideas.length, duplicates: supabaseIdeas.length - uniqueIdeas.length };
            } catch (error) {
                console.error('[Perhaps] Error reloading from Supabase:', error);
                return { reloaded: 0, duplicates: 0 };
            }
        }
        
        return { reloaded: 0, duplicates: 0 };
    }

    // Nuclear option: Complete reset and reload
    async function nuclearReset() {
        console.log('[Perhaps] Nuclear reset - Complete cleanup...');
        
        // Clear everything
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        ideas = [];
        console.log('[Perhaps] Cleared everything locally');
        
        // Force reload from Supabase
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseIdeas) {
            try {
                // Get fresh data from Supabase
                const supabaseIdeas = await window.SupabaseIdeas.getAllIdeas();
                console.log('[Perhaps] Retrieved', supabaseIdeas.length, 'ideas from Supabase');
                
                // Use only unique ideas
                const seen = new Set();
                const uniqueIdeas = [];
                
                for (const idea of supabaseIdeas) {
                    const key = idea.id || idea.description || '';
                    const normalizedKey = key.toLowerCase().trim();
                    
                    if (!seen.has(normalizedKey) && normalizedKey !== '') {
                        seen.add(normalizedKey);
                        uniqueIdeas.push(idea);
                    }
                }
                
                ideas = uniqueIdeas;
                console.log('[Perhaps] Loaded', ideas.length, 'unique ideas');
                
                // Save to localStorage
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                console.log('[Perhaps] Saved clean data to localStorage');
                
                // Force UI update
                if (typeof renderIdeas === 'function') {
                    renderIdeas();
                }
                
                return { 
                    success: true, 
                    total: supabaseIdeas.length, 
                    unique: uniqueIdeas.length, 
                    duplicates: supabaseIdeas.length - uniqueIdeas.length 
                };
            } catch (error) {
                console.error('[Perhaps] Error in nuclear reset:', error);
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: 'Not authenticated' };
    }

    // Immediate duplicate cleanup and refresh
    async function immediateCleanup() {
        console.log('[Perhaps] Immediate cleanup - Force remove duplicates...');
        
        // Force clean duplicates in current array
        const seen = new Set();
        const uniqueIdeas = [];
        
        for (const idea of ideas) {
            const key = idea.id || idea.description || '';
            const normalizedKey = key.toLowerCase().trim();
            
            if (!seen.has(normalizedKey) && normalizedKey !== '') {
                seen.add(normalizedKey);
                uniqueIdeas.push(idea);
            } else {
                console.log('[Perhaps] Removing duplicate during immediate cleanup:', idea.description);
            }
        }
        
        const removedCount = ideas.length - uniqueIdeas.length;
        if (removedCount > 0) {
            console.log('[Perhaps] Removed', removedCount, 'duplicates during immediate cleanup');
            ideas = uniqueIdeas;
            
            // Save cleaned data
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(ideas));
                console.log('[Perhaps] Saved cleaned data after immediate cleanup');
            } catch (error) {
                console.error('[Perhaps] Error saving cleaned data:', error);
            }
            
            // Force UI update
            if (typeof renderIdeas === 'function') {
                renderIdeas();
            }
        }
        
        return { 
            success: true, 
            removed: removedCount, 
            remaining: uniqueIdeas.length 
        };
    }

    // Get all ideas (for export)
    function getIdeas() {
        return ideas;
    }

    // Get active ideas count
    function getActiveIdeasCount() {
        return ideas.filter(idea => !idea.archived).length;
    }

    // Generate unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Refresh all application views to ensure consistency
    function refreshAllViews() {
        console.log('[Perhaps] Refreshing all application views...');
        
        // Refresh goals view if available
        if (window.Goals && window.Goals.renderGoalsView) {
            try {
                window.Goals.renderGoalsView();
                console.log('[Perhaps] Goals view refreshed');
            } catch (error) {
                console.error('[Perhaps] Error refreshing goals view:', error);
            }
        }
        
        // Refresh tasks view if available
        if (window.Tasks && window.Tasks.updateUI) {
            try {
                window.Tasks.updateUI();
                console.log('[Perhaps] Tasks view refreshed');
            } catch (error) {
                console.error('[Perhaps] Error refreshing tasks view:', error);
            }
        }
        
        // Refresh roles view if available
        if (window.Roles && window.Roles.renderRolesView) {
            try {
                window.Roles.renderRolesView();
                console.log('[Perhaps] Roles view refreshed');
            } catch (error) {
                console.error('[Perhaps] Error refreshing roles view:', error);
            }
        }
        
        console.log('[Perhaps] All views refresh completed');
    }

    // Public API
    window.Perhaps = {
        init,
        addIdea,
        convertToGoal,
        convertToTask,
        archiveIdea,
        unarchiveIdea,
        markAsImplemented,
        deleteIdea,
        getIdeas,
        getActiveIdeasCount,
        renderIdeas,
        toggleArchivedView,
        toggleImplementedView,
        showRoleSelectionModal,
        showGoalSelectionModal,
        refreshAllViews,
        removeDuplicates,
        forceSyncWithSupabase,
        cleanDuplicatesEverywhere,
        forceCleanOnRefresh,
        nuclearReset,
        immediateCleanup
    };

    // Debug API removed for production

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
