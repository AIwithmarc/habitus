/**
 * Supabase Configuration for Habitus v5
 * Centralized configuration for Supabase client and settings
 */

// Supabase Configuration
const SUPABASE_CONFIG = {
    // Development (local)
    development: {
        url: 'http://localhost:54321',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    },
    
    // Production (Supabase hosted)
    production: {
        url: 'https://hjqescljambkhufpmrzd.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcWVzY2xqYW1ia2h1ZnBtcnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTg5ODksImV4cCI6MjA3MTk5NDk4OX0.fFCCqicumUEcqf-HBl1YIKlVgsVYd2JkPHYU_ACar48'
    }
};

// Auto-detect environment
const isDevelopment = false; // Set to true for local development
const currentConfig = isDevelopment ? SUPABASE_CONFIG.development : SUPABASE_CONFIG.production;

// Table names configuration
const TABLES = {
    PROFILES: 'profiles',
    ROLES: 'user_roles',
    GOALS: 'user_goals',
    TASKS: 'user_tasks',
    METRICS: 'weekly_metrics',
    CHECKINS: 'weekly_checkins',
    IDEAS: 'user_ideas',
    TASK_HISTORY: 'task_history'
};

// Column names for common operations
const COLUMNS = {
    // Common
    ID: 'id',
    USER_ID: 'user_id',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
    
    // Roles
    ROLE_NAME: 'role_name',
    ROLE_COLOR: 'color',
    ROLE_SORT_ORDER: 'sort_order',
    ROLE_ACTIVE: 'is_active',
    
    // Goals
    GOAL_NAME: 'goal_name',
    GOAL_COLOR: 'color',
    GOAL_DEFAULT: 'is_default',
    GOAL_SORT_ORDER: 'sort_order',
    GOAL_ACTIVE: 'is_active',
    ROLE_ID: 'role_id',
    
    // Tasks
    TASK_DESCRIPTION: 'task_description',
    TASK_QUADRANT: 'quadrant',
    TASK_STATUS: 'status',
    TASK_COMPLETED: 'completed',
    TASK_COMPLETED_AT: 'completed_at',
    TASK_WEEK_START: 'week_start',
    TASK_PRIORITY: 'priority',
    TASK_NOTES: 'notes',
    GOAL_ID: 'goal_id',
    
    // Metrics
    METRICS_WEEK_START: 'week_start',
    METRICS_TOTAL_TASKS: 'total_tasks',
    METRICS_COMPLETED_TASKS: 'completed_tasks',
    METRICS_QUADRANT_DISTRIBUTION: 'quadrant_distribution',
    METRICS_PRODUCTIVITY_SCORE: 'productivity_score',
    METRICS_FOCUS_TIME: 'focus_time_hours',
    
    // Check-ins
    CHECKIN_WEEK_START: 'week_start',
    CHECKIN_REFLECTION: 'reflection_text',
    CHECKIN_ACHIEVEMENTS: 'achievements',
    CHECKIN_LEARNINGS: 'learnings',
    CHECKIN_NEXT_GOALS: 'next_week_goals',
    CHECKIN_MOOD: 'mood_rating',
    CHECKIN_ENERGY: 'energy_level',
    CHECKIN_STRESS: 'stress_level',
    
    // Ideas
    IDEA_TEXT: 'idea_text',
    IDEA_STATUS: 'status',
    IDEA_PRIORITY: 'priority',
    IDEA_TAGS: 'tags',
    IDEA_EFFORT: 'estimated_effort',
    IDEA_TARGET_WEEK: 'target_week'
};

// Status enums
const STATUS = {
    TASK: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    IDEA: {
        PENDING: 'pending',
        IMPLEMENTED: 'implemented',
        ARCHIVED: 'archived'
    }
};

// Quadrant definitions
const QUADRANTS = {
    Q1: { id: 1, name: 'Urgente e Importante', color: '#DC2626', description: 'Hacer de inmediato' },
    Q2: { id: 2, name: 'No Urgente e Importante', color: '#2563EB', description: 'Planificar tiempo' },
    Q3: { id: 3, name: 'Urgente y No Importante', color: '#D97706', description: 'Delegar o minimizar' },
    Q4: { id: 4, name: 'No Urgente y No Importante', color: '#6B7280', description: 'Evitar en lo posible' }
};

// Priority levels
const PRIORITIES = {
    1: { name: 'Baja', color: '#10B981' },
    2: { name: 'Media-Baja', color: '#34D399' },
    3: { name: 'Media', color: '#F59E0B' },
    4: { name: 'Media-Alta', color: '#F97316' },
    5: { name: 'Alta', color: '#DC2626' }
};

// Mood ratings
const MOOD_RATINGS = {
    1: { name: 'Muy Malo', emoji: '😢', color: '#DC2626' },
    2: { name: 'Malo', emoji: '😕', color: '#F59E0B' },
    3: { name: 'Neutral', emoji: '😐', color: '#6B7280' },
    4: { name: 'Bueno', emoji: '🙂', color: '#10B981' },
    5: { name: 'Excelente', emoji: '😄', color: '#059669' }
};

// Default colors for roles and goals
const DEFAULT_COLORS = {
    ROLES: [
        '#4F46E5', // Indigo principal
        '#7C3AED', // Violeta
        '#059669', // Verde esmeralda
        '#DC2626', // Rojo
        '#EA580C', // Naranja
        '#0891B2', // Cian
        '#7C2D12', // Marrón
        '#6B7280', // Gris
        '#EC4899', // Rosa
        '#8B5CF6'  // Púrpura
    ],
    GOALS: [
        '#7C3AED', // Violeta
        '#059669', // Verde esmeralda
        '#DC2626', // Rojo
        '#EA580C', // Naranja
        '#0891B2', // Cian
        '#7C2D12', // Marrón
        '#6B7280', // Gris
        '#EC4899', // Rosa
        '#8B5CF6', // Púrpura
        '#4F46E5'  // Indigo
    ]
};

// Export configuration
window.HabitusSupabaseConfig = {
    config: currentConfig,
    tables: TABLES,
    columns: COLUMNS,
    status: STATUS,
    quadrants: QUADRANTS,
    priorities: PRIORITIES,
    moodRatings: MOOD_RATINGS,
    defaultColors: DEFAULT_COLORS,
    isDevelopment,
    
    // Helper methods
    getTableName: (tableKey) => TABLES[tableKey],
    getColumnName: (columnKey) => COLUMNS[columnKey],
    getQuadrantInfo: (quadrantId) => QUADRANTS[`Q${quadrantId}`],
    getPriorityInfo: (priorityLevel) => PRIORITIES[priorityLevel],
    getMoodInfo: (moodRating) => MOOD_RATINGS[moodRating],
    getRandomColor: (type = 'ROLES') => {
        const colors = DEFAULT_COLORS[type];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};

// Log configuration for debugging
if (isDevelopment) {
    console.log('🔧 Habitus Supabase Config (Development):', window.HabitusSupabaseConfig);
}
