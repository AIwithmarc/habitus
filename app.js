/**
 * Main Application Module
 * Handles application initialization and core functionality
 */
const App = (() => {
    // Private state
    let isOnline = navigator.onLine;
    let isDarkMode = false;

    // DOM Elements
    const elements = {
        themeToggle: null,
        instructionsToggle: null,
        instructionsContent: null,
        quoteContainer: null
    };

        // Initialize application
    async function init() {
        try {
            console.log('Initializing App module...');
            
            // Cache DOM elements
            elements.themeToggle = document.getElementById('themeToggle');
            elements.instructionsToggle = document.getElementById('instructionsToggle');
            elements.instructionsContent = document.getElementById('instructionsContent');
            elements.quoteContainer = document.getElementById('verso-contenedor');

            // Load theme preference
            loadThemePreference();

            // Set up event listeners
            setupEventListeners();

            // Initialize Translations module (always needed)
            console.log('Initializing Translations module...');
            await Translations.init();
            
            // Check authentication state and wait for Supabase to be ready
            console.log('Checking authentication state...');
            await waitForSupabaseAuth();
            
            // Check if user is authenticated
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
            
            if (!isAuthenticated) {
                console.log('🔒 User not authenticated, showing auth overlay');
                showAuthRequired();
                return; // Stop initialization here
            }
            
            console.log('✅ User is authenticated, continuing with app initialization...');
            
            // Show initial loading state
            if (elements.quoteContainer) {
                elements.quoteContainer.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm p-4">
                        <p class="text-lg font-medium text-gray-800">Cargando aplicación...</p>
                        <p class="text-sm text-gray-600 mt-2 italic">Por favor espera...</p>
                    </div>
                `;
            }

            // Initialize Supabase modules first
            console.log('Initializing Supabase modules...');
            await initializeSupabaseModules();
            
            // Initialize UI modules
            console.log('Initializing UI modules...');
            await initializeUIModules();

            // Show last review if exists
            showLastReview();

            // Show offline status if needed
            if (!isOnline) {
                showOfflineStatus();
            }

            console.log('App initialization complete');
        } catch (error) {
            console.error('Error during App initialization:', error);
            if (elements.quoteContainer) {
                elements.quoteContainer.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm p-4">
                        <p class="text-lg font-medium text-gray-800">Error al inicializar la aplicación</p>
                        <p class="text-sm text-gray-600 mt-2 italic">Por favor, recarga la página</p>
                    </div>
                `;
            }
            throw error;
        }
    }

    // Wait for Supabase authentication to be ready
    async function waitForSupabaseAuth() {
        return new Promise((resolve) => {
            function checkAuth() {
                if (window.HabitusSupabase?.auth?.isAuthenticated !== undefined) {
                    console.log('✅ Supabase auth is ready');
                    resolve();
                } else {
                    console.log('⏳ Waiting for Supabase auth to be ready...');
                    setTimeout(checkAuth, 500);
                }
            }
            checkAuth();
        });
    }

    // Initialize Supabase modules
    async function initializeSupabaseModules() {
        try {
            // Initialize Supabase Roles
            if (window.SupabaseRoles) {
                console.log('Initializing Supabase Roles...');
                await window.SupabaseRoles.init();
            }
            
            // Initialize Supabase Goals
            if (window.SupabaseGoals) {
                console.log('Initializing Supabase Goals...');
                await window.SupabaseGoals.init();
            }
            
            // Initialize Supabase Tasks
            if (window.SupabaseTasks) {
                console.log('Initializing Supabase Tasks...');
                await window.SupabaseTasks.init();
            }
            
            // Initialize Supabase Check-ins
            if (window.SupabaseCheckins) {
                console.log('Initializing Supabase Check-ins...');
                await window.SupabaseCheckins.init();
            }
            
            // Initialize Supabase Ideas
            if (window.SupabaseIdeas) {
                console.log('Initializing Supabase Ideas...');
                await window.SupabaseIdeas.init();
            }
            
            console.log('✅ All Supabase modules initialized');
        } catch (error) {
            console.error('❌ Error initializing Supabase modules:', error);
            throw error;
        }
    }

    // Initialize UI modules
    async function initializeUIModules() {
        try {
            // Check if all required modules are available
            if (!window.Roles) {
                throw new Error('Roles module is not available');
            }
            if (!window.Goals) {
                throw new Error('Goals module is not available');
            }
            if (!window.Tasks) {
                throw new Error('Tasks module is not available');
            }
            if (!window.CheckIn) {
                throw new Error('CheckIn module is not available');
            }
            if (!window.Perhaps) {
                throw new Error('Perhaps module is not available');
            }
            
            console.log('Initializing Roles module...');
            await Roles.init();
            
            console.log('Initializing Goals module...');
            await Goals.init();
            
            // Wait a bit to ensure Goals is fully available before Tasks
            console.log('Waiting for Goals module to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('Initializing Tasks module...');
            await Tasks.init();
            
            // Wait a bit to ensure Tasks is fully available before CheckIn
            console.log('Waiting for Tasks module to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('Initializing CheckIn module...');
            await CheckIn.init();
            
            // Wait a bit to ensure CheckIn is fully available before Perhaps
            console.log('Waiting for CheckIn module to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('Initializing Perhaps module...');
            await Perhaps.init();
            
            console.log('✅ All UI modules initialized');
        } catch (error) {
            console.error('❌ Error initializing UI modules:', error);
            throw error;
        }
    }

    // Show authentication required overlay
    function showAuthRequired() {
        const overlay = document.getElementById('authRequiredOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        
        // Update menu state
        if (window.AuthUI && window.AuthUI.checkAuthState) {
            window.AuthUI.checkAuthState();
        }
        
        // Show auth modal if available
        if (window.AuthUI && window.AuthUI.showModal) {
            window.AuthUI.showModal('login');
        }
    }

    // Check authentication state and show/hide overlay accordingly
    function checkAuthenticationState() {
        try {
            // Check if user is authenticated using Supabase
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false; 
            
            const overlay = document.getElementById('authRequiredOverlay');
            if (overlay) {
                if (isAuthenticated) {
                    overlay.style.display = 'none';
                    console.log('✅ User is authenticated, hiding auth overlay');
                    
                    // Initialize app if not already done
                    if (!window.appInitialized) {
                        window.appInitialized = true;
                        initializeAppAfterAuth();
                    }
                } else {
                    overlay.style.display = 'flex';
                    console.log('🔒 User not authenticated, showing auth overlay');
                }
            }
            
            // Update menu state if available
            if (window.AuthUI && window.AuthUI.checkAuthState) {
                window.AuthUI.checkAuthState();
            }
        } catch (error) {
            console.error('Error checking authentication state:', error);
            // Show overlay by default if there's an error
            const overlay = document.getElementById('authRequiredOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
            }
        }
    }

    // Initialize app after authentication
    async function initializeAppAfterAuth() {
        try {
            console.log('🔄 Initializing app after authentication...');
            
            // Show initial loading state
            if (elements.quoteContainer) {
                elements.quoteContainer.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm p-4">
                        <p class="text-lg font-medium text-gray-800">Cargando aplicación...</p>
                        <p class="text-sm text-gray-600 mt-2 italic">Por favor espera...</p>
                    </div>
                `;
            }

            // Initialize Supabase modules first
            console.log('Initializing Supabase modules...');
            await initializeSupabaseModules();
            
            // Initialize UI modules
            console.log('Initializing UI modules...');
            await initializeUIModules();

            // Show last review if exists
            showLastReview();

            // Show offline status if needed
            if (!isOnline) {
                showOfflineStatus();
            }

            console.log('✅ App initialization after auth complete');
        } catch (error) {
            console.error('❌ Error during app initialization after auth:', error);
            throw error;
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Theme toggle
        elements.themeToggle?.addEventListener('click', toggleTheme);

        // Instructions toggle
        elements.instructionsToggle?.addEventListener('click', toggleInstructions);

        // Online/offline status
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);

        // Notifications
        window.addEventListener('showNotification', handleNotification);

        // Main tab navigation
        setupMainTabNavigation();
    }

    // Load theme preference
    function loadThemePreference() {
        // Check for saved preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            isDarkMode = savedTheme === 'dark';
        } else {
            // Check system preference
            isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        // Apply theme
        applyTheme();
    }

    // Toggle theme
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    }

    // Apply theme
    function applyTheme() {
        document.documentElement.classList.toggle('dark', isDarkMode);
        document.documentElement.classList.toggle('light', !isDarkMode);
    }

    // Toggle instructions
    function toggleInstructions() {
        if (!elements.instructionsContent) return;

        const isHidden = elements.instructionsContent.classList.contains('hidden');
        elements.instructionsContent.classList.toggle('hidden');
        elements.instructionsToggle.textContent = isHidden ? '▼' : '▶';
    }

    // Show last review
    function showLastReview() {
        const lastReview = localStorage.getItem('lastReview');
        if (lastReview && elements.lastReviewBox && elements.lastReviewText) {
            elements.lastReviewBox.classList.remove('hidden');
            elements.lastReviewText.textContent = lastReview;
        }
    }

    // Handle online/offline status
    function handleOnlineStatus() {
        isOnline = navigator.onLine;
        if (isOnline) {
            const message = Translations.getTranslation('notifications.online');
            showNotification(message, 'success');
        } else {
            showOfflineStatus();
        }
    }

    // Show offline status
    function showOfflineStatus() {
        const message = Translations.getTranslation('notifications.offline');
        showNotification(message, 'warning');
    }

    // Handle notification event
    function handleNotification(event) {
        const { message, type = 'info' } = event.detail;
        showNotification(message, type);
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed bottom-20 right-4 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-y-0 max-w-sm z-50 ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;

        // Special styling for feedback success
        if (message.includes('feedback') && type === 'success') {
            notification.className += ' bg-indigo-500 text-white';
            notification.innerHTML = `<p class="font-medium">${message}</p>`;
        } else {
            notification.textContent = message;
        }

        // Add to document
        document.body.appendChild(notification);

        // Add entrance animation
        requestAnimationFrame(() => {
            notification.style.transform = 'translateY(0) scale(1)';
            notification.style.opacity = '1';
        });

        // Remove after delay with exit animation
        setTimeout(() => {
            notification.style.transform = 'translateY(100%) scale(0.95)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000); // Show for 4 seconds
    }

    // Feedback functionality
    function showFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Focus the textarea
            const textarea = document.getElementById('feedbackInput');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    function hideFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            // Clear the textarea
            const textarea = document.getElementById('feedbackInput');
            if (textarea) {
                textarea.value = '';
            }
        }
    }

    async function sendFeedback() {
        const textarea = document.getElementById('feedbackInput');
        if (!textarea || !textarea.value.trim()) {
            showNotification(Translations.getTranslation('feedback_empty'), 'error');
            return;
        }

        const feedback = {
            text: textarea.value.trim(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: localStorage.getItem('habitus_lang') || 'es',
            version: '1.0.3'
        };

        // Store feedback in localStorage as backup
        const storedFeedback = JSON.parse(localStorage.getItem('habitus_feedback') || '[]');
        storedFeedback.push(feedback);
        localStorage.setItem('habitus_feedback', JSON.stringify(storedFeedback));

        try {
            // Submit to Google Form
            const formData = new FormData();
            
            // Get current date and time
            const now = new Date();
            
            // Format date components
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-based
            const year = now.getFullYear();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            
            // Log the data being sent
            console.log('Submitting feedback to Google Form:', {
                text: feedback.text,
                language: feedback.language,
                version: feedback.version,
                userAgent: feedback.userAgent,
                date: { day, month, year },
                time: { hours, minutes }
            });
            
            // Map feedback to form fields using provided entry IDs
            formData.append('entry.139403842', feedback.text); // Feedback text
            formData.append('entry.1727937598', feedback.language); // Language
            formData.append('entry.91491795', feedback.version); // Version
            formData.append('entry.1975576551', feedback.userAgent); // User Agent
            
            // Date components
            formData.append('entry.1060868168_day', day); // Day
            formData.append('entry.1060868168_month', month); // Month
            formData.append('entry.1060868168_year', year); // Year
            
            // Time components
            formData.append('entry.1060868168_hour', hours); // Hour
            formData.append('entry.1060868168_minute', minutes); // Minute

            // Submit to the Google Form with the complete URL
            console.log('Attempting to submit to Google Form...');
            const response = await fetch('https://docs.google.com/forms/d/e/1FAIpQLSfvesAJ3czHCvXQTAWoaE2sEg48sh-uTrz6EejQHbm2e7FePg/formResponse', {
                method: 'POST',
                mode: 'no-cors', // Required for Google Forms
                body: formData
            });

            console.log('Form submission response:', response);
            console.log('Response status:', response.status);
            console.log('Response type:', response.type);

            // Clear and hide modal
            textarea.value = '';
            hideFeedbackModal();

            // Show success notification
            showNotification(Translations.getTranslation('feedback_sent'), 'success');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            // Log more details about the error
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            // Even if Google Form submission fails, we still have the data in localStorage
            showNotification(Translations.getTranslation('feedback_sent') + ' (offline)', 'success');
        }
    }

    // Export feedback to CSV
    function exportFeedback() {
        const storedFeedback = JSON.parse(localStorage.getItem('habitus_feedback') || '[]');
        if (storedFeedback.length === 0) {
            showNotification(Translations.getTranslation('feedback_empty'), 'error');
            return;
        }

        const headers = ['Timestamp', 'Feedback', 'Language', 'Version', 'User Agent'];
        const rows = storedFeedback.map(f => [
            new Date(f.timestamp).toLocaleString(),
            f.text,
            f.language,
            f.version,
            f.userAgent
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => 
            // Escape commas and quotes in cells
            typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(',')).join('\n');

        downloadCSV(csv, 'habitus-feedback.csv');
    }

    // Main tab navigation functions
    function showMainTab(tabName) {
        console.log('[App] Showing main tab:', tabName);
        
        // Hide all tab content
        const allTabContent = document.querySelectorAll('.tab-content');
        console.log('[App] Found tab content elements:', allTabContent.length);
        
        allTabContent.forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('active');
            console.log('[App] Hidden tab content:', content.dataset.tab);
        });

        // Show selected tab content
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
            targetTab.classList.add('active');
            console.log('[App] Showed tab content:', tabName);
        } else {
            console.error('[App] Target tab not found:', tabName);
        }

        // Update main tab indicators
        updateMainTabIndicators(tabName);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        console.log('[App] Tab navigation complete for:', tabName);
    }

    function updateMainTabIndicators(activeTab) {
        console.log('[App] Updating main tab indicators for:', activeTab);
        
        const allTabs = document.querySelectorAll('.tab-main');
        console.log('[App] Found main tabs:', allTabs.length);
        
        allTabs.forEach(tab => {
            const tabName = tab.dataset.tab;
            tab.classList.remove('active');
            console.log('[App] Removed active class from tab:', tabName);
            
            if (tabName === activeTab) {
                tab.classList.add('active');
                console.log('[App] Added active class to tab:', tabName);
            }
        });
        
        console.log('[App] Tab indicators updated');
    }

    function setupMainTabNavigation() {
        console.log('[App] Setting up main tab navigation...');
        
        // TEMPORARILY DISABLED - Using debug navigation instead
        console.log('[App] Main tab navigation DISABLED - using debug system');
        
        // Debug: Show current state
        debugTabState();
    }

    // Debug function to show current tab state
    function debugTabState() {
        console.log('[App] === DEBUG TAB STATE ===');
        
        const tabs = document.querySelectorAll('.tab-main');
        const tabContents = document.querySelectorAll('.tab-content');
        
        console.log('Main tabs found:', tabs.length);
        tabs.forEach(tab => {
            console.log(`Tab: ${tab.dataset.tab}, Active: ${tab.classList.contains('active')}`);
        });
        
        console.log('Tab contents found:', tabContents.length);
        tabContents.forEach(content => {
            console.log(`Content: ${content.dataset.tab}, Hidden: ${content.classList.contains('hidden')}, Active: ${content.classList.contains('active')}`);
        });
        
        console.log('[App] === END DEBUG ===');
    }

    // Public API
    return {
        init,
        showNotification,
        toggleTheme,
        toggleInstructions,
        showFeedbackModal,
        hideFeedbackModal,
        sendFeedback,
        exportFeedback,
        showMainTab,
        setupMainTabNavigation,
        debugTabState,
        checkAuthenticationState,
        initializeAppAfterAuth,
        waitForSupabaseAuth,
        initializeSupabaseModules,
        initializeUIModules
    };
})();

// Make App available globally
window.App = App;

// Remove automatic initialization from App module
// The initialization will be handled by the main initApp function 