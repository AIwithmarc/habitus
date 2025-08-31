/**
 * Supabase Tasks Module
 * Manages user tasks with Supabase database integration
 */

const SupabaseTasks = {
    // Configuration
    config: {
        tasksTable: 'user_tasks',
        metricsTable: 'weekly_metrics',
        historyTable: 'task_history',
        storageKey: 'habitus_tasks'
    },

    // State
    tasks: [],
    metrics: [],
    taskHistory: [],
    isLoading: false,
    error: null,

    // Initialize the module
    async init() {
        try {
            console.log('🚀 Initializing Supabase Tasks module...');
            
            // Check if user is authenticated
            if (!window.HabitusSupabase?.auth?.isAuthenticated()) {
                console.log('⚠️ User not authenticated, tasks module not initialized');
                return false;
            }

            // Load tasks and metrics from Supabase
            await Promise.all([
                this.loadTasks(),
                this.loadMetrics(),
                this.loadTaskHistory()
            ]);
            
            console.log('✅ Supabase Tasks module initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Tasks module:', error);
            return false;
        }
    },

    // Load tasks from Supabase
    async loadTasks() {
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
            console.log('🔍 Loading tasks for user:', userId);

            const { data, error } = await client
                .from(this.config.tasksTable)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Supabase load error:', error);
                throw error;
            }

            this.tasks = data || [];
            console.log(`✅ Loaded ${this.tasks.length} tasks from Supabase:`, this.tasks);
            
            // Trigger UI update
            this.updateUI();
            
            return this.tasks;
        } catch (error) {
            console.error('❌ Failed to load tasks:', error);
            this.error = error.message;
            return [];
        } finally {
            this.isLoading = false;
        }
    },

    // Load metrics from Supabase
    async loadMetrics() {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;

            const { data, error } = await client
                .from(this.config.metricsTable)
                .select('*')
                .eq('user_id', userId)
                .order('week_start', { ascending: false });

            if (error) {
                console.error('❌ Supabase metrics load error:', error);
                throw error;
            }

            this.metrics = data || [];
            console.log(`✅ Loaded ${this.metrics.length} metrics from Supabase`);
            
            return this.metrics;
        } catch (error) {
            console.error('❌ Failed to load metrics:', error);
            return [];
        }
    },

    // Load task history from Supabase
    async loadTaskHistory() {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;

            const { data, error } = await client
                .from(this.config.historyTable)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Supabase history load error:', error);
                throw error;
            }

            this.taskHistory = data || [];
            console.log(`✅ Loaded ${this.taskHistory.length} task history records from Supabase`);
            
            return this.taskHistory;
        } catch (error) {
            console.error('❌ Failed to load task history:', error);
            return [];
        }
    },

    // Add a new task
    async addTask(taskData) {
        try {
            if (!taskData.title || !taskData.title.trim()) {
                throw new Error('Task title is required');
            }

            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            const newTask = {
                user_id: userId,
                title: taskData.title.trim(),
                description: taskData.description || '',
                status: taskData.status || 'pending',
                priority: taskData.priority || 1,
                due_date: taskData.dueDate || null,
                role_id: taskData.roleId || null,
                goal_id: taskData.goalId || null,
                quadrant: taskData.quadrant || 1
            };

            console.log('🔍 Attempting to insert task:', newTask);

            const { data, error } = await client
                .from(this.config.tasksTable)
                .insert(newTask)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            this.tasks.push(data);
            console.log('✅ Task added successfully:', data);
            
            // Add to task history
            await this.addTaskHistory(data.id, 'created', null, data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to add task:', error);
            throw error;
        }
    },

    // Update a task
    async updateTask(taskId, updates) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            // Get current task data for history
            const currentTask = this.tasks.find(task => task.id === taskId);
            
            const { data, error } = await client
                .from(this.config.tasksTable)
                .update(updates)
                .eq('id', taskId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Update local state
            const index = this.tasks.findIndex(task => task.id === taskId);
            if (index !== -1) {
                this.tasks[index] = data;
            }

            // Add to task history
            await this.addTaskHistory(taskId, 'updated', currentTask, data);

            console.log('✅ Task updated successfully:', data);
            
            // Trigger UI update
            this.updateUI();
            
            return data;
        } catch (error) {
            console.error('❌ Failed to update task:', error);
            throw error;
        }
    },

    // Delete a task
    async deleteTask(taskId) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            // Get current task data for history
            const currentTask = this.tasks.find(task => task.id === taskId);
            
            const { error } = await client
                .from(this.config.tasksTable)
                .delete()
                .eq('id', taskId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            // Remove from local state
            this.tasks = this.tasks.filter(task => task.id !== taskId);

            // Add to task history
            await this.addTaskHistory(taskId, 'deleted', currentTask, null);

            console.log('✅ Task deleted successfully');
            
            // Trigger UI update
            this.updateUI();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete task:', error);
            throw error;
        }
    },

    // Add task to history
    async addTaskHistory(taskId, action, oldValues, newValues) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            const historyRecord = {
                task_id: taskId,
                user_id: userId,
                action: action,
                old_values: oldValues,
                new_values: newValues
            };

            const { error } = await client
                .from(this.config.historyTable)
                .insert(historyRecord);

            if (error) {
                console.error('❌ Failed to add task history:', error);
            } else {
                console.log('✅ Task history recorded');
            }
        } catch (error) {
            console.error('❌ Failed to add task history:', error);
        }
    },

    // Save weekly metrics
    async saveWeeklyMetrics(metricsData) {
        try {
            const client = window.HabitusSupabase.getClient();
            
            // Get current session to get user ID
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                throw new Error('User not authenticated');
            }
            
            const userId = session.user.id;
            
            const weekStart = this.getWeekStartDate();
            
            const metricsRecord = {
                user_id: userId,
                week_start: weekStart,
                tasks_completed: metricsData.completedTasks || 0,
                tasks_total: metricsData.totalTasks || 0,
                productivity_score: metricsData.productivityScore || 0,
                notes: metricsData.notes || ''
            };

            // Check if metrics for this week already exist
            const existingMetrics = this.metrics.find(m => 
                m.user_id === userId && m.week_start === weekStart
            );

            let result;
            if (existingMetrics) {
                // Update existing metrics
                result = await client
                    .from(this.config.metricsTable)
                    .update(metricsRecord)
                    .eq('id', existingMetrics.id)
                    .select()
                    .single();
            } else {
                // Insert new metrics
                result = await client
                    .from(this.config.metricsTable)
                    .insert(metricsRecord)
                    .select()
                    .single();
            }

            if (result.error) {
                throw result.error;
            }

            // Update local state
            await this.loadMetrics();

            console.log('✅ Weekly metrics saved successfully');
            return result.data;
        } catch (error) {
            console.error('❌ Failed to save weekly metrics:', error);
            throw error;
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

    // Get task by ID
    getTaskById(taskId) {
        return this.tasks.find(task => task.id === taskId);
    },

    // Get tasks by status
    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    },

    // Get tasks by quadrant
    getTasksByQuadrant(quadrant) {
        return this.tasks.filter(task => task.quadrant === quadrant);
    },

    // Get tasks by role
    getTasksByRole(roleId) {
        return this.tasks.filter(task => task.role_id === roleId);
    },

    // Get all tasks
    getAllTasks() {
        return this.tasks;
    },

    // Get active tasks
    getActiveTasks() {
        return this.tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled');
    },

    // Get completed tasks
    getCompletedTasks() {
        return this.tasks.filter(task => task.status === 'completed');
    },

    // Update UI (trigger existing UI update functions)
    updateUI() {
        try {
            // Check if the existing tasks module has an update function
            if (window.Tasks && typeof window.Tasks.updateUI === 'function') {
                window.Tasks.updateUI();
            } else {
                // Fallback: trigger a custom event
                window.dispatchEvent(new CustomEvent('tasksUpdated', {
                    detail: { tasks: this.tasks, metrics: this.metrics }
                }));
            }
        } catch (error) {
            console.error('❌ Failed to update UI:', error);
        }
    },

    // Sync with localStorage (for backward compatibility)
    async syncWithLocalStorage() {
        try {
            const localTasks = JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');
            const localMetrics = JSON.parse(localStorage.getItem('habitus_metrics') || '[]');
            
            if (localTasks.length > 0) {
                console.log('🔄 Syncing local tasks with Supabase...');
                
                for (const localTask of localTasks) {
                    try {
                        await this.addTask({
                            title: localTask.title || localTask.description,
                            description: localTask.description || '',
                            status: localTask.status || 'pending',
                            priority: localTask.priority || 1,
                            dueDate: localTask.dueDate,
                            roleId: localTask.roleId,
                            goalId: localTask.goalId,
                            quadrant: localTask.quadrant || 1
                        });
                    } catch (error) {
                        console.warn('⚠️ Failed to sync task:', localTask.title, error);
                    }
                }
                
                // Clear localStorage after successful sync
                localStorage.removeItem(this.config.storageKey);
                localStorage.removeItem('habitus_metrics');
                console.log('✅ Tasks synced successfully');
            }
        } catch (error) {
            console.error('❌ Failed to sync with localStorage:', error);
        }
    },

    // Export tasks data
    exportData() {
        return {
            tasks: this.tasks,
            metrics: this.metrics,
            taskHistory: this.taskHistory,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    },

    // Import tasks data
    async importData(data) {
        try {
            if (!data.tasks || !Array.isArray(data.tasks)) {
                throw new Error('Invalid data format');
            }

            console.log('🔄 Importing tasks data...');
            
            for (const taskData of data.tasks) {
                try {
                    await this.addTask({
                        title: taskData.title,
                        description: taskData.description,
                        status: taskData.status,
                        priority: taskData.priority,
                        dueDate: taskData.due_date,
                        roleId: taskData.role_id,
                        goalId: taskData.goal_id,
                        quadrant: taskData.quadrant
                    });
                } catch (error) {
                    console.warn('⚠️ Failed to import task:', taskData.title, error);
                }
            }
            
            console.log('✅ Tasks imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import tasks:', error);
            throw error;
        }
    }
};

// Export to global scope
window.SupabaseTasks = SupabaseTasks;

// Auto-initialize when user is authenticated
function setupAuthListener() {
    if (window.HabitusSupabase?.client?.auth?.onAuthStateChange) {
        window.HabitusSupabase.client.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.id);
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('🔐 User signed in, initializing Supabase Tasks...');
                await SupabaseTasks.init();
            } else if (event === 'SIGNED_OUT') {
                console.log('🔓 User signed out, clearing Supabase Tasks...');
                SupabaseTasks.tasks = [];
                SupabaseTasks.metrics = [];
                SupabaseTasks.taskHistory = [];
                SupabaseTasks.updateUI();
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
