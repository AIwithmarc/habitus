/**
 * Data Migration Module for Habitus
 * Handles complete export/import for device migration
 */

const Migration = (() => {
    'use strict';

    // Migration data structure
    const MIGRATION_SCHEMA = {
        version: '2.0.0',
        sections: {
            METADATA: 'METADATA',
            TASKS: 'TASKS', 
            ROLES: 'ROLES',
            GOALS: 'GOALS',
            METRICS: 'METRICS',
            TASKS_LOG: 'TASKS_LOG',
            SETTINGS: 'SETTINGS',
            CHECKIN: 'CHECKIN',
            IDEAS: 'IDEAS'
        }
    };

    // CSV Structure for complete migration
    function prepareMigrationData() {
        try {
            const migrationData = {
                metadata: {
                    version: MIGRATION_SCHEMA.version,
                    exportDate: new Date().toISOString(),
                    deviceInfo: {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        platform: navigator.platform
                    }
                },
                
                // Current tasks
                tasks: JSON.parse(localStorage.getItem('habitus_tasks') || '[]'),
                
                // Roles
                roles: JSON.parse(localStorage.getItem('habitus_roles') || '[]'),
                
                // Goals
                goals: JSON.parse(localStorage.getItem('habitus_goals') || '[]'),
                
                // Historical metrics
                metrics: JSON.parse(localStorage.getItem('habitus_metrics') || '[]'),
                
                // Completed tasks log
                tasksLog: JSON.parse(localStorage.getItem('habitus_tasksLog') || '[]'),
                
                // Check-in state
                checkIn: JSON.parse(localStorage.getItem('habitus_checkin_state') || '{}'),
                
                // Ideas from Perhaps List
                ideas: JSON.parse(localStorage.getItem('habitus_ideas') || '[]'),
                
                // Settings and preferences
                settings: {
                    lastReview: localStorage.getItem('habitus_lastReview') || '',
                    lastReset: localStorage.getItem('habitus_lastReset') || '',
                    lang: localStorage.getItem('habitus_lang') || 'es',
                    theme: localStorage.getItem('habitus_theme') || 'light',
                    feedback: JSON.parse(localStorage.getItem('habitus_feedback') || '[]')
                }
            };

            return migrationData;
        } catch (error) {
            console.error('[Migration] Error preparing data:', error);
            throw new Error('Error al preparar datos para exportación');
        }
    }

    // Convert migration data to CSV format
    function convertToCSV(migrationData) {
        const rows = [];
        
        // Header row
        rows.push([
            'SECTION',
            'TYPE', 
            'ID',
            'DATA_JSON',
            'TIMESTAMP',
            'METADATA'
        ]);

        // Metadata section
        rows.push([
            MIGRATION_SCHEMA.sections.METADATA,
            'export_info',
            'export_' + Date.now(),
            JSON.stringify(migrationData.metadata),
            new Date().toISOString(),
            'Export metadata and device info'
        ]);

        // Tasks section
        migrationData.tasks.forEach((task, index) => {
            rows.push([
                MIGRATION_SCHEMA.sections.TASKS,
                'current_task',
                task.id || `task_${index}`,
                JSON.stringify(task),
                task.createdAt || new Date().toISOString(),
                `Task: ${task.description?.substring(0, 50) || 'No description'}...`
            ]);
        });

        // Roles section
        migrationData.roles.forEach((role, index) => {
            rows.push([
                MIGRATION_SCHEMA.sections.ROLES,
                'role',
                `role_${index}`,
                JSON.stringify({ name: role }),
                new Date().toISOString(),
                `Role: ${role}`
            ]);
        });

        // Goals section
        migrationData.goals.forEach((goal, index) => {
            rows.push([
                MIGRATION_SCHEMA.sections.GOALS,
                'goal',
                `goal_${goal.id || index}`,
                JSON.stringify(goal),
                new Date(goal.createdAt).toISOString(),
                `Goal: ${goal.name?.substring(0, 50) || 'No name'}...`
            ]);
        });

        // Metrics section
        migrationData.metrics.forEach((metric, index) => {
            rows.push([
                MIGRATION_SCHEMA.sections.METRICS,
                'weekly_metric',
                `metric_${metric.timestamp || index}`,
                JSON.stringify(metric),
                new Date(metric.timestamp).toISOString(),
                `Week metrics: ${metric.totalTasks || 0} tasks, ${Math.round((metric.completedTasks || 0) / (metric.totalTasks || 1) * 100)}% completed`
            ]);
        });

        // Tasks log section
        migrationData.tasksLog.forEach((log, index) => {
            log.tasks.forEach((task, taskIndex) => {
                rows.push([
                    MIGRATION_SCHEMA.sections.TASKS_LOG,
                    'completed_task',
                    `log_${log.timestamp}_${taskIndex}`,
                    JSON.stringify(task),
                    new Date(log.timestamp).toISOString(),
                    `Completed: ${task.description?.substring(0, 50) || 'No description'}...`
                ]);
            });
        });

        // Check-in section
        if (Object.keys(migrationData.checkIn).length > 0) {
            rows.push([
                MIGRATION_SCHEMA.sections.CHECKIN,
                'checkin_state',
                'checkin_current',
                JSON.stringify(migrationData.checkIn),
                new Date().toISOString(),
                'Check-in state and preferences'
            ]);
        }

        // Ideas section
        migrationData.ideas.forEach((idea, index) => {
            rows.push([
                MIGRATION_SCHEMA.sections.IDEAS,
                'idea',
                `idea_${idea.id || index}`,
                JSON.stringify(idea),
                new Date(idea.createdAt).toISOString(),
                `Idea: ${idea.description?.substring(0, 50) || 'No description'}...`
            ]);
        });

        // Settings section
        Object.entries(migrationData.settings).forEach(([key, value]) => {
            if (value && value !== '' && value !== '[]') {
                rows.push([
                    MIGRATION_SCHEMA.sections.SETTINGS,
                    'setting',
                    `setting_${key}`,
                    JSON.stringify({ key, value }),
                    new Date().toISOString(),
                    `Setting: ${key}`
                ]);
            }
        });

        return rows;
    }

    // Export complete data
    function exportCompleteData() {
        try {
            HabitusConfig?.logger?.info('Starting complete data export...');

            const migrationData = prepareMigrationData();
            const csvRows = convertToCSV(migrationData);
            
            // Convert to CSV string
            const csvContent = csvRows.map(row => 
                row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    const cellStr = String(cell || '');
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return `"${cellStr.replace(/"/g, '""')}"`;
                    }
                    return cellStr;
                }).join(',')
            ).join('\n');

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `habitus_complete_backup_${timestamp}.csv`;

            // Download file
            downloadCSV(csvContent, filename);

            // Show success notification
            if (App?.showNotification) {
                App.showNotification(`Datos exportados exitosamente: ${filename}`, 'success');
            }

            HabitusConfig?.logger?.info('Complete data export successful');

            return {
                success: true,
                filename,
                recordCount: csvRows.length - 1, // Subtract header row
                sections: Object.keys(MIGRATION_SCHEMA.sections).length
            };

        } catch (error) {
            console.error('[Migration] Export error:', error);
            if (App?.showNotification) {
                App.showNotification('Error al exportar datos: ' + error.message, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    // Parse CSV content
    function parseCSV(csvContent) {
        const lines = csvContent.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const row = [];
            let inQuotes = false;
            let currentCell = '';
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    if (inQuotes && line[j + 1] === '"') {
                        currentCell += '"';
                        j++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    row.push(currentCell);
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
            
            row.push(currentCell); // Add last cell
            result.push(row);
        }
        
        return result;
    }

    // Import data from CSV
    function importData(csvContent) {
        try {
            HabitusConfig?.logger?.info('Starting data import...');

            const rows = parseCSV(csvContent);
            
            if (rows.length === 0) {
                throw new Error('Archivo CSV vacío');
            }

            // Validate header
            const header = rows[0];
            const expectedHeader = ['SECTION', 'TYPE', 'ID', 'DATA_JSON', 'TIMESTAMP', 'METADATA'];
            
            if (!expectedHeader.every((col, index) => header[index] === col)) {
                throw new Error('Formato de archivo inválido. No es un backup de Habitus válido.');
            }

            // Process data by sections
            const importedData = {
                tasks: [],
                roles: [],
                goals: [],
                metrics: [],
                tasksLog: [],
                checkIn: {},
                settings: {},
                ideas: []
            };

            let metadataRow = null;

            // Parse each row
            for (let i = 1; i < rows.length; i++) {
                const [section, type, id, dataJson, timestamp, metadata] = rows[i];
                
                try {
                    const data = JSON.parse(dataJson);
                    
                    switch (section) {
                        case MIGRATION_SCHEMA.sections.METADATA:
                            metadataRow = data;
                            break;
                            
                        case MIGRATION_SCHEMA.sections.TASKS:
                            if (type === 'current_task') {
                                importedData.tasks.push(data);
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.ROLES:
                            if (data.name) {
                                importedData.roles.push(data.name);
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.GOALS:
                            if (type === 'goal') {
                                importedData.goals.push(data);
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.METRICS:
                            if (type === 'weekly_metric') {
                                importedData.metrics.push(data);
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.TASKS_LOG:
                            if (type === 'completed_task') {
                                // Group by timestamp
                                const logTimestamp = new Date(timestamp).getTime();
                                let existingLog = importedData.tasksLog.find(log => 
                                    Math.abs(log.timestamp - logTimestamp) < 1000 * 60 * 60 // Within 1 hour
                                );
                                
                                if (!existingLog) {
                                    existingLog = {
                                        timestamp: logTimestamp,
                                        tasks: []
                                    };
                                    importedData.tasksLog.push(existingLog);
                                }
                                
                                existingLog.tasks.push(data);
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.CHECKIN:
                            importedData.checkIn = data;
                            break;
                            
                        case MIGRATION_SCHEMA.sections.SETTINGS:
                            if (data.key && data.value !== undefined) {
                                importedData.settings[data.key] = data.value;
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.IDEAS:
                            if (type === 'idea') {
                                importedData.ideas.push(data);
                            }
                            break;
                            
                        case MIGRATION_SCHEMA.sections.GOALS:
                            if (type === 'goal') {
                                importedData.goals.push(data);
                            }
                            break;
                    }
                } catch (parseError) {
                    console.warn(`[Migration] Error parsing row ${i}:`, parseError);
                    // Continue with other rows
                }
            }

            // Confirm import with user
            const confirmation = confirm(
                `¿Importar datos de Habitus?\n\n` +
                `Tareas actuales: ${importedData.tasks.length}\n` +
                `Roles: ${importedData.roles.length}\n` +
                `Metas: ${importedData.goals.length}\n` +
                `Ideas: ${importedData.ideas.length}\n` +
                `Métricas históricas: ${importedData.metrics.length}\n` +
                `Tareas completadas históricas: ${importedData.tasksLog.reduce((sum, log) => sum + log.tasks.length, 0)}\n\n` +
                `ADVERTENCIA: Esto reemplazará todos los datos actuales.`
            );

            if (!confirmation) {
                return { success: false, cancelled: true };
            }

            // Backup current data
            const backupResult = exportCompleteData();
            console.log('Backup created before import:', backupResult);

            // Import data to localStorage
            localStorage.setItem('habitus_tasks', JSON.stringify(importedData.tasks));
            localStorage.setItem('habitus_roles', JSON.stringify(importedData.roles));
            localStorage.setItem('habitus_goals', JSON.stringify(importedData.goals));
            localStorage.setItem('habitus_metrics', JSON.stringify(importedData.metrics));
            localStorage.setItem('habitus_tasksLog', JSON.stringify(importedData.tasksLog));
            localStorage.setItem('habitus_ideas', JSON.stringify(importedData.ideas));
            
            if (Object.keys(importedData.checkIn).length > 0) {
                localStorage.setItem('habitus_checkin_state', JSON.stringify(importedData.checkIn));
            }

            // Import settings
            Object.entries(importedData.settings).forEach(([key, value]) => {
                switch (key) {
                    case 'lastReview':
                        localStorage.setItem('habitus_lastReview', value);
                        break;
                    case 'lastReset':
                        localStorage.setItem('habitus_lastReset', value);
                        break;
                    case 'lang':
                        localStorage.setItem('habitus_lang', value);
                        break;
                    case 'theme':
                        localStorage.setItem('habitus_theme', value);
                        break;
                    case 'feedback':
                        if (Array.isArray(value)) {
                            localStorage.setItem('habitus_feedback', JSON.stringify(value));
                        }
                        break;
                }
            });

            // Show success and reload
            if (App?.showNotification) {
                App.showNotification('Datos importados exitosamente. Recargando aplicación...', 'success');
            }

            setTimeout(() => {
                window.location.reload();
            }, 2000);

            return {
                success: true,
                imported: {
                    tasks: importedData.tasks.length,
                    roles: importedData.roles.length,
                    goals: importedData.goals.length,
                    ideas: importedData.ideas.length,
                    metrics: importedData.metrics.length,
                    tasksLog: importedData.tasksLog.length,
                    settings: Object.keys(importedData.settings).length
                }
            };

        } catch (error) {
            console.error('[Migration] Import error:', error);
            if (App?.showNotification) {
                App.showNotification('Error al importar datos: ' + error.message, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    // Handle file selection for import
    function handleImportFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.style.display = 'none';
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const csvContent = e.target.result;
                importData(csvContent);
            };
            reader.onerror = function() {
                if (App?.showNotification) {
                    App.showNotification('Error al leer el archivo', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    // Utility function for downloading CSV (reused)
    function downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Migrate existing tasks to include goals
    function migrateTasksToGoals() {
        try {
            console.log('[Migration] Starting tasks to goals migration...');
            
            const tasks = JSON.parse(localStorage.getItem('habitus_tasks') || '[]');
            const goals = JSON.parse(localStorage.getItem('habitus_goals') || '[]');
            
            if (tasks.length === 0) {
                console.log('[Migration] No tasks to migrate');
                return;
            }

            let migratedCount = 0;
            const updatedTasks = tasks.map(task => {
                if (!task.goal) {
                    // Find default goal for this role
                    const defaultGoal = goals.find(g => g.role === task.role && g.isDefault);
                    if (defaultGoal) {
                        task.goal = defaultGoal.id;
                        migratedCount++;
                        console.log(`[Migration] Assigned task "${task.description}" to default goal "${defaultGoal.name}"`);
                    } else {
                        console.warn(`[Migration] No default goal found for role: ${task.role}`);
                    }
                }
                return task;
            });

            // Save migrated tasks
            localStorage.setItem('habitus_tasks', JSON.stringify(updatedTasks));
            
            console.log(`[Migration] Successfully migrated ${migratedCount} tasks to include goals`);
            
            // Show notification
            if (window.App && window.App.showNotification) {
                window.App.showNotification(`Migración completada: ${migratedCount} tareas actualizadas con metas`, 'success');
            }
            
            return migratedCount;
        } catch (error) {
            console.error('[Migration] Error during tasks to goals migration:', error);
            throw new Error('Error durante la migración de tareas a metas');
        }
    }

    // Public API
    return {
        exportCompleteData,
        importData,
        handleImportFile,
        
        // Utility methods
        prepareMigrationData,
        parseCSV,
        
        // Schema info
        getSchema: () => MIGRATION_SCHEMA,
        migrateTasksToGoals
    };
})();

// Make available globally
window.Migration = Migration;
