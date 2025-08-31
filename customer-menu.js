
// Customer Menu JavaScript
// This script handles the customer-facing menu display with real-time Firebase integration
import { db } from './firebase-config.js';
import {
    getDocs,
    query,
    where,
    orderBy,
    collection,
    onSnapshot
} from 'firebase/firestore';

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
            menuContainer: document.getElementById('menuContainer'),
            emptyState: document.getElementById('emptyState'),
            toastContainer: document.getElementById('toastContainer')
        };

        this.init();
    }

    async init() {
        console.log('🍽️ Initializing Customer Menu...');
        
        // Firebase is ready immediately with ES modules
        this.startApp();
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
            
            // Create query for active menu items
            const menuRef = collection(db, 'menuItems');
            const q = query(
                menuRef,
                where('isActive', '==', true),
                orderBy('sortOrder', 'asc')
            );
            
            // Execute query
            const snapshot = await getDocs(q);
            
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
            
            const menuRef = collection(db, 'menuItems');
            const q = query(
                menuRef,
                where('isActive', '==', true),
                orderBy('sortOrder', 'asc')
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
                this.showToast(`Σφάλμα ενημέρωσης: ${error.message}`, 'error');
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
        this.elements.emptyState.classList.add('hidden');

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
    }

    createAdditionalInfo(item) {
        const info = [];
        
        if (item.ingredients && item.ingredients.length > 0) {
            info.push(`<p class="text-xs text-gray-500 mt-1">Υλικά: ${item.ingredients.join(', ')}</p>`);
        }
        
        if (item.allergens && item.allergens.length > 0) {
            info.push(`<p class="text-xs text-orange-600 mt-1">⚠️ Αλλεργιογόνα: ${item.allergens.join(', ')}</p>`);
        }
        
        return info.join('');
    }

    // Utility methods
    showContent() {
        this.elements.loading.classList.add('hidden');
        this.elements.errorState.classList.add('hidden');
        this.elements.mainContent.classList.remove('hidden');
        this.isLoading = false;
    }

    showEmptyState() {
        this.elements.menuContainer.innerHTML = '';
        this.elements.emptyState.classList.remove('hidden');
    }

    handleError(error) {
        console.error('❌ Handling error:', error);
        this.elements.loading.classList.add('hidden');
        this.elements.mainContent.classList.add('hidden');
        this.elements.errorState.classList.remove('hidden');
        this.showToast(`Σφάλμα: ${error.message}`, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
        
        toast.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.remove('translate-x-full'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getCategoryClass(categoryName) {
        const classes = {
            'Δημοφιλέστερα': 'bg-gradient-to-r from-yellow-500 to-orange-500',
            'Ορεκτικά': 'bg-gradient-to-r from-green-500 to-teal-500',
            'Κυρίως Πιάτα': 'bg-gradient-to-r from-blue-500 to-purple-500',
            'Σαλάτες': 'bg-gradient-to-r from-green-400 to-green-600',
            'Ποτά': 'bg-gradient-to-r from-cyan-500 to-blue-500',
            'Επιδόρπια': 'bg-gradient-to-r from-pink-500 to-rose-500'
        };
        return classes[categoryName] || 'bg-gradient-to-r from-gray-500 to-gray-700';
    }

    getCategoryIcon(categoryName) {
        const icons = {
            'Δημοφιλέστερα': '⭐',
            'Ορεκτικά': '🥗',
            'Κυρίως Πιάτα': '🍽️',
            'Σαλάτες': '🥬',
            'Ποτά': '🥤',
            'Επιδόρπια': '🍰'
        };
        return icons[categoryName] || '🍽️';
    }

    getPlaceholderImage(category) {
        const placeholders = {
            'Δημοφιλέστερα': 'https://via.placeholder.com/80x60/FFD700/000000?text=⭐',
            'Ορεκτικά': 'https://via.placeholder.com/80x60/10B981/FFFFFF?text=🥗',
            'Κυρίως Πιάτα': 'https://via.placeholder.com/80x60/3B82F6/FFFFFF?text=🍽️',
            'Σαλάτες': 'https://via.placeholder.com/80x60/059669/FFFFFF?text=🥬',
            'Ποτά': 'https://via.placeholder.com/80x60/0891B2/FFFFFF?text=🥤',
            'Επιδόρπια': 'https://via.placeholder.com/80x60/EC4899/FFFFFF?text=🍰'
        };
        return placeholders[category] || 'https://via.placeholder.com/80x60/6B7280/FFFFFF?text=🍽️';
    }

    formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) return '0.00';
        return price.toFixed(2);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cleanup method
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Initialize the menu when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CustomerMenu();
});

// Export for potential external use
export default CustomerMenu;