// Firebase configuration for GitHub Pages deployment
const firebaseConfig = {
  apiKey: "AIzaSyDhnrvGjy2UAzNwD0Q3cR-hxUbddxM2cks",
  authDomain: "cataloguenew-72ff8.firebaseapp.com",
  projectId: "cataloguenew-72ff8",
  storageBucket: "cataloguenew-72ff8.appspot.com",
  messagingSenderId: "830475889931",
  appId: "1:830475889931:web:4a631d6e1d43936ead060e",
  measurementId: "G-88WL3DWQ5Z",
};

// Initialize Firebase
import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js').then(({ initializeApp }) => {
  return Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
    initializeApp(firebaseConfig)
  ]);
}).then(([{ getFirestore, collection, query, where, orderBy, getDocs, onSnapshot }, app]) => {
  const db = getFirestore(app);
  
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
        
        const menuRef = collection(db, 'menuItems');
        const q = query(
          menuRef,
          where('isActive', '==', true),
          orderBy('sortOrder', 'asc')
        );
        
        const snapshot = await getDocs(q);
        
        this.menuItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`📋 Loaded ${this.menuItems.length} menu items`);
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
      if (this.elements.emptyState) {
        this.elements.emptyState.classList.add('hidden');
      }

      this.categories.forEach(categoryName => {
        const categoryItems = this.menuItems.filter(item => 
          item.category === categoryName
        );
        
        if (categoryItems.length === 0) return;

        const categoryElement = this.createCategorySection(categoryName, categoryItems);
        container.appendChild(categoryElement);
      });

      container.classList.add('fade-in');
    }

    createCategorySection(categoryName, items) {
      const section = document.createElement('div');
      section.className = 'fade-in';
      
      const categoryClass = this.getCategoryClass(categoryName);
      const categoryIcon = this.getCategoryIcon(categoryName);
      
      section.innerHTML = `
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div class="${categoryClass} px-6 py-4">
            <h2 class="text-xl font-bold text-white flex items-center">
              <span class="category-icon">${categoryIcon}</span>
              <span class="ml-2">${categoryName}</span>
            </h2>
          </div>
          
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
            <div class="flex-1">
              <div class="mb-2">
                <h3 class="text-lg font-bold text-gray-800 mb-1">${this.escapeHtml(item.name)}</h3>
                ${item.description ? `<p class="text-gray-600 text-sm leading-relaxed">${this.escapeHtml(item.description)}</p>` : ''}
              </div>
              
              <div class="flex items-center justify-between mb-2">
                <span class="text-2xl font-bold price-highlight">€${price}</span>
                <div class="flex gap-2">
                  ${this.createBadges(item)}
                </div>
              </div>
              
              ${this.createAdditionalInfo(item)}
            </div>
            
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

    showContent() {
      this.elements.loading.classList.add('hidden');
      this.elements.errorState.classList.add('hidden');
      this.elements.mainContent.classList.remove('hidden');
    }

    showEmptyState() {
      this.elements.menuContainer.innerHTML = '';
      if (this.elements.emptyState) {
        this.elements.emptyState.classList.remove('hidden');
      }
    }

    handleError(error) {
      console.error('❌ Handling error:', error);
      this.elements.loading.classList.add('hidden');
      this.elements.mainContent.classList.add('hidden');
      this.elements.errorState.classList.remove('hidden');
      this.showToast(`Σφάλμα: ${error.message}`, 'error');
    }

    showToast(message, type = 'info') {
      if (!this.elements.toastContainer) return;
      
      const toast = document.createElement('div');
      const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
      
      toast.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full`;
      toast.textContent = message;
      
      this.elements.toastContainer.appendChild(toast);
      
      setTimeout(() => toast.classList.remove('translate-x-full'), 100);
      
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

    destroy() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    }
  }

  // Initialize the menu
  new CustomerMenu();
  
}).catch(error => {
  console.error('❌ Failed to load Firebase:', error);
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('errorState').classList.remove('hidden');
});
