/**
 * Weekly Check-In Module for Habitus
 * Manages weekly review process with mandatory check-ins
 */

const CheckIn = (() => {
    'use strict';

    // Private state
    let checkInState = {
        lastCheckIn: null,
        currentWeekStart: null,
        isPending: false,
        isModalOpen: false,
        reminderCount: 0,
        isBlocking: false
    };

    // Configuration
    const CONFIG = {
        WEEK_DAYS: 7,
        GRACE_DAYS: 1, // Allow 1 day grace period
        REMINDER_INTERVALS: [7, 8, 10], // Days when to show reminders
        STORAGE_KEY: 'habitus_checkin_state',
        BLOCKED_ACTIONS: ['newWeek']
    };

    // Storage utilities
    function saveState() {
        try {
            const stateToSave = {
                ...checkInState,
                lastCheckIn: checkInState.lastCheckIn ? 
                    (checkInState.lastCheckIn instanceof Date ? checkInState.lastCheckIn.toISOString() : 
                     typeof checkInState.lastCheckIn === 'number' ? new Date(checkInState.lastCheckIn).toISOString() :
                     new Date(checkInState.lastCheckIn).toISOString()) : null,
                currentWeekStart: checkInState.currentWeekStart ? 
                    (checkInState.currentWeekStart instanceof Date ? checkInState.currentWeekStart.toISOString() : 
                     typeof checkInState.currentWeekStart === 'number' ? new Date(checkInState.currentWeekStart).toISOString() :
                     new Date(checkInState.currentWeekStart).toISOString()) : null
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stateToSave));
            HabitusConfig?.logger?.debug('CheckIn state saved:', stateToSave);
        } catch (error) {
            console.error('[CheckIn] Error saving state:', error);
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                checkInState = {
                    ...checkInState,
                    ...parsed,
                    lastCheckIn: parsed.lastCheckIn ? new Date(parsed.lastCheckIn) : null,
                    currentWeekStart: parsed.currentWeekStart ? new Date(parsed.currentWeekStart) : null,
                    isModalOpen: false // Always reset modal state on load
                };
                HabitusConfig?.logger?.debug('CheckIn state loaded:', checkInState);
            }
        } catch (error) {
            console.error('[CheckIn] Error loading state:', error);
            checkInState = { ...checkInState }; // Reset to defaults
        }
    }

    // Date utilities
    function getWeekStart(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Get Monday of current week
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    function daysSince(date) {
        if (!date) return Infinity;
        
        // Ensure date is a Date object
        let dateObj = date;
        if (typeof date === 'number') {
            dateObj = new Date(date);
        } else if (!(date instanceof Date)) {
            try {
                dateObj = new Date(date);
            } catch (error) {
                console.error('[CheckIn] Invalid date format:', date);
                return Infinity;
            }
        }
        
        if (isNaN(dateObj.getTime())) {
            console.error('[CheckIn] Invalid date object:', dateObj);
            return Infinity;
        }
        
        const now = new Date();
        const timeDiff = now.getTime() - dateObj.getTime();
        return Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    function formatDate(date) {
        return date.toLocaleDateString(HabitusConfig?.app?.lang || 'es', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Core check-in logic
    function checkIfRequired() {
        const now = new Date();
        const currentWeekStart = getWeekStart(now);
        
        // If this is the first time, set current week and no check-in required
        if (!checkInState.currentWeekStart) {
            checkInState.currentWeekStart = currentWeekStart;
            checkInState.isPending = false;
            saveState();
            return false;
        }

        // Check if we've moved to a new week
        const hasNewWeekStarted = currentWeekStart.getTime() > checkInState.currentWeekStart.getTime();
        
        if (hasNewWeekStarted) {
            // New week detected
            const daysSinceLastCheckIn = checkInState.lastCheckIn ? 
                daysSince(checkInState.lastCheckIn) : 
                Infinity;

            // Require check-in if it's been more than a week
            if (daysSinceLastCheckIn >= CONFIG.WEEK_DAYS) {
                checkInState.isPending = true;
                checkInState.currentWeekStart = currentWeekStart;
                
                // Determine if should be blocking
                checkInState.isBlocking = daysSinceLastCheckIn >= (CONFIG.WEEK_DAYS + CONFIG.GRACE_DAYS);
                
                saveState();
                return true;
            }
        }

        return checkInState.isPending;
    }

    function shouldShowReminder() {
        if (!checkInState.isPending) return false;
        
        const daysSinceLastCheckIn = checkInState.lastCheckIn ? 
            daysSince(checkInState.lastCheckIn) : 
            Infinity;
            
        return CONFIG.REMINDER_INTERVALS.includes(daysSinceLastCheckIn);
    }

    function isActionBlocked(action) {
        return checkInState.isBlocking && CONFIG.BLOCKED_ACTIONS.includes(action);
    }

    // Modal management
    function createCheckInModal() {
        const modalHtml = `
            <div id="checkInModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: none;">
                <div class="bg-white rounded-lg p-6 m-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center">
                            <span class="mr-3">${checkInState.isBlocking ? '⚠️' : '🎯'}</span>
                            <span data-i18n="checkin_title">${checkInState.isBlocking ? 'Check-in Requerido' : 'Check-in Semanal'}</span>
                        </h2>
                        <button 
                            id="closeCheckInModal" 
                            class="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            title="${checkInState.isBlocking ? 'Cerrar (acciones bloqueadas hasta completar)' : 'Cerrar'}"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div class="space-y-6">
                        <!-- Week Summary -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-blue-800 mb-2 flex items-center">
                                <span class="mr-2">📊</span>
                                <span data-i18n="checkin_summary">Resumen de la Semana</span>
                            </h3>
                            <div id="weekSummary" class="text-sm text-blue-700">
                                <!-- Summary will be populated by JavaScript -->
                            </div>
                        </div>

                        <!-- Tasks Review -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-green-800 mb-2 flex items-center">
                                <span class="mr-2">✅</span>
                                <span data-i18n="checkin_completed">Tareas Completadas</span>
                            </h3>
                            <div id="completedTasksList" class="space-y-2">
                                <!-- Completed tasks will be populated -->
                            </div>
                        </div>

                        <!-- Pending Tasks -->
                        <div class="bg-yellow-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-yellow-800 mb-2 flex items-center">
                                <span class="mr-2">⏳</span>
                                <span data-i18n="checkin_pending">Tareas Pendientes</span>
                            </h3>
                            <div id="pendingTasksList" class="space-y-2">
                                <!-- Pending tasks will be populated -->
                            </div>
                        </div>

                        <!-- Reflection -->
                        <div>
                            <label class="block text-sm font-medium mb-2" for="checkInReflection">
                                <span class="flex items-center">
                                    <span class="mr-2">💭</span>
                                    <span data-i18n="checkin_reflection">Reflexión de la Semana</span>
                                </span>
                            </label>
                            <textarea 
                                id="checkInReflection" 
                                class="w-full border rounded-lg px-3 py-2 text-sm"
                                rows="4"
                                data-i18n-placeholder="checkin_reflection_placeholder"
                                placeholder="¿Qué aprendiste esta semana? ¿Qué cambiarías para la próxima?"></textarea>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex justify-end space-x-3 pt-4 border-t">
                            ${!checkInState.isBlocking ? `
                                <button id="postponeCheckIn" class="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                                    <span data-i18n="checkin_postpone">Recordar Después</span>
                                </button>
                            ` : ''}
                            <button id="completeCheckIn" class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium">
                                <span data-i18n="checkin_complete">Completar Check-in</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('checkInModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Set up event listeners
        setupModalEventListeners();

        return document.getElementById('checkInModal');
    }

    function setupModalEventListeners() {
        // Close button (only if not blocking)
        const closeBtn = document.getElementById('closeCheckInModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideModal);
        }

        // Postpone button (only if not blocking)
        const postponeBtn = document.getElementById('postponeCheckIn');
        if (postponeBtn) {
            postponeBtn.addEventListener('click', postponeCheckIn);
        }

        // Complete button
        const completeBtn = document.getElementById('completeCheckIn');
        if (completeBtn) {
            completeBtn.addEventListener('click', completeCheckIn);
        }

        // Prevent modal close on backdrop click if blocking
        const modal = document.getElementById('checkInModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && !checkInState.isBlocking) {
                    hideModal();
                }
            });
        }

        // Handle ESC key (only if not blocking)
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && !checkInState.isBlocking) {
                hideModal();
            }
        };
        document.addEventListener('keydown', handleEscKey);
        
        // Store handler for cleanup
        if (modal) {
            modal._escHandler = handleEscKey;
        }
    }

    function setupPendingTaskListeners() {
        const checkboxes = document.querySelectorAll('.pending-task-checkbox');
        let completedCount = 0;
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                const isChecked = e.target.checked;
                const taskRow = e.target.closest('[data-task-id]');
                
                if (isChecked) {
                    // Mark task as completed
                    const success = Tasks?.toggleTaskComplete?.(taskId);
                    
                    if (success !== false) {
                        // Visual feedback - mark as completed
                        taskRow.style.transition = 'all 0.3s ease';
                        taskRow.style.opacity = '0.7';
                        taskRow.style.background = '#dcfce7'; // green background
                        taskRow.style.textDecoration = 'line-through';
                        
                        completedCount++;
                        
                        // Update summary in real-time
                        updateModalSummary();
                        
                        // Show success message
                        if (App?.showNotification) {
                            App.showNotification('✅ Tarea marcada como completada', 'success');
                        }
                        
                        console.log('[CheckIn] Task completed during check-in:', taskId);
                    } else {
                        // Revert checkbox if task completion failed
                        e.target.checked = false;
                        if (App?.showNotification) {
                            App.showNotification('Error al completar la tarea', 'error');
                        }
                    }
                } else {
                    // Uncheck - revert task completion
                    const success = Tasks?.toggleTaskComplete?.(taskId);
                    
                    if (success !== false) {
                        // Visual feedback - restore pending state
                        taskRow.style.opacity = '1';
                        taskRow.style.background = '';
                        taskRow.style.textDecoration = 'none';
                        
                        completedCount = Math.max(0, completedCount - 1);
                        
                        // Update summary
                        updateModalSummary();
                        
                        if (App?.showNotification) {
                            App.showNotification('Tarea marcada como pendiente', 'info');
                        }
                    } else {
                        // Revert checkbox if operation failed
                        e.target.checked = true;
                    }
                }
            });
        });

        // Show completion feedback if any tasks were available
        if (checkboxes.length > 0) {
            const tipElement = document.querySelector('.text-yellow-700');
            if (tipElement) {
                tipElement.innerHTML = `
                    💡 <strong>Tip:</strong> Marca las tareas que completaste esta semana (${checkboxes.length} pendientes)
                `;
            }
        }
    }

    function updateModalSummary() {
        // Refresh the modal content to show updated numbers
        const tasks = Tasks?.getTasks ? Tasks.getTasks() : [];
        const completedTasks = tasks.filter(t => t.completed);
        const pendingTasks = tasks.filter(t => !t.completed);
        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
        
        const summaryElement = document.getElementById('weekSummary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <div class="text-xl font-bold">${totalTasks}</div>
                        <div class="text-xs">Total Tareas</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-green-600">${completedTasks.length}</div>
                        <div class="text-xs">Completadas</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-yellow-600">${pendingTasks.length}</div>
                        <div class="text-xs">Pendientes</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-blue-600">${completionRate}%</div>
                        <div class="text-xs">Completado</div>
                    </div>
                </div>
            `;
        }
    }

    function populateModalContent() {
        // Get current tasks and metrics
        const tasks = Tasks?.getTasks ? Tasks.getTasks() : [];
        const completedTasks = tasks.filter(t => t.completed);
        const pendingTasks = tasks.filter(t => !t.completed);

        // Populate week summary
        const summaryElement = document.getElementById('weekSummary');
        if (summaryElement) {
            const totalTasks = tasks.length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
            
            summaryElement.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <div class="text-xl font-bold">${totalTasks}</div>
                        <div class="text-xs">Total Tareas</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-green-600">${completedTasks.length}</div>
                        <div class="text-xs">Completadas</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-yellow-600">${pendingTasks.length}</div>
                        <div class="text-xs">Pendientes</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-blue-600">${completionRate}%</div>
                        <div class="text-xs">Completado</div>
                    </div>
                </div>
            `;
        }

        // Populate completed tasks
        const completedElement = document.getElementById('completedTasksList');
        if (completedElement) {
            if (completedTasks.length === 0) {
                completedElement.innerHTML = '<p class="text-sm text-gray-500 italic">No hay tareas completadas esta semana.</p>';
            } else {
                completedElement.innerHTML = completedTasks.map(task => `
                    <div class="flex items-center space-x-2 text-sm">
                        <span class="text-green-500">✓</span>
                        <span class="flex-1">${HabitusValidator.sanitizeHtml(task.description)}</span>
                        <span class="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">${task.role}</span>
                        <span class="text-xs text-gray-500">Q${task.quadrant}</span>
                    </div>
                `).join('');
            }
        }

        // Populate pending tasks with interactive checkboxes
        const pendingElement = document.getElementById('pendingTasksList');
        if (pendingElement) {
            if (pendingTasks.length === 0) {
                pendingElement.innerHTML = '<p class="text-sm text-gray-500 italic">¡Felicitaciones! No hay tareas pendientes.</p>';
            } else {
                pendingElement.innerHTML = `
                    <div class="mb-3">
                        <p class="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                            💡 <strong>Tip:</strong> Marca las tareas que completaste esta semana antes de finalizar el check-in
                        </p>
                    </div>
                    ${pendingTasks.map(task => `
                        <div class="flex items-center space-x-3 text-sm hover:bg-yellow-100 p-2 rounded transition-colors" data-task-id="${task.id}">
                            <input type="checkbox" 
                                   id="pending-task-${task.id}" 
                                   class="pending-task-checkbox w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500" 
                                   data-task-id="${task.id}">
                            <label for="pending-task-${task.id}" class="flex-1 cursor-pointer flex items-center justify-between">
                                <span class="flex-1">${HabitusValidator.sanitizeHtml(task.description)}</span>
                                <div class="flex items-center space-x-2 ml-2">
                                    <span class="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">${task.role}</span>
                                    <span class="text-xs text-gray-500">Q${task.quadrant}</span>
                                </div>
                            </label>
                        </div>
                    `).join('')}
                `;
                
                // Set up event listeners for task completion
                setupPendingTaskListeners();
            }
        }
    }

    function showModal() {
        if (checkInState.isModalOpen) return;

        const modal = createCheckInModal();
        populateModalContent();
        
        checkInState.isModalOpen = true;
        modal.style.display = 'flex';
        
        // Add entrance animation
        requestAnimationFrame(() => {
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            modal.style.transition = 'all 0.2s ease-out';
            
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
        });

        // Focus on reflection textarea
        setTimeout(() => {
            const textarea = document.getElementById('checkInReflection');
            if (textarea) textarea.focus();
        }, 300);

        HabitusConfig?.logger?.info('Check-in modal shown');
    }

    function hideModal() {
        if (!checkInState.isModalOpen) return;
        
        // Allow closing modal even if blocking, but keep the blocking state
        const modal = document.getElementById('checkInModal');
        if (modal) {
            // Clean up event listeners
            if (modal._escHandler) {
                document.removeEventListener('keydown', modal._escHandler);
            }
            
            modal.style.transition = 'all 0.2s ease-in';
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                modal.remove();
                checkInState.isModalOpen = false;
                saveState();
            }, 200);
        }

        HabitusConfig?.logger?.info('Check-in modal hidden', { 
            stillBlocking: checkInState.isBlocking,
            stillPending: checkInState.isPending 
        });
    }

    function postponeCheckIn() {
        if (checkInState.isBlocking) return;

        checkInState.reminderCount++;
        saveState();
        hideModal();

        // Show postpone message
        if (App?.showNotification) {
            App.showNotification('Check-in pospuesto. Te recordaremos mañana.', 'info');
        }

        HabitusConfig?.logger?.info('Check-in postponed');
    }

    function completeCheckIn() {
        const reflection = document.getElementById('checkInReflection')?.value || '';
        
        // Validate reflection if required
        const validation = HabitusValidator.validateReview(reflection);
        if (!validation.valid) {
            if (App?.showNotification) {
                App.showNotification(validation.error, 'error');
            }
            return;
        }

        // Save reflection
        if (reflection.trim()) {
            localStorage.setItem('habitus_lastReview', validation.data);
        }

        // Update check-in state
        checkInState.lastCheckIn = new Date();
        checkInState.isPending = false;
        checkInState.isBlocking = false;
        checkInState.reminderCount = 0;
        
        saveState();
        hideModal();

        // Start new week automatically after check-in completion
        console.log('[CheckIn] Starting new week after check-in completion...');
        if (Tasks?.startNewWeek) {
            try {
                Tasks.startNewWeek();
                console.log('[CheckIn] New week started successfully');
            } catch (error) {
                console.error('[CheckIn] Error starting new week:', error);
            }
        } else {
            console.warn('[CheckIn] Tasks.startNewWeek not available');
        }

        // Show success message
        if (App?.showNotification) {
            App.showNotification('Check-in completado. ¡Nueva semana iniciada!', 'success');
        }

        // Update UI to reflect new state
        updateUIElements();

        HabitusConfig?.logger?.info('Check-in completed successfully and new week started');
    }

    // UI Updates
    function updateUIElements() {
        updateButtons();
        // updateCheckInStatus(); // Removed to avoid duplicate messages
    }

    function updateButtons() {
        const checkInBtn = document.getElementById('checkInBtn');
        
        if (!checkInBtn) {
            console.warn('[CheckIn] checkInBtn element not found');
            return;
        }

        console.log('[CheckIn] Updating single button, isPending:', checkInState.isPending, 'isBlocking:', checkInState.isBlocking);

        if (checkInState.isPending) {
            // Check-in is pending: Show enabled button to perform check-in
            const urgencyClass = checkInState.isBlocking ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700';
            const urgencyText = checkInState.isBlocking ? '⚠️ Check-in Requerido' : '🎯 Realizar Check-in';
            
            checkInBtn.textContent = urgencyText;
            checkInBtn.className = `${urgencyClass} text-white text-sm font-medium px-4 py-3 rounded w-auto touch-manipulation`;
            checkInBtn.onclick = () => showModal();
            checkInBtn.disabled = false;
            
            console.log('[CheckIn] Button enabled for check-in:', urgencyText);
        } else {
            // No check-in pending: Show disabled status button
            checkInBtn.textContent = '✅ Check-in Completado';
            checkInBtn.className = 'bg-gray-400 text-white text-sm font-medium px-4 py-3 rounded w-auto disabled-status-btn';
            checkInBtn.onclick = null;
            checkInBtn.disabled = true;
            
            console.log('[CheckIn] Button disabled - check-in completed');
        }
    }

    function updateCheckInStatus() {
        console.log('[CheckIn] === UPDATE STATUS INDICATOR ===');
        console.log('[CheckIn] Current state:', { 
            isPending: checkInState.isPending, 
            isBlocking: checkInState.isBlocking 
        });
        
        // Update the status indicator in the check-in section
        let statusElement = document.getElementById('checkInStatusIndicator');
        
        console.log('[CheckIn] Status element found:', !!statusElement);
        
        if (!statusElement) {
            console.warn('[CheckIn] checkInStatusIndicator not found, searching alternatives...');
            // Try to find in the original location
            statusElement = document.getElementById('checkInStatus');
            console.log('[CheckIn] Alternative checkInStatus found:', !!statusElement);
        }
        
        if (!statusElement) {
            console.warn('[CheckIn] No status element found, attempting to create one...');
            // Create status element if it doesn't exist
            const checkInSection = document.querySelector('.bg-indigo-50.border-indigo-200');
            if (checkInSection) {
                const statusContainer = checkInSection.querySelector('[id*="checkIn"]') || 
                                      checkInSection.querySelector('.text-right') ||
                                      checkInSection;
                if (statusContainer) {
                    statusElement = document.createElement('div');
                    statusElement.id = 'checkInStatusIndicator';
                    statusElement.className = 'text-right';
                    statusContainer.appendChild(statusElement);
                    console.log('[CheckIn] Status element created dynamically');
                }
            }
        }

        if (statusElement) {
            console.log('[CheckIn] Updating status indicator, isPending:', checkInState.isPending, 'isBlocking:', checkInState.isBlocking);
            
            if (checkInState.isPending) {
                const daysSinceLastCheckIn = checkInState.lastCheckIn ? daysSince(checkInState.lastCheckIn) : 0;
                const urgencyLevel = checkInState.isBlocking ? 'urgent' : 'reminder';
                
                statusElement.innerHTML = `
                    <div class="inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        urgencyLevel === 'urgent' 
                            ? 'bg-red-100 text-red-800 checkin-status' 
                            : 'bg-yellow-100 text-yellow-800 checkin-status'
                    }">
                        <span class="mr-1">${urgencyLevel === 'urgent' ? '⚠️' : '🔔'}</span>
                        <span class="hidden sm:inline">Check-in</span>
                        ${urgencyLevel === 'urgent' ? 'requerido' : 'disponible'}
                        ${daysSinceLastCheckIn > 0 ? `<span class="ml-1 text-xs">(${daysSinceLastCheckIn}d)</span>` : ''}
                    </div>
                `;
                console.log('[CheckIn] ✅ Status updated to pending/required');
                console.log('[CheckIn] Status HTML:', statusElement.innerHTML.substring(0, 100) + '...');
            } else {
                // Status indicator removed to avoid duplicate "Check-in completado" message
                statusElement.innerHTML = '';
                console.log('[CheckIn] ✅ Status cleared - no duplicate message');
            }
        } else {
            console.error('[CheckIn] ❌ Could not find or create status indicator element');
        }
        
        console.log('[CheckIn] === STATUS UPDATE COMPLETE ===');
    }

    // Public API
    function init() {
        try {
            HabitusConfig?.logger?.info('Initializing CheckIn module...');
            
            loadState();
            
            // Check if check-in is required
            const isRequired = checkIfRequired();
            
            // Ensure UI elements exist and update them
            // Wait for DOM to be fully ready
            setTimeout(() => {
                console.log('[CheckIn] === INITIALIZING UI ===');
                console.log('[CheckIn] Current state on init:', { 
                    isPending: checkInState.isPending, 
                    isBlocking: checkInState.isBlocking 
                });
                
                // Update all UI elements
                updateUIElements();
                
                // Force individual updates to ensure everything is set correctly
                updateButtons();
                // updateCheckInStatus(); // Removed to avoid duplicate messages
                
                console.log('[CheckIn] UI initialization completed');
                
                // Show modal if required and should show reminder
                if (isRequired && (checkInState.isBlocking || shouldShowReminder())) {
                    // Additional delay to ensure UI is ready
                    setTimeout(() => {
                        showModal();
                    }, 500);
                }
            }, 100);
            
            HabitusConfig?.logger?.info('CheckIn module initialized', {
                ...checkInState,
                isRequired,
                uiElementsFound: {
                    newWeekBtn: !!document.getElementById('newWeekBtn'),
                    checkInBtn: !!document.getElementById('checkInBtn')
                }
            });
        } catch (error) {
            console.error('[CheckIn] Error during initialization:', error);
        }
    }

    // Cleanup
    function cleanup() {
        const modal = document.getElementById('checkInModal');
        if (modal) {
            modal.remove();
        }
        checkInState.isModalOpen = false;
    }

    // Public methods
    return {
        init,
        cleanup,
        showModal,
        hideModal,
        checkIfRequired,
        isActionBlocked,
        completeCheckIn,
        
        // Getters for external use
        get isPending() { return checkInState.isPending; },
        get isBlocking() { return checkInState.isBlocking; },
        get lastCheckIn() { return checkInState.lastCheckIn; },
        get state() { return { ...checkInState }; },
        
        // Force update for external triggers
        updateUI: updateUIElements,
        forceUIUpdate: () => {
            console.log('[CheckIn] Force updating UI...');
            updateButtons();
            updateCheckInStatus();
            console.log('[CheckIn] UI force update completed');
        },
        
        // Development helpers
        debug: {
            getState: () => checkInState,
            setState: (newState) => {
                console.log('[CheckIn Debug] Setting state:', newState);
                console.log('[CheckIn Debug] Previous state:', { ...checkInState });
                Object.assign(checkInState, newState);
                saveState();
                
                // Force immediate UI updates
                console.log('[CheckIn Debug] Forcing UI updates...');
                setTimeout(() => {
                    updateUIElements();
                    // Force additional status update for debugging
                    updateCheckInStatus();
                    console.log('[CheckIn Debug] UI updated, new state:', { ...checkInState });
                }, 50);
            },
            forceCheckIn: () => {
                console.log('[CheckIn Debug] Forcing check-in...');
                checkInState.isPending = true;
                checkInState.isBlocking = true;
                saveState();
                updateUIElements();
                showModal();
            },
            reset: () => {
                console.log('[CheckIn Debug] Resetting check-in state...');
                localStorage.removeItem(CONFIG.STORAGE_KEY);
                checkInState = {
                    lastCheckIn: null,
                    currentWeekStart: null,
                    isPending: false,
                    isModalOpen: false,
                    reminderCount: 0,
                    isBlocking: false
                };
                saveState();
                setTimeout(() => {
                    updateUIElements();
                    // Force status update after reset
                    updateCheckInStatus();
                    console.log('[CheckIn Debug] Reset complete, state:', { ...checkInState });
                }, 50);
            }
        }
    };
})();

// Make available globally
window.CheckIn = CheckIn;
