/**
 * Supabase Check-ins Module
 * Manages weekly check-ins with Supabase database integration
 */

const SupabaseCheckins = {
    // Configuration
    config: {
        tableName: 'weekly_checkins',
        storageKey: 'habitus_checkin_state'
    },

    // State
    checkins: [],
    currentCheckin: null,
    isLoading: false,
    error: null,

    // Initialize the module
    async init() {
        try {
            console.log('🚀 Initializing Supabase Check-ins module...');
            
            // Check if user is authenticated
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                console.log('⚠️ User not authenticated, check-ins module not initialized');
                return false;
            }

            // Load check-ins from Supabase
            await this.loadCheckins();
            
            console.log('✅ Supabase Check-ins module initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Check-ins module:', error);
            return false;
        }
    },

    // Load check-ins from Supabase
    async loadCheckins() {
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
            console.log('🔍 Loading check-ins for user:', userId);

            const { data, error } = await client
                .from(this.config.tableName)
                .select('*')
                .eq('user_id', userId)
                .order('week_start', { ascending: false });

            if (error) {
                console.error('❌ Supabase load error:', error);
                throw error;
            }

            this.checkins = data || [];
            console.log(`✅ Loaded ${this.checkins.length} check-ins from Supabase:`, this.checkins);
            
            // Set current checkin if exists for this week
            this.setCurrentCheckin();
            
            // Trigger UI update
            this.updateUI();
            
            return this.checkins;
        } catch (error) {
            console.error('❌ Failed to load check-ins:', error);
            this.error = error.message;
            return [];
        } finally {
            this.isLoading = false;
        }
    },

    // Set current checkin for this week
    setCurrentCheckin() {
        const weekStart = this.getWeekStartDate();
        this.currentCheckin = this.checkins.find(checkin => 
            checkin.week_start === weekStart
        );
        
        if (this.currentCheckin) {
            console.log('✅ Found current week check-in:', this.currentCheckin);
        } else {
            console.log('ℹ️ No check-in found for current week');
        }
    },

    // Get week start date
    getWeekStartDate() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart.toISOString().split('T')[0];
    },

    // Create a new check-in
    async createCheckin(checkinData) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            const weekStart = this.getWeekStartDate();
            
            // Check if check-in already exists for this week
            if (this.currentCheckin) {
                throw new Error('Check-in already exists for this week');
            }
            
            const newCheckin = {
                user_id: userId,
                week_start: weekStart,
                mood_rating: checkinData.moodRating || null,
                energy_level: checkinData.energyLevel || null,
                stress_level: checkinData.stressLevel || null,
                reflection: checkinData.reflection || '',
                goals_for_next_week: checkinData.goalsForNextWeek || ''
            };

            console.log('🔍 Attempting to insert check-in:', newCheckin);

            const { data, error } = await client
                .from(this.config.tableName)
                .insert(newCheckin)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            this.checkins.unshift(data);
            this.currentCheckin = data;
            console.log('✅ Check-in created successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to create check-in:', error);
            throw error;
        }
    },

    // Update an existing check-in
    async updateCheckin(checkinId, updates) {
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
                .eq('id', checkinId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Update local state
            const index = this.checkins.findIndex(checkin => checkin.id === checkinId);
            if (index !== -1) {
                this.checkins[index] = data;
            }

            // Update current checkin if it's the one being updated
            if (this.currentCheckin && this.currentCheckin.id === checkinId) {
                this.currentCheckin = data;
            }

            console.log('✅ Check-in updated successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to update check-in:', error);
            throw error;
        }
    },

    // Delete a check-in
    async deleteCheckin(checkinId) {
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
                .eq('id', checkinId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            // Remove from local state
            this.checkins = this.checkins.filter(checkin => checkin.id !== checkinId);

            // Clear current checkin if it's the one being deleted
            if (this.currentCheckin && this.currentCheckin.id === checkinId) {
                this.currentCheckin = null;
            }

            console.log('✅ Check-in deleted successfully');
            
            // Trigger UI update
            this.updateUI();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete check-in:', error);
            throw error;
        }
    },

    // Get check-in by ID
    getCheckinById(checkinId) {
        return this.checkins.find(checkin => checkin.id === checkinId);
    },

    // Get check-in by week start
    getCheckinByWeek(weekStart) {
        return this.checkins.find(checkin => checkin.week_start === weekStart);
    },

    // Get current week check-in
    getCurrentCheckin() {
        return this.currentCheckin;
    },

    // Get all check-ins
    getAllCheckins() {
        return this.checkins;
    },

    // Get recent check-ins (last 4 weeks)
    getRecentCheckins(limit = 4) {
        return this.checkins.slice(0, limit);
    },

    // Check if user has completed check-in for current week
    hasCurrentWeekCheckin() {
        return !!this.currentCheckin;
    },

    // Get check-in statistics
    getCheckinStats() {
        if (this.checkins.length === 0) {
            return {
                total: 0,
                averageMood: 0,
                averageEnergy: 0,
                averageStress: 0
            };
        }

        const validMoods = this.checkins.filter(c => c.mood_rating).map(c => c.mood_rating);
        const validEnergy = this.checkins.filter(c => c.energy_level).map(c => c.energy_level);
        const validStress = this.checkins.filter(c => c.stress_level).map(c => c.stress_level);

        return {
            total: this.checkins.length,
            averageMood: validMoods.length > 0 ? validMoods.reduce((a, b) => a + b, 0) / validMoods.length : 0,
            averageEnergy: validEnergy.length > 0 ? validEnergy.reduce((a, b) => a + b, 0) / validEnergy.length : 0,
            averageStress: validStress.length > 0 ? validStress.reduce((a, b) => a + b, 0) / validStress.length : 0
        };
    },

    // Update UI (trigger existing UI update functions)
    updateUI() {
        try {
            // Check if the existing checkin module has an update function
            if (window.CheckIn && typeof window.CheckIn.updateUI === 'function') {
                window.CheckIn.updateUI();
            } else {
                // Fallback: trigger a custom event
                window.dispatchEvent(new CustomEvent('checkinsUpdated', {
                    detail: { 
                        checkins: this.checkins, 
                        currentCheckin: this.currentCheckin 
                    }
                }));
            }
        } catch (error) {
            console.error('❌ Failed to update UI:', error);
        }
    },

    // Sync with localStorage (for backward compatibility)
    async syncWithLocalStorage() {
        try {
            const localCheckinState = localStorage.getItem(this.config.storageKey);
            
            if (localCheckinState) {
                console.log('🔄 Syncing local check-in state with Supabase...');
                
                const localData = JSON.parse(localCheckinState);
                
                // Only sync if there's actual data and no current check-in exists
                if (localData && !this.currentCheckin) {
                    try {
                        await this.createCheckin({
                            moodRating: localData.moodRating,
                            energyLevel: localData.energyLevel,
                            stressLevel: localData.stressLevel,
                            reflection: localData.reflection,
                            goalsForNextWeek: localData.goalsForNextWeek
                        });
                        
                        // Clear localStorage after successful sync
                        localStorage.removeItem(this.config.storageKey);
                        console.log('✅ Check-in synced successfully');
                    } catch (error) {
                        console.warn('⚠️ Failed to sync check-in:', error);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to sync with localStorage:', error);
        }
    },

    // Export check-ins data
    exportData() {
        return {
            checkins: this.checkins,
            currentCheckin: this.currentCheckin,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    },

    // Import check-ins data
    async importData(data) {
        try {
            if (!data.checkins || !Array.isArray(data.checkins)) {
                throw new Error('Invalid data format');
            }

            console.log('🔄 Importing check-ins data...');
            
            for (const checkinData of data.checkins) {
                try {
                    await this.createCheckin({
                        moodRating: checkinData.mood_rating,
                        energyLevel: checkinData.energy_level,
                        stressLevel: checkinData.stress_level,
                        reflection: checkinData.reflection,
                        goalsForNextWeek: checkinData.goals_for_next_week
                    });
                } catch (error) {
                    console.warn('⚠️ Failed to import check-in:', checkinData.week_start, error);
                }
            }
            
            console.log('✅ Check-ins imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import check-ins:', error);
            throw error;
        }
    }
};

// Export to global scope
window.SupabaseCheckins = SupabaseCheckins;

// Auto-initialize when user is authenticated
function setupAuthListener() {
    if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
        window.HabitusSupabase.client.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.id);
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('🔐 User signed in, initializing Supabase Check-ins...');
                await SupabaseCheckins.init();
            } else if (event === 'SIGNED_OUT') {
                console.log('🔓 User signed out, clearing Supabase Check-ins...');
                SupabaseCheckins.checkins = [];
                SupabaseCheckins.currentCheckin = null;
                SupabaseCheckins.updateUI();
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
