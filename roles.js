/**
 * Roles Module
 * Handles role management functionality
 */
const Roles = (() => {
    // Private state
    let roles = [];

    // DOM Elements
    const elements = {
        roleInput: null,
        roleSelect: null,
        rolesList: null,
        addRoleBtn: null
    };

    // Initialize roles module
    async function init() {
        // Cache DOM elements
        elements.roleInput = document.getElementById('roleInput');
        elements.roleSelect = document.getElementById('roleSelect');
        elements.rolesList = document.getElementById('rolesList');
        elements.addRoleBtn = document.getElementById('addRoleBtn');

        // Set up event listeners
        setupEventListeners();
        
        // Load roles (will handle Supabase vs localStorage automatically)
        await loadRoles();
        
        // Try to initialize Supabase if user is authenticated
        if (window.HabitusSupabase?.auth?.isAuthenticated() && window.SupabaseRoles) {
            console.log('🔄 Attempting to initialize Supabase Roles...');
            try {
                await window.SupabaseRoles.init();
                console.log('✅ Supabase Roles initialized successfully');
                // Reload roles from Supabase
                await loadRoles();
            } catch (error) {
                console.error('❌ Failed to initialize Supabase Roles:', error);
            }
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add role button
        elements.addRoleBtn?.addEventListener('click', addRole);

        // Role input enter key
        elements.roleInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addRole();
            }
        });
        

    }

    // Load roles from Supabase or localStorage
    async function loadRoles() {
        try {
            console.log('🔍 Debug - Starting loadRoles...');
            console.log('🔍 Debug - Current local roles array:', roles);
            console.log('🔍 Debug - HabitusSupabase available:', !!window.HabitusSupabase);
            console.log('🔍 Debug - SupabaseRoles available:', !!window.SupabaseRoles);
            
            // Check if user is authenticated using the proper method
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
            console.log('🔍 Debug - Authentication status:', isAuthenticated);
            
            if (isAuthenticated && window.SupabaseRoles) {
                console.log('🔄 User is authenticated, loading from Supabase (source of truth)...');
                
                try {
                    // Initialize Supabase Roles module
                    await window.SupabaseRoles.init();
                    
                    // Get roles from Supabase (source of truth)
                    const supabaseRoles = window.SupabaseRoles.getAllRoles();
                    console.log('🔍 Debug - Raw Supabase roles:', supabaseRoles);
                    
                    // Map roles to just names for compatibility
                    const newRoles = supabaseRoles.map(role => role.name);
                    console.log(`✅ Loaded ${newRoles.length} roles from Supabase:`, newRoles);
                    
                    // Replace local array completely (Supabase is the source of truth)
                    roles = [...newRoles];
                    console.log(`🔄 Updated local roles array:`, roles);
                    
                    // Sync localStorage with Supabase data (for export functionality)
                    localStorage.setItem('habitus_roles', JSON.stringify(roles));
                    console.log('💾 Synced localStorage with Supabase data');
                    
                } catch (error) {
                    console.error('❌ Failed to load from Supabase:', error);
                    console.log('🔄 Falling back to localStorage...');
                    
                    // Fallback to localStorage only if Supabase fails
                    const storedRoles = localStorage.getItem('habitus_roles');
                    if (storedRoles) {
                        roles = JSON.parse(storedRoles);
                        console.log('🔄 Loaded roles from localStorage (fallback):', roles);
                    }
                }
            } else {
                console.log('🔄 Loading roles from localStorage (offline mode)...');
                console.log('⚠️ User not authenticated or Supabase not available');
                const storedRoles = localStorage.getItem('habitus_roles');
                if (storedRoles) {
                    roles = JSON.parse(storedRoles);
                    console.log('🔄 Loaded roles from localStorage:', roles);
                }
            }
            
            updateRoleOptions();
            renderRoleList();
        } catch (error) {
            console.error('❌ Failed to load roles:', error);
            // Fallback to localStorage
            const storedRoles = localStorage.getItem('habitus_roles');
            if (storedRoles) {
                roles = JSON.parse(storedRoles);
                updateRoleOptions();
                renderRoleList();
            }
        }
    }

    // Save roles to Supabase or localStorage
    async function saveRoles() {
        try {
            // Check if user is authenticated by getting current session
            let isAuthenticated = false;
            if (window.HabitusSupabase?.getClient) {
                try {
                    const client = window.HabitusSupabase.getClient();
                    const { data: { session } } = await client.auth.getSession();
                    isAuthenticated = !!session;
                } catch (error) {
                    console.error('❌ Error checking session in saveRoles:', error);
                }
            }
            
            // Check if Supabase is available and user is authenticated
            if (window.SupabaseRoles && isAuthenticated) {
                console.log('🔄 Saving roles to Supabase...');
                // Roles are already saved in Supabase when added/deleted
                // ALSO save to localStorage as backup for export functionality
                console.log('🔄 Also saving roles to localStorage as backup...');
                localStorage.setItem('habitus_roles', JSON.stringify(roles));
            } else {
                console.log('🔄 Saving roles to localStorage...');
                localStorage.setItem('habitus_roles', JSON.stringify(roles));
            }
        } catch (error) {
            console.error('❌ Failed to save roles:', error);
            // Fallback to localStorage
            localStorage.setItem('habitus_roles', JSON.stringify(roles));
        }
    }

    // Update role select options
    function updateRoleOptions() {
        if (!elements.roleSelect) return;

        // Clear current options except placeholder
        elements.roleSelect.innerHTML = '<option value="" disabled selected>Rol</option>';
        
        // Add role options
        roles.forEach(role => {
            const opt = document.createElement('option');
            opt.value = role;
            opt.textContent = role;
            elements.roleSelect.appendChild(opt);
        });
    }

    // Render role list
    function renderRoleList() {
        if (!elements.rolesList) return;

        elements.rolesList.innerHTML = '';

        if (roles.length === 0) {
            elements.rolesList.innerHTML = '<p class="text-sm text-gray-500">* No hay roles definidos *</p>';
            return;
        }

        roles.forEach((role, index) => {
            const roleItem = document.createElement('div');
            roleItem.className = 'flex items-center justify-between bg-white p-2 rounded shadow-sm';
            roleItem.innerHTML = `
                <span class="text-sm">${role}</span>
                <button onclick="Roles.deleteRole(${index})" class="text-red-500 hover:text-red-700">
                    🗑️
                </button>
            `;
            elements.rolesList.appendChild(roleItem);
        });
    }

    // Add a new role with robust validation
    async function addRole() {
        if (!elements.roleInput) return;

        const roleName = elements.roleInput.value.trim();
        
        console.log('🔍 Debug - Role input value:', roleName);
        console.log('🔍 Debug - Current roles:', roles);
        
        // Check if role name is empty
        if (!roleName) {
            console.log('⚠️ Role name is empty, showing error');
            App.showNotification('Por favor ingresa un nombre para el rol', 'error');
            return;
        }
        
        // Validate role with existing roles check
        console.log('🔍 Debug - About to validate role:', roleName);
        console.log('🔍 Debug - Current roles array:', roles);
        
        const validation = HabitusValidator.validateRole(roleName, roles);
        console.log('🔍 Debug - Validation result:', validation);
        
        if (!validation.valid) {
            console.error('❌ Role validation failed:', validation);
            App.showNotification(validation.error, 'error');
            return;
        }

        try {
            // Check authentication status using the proper method
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
            console.log('🔍 Debug - Authentication status in addRole:', isAuthenticated);
            
            if (isAuthenticated && window.SupabaseRoles) {
                console.log('🔄 User is authenticated, adding role to Supabase...');
                
                // Add role to Supabase
                await window.SupabaseRoles.addRole(validation.data);
                
                // Reload roles from Supabase to update local array
                await loadRoles();
                
                // Update UI after loading from Supabase
                updateRoleOptions();
                renderRoleList();
            } else {
                console.log('🔄 User not authenticated or Supabase not available, using localStorage...');
                // Use validated and sanitized data
                roles.push(validation.data);
                await saveRoles();
                updateRoleOptions();
                renderRoleList();
            }
            
            // Notify Goals module to create default goal for new role
            if (window.Goals && window.Goals.onRolesChanged) {
                console.log('🔄 Notifying Goals module of role change...');
                await window.Goals.onRolesChanged();
                console.log('✅ Goals module notified');
            } else {
                console.warn('⚠️ Goals module not available for notification');
            }
            
            // Clear input
            elements.roleInput.value = '';
            
            // Show success notification
            App.showNotification(Translations.getTranslation('notifications.role_added'), 'success');
        } catch (error) {
            console.error('❌ Failed to add role:', error);
            App.showNotification('Error al agregar el rol: ' + error.message, 'error');
        }
    }

    // Check if a role is being used in tasks or goals
    function isRoleUsed(roleName) {
        // Check if role is used in tasks
        if (window.Tasks && window.Tasks.getTasks) {
            const tasks = window.Tasks.getTasks();
            if (tasks.some(task => task.role === roleName)) {
                return true;
            }
        }
        
        // Check if role is used in goals
        if (window.Goals && window.Goals.getGoals) {
            const goals = window.Goals.getGoals();
            if (goals.some(goal => goal.role === roleName)) {
                return true;
            }
        }
        
        return false;
    }

    // Get dependent items for a role
    function getDependentItems(roleName) {
        const dependentItems = {
            tasks: [],
            goals: []
        };
        
        // Get dependent tasks
        if (window.Tasks && window.Tasks.getTasks) {
            const tasks = window.Tasks.getTasks();
            dependentItems.tasks = tasks.filter(task => task.role === roleName);
        }
        
        // Get dependent goals
        if (window.Goals && window.Goals.getGoals) {
            const goals = window.Goals.getGoals();
            dependentItems.goals = goals.filter(goal => goal.role === roleName);
        }
        
        return dependentItems;
    }

    // Delete a role
    async function deleteRole(index) {
        if (index < 0 || index >= roles.length) return;

        const roleToDelete = roles[index];
        
        // Check if role has dependent items
        const dependentItems = getDependentItems(roleToDelete);
        const hasDependents = dependentItems.tasks.length > 0 || dependentItems.goals.length > 0;
        
        if (hasDependents) {
            // Build warning message
            let warningMessage = `¿Estás seguro de que quieres eliminar el rol "${roleToDelete}"?\n\n`;
            warningMessage += `Esta acción eliminará también:\n`;
            
            if (dependentItems.tasks.length > 0) {
                warningMessage += `• ${dependentItems.tasks.length} tarea${dependentItems.tasks.length > 1 ? 's' : ''}\n`;
            }
            
            if (dependentItems.goals.length > 0) {
                warningMessage += `• ${dependentItems.goals.length} meta${dependentItems.goals.length > 1 ? 's' : ''}\n`;
            }
            
            warningMessage += `\nEsta acción no se puede deshacer.`;
            
            if (!confirm(warningMessage)) {
                return;
            }
            
            // Delete dependent tasks first
            if (dependentItems.tasks.length > 0) {
                console.log(`🔄 Deleting ${dependentItems.tasks.length} dependent tasks...`);
                for (const task of dependentItems.tasks) {
                    if (window.Tasks && window.Tasks.deleteTask) {
                        await window.Tasks.deleteTask(task.id);
                    }
                }
            }
            
            // Delete dependent goals first
            if (dependentItems.goals.length > 0) {
                console.log(`🔄 Deleting ${dependentItems.goals.length} dependent goals...`);
                for (const goal of dependentItems.goals) {
                    if (window.Goals && window.Goals.deleteGoal) {
                        await window.Goals.deleteGoal(goal.id);
                    }
                }
            }
        }
        
        try {
            // Check authentication status using the proper method
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
            console.log('🔍 Debug - Authentication status in deleteRole:', isAuthenticated);
            
            if (isAuthenticated && window.SupabaseRoles) {
                console.log('🔄 User is authenticated, deleting role from Supabase...');
                
                // Find the role in Supabase by name
                const supabaseRole = window.SupabaseRoles.getRoleByName(roleToDelete);
                if (supabaseRole) {
                    await window.SupabaseRoles.deleteRole(supabaseRole.id);
                    // Reload roles from Supabase to update local array
                    await loadRoles();
                    // Update UI after loading from Supabase
                    updateRoleOptions();
                    renderRoleList();
                } else {
                    console.log('⚠️ Role not found in Supabase, deleting from local array only');
                    roles.splice(index, 1);
                    await saveRoles();
                    updateRoleOptions();
                    renderRoleList();
                }
            } else {
                console.log('🔄 User not authenticated or Supabase not available, deleting from localStorage...');
                // Remove role
                roles.splice(index, 1);
                await saveRoles();
                updateRoleOptions();
                renderRoleList();
            }
            
            // Force refresh of goals and tasks to remove "Rol Eliminado" entries
            if (window.Goals && window.Goals.forceSyncGoals) {
                await window.Goals.forceSyncGoals();
            }
            
            if (window.Tasks && window.Tasks.forceSyncTasks) {
                await window.Tasks.forceSyncTasks();
            }
            
            // Show success notification
            App.showNotification(Translations.getTranslation('notifications.role_deleted'), 'success');
        } catch (error) {
            console.error('❌ Failed to delete role:', error);
            App.showNotification('Error al eliminar el rol: ' + error.message, 'error');
        }
    }

    // Get all roles
    function getRoles() {
        return [...roles];
    }

    // Check if role exists
    function hasRole(roleName) {
        return roles.includes(roleName);
    }
    
    // Check authentication status
    async function checkAuthStatus() {
        console.log('🔍 Debug - Checking authentication status...');
        
        if (!window.HabitusSupabase) {
            console.log('❌ HabitusSupabase not available');
            return false;
        }
        
        try {
            // Try to get current session
            const client = window.HabitusSupabase.getClient();
            if (!client) {
                console.log('❌ Supabase client not available');
                return false;
            }
            
            const { data: { session }, error } = await client.auth.getSession();
            
            if (error) {
                console.error('❌ Error getting session:', error);
                return false;
            }
            
            if (session) {
                console.log('✅ User is authenticated:', session.user.email);
                console.log('✅ User ID:', session.user.id);
                return true;
            } else {
                console.log('❌ No active session found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error checking auth status:', error);
            return false;
        }
    }
    
    // Force migration from localStorage to Supabase
    async function migrateToSupabase() {
        console.log('🔍 Debug - Migration attempt...');
        
        // Check authentication status
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, cannot migrate');
            return false;
        }
        
        if (!window.SupabaseRoles) {
            console.log('❌ SupabaseRoles not available');
            return false;
        }
        
        try {
            console.log('🔄 Starting migration from localStorage to Supabase...');
            
            // Get local roles
            const localRoles = JSON.parse(localStorage.getItem('habitus_roles') || '[]');
            if (localRoles.length === 0) {
                console.log('ℹ️ No local roles to migrate');
                return true;
            }
            
            console.log(`🔄 Found ${localRoles.length} local roles to migrate:`, localRoles);
            
            // Initialize Supabase Roles
            await window.SupabaseRoles.init();
            
            // Migrate each role
            for (const roleName of localRoles) {
                try {
                    await window.SupabaseRoles.addRole(roleName);
                    console.log(`✅ Migrated role: ${roleName}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to migrate role ${roleName}:`, error);
                }
            }
            
            // Reload roles from Supabase (this will sync localStorage)
            await loadRoles();
            
            console.log('✅ Migration completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return false;
        }
    }

    // Sync roles between Supabase and localStorage
    async function syncRoles() {
        console.log('🔄 Starting roles synchronization...');
        
        try {
            const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
            
            if (isAuthenticated && window.SupabaseRoles) {
                console.log('🔄 User authenticated, syncing from Supabase to localStorage...');
                
                // Load from Supabase (source of truth)
                await loadRoles();
                
                console.log('✅ Sync completed: Supabase → localStorage');
                return { success: true, source: 'supabase' };
            } else {
                console.log('🔄 User not authenticated, using localStorage only...');
                
                // Just load from localStorage
                const storedRoles = localStorage.getItem('habitus_roles');
                if (storedRoles) {
                    roles = JSON.parse(storedRoles);
                    updateRoleOptions();
                    renderRoleList();
                }
                
                console.log('✅ Sync completed: localStorage only');
                return { success: true, source: 'localStorage' };
            }
        } catch (error) {
            console.error('❌ Sync failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get sync status
    function getSyncStatus() {
        const isAuthenticated = window.HabitusSupabase?.auth?.isAuthenticated() || false;
        const supabaseAvailable = !!window.SupabaseRoles;
        const localRoles = JSON.parse(localStorage.getItem('habitus_roles') || '[]');
        
        return {
            authenticated: isAuthenticated,
            supabaseAvailable: supabaseAvailable,
            localRolesCount: localRoles.length,
            currentRolesCount: roles.length,
            mode: isAuthenticated && supabaseAvailable ? 'supabase' : 'localStorage'
        };
    }

    // Public API
    return {
        init,
        addRole,
        deleteRole,
        getRoles,
        hasRole,
        isRoleUsed,
        getDependentItems,
        migrateToSupabase,
        checkAuthStatus,
        syncRoles,
        getSyncStatus
    };
})();

// Make Roles available globally
window.Roles = Roles;

// Remove automatic initialization
// document.addEventListener('DOMContentLoaded', () => {
//     Roles.init();
// }); 