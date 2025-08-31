/**
 * Authentication UI for Habitus v5
 * Handles login, registration, and user profile management
 */

const AuthUI = {
    // DOM elements
    elements: {
        authModal: null,
        loginForm: null,
        registerForm: null,
        profileSection: null,
        userMenu: null
    },

    // State
    currentView: 'login', // 'login', 'register', 'profile'
    isModalOpen: false,

    // Initialize authentication UI
    init() {
        try {
            console.log('🔐 Initializing Auth UI...');
            this.createAuthModal();
            this.setupEventListeners();
            this.checkAuthState();
            console.log('✅ Auth UI initialized');
        } catch (error) {
            console.error('❌ Auth UI initialization failed:', error);
        }
    },

    // Check authentication state and update UI accordingly
    checkAuthState() {
        const isAuthenticated = this.isAuthenticated();
        this.updateAuthOverlay(isAuthenticated);
        this.updateMenuState(isAuthenticated);
        this.updateAuthButton(isAuthenticated);
    },

    // Update authentication overlay visibility
    updateAuthOverlay(isAuthenticated) {
        const overlay = document.getElementById('authRequiredOverlay');
        if (overlay) {
            if (isAuthenticated) {
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
            }
        }
    },

    // Update menu state based on authentication
    updateMenuState(isAuthenticated) {
        const userProfileSection = document.getElementById('userProfileSection');
        const guestUserSection = document.getElementById('guestUserSection');
        const userMenuButton = document.getElementById('userMenuButton');
        const authButton = document.getElementById('authButton');
        
        if (userProfileSection && guestUserSection) {
            if (isAuthenticated) {
                userProfileSection.classList.remove('hidden');
                guestUserSection.classList.add('hidden');
                
                // Show user menu button, hide auth button
                if (userMenuButton) userMenuButton.style.display = 'block';
                if (authButton) authButton.style.display = 'none';
                
                // Update user info
                this.updateUserInfo();
            } else {
                userProfileSection.classList.add('hidden');
                guestUserSection.classList.remove('hidden');
                
                // Hide user menu button, show auth button
                if (userMenuButton) userMenuButton.style.display = 'none';
                if (authButton) authButton.style.display = 'block';
            }
        }
    },

    // Update authentication button
    updateAuthButton(isAuthenticated) {
        const authButton = document.getElementById('authButton');
        if (authButton) {
            if (isAuthenticated) {
                authButton.style.display = 'none';
            } else {
                authButton.style.display = 'block';
            }
        }
    },

    // Update user information in the menu
    updateUserInfo() {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userInitials = document.getElementById('userInitials');
        const userSince = document.getElementById('userSince');
        const userMenuAvatar = document.getElementById('userMenuAvatar');
        
        if (userName && userEmail) {
            const user = this.getCurrentUser();
            if (user) {
                // Usar nombre personalizado si existe, sino email
                const displayName = user.name || user.email || 'Usuario';
                const email = user.email || 'usuario@email.com';
                const createdAt = user.created_at || Date.now();
                
                userName.textContent = displayName;
                userEmail.textContent = email;
                
                // Update initials - usar las primeras letras del nombre o email
                const nameForInitials = displayName.includes('@') ? displayName.split('@')[0] : displayName;
                const initials = nameForInitials ? nameForInitials.substring(0, 2).toUpperCase() : 'U';
                
                if (userInitials) {
                    userInitials.textContent = initials;
                }
                
                // Update user menu avatar
                if (userMenuAvatar) {
                    userMenuAvatar.textContent = initials;
                }
                
                // Update member since date
                if (userSince) {
                    const date = new Date(createdAt);
                    const formattedDate = date.toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long' 
                    });
                    userSince.textContent = `Miembro desde ${formattedDate}`;
                }
            }
        }
    },

    // Get current user information
    getCurrentUser() {
        try {
            return window.HabitusSupabase?.auth?.getCurrentUser() || null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        return window.HabitusSupabase?.auth?.isAuthenticated() || false;
    },

    // Create authentication modal
    createAuthModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('authModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div id="authModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-xl text-white">
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-semibold" id="authModalTitle">Iniciar Sesión</h2>
                            <button id="closeAuthModal" class="text-white hover:text-indigo-200 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-6">
                        <!-- Login Form -->
                        <form id="loginForm" class="space-y-4">
                            <div>
                                <label for="loginEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" id="loginEmail" required 
                                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                       placeholder="tu@email.com">
                            </div>
                            <div>
                                <label for="loginPassword" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <input type="password" id="loginPassword" required 
                                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                       placeholder="••••••••">
                            </div>
                            <button type="submit" 
                                    class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium">
                                🔐 Iniciar Sesión
                            </button>
                            <div class="text-center">
                                <button type="button" id="forgotPasswordBtn" class="text-sm text-indigo-600 hover:text-indigo-800">
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </form>

                        <!-- Register Form -->
                        <form id="registerForm" class="space-y-4 hidden">
                            <div>
                                <label for="registerName" class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input type="text" id="registerName" required 
                                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                       placeholder="Tu Nombre">
                            </div>
                            <div>
                                <label for="registerEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" id="registerEmail" required 
                                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                       placeholder="tu@email.com">
                            </div>
                            <div>
                                <label for="registerPassword" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <input type="password" id="registerPassword" required minlength="6"
                                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                       placeholder="Mínimo 6 caracteres">
                            </div>
                            <div>
                                <label for="registerPasswordConfirm" class="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                                <input type="password" id="registerPasswordConfirm" required minlength="6"
                                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                       placeholder="Repite tu contraseña">
                            </div>
                            <button type="submit" 
                                    class="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium">
                                ✨ Crear Cuenta
                            </button>
                        </form>

                        <!-- Profile Section -->
                        <div id="profileSection" class="space-y-4 hidden">
                            <div class="text-center">
                                <div class="w-20 h-20 bg-indigo-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <span class="text-2xl text-indigo-600" id="profileAvatar">👤</span>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900" id="profileName">Usuario</h3>
                                <p class="text-sm text-gray-600" id="profileEmail">usuario@email.com</p>
                            </div>
                            <div class="space-y-3">
                                <button id="editProfileBtn" 
                                        class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium">
                                    ✏️ Editar Perfil
                                </button>
                                <button id="signOutBtn" 
                                        class="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium">
                                    🚪 Cerrar Sesión
                                </button>
                            </div>
                        </div>

                        <!-- Edit Profile Form (hidden by default) -->
                        <div id="editProfileForm" class="space-y-4 hidden">
                            <div class="text-center mb-4">
                                <h4 class="text-lg font-semibold text-gray-900">Editar Perfil</h4>
                                <p class="text-sm text-gray-600">Actualiza tu información personal</p>
                            </div>
                            <form id="profileEditForm" class="space-y-4">
                                <div>
                                    <label for="editProfileName" class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input type="text" id="editProfileName" required 
                                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                           placeholder="Tu Nombre">
                                </div>
                                <div>
                                    <label for="editProfileEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" id="editProfileEmail" required 
                                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                           placeholder="tu@email.com">
                                </div>
                                <div class="flex space-x-3">
                                    <button type="submit" 
                                            class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium">
                                        💾 Guardar
                                    </button>
                                    <button type="button" id="cancelEditProfileBtn" 
                                            class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium">
                                        ❌ Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Toggle between login and register -->
                        <div class="mt-6 text-center">
                            <div id="authToggle" class="text-sm text-gray-600">
                                ¿No tienes cuenta? 
                                <button type="button" id="showRegisterBtn" class="text-indigo-600 hover:text-indigo-800 font-medium">
                                    Regístrate aquí
                                </button>
                            </div>
                        </div>

                        <!-- Loading state -->
                        <div id="authLoading" class="hidden text-center py-4">
                            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            <p class="text-sm text-gray-600 mt-2">Procesando...</p>
                        </div>

                        <!-- Error messages -->
                        <div id="authError" class="hidden mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm"></div>
                    </div>
                </div>
            </div>
        `;

        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Cache DOM elements
        this.elements.authModal = document.getElementById('authModal');
        this.elements.loginForm = document.getElementById('loginForm');
        this.elements.registerForm = document.getElementById('registerForm');
        this.elements.profileSection = document.getElementById('profileSection');
        this.elements.authModalTitle = document.getElementById('authModalTitle');
        this.elements.authToggle = document.getElementById('authToggle');
        this.elements.authLoading = document.getElementById('authLoading');
        this.elements.authError = document.getElementById('authError');
    },

    // Setup event listeners
    setupEventListeners() {
        // Close modal
        document.getElementById('closeAuthModal')?.addEventListener('click', () => {
            this.hideModal();
        });

        // Click outside modal to close
        this.elements.authModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.authModal) {
                this.hideModal();
            }
        });

        // Toggle between login and register
        document.getElementById('showRegisterBtn')?.addEventListener('click', () => {
            this.showView('register');
        });

        // Login form submission
        this.elements.loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Register form submission
        this.elements.registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Forgot password
        document.getElementById('forgotPasswordBtn')?.addEventListener('click', async () => {
            await this.handleForgotPassword();
        });

        // Sign out
        document.getElementById('signOutBtn')?.addEventListener('click', async () => {
            await this.handleSignOut();
        });

        // Edit profile
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.showEditProfile();
        });

        // Profile edit form submission
        document.getElementById('profileEditForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProfileEdit();
        });

        // Cancel edit profile
        document.getElementById('cancelEditProfileBtn')?.addEventListener('click', () => {
            this.showProfileSection();
        });
    },

    // Show authentication modal
    showModal(view = 'login') {
        this.currentView = view;
        this.showView(view);
        this.elements.authModal.classList.remove('hidden');
        this.isModalOpen = true;
        document.body.style.overflow = 'hidden';
    },

    // Hide authentication modal
    hideModal() {
        this.elements.authModal.classList.add('hidden');
        this.isModalOpen = false;
        document.body.style.overflow = '';
    },

    // Show specific view
    showView(view) {
        this.currentView = view;
        
        // Ensure modal is created first
        if (!this.elements.authModal) {
            this.createAuthModal();
        }
        
        // Hide all forms
        if (this.elements.loginForm) this.elements.loginForm.classList.add('hidden');
        if (this.elements.registerForm) this.elements.registerForm.classList.add('hidden');
        if (this.elements.profileSection) this.elements.profileSection.classList.add('hidden');

        // Show selected view
        switch (view) {
            case 'login':
                if (this.elements.loginForm) this.elements.loginForm.classList.remove('hidden');
                if (this.elements.authModalTitle) this.elements.authModalTitle.textContent = 'Iniciar Sesión';
                if (this.elements.authToggle) this.elements.authToggle.innerHTML = `
                    ¿No tienes cuenta? 
                    <button type="button" id="showRegisterBtn" class="text-indigo-600 hover:text-indigo-800 font-medium">
                        Regístrate aquí
                    </button>
                `;
                break;
            case 'register':
                if (this.elements.registerForm) this.elements.registerForm.classList.remove('hidden');
                if (this.elements.authModalTitle) this.elements.authModalTitle.textContent = 'Crear Cuenta';
                if (this.elements.authToggle) this.elements.authToggle.innerHTML = `
                    ¿Ya tienes cuenta? 
                    <button type="button" id="showLoginBtn" class="text-indigo-600 hover:text-indigo-800 font-medium">
                        Inicia sesión aquí
                    </button>
                `;
                break;
            case 'profile':
                if (this.elements.profileSection) this.elements.profileSection.classList.remove('hidden');
                if (this.elements.authModalTitle) this.elements.authModalTitle.textContent = 'Mi Perfil';
                if (this.elements.authToggle) this.elements.authToggle.classList.add('hidden');
                this.updateProfileDisplay();
                break;
        }

        // Re-attach event listeners for new buttons
        this.setupToggleEventListeners();
    },

    // Setup toggle event listeners
    setupToggleEventListeners() {
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');

        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                this.showView('register');
            });
        }

        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                this.showView('login');
            });
        }
    },

    // Handle login
    async handleLogin() {
        try {
            this.showLoading(true);
            this.hideError();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                this.showError('Por favor completa todos los campos');
                return;
            }

            console.log('🔐 Attempting login with:', { email });
            console.log('🔍 HabitusSupabase available:', !!window.HabitusSupabase);
            console.log('🔍 Auth methods available:', Object.keys(window.HabitusSupabase?.auth || {}));

            // Use Supabase authentication directly
            const client = window.HabitusSupabase.getClient();
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                this.showError(error.message || 'Error durante el inicio de sesión');
                return;
            }
            
            this.showSuccess('Inicio de sesión exitoso');
            
            // Update UI state immediately
            this.showAuthenticatedUI();
            
            // Close modal and trigger app initialization
            setTimeout(async () => {
                console.log('🔄 Closing modal and triggering app initialization...');
                this.hideModal();
                
                // Trigger authentication state check to initialize app
                if (window.App && typeof window.App.checkAuthenticationState === 'function') {
                    console.log('🔄 Triggering authentication state check...');
                    window.App.checkAuthenticationState();
                } else {
                    console.log('⚠️ App.checkAuthenticationState not found, trying alternative...');
                    // Alternative: trigger auth state change event
                    window.dispatchEvent(new CustomEvent('authStateChanged', { 
                        detail: { isAuthenticated: true } 
                    }));
                }
            }, 1000);
        } catch (error) {
            this.showError('Error inesperado durante el inicio de sesión');
            console.error('Login error:', error);
        } finally {
            this.showLoading(false);
        }
    },

    // Handle registration
    async handleRegister() {
        try {
            this.showLoading(true);
            this.hideError();

            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

            // Validation
            if (password !== passwordConfirm) {
                this.showError('Las contraseñas no coinciden');
                return;
            }

            if (password.length < 6) {
                this.showError('La contraseña debe tener al menos 6 caracteres');
                return;
            }

            if (!name || !email || !password) {
                this.showError('Por favor completa todos los campos');
                return;
            }

            // Use Supabase authentication directly
            const client = window.HabitusSupabase.getClient();
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });
            
            if (error) {
                this.showError(error.message || 'Error durante el registro');
                return;
            }
            this.showSuccess('Cuenta creada exitosamente. Revisa tu email para confirmar.');
            setTimeout(() => {
                this.showView('login');
            }, 2000);
        } catch (error) {
            this.showError('Error inesperado durante el registro');
            console.error('Registration error:', error);
        } finally {
            this.showLoading(false);
        }
    },

    // Handle forgot password
    async handleForgotPassword() {
        try {
            const email = document.getElementById('loginEmail').value;
            if (!email) {
                this.showError('Por favor ingresa tu email primero');
                return;
            }

            this.showLoading(true);
            // For now, simulate password reset
            this.showSuccess('Email de recuperación enviado. Revisa tu bandeja de entrada.');
        } catch (error) {
            this.showError('Error al enviar email de recuperación');
            console.error('Forgot password error:', error);
        } finally {
            this.showLoading(false);
        }
    },

    // Handle sign out
    async handleSignOut() {
        try {
            this.showLoading(true);
            
            // Use Supabase sign out directly
            const client = window.HabitusSupabase.getClient();
            const { error } = await client.auth.signOut();
            
            if (error) {
                this.showError('Error al cerrar sesión');
                return;
            }
            
            this.showSuccess('Sesión cerrada exitosamente');
            
            // Close the side menu if it's open
            const sideMenu = document.getElementById('sideMenu');
            if (sideMenu && !sideMenu.classList.contains('hidden')) {
                if (typeof toggleMenu === 'function') {
                    toggleMenu();
                }
            }
            
            // Close the user menu if it's open
            const userMenu = document.getElementById('userMenuModal');
            if (userMenu && !userMenu.classList.contains('hidden')) {
                if (typeof hideUserMenu === 'function') {
                    hideUserMenu();
                }
            }
            
            setTimeout(() => {
                this.hideModal();
                this.showUnauthenticatedUI();
            }, 1000);
        } catch (error) {
            this.showError('Error al cerrar sesión');
            console.error('Sign out error:', error);
        } finally {
            this.showLoading(false);
        }
    },

    // Show edit profile form
    showEditProfile() {
        try {
            console.log('✏️ Showing edit profile form...');
            
            // Hide profile section and show edit form
            const profileSection = document.getElementById('profileSection');
            const editProfileForm = document.getElementById('editProfileForm');
            
            if (profileSection && editProfileForm) {
                profileSection.classList.add('hidden');
                editProfileForm.classList.remove('hidden');
                
                // Populate form with current user data
                this.populateEditForm();
            }
        } catch (error) {
            console.error('❌ Error showing edit profile form:', error);
        }
    },

    // Populate edit form with current user data
    populateEditForm() {
        const user = this.getCurrentUser();
        if (user) {
            const nameInput = document.getElementById('editProfileName');
            const emailInput = document.getElementById('editProfileEmail');
            
            // Usar email como nombre por defecto si no hay nombre personalizado
            const displayName = user.name || user.email || 'Usuario';
            if (nameInput) nameInput.value = displayName;
            if (emailInput) emailInput.value = user.email || '';
        }
    },

    // Handle profile edit form submission
    async handleProfileEdit() {
        try {
            this.showLoading(true);
            this.hideError();
            
            const name = document.getElementById('editProfileName').value;
            const email = document.getElementById('editProfileEmail').value;
            
            if (!name || !email) {
                this.showError('Por favor completa todos los campos');
                return;
            }
            
            // Update user data in localStorage
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    name: name,
                    email: email
                };
                localStorage.setItem('habitus_user', JSON.stringify(updatedUser));
                
                this.showSuccess('Perfil actualizado correctamente');
                
                // Update profile display
                this.updateProfileDisplay();
                
                // Update menu avatar and user info
                this.updateUserInfo();
                
                // Show profile section again
                setTimeout(() => {
                    this.showProfileSection();
                }, 1000);
            }
        } catch (error) {
            this.showError('Error al actualizar el perfil');
            console.error('Profile edit error:', error);
        } finally {
            this.showLoading(false);
        }
    },

    // Show profile section (hide edit form)
    showProfileSection() {
        const profileSection = document.getElementById('profileSection');
        const editProfileForm = document.getElementById('editProfileForm');
        
        if (profileSection && editProfileForm) {
            editProfileForm.classList.add('hidden');
            profileSection.classList.remove('hidden');
        }
    },

    // Update profile display
    updateProfileDisplay() {
        const user = this.getCurrentUser();
        if (user) {
            // Usar nombre personalizado si existe, sino email
            const displayName = user.name || user.email || 'Usuario';
            document.getElementById('profileName').textContent = displayName;
            document.getElementById('profileEmail').textContent = user.email;
            
            // Set avatar based on display name (parte antes del @ si es email)
            const nameForInitials = displayName.includes('@') ? displayName.split('@')[0] : displayName;
            const initials = nameForInitials ? nameForInitials.substring(0, 2).toUpperCase() : 'U';
            document.getElementById('profileAvatar').textContent = initials;
        }
    },

    // Utility methods
    showLoading(show) {
        if (show) {
            this.elements.authLoading.classList.remove('hidden');
        } else {
            this.elements.authLoading.classList.add('hidden');
        }
    },

    showError(message) {
        this.elements.authError.textContent = message;
        this.elements.authError.classList.remove('hidden');
    },

    hideError() {
        this.elements.authError.classList.add('hidden');
    },

    showSuccess(message) {
        // You can implement a success message display here
        console.log('✅ Success:', message);
    },

    // Logout user
    logout() {
        try {
            console.log('🚪 Logging out user...');
            
            // Clear local storage
            localStorage.removeItem('habitus_user');
            localStorage.removeItem('habitus_auth_token');
            
            // Update UI
            this.checkAuthState();
            
            // Close menu if open
            const sideMenu = document.getElementById('sideMenu');
            if (sideMenu && !sideMenu.classList.contains('hidden')) {
                toggleMenu();
            }
            
            // Show success message
            this.showSuccess('Sesión cerrada correctamente');
            
            console.log('✅ User logged out successfully');
        } catch (error) {
            console.error('❌ Error during logout:', error);
        }
    },

    // Show user profile
    showProfile() {
        try {
            console.log('👤 Showing user profile...');
            
            // Close menu
            toggleMenu();
            
            // Show profile modal
            this.showModal('profile');
        } catch (error) {
            console.error('❌ Error showing profile:', error);
        }
    },

    // Show settings modal
    showSettings() {
        const user = window.HabitusSupabase?.auth?.getCurrentUser();
        const profile = window.HabitusSupabase?.auth?.getCurrentProfile();
        
        // Crear modal de ajustes
        const settingsHTML = `
            <div id="settingsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-xl text-white">
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-semibold">⚙️ Ajustes</h2>
                            <button onclick="AuthUI.hideSettings()" class="text-white hover:text-indigo-200 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-6 space-y-6">
                        <!-- Información del Usuario -->
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-900 mb-3">👤 Información Personal</h3>
                            <div class="space-y-2">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Nombre</label>
                                    <input type="text" id="settingsName" value="${profile?.full_name || ''}" 
                                           class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Email</label>
                                    <input type="email" id="settingsEmail" value="${user?.email || ''}" readonly
                                           class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600">
                                </div>
                            </div>
                        </div>

                        <!-- Preferencias -->
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-900 mb-3">🎨 Preferencias</h3>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-medium text-gray-900">Modo Oscuro</div>
                                        <div class="text-sm text-gray-500">Cambiar tema de la aplicación</div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="darkModeToggle" class="sr-only peer">
                                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                                
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-medium text-gray-900">Notificaciones</div>
                                        <div class="text-sm text-gray-500">Recibir recordatorios</div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="notificationsToggle" class="sr-only peer" checked>
                                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Acciones -->
                        <div class="flex space-x-3">
                            <button onclick="AuthUI.saveSettings()" 
                                    class="flex-1 btn-primary py-2 px-4">
                                💾 Guardar Cambios
                            </button>
                            <button onclick="AuthUI.hideSettings()" 
                                    class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                                ❌ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente si hay
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Agregar nuevo modal
        document.body.insertAdjacentHTML('beforeend', settingsHTML);
        
        // Cerrar menú de usuario
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.remove();
        }
    },

    // Hide settings modal
    hideSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.remove();
        }
    },

    // Save settings
    async saveSettings() {
        try {
            const name = document.getElementById('settingsName').value;
            const darkMode = document.getElementById('darkModeToggle').checked;
            const notifications = document.getElementById('notificationsToggle').checked;
            
            // Guardar en localStorage por ahora
            localStorage.setItem('habitus_dark_mode', darkMode);
            localStorage.setItem('habitus_notifications', notifications);
            
            // Actualizar perfil en Supabase si el nombre cambió
            if (name) {
                const { error } = await window.HabitusSupabase.auth.updateProfile({ full_name: name });
                if (error) {
                    console.error('Error updating profile:', error);
                }
            }
            
            this.showSuccess('Ajustes guardados correctamente');
            setTimeout(() => {
                this.hideSettings();
            }, 1000);
        } catch (error) {
            this.showError('Error al guardar los ajustes');
            console.error('Settings save error:', error);
        }
    },

    // Show authenticated UI with improved user menu
    showAuthenticatedUI() {
        const user = window.HabitusSupabase?.user;
        const profile = window.HabitusSupabase?.profile;
        
        console.log('🔐 Showing authenticated UI for user:', user?.email);
        
        // Hide the auth required overlay
        const authOverlay = document.getElementById('authRequiredOverlay');
        if (authOverlay) {
            authOverlay.style.display = 'none';
            console.log('✅ Hidden auth required overlay');
        }
        
        // Actualizar botón de menú para mostrar usuario
        const menuBtn = document.querySelector('.menu-button');
        if (menuBtn) {
            const userInitial = profile?.full_name ? 
                profile.full_name.charAt(0).toUpperCase() : 
                user?.email?.charAt(0).toUpperCase();
                
            const userName = profile?.full_name || user?.email || 'Usuario';
            
            menuBtn.innerHTML = `
                <div class="flex items-center space-x-2 bg-white/20 hover:bg-white/30 rounded-full px-3 py-2 transition-all duration-200">
                    <div class="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-semibold">
                            ${userInitial}
                        </span>
                    </div>
                    <span class="text-white text-sm font-medium hidden sm:block">
                        ${userName}
                    </span>
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            `;
            
            // Agregar evento para mostrar menú de usuario
            menuBtn.addEventListener('click', () => {
                this.showUserMenu();
            });
        }
        
        // Ocultar botón de login
        const authBtn = document.getElementById('authButton');
        if (authBtn) {
            authBtn.style.display = 'none';
        }
    },

    // Show default view after successful login
    showDefaultView() {
        try {
            console.log('🔄 Showing default view...');
            
            // Hide any loading states
            this.showLoading(false);
            
            // Hide auth overlay if it exists
            const authOverlay = document.getElementById('authRequiredOverlay');
            if (authOverlay) {
                authOverlay.style.display = 'none';
                console.log('✅ Hidden auth overlay');
            }
            
            // Show main content area
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'block';
                console.log('✅ Showed main content');
            }
            
            // Try to show the first available tab
            const firstTab = document.querySelector('[data-tab]');
            if (firstTab) {
                firstTab.classList.remove('hidden');
                console.log('✅ Showed first tab:', firstTab.getAttribute('data-tab'));
            }
            
            // Show welcome message
            console.log('✅ Successfully logged in - showing default view');
            
        } catch (error) {
            console.error('❌ Error showing default view:', error);
        }
    },

    // Show user menu dropdown
    showUserMenu() {
        const user = window.HabitusSupabase?.user;
        const profile = window.HabitusSupabase?.profile;
        
        // Crear menú desplegable de usuario mejorado
        const userMenuHTML = `
            <div id="userMenu" class="absolute top-16 right-4 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-64 z-50">
                <!-- Header con información del usuario -->
                <div class="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span class="text-white font-semibold text-lg">
                                ${profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-900 text-lg">
                                ${profile?.full_name || 'Usuario'}
                            </div>
                            <div class="text-sm text-gray-600">
                                ${user?.email}
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                Miembro desde ${new Date(user?.created_at || Date.now()).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Opciones del menú -->
                <div class="py-2">
                    <!-- Mi Perfil -->
                    <button onclick="AuthUI.showModal('profile')" class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors flex items-center">
                        <span class="mr-3 text-lg">👤</span>
                        <div>
                            <div class="font-medium">Mi Perfil</div>
                            <div class="text-xs text-gray-500">Ver y editar información personal</div>
                        </div>
                    </button>
                    
                    <!-- Ajustes -->
                    <button onclick="AuthUI.showSettings()" class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors flex items-center">
                        <span class="mr-3 text-lg">⚙️</span>
                        <div>
                            <div class="font-medium">Ajustes</div>
                            <div class="text-xs text-gray-500">Configurar preferencias</div>
                        </div>
                    </button>
                    
                    <!-- Separador -->
                    <div class="border-t border-gray-100 my-2"></div>
                    
                    <!-- Cerrar Sesión -->
                    <button onclick="AuthUI.handleSignOut()" class="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center">
                        <span class="mr-3 text-lg">🚪</span>
                        <div>
                            <div class="font-medium">Cerrar Sesión</div>
                            <div class="text-xs text-red-500">Salir de la aplicación</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
        
        // Remover menú existente si hay
        const existingMenu = document.getElementById('userMenu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Agregar nuevo menú
        document.body.insertAdjacentHTML('beforeend', userMenuHTML);
        
        // Cerrar menú al hacer click fuera
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const userMenu = document.getElementById('userMenu');
                const menuBtn = document.querySelector('.menu-button');
                if (userMenu && !userMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                    userMenu.remove();
                }
            });
        }, 100);
    },

    // Show unauthenticated UI
    showUnauthenticatedUI() {
        console.log('🔓 Showing unauthenticated UI');
        
        // Show the auth required overlay
        const authOverlay = document.getElementById('authRequiredOverlay');
        if (authOverlay) {
            authOverlay.style.display = 'flex';
            console.log('✅ Showed auth required overlay');
        }
        
        // Restaurar botón de menú original
        const menuBtn = document.querySelector('.menu-button');
        if (menuBtn) {
            menuBtn.innerHTML = `
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            `;
            
            // Remover evento de menú de usuario
            menuBtn.replaceWith(menuBtn.cloneNode(true));
        }
        
        // Mostrar botón de login
        const authBtn = document.getElementById('authButton');
        if (authBtn) {
            authBtn.style.display = 'block';
        }
    }
};

// Export to global scope
window.AuthUI = AuthUI;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof AuthUI !== 'undefined') {
            AuthUI.init();
        } else {
            console.error('❌ AuthUI is not defined');
        }
    });
} else {
    AuthUI.init();
}
