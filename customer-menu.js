// Customer Menu JavaScript
// This script handles the customer-facing menu display with real-time Firebase integration

class CustomerMenu {
    constructor() {
        this.menuItems = [];
        this.categories = [
            'Δημοφιλέστερα',
            'Ορεκτικά', 
            'Κυρίως Πιάτα',
            'Σαλάτες',
            'Ποτά',
            'Επιδόρπια'
        ];
        this.isLoading = true;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // DOM elements
        this.elements = {
            loading: document.getElementById('loading'),
            mainContent: document.getElementById('mainContent'),
            errorState: document.getElementById('errorState'),
            menuContainer: document.getElementById('menuContainer')
        };

        this.init();
    }

    async init() {
        console.log('🍽️ Initializing Customer Menu...');
        
        // Wait for Firebase to be ready
        if (window.FirebaseConfig && window.FirebaseFirestore) {
            this.startApp();
        } else {
            window.addEventListener('firebaseReady', () => this.startApp());
            window.addEventListener('firebaseError', (event) => this.handleFirebaseError(event.detail));
        }
    }

    async startApp() {
        try {
            await this.loadInitialData();
            this.setupRealTimeUpdates();
            this.showContent();
            console.log('✅ Customer menu loaded successfully');
        } catch (error) {
            console.error('❌ Error starting app:', error);
            this.handleError(error);
        }
    }

    async loadInitialData() {
        try {
            console.log('📥 Loading menu items...');
            
            const { db } = window.FirebaseConfig.getServices();
            const { getDocs, query, where, orderBy, collection } = window.FirebaseFirestore;
            
            // Create query for active menu items
            const menuRef = collection(db, 'menuItems');
            const q = query(
                menuRef,
                where('isActive', '==', true),
                orderBy('category'),
                orderBy('sortOrder')
            );
            
            // Execute query with retry mechanism
            const snapshot = await window.FirebaseConfig.retry(async () => {
                return await getDocs(q);
            });
            
            // Process results
            this.menuItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`📋 Loaded ${this.menuItems.length} menu items`);
            
            // Render initial menu
            this.renderMenu();
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            throw error;
        }
    }

    setupRealTimeUpdates() {
        try {
            console.log('🔄 Setting up real-time updates...');
            
            const { db } = window.FirebaseConfig.getServices();
            const { onSnapshot, query, where, orderBy, collection } = window.FirebaseFirestore;
            
            const menuRef = collection(db, 'menuItems');
            const q = query(
                menuRef,
                where('isActive', '==', true),
                orderBy('category'),
                orderBy('sortOrder')
            );

            // Listen for real-time updates
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                console.log('🔄 Real-time update received');
                
                this.menuItems = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                this.renderMenu();
                
            }, (error) => {
                console.error('❌ Real-time update error:', error);
                const friendlyError = window.FirebaseConfig.handleError(error);
                this.showToast(`Σφάλμα ενημέρωσης: ${friendlyError.message}`, 'error');
            });
            
        } catch (error) {
            console.error('❌ Error setting up real-time updates:', error);
        }
    }

    renderMenu() {
        const container = this.elements.menuContainer;
        
        if (this.menuItems.length === 0) {
            this.showEmptyState();
            return;
        }

        container.innerHTML = '';

        // Group items by category and render
        this.categories.forEach(categoryName => {
            const categoryItems = this.menuItems.filter(item => 
                item.category === categoryName
            );
            
            if (categoryItems.length === 0) return;

            const categoryElement = this.createCategorySection(categoryName, categoryItems);
            container.appendChild(categoryElement);
        });

        // Add animation class
        container.classList.add('fade-in');
    }

    createCategorySection(categoryName, items) {
        const section = document.createElement('div');
        section.className = 'fade-in';
        
        const categoryClass = this.getCategoryClass(categoryName);
        const categoryIcon = this.getCategoryIcon(categoryName);
        
        section.innerHTML = `
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <!-- Category Header -->
                <div class="${categoryClass} px-6 py-4">
                    <h2 class="text-xl font-bold text-white flex items-center">
                        <span class="category-icon">${categoryIcon}</span>
                        <span class="ml-2">${categoryName}</span>
                    </h2>
                </div>
                
                <!-- Category Items -->
                <div class="divide-y divide-gray-100">
                    ${items.map((item, index) => this.createMenuItemHTML(item, index)).join('')}
                </div>
            </div>
        `;

        return section;
    }

    createMenuItemHTML(item, index) {
        const imageUrl = item.imageUrl || this.getPlaceholderImage(item.category);
        const price = this.formatPrice(item.price);
        
        return `
            <div class="menu-item p-6 hover:bg-gray-50">
                <div class="flex gap-4">
                    <!-- Item Details -->
                    <div class="flex-1">
                        <div class="mb-2">
                            <h3 class="text-lg font-bold text-gray-800 mb-1">${this.escapeHtml(item.name)}</h3>
                            ${item.description ? `<p class="text-gray-600 text-sm leading-relaxed">${this.escapeHtml(item.description)}</p>` : ''}
                        </div>
                        
                        <!-- Price and Badges Row -->
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-2xl font-bold price-highlight">€${price}</span>
                            <div class="flex gap-2">
                                ${this.createBadges(item)}
                            </div>
                        </div>
                        
                        <!-- Additional Info -->
                        ${this.createAdditionalInfo(item)}
                    </div>
                    
                    <!-- Item Image -->
                    <div class="flex-shrink-0">
                        <div class="image-container relative">
                            <img
                                src="${imageUrl}"
                                alt="${this.escapeHtml(item.name)}"
                                class="menu-item-image w-24 h-20 object-cover"
                                loading="lazy"
                                onerror="this.src='${this.getPlaceholderImage(item.category)}'"
                            />
                            ${item.isNew ? '<div class="badge-new">NEW</div>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createBadges(item) {
        const badges = [];
        
        if (item.isPopular) {
            badges.push('<span class="badge badge-popular">⭐ Δημοφιλές</span>');
        }
        
        if (item.isVegetarian) {
            badges.push('<span class="badge badge-vegetarian">🌱 Vegetarian</span>');
        }
        
        if (item.isSpicy) {
            badges.push('<span class="badge" style="background-color: #FEE2E2; color: #991B1B;">🌶️ Πικάντικο</span>');
        }
        
        return badges.join('');