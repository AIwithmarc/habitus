/**
 * Supabase Migration System for Habitus v5
 * Migrates data from localStorage to Supabase database
 */

const SupabaseMigration = {
    // Migration state
    isMigrating: false,
    migrationProgress: 0,
    totalSteps: 0,
    currentStep: 0,

    // Migration steps
    migrationSteps: [
        { name: 'Verificar autenticación', key: 'auth' },
        { name: 'Migrar roles', key: 'roles' },
        { name: 'Migrar metas', key: 'goals' },
        { name: 'Migrar tareas', key: 'tasks' },
        { name: 'Migrar métricas', key: 'metrics' },
        { name: 'Migrar check-ins', key: 'checkins' },
        { name: 'Migrar ideas', key: 'ideas' },
        { name: 'Limpiar localStorage', key: 'cleanup' }
    ],

    // Initialize migration system
    init() {
        this.totalSteps = this.migrationSteps.length;
        console.log('🔄 Supabase Migration System initialized');
    },

    // Start migration process
    async startMigration() {
        if (this.isMigrating) {
            console.log('⚠️ Migration already in progress');
            return false;
        }

        try {
            console.log('🚀 Starting Habitus data migration to Supabase...');
            this.isMigrating = true;
            this.migrationProgress = 0;
            this.currentStep = 0;

            // Show migration modal
            this.showMigrationModal();

            // Check authentication first
            if (!window.HabitusSupabase.auth.isAuthenticated()) {
                throw new Error('Usuario no autenticado. Debes iniciar sesión primero.');
            }

            // Execute migration steps
            for (let i = 0; i < this.migrationSteps.length; i++) {
                const step = this.migrationSteps[i];
                this.currentStep = i;
                
                console.log(`📋 Step ${i + 1}/${this.totalSteps}: ${step.name}`);
                this.updateMigrationProgress(step.name, i + 1, this.totalSteps);

                try {
                    await this.executeMigrationStep(step.key);
                    this.migrationProgress = ((i + 1) / this.totalSteps) * 100;
                } catch (error) {
                    console.error(`❌ Migration step failed: ${step.name}`, error);
                    throw new Error(`Error en paso "${step.name}": ${error.message}`);
                }
            }

            // Migration completed successfully
            this.migrationProgress = 100;
            this.updateMigrationProgress('Migración completada', this.totalSteps, this.totalSteps);
            
            console.log('✅ Migration completed successfully');
            this.showMigrationSuccess();
            
            return true;

        } catch (error) {
            console.error('❌ Migration failed:', error);
            this.showMigrationError(error.message);
            return false;
        } finally {
            this.isMigrating = false;
        }
    },

    // Execute specific migration step
    async executeMigrationStep(stepKey) {
        switch (stepKey) {
            case 'auth':
                return await this.verifyAuthentication();
            case 'roles':
                return await this.migrateRoles();
            case 'goals':
                return await this.migrateGoals();
            case 'tasks':
                return await this.migrateTasks();
            case 'metrics':
                return await this.migrateMetrics();
            case 'checkins':
                return await this.migrateCheckins();
            case 'ideas':
                return await this.migrateIdeas();
            case 'cleanup':
                return await this.cleanupLocalStorage();
            default:
                throw new Error(`Unknown migration step: ${stepKey}`);
        }
    },

    // Verify authentication
    async verifyAuthentication() {
        const isAuthenticated = window.HabitusSupabase.auth.isAuthenticated();
        if (!isAuthenticated) {
            throw new Error('Usuario no autenticado');
        }
        
        const userId = window.HabitusSupabase.auth.getUserId();
        console.log('✅ Authentication verified for user:', userId);
        return true;
    },

    // Migrate roles
    async migrateRoles() {
        try {
            const localRoles = this.getLocalStorageData('habitus_roles');
            if (!localRoles || localRoles.length === 0) {
                console.log('ℹ️ No roles to migrate');
                return true;
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            const config = window.HabitusSupabaseConfig;
            const table = config.getTableName('ROLES');

            console.log(`📤 Migrating ${localRoles.length} roles...`);

            for (let i = 0; i < localRoles.length; i++) {
                const role = localRoles[i];
                const roleData = {
                    user_id: userId,
                    role_name: role,
                    color: config.getRandomColor('ROLES'),
                    sort_order: i,
                    is_active: true
                };

                const result = await window.HabitusSupabase.db.insert(table, roleData);
                if (!result.success) {
                    throw new Error(`Failed to migrate role: ${role}`);
                }

                console.log(`✅ Migrated role: ${role}`);
            }

            console.log(`✅ Successfully migrated ${localRoles.length} roles`);
            return true;

        } catch (error) {
            console.error('❌ Role migration failed:', error);
            throw error;
        }
    },

    // Migrate goals
    async migrateGoals() {
        try {
            const localGoals = this.getLocalStorageData('habitus_goals');
            if (!localGoals || localGoals.length === 0) {
                console.log('ℹ️ No goals to migrate');
                return true;
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            const config = window.HabitusSupabaseConfig;
            const goalsTable = config.getTableName('GOALS');
            const rolesTable = config.getTableName('ROLES');

            console.log(`📤 Migrating ${localGoals.length} goals...`);

            // Get user roles to map goal-role relationships
            const rolesResult = await window.HabitusSupabase.db.select(rolesTable, {
                filters: { user_id: userId }
            });

            if (!rolesResult.success) {
                throw new Error('Failed to fetch user roles');
            }

            const userRoles = rolesResult.data;
            const roleMap = new Map(userRoles.map(r => [r.role_name, r.id]));

            for (let i = 0; i < localGoals.length; i++) {
                const goal = localGoals[i];
                const roleId = roleMap.get(goal.role);

                if (!roleId) {
                    console.warn(`⚠️ Role not found for goal: ${goal.goal_name}, skipping...`);
                    continue;
                }

                const goalData = {
                    user_id: userId,
                    role_id: roleId,
                    goal_name: goal.goal_name,
                    color: goal.color || config.getRandomColor('GOALS'),
                    is_default: goal.is_default || false,
                    sort_order: i,
                    is_active: true
                };

                const result = await window.HabitusSupabase.db.insert(goalsTable, goalData);
                if (!result.success) {
                    throw new Error(`Failed to migrate goal: ${goal.goal_name}`);
                }

                console.log(`✅ Migrated goal: ${goal.goal_name}`);
            }

            console.log(`✅ Successfully migrated ${localGoals.length} goals`);
            return true;

        } catch (error) {
            console.error('❌ Goal migration failed:', error);
            throw error;
        }
    },

    // Migrate tasks
    async migrateTasks() {
        try {
            const localTasks = this.getLocalStorageData('habitus_tasks');
            if (!localTasks || localTasks.length === 0) {
                console.log('ℹ️ No tasks to migrate');
                return true;
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            const config = window.HabitusSupabaseConfig;
            const tasksTable = config.getTableName('TASKS');
            const goalsTable = config.getTableName('GOALS');

            console.log(`📤 Migrating ${localTasks.length} tasks...`);

            // Get user goals to map task-goal relationships
            const goalsResult = await window.HabitusSupabase.db.select(goalsTable, {
                filters: { user_id: userId }
            });

            if (!goalsResult.success) {
                throw new Error('Failed to fetch user goals');
            }

            const userGoals = goalsResult.data;
            const goalMap = new Map(userGoals.map(g => [g.goal_name, g.id]));

            for (let i = 0; i < localTasks.length; i++) {
                const task = localTasks[i];
                const goalId = goalMap.get(task.goal || 'Otras Prioridades');

                if (!goalId) {
                    console.warn(`⚠️ Goal not found for task: ${task.task_description}, skipping...`);
                    continue;
                }

                // Calculate week start (Monday) for the task
                const taskDate = task.createdAt ? new Date(task.createdAt) : new Date();
                const weekStart = this.getWeekStart(taskDate);

                const taskData = {
                    user_id: userId,
                    goal_id: goalId,
                    task_description: task.task_description,
                    quadrant: parseInt(task.quadrant) || 1,
                    status: task.completed ? 'completed' : 'pending',
                    completed: task.completed || false,
                    completed_at: task.completed ? new Date().toISOString() : null,
                    week_start: weekStart,
                    priority: task.priority || 1,
                    notes: task.notes || ''
                };

                const result = await window.HabitusSupabase.db.insert(tasksTable, taskData);
                if (!result.success) {
                    throw new Error(`Failed to migrate task: ${task.task_description}`);
                }

                console.log(`✅ Migrated task: ${task.task_description}`);
            }

            console.log(`✅ Successfully migrated ${localTasks.length} tasks`);
            return true;

        } catch (error) {
            console.error('❌ Task migration failed:', error);
            throw error;
        }
    },

    // Migrate metrics
    async migrateMetrics() {
        try {
            const localMetrics = this.getLocalStorageData('habitus_metrics');
            if (!localMetrics || localMetrics.length === 0) {
                console.log('ℹ️ No metrics to migrate');
                return true;
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            const config = window.HabitusSupabaseConfig;
            const metricsTable = config.getTableName('METRICS');

            console.log(`📤 Migrating ${localMetrics.length} metrics...`);

            for (let i = 0; i < localMetrics.length; i++) {
                const metric = localMetrics[i];
                
                // Convert timestamp to week start
                const metricDate = new Date(metric.timestamp);
                const weekStart = this.getWeekStart(metricDate);

                const metricData = {
                    user_id: userId,
                    week_start: weekStart,
                    total_tasks: metric.totalTasks || 0,
                    completed_tasks: metric.completedTasks || 0,
                    quadrant_distribution: metric.quadrants || [0, 0, 0, 0],
                    productivity_score: this.calculateProductivityScore(metric),
                    focus_time_hours: metric.focusTime || 0
                };

                const result = await window.HabitusSupabase.db.insert(metricsTable, metricData);
                if (!result.success) {
                    throw new Error(`Failed to migrate metric for week: ${weekStart}`);
                }

                console.log(`✅ Migrated metric for week: ${weekStart}`);
            }

            console.log(`✅ Successfully migrated ${localMetrics.length} metrics`);
            return true;

        } catch (error) {
            console.error('❌ Metrics migration failed:', error);
            throw error;
        }
    },

    // Migrate check-ins
    async migrateCheckins() {
        try {
            const localCheckins = this.getLocalStorageData('habitus_checkin');
            if (!localCheckins) {
                console.log('ℹ️ No check-ins to migrate');
                return true;
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            const config = window.HabitusSupabaseConfig;
            const checkinsTable = config.getTableName('CHECKINS');

            console.log('📤 Migrating check-in data...');

            // Get current week start
            const weekStart = this.getWeekStart(new Date());

            const checkinData = {
                user_id: userId,
                week_start: weekStart,
                reflection_text: localCheckins.lastReview || '',
                achievements: localCheckins.achievements || [],
                learnings: localCheckins.learnings || [],
                next_week_goals: localCheckins.nextWeekGoals || [],
                mood_rating: localCheckins.moodRating || null,
                energy_level: localCheckins.energyLevel || null,
                stress_level: localCheckins.stressLevel || null
            };

            const result = await window.HabitusSupabase.db.insert(checkinsTable, checkinData);
            if (!result.success) {
                throw new Error('Failed to migrate check-in data');
            }

            console.log('✅ Successfully migrated check-in data');
            return true;

        } catch (error) {
            console.error('❌ Check-ins migration failed:', error);
            throw error;
        }
    },

    // Migrate ideas
    async migrateIdeas() {
        try {
            const localIdeas = this.getLocalStorageData('habitus_perhaps');
            if (!localIdeas || localIdeas.length === 0) {
                console.log('ℹ️ No ideas to migrate');
                return true;
            }

            const userId = window.HabitusSupabase.auth.getUserId();
            const config = window.HabitusSupabaseConfig;
            const ideasTable = config.getTableName('IDEAS');

            console.log(`📤 Migrating ${localIdeas.length} ideas...`);

            for (let i = 0; i < localIdeas.length; i++) {
                const idea = localIdeas[i];

                const ideaData = {
                    user_id: userId,
                    idea_text: idea.text || idea.idea_text || '',
                    status: idea.status || 'pending',
                    priority: idea.priority || 1,
                    tags: idea.tags || [],
                    estimated_effort: idea.effort || 1,
                    target_week: idea.targetWeek || null
                };

                const result = await window.HabitusSupabase.db.insert(ideasTable, ideaData);
                if (!result.success) {
                    throw new Error(`Failed to migrate idea: ${ideaData.idea_text}`);
                }

                console.log(`✅ Migrated idea: ${ideaData.idea_text}`);
            }

            console.log(`✅ Successfully migrated ${localIdeas.length} ideas`);
            return true;

        } catch (error) {
            console.error('❌ Ideas migration failed:', error);
            throw error;
        }
    },

    // Cleanup localStorage
    async cleanupLocalStorage() {
        try {
            console.log('🧹 Cleaning up localStorage...');

            // Create backup before cleanup
            const backupData = this.createLocalStorageBackup();
            
            // Store backup in localStorage with timestamp
            const backupKey = `habitus_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            
            // Remove old data
            const keysToRemove = [
                'habitus_roles',
                'habitus_goals',
                'habitus_tasks',
                'habitus_metrics',
                'habitus_checkin',
                'habitus_perhaps',
                'habitus_tasksLog',
                'habitus_lastReview',
                'habitus_lastReset'
            ];

            keysToRemove.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Removed: ${key}`);
                }
            });

            console.log('✅ LocalStorage cleanup completed');
            console.log(`💾 Backup created: ${backupKey}`);
            return true;

        } catch (error) {
            console.error('❌ LocalStorage cleanup failed:', error);
            throw error;
        }
    },

    // Utility methods
    getLocalStorageData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn(`⚠️ Failed to parse localStorage data for ${key}:`, error);
            return null;
        }
    },

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
    },

    calculateProductivityScore(metric) {
        if (!metric.totalTasks || metric.totalTasks === 0) return 0;
        
        const completionRate = (metric.completedTasks / metric.totalTasks) * 0.4;
        const quadrantScore = this.calculateQuadrantScore(metric.quadrants) * 0.6;
        
        return Math.min(Math.max(completionRate + quadrantScore, 0), 100);
    },

    calculateQuadrantScore(quadrants) {
        if (!quadrants || quadrants.length < 4) return 0;
        
        // Q2 (Important, Not Urgent) gets highest weight
        const weights = [0.1, 0.6, 0.2, 0.1]; // Q1, Q2, Q3, Q4
        let totalScore = 0;
        
        for (let i = 0; i < Math.min(quadrants.length, 4); i++) {
            totalScore += (quadrants[i] || 0) * weights[i];
        }
        
        return totalScore;
    },

    createLocalStorageBackup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '5.0.0',
            data: {}
        };

        const keysToBackup = [
            'habitus_roles',
            'habitus_goals',
            'habitus_tasks',
            'habitus_metrics',
            'habitus_checkin',
            'habitus_perhaps',
            'habitus_tasksLog',
            'habitus_lastReview',
            'habitus_lastReset'
        ];

        keysToBackup.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                backupData.data[key] = data;
            }
        });

        return backupData;
    },

    // UI Methods
    showMigrationModal() {
        // Create migration modal if it doesn't exist
        if (!document.getElementById('supabaseMigrationModal')) {
            this.createMigrationModal();
        }

        const modal = document.getElementById('supabaseMigrationModal');
        modal.classList.remove('hidden');
    },

    createMigrationModal() {
        const modalHTML = `
            <div id="supabaseMigrationModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                    <div class="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-xl text-white">
                        <h2 class="text-xl font-semibold">🔄 Migración a Supabase</h2>
                        <p class="text-sm text-green-100">Migrando datos de Habitus a la nube...</p>
                    </div>
                    
                    <div class="p-6">
                        <div class="mb-4">
                            <div class="flex justify-between text-sm text-gray-600 mb-2">
                                <span id="migrationStepText">Verificando autenticación...</span>
                                <span id="migrationProgressText">0/0</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div id="migrationProgressBar" class="bg-green-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <div id="migrationStatus" class="text-sm text-gray-600">
                            Preparando migración...
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    updateMigrationProgress(stepName, current, total) {
        const stepText = document.getElementById('migrationStepText');
        const progressText = document.getElementById('migrationProgressText');
        const progressBar = document.getElementById('migrationProgressBar');
        const status = document.getElementById('migrationStatus');

        if (stepText) stepText.textContent = stepName;
        if (progressText) progressText.textContent = `${current}/${total}`;
        if (progressBar) progressBar.style.width = `${(current / total) * 100}%`;
        if (status) status.textContent = `Progreso: ${Math.round((current / total) * 100)}%`;
    },

    showMigrationSuccess() {
        const status = document.getElementById('migrationStatus');
        if (status) {
            status.innerHTML = `
                <div class="text-center py-4">
                    <div class="text-green-600 text-4xl mb-2">✅</div>
                    <h3 class="text-lg font-semibold text-green-800 mb-2">¡Migración Completada!</h3>
                    <p class="text-sm text-gray-600">Todos tus datos han sido migrados exitosamente a Supabase.</p>
                    <button onclick="SupabaseMigration.hideMigrationModal()" 
                            class="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Continuar
                    </button>
                </div>
            `;
        }
    },

    showMigrationError(errorMessage) {
        const status = document.getElementById('migrationStatus');
        if (status) {
            status.innerHTML = `
                <div class="text-center py-4">
                    <div class="text-red-600 text-4xl mb-2">❌</div>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">Error en la Migración</h3>
                    <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
                    <button onclick="SupabaseMigration.hideMigrationModal()" 
                            class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
                        Cerrar
                    </button>
                </div>
            `;
        }
    },

    hideMigrationModal() {
        const modal = document.getElementById('supabaseMigrationModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
};

// Export to global scope
window.SupabaseMigration = SupabaseMigration;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SupabaseMigration.init();
    });
} else {
    SupabaseMigration.init();
}

