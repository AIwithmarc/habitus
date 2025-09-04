/**
 * Task Synchronization Verification Tool
 * Verifies that tasks are properly syncing between local and Supabase
 */

const TaskSyncVerifier = {
    async verifyTaskSync() {
        console.log('🔄 Starting Task Synchronization Verification...');
        
        const results = {
            localTasks: this.getLocalTasks(),
            supabaseTasks: await this.getSupabaseTasks(),
            syncStatus: await this.checkSyncStatus(),
            recommendations: []
        };
        
        this.analyzeResults(results);
        this.displayResults(results);
        return results;
    },
    
    getLocalTasks() {
        try {
            // Get tasks from localStorage
            const localData = localStorage.getItem('habitus_tasks');
            const tasks = localData ? JSON.parse(localData) : [];
            
            console.log(`📱 Found ${tasks.length} local tasks`);
            return tasks;
        } catch (error) {
            console.error('❌ Error reading local tasks:', error);
            return [];
        }
    },
    
    async getSupabaseTasks() {
        try {
            if (!window.SupabaseTasks) {
                return { error: 'SupabaseTasks module not available' };
            }
            
            const tasks = window.SupabaseTasks.getAllTasks();
            console.log(`☁️ Found ${tasks.length} Supabase tasks`);
            return tasks;
        } catch (error) {
            console.error('❌ Error reading Supabase tasks:', error);
            return { error: error.message };
        }
    },
    
    async checkSyncStatus() {
        const localTasks = this.getLocalTasks();
        const supabaseTasks = await this.getSupabaseTasks();
        
        if (supabaseTasks.error) {
            return { status: 'ERROR', message: supabaseTasks.error };
        }
        
        const localCount = localTasks.length;
        const supabaseCount = supabaseTasks.length;
        
        if (localCount === 0 && supabaseCount === 0) {
            return { status: 'OK', message: 'Both local and Supabase are empty' };
        }
        
        if (localCount === 0 && supabaseCount > 0) {
            return { 
                status: 'WARNING', 
                message: `Local is empty but Supabase has ${supabaseCount} tasks`,
                recommendation: 'Consider syncing from Supabase to local'
            };
        }
        
        if (localCount > 0 && supabaseCount === 0) {
            return { 
                status: 'WARNING', 
                message: `Supabase is empty but local has ${localCount} tasks`,
                recommendation: 'Consider syncing from local to Supabase'
            };
        }
        
        if (localCount !== supabaseCount) {
            return { 
                status: 'WARNING', 
                message: `Count mismatch: Local ${localCount}, Supabase ${supabaseCount}`,
                recommendation: 'Tasks may be out of sync'
            };
        }
        
        return { status: 'OK', message: 'Task counts match' };
    },
    
    analyzeResults(results) {
        const { localTasks, supabaseTasks, syncStatus } = results;
        
        if (syncStatus.status === 'ERROR') {
            results.recommendations.push('Check Supabase connection and authentication');
            return;
        }
        
        if (syncStatus.status === 'WARNING') {
            results.recommendations.push(syncStatus.recommendation);
        }
        
        // Check for data inconsistencies
        if (localTasks.length > 0 && !supabaseTasks.error) {
            const localIds = new Set(localTasks.map(t => t.id));
            const supabaseIds = new Set(supabaseTasks.map(t => t.id));
            
            const missingInSupabase = localTasks.filter(t => !supabaseIds.has(t.id));
            const missingInLocal = supabaseTasks.filter(t => !localIds.has(t.id));
            
            if (missingInSupabase.length > 0) {
                results.recommendations.push(`Sync ${missingInSupabase.length} tasks to Supabase`);
            }
            
            if (missingInLocal.length > 0) {
                results.recommendations.push(`Sync ${missingInLocal.length} tasks from Supabase`);
            }
        }
        
        // Check for recent changes
        const recentLocalTasks = localTasks.filter(t => {
            const updated = new Date(t.updated_at || t.created_at);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return updated > oneHourAgo;
        });
        
        if (recentLocalTasks.length > 0) {
            results.recommendations.push(`Found ${recentLocalTasks.length} recently modified local tasks`);
        }
    },
    
    displayResults(results) {
        console.log('📋 Task Sync Verification Results:');
        console.log('==================================');
        
        console.log(`📱 Local tasks: ${results.localTasks.length}`);
        console.log(`☁️ Supabase tasks: ${results.supabaseTasks.error ? 'ERROR' : results.supabaseTasks.length}`);
        console.log(`🔄 Sync status: ${results.syncStatus.status} - ${results.syncStatus.message}`);
        
        if (results.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            results.recommendations.forEach(rec => console.log(`   - ${rec}`));
        }
        
        // Create visual report
        this.createVisualReport(results);
    },
    
    createVisualReport(results) {
        const reportDiv = document.createElement('div');
        reportDiv.id = 'task-sync-report';
        reportDiv.className = 'fixed top-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-[10000]';
        reportDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900">🔄 Task Sync Status</h3>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span>📱 Local:</span>
                    <span class="font-medium">${results.localTasks.length}</span>
                </div>
                <div class="flex justify-between">
                    <span>☁️ Supabase:</span>
                    <span class="font-medium">${results.supabaseTasks.error ? 'ERROR' : results.supabaseTasks.length}</span>
                </div>
                <div class="border-t pt-2">
                    <div class="text-sm ${this.getStatusColor(results.syncStatus.status)}">
                        ${this.getStatusEmoji(results.syncStatus.status)} ${results.syncStatus.message}
                    </div>
                </div>
                ${results.recommendations.length > 0 ? `
                    <div class="border-t pt-2">
                        <div class="text-xs font-medium text-gray-700 mb-1">Recommendations:</div>
                        <ul class="text-xs text-gray-600 space-y-1">
                            ${results.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(reportDiv);
    },
    
    getStatusColor(status) {
        switch (status) {
            case 'OK': return 'text-green-600';
            case 'WARNING': return 'text-yellow-600';
            case 'ERROR': return 'text-red-600';
            default: return 'text-gray-600';
        }
    },
    
    getStatusEmoji(status) {
        switch (status) {
            case 'OK': return '✅';
            case 'WARNING': return '⚠️';
            case 'ERROR': return '❌';
            default: return '❓';
        }
    },
    
    // Force sync from local to Supabase
    async forceSyncToSupabase() {
        console.log('🔄 Force syncing local tasks to Supabase...');
        
        const localTasks = this.getLocalTasks();
        if (localTasks.length === 0) {
            console.log('📱 No local tasks to sync');
            return;
        }
        
        try {
            for (const task of localTasks) {
                await window.SupabaseTasks.addTask({
                    title: task.description,
                    description: task.description,
                    status: task.completed ? 'completed' : 'pending',
                    priority: task.priority || 1,
                    quadrant: task.quadrant || 1,
                    roleId: task.role_id,
                    goalId: task.goal_id
                });
            }
            
            console.log(`✅ Synced ${localTasks.length} tasks to Supabase`);
            this.showSuccessMessage(`Synced ${localTasks.length} tasks to Supabase`);
        } catch (error) {
            console.error('❌ Error syncing to Supabase:', error);
            this.showErrorMessage('Failed to sync to Supabase');
        }
    },
    
    // Force sync from Supabase to local
    async forceSyncFromSupabase() {
        console.log('🔄 Force syncing Supabase tasks to local...');
        
        try {
            const supabaseTasks = await this.getSupabaseTasks();
            if (supabaseTasks.error) {
                throw new Error(supabaseTasks.error);
            }
            
            if (supabaseTasks.length === 0) {
                console.log('☁️ No Supabase tasks to sync');
                return;
            }
            
            // Convert Supabase tasks to local format
            const localTasks = supabaseTasks.map(task => ({
                id: task.id,
                description: task.title,
                completed: task.status === 'completed',
                quadrant: task.quadrant,
                priority: task.priority,
                role_id: task.role_id,
                goal_id: task.goal_id,
                created_at: task.created_at,
                updated_at: task.updated_at
            }));
            
            // Save to localStorage
            localStorage.setItem('habitus_tasks', JSON.stringify(localTasks));
            
            console.log(`✅ Synced ${localTasks.length} tasks from Supabase`);
            this.showSuccessMessage(`Synced ${localTasks.length} tasks from Supabase`);
        } catch (error) {
            console.error('❌ Error syncing from Supabase:', error);
            this.showErrorMessage('Failed to sync from Supabase');
        }
    },
    
    showSuccessMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[10001]';
        msgDiv.textContent = `✅ ${message}`;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => msgDiv.remove(), 3000);
    },
    
    showErrorMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[10001]';
        msgDiv.textContent = `❌ ${message}`;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => msgDiv.remove(), 3000);
    }
};

// Make available globally
window.TaskSyncVerifier = TaskSyncVerifier;

// Auto-run verification if requested
if (window.location.search.includes('debug=tasks')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            TaskSyncVerifier.verifyTaskSync();
        }, 3000);
    });
}
