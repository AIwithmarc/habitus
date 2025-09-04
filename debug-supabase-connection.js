/**
 * Supabase Connection Diagnostic Tool
 * Use this to debug connection issues between local and production
 */

const SupabaseDiagnostic = {
    async runDiagnostic() {
        console.log('🔍 Starting Supabase Connection Diagnostic...');
        
        const results = {
            config: await this.checkConfig(),
            connection: await this.checkConnection(),
            auth: await this.checkAuth(),
            tables: await this.checkTables(),
            permissions: await this.checkPermissions()
        };
        
        this.displayResults(results);
        return results;
    },
    
    async checkConfig() {
        console.log('📋 Checking configuration...');
        
        const config = window.HabitusSupabaseConfig;
        if (!config) {
            return { status: 'ERROR', message: 'HabitusSupabaseConfig not found' };
        }
        
        const isDev = config.isDevelopment;
        const currentConfig = config.config;
        
        return {
            status: 'OK',
            message: `Using ${isDev ? 'development' : 'production'} configuration`,
            details: {
                environment: isDev ? 'development' : 'production',
                url: currentConfig.url,
                hasAnonKey: !!currentConfig.anonKey
            }
        };
    },
    
    async checkConnection() {
        console.log('🔌 Testing Supabase connection...');
        
        try {
            const client = window.HabitusSupabase?.getClient();
            if (!client) {
                return { status: 'ERROR', message: 'Supabase client not available' };
            }
            
            // Test connection with a simple query
            const { data, error } = await client
                .from('profiles')
                .select('count')
                .limit(1);
            
            if (error) {
                return { status: 'ERROR', message: `Connection failed: ${error.message}` };
            }
            
            return { status: 'OK', message: 'Connection successful' };
        } catch (error) {
            return { status: 'ERROR', message: `Connection error: ${error.message}` };
        }
    },
    
    async checkAuth() {
        console.log('🔐 Checking authentication...');
        
        try {
            const isAuth = window.HabitusSupabase?.auth?.isAuthenticated();
            if (!isAuth) {
                return { status: 'WARNING', message: 'User not authenticated' };
            }
            
            const session = await window.HabitusSupabase.getClient().auth.getSession();
            return {
                status: 'OK',
                message: 'User authenticated',
                details: {
                    userId: session.data.session?.user?.id,
                    email: session.data.session?.user?.email
                }
            };
        } catch (error) {
            return { status: 'ERROR', message: `Auth check failed: ${error.message}` };
        }
    },
    
    async checkTables() {
        console.log('📊 Checking table access...');
        
        const tables = ['profiles', 'user_roles', 'user_goals', 'user_tasks', 'weekly_metrics'];
        const results = {};
        
        for (const table of tables) {
            try {
                const { data, error } = await window.HabitusSupabase.getClient()
                    .from(table)
                    .select('count')
                    .limit(1);
                
                results[table] = error ? 
                    { status: 'ERROR', message: error.message } :
                    { status: 'OK', message: 'Access granted' };
            } catch (error) {
                results[table] = { status: 'ERROR', message: error.message };
            }
        }
        
        return results;
    },
    
    async checkPermissions() {
        console.log('🔑 Checking user permissions...');
        
        try {
            const session = await window.HabitusSupabase.getClient().auth.getSession();
            const userId = session.data.session?.user?.id;
            
            if (!userId) {
                return { status: 'ERROR', message: 'No user ID available' };
            }
            
            // Test if user can read their own data
            const { data, error } = await window.HabitusSupabase.getClient()
                .from('user_tasks')
                .select('*')
                .eq('user_id', userId)
                .limit(1);
            
            if (error) {
                return { status: 'ERROR', message: `Permission error: ${error.message}` };
            }
            
            return { status: 'OK', message: 'User permissions verified' };
        } catch (error) {
            return { status: 'ERROR', message: `Permission check failed: ${error.message}` };
        }
    },
    
    displayResults(results) {
        console.log('📋 Diagnostic Results:');
        console.log('=====================');
        
        Object.entries(results).forEach(([category, result]) => {
            if (typeof result === 'object' && result.status) {
                const emoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
                console.log(`${emoji} ${category}: ${result.message}`);
                if (result.details) {
                    console.log('   Details:', result.details);
                }
            } else if (typeof result === 'object') {
                console.log(`📊 ${category}:`);
                Object.entries(result).forEach(([table, tableResult]) => {
                    const emoji = tableResult.status === 'OK' ? '✅' : '❌';
                    console.log(`   ${emoji} ${table}: ${tableResult.message}`);
                });
            }
        });
        
        // Create visual report in DOM
        this.createVisualReport(results);
    },
    
    createVisualReport(results) {
        const reportDiv = document.createElement('div');
        reportDiv.id = 'supabase-diagnostic-report';
        reportDiv.className = 'fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-[10000]';
        reportDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900">🔍 Supabase Diagnostic</h3>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div class="space-y-2 text-sm">
                ${this.generateReportHTML(results)}
            </div>
        `;
        
        document.body.appendChild(reportDiv);
    },
    
    generateReportHTML(results) {
        let html = '';
        
        Object.entries(results).forEach(([category, result]) => {
            if (typeof result === 'object' && result.status) {
                const emoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
                const color = result.status === 'OK' ? 'text-green-600' : result.status === 'WARNING' ? 'text-yellow-600' : 'text-red-600';
                html += `<div class="${color}">${emoji} ${category}: ${result.message}</div>`;
            } else if (typeof result === 'object') {
                html += `<div class="font-medium text-gray-700">📊 ${category}:</div>`;
                Object.entries(result).forEach(([table, tableResult]) => {
                    const emoji = tableResult.status === 'OK' ? '✅' : '❌';
                    const color = tableResult.status === 'OK' ? 'text-green-600' : 'text-red-600';
                    html += `<div class="${color} ml-2">${emoji} ${table}: ${tableResult.message}</div>`;
                });
            }
        });
        
        return html;
    }
};

// Make available globally
window.SupabaseDiagnostic = SupabaseDiagnostic;

// Auto-run diagnostic if requested
if (window.location.search.includes('debug=supabase')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            SupabaseDiagnostic.runDiagnostic();
        }, 2000);
    });
}
