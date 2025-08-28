/**
 * Tasks Module
 * Handles task management functionality
 */
const Tasks = (() => {
    // Private state
    let tasks = [];
    let metrics = [];
    let tasksLog = [];
    let lastReviewText = '';
    let lastResetTime = null;

    // Chart instances with proper lifecycle management
    const chartInstances = new Map();
    
    // Chart configuration
    const CHART_CONFIG = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 200 // Faster animations to reduce memory pressure
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    usePointStyle: true,
                    padding: 15
                }
            }
        }
    };

    // DOM Elements
    const elements = {
        taskInput: null,
        roleSelect: null,
        goalSelect: null,
        quadrantSelect: null,
        addTaskBtn: null,
        rolesView: null,
        goalsView: null,
        quadrantsView: null,
        reviewInput: null,
        tabRoles: null,
        tabGoals: null,
        tabQuadrants: null
    };

    // Add these variables at the top of your file
    let longPressTimer = null;
    let isLongPress = false;
    const LONG_PRESS_DURATION = 500; // 500ms for long press

    // Add these variables at the top of the Tasks module
    let draggedTask = null;
    let dragStartY = 0;
    let initialScrollY = 0;
    let ghostElement = null;
    let autoScrollInterval = null;
    let lastTouchY = 0;
    const SCROLL_THRESHOLD = 80; // pixels from top/bottom to trigger scroll
    const SCROLL_SPEED = 15; // pixels per scroll interval
    const SCROLL_INTERVAL = 16; // ms between scrolls (roughly 60fps)
    const SCROLL_ACCELERATION = 1.5; // multiplier for scroll speed when holding at edge

    // Initialize tasks module
    function init() {
        try {
            console.log('[Tasks] Initializing module...');
            
            // Destroy existing charts before reinitializing
            destroyAllCharts();

            // Cache DOM elements
            elements.taskInput = document.getElementById('taskInput');
            elements.roleSelect = document.getElementById('roleSelect');
            elements.goalSelect = document.getElementById('goalSelect');
            elements.quadrantSelect = document.getElementById('quadrantSelect');
            elements.addTaskBtn = document.getElementById('addTaskBtn');
            elements.rolesView = document.getElementById('rolesView');
            elements.goalsView = document.getElementById('tasksGoalsView');
            elements.quadrantsView = document.getElementById('quadrantsView');
            elements.reviewInput = document.getElementById('reviewInput');
            elements.tabRoles = document.getElementById('tabRoles');
            elements.tabGoals = document.getElementById('tabGoals');
            elements.tabQuadrants = document.getElementById('tabQuadrants');

            // Load saved data
            loadData();
            
            // Migrate metrics data if needed
            migrateMetricsData();

            // Set up event listeners
            setupEventListeners();

            // Initialize charts with delay to ensure DOM is ready
            setTimeout(() => {
                initCharts();
                updateUI();
            }, 100);

            // Show roles view by default
            showRoles();

            // Initialize drag and drop
            initDragAndDrop();

            // Add cleanup listener for page unload
            window.addEventListener('beforeunload', () => {
                destroyAllCharts();
            });

            console.log('[Tasks] Module initialized successfully');
        } catch (error) {
            console.error('[Tasks] Error during initialization:', error);
        }

        // Add drag and drop event listeners to task lists
        document.querySelectorAll('.task-list').forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                list.classList.add('drag-over');
            });
            
            list.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                list.classList.remove('drag-over');
            });
            
            list.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                list.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const task = tasks.find(t => t.id === taskId);
                if (!task) return;

                const targetId = list.id;
                if (targetId.startsWith('role-')) {
                    task.role = targetId.replace('role-', '');
                } else if (targetId.startsWith('quadrant-')) {
                    task.quadrant = targetId.replace('quadrant-', '');
                }

                saveData();
                updateUI();
            });
        });
    }

    // Chart management utilities
    function createChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas ${canvasId} not found`);
            return null;
        }

        // Destroy existing chart if it exists
        destroyChart(canvasId);

        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error(`Could not get 2D context for ${canvasId}`);
                return null;
            }

            const chart = new window.Chart(ctx, {
                ...CHART_CONFIG,
                ...config
            });

            // Store chart instance
            chartInstances.set(canvasId, chart);
            
            console.log(`Chart ${canvasId} created successfully`);
            return chart;
        } catch (error) {
            console.error(`Error creating chart ${canvasId}:`, error);
            return null;
        }
    }

    function destroyChart(canvasId) {
        const chart = chartInstances.get(canvasId);
        if (chart) {
            try {
                chart.destroy();
                console.log(`Chart ${canvasId} destroyed`);
            } catch (error) {
                console.error(`Error destroying chart ${canvasId}:`, error);
            } finally {
                chartInstances.delete(canvasId);
            }
        }
    }

    function destroyAllCharts() {
        console.log('Destroying all charts...');
        const chartIds = Array.from(chartInstances.keys());
        chartIds.forEach(chartId => destroyChart(chartId));
        chartInstances.clear();
    }

    function updateChart(canvasId, newData) {
        const chart = chartInstances.get(canvasId);
        if (chart && !chart.destroyed) {
            try {
                if (newData.labels) chart.data.labels = newData.labels;
                if (newData.datasets) chart.data.datasets = newData.datasets;
                chart.update('none'); // Use 'none' mode for better performance
            } catch (error) {
                console.error(`Error updating chart ${canvasId}:`, error);
                // If update fails, recreate the chart
                setTimeout(() => initCharts(), 100);
            }
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add task button
        if (elements.addTaskBtn) {
            elements.addTaskBtn.addEventListener('click', addTask);
        }

        // Task input enter key
        if (elements.taskInput) {
            elements.taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addTask();
                }
            });
        }

        // Nueva Semana functionality now integrated into check-in flow

        // Review input change
        if (elements.reviewInput) {
            elements.reviewInput.addEventListener('change', saveReview);
        }

        // Tab buttons
        if (elements.tabRoles) {
            elements.tabRoles.addEventListener('click', showRoles);
        }
        if (elements.tabGoals) {
            elements.tabGoals.addEventListener('click', showGoals);
        }
        if (elements.tabQuadrants) {
            elements.tabQuadrants.addEventListener('click', showQuadrants);
        }

        // Role select change
        if (elements.roleSelect) {
            elements.roleSelect.addEventListener('change', () => {
                updateGoalOptions();
                updateUI();
            });
        }

        // Goal select change
        if (elements.goalSelect) {
            elements.goalSelect.addEventListener('change', () => {
                updateUI();
            });
        }
    }

    // Show roles view
    function showRoles() {
        if (elements.rolesView && elements.goalsView && elements.quadrantsView && elements.tabRoles && elements.tabGoals && elements.tabQuadrants) {
            elements.rolesView.classList.remove('hidden');
            elements.goalsView.classList.add('hidden');
            elements.quadrantsView.classList.add('hidden');
            elements.tabRoles.classList.add('border-indigo-500', 'text-gray-700');
            elements.tabRoles.classList.remove('border-transparent', 'text-gray-600');
            elements.tabGoals.classList.add('border-transparent', 'text-gray-600');
            elements.tabGoals.classList.remove('border-indigo-500', 'text-gray-700');
            elements.tabQuadrants.classList.add('border-transparent', 'text-gray-600');
            elements.tabQuadrants.classList.remove('border-indigo-500', 'text-gray-700');
        }
    }

    // Show goals view
    function showGoals() {
        if (elements.rolesView && elements.goalsView && elements.quadrantsView && elements.tabRoles && elements.tabGoals && elements.tabQuadrants) {
            elements.rolesView.classList.add('hidden');
            elements.goalsView.classList.remove('hidden');
            elements.quadrantsView.classList.add('hidden');
            elements.tabGoals.classList.add('border-indigo-500', 'text-gray-700');
            elements.tabGoals.classList.remove('border-transparent', 'text-gray-600');
            elements.tabRoles.classList.add('border-transparent', 'text-gray-600');
            elements.tabRoles.classList.remove('border-indigo-500', 'text-gray-700');
            elements.tabQuadrants.classList.add('border-transparent', 'text-gray-600');
            elements.tabQuadrants.classList.remove('border-indigo-500', 'text-gray-700');
        }
    }

    // Show quadrants view
    function showQuadrants() {
        if (elements.rolesView && elements.goalsView && elements.quadrantsView && elements.tabRoles && elements.tabGoals && elements.tabQuadrants) {
            elements.rolesView.classList.add('hidden');
            elements.goalsView.classList.add('hidden');
            elements.quadrantsView.classList.remove('hidden');
            elements.tabQuadrants.classList.add('border-indigo-500', 'text-gray-700');
            elements.tabQuadrants.classList.remove('border-transparent', 'text-gray-600');
            elements.tabRoles.classList.add('border-transparent', 'text-gray-600');
            elements.tabRoles.classList.remove('border-indigo-500', 'text-gray-700');
            elements.tabGoals.classList.add('border-transparent', 'text-gray-600');
            elements.tabGoals.classList.remove('border-indigo-500', 'text-gray-700');
        }
    }

    // Load data from localStorage
    function loadData() {
        const storedTasks = localStorage.getItem('habitus_tasks');
        const storedMetrics = localStorage.getItem('habitus_metrics');
        const storedTasksLog = localStorage.getItem('habitus_tasksLog');
        const storedLastReview = localStorage.getItem('habitus_lastReview');
        const storedLastReset = localStorage.getItem('habitus_lastReset');

        if (storedTasks) tasks = JSON.parse(storedTasks);
        if (storedMetrics) metrics = JSON.parse(storedMetrics);
        if (storedTasksLog) tasksLog = JSON.parse(storedTasksLog);
        if (storedLastReview) lastReviewText = storedLastReview;
        if (storedLastReset) lastResetTime = parseInt(storedLastReset);

        // Show last review if exists
        if (lastReviewText && lastReviewText.trim() !== '') {
            const lastReviewBox = document.getElementById('lastReviewBox');
            const lastReviewSpan = document.getElementById('lastReviewText');
            if (lastReviewBox && lastReviewSpan) {
                lastReviewBox.classList.remove('hidden');
                lastReviewSpan.textContent = lastReviewText;
            }
        }
    }

    // Update the migrateMetricsData function to be more robust
    function migrateMetricsData() {
        if (!metrics || !Array.isArray(metrics)) return;
        
        console.log('Original metrics before migration:', metrics);
        
        let needsMigration = false;
        const migratedMetrics = metrics.map(metric => {
            // Check if this is old format data (from version 1.0.0)
            const isOldFormat = metric.hasOwnProperty('porcentaje') || 
                              metric.hasOwnProperty('q1') || 
                              metric.hasOwnProperty('fecha');

            if (isOldFormat) {
                needsMigration = true;
                console.log('Found old format metric:', metric);
                
                // Convert old format to new format
                const newMetric = {
                    timestamp: metric.fecha ? new Date(metric.fecha).getTime() : Date.now(),
                    totalTasks: (metric.completadas || 0) + (metric.pendientes || 0),
                    completedTasks: metric.completadas || 0,
                    activeRoles: metric.roles || 0,
                    quadrants: [
                        parseInt(metric.q1) || 0,
                        parseInt(metric.q2) || 0,
                        parseInt(metric.q3) || 0,
                        parseInt(metric.q4) || 0
                    ],
                    review: metric.revision || ''
                };
                console.log('Converted to new format:', newMetric);
                return newMetric;
            }

            // Handle timestamp conversion for already migrated data
            let newTimestamp;
            if (metric.timestamp instanceof Date) {
                needsMigration = true;
                newTimestamp = metric.timestamp.getTime();
            } else if (typeof metric.timestamp === 'string') {
                needsMigration = true;
                const parsedDate = new Date(metric.timestamp);
                newTimestamp = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
            } else if (typeof metric.timestamp === 'number') {
                needsMigration = true;
                newTimestamp = metric.timestamp < 1000000000000 ? metric.timestamp * 1000 : metric.timestamp;
            } else {
                // Keep existing data if it's already in new format
                return metric;
            }

            return {
                ...metric,
                timestamp: newTimestamp
            };
        });

        if (needsMigration) {
            console.log('Migrated metrics:', migratedMetrics);
            metrics = migratedMetrics;
            saveData();
            App.showNotification(Translations.getTranslation('notifications.data_migrated'), 'success');
        }
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem('habitus_tasks', JSON.stringify(tasks));
        localStorage.setItem('habitus_metrics', JSON.stringify(metrics));
        localStorage.setItem('habitus_tasksLog', JSON.stringify(tasksLog));
        localStorage.setItem('habitus_lastReview', lastReviewText);
        localStorage.setItem('habitus_lastReset', JSON.stringify(lastResetTime));
    }

    // Initialize charts with improved error handling
    function initCharts() {
        try {
            console.log('[Charts] Initializing charts...');

            // Quadrants chart
            createChart('chartQuadrants', {
                type: 'bar',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{
                        label: 'Tareas',
                        data: countTasksByQuadrant(),
                        backgroundColor: ['#ef4444', '#22c55e', '#eab308', '#9ca3af']
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#374151' },
                            grid: { display: false }
                        },
                        y: { 
                            beginAtZero: true, 
                            ticks: { precision: 0, color: '#374151' },
                            grid: { color: '#e5e7eb' }
                        }
                    }
                }
            });

            // Completion chart
            createChart('chartCompletion', {
                type: 'doughnut',
                data: {
                    labels: [
                        Translations?.getTranslation?.('metric_completed') || 'Completed', 
                        Translations?.getTranslation?.('metric_pending') || 'Pending'
                    ],
                    datasets: [{
                        data: countCompletedPending(),
                        backgroundColor: ['#4ade80', '#f87171']
                    }]
                },
                options: {
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                        title: { display: false }
                    },
                    cutout: '70%'
                }
            });

            // Initialize historical charts
            const historicalData = prepareHistoricalData();

            // Historical completion chart
            createChart('chartHistoricalCompletion', {
                type: 'line',
                data: {
                    labels: historicalData.labels,
                    datasets: [{
                        label: Translations?.getTranslation?.('metric_percent') || 'Completion %',
                        data: historicalData.completionPercentages,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: value => value + '%'
                            }
                        }
                    }
                }
            });

            // Historical quadrants chart
            createChart('chartHistoricalQuadrants', {
                type: 'bar',
                data: {
                    labels: historicalData.labels,
                    datasets: [
                        {
                            label: 'Q1',
                            data: historicalData.q1Counts,
                            backgroundColor: '#ef4444'
                        },
                        {
                            label: 'Q2',
                            data: historicalData.q2Counts,
                            backgroundColor: '#22c55e'
                        },
                        {
                            label: 'Q3',
                            data: historicalData.q3Counts,
                            backgroundColor: '#eab308'
                        },
                        {
                            label: 'Q4',
                            data: historicalData.q4Counts,
                            backgroundColor: '#9ca3af'
                        }
                    ]
                },
                options: {
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                    }
                }
            });

            // Historical roles chart
            createChart('chartHistoricalRoles', {
                type: 'line',
                data: {
                    labels: historicalData.labels,
                    datasets: [{
                        label: Translations?.getTranslation?.('metric_roles') || 'Active Roles',
                        data: historicalData.activeRoles,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });

            console.log('[Charts] All charts initialized successfully');
        } catch (error) {
            console.error('[Charts] Error initializing charts:', error);
        }
    }

    // Update UI
    function updateUI() {
        console.log('[Tasks] updateUI called');
        console.log('[Tasks] Current tasks:', tasks);
        console.log('[Tasks] Available roles:', window.Roles ? window.Roles.getRoles() : 'Roles module not available');
        console.log('[Tasks] Available goals:', window.Goals ? window.Goals.getGoals() : 'Goals module not available');
        
        renderTasks();
        updateMetrics();
        updateCharts();
        updateHistoricalCharts();

        // Reinitialize drag and drop
        initDragAndDrop();
    }

    // Render tasks
    function renderTasks() {
        if (!elements.rolesView || !elements.goalsView || !elements.quadrantsView) return;

        // Use the new render functions that include drag & drop
        renderRoleList();
        renderGoalList();
        renderQuadrantList();
    }

    // Initialize drag and drop
    function initDragAndDrop() {
        document.querySelectorAll('.task-item').forEach(taskElement => {
            const handle = taskElement.querySelector('.drag-handle');
            if (!handle) return;

            let isDragging = false;
            let ghostElement = null;
            let startY = 0;
            let startX = 0;
            let originalScrollY = 0;
            let scrollLockHandler = null;
            let lastTouchY = 0;
            let scrollAcceleration = 1;
            let lastScrollTime = 0;

            function startAutoScroll() {
                if (autoScrollInterval) return;
                
                lastScrollTime = Date.now();
                autoScrollInterval = setInterval(() => {
                    if (!ghostElement) return;
                    
                    const ghostRect = ghostElement.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const currentTime = Date.now();
                    const timeSinceLastScroll = currentTime - lastScrollTime;
                    
                    // Calculate distance from top and bottom of viewport
                    const distanceFromTop = ghostRect.top;
                    const distanceFromBottom = viewportHeight - ghostRect.bottom;
                    
                    // Determine scroll direction and speed
                    let scrollDelta = 0;
                    if (distanceFromTop < SCROLL_THRESHOLD) {
                        // Scroll up with acceleration
                        scrollDelta = -SCROLL_SPEED * scrollAcceleration * (1 - distanceFromTop / SCROLL_THRESHOLD);
                        scrollAcceleration = Math.min(scrollAcceleration * SCROLL_ACCELERATION, 3);
                    } else if (distanceFromBottom < SCROLL_THRESHOLD) {
                        // Scroll down with acceleration
                        scrollDelta = SCROLL_SPEED * scrollAcceleration * (1 - distanceFromBottom / SCROLL_THRESHOLD);
                        scrollAcceleration = Math.min(scrollAcceleration * SCROLL_ACCELERATION, 3);
                    } else {
                        // Reset acceleration when not at edges
                        scrollAcceleration = 1;
                    }
                    
                    if (scrollDelta !== 0) {
                        // Smooth scroll with easing
                        const smoothScroll = scrollDelta * (timeSinceLastScroll / SCROLL_INTERVAL);
                        window.scrollBy(0, smoothScroll);
                        
                        // Update ghost position to account for scroll
                        if (ghostElement) {
                            const currentTop = parseInt(ghostElement.style.top);
                            ghostElement.style.top = `${currentTop + smoothScroll}px`;
                        }
                        
                        lastScrollTime = currentTime;
                    }
                }, SCROLL_INTERVAL);
            }

            function stopAutoScroll() {
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                    scrollAcceleration = 1;
                }
            }

            function handleDragMove(e, touch = false) {
                if (!isDragging) return;
                e.preventDefault();
                
                const clientY = touch ? e.touches[0].clientY : e.clientY;
                const clientX = touch ? e.touches[0].clientX : e.clientX;
                const deltaY = clientY - startY;
                lastTouchY = clientY;
                
                // Update ghost position
                if (ghostElement) {
                    const newTop = parseInt(ghostElement.style.top) + deltaY;
                    ghostElement.style.top = `${newTop}px`;
                    
                    // Check if we need to start auto-scrolling
                    const ghostRect = ghostElement.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    
                    if (ghostRect.top < SCROLL_THRESHOLD || 
                        (viewportHeight - ghostRect.bottom) < SCROLL_THRESHOLD) {
                        startAutoScroll();
                    } else {
                        stopAutoScroll();
                    }
                }
                startY = clientY;
                
                // Find and update drop target
                const dropTarget = findDropTarget(clientX, clientY);
                document.querySelectorAll('.task-list').forEach(el => {
                    el.classList.remove('drag-over');
                });
                if (dropTarget) {
                    dropTarget.classList.add('drag-over');
                }
            }

            function cleanupDrag() {
                if (!isDragging) return;
                
                // Stop auto-scrolling
                stopAutoScroll();
                
                // Remove scroll prevention
                if (scrollLockHandler) {
                    window.removeEventListener('scroll', scrollLockHandler);
                    scrollLockHandler = null;
                }
                
                // Restore body scroll
                document.body.classList.remove('dragging');
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.height = '';
                
                // Restore original element
                if (taskElement) {
                    taskElement.style.visibility = '';
                    taskElement.classList.remove('dragging');
                }
                
                // Cleanup ghost element
                if (ghostElement && ghostElement.parentNode) {
                    ghostElement.parentNode.removeChild(ghostElement);
                    ghostElement = null;
                }
                
                // Cleanup drop targets
                document.querySelectorAll('.task-list').forEach(el => {
                    el.classList.remove('drag-over');
                });
                
                isDragging = false;
            }

            function handleDrop(dropTarget) {
                if (!dropTarget || !dropTarget.classList.contains('task-list')) return;
                
                const taskId = taskElement.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (!task) return;

                const targetType = dropTarget.dataset.type;
                const targetValue = dropTarget.dataset.target;
                
                if (targetType === 'role' && task.role !== targetValue) {
                    task.role = targetValue;
                    saveData();
                    updateUI();
                } else if (targetType === 'quadrant' && task.quadrant !== targetValue) {
                    task.quadrant = targetValue;
                    saveData();
                    updateUI();
                }
            }

            function findDropTarget(x, y) {
                const elements = document.elementsFromPoint(x, y);
                return elements.find(el => el.classList.contains('task-list'));
            }

            function startDrag(e, touch = false) {
                if (e.target !== handle) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const clientY = touch ? e.touches[0].clientY : e.clientY;
                const clientX = touch ? e.touches[0].clientX : e.clientX;
                const rect = taskElement.getBoundingClientRect();
                
                startY = clientY;
                startX = clientX;
                originalScrollY = window.scrollY;
                
                // Create ghost
                ghostElement = taskElement.cloneNode(true);
                ghostElement.classList.add('task-ghost');
                ghostElement.style.position = 'fixed';
                ghostElement.style.width = `${rect.width}px`;
                ghostElement.style.height = `${rect.height}px`;
                ghostElement.style.left = `${rect.left}px`;
                ghostElement.style.top = `${rect.top}px`;
                ghostElement.style.zIndex = '1000';
                ghostElement.style.opacity = '0.8';
                ghostElement.style.pointerEvents = 'none';
                ghostElement.style.transform = 'translateZ(0)';
                document.body.appendChild(ghostElement);
                
                // Hide original element
                taskElement.style.visibility = 'hidden';
                
                // Prevent scrolling
                scrollLockHandler = () => {
                    window.scrollTo(0, originalScrollY);
                };
                
                // Lock body scroll
                document.body.classList.add('dragging');
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'relative';
                document.body.style.height = '100%';
                
                // Add scroll prevention
                window.addEventListener('scroll', scrollLockHandler, { passive: false });
                
                isDragging = true;
                taskElement.classList.add('dragging');

                return { clientY, clientX };
            }

            function endDrag(e, touch = false) {
                if (!isDragging) return;
                e.preventDefault();
                
                const clientX = touch ? e.changedTouches[0].clientX : e.clientX;
                const clientY = touch ? e.changedTouches[0].clientY : e.clientY;
                const dropTarget = findDropTarget(clientX, clientY);
                
                // Handle drop first
                handleDrop(dropTarget);
                
                // Then cleanup immediately
                cleanupDrag();
            }

            // Touch events
            handle.addEventListener('touchstart', function(e) {
                const coords = startDrag(e, true);
                if (!coords) return;

                function onTouchMove(e) {
                    handleDragMove(e, true);
                }

                function onTouchEnd(e) {
                    endDrag(e, true);
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                    document.removeEventListener('touchcancel', onTouchCancel);
                }

                function onTouchCancel(e) {
                    cleanupDrag();
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                    document.removeEventListener('touchcancel', onTouchCancel);
                }

                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
                document.addEventListener('touchcancel', onTouchCancel);
            }, { passive: false });

            // Mouse events
            handle.addEventListener('mousedown', function(e) {
                const coords = startDrag(e);
                if (!coords) return;

                function onMouseMove(e) {
                    handleDragMove(e);
                }

                function onMouseUp(e) {
                    endDrag(e);
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.removeEventListener('mouseleave', onMouseLeave);
                }

                function onMouseLeave(e) {
                    cleanupDrag();
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.removeEventListener('mouseleave', onMouseLeave);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('mouseleave', onMouseLeave);
            });
        });
    }

    // Add a new task with robust validation
    function addTask(taskData = null) {
        let finalTaskData;
        
        if (taskData) {
            // Called from external module (e.g., Perhaps)
            finalTaskData = {
                description: taskData.description || '',
                role: taskData.role || '',
                goal: taskData.goal || '',
                quadrant: taskData.quadrant || '2',
                completed: false
            };
        } else {
            // Called from UI form
            if (!elements.taskInput || !elements.goalSelect || !elements.quadrantSelect) return;

            // Get goal to determine role
            const goal = window.Goals ? window.Goals.getGoalById(elements.goalSelect.value) : null;
            if (!goal) {
                if (window.App && window.App.showNotification) {
                    window.App.showNotification('Debes seleccionar una meta válida', 'error');
                }
                return;
            }

            finalTaskData = {
                description: elements.taskInput.value,
                role: goal.role, // Role is inferred from goal
                goal: elements.goalSelect.value,
                quadrant: elements.quadrantSelect.value,
                completed: false
            };
        }

        // Validate task data
        const validation = window.HabitusValidator ? window.HabitusValidator.validateTask(finalTaskData) : { valid: true, data: finalTaskData };
        
        if (!validation.valid) {
            const errorMessage = validation.errors?.[0]?.error || 'Datos de tarea inválidos';
            if (window.App && window.App.showNotification) {
                window.App.showNotification(errorMessage, 'error');
            }
            
            // Log validation errors for debugging
            if (window.HabitusConfig?.debug?.enabled) {
                console.error('Task validation failed:', validation.errors);
            }
            return;
        }

        // Use validated and sanitized data
        const newTask = {
            ...validation.data,
            id: window.HabitusValidator ? window.HabitusValidator.generateSecureId() : Date.now().toString(36) + Math.random().toString(36).substr(2)
        };
        
        tasks.push(newTask);
        saveData();
        
        // Only update UI elements if called from form
        if (!taskData) {
            // Clear inputs
            elements.taskInput.value = '';
            elements.goalSelect.value = '';
            elements.quadrantSelect.value = '';
        }
        
        updateUI();

        // Show success notification only if called from form
        if (!taskData) {
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Tarea agregada exitosamente', 'success');
            }
        }
        
        return newTask; // Return the created task for external callers
    }

    // Toggle task completion
    function toggleTaskComplete(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;
        saveData();
        updateUI();

        // Show success notification
        if (window.App && window.App.showNotification) {
            const message = task.completed ? 'Tarea completada' : 'Tarea desmarcada';
            window.App.showNotification(message, 'success');
        }
    }

    // Delete a task
    function deleteTask(taskId) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        tasks.splice(taskIndex, 1);
        saveData();
        updateUI();

        // Show success notification
        if (window.App && window.App.showNotification) {
            window.App.showNotification('Tarea eliminada exitosamente', 'success');
        }
    }

    // Save review
    function saveReview() {
        if (!elements.reviewInput) return;

        lastReviewText = elements.reviewInput.value.trim();
        saveData();

        // Show success notification
        if (window.App && window.App.showNotification) {
            window.App.showNotification('Revisión guardada exitosamente', 'success');
        }
    }

    // Start new week with check-in integration
    function startNewWeek() {
        // Check if check-in is required before starting new week
        if (window.CheckIn && window.CheckIn.isPending && window.CheckIn.isBlocking) {
            window.CheckIn.showModal();
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Debes completar el check-in antes de iniciar una nueva semana', 'warning');
            }
            return;
        }

        // Check if action is blocked
        if (CheckIn && CheckIn.isActionBlocked('newWeek')) {
            CheckIn.showModal();
            App.showNotification('Completa el check-in semanal para continuar', 'warning');
            return;
        }

        // Check if a week has passed since last reset
        if (lastResetTime) {
            const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            const timeSinceLastReset = Date.now() - lastResetTime;
            
            if (timeSinceLastReset < oneWeekInMs) {
                const daysLeft = Math.ceil((oneWeekInMs - timeSinceLastReset) / (24 * 60 * 60 * 1000));
                const message = window.Translations && window.Translations.getCurrentLanguage ? 
                    (window.Translations.getCurrentLanguage() === 'es' 
                        ? `Han pasado menos de 7 días desde la última vez. ¿Estás seguro de que quieres empezar una nueva semana? (Faltan ${daysLeft} días)`
                        : `Less than 7 days have passed since last time. Are you sure you want to start a new week? (${daysLeft} days left)`)
                    : `Han pasado menos de 7 días desde la última vez. ¿Estás seguro de que quieres empezar una nueva semana? (Faltan ${daysLeft} días)`;
                
                if (!confirm(message)) {
                    return;
                }
            }
        }

        // Save current review text as last review if it exists
        if (elements.reviewInput && elements.reviewInput.value.trim()) {
            lastReviewText = elements.reviewInput.value.trim();
            const lastReviewBox = document.getElementById('lastReviewBox');
            const lastReviewSpan = document.getElementById('lastReviewText');
            if (lastReviewBox && lastReviewSpan) {
                lastReviewBox.classList.remove('hidden');
                lastReviewSpan.textContent = lastReviewText;
            }
        }

        // Save current week's data
        const weekMetrics = {
            timestamp: Date.now(),
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.completed).length,
            activeRoles: Roles.getRoles().length,
            quadrants: countTasksByQuadrant()
        };
        metrics.push(weekMetrics);

        // Log completed tasks
        const completedTasks = tasks.filter(t => t.completed);
        if (completedTasks.length > 0) {
            tasksLog.push({
                timestamp: Date.now(),
                tasks: completedTasks
            });
        }

        // Remove completed tasks
        tasks = tasks.filter(t => !t.completed);

        // Clear review input
        if (elements.reviewInput) {
            elements.reviewInput.value = '';
        }

        // Update last reset time
        lastResetTime = Date.now();

        // Save data
        saveData();
        updateUI();

        // Show success notification
        if (window.App && window.App.showNotification) {
            const message = window.Translations && window.Translations.getTranslation ? 
                window.Translations.getTranslation('notifications.new_week_started') : 
                'Nueva semana iniciada exitosamente';
            window.App.showNotification(message, 'success');
        }
    }

    // Count tasks by quadrant
    function countTasksByQuadrant() {
        const counts = [0, 0, 0, 0];
        tasks.forEach(task => {
            const quadrant = parseInt(task.quadrant) - 1;
            if (quadrant >= 0 && quadrant < 4) {
                counts[quadrant]++;
            }
        });
        return counts;
    }

    // Count completed and pending tasks
    function countCompletedPending() {
        const completed = tasks.filter(t => t.completed).length;
        const pending = tasks.length - completed;
        return [completed, pending];
    }

    // Update the prepareHistoricalData function
    function prepareHistoricalData() {
        // Ensure metrics are migrated
        migrateMetricsData();
        
        console.log('Preparing historical data with metrics:', metrics);
        
        const labels = metrics.map(m => {
            try {
                const timestamp = typeof m.timestamp === 'string' ? 
                    parseInt(m.timestamp) : 
                    m.timestamp;
                
                if (isNaN(timestamp)) {
                    console.error('Invalid timestamp:', m.timestamp);
                    return 'Invalid Date';
                }
                
                const date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                    console.error('Invalid date from timestamp:', timestamp);
                    return 'Invalid Date';
                }
                
                return date.toLocaleDateString();
            } catch (error) {
                console.error('Error processing date:', error);
                return 'Invalid Date';
            }
        });
        
        console.log('Generated labels:', labels);
        
        // Handle both old and new format for completion percentages
        const completionPercentages = metrics.map(m => {
            if (m.hasOwnProperty('porcentaje')) {
                // Old format
                return parseInt(m.porcentaje.replace('%', '')) || 0;
            } else {
                // New format
                return m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;
            }
        });
        
        // Safely get quadrant counts with fallback to zeros
        const getQuadrantCounts = (m) => {
            if (m.hasOwnProperty('q1')) {
                // Old format
                return [
                    parseInt(m.q1) || 0,
                    parseInt(m.q2) || 0,
                    parseInt(m.q3) || 0,
                    parseInt(m.q4) || 0
                ];
            } else if (m.quadrants && Array.isArray(m.quadrants)) {
                // New format
                return [
                    m.quadrants[0] || 0,
                    m.quadrants[1] || 0,
                    m.quadrants[2] || 0,
                    m.quadrants[3] || 0
                ];
            }
            return [0, 0, 0, 0];
        };

        const q1Counts = metrics.map(m => getQuadrantCounts(m)[0]);
        const q2Counts = metrics.map(m => getQuadrantCounts(m)[1]);
        const q3Counts = metrics.map(m => getQuadrantCounts(m)[2]);
        const q4Counts = metrics.map(m => getQuadrantCounts(m)[3]);
        
        // Handle both old and new format for active roles
        const activeRoles = metrics.map(m => m.hasOwnProperty('roles') ? m.roles : (m.activeRoles || 0));

        return {
            labels,
            completionPercentages,
            q1Counts,
            q2Counts,
            q3Counts,
            q4Counts,
            activeRoles
        };
    }

    // Update metrics
    function updateMetrics() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const completionPercentage = totalTasks > 0 ? 
            Math.round((completedTasks / totalTasks) * 100) : 0;
        const activeRoles = Roles.getRoles().length;
        const quadrants = countTasksByQuadrant();

        // Update metrics display
        const totalTasksEl = document.getElementById('totalTasks');
        const completionPercentageEl = document.getElementById('completionPercentage');
        const activeRolesEl = document.getElementById('activeRoles');
        const q1CountEl = document.getElementById('q1Count');
        const q2CountEl = document.getElementById('q2Count');
        const q3CountEl = document.getElementById('q3Count');
        const q4CountEl = document.getElementById('q4Count');
        const focusQuadrantEl = document.getElementById('focusQuadrant');

        if (totalTasksEl) totalTasksEl.textContent = totalTasks;
        if (completionPercentageEl) completionPercentageEl.textContent = completionPercentage + '%';
        if (activeRolesEl) activeRolesEl.textContent = activeRoles;
        if (q1CountEl) q1CountEl.textContent = quadrants[0];
        if (q2CountEl) q2CountEl.textContent = quadrants[1];
        if (q3CountEl) q3CountEl.textContent = quadrants[2];
        if (q4CountEl) q4CountEl.textContent = quadrants[3];

        // Update focus quadrant (the one with most tasks)
        const maxQuadrant = quadrants.indexOf(Math.max(...quadrants)) + 1;
        if (focusQuadrantEl) focusQuadrantEl.textContent = `Q${maxQuadrant}`;

        // Update productivity insights
        updateProductivityInsights(totalTasks, completedTasks, completionPercentage, quadrants, activeRoles);
    }

    // Generate dynamic productivity insights
    function updateProductivityInsights(totalTasks, completedTasks, completionPercentage, quadrants, activeRoles) {
        const insightsEl = document.getElementById('productivityInsights');
        if (!insightsEl) return;

        const insights = [];
        const pendingTasks = totalTasks - completedTasks;

        // Performance insights
        if (completionPercentage >= 80) {
            insights.push('🌟 <strong>Excelente!</strong> Tienes un alto índice de completación');
        } else if (completionPercentage >= 60) {
            insights.push('👍 <strong>Buen progreso!</strong> Vas por buen camino');
        } else if (completionPercentage >= 40) {
            insights.push('📈 <strong>Progresando</strong> - Considera priorizar tareas importantes');
        } else if (totalTasks > 0) {
            insights.push('⚡ <strong>Acelera!</strong> - Enfócate en completar tareas pendientes');
        }

        // Quadrant insights
        const [q1, q2, q3, q4] = quadrants;
        if (q1 > totalTasks * 0.3) {
            insights.push('🚨 <strong>Muchas crisis!</strong> - Planifica mejor para reducir urgencias');
        } else if (q2 > totalTasks * 0.4) {
            insights.push('🎯 <strong>Perfecto!</strong> - Te enfocas en lo importante sin urgencia');
        } else if (q3 > totalTasks * 0.3) {
            insights.push('📧 <strong>Muchas interrupciones</strong> - Considera delegar o automatizar');
        } else if (q4 > totalTasks * 0.2) {
            insights.push('🚫 <strong>Elimina distracciones</strong> - Hay demasiadas tareas no importantes');
        }

        // Balance insights
        if (activeRoles > 4) {
            insights.push('👥 <strong>Muchos roles activos</strong> - Considera consolidar responsabilidades');
        } else if (activeRoles === 1) {
            insights.push('🔍 <strong>Enfoque único</strong> - Buen balance en un solo rol');
        }

        // Workload insights
        if (totalTasks > 15) {
            insights.push('📋 <strong>Carga alta</strong> - Considera dividir tareas grandes');
        } else if (totalTasks < 5 && totalTasks > 0) {
            insights.push('🎯 <strong>Carga ligera</strong> - Perfecto para calidad sobre cantidad');
        } else if (totalTasks === 0) {
            insights.push('🏁 <strong>¡Sin tareas!</strong> - Tiempo de planificar la siguiente semana');
        }

        // Completion momentum
        if (pendingTasks === 0 && totalTasks > 0) {
            insights.push('🏆 <strong>¡Semana completada!</strong> - Excelente gestión del tiempo');
        } else if (pendingTasks <= 2 && totalTasks > 5) {
            insights.push('🔥 <strong>A punto de terminar!</strong> - Solo quedan ' + pendingTasks + ' tareas');
        }

        // Show insights
        if (insights.length === 0) {
            insights.push('📊 Agrega tareas para obtener insights personalizados');
        }

        const insightContent = insights.slice(0, 3).map(insight => 
            `<div class="text-xs text-indigo-700 mb-1">${insight}</div>`
        ).join('');

        insightsEl.innerHTML = `
            <h3 class="text-sm font-medium text-indigo-800 mb-2 flex items-center">
                <span class="mr-1">🧠</span>
                Insights de Productividad
            </h3>
            ${insightContent}
        `;
    }

    // Update charts with new data
    function updateCharts() {
        try {
            updateChart('chartQuadrants', {
                datasets: [{
                    label: 'Tareas',
                    data: countTasksByQuadrant(),
                    backgroundColor: ['#ef4444', '#22c55e', '#eab308', '#9ca3af']
                }]
            });

            updateChart('chartCompletion', {
                datasets: [{
                    data: countCompletedPending(),
                    backgroundColor: ['#4ade80', '#f87171']
                }]
            });
        } catch (error) {
            console.error('[Charts] Error updating charts:', error);
            // Fallback: reinitialize charts if update fails
            setTimeout(() => initCharts(), 100);
        }
    }

    // Update historical charts
    function updateHistoricalCharts() {
        try {
            const historicalData = prepareHistoricalData();

            updateChart('chartHistoricalCompletion', {
                labels: historicalData.labels,
                datasets: [{
                    label: Translations?.getTranslation?.('metric_percent') || 'Completion %',
                    data: historicalData.completionPercentages,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            });

            updateChart('chartHistoricalQuadrants', {
                labels: historicalData.labels,
                datasets: [
                    {
                        label: 'Q1',
                        data: historicalData.q1Counts,
                        backgroundColor: '#ef4444'
                    },
                    {
                        label: 'Q2',
                        data: historicalData.q2Counts,
                        backgroundColor: '#22c55e'
                    },
                    {
                        label: 'Q3',
                        data: historicalData.q3Counts,
                        backgroundColor: '#eab308'
                    },
                    {
                        label: 'Q4',
                        data: historicalData.q4Counts,
                        backgroundColor: '#9ca3af'
                    }
                ]
            });

            updateChart('chartHistoricalRoles', {
                labels: historicalData.labels,
                datasets: [{
                    label: Translations?.getTranslation?.('metric_roles') || 'Active Roles',
                    data: historicalData.activeRoles,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            });
        } catch (error) {
            console.error('[Charts] Error updating historical charts:', error);
            // Fallback: reinitialize charts if update fails
            setTimeout(() => initCharts(), 100);
        }
    }

    // Legacy export functions (deprecated - use Migration module instead)
    function exportMetrics() {
        console.warn('[Tasks] exportMetrics is deprecated. Use Migration.exportCompleteData() instead.');
        if (Migration && Migration.exportCompleteData) {
            Migration.exportCompleteData();
        } else {
            // Fallback to old implementation
            const headers = ['Week', 'Total Tasks', 'Completed Tasks', 'Completion %', 'Active Roles', 'Q1', 'Q2', 'Q3', 'Q4'];
            const rows = metrics.map(m => [
                new Date(m.timestamp).toLocaleDateString(),
                m.totalTasks,
                m.completedTasks,
                m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0,
                m.activeRoles,
                m.quadrants[0],
                m.quadrants[1],
                m.quadrants[2],
                m.quadrants[3]
            ]);

            const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
            downloadCSV(csv, 'habitus-metrics.csv');
        }
    }

    // Export tasks to CSV
    function exportTasks() {
        const headers = ['Week', 'Task', 'Role', 'Quadrant', 'Status', 'Created At'];
        const rows = tasksLog.flatMap(log => 
            log.tasks.map(task => [
                new Date(log.timestamp).toLocaleDateString(),
                task.description,
                task.role,
                task.quadrant,
                task.completed ? 'Completed' : 'Pending',
                new Date(task.createdAt).toLocaleString()
            ])
        );

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        downloadCSV(csv, 'habitus-tasks.csv');
    }

    // Download CSV file
    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Add a function to manually trigger migration and debug
    function debugMetricsData() {
        console.log('Current metrics data:', metrics);
        console.log('Metrics data type:', typeof metrics);
        console.log('Is array:', Array.isArray(metrics));
        if (Array.isArray(metrics)) {
            metrics.forEach((m, i) => {
                console.log(`Metric ${i}:`, m);
                console.log(`Timestamp ${i}:`, m.timestamp);
                console.log(`Timestamp type ${i}:`, typeof m.timestamp);
            });
        }
        migrateMetricsData();
        console.log('Migrated metrics data:', metrics);
    }

    // Update goal select options - show all goals
    function updateGoalOptions() {
        console.log('[Tasks] updateGoalOptions called');
        
        // Try to find goalSelect element if not cached
        let goalSelect = elements.goalSelect;
        if (!goalSelect) {
            goalSelect = document.querySelector('#goalSelect');
            if (goalSelect) {
                elements.goalSelect = goalSelect;
                console.log('[Tasks] Found goalSelect element and cached it');
            }
        }
        
        if (!goalSelect) {
            console.error('[Tasks] goalSelect element not found in DOM');
            return;
        }

        console.log('[Tasks] Clearing current goal options...');
        // Clear current options except placeholder
        goalSelect.innerHTML = '<option value="" disabled selected>Meta</option>';
        
        // Get all goals
        const goals = Goals.getGoals();
        console.log('[Tasks] Found goals:', goals);
        
        goals.forEach(goal => {
            const opt = document.createElement('option');
            opt.value = goal.id;
            opt.textContent = `${goal.name} (${goal.role})`;
            goalSelect.appendChild(opt);
            console.log('[Tasks] Added goal option:', goal.name, '(', goal.role, ')');
        });
        
        console.log('[Tasks] Goal options updated. Total options:', goalSelect.options.length);
        
        // Also update the UI to reflect changes
        setTimeout(() => {
            updateUI();
        }, 50);
    }

    // Check if a goal has associated tasks
    function hasTasksForGoal(goalId) {
        return tasks.some(task => task.goal === goalId);
    }

    // Get task by ID
    function getTask(taskId) {
        return tasks.find(t => t.id === taskId);
    }

    // Render individual task HTML
    function renderTask(task) {
        const quadrantClass = `q${task.quadrant}`;
        
        // Get goal information
        let goalName = 'Meta no encontrada';
        let goalColor = '#6B7280';
        
        if (window.Goals && window.Goals.getGoalById) {
            const goal = window.Goals.getGoalById(task.goal);
            if (goal) {
                goalName = goal.name;
                goalColor = goal.color;
            }
        }
        
        return `
            <div class="task-item ${quadrantClass} border rounded shadow-sm p-3 mb-2 cursor-move" 
                 draggable="true"
                 data-task-id="${task.id}" 
                 data-role="${task.role}" 
                 data-goal="${task.goal}"
                 data-quadrant="${task.quadrant}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" 
                               ${task.completed ? 'checked' : ''} 
                               onchange="Tasks.toggleTaskComplete('${task.id}')"
                               class="rounded">
                        <span class="${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}">${task.description}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="inline-block px-2 py-1 rounded-full text-white text-xs" style="background-color: ${goalColor}">
                            ${goalName}
                        </span>
                        <button onclick="Tasks.deleteTask('${task.id}')" 
                                class="text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Move tasks to default goal when a goal is deleted
    function moveTasksToDefaultGoal(oldGoalId, role) {
        console.log('[Tasks] moveTasksToDefaultGoal called with:', { oldGoalId, role });
        
        const defaultGoal = window.Goals ? window.Goals.getDefaultGoalForRole(role) : null;
        console.log('[Tasks] Default goal found:', defaultGoal);
        
        if (!defaultGoal) {
            console.error('[Tasks] No default goal found for role:', role);
            return;
        }

        let movedCount = 0;
        tasks.forEach(task => {
            if (task.goal === oldGoalId) {
                task.goal = defaultGoal.id;
                movedCount++;
                console.log('[Tasks] Moved task:', task.description, 'to default goal:', defaultGoal.name);
            }
        });

        console.log('[Tasks] Moved', movedCount, 'tasks to default goal');
        saveData();
        updateUI();
    }

    // Setup drag and drop for tasks
    function setupTaskDragAndDrop() {
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach(taskItem => {
            taskItem.addEventListener('dragstart', handleTaskDragStart);
            taskItem.addEventListener('dragend', handleTaskDragEnd);
        });
    }

    // Handle task drag start
    function handleTaskDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
        event.target.classList.add('opacity-50');
        console.log(`[DEBUG] Started dragging task ${event.target.dataset.taskId}`);
    }

    // Handle task drag end
    function handleTaskDragEnd(event) {
        event.target.classList.remove('opacity-50');
        console.log(`[DEBUG] Finished dragging task ${event.target.dataset.taskId}`);
    }

    // Handle drag over for drop zones
    function handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
    }

    // Handle drop for tasks
    function handleDrop(event) {
        event.preventDefault();
        const dropZone = event.currentTarget;
        dropZone.classList.remove('bg-blue-50', 'border-blue-300');
        
        const taskId = event.dataTransfer.getData('text/plain');
        const task = getTask(taskId);
        
        if (!task) {
            console.error(`[ERROR] Task ${taskId} not found`);
            return;
        }
        
        console.log(`[DEBUG] Dropping task ${taskId} into drop zone:`, dropZone.dataset);
        
        // Handle dropping into goal section
        if (dropZone.dataset.goalId) {
            const newGoalId = dropZone.dataset.goalId;
            if (task.goal !== newGoalId) {
                console.log(`[DEBUG] Moving task ${taskId} from goal ${task.goal} to goal ${newGoalId}`);
                task.goal = newGoalId;
                
                // Update task role based on new goal
                if (window.Goals && window.Goals.getGoalById) {
                    const newGoal = window.Goals.getGoalById(newGoalId);
                    if (newGoal) {
                        task.role = newGoal.role;
                        console.log(`[DEBUG] Updated task ${taskId} role to ${newGoal.role}`);
                    }
                }
                
                saveData();
                updateUI();
            }
        }
        
        // Handle dropping into quadrant section
        if (dropZone.dataset.quadrantId) {
            const newQuadrantId = parseInt(dropZone.dataset.quadrantId);
            if (task.quadrant !== newQuadrantId) {
                console.log(`[DEBUG] Moving task ${taskId} from quadrant ${task.quadrant} to quadrant ${newQuadrantId}`);
                task.quadrant = newQuadrantId;
                saveData();
                updateUI();
            }
        }
        
        // Handle dropping into role section
        if (dropZone.dataset.roleId) {
            const newRoleId = dropZone.dataset.roleId;
            if (task.role !== newRoleId) {
                console.log(`[DEBUG] Moving task ${taskId} from role ${newRoleId} to role ${newRoleId}`);
                task.role = newRoleId;
                
                // Update task goal to default goal for new role
                if (window.Goals && window.Goals.getDefaultGoalForRole) {
                    const defaultGoal = window.Goals.getDefaultGoalForRole(newRoleId);
                    if (defaultGoal) {
                        task.goal = defaultGoal.id;
                        console.log(`[DEBUG] Updated task ${taskId} goal to default goal ${defaultGoal.id}`);
                    }
                }
                
                saveData();
                updateUI();
            }
        }
    }

    // Render tasks grouped by role
    function renderRoleList() {
        console.log('[Tasks] renderRoleList called');
        if (!elements.rolesView) {
            console.log('[Tasks] rolesView element not found');
            return;
        }

        elements.rolesView.innerHTML = '';

        // Get all available roles from the Roles module
        const availableRoles = window.Roles ? window.Roles.getRoles() : [];
        console.log('[Tasks] Available roles:', availableRoles);
        
        if (availableRoles.length === 0) {
            console.log('[Tasks] No roles available');
            elements.rolesView.innerHTML = '<div class="empty-state"><p>No hay roles definidos</p></div>';
            return;
        }

        // Show message if no tasks exist
        if (tasks.length === 0) {
            console.log('[Tasks] No tasks available');
            elements.rolesView.innerHTML = '<div class="empty-state"><p>No hay tareas definidas. Crea algunas tareas para verlas organizadas por roles.</p></div>';
            return;
        }

        // Group tasks by role
        const tasksByRole = {};
        tasks.forEach(task => {
            if (!tasksByRole[task.role]) {
                tasksByRole[task.role] = [];
            }
            tasksByRole[task.role].push(task);
        });

        // Render all roles, even if they have no tasks
        availableRoles.forEach(role => {
            const roleTasks = tasksByRole[role] || [];
            
            const roleSection = document.createElement('div');
            roleSection.className = 'mb-4';
            
            const roleHeader = document.createElement('h3');
            roleHeader.className = 'text-lg font-semibold text-gray-700 mb-3 flex items-center';
            roleHeader.innerHTML = `
                <span class="mr-2">🎭</span>
                ${role}
            `;
            
            roleSection.appendChild(roleHeader);

            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks-container drop-zone';
            tasksContainer.setAttribute('data-role-id', role);
            tasksContainer.setAttribute('ondragover', 'Tasks.handleDragOver(event)');
            tasksContainer.setAttribute('ondrop', 'Tasks.handleDrop(event)');
            
            if (roleTasks.length === 0) {
                tasksContainer.innerHTML = '<div class="empty-state"><p>Sin tareas asignadas</p></div>';
            } else {
                roleTasks.forEach(task => {
                    const taskElement = document.createElement('div');
                    taskElement.innerHTML = renderTask(task);
                    tasksContainer.appendChild(taskElement);
                });
            }
            
            roleSection.appendChild(tasksContainer);
            elements.rolesView.appendChild(roleSection);
        });
    }

    // Render tasks grouped by quadrant
    function renderQuadrantList() {
        if (!elements.quadrantsView) return;

        elements.quadrantsView.innerHTML = '';

        // Show message if no tasks exist
        if (tasks.length === 0) {
            elements.quadrantsView.innerHTML = '<div class="empty-state"><p>No hay tareas definidas. Crea algunas tareas para verlas organizadas por cuadrantes.</p></div>';
            return;
        }

        const quadrants = [
            { id: 1, name: 'Urgente e Importante', class: 'q1' },
            { id: 2, name: 'Importante, no Urgente', class: 'q2' },
            { id: 3, name: 'Urgente, no Importante', class: 'q3' },
            { id: 4, name: 'Ni Urgente ni Importante', class: 'q4' }
        ];

        // Render all quadrants, even if they have no tasks
        quadrants.forEach(quadrant => {
            // Try both string and number comparison for quadrant
            const quadrantTasks = tasks.filter(t => {
                const taskQuadrant = parseInt(t.quadrant) || t.quadrant;
                return taskQuadrant === quadrant.id;
            });
            
            const quadrantSection = document.createElement('div');
            quadrantSection.className = `quadrant-section mb-6 p-4 border rounded-lg ${quadrant.class}`;
            
            const quadrantHeader = document.createElement('h4');
            quadrantHeader.className = 'text-md font-medium mb-3';
            quadrantHeader.textContent = `${quadrant.name} (${quadrantTasks.length} tareas)`;
            
            quadrantSection.appendChild(quadrantHeader);

            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks-container drop-zone';
            tasksContainer.setAttribute('data-quadrant-id', quadrant.id);
            tasksContainer.setAttribute('ondragover', 'Tasks.handleDragOver(event)');
            tasksContainer.setAttribute('ondrop', 'Tasks.handleDrop(event)');
            
            if (quadrantTasks.length === 0) {
                tasksContainer.innerHTML = '<div class="empty-state"><p>Sin tareas asignadas</p></div>';
            } else {
                quadrantTasks.forEach(task => {
                    const taskElement = document.createElement('div');
                    taskElement.innerHTML = renderTask(task);
                    tasksContainer.appendChild(taskElement);
                });
            }
            
            quadrantSection.appendChild(tasksContainer);
            elements.quadrantsView.appendChild(quadrantSection);
        });
        
        setupTaskDragAndDrop();
    }

    // Render tasks grouped by goals
    function renderGoalList() {
        if (!elements.goalsView) return;

        elements.goalsView.innerHTML = '';

        // Get all available goals from the Goals module
        const availableGoals = window.Goals ? window.Goals.getGoals() : [];
        
        if (availableGoals.length === 0) {
            elements.goalsView.innerHTML = '<div class="empty-state"><p>No hay metas definidas</p></div>';
            return;
        }

        // Show message if no tasks exist
        if (tasks.length === 0) {
            elements.goalsView.innerHTML = '<div class="empty-state"><p>No hay tareas definidas. Crea algunas tareas para verlas organizadas por metas.</p></div>';
            return;
        }

        // Group tasks by goal
        const tasksByGoal = {};
        tasks.forEach(task => {
            if (!tasksByGoal[task.goal]) {
                tasksByGoal[task.goal] = [];
            }
            tasksByGoal[task.goal].push(task);
        });

        // Render all goals, even if they have no tasks
        availableGoals.forEach(goal => {
            const goalTasks = tasksByGoal[goal.id] || [];
            
            const goalSection = document.createElement('div');
            goalSection.className = 'mb-4';
            
            const goalHeader = document.createElement('h3');
            goalHeader.className = 'text-lg font-semibold text-gray-700 mb-3 flex items-center';
            goalHeader.innerHTML = `
                <span class="mr-2">🎯</span>
                ${goal.name} <span class="text-sm text-gray-500 ml-2">(${goal.role})</span>
            `;
            
            goalSection.appendChild(goalHeader);

            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks-container drop-zone';
            tasksContainer.setAttribute('data-goal-id', goal.id);
            tasksContainer.setAttribute('ondragover', 'Tasks.handleDragOver(event)');
            tasksContainer.setAttribute('ondrop', 'Tasks.handleDrop(event)');
            
            if (goalTasks.length === 0) {
                tasksContainer.innerHTML = '<div class="empty-state"><p>Sin tareas asignadas</p></div>';
            } else {
                goalTasks.forEach(task => {
                    const taskElement = document.createElement('div');
                    taskElement.innerHTML = renderTask(task);
                    tasksContainer.appendChild(taskElement);
                });
            }
            
            goalSection.appendChild(tasksContainer);
            elements.goalsView.appendChild(goalSection);
        });
        
        setupTaskDragAndDrop();
    }

    // Public API
    return {
        init,
        addTask,
        toggleTaskComplete,
        deleteTask,
        saveReview,
        startNewWeek,
        updateCharts,
        exportMetrics,
        exportTasks,
        showRoles,
        showGoals,
        showQuadrants,
        destroyCharts: destroyAllCharts,
        getTask,
        getTasks: () => [...tasks], // Add getter for CheckIn module
        saveData,
        updateUI,
        initDragAndDrop,
        migrateMetricsData,
        debugMetricsData,  // Add debug function to public API
        hasTasksForGoal,
        moveTasksToDefaultGoal,
        updateGoalOptions,  // Add this function to public API
        handleDragOver,
        handleDrop
    };
})();

// Make Tasks available globally
window.Tasks = Tasks; 