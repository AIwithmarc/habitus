/**
 * Supabase Roles Module
 * Manages user roles with Supabase database integration
 */

const SupabaseRoles = {
    // Configuration
    config: {
        tableName: 'user_roles',
        storageKey: 'habitus_roles'
    },

    // State
    roles: [],
    isLoading: false,
    error: null,

    // Initialize the module
    async init() {
        try {
            console.log('🚀 Initializing Supabase Roles module...');
            
            // Check if user is authenticated
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                console.log('⚠️ User not authenticated, roles module not initialized');
                return false;
            }

            // Load roles from Supabase
            await this.loadRoles();
            
            console.log('✅ Supabase Roles module initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Roles module:', error);
            return false;
        }
    },

    // Load roles from Supabase
    async loadRoles() {
        try {
            this.isLoading = true;
            this.error = null;

            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            console.log('🔍 Debug - Loading roles for user:', userId);
            console.log('🔍 Debug - Table name:', this.config.tableName);

            const { data, error } = await client
                .from(this.config.tableName)
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Supabase load error:', error);
                throw error;
            }

            this.roles = data || [];
            console.log(`✅ Loaded ${this.roles.length} roles from Supabase:`, this.roles);
            
            // Trigger UI update
            this.updateUI();
            
            return this.roles;
        } catch (error) {
            console.error('❌ Failed to load roles:', error);
            this.error = error.message;
            return [];
        } finally {
            this.isLoading = false;
        }
    },

    // Add a new role
    async addRole(name, description = '', color = '#4F46E5') {
        try {
            if (!name.trim()) {
                throw new Error('Role name is required');
            }

            // Check if role already exists
            const existingRole = this.roles.find(role => 
                role.name.toLowerCase() === name.toLowerCase()
            );
            
            if (existingRole) {
                throw new Error('A role with this name already exists');
            }

            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            console.log('🔍 Debug - Using user ID from session:', userId);
            
            const newRole = {
                user_id: userId,
                name: name.trim(),
                description: description.trim(),
                color: color,
                is_active: true
            };

            console.log('🔍 Debug - Attempting to insert role:', newRole);
            console.log('🔍 Debug - User ID:', userId);
            console.log('🔍 Debug - Table name:', this.config.tableName);

            const { data, error } = await client
                .from(this.config.tableName)
                .insert(newRole)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            this.roles.push(data);
            console.log('✅ Role added successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to add role:', error);
            throw error;
        }
    },

    // Update a role
    async updateRole(roleId, updates) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            const { data, error } = await client
                .from(this.config.tableName)
                .update(updates)
                .eq('id', roleId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Update local state
            const index = this.roles.findIndex(role => role.id === roleId);
            if (index !== -1) {
                this.roles[index] = data;
            }

            console.log('✅ Role updated successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to update role:', error);
            throw error;
        }
    },

    // Delete a role (soft delete by setting is_active to false)
    async deleteRole(roleId) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            const { error } = await client
                .from(this.config.tableName)
                .update({ is_active: false })
                .eq('id', roleId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            // Remove from local state
            this.roles = this.roles.filter(role => role.id !== roleId);

            console.log('✅ Role deleted successfully');
            
            // Trigger UI update
            this.updateUI();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete role:', error);
            throw error;
        }
    },

    // Get role by ID
    getRoleById(roleId) {
        return this.roles.find(role => role.id === roleId);
    },

    // Get role by name
    getRoleByName(name) {
        return this.roles.find(role => 
            role.name.toLowerCase() === name.toLowerCase()
        );
    },

    // Get all roles
    getAllRoles() {
        return this.roles;
    },

    // Get active roles
    getActiveRoles() {
        return this.roles.filter(role => role.is_active);
    },

    // Update UI (trigger existing UI update functions)
    updateUI() {
        try {
            // Check if the existing roles module has an update function
            if (window.Roles && typeof window.Roles.updateUI === 'function') {
                window.Roles.updateUI();
            } else {
                // Fallback: trigger a custom event
                window.dispatchEvent(new CustomEvent('rolesUpdated', {
                    detail: { roles: this.roles }
                }));
            }
        } catch (error) {
            console.error('❌ Failed to update UI:', error);
        }
    },

    // Sync with localStorage (for backward compatibility)
    async syncWithLocalStorage() {
        try {
            const localRoles = JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');
            
            if (localRoles.length > 0) {
                console.log('🔄 Syncing local roles with Supabase...');
                
                for (const localRole of localRoles) {
                    try {
                        await this.addRole(localRole.name, localRole.description, localRole.color);
                    } catch (error) {
                        console.warn('⚠️ Failed to sync role:', localRole.name, error);
                    }
                }
                
                // Clear localStorage after successful sync
                localStorage.removeItem(this.config.storageKey);
                console.log('✅ Roles synced successfully');
            }
        } catch (error) {
            console.error('❌ Failed to sync with localStorage:', error);
        }
    },

    // Export roles data
    exportData() {
        return {
            roles: this.roles,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    },

    // Import roles data
    async importData(data) {
        try {
            if (!data.roles || !Array.isArray(data.roles)) {
                throw new Error('Invalid data format');
            }

            console.log('🔄 Importing roles data...');
            
            for (const roleData of data.roles) {
                try {
                    await this.addRole(roleData.name, roleData.description, roleData.color);
                } catch (error) {
                    console.warn('⚠️ Failed to import role:', roleData.name, error);
                }
            }
            
            console.log('✅ Roles imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import roles:', error);
            throw error;
        }
    }
};

// Export to global scope
window.SupabaseRoles = SupabaseRoles;

// Auto-initialize when user is authenticated
function setupAuthListener() {
    console.log('🔍 Debug - Setting up auth listener...');
    console.log('🔍 Debug - HabitusSupabase available:', !!window.HabitusSupabase);
    console.log('🔍 Debug - HabitusSupabase.client available:', !!window.HabitusSupabase?.client);
    console.log('🔍 Debug - HabitusSupabase.client.auth available:', !!window.HabitusSupabase?.client?.auth);
    console.log('🔍 Debug - HabitusSupabase.client.auth.onAuthStateChange available:', !!window.HabitusSupabase?.client?.auth?.onAuthStateChange);
    
    if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
        console.log('✅ Auth listener setup successful');
        window.HabitusSupabase.client.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.id);
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('🔐 User signed in, initializing Supabase Roles...');
                await SupabaseRoles.init();
            } else if (event === 'SIGNED_OUT') {
                console.log('🔓 User signed out, clearing Supabase Roles...');
                SupabaseRoles.roles = [];
                SupabaseRoles.updateUI();
            }
        });
    } else {
        console.log('⚠️ HabitusSupabase client auth not ready, will retry later...');
        // Retry after a short delay
        setTimeout(setupAuthListener, 2000);
    }
}

// Wait for DOM and HabitusSupabase to be ready
function waitForHabitusSupabase() {
    console.log('🔄 Waiting for HabitusSupabase to be ready...');
    
    function checkHabitusSupabase() {
        console.log('🔍 Checking HabitusSupabase status...');
        console.log('🔍 HabitusSupabase available:', !!window.HabitusSupabase);
        console.log('🔍 HabitusSupabase.client available:', !!window.HabitusSupabase?.client);
        console.log('🔍 HabitusSupabase.auth available:', !!window.HabitusSupabase?.auth);
        
        if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
            console.log('✅ HabitusSupabase is ready, setting up auth listener');
            setupAuthListener();
        } else {
            console.log('⚠️ HabitusSupabase not ready yet, retrying in 2 seconds...');
            setTimeout(checkHabitusSupabase, 2000);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(checkHabitusSupabase, 1000);
        });
    } else {
        setTimeout(checkHabitusSupabase, 1000);
    }
}

// Start the initialization process
waitForHabitusSupabase();

// Export to global scope (already done above)
// export default SupabaseRoles;
