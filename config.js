/**
 * Global Configuration for Habitus App
 * Centralizes all configuration settings and eliminates hardcoded values
 */

const HabitusConfig = (() => {
    // Auto-detect environment
    const isLocal = location.protocol === 'file:';
    const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isGitHubPages = location.hostname.includes('github.io');
    
    // Base URL detection
    const getBasePath = () => {
        if (isLocal) {
            return './';
        }
        
        if (isGitHubPages) {
            // Extract repo name from pathname
            const pathParts = location.pathname.split('/').filter(p => p);
            return pathParts.length > 0 ? `/${pathParts[0]}/` : '/';
        }
        
        // Default for custom domains
        return '/';
    };

    // Environment-specific configuration
    const config = {
        // Environment info
        environment: {
            isLocal,
            isDevelopment,
            isProduction: !isDevelopment && !isLocal,
            isGitHubPages,
            basePath: getBasePath(),
            version: '2.0.0'
        },

        // Application settings
        app: {
            name: 'Habitus - Planificador Semanal',
            shortName: 'Habitus',
            description: 'Organiza tu semana con claridad y propósito con Habitus.',
            version: '2.0.0',
            author: 'Habitus Team',
            themeColor: '#4f46e5',
            backgroundColor: '#ffffff'
        },

        // URLs and paths
        paths: {
            base: getBasePath(),
            icons: getBasePath() + 'icons/',
            vendor: getBasePath() + 'vendor/',
            assets: getBasePath() + 'assets/'
        },

        // CDN Configuration with fallbacks
        cdn: {
            tailwind: {
                url: 'https://cdn.tailwindcss.com',
                fallback: 'vendor/tailwind.min.css',
                integrity: null,
                timeout: 5000
            },
            chartjs: {
                url: 'https://cdn.jsdelivr.net/npm/chart.js@3',
                fallback: 'vendor/chart.min.js',
                integrity: null,
                timeout: 5000
            }
        },

        // PWA Configuration
        pwa: {
            manifestPath: getBasePath() + 'manifest.json',
            serviceWorkerPath: getBasePath() + 'service-worker-unified.js',
            scope: getBasePath(),
            startUrl: getBasePath(),
            display: 'standalone',
            orientation: 'portrait',
            shortcuts: [
                {
                    name: 'Nueva Tarea',
                    shortName: 'Nueva Tarea',
                    description: 'Agregar una nueva tarea',
                    url: getBasePath() + '?action=new-task',
                    icons: [{ 
                        src: getBasePath() + 'icons/icon-192x192.png', 
                        sizes: '192x192' 
                    }]
                },
                {
                    name: 'Ver Métricas',
                    shortName: 'Métricas',
                    description: 'Ver métricas semanales',
                    url: getBasePath() + '?action=metrics',
                    icons: [{ 
                        src: getBasePath() + 'icons/icon-192x192.png', 
                        sizes: '192x192' 
                    }]
                }
            ]
        },

        // Storage keys
        storage: {
            prefix: 'habitus_',
            keys: {
                tasks: 'habitus_tasks',
                metrics: 'habitus_metrics',
                tasksLog: 'habitus_tasksLog',
                lastReview: 'habitus_lastReview',
                lastReset: 'habitus_lastReset',
                roles: 'habitus_roles',
                feedback: 'habitus_feedback',
                settings: 'habitus_settings',
                lang: 'habitus_lang',
                theme: 'habitus_theme'
            }
        },

        // API Configuration
        api: {
            feedback: {
                googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfvesAJ3czHCvXQTAWoaE2sEg48sh-uTrz6EejQHbm2e7FePg/formResponse',
                fields: {
                    text: 'entry.139403842',
                    language: 'entry.1727937598',
                    version: 'entry.91491795',
                    userAgent: 'entry.1975576551',
                    day: 'entry.1060868168_day',
                    month: 'entry.1060868168_month',
                    year: 'entry.1060868168_year',
                    hour: 'entry.1060868168_hour',
                    minute: 'entry.1060868168_minute'
                }
            }
        },

        // UI Configuration
        ui: {
            animations: {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            charts: {
                colors: {
                    quadrants: ['#ef4444', '#22c55e', '#eab308', '#9ca3af'],
                    completion: ['#4ade80', '#f87171'],
                    primary: '#4f46e5',
                    secondary: '#8b5cf6'
                },
                animation: {
                    duration: 200
                }
            },
            breakpoints: {
                sm: 640,
                md: 768,
                lg: 1024,
                xl: 1280
            }
        },

        // Performance settings
        performance: {
            debounceDelay: 300,
            throttleDelay: 100,
            maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
            maxCacheSize: 50 * 1024 * 1024, // 50MB
            lazyLoadThreshold: 100
        },

        // Feature flags
        features: {
            offline: true,
            serviceWorker: true,
            backgroundSync: true,
            pushNotifications: true,
            analytics: false,
            dragAndDrop: true,
            keyboardShortcuts: true,
            exportData: true,
            darkMode: true,
            multiLanguage: true
        },

        // Debug settings
        debug: {
            enabled: isDevelopment || isLocal,
            verbose: false,
            logLevel: isDevelopment ? 'debug' : 'error'
        }
    };

    // Utility methods
    const utils = {
        // Get full URL from relative path
        getUrl(path) {
            if (path.startsWith('http')) return path;
            return new URL(path, window.location.origin + config.paths.base).href;
        },

        // Get icon URL
        getIconUrl(iconName, size = '192x192') {
            return this.getUrl(`icons/icon-${size}.png`);
        },

        // Get vendor asset URL
        getVendorUrl(assetName) {
            return this.getUrl(`vendor/${assetName}`);
        },

        // Check if feature is enabled
        isFeatureEnabled(feature) {
            return config.features[feature] === true;
        },

        // Get storage key
        getStorageKey(key) {
            return config.storage.keys[key] || `${config.storage.prefix}${key}`;
        },

        // Environment checks
        isOnline() {
            return navigator.onLine;
        },

        isStandalone() {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone ||
                   document.referrer.includes('android-app://');
        },

        // Device detection
        isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        isIOS() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent);
        },

        isAndroid() {
            return /Android/.test(navigator.userAgent);
        },

        // URL parameters
        getUrlParam(param) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        }
    };

    // Logging utility
    const logger = {
        debug: config.debug.enabled && config.debug.logLevel === 'debug' ? 
            console.debug.bind(console, '[Habitus]') : () => {},
        info: config.debug.enabled ? 
            console.info.bind(console, '[Habitus]') : () => {},
        warn: console.warn.bind(console, '[Habitus]'),
        error: console.error.bind(console, '[Habitus]')
    };

    // Initialize configuration
    function init() {
        logger.info('Initializing configuration...', {
            environment: config.environment,
            features: config.features,
            isOnline: utils.isOnline(),
            isStandalone: utils.isStandalone(),
            isMobile: utils.isMobile()
        });

        // Validate configuration
        if (!config.paths.base) {
            logger.warn('Base path not detected, using fallback');
            config.paths.base = '/';
        }

        // Set global CSS variables
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--app-primary-color', config.ui.charts.colors.primary);
            root.style.setProperty('--app-animation-duration', config.ui.animations.duration + 'ms');
        }

        logger.info('Configuration initialized successfully');
    }

    // Auto-initialize when loaded
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export public API
    return {
        ...config,
        utils,
        logger,
        init
    };
})();

// Make available globally
window.HabitusConfig = HabitusConfig;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HabitusConfig;
}
