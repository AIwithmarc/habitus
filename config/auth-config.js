/**
 * Authentication Configuration for Habitus v5
 * Forces authentication and manages auth state
 */

const AuthConfig = {
    // Configuration
    config: {
        requireAuth: true, // Force authentication
        autoRedirect: true, // Automatically redirect to login
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        checkInterval: 5000 // Check auth state every 5 seconds
    },

    // State
    isChecking: false,
    lastCheck: 0,

    // Initialize authentication configuration
    init() {
        console.log('🔐 Initializing Auth Configuration...');
        
        // Set up auth state monitoring
        this.setupAuthMonitoring();
        
        // Force initial auth check
        this.checkAuthState();
        
        console.log('✅ Auth Configuration initialized');
    },

    // Set up authentication monitoring
    setupAuthMonitoring() {
        // Monitor auth state changes
        if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
            window.HabitusSupabase.client.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state change detected:', event, session?.user?.email);
                this.handleAuthStateChange(event, session);
            });
        }

        // Periodic auth state check
        setInterval(() => {
            this.checkAuthState();
        }, this.config.checkInterval);
    },

    // Handle authentication state changes
    handleAuthStateChange(event, session) {
        switch (event) {
            case 'SIGNED_IN':
                console.log('✅ User signed in:', session?.user?.email);
                this.onSignIn(session);
                break;
            case 'SIGNED_OUT':
                console.log('🔓 User signed out');
                this.onSignOut();
                break;
            case 'TOKEN_REFRESHED':
                console.log('🔄 Token refreshed');
                this.onTokenRefresh(session);
                break;
            case 'USER_UPDATED':
                console.log('👤 User updated');
                this.onUserUpdate(session);
                break;
            default:
                console.log('🔐 Auth event:', event);
        }
    },

    // Handle sign in
    onSignIn(session) {
        // Hide auth overlay
        this.hideAuthOverlay();
        
        // Initialize app if not already done
        if (!window.appInitialized) {
            window.appInitialized = true;
            if (window.App && window.App.initializeAppAfterAuth) {
                window.App.initializeAppAfterAuth();
            }
        }
        
        // Update UI state
        if (window.AuthUI && window.AuthUI.showAuthenticatedUI) {
            window.AuthUI.showAuthenticatedUI();
        }
    },

    // Handle sign out
    onSignOut() {
        // Show auth overlay
        this.showAuthOverlay();
        
        // Reset app state
        window.appInitialized = false;
        
        // Clear local data
        this.clearLocalData();
        
        // Update UI state
        if (window.AuthUI && window.AuthUI.showUnauthenticatedUI) {
            window.AuthUI.showUnauthenticatedUI();
        }
    },

    // Handle token refresh
    onTokenRefresh(session) {
        console.log('🔄 Token refreshed for user:', session?.user?.email);
        // Update last check time
        this.lastCheck = Date.now();
    },

    // Handle user update
    onUserUpdate(session) {
        console.log('👤 User updated:', session?.user?.email);
        // Update UI if needed
        if (window.AuthUI && window.AuthUI.updateUserInfo) {
            window.AuthUI.updateUserInfo();
        }
    },

    // Check authentication state
    checkAuthState() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        
        try {
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
            const currentTime = Date.now();
            
            // Check if session has expired
            if (isAuthenticated && this.lastCheck > 0) {
                const timeSinceLastCheck = currentTime - this.lastCheck;
                if (timeSinceLastCheck > this.config.sessionTimeout) {
                    console.log('⏰ Session expired, signing out user');
                    this.forceSignOut();
                    return;
                }
            }
            
            if (isAuthenticated) {
                this.hideAuthOverlay();
                this.lastCheck = currentTime;
            } else {
                this.showAuthOverlay();
            }
            
        } catch (error) {
            console.error('❌ Error checking auth state:', error);
            this.showAuthOverlay();
        } finally {
            this.isChecking = false;
        }
    },

    // Show authentication overlay
    showAuthOverlay() {
        const overlay = document.getElementById('authRequiredOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        
        // Show auth modal if available
        if (window.AuthUI && window.AuthUI.showModal) {
            window.AuthUI.showModal('login');
        }
    },

    // Hide authentication overlay
    hideAuthOverlay() {
        const overlay = document.getElementById('authRequiredOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    // Force sign out
    async forceSignOut() {
        try {
            if (window.HabitusSupabase?.auth?.signOut) {
                await window.HabitusSupabase.auth.signOut();
            }
        } catch (error) {
            console.error('❌ Error forcing sign out:', error);
        }
    },

    // Clear local data
    clearLocalData() {
        try {
            // Clear localStorage data
            const keysToClear = [
                'habitus_roles',
                'habitus_goals',
                'habitus_tasks',
                'habitus_metrics',
                'habitus_checkin_state',
                'habitus_ideas',
                'habitus_user'
            ];
            
            keysToClear.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('🧹 Local data cleared');
        } catch (error) {
            console.error('❌ Error clearing local data:', error);
        }
    },

    // Require authentication
    requireAuthentication() {
        if (!this.config.requireAuth) return;
        
        const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
        
        if (!isAuthenticated) {
            console.log('🔒 Authentication required');
            this.showAuthOverlay();
            return false;
        }
        
        return true;
    },

    // Get current user
    getCurrentUser() {
        return window.HabitusSupabase?.auth?.getCurrentUser() || null;
    },

    // Get current session
    getCurrentSession() {
        return window.HabitusSupabase?.auth?.getCurrentSession() || null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return window.HabitusSupabase?.auth?.isAuthenticated() || false;
    }
};

// Export to global scope
window.AuthConfig = AuthConfig;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            AuthConfig.init();
        }, 1000);
    });
} else {
    setTimeout(() => {
        AuthConfig.init();
    }, 1000);
}
