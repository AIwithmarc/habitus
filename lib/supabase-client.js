/**
 * Supabase Client for Habitus v5
 * Main client for database operations and authentication
 */

// Import Supabase client (will be loaded from CDN)
let supabase;

// Initialize Supabase client
function initSupabaseClient() {
    if (typeof window.supabase?.createClient === 'undefined') {
        console.error('Supabase client not loaded. Make sure to include the Supabase CDN script.');
        return null;
    }

    const config = window.HabitusSupabaseConfig?.config;
    if (!config) {
        console.error('HabitusSupabaseConfig not found. Make sure config/supabase.js is loaded first.');
        return null;
    }

    try {
        supabase = window.supabase.createClient(config.url, config.anonKey);
        console.log('✅ Supabase client initialized successfully');
        return supabase;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        return null;
    }
}

// Get Supabase client instance
function getSupabaseClient() {
    if (!supabase) {
        supabase = initSupabaseClient();
    }
    return supabase;
}

// Authentication Manager
const AuthManager = {
    user: null,
    session: null,
    profile: null,

    async init() {
        try {
            const client = getSupabaseClient();
            if (!client) return false;

            // Get current session
            const { data: { session } } = await client.auth.getSession();
            if (session) {
                this.session = session;
                this.user = session.user;
                await this.loadProfile();
            }

            // Listen for auth changes
            client.auth.onAuthStateChange(async (event, session) => {
                console.log('🔐 Auth state change:', event, session?.user?.email);
                
                if (event === 'SIGNED_IN') {
                    this.session = session;
                    this.user = session.user;
                    await this.loadProfile();
                    this.onSignIn();
                } else if (event === 'SIGNED_OUT') {
                    this.session = null;
                    this.user = null;
                    this.profile = null;
                    this.onSignOut();
                }
            });

            return true;
        } catch (error) {
            console.error('❌ AuthManager init failed:', error);
            return false;
        }
    },

    async loadProfile() {
        if (!this.user) return null;

        try {
            const client = getSupabaseClient();
            console.log('🔍 Loading profile for user:', this.user.id);
            
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .maybeSingle();

            if (error) {
                console.error('❌ Error loading profile:', error);
                if (error.code === 'PGRST116' || error.code === 'PGRST205') {
                    // Profile doesn't exist, create it
                    console.log('🔄 Creating new profile...');
                    return await this.createProfile();
                }
                throw error;
            }

            if (!data) {
                console.log('🔄 No profile found, creating new one...');
                return await this.createProfile();
            }

            this.profile = data;
            console.log('✅ Profile loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to load profile:', error);
            return null;
        }
    },

    async createProfile() {
        if (!this.user) return null;

        try {
            const client = getSupabaseClient();
            const profileData = {
                id: this.user.id,
                email: this.user.email,
                full_name: this.user.user_metadata?.full_name || '',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            console.log('🔄 Creating profile with data:', profileData);

            const { data, error } = await client
                .from('profiles')
                .insert(profileData)
                .select()
                .single();

            if (error) {
                console.error('❌ Error creating profile:', error);
                // If profile already exists, try to load it
                if (error.code === '23505') { // Unique violation
                    console.log('🔄 Profile already exists, loading it...');
                    return await this.loadProfile();
                }
                throw error;
            }

            this.profile = data;
            console.log('✅ User profile created:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to create profile:', error);
            return null;
        }
    },

    async signUp(email, password, fullName) {
        try {
            const client = getSupabaseClient();
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });

            if (error) throw error;

            console.log('✅ Sign up successful:', data.user?.email);
            return { success: true, data };
        } catch (error) {
            console.error('❌ Sign up failed:', error);
            return { success: false, error: error.message };
        }
    },

    async signIn(email, password) {
        try {
            const client = getSupabaseClient();
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            console.log('✅ Sign in successful:', data.user?.email);
            return { success: true, data };
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            return { success: false, error: error.message };
        }
    },

    async signOut() {
        try {
            const client = getSupabaseClient();
            const { error } = await client.auth.signOut();

            if (error) throw error;

            console.log('✅ Sign out successful');
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            return { success: false, error: error.message };
        }
    },

    async resetPassword(email) {
        try {
            const client = getSupabaseClient();
            const { error } = await client.auth.resetPasswordForEmail(email);

            if (error) throw error;

            console.log('✅ Password reset email sent to:', email);
            return { success: true };
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            return { success: false, error: error.message };
        }
    },

    async updateProfile(updates) {
        if (!this.user || !this.profile) {
            throw new Error('User not authenticated');
        }

        try {
            const client = getSupabaseClient();
            const { data, error } = await client
                .from('profiles')
                .update(updates)
                .eq('id', this.user.id)
                .select()
                .single();

            if (error) throw error;

            this.profile = { ...this.profile, ...data };
            console.log('✅ Profile updated:', data);
            return data;
        } catch (error) {
            console.error('❌ Profile update failed:', error);
            throw error;
        }
    },

    // Event handlers
    onSignIn() {
        console.log('🔐 User signed in:', this.user?.email);
        // Update AuthUI menu state
        if (window.AuthUI && window.AuthUI.checkAuthState) {
            window.AuthUI.checkAuthState();
        }
        // Trigger any sign-in related actions
        if (window.HabitusApp && window.HabitusApp.onUserSignIn) {
            window.HabitusApp.onUserSignIn(this.user, this.profile);
        }
    },

    onSignOut() {
        console.log('🔐 User signed out');
        // Update AuthUI menu state
        if (window.AuthUI && window.AuthUI.checkAuthState) {
            window.AuthUI.checkAuthState();
        }
        // Trigger any sign-out related actions
        if (window.HabitusApp && window.HabitusApp.onUserSignOut) {
            window.HabitusApp.onUserSignOut();
        }
    },

    // Getters
    isAuthenticated() {
        return !!this.user && !!this.session;
    },

    getCurrentUser() {
        return this.user;
    },

    getCurrentProfile() {
        return this.profile;
    },

    getUserId() {
        return this.user?.id;
    }
};

// Database Operations Manager
const DatabaseManager = {
    async query(table, operation, data = null, options = {}) {
        try {
            const client = getSupabaseClient();
            if (!client) throw new Error('Supabase client not initialized');

            let query = client.from(table);

            switch (operation) {
                case 'select':
                    query = query.select(options.columns || '*');
                    if (options.filters) {
                        Object.entries(options.filters).forEach(([key, value]) => {
                            query = query.eq(key, value);
                        });
                    }
                    if (options.orderBy) {
                        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
                    }
                    if (options.limit) {
                        query = query.limit(options.limit);
                    }
                    break;

                case 'insert':
                    query = query.insert(data);
                    if (options.select) {
                        query = query.select(options.select);
                    }
                    break;

                case 'update':
                    query = query.update(data);
                    if (options.filters) {
                        Object.entries(options.filters).forEach(([key, value]) => {
                            query = query.eq(key, value);
                        });
                    }
                    if (options.select) {
                        query = query.select(options.select);
                    }
                    break;

                case 'delete':
                    query = query.delete();
                    if (options.filters) {
                        Object.entries(options.filters).forEach(([key, value]) => {
                            query = query.eq(key, value);
                        });
                    }
                    break;

                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }

            const { data: result, error } = await query;

            if (error) throw error;

            return { success: true, data: result };
        } catch (error) {
            console.error(`❌ Database operation failed (${operation} on ${table}):`, error);
            return { success: false, error: error.message };
        }
    },

    // Convenience methods for common operations
    async select(table, options = {}) {
        return this.query(table, 'select', null, options);
    },

    async insert(table, data, options = {}) {
        return this.query(table, 'insert', data, options);
    },

    async update(table, data, filters, options = {}) {
        return this.query(table, 'update', data, { ...options, filters });
    },

    async delete(table, filters, options = {}) {
        return this.query(table, 'delete', null, { ...options, filters });
    }
};

// Real-time subscription manager
const RealtimeManager = {
    subscriptions: new Map(),

    subscribe(table, event, callback, filters = {}) {
        try {
            const client = getSupabaseClient();
            if (!client) return null;

            const subscription = client
                .channel(`${table}_${event}_${Date.now()}`)
                .on('postgres_changes', {
                    event,
                    schema: 'public',
                    table,
                    filter: filters
                }, callback)
                .subscribe();

            const key = `${table}_${event}`;
            this.subscriptions.set(key, subscription);

            console.log(`🔌 Real-time subscription created: ${table} ${event}`);
            return subscription;
        } catch (error) {
            console.error('❌ Real-time subscription failed:', error);
            return null;
        }
    },

    unsubscribe(table, event) {
        const key = `${table}_${event}`;
        const subscription = this.subscriptions.get(key);

        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(key);
            console.log(`🔌 Real-time subscription removed: ${table} ${event}`);
        }
    },

    unsubscribeAll() {
        this.subscriptions.forEach((subscription, key) => {
            subscription.unsubscribe();
            console.log(`🔌 Unsubscribed from: ${key}`);
        });
        this.subscriptions.clear();
    }
};

// Authentication Guard
const AuthGuard = {
    isEnabled: true,
    
    checkAuth() {
        if (!this.isEnabled) return true;
        
        if (!window.HabitusSupabase.auth.isAuthenticated()) {
            this.showAuthRequired();
            return false;
        }
        return true;
    },
    
    showAuthRequired() {
        // Mostrar modal de autenticación obligatoria
        if (window.AuthUI) {
            window.AuthUI.showModal('login');
        }
    },
    
    enable() {
        this.isEnabled = true;
    },
    
    disable() {
        this.isEnabled = false;
    }
};

// Export the main client
window.HabitusSupabase = {
    client: null,
    auth: AuthManager,
    db: DatabaseManager,
    realtime: RealtimeManager,
    authGuard: AuthGuard,

    async init() {
        try {
            console.log('🚀 Initializing Habitus Supabase...');
            
            // Initialize client
            this.client = initSupabaseClient();
            if (!this.client) {
                throw new Error('Failed to initialize Supabase client');
            }

            // Initialize auth manager
            const authInitialized = await AuthManager.init();
            if (!authInitialized) {
                throw new Error('Failed to initialize authentication');
            }

            // Check authentication if guard is enabled
            if (AuthGuard.isEnabled && !this.auth.isAuthenticated()) {
                console.log('🔒 Authentication required');
                AuthGuard.showAuthRequired();
            }

            console.log('✅ Habitus Supabase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Habitus Supabase initialization failed:', error);
            return false;
        }
    },

    getClient() {
        return getSupabaseClient();
    },

    // Utility methods
    isOnline() {
        return navigator.onLine;
    },

    getConfig() {
        return window.HabitusSupabaseConfig;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🔄 DOM ready, initializing HabitusSupabase...');
        await window.HabitusSupabase.init();
        console.log('✅ HabitusSupabase initialization completed');
    });
} else {
    console.log('🔄 DOM already ready, initializing HabitusSupabase...');
    window.HabitusSupabase.init().then(() => {
        console.log('✅ HabitusSupabase initialization completed');
    });
}
