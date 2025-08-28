/**
 * Translations Module
 * Handles all text content for the application
 */
const Translations = (() => {
    // Private state
    const translations = {
        // General
        title: "Habitus - Planificador Semanal",
        
        // Instructions
        instructions_title: "📖 Instrucciones de uso",
        inst_1: "🎭 <strong>Paso 1 - Define tus Roles:</strong> Identifica los roles importantes en tu vida (por ejemplo: Padre, Profesional, Amigo). Estos serán las categorías bajo las cuales organizarás tus tareas semanales.",
        inst_2: "🎯 <strong>Paso 2 - Crea tus Metas:</strong> Para cada rol, define metas específicas que quieres alcanzar. Cada rol tendrá automáticamente una meta por defecto llamada 'Otras Prioridades'.",
        inst_2_1: "📝 <strong>Paso 3 - Agrega tus Tareas:</strong> Para cada meta, añade las tareas que deseas realizar esta semana. Escribe una breve descripción y asigna el cuadrante correspondiente según su urgencia e importancia.",
        inst_3: "🔢 <strong>Prioriza con los Cuadrantes:</strong> Utiliza la Matriz de Prioridades (I-IV) para clasificar cada tarea:",
        inst_3_sub: "<ul class='list-none ml-4 mt-1'><li>I – Urgente e Importante (hacer de inmediato).</li><li>II – No Urgente e Importante (planificar tiempo para hacer).</li><li>III – Urgente y No Importante (intentar delegar o minimizar).</li><li>IV – No Urgente y No Importante (evitar en lo posible).</li></ul>",
        inst_4: "I – Urgente e Importante (hacer de inmediato).",
        inst_5: "II – No Urgente e Importante (planificar tiempo para hacer).",
        inst_6: "III – Urgente y No Importante (intentar delegar o minimizar).",
        inst_7: "IV – No Urgente y No Importante (evitar en lo posible).",
        inst_8: "✅ <strong>Marca las Completadas:</strong> A medida que termines cada tarea, márcala como realizada con la casilla de verificación.",
        inst_9: "🔄 <strong>Vista de Roles/Cuadrantes:</strong> Alterna entre la vista agrupada por roles o por cuadrantes usando las pestañas para obtener diferentes perspectivas de tus tareas.",
        inst_10: "📊 <strong>Revisa tus Métricas:</strong> Al finalizar la semana, revisa el resumen de tareas completadas y pendientes, y reflexiona sobre tu semana en Revisión Semanal.",
        inst_11: "📋 <strong>Exporta y Reinicia:</strong> Guarda un registro de tu semana utilizando Exportar Métricas y Exportar Tareas. Luego comienza una nueva semana con el botón Nueva Semana: solo las tareas completadas se removerán, las pendientes permanecerán para la siguiente semana.",
        
        // Tasks
        label_task: "Nueva Tarea:",
        placeholder_task: "Descripción de la tarea",
        add_task_button: "✔️ Añadir Tarea",
        no_tasks: "No hay tareas en esta sección",
        
        // Roles
        roles: "🎭 Definir Roles",
        placeholder_role: "Nuevo rol...",
        add_role: "➕ Añadir Rol",
        
        // Goals
        goals: "🎯 Definir Metas",
        placeholder_goal: "Nueva meta...",
        add_goal: "➕ Crear Meta",
        goal_role_select: "Seleccionar Rol",
        goal_name: "Nombre de la meta",
        goal_created: "Meta creada correctamente",
        goal_updated: "Meta actualizada correctamente",
        goal_deleted: "Meta eliminada correctamente",
        goal_color_updated: "Color de meta actualizado",
        goal_default: "Meta por defecto",
        goal_custom: "Meta personalizada",
        goal_delete_confirm: "Esta meta tiene tareas asociadas. ¿Estás seguro de que quieres eliminarla? Las tareas se moverán a la meta por defecto.",
        goal_cannot_delete_default: "No se pueden eliminar las metas por defecto",
        
        // Tabs
        tabs_roles: "Por Roles",
        tabs_quadrants: "Por Cuadrantes",
        
        // Review
        label_review: "📝 Revisión semanal:",
        placeholder_review: "Escribe aquí una reflexión sobre tu semana...",
        new_week: "🌅 Nueva Semana",
        
        // Metrics
        metric_total: "Total de Tareas",
        metric_percent: "Porcentaje Completado",
        metric_roles: "Roles Activos",
        metric_quadrants: "Tareas por Cuadrante",
        metric_completed: "Completadas",
        metric_pending: "Pendientes",
        
        // Charts
        chart_title_completion: "Completadas vs Pendientes",
        chart_completion_title: "Porcentaje de Completado por Semana",
        chart_quadrants_title: "Tareas por Cuadrante por Semana",
        chart_roles_title: "Roles Activos por Semana",
        
        // Export buttons
        export_metrics: "📊 Exportar Métricas",
        export_tasks: "📋 Exportar Tareas",
        
        // Notifications
        notifications: {
            task_added: "Tarea añadida correctamente",
            task_completed: "Tarea marcada como completada",
            task_uncompleted: "Tarea marcada como pendiente",
            task_deleted: "Tarea eliminada",
            review_saved: "Revisión guardada",
            new_week_started: "Nueva semana iniciada"
        },

        // Feedback translations
        feedback_title: "Enviar Feedback",
        feedback_placeholder: "Escribe aquí tus sugerencias, mejoras o reporta algún error...",
        feedback_empty: "Por favor, escribe tu feedback antes de enviar.",
        feedback_sent: "¡Gracias por tu feedback! 💝 Tu opinión es valiosa para mejorar Habitus.",
        cancel: "Cancelar",
        send: "Enviar",

        // Check-in translations
        checkin_title: "Check-in Semanal",
        checkin_section_title: "Check-in Semanal",
        checkin_section_description: "Reflexiona sobre tu semana antes de comenzar la siguiente",
        checkin_summary: "Resumen de la Semana",
        checkin_completed: "Tareas Completadas",
        checkin_pending: "Tareas Pendientes",
        checkin_reflection: "Reflexión de la Semana",
        checkin_reflection_placeholder: "¿Qué aprendiste esta semana? ¿Qué cambiarías para la próxima?",
        checkin_postpone: "Recordar Después",
        checkin_complete: "Completar Check-in",

        // Migration translations
        migration_title: "Migración de Datos",
        export_complete: "Exportar Datos Completos",
        import_data: "Importar Datos",
        migration_description: "Exporta todos tus datos para migrar a otro dispositivo o crear un respaldo completo.",

        es: {
            feedback_title: "Enviar Feedback",
            feedback_placeholder: "Escribe aquí tus sugerencias, mejoras o reporta algún error...",
            feedback_empty: "Por favor, escribe tu feedback antes de enviar.",
            feedback_sent: "¡Gracias por tu feedback! 💝 Tu opinión es valiosa para mejorar Habitus.",
            cancel: "Cancelar",
            send: "Enviar"
        },
        en: {
            feedback_title: "Send Feedback",
            feedback_placeholder: "Write your suggestions, improvements or report any issues here...",
            feedback_empty: "Please write your feedback before sending.",
            feedback_sent: "Thank you for your feedback! 💝 Your input is valuable to improve Habitus.",
            cancel: "Cancel",
            send: "Send"
        }
    };

    // DOM Elements
    const elements = {
        quoteContainer: null
    };

    // Initialize translations module
    async function init() {
        try {
            console.log('Initializing Translations module...');
            
            // Cache DOM elements
            elements.quoteContainer = document.getElementById('verso-contenedor');
            
            // Update all translatable elements
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = getTranslation(key);
                if (translation) {
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        // For instruction items, preserve the HTML structure
                        if (key.startsWith('inst_')) {
                            element.innerHTML = translation;
                        } else {
                            element.textContent = translation;
                        }
                    }
                } else {
                    console.warn(`Translation not found for key: ${key}`);
                }
            });
            
            // Update placeholders
            document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                const translation = getTranslation(key);
                if (translation) {
                    element.placeholder = translation;
                } else {
                    console.warn(`Translation not found for placeholder key: ${key}`);
                }
            });
            
            // Remove verse container if it exists
            if (elements.quoteContainer) {
                elements.quoteContainer.remove();
            }
            
            console.log('Translations module initialized successfully');
        } catch (error) {
            console.error('Error initializing Translations module:', error);
            throw error;
        }
    }

    // Get a translation string
    function getTranslation(key) {
        return translations[key] || key;
    }

    // Public API
    return {
        init,
        getTranslation
    };
})();

// Make Translations available globally
window.Translations = Translations;



