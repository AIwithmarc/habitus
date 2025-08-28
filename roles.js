/**
 * Roles Module
 * Handles role management functionality
 */
const Roles = (() => {
    // Private state
    let roles = [];

    // DOM Elements
    const elements = {
        roleInput: null,
        roleSelect: null,
        rolesList: null,
        addRoleBtn: null
    };

    // Initialize roles module
    function init() {
        // Cache DOM elements
        elements.roleInput = document.getElementById('roleInput');
        elements.roleSelect = document.getElementById('roleSelect');
        elements.rolesList = document.getElementById('rolesList');
        elements.addRoleBtn = document.getElementById('addRoleBtn');

        // Load saved roles
        loadRoles();

        // Set up event listeners
        setupEventListeners();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add role button
        elements.addRoleBtn?.addEventListener('click', addRole);

        // Role input enter key
        elements.roleInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addRole();
            }
        });
    }

    // Load roles from localStorage
    function loadRoles() {
        const storedRoles = localStorage.getItem('habitus_roles');
        if (storedRoles) {
            roles = JSON.parse(storedRoles);
            updateRoleOptions();
            renderRoleList();
        }
    }

    // Save roles to localStorage
    function saveRoles() {
        localStorage.setItem('habitus_roles', JSON.stringify(roles));
    }

    // Update role select options
    function updateRoleOptions() {
        if (!elements.roleSelect) return;

        // Clear current options except placeholder
        elements.roleSelect.innerHTML = '<option value="" disabled selected>Rol</option>';
        
        // Add role options
        roles.forEach(role => {
            const opt = document.createElement('option');
            opt.value = role;
            opt.textContent = role;
            elements.roleSelect.appendChild(opt);
        });
    }

    // Render role list
    function renderRoleList() {
        if (!elements.rolesList) return;

        elements.rolesList.innerHTML = '';

        if (roles.length === 0) {
            elements.rolesList.innerHTML = '<p class="text-sm text-gray-500">* No hay roles definidos *</p>';
            return;
        }

        roles.forEach((role, index) => {
            const roleItem = document.createElement('div');
            roleItem.className = 'flex items-center justify-between bg-white p-2 rounded shadow-sm';
            roleItem.innerHTML = `
                <span class="text-sm">${role}</span>
                <button onclick="Roles.deleteRole(${index})" class="text-red-500 hover:text-red-700">
                    🗑️
                </button>
            `;
            elements.rolesList.appendChild(roleItem);
        });
    }

    // Add a new role with robust validation
    function addRole() {
        if (!elements.roleInput) return;

        const roleName = elements.roleInput.value;
        
        // Validate role with existing roles check
        const validation = HabitusValidator.validateRole(roleName, roles);
        
        if (!validation.valid) {
            App.showNotification(validation.error, 'error');
            
            // Log validation errors for debugging
            if (HabitusConfig?.debug?.enabled) {
                console.error('Role validation failed:', validation);
            }
            return;
        }

        // Use validated and sanitized data
        roles.push(validation.data);
        saveRoles();
        updateRoleOptions();
        renderRoleList();
        
        // Notify Goals module to create default goal for new role
        if (window.Goals && window.Goals.onRolesChanged) {
            window.Goals.onRolesChanged();
        }
        
        // Clear input
        elements.roleInput.value = '';
        
        // Show success notification
        App.showNotification(Translations.getTranslation('notifications.role_added'), 'success');
    }

    // Delete a role
    function deleteRole(index) {
        if (index < 0 || index >= roles.length) return;

        // Remove role
        roles.splice(index, 1);
        saveRoles();
        updateRoleOptions();
        renderRoleList();

        // Show success notification
        App.showNotification(Translations.getTranslation('notifications.role_deleted'), 'success');
    }

    // Get all roles
    function getRoles() {
        return [...roles];
    }

    // Check if role exists
    function hasRole(roleName) {
        return roles.includes(roleName);
    }

    // Public API
    return {
        init,
        addRole,
        deleteRole,
        getRoles,
        hasRole
    };
})();

// Make Roles available globally
window.Roles = Roles;

// Remove automatic initialization
// document.addEventListener('DOMContentLoaded', () => {
//     Roles.init();
// }); 