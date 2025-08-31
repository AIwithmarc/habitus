/**
 * Supabase Ideas Module
 * Handles ideas synchronization with Supabase
 */

const SupabaseIdeas = {
    // Configuration
    config: {
        tableName: 'user_ideas',
        maxRetries: 3,
        retryDelay: 1000,
        version: '1.0.0'
    },

    // Initialize the module
    async init() {
        try {
            console.log('🔄 Initializing Supabase Ideas module...');
            
            if (!window.HabitusSupabase?.client) {
                throw new Error('HabitusSupabase client not available');
            }

            console.log('✅ Supabase Ideas module initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Ideas:', error);
            return false;
        }
    },

    // Add a new idea to Supabase
    async addIdea(ideaData) {
        try {
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            
            const supabaseData = {
                user_id: userId,
                title: ideaData.description || ideaData.title || '',
                description: ideaData.description || '',
                status: ideaData.archived ? 'archived' : ideaData.implemented ? 'implemented' : 'active',
                priority: ideaData.priority || 1,
                created_at: ideaData.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await window.HabitusSupabase.client
                .from(this.config.tableName)
                .insert(supabaseData)
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log('✅ Idea added to Supabase:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to add idea to Supabase:', error);
            throw error;
        }
    },

    // Update an existing idea
    async updateIdea(ideaId, ideaData) {
        try {
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            
            const updateData = {
                title: ideaData.description || ideaData.title || '',
                description: ideaData.description || '',
                status: ideaData.archived ? 'archived' : ideaData.implemented ? 'implemented' : 'active',
                priority: ideaData.priority || 1,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await window.HabitusSupabase.client
                .from(this.config.tableName)
                .update(updateData)
                .eq('id', ideaId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log('✅ Idea updated in Supabase:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to update idea in Supabase:', error);
            throw error;
        }
    },

    // Delete an idea
    async deleteIdea(ideaId) {
        try {
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const userId = window.HabitusSupabase.auth.getUserId();

            const { error } = await window.HabitusSupabase.client
                .from(this.config.tableName)
                .delete()
                .eq('id', ideaId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            console.log('✅ Idea deleted from Supabase:', ideaId);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete idea from Supabase:', error);
            throw error;
        }
    },

    // Get all ideas for the current user
    async getAllIdeas() {
        try {
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const userId = window.HabitusSupabase.auth.getUserId();

            const { data, error } = await window.HabitusSupabase.client
                .from(this.config.tableName)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Convert Supabase format to local format
            const ideas = data.map(item => ({
                id: item.id,
                description: item.title || item.description || '',
                archived: item.status === 'archived',
                implemented: item.status === 'implemented',
                priority: item.priority || 1,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));

            console.log('✅ Retrieved ideas from Supabase:', ideas.length);
            return ideas;
        } catch (error) {
            console.error('❌ Failed to get ideas from Supabase:', error);
            throw error;
        }
    },

    // Sync local ideas to Supabase
    async syncToSupabase(localIdeas) {
        try {
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                console.log('⚠️ User not authenticated, skipping Supabase sync');
                return false;
            }

            console.log('🔄 Syncing ideas to Supabase...');
            let syncedCount = 0;

            // Get all existing ideas once to avoid multiple queries
            const existingIdeas = await this.getAllIdeas();
            const existingIds = new Set(existingIdeas.map(idea => idea.id));

            for (const idea of localIdeas) {
                try {
                    if (existingIds.has(idea.id)) {
                        // Update existing idea
                        await this.updateIdea(idea.id, idea);
                    } else {
                        // Add new idea
                        await this.addIdea(idea);
                    }
                    syncedCount++;
                } catch (error) {
                    console.warn('⚠️ Failed to sync idea:', idea.id, error);
                }
            }

            console.log(`✅ Synced ${syncedCount}/${localIdeas.length} ideas to Supabase`);
            return syncedCount > 0;
        } catch (error) {
            console.error('❌ Failed to sync ideas to Supabase:', error);
            return false;
        }
    },

    // Sync from Supabase to local
    async syncFromSupabase() {
        try {
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                console.log('⚠️ User not authenticated, skipping Supabase sync');
                return false;
            }

            console.log('🔄 Syncing ideas from Supabase...');
            
            const supabaseIdeas = await this.getAllIdeas();
            
            // Update localStorage with Supabase data
            localStorage.setItem('habitus_ideas', JSON.stringify(supabaseIdeas));
            
            console.log(`✅ Synced ${supabaseIdeas.length} ideas from Supabase`);
            return supabaseIdeas.length > 0;
        } catch (error) {
            console.error('❌ Failed to sync ideas from Supabase:', error);
            return false;
        }
    },

    // Export data for backup
    exportData() {
        return {
            module: 'SupabaseIdeas',
            version: this.config.version,
            timestamp: new Date().toISOString(),
            config: this.config
        };
    },

    // Import ideas data
    async importData(data) {
        try {
            if (!data.ideas || !Array.isArray(data.ideas)) {
                throw new Error('Invalid data format');
            }

            console.log('🔄 Importing ideas data...');
            
            for (const ideaData of data.ideas) {
                try {
                    await this.addIdea({
                        title: ideaData.title,
                        description: ideaData.description,
                        status: ideaData.status,
                        priority: ideaData.priority
                    });
                } catch (error) {
                    console.warn('⚠️ Failed to import idea:', ideaData.title, error);
                }
            }
            
            console.log('✅ Ideas imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import ideas:', error);
            throw error;
        }
    }
};

// Export to global scope
window.SupabaseIdeas = SupabaseIdeas;
