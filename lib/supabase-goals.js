/**
 * Supabase Goals Module
 * Manages user goals with Supabase database integration
 */

const SupabaseGoals = {
    // Configuration
    config: {
        tableName: 'user_goals',
        storageKey: 'habitus_goals'
    },

    // State
    goals: [],
    isLoading: false,
    error: null,

    // Initialize the module
    async init() {
        try {
            console.log('🚀 Initializing Supabase Goals module...');
            
            // Check if user is authenticated
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                console.log('⚠️ User not authenticated, goals module not initialized');
                return false;
            }

            // Load goals from Supabase
            await this.loadGoals();
            
            console.log('✅ Supabase Goals module initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Goals module:', error);
            return false;
        }
    },

    // Load goals from Supabase
    async loadGoals() {
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
            console.log('🔍 Loading goals for user:', userId);

            const { data, error } = await client
                .from(this.config.tableName)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Supabase load error:', error);
                throw error;
            }

            this.goals = data || [];
            console.log(`✅ Loaded ${this.goals.length} goals from Supabase:`, this.goals);
            
            // Trigger UI update
            this.updateUI();
            
            return this.goals;
        } catch (error) {
            console.error('❌ Failed to load goals:', error);
            this.error = error.message;
            return [];
        } finally {
            this.isLoading = false;
        }
    },

    // Add a new goal
    async addGoal(goalData) {
        try {
            if (!goalData.name || !goalData.name.trim()) {
                throw new Error('Goal name is required');
            }

            // Check if goal already exists (by name AND role)
            const existingGoal = this.goals.find(goal => 
                goal.title.toLowerCase() === goalData.name.toLowerCase() &&
                goal.role_id === goalData.roleId
            );
            
            if (existingGoal) {
                throw new Error('A goal with this name already exists for this role');
            }

            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            // Create goal object with only existing columns
            const newGoal = {
                user_id: userId,
                title: goalData.name.trim(),
                description: goalData.description || '',
                target_date: goalData.targetDate || null,
                is_completed: false
            };

            // Add optional columns only if they exist in the database
            // These will be added after the migration is applied
            if (goalData.roleId) {
                newGoal.role_id = goalData.roleId;
            }
            if (goalData.isDefault !== undefined) {
                newGoal.is_default = goalData.isDefault;
            }
            if (goalData.color) {
                newGoal.color = goalData.color;
            }

            console.log('🔍 Attempting to insert goal:', newGoal);

            const { data, error } = await client
                .from(this.config.tableName)
                .insert(newGoal)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            this.goals.push(data);
            console.log('✅ Goal added successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to add goal:', error);
            throw error;
        }
    },

    // Update a goal
    async updateGoal(goalId, updates) {
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
                .eq('id', goalId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Update local state
            const index = this.goals.findIndex(goal => goal.id === goalId);
            if (index !== -1) {
                this.goals[index] = data;
            }

            console.log('✅ Goal updated successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to update goal:', error);
            throw error;
        }
    },

    // Delete a goal
    async deleteGoal(goalId) {
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
                .delete()
                .eq('id', goalId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            // Remove from local state
            this.goals = this.goals.filter(goal => goal.id !== goalId);

            console.log('✅ Goal deleted successfully');
            
            // Trigger UI update
            this.updateUI();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete goal:', error);
            throw error;
        }
    },

    // Get goal by ID
    getGoalById(goalId) {
        return this.goals.find(goal => goal.id === goalId);
    },

    // Get goal by title
    getGoalByTitle(title) {
        return this.goals.find(goal => 
            goal.title.toLowerCase() === title.toLowerCase()
        );
    },

    // Get all goals
    getAllGoals() {
        return this.goals;
    },

    // Get active goals
    getActiveGoals() {
        return this.goals.filter(goal => !goal.is_completed);
    },

    // Get completed goals
    getCompletedGoals() {
        return this.goals.filter(goal => goal.is_completed);
    },

    // Update UI (trigger existing UI update functions)
    updateUI() {
        try {
            // Check if the existing goals module has an update function
            if (window.Goals && typeof window.Goals.updateUI === 'function') {
                window.Goals.updateUI();
            } else {
                // Fallback: trigger a custom event
                window.dispatchEvent(new CustomEvent('goalsUpdated', {
                    detail: { goals: this.goals }
                }));
            }
        } catch (error) {
            console.error('❌ Failed to update UI:', error);
        }
    },

    // Sync with localStorage (for backward compatibility)
    async syncWithLocalStorage() {
        try {
            const localGoals = JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');
            
            if (localGoals.length > 0) {
                console.log('🔄 Syncing local goals with Supabase...');
                
                for (const localGoal of localGoals) {
                    try {
                        await this.addGoal({
                            name: localGoal.name,
                            description: localGoal.description,
                            targetDate: localGoal.targetDate
                        });
                    } catch (error) {
                        console.warn('⚠️ Failed to sync goal:', localGoal.name, error);
                    }
                }
                
                // Clear localStorage after successful sync
                localStorage.removeItem(this.config.storageKey);
                console.log('✅ Goals synced successfully');
            }
        } catch (error) {
            console.error('❌ Failed to sync with localStorage:', error);
        }
    },

    // Export goals data
    exportData() {
        return {
            goals: this.goals,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    },

    // Import goals data
    async importData(data) {
        try {
            if (!data.goals || !Array.isArray(data.goals)) {
                throw new Error('Invalid data format');
            }

            console.log('🔄 Importing goals data...');
            
            for (const goalData of data.goals) {
                try {
                    await this.addGoal({
                        name: goalData.title,
                        description: goalData.description,
                        targetDate: goalData.target_date
                    });
                } catch (error) {
                    console.warn('⚠️ Failed to import goal:', goalData.title, error);
                }
            }
            
            console.log('✅ Goals imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import goals:', error);
            throw error;
        }
    }
};

// Export to global scope
window.SupabaseGoals = SupabaseGoals;

// Auto-initialize when user is authenticated
function setupAuthListener() {
    if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
        window.HabitusSupabase.client.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.id);
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('🔐 User signed in, initializing Supabase Goals...');
                await SupabaseGoals.init();
            } else if (event === 'SIGNED_OUT') {
                console.log('🔓 User signed out, clearing Supabase Goals...');
                SupabaseGoals.goals = [];
                SupabaseGoals.updateUI();
            }
        });
    } else {
        setTimeout(setupAuthListener, 2000);
    }
}

// Wait for DOM and HabitusSupabase to be ready
function waitForHabitusSupabase() {
    function checkHabitusSupabase() {
        if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
            setupAuthListener();
        } else {
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
