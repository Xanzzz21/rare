// At the very beginning of the file, before the DOMContentLoaded event
window.gameUtils = {
    fetchUserData: null,
    user: null,
    userId: null,
    coins: 0,
    tickets: 0,
    tonBalance: 0,
    starsBalance: 0,
    dailyTapCount: 0,
    lastTapResetDate: null,
    currentGradient: 'basic',
    currentCoin: 'pig',
    currentEmblem: '',
    ownedGradients: ['basic'],
    ownedCoins: ['pig'],
    ownedEmblems: [],
    saveSessionData: function() {
        const sessionData = {
            coins: window.gameUtils.coins || 0,
            tickets: window.gameUtils.tickets || 0,
            ton_balance: window.gameUtils.tonBalance || 0,
            stars_balance: window.gameUtils.starsBalance || 0,
            daily_tap_count: window.gameUtils.dailyTapCount || 0,
            last_tap_reset_date: window.gameUtils.lastTapResetDate,
            last_reward_date: window.gameUtils.user?.last_reward_date,
            current_gradient: window.gameUtils.currentGradient || 'basic',
            current_coin: window.gameUtils.currentCoin || 'pig',
            current_emblem: window.gameUtils.currentEmblem || '',
            timestamp: new Date().toISOString()
        };

        // Save to server
        fetch(`https://251fecd466c10d.lhr.life/session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: window.gameUtils.userId,
                session_data: sessionData
            })
        }).catch(error => {
            console.error('Error saving session:', error);
        });
    }
};

// Add this near the top of the file, after window.gameUtils declaration
const BANNED_USERS = [
    5300028114,
    7913417721 // Add more banned IDs here as needed
];

// Add this near the top of the file, after window.gameUtils declaration, add:
window.updateTicketNotification = null; // Initialize the global reference

// Add this near the top of your file with other initializations
const AdController = window.Adsgram.init({ 
    blockId: "5223",
    openLink: (url) => {
        // Use Telegram's WebApp to open links
        window.Telegram.WebApp.openTelegramLink(url);
        return true; // Indicate that we handled the link opening
    }
}); 

// Add this near the top of the file, after window.gameUtils declaration
const BANNED_IPS = [
    '52.138.237.101'
];

const BANNED_USERNAMES = [
    '@CinnconBots'
];

// Add this near the top of the file with other constants
const RESTRICTED_USERNAMES = [
    'CinnconBots'  // Without @ symbol since we'll check both with and without
];

// Add this at the beginning of the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    window.Telegram.WebApp.ready();  // Indicate that the Telegram Web App is ready

    // Initialize user data with let instead of const
    let user = window.Telegram.WebApp.initDataUnsafe.user;
    let userId = user ? user.id : null;

    // Store initial values in gameUtils
    window.gameUtils.user = user;
    window.gameUtils.userId = userId;

    // Modify the fetchUserData function
    window.gameUtils.fetchUserData = function() {
        return new Promise((resolve, reject) => {
            if (!userId) {
                console.error('User ID not available');
                reject('User ID not available');
                return;
            }

            console.log("Fetching user data for ID: ", userId);

            // First fetch last session data
            fetch(`https://251fecd466c10d.lhr.life/session.php?user_id=${userId}`)
                .then(response => response.json())
                .then(sessionData => {
                    console.log("Session data:", sessionData);

                    if (sessionData.status === 'success' && sessionData.data) {
                        window.gameUtils.lastSessionData = sessionData.data;
                    }

                    return fetch(`https://251fecd466c10d.lhr.life/check.php?id=${userId}&username=${encodeURIComponent(user.username || '')}&nocache=${Date.now()}`, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Database data:", data);

                    // Ensure numeric values are properly parsed
                    data.coins = parseInt(data.coins) || 0;
                    data.tickets = parseInt(data.tickets) || 0;
                    data.ton_balance = parseFloat(data.ton_balance) || 0;
                    data.stars_balance = parseInt(data.stars_balance) || 0;

                    // Properly parse arrays
                    data.owned_gradients = data.owned_gradients ? data.owned_gradients.split(',') : ['basic'];
                    data.owned_coins = data.owned_coins ? data.owned_coins.split(',') : ['pig'];
                    data.owned_emblems = Array.isArray(data.owned_emblems) ? 
                        data.owned_emblems : 
                        (data.owned_emblems || '').split(',').filter(e => e);

                    // Update global variables
                    window.gameUtils.coins = data.coins;
                    window.gameUtils.tickets = data.tickets;
                    window.gameUtils.tonBalance = data.ton_balance;
                    window.gameUtils.starsBalance = data.stars_balance;
                    window.gameUtils.currentGradient = data.current_gradient || 'basic';
                    window.gameUtils.currentCoin = data.current_coin || 'pig';
                    window.gameUtils.currentEmblem = data.current_emblem || '';
                    window.gameUtils.ownedGradients = data.owned_gradients;
                    window.gameUtils.ownedCoins = data.owned_coins;
                    window.gameUtils.ownedEmblems = data.owned_emblems;

                    // Update window.gameUtils.user
                    window.gameUtils.user = { ...user, ...data };
                    user = window.gameUtils.user;

                    // Update profile icons
                    const profileIcon = document.getElementById('profile-icon');
                    const shopProfileIcon = document.getElementById('shop-profile-icon');
                    if (profileIcon) {
                        profileIcon.style.background = gradients.find(g => g.id === window.gameUtils.currentGradient)?.gradient || gradients[0].gradient;
                    }
                    if (shopProfileIcon) {
                        shopProfileIcon.style.background = gradients.find(g => g.id === window.gameUtils.currentGradient)?.gradient || gradients[0].gradient;
                    }

                    // Update emblems
                    const profileInitial = document.getElementById('profile-initial');
                    const shopProfileInitial = document.getElementById('shop-profile-initial');
                    updateProfileEmblems(profileInitial, shopProfileInitial);

                    // Update UI immediately
                    document.getElementById('coin-count').textContent = formatNumber(window.gameUtils.coins);
                    document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
                    document.getElementById('shop-profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);

                    // Update other UI elements
                    updateProfile();
                    updateShopUI();
                    updateTapProgress();
                    updateBalanceDisplay();
                    updateTicketsDisplay();
                    updateTicketNotification();

                    // Set tap data
                    window.gameUtils.dailyTapCount = parseInt(data.daily_tap_count) || 1;
                    window.gameUtils.lastTapResetDate = data.last_tap_reset_date ? new Date(data.last_tap_reset_date) : null;

                    // Periksa apakah kita perlu mengatur ulang jumlah ketukan untuk hari baru
                    const today = new Date().toISOString().split('T')[0];
                    const lastResetDate = window.gameUtils.lastTapResetDate ? window.gameUtils.lastTapResetDate.toISOString().split('T')[0] : null;
                    
                    if (lastResetDate !== today) {
                        window.gameUtils.dailyTapCount = 0;
                        window.gameUtils.lastTapResetDate = new Date();
                    }

                    // Update progress bar immediately
                    updateTapProgress();

                    // Check daily reward before other updates
                    checkDailyReward();

                    resolve(window.gameUtils.user);
                })
                .catch(error => {
                    console.error('Error in fetchUserData:', error);
                    reject(error);
                })
                .finally(() => {
                    hideLoadingScreen();
                });
        });
    };

    // Check if running in Telegram WebApp
    if (!window.Telegram || !window.Telegram.WebApp) {
        console.error('This app can only be accessed through Telegram');
        showBlockedMessage('This app can only be accessed through Telegram');
        return;
    }

    // Check for banned IP
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            if (BANNED_IPS.includes(data.ip)) {
                showBlockedMessage('Access denied.');
                return;
            }
            
            // Check for banned username
            if (user && user.username && BANNED_USERNAMES.includes('@' + user.username)) {
                showBlockedMessage('Access denied.');
                return;
            }

            // Continue with the rest of the initialization
            initializeApp();
        })
        .catch(error => {
            console.error('Error checking IP:', error);
            // Continue initialization if IP check fails
            initializeApp();
        });

    // Helper function to show blocked message and close app
    function showBlockedMessage(message) {
        // Hide the app
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'none';
        }
        
        // Show loading screen with message
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingScreen.style.display = 'flex';

        // Close the WebApp after showing the message
        setTimeout(() => {
            window.Telegram.WebApp.close();
        }, 2000);
    }

    // Remove duplicate initialization and continue with the rest of your code...
    // Verify Telegram WebApp data
    if (!window.Telegram.WebApp.initData) {
        console.error('Invalid Telegram WebApp data');
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            loadingText.textContent = 'Invalid access attempt. Please use Telegram.';
        }
        loadingScreen.style.display = 'flex';
        return;
    }

    // Check if user is banned
    if (BANNED_USERS.includes(userId)) {
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Show banned message
        window.Telegram.WebApp.showPopup({
            title: 'Access Denied',
            message: 'Your account has been banned from using OinkCoin.',
            buttons: [{
                type: 'close'
            }]
        });

        // Close the WebApp after showing the message
        setTimeout(() => {
            window.Telegram.WebApp.close();
        }, 2000);

        return; // Stop execution of the rest of the code
    }

    // Store these in our global gameUtils object
    window.gameUtils.user = user;
    window.gameUtils.userId = userId;
    window.saveUserData = saveUserData;
    window.addCoins = addCoins;

    // Initialize user data first before calling fetchUserData
    let coins = 0;  // Initialize coins
    let currentCoin = 'pig';  // Default coin
    let ownedCoins = ['pig'];  // Default owned coins
    let currentGradient = 'basic';  // Default gradient
    let ownedGradients = ['basic'];  // Default owned gradients
    let dailyReward = 0;  // Initialize daily reward
    let currentEmblem = '';
    let ownedEmblems = [];

    // Log the user object for debugging purposes
    console.log("Loaded user data from Telegram API: ", user);

    // Ensure that user is defined before proceeding
    if (!user) {
        console.error('User data is not available.');
        hideLoadingScreen();
        return;  // Stop execution if the user is undefined
    }

    // Ensure that userId is defined before proceeding
    if (!userId) {
        console.error('User ID is not available.');
        hideLoadingScreen();
        return;
    }

    // At the beginning of the file, after variable declarations
    window.fetchUserData = window.gameUtils.fetchUserData;  // Make fetchUserData available globally

    // Now it's safe to call fetchUserData
    fetchUserData()
        .then(() => {
            checkAndRewardInvite();
            initializeApp(); // Make sure initializeApp is called here
        })
        .catch(error => {
            console.error('Error in fetchUserData:', error);
        });

    // Add event listeners for the daily reward
    addDailyRewardEventListeners();


    const coinImages = [
        { id: 'pig', name: 'Pig Coin', image: 'img/coin_pig.png', price: 0 },
        { id: 'banknote', name: 'Banknote', image: 'img/banknote.png', price: 2000 },
        { id: 'binance', name: 'Binance Coin', image: 'img/binance.webp', price: 3000 },
        { id: 'telegram', name: 'Telegram Coin', image: 'img/telegram_coin.webp', price: 4000 },
        // Add more coin images here
    ];

    // Add this array of emblems near the top of your file, after the coinImages array
    const emblems = [
        { id: 'crown', name: 'Crown', icon: 'fas fa-crown', price: 5000 },
        { id: 'star', name: 'Star', icon: 'fas fa-star', price: 3000 },
        { id: 'heart', name: 'Heart', icon: 'fas fa-heart', price: 2000 },
        { id: 'diamond', name: 'Diamond', icon: 'fas fa-gem', price: 4000 },
        { id: 'bolt', name: 'Lightning', icon: 'fas fa-bolt', price: 2500 },
        { id: 'fire', name: 'Fire', icon: 'fas fa-fire', price: 3500 },
        { id: 'telegram', name: 'Ton', image: 'img/ton.webp', price: 4500, width: '52%', height: '52%' },
        { id: 'jedi', name: 'Resistance', image: 'img/digital-resistance.webp', priceTon: 0.2, width: '60%', height: '60%' }, // Changed to priceTon
        { id: 'bitcoin', name: 'Bitcoin', icon: 'fa-brands fa-btc', price: 8000 },
        { id: 'poo', name: 'Premium', image: 'img/tgstar.webp', price: 50000, width: '55%', height: '55%' },
        { id: 'johny', name: 'Tony', icon: '', image: 'img/johny.webp', price: 80000, width: '100%', height: '100%' },
    ];

    const userLang = window.Telegram.WebApp.initDataUnsafe.user.language_code || 'en';
    const t = window.translations[userLang] || window.translations.en;

    // Expose the translation globally
    window.t = t;


    // Apply translations
    document.getElementById('balance-label').textContent = t.balance;
    document.getElementById('your-transactions').textContent = t.yourTransactions;
    document.getElementById('convert-rating').innerHTML = t.convertRating;
    document.getElementById('your-balance').textContent = t.yourBalance;
    document.getElementById('earn').textContent = t.earn;
    document.getElementById('rewards-tab').textContent = t.rewardsTab;
    document.getElementById('complete-tasks-to-earn').textContent = t.completeTasksToEarn;
    document.getElementById('oinkcoin-channel').textContent = t.oinkCoinChannel;
    document.getElementById('ai-review-games').textContent = t.aiReviewGames;
    document.getElementById('profile-modal-close').textContent = t.close;
    document.getElementById('leaderboard-tab').textContent = t.leaderboardTab;
    document.getElementById('games-tab').textContent = t.gamesTab;

    // New translations for the Games page
    const gamesTitleElement = document.getElementById('games-title');
    if (gamesTitleElement) gamesTitleElement.textContent = t.gamesTab;

    const gameTitleElement = document.querySelector('#gamesPage .game-title');
    if (gameTitleElement) gameTitleElement.textContent = t.bounceBlitzTitle;

    const gameDescriptionElement = document.querySelector('#gamesPage .game-description');
    if (gameDescriptionElement) gameDescriptionElement.textContent = t.bounceBlitzDesc;

    const startBounceBlitzElement = document.getElementById('startBounceBlitz');
    if (startBounceBlitzElement) startBounceBlitzElement.textContent = t.startGame;

    // Function to generate a unique identifier for users without a username
    function generateUniqueIdentifier() {
        // Always use Telegram ID to ensure uniqueness
        return `OINK_${userId}`;
    }

    // Update profile information on the main page
    function updateProfile() {
        // Use username if available, otherwise use OINK_[ID]
        const profileName = user.username || `OINK_${userId}`;
        const profileInitial = profileName[0].toUpperCase();
        
        document.getElementById('profile-name').textContent = profileName;
        document.getElementById('profile-initial').textContent = profileInitial;
        document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
        updateProfileIcon();
    }

    // New function to format numbers with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Add this new function to handle tab bar visibility
    function setTabBarVisibility(visible, animate = true) {
        const tabBar = document.getElementById('tabBar');
        if (!tabBar) return;

        if (animate) {
            tabBar.style.transition = 'transform 0.3s ease-in-out';
        } else {
            tabBar.style.transition = 'none';
        }

        if (visible) {
            tabBar.style.transform = 'translateY(0)';
        } else {
            tabBar.style.transform = 'translateY(100%)';
        }
    }

    // Modify the showPage function
    function showPage(pageId, tabButtonId) {
        // Hide all pages and remove active state from tab buttons
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
    
        // Clear falling coins when leaving the game page
        if (pageId !== 'gamePage') {
            clearFallingCoins();
        }
    
        let pageElement = document.getElementById(pageId);
    
        // If the page does not exist, recreate it
        if (!pageElement) {
            pageElement = createPage(pageId); // Recreate the page if it's not found
            if (!pageElement) {
                return; // Exit if page creation fails
            }
        }
    
        // Ensure the page is appended to the DOM in case it was removed
        if (!document.body.contains(pageElement)) {
            document.getElementById('app').appendChild(pageElement);
        }
    
        // Set the page as active
        pageElement.classList.add('active');
    
        // Set the corresponding tab button as active, if provided
        if (tabButtonId) {
            const tabButton = document.getElementById(tabButtonId);
            if (tabButton) {
                tabButton.classList.add('active');
            }
        }
    
        // Show or hide the tab bar based on the page
        setTabBarVisibility(pageId !== 'shopPage');
    
        // Clear falling coins when returning to the main game page
        if (pageId === 'gamePage') {
            clearFallingCoins();
        }
    
        // Show or hide elements specific to pages, e.g., Invite Button
        const inviteButton = document.getElementById('inviteButton');
        if (inviteButton) {
            inviteButton.style.display = pageId === 'invitePage' ? 'block' : 'none';
        }
    
        updateTapProgress(); // Add this line
    }    

    function clearFallingCoins() {
        const coinContainer = document.getElementById('coin-container');
        while (coinContainer.firstChild) {
            coinContainer.removeChild(coinContainer.firstChild);
        }
    }

    window.clearFallingCoins = clearFallingCoins;

    // Update saveUserData function (remove the duplicate and use this version)
    function saveUserData() {
        const userId = window.gameUtils.userId;

        if (!userId) {
            console.error('No valid user ID available');
            return;
        }

        // Cosmetic preferences data
        const cosmeticData = {
            id: userId,
            current_gradient: window.gameUtils.currentGradient,
            current_coin: window.gameUtils.currentCoin,
            current_emblem: window.gameUtils.currentEmblem,
            owned_gradients: window.gameUtils.ownedGradients.join(','),
            owned_coins: window.gameUtils.ownedCoins.join(','),
            owned_emblems: window.gameUtils.ownedEmblems.join(',')  // Add this line
        };

        console.log('Saving cosmetic data:', cosmeticData);

        // Save cosmetic preferences
        fetch(`https://251fecd466c10d.lhr.life/user.php?${new URLSearchParams(cosmeticData).toString()}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log('Cosmetic preferences saved:', data);
                if (data.status === "error") {
                    throw new Error(data.message);
                }
                updateProfile();
                updateShopUI();
                updateProfileIcon();
            })
            .catch(error => {
                console.error('Error saving cosmetic data:', error);
            });

        // Save session data
        window.gameUtils.saveSessionData();
    }
    
    

    // Check if the current user was invited by another user
    function checkForInvite() {
        const urlParams = new URLSearchParams(window.location.search);
        const inviterId = urlParams.get('invite');
        if (inviterId && inviterId !== user.id.toString()) {
            rewardInviter(inviterId);
        }
    }

    // Reward the inviter with 1000 coins
    function rewardInviter(inviterId) {
        fetch(`https://251fecd466c10d.lhr.life/check.php?username=${inviterId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(inviter => {
            inviter.coins = (inviter.coins || 0) + 1000;
    
            // Save updated inviter data
            fetch('https://251fecd466c10d.lhr.life/update.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(inviter)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Inviter rewarded with 1000 coins.', data);
            })
            .catch(error => {
                console.error('Error rewarding inviter:', error);
            });
        })
        .catch(error => {
            console.error('Error retrieving inviter data:', error);
        });
    }    

    // Event listeners for tab buttons
    const gameTabButton = document.getElementById('gameTabButton');
    if (gameTabButton) {
        gameTabButton.addEventListener('click', () => {
            showPage('gamePage', 'gameTabButton');
            if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        });
    }

    const rewardsTabButton = document.getElementById('rewardsTabButton');
    if (rewardsTabButton) {
        rewardsTabButton.addEventListener('click', () => {
            showPage('rewardsPage', 'rewardsTabButton');
            if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        });
    }

    const shopTabButton = document.getElementById('shopTabButton');
    if (shopTabButton) {
        shopTabButton.addEventListener('click', () => {
            showPage('shopPage', 'shopTabButton');
            document.getElementById('shopPage').scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    const profileModalCloseButton = document.getElementById('profile-modal-close');
    if (profileModalCloseButton) {
        profileModalCloseButton.addEventListener('click', () => {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        });
    }

    // Pig interaction for earning coins
    const pigHitbox = document.getElementById('pig-hitbox');
    const pigImage = document.getElementById('pig');
    const coinContainer = document.getElementById('coin-container');

    if (pigHitbox && !pigHitbox.classList.contains('listener-added')) {
        pigHitbox.addEventListener('touchstart', handlePigTap, { passive: false });
        pigHitbox.addEventListener('mousedown', handlePigTap);
        pigHitbox.addEventListener('touchend', handleTouchEnd, { passive: false });
        pigHitbox.classList.add('listener-added');
    }

    let touchCount = 0;
    let lastTapTime = 0;
    const tapThreshold = 300; // milliseconds

    function handlePigTap(event) {
        event.preventDefault();

        if (window.gameUtils.dailyTapCount >= window.gameUtils.dailyTapLimit) {
            return;
        }

        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTapTime;

        // Create falling coin immediately
        createFallingCoin();
        
        // Keep existing animation and haptic feedback
        pigImage.classList.add('pig-pulse');
        if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        pigImage.addEventListener('animationend', () => {
            pigImage.classList.remove('pig-pulse');
        }, { once: true });

        // Send tap data to server
        const tapData = {
            id: window.gameUtils.userId,
            daily_tap_count: 1
        };

        fetch('https://251fecd466c10d.lhr.life/tap.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(tapData).toString()
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update local count with server response
                window.gameUtils.dailyTapCount = parseInt(data.daily_tap_count);
                window.gameUtils.lastTapResetDate = new Date(data.last_tap_reset_date);
                
                // Add coins
                window.gameUtils.coins = parseInt(window.gameUtils.coins) + 1;
                
                // Update UI
                document.getElementById('coin-count').textContent = formatNumber(window.gameUtils.coins);
                document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
                document.getElementById('shop-profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
                
                // Update progress bar
                updateTapProgress();
            }
        })
        .catch(error => {
            console.error('Error updating tap count:', error);
        });

        lastTapTime = currentTime;
    }

    function handleTouchEnd(event) {
        event.preventDefault();
        touchCount = 0;
    }

    function addCoins(amount) {
        // Ensure `coins` is a number before incrementing
        window.gameUtils.coins = parseInt(window.gameUtils.coins) + amount;

        // Update all balance elements
        document.getElementById('coin-count').textContent = formatNumber(window.gameUtils.coins);
        document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
        document.getElementById('shop-profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);

        saveUserData();
        for (let i = 0; i < amount; i++) {
            createFallingCoin();
        }
    }
    window.addCoins = addCoins;
    function createFallingCoin() {
        const coin = document.createElement('img');
        const currentCoinImage = coinImages.find(c => c.id === window.gameUtils.currentCoin);
        coin.src = currentCoinImage ? currentCoinImage.image : 'img/coin_pig.png';
        coin.className = 'falling-coin';
        coin.style.left = `${Math.random() * 80 + 10}%`; // Random horizontal position
        coin.style.top = '0'; // Start from the top
        coinContainer.appendChild(coin);

        // Remove the coin element after animation ends
        coin.addEventListener('animationend', () => {
            coin.remove();
        });

        // Log to console for debugging
        console.log('Coin created:', coin.src);
    }

    // Apply theme dynamically, ensuring the balance-card color is correct
    function applyTheme(theme) {
        const isDarkTheme = theme.text_color === '#ffffff' || theme.text_color === '#fff';

        // Apply the background color for the tap-progress-container based on the theme
        const tapProgressContainer = document.getElementById('tap-progress-container');
        if (tapProgressContainer) {
            tapProgressContainer.style.backgroundColor = isDarkTheme 
                ? 'rgba(254, 251, 251, 0.19)' 
                : 'rgba(0, 0, 0, 0.19)';
        }

        if (isDarkTheme) {
            // Dark theme
            document.documentElement.style.setProperty('--tg-theme-bg-color', '#000000');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', '#000000');
            document.documentElement.style.setProperty('--tg-theme-text-color', '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-hint-color', '#99989E');
            document.documentElement.style.setProperty('--tg-theme-link-color', '#8774e1');
            document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#8774e1');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-card-bg-color', '#1C1C1C');
            document.documentElement.style.setProperty('--tg-theme-card-text-color', '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-header-bg-color', '#000000'); // Set header color to black
            document.documentElement.style.setProperty('--tg-theme-section-separator-color', theme.section_separator_color || '#3A3A3C');
        } else {
            // Light theme
            document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f0f0f0');
            document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
            document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#8A8A8E');
            document.documentElement.style.setProperty('--tg-theme-link-color', theme.link_color || '#2481cc');
            document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2481cc');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-card-bg-color', '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-card-text-color', '#000000');
            document.documentElement.style.setProperty('--tg-theme-header-bg-color', '#f0f0f0'); // Set header color to #f0f0f0
            document.documentElement.style.setProperty('--tg-theme-section-separator-color', theme.section_separator_color || '#D4D4D5');
        }

        // Common properties
        document.documentElement.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color || '#000000');
    }

    // Initialize theme on load
    applyTheme(window.Telegram.WebApp.themeParams);

    // Listen for theme changes
    window.Telegram.WebApp.onEvent('themeChanged', () => {
        applyTheme(window.Telegram.WebApp.themeParams);
    });

    // Task-specific code with channel join verification
    document.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const channelId = this.getAttribute('data-channel');
            
            // Add LIME Game handling
            if (channelId === 'limegame') {
                window.Telegram.WebApp.openTelegramLink('https://t.me/iMe_lime_bot/app?startapp=ref_oinkcoin_miniapp');
                
                // Simulate join verification after a delay
                setTimeout(() => {
                    const userConfirmedPlay = confirm(t.limeGameConfirm || 'Please confirm if you have played LIME Game.');
                    if (userConfirmedPlay) {
                        awardCoinsForJoining('limegame');
                        this.classList.add('completed');
                    } else {
                        alert(t.playGameToReceiveReward || 'Please play the game to receive your reward.');
                    }
                }, 5000);
                return;
            }
            
            // Open the Telegram link in a new tab
            const channelLinks = {
                aireviewgames: 'https://t.me/aireviewgames',
                oinkcoinchannel: 'https://t.me/oinkcoinchannel',
                oinkcoinTwitter: 'https://twitter.com/oinkcoin_',
                dreamedbot: 'https://t.me/dreamedbot/dmd',
                coinheavenchannel: 'https://t.me/coin_heaven',
                coinheavenbot: 'https://t.me/coin_heaven_bot',
                fortniteShop: 'https://t.me/todaysFortniteShop'
            };

            if (channelLinks[channelId]) {
                window.open(channelLinks[channelId], '_blank');
                
                // Simulate join verification after a delay
                setTimeout(() => {
                    const userConfirmedJoin = confirm(`Please confirm if you have followed the ${channelId} channel.`);
                    if (userConfirmedJoin) {
                        awardCoinsForJoining(channelId);
                        this.classList.add('completed');
                    } else {
                        alert('Please follow the channel to receive your reward.');
                    }
                }, 5000); // 5-second delay for user to join the channel
            }
        });
    });

    // Modify the awardCoinsForJoining function to update the UI
    function awardCoinsForJoining(channelId) {
        // Check if the user has already earned coins for this task
        const taskCompletedKey = `task_${channelId}_completed`;
        window.Telegram.WebApp.CloudStorage.getItem(taskCompletedKey, (error, completed) => {
            if (!error && !completed) {
                window.gameUtils.coins += 1000;
                document.getElementById('coin-count').textContent = formatNumber(window.gameUtils.coins); // Updated to format number
                document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins); // Updated to format number
                saveUserData();
                
                // Update the shop UI to reflect the new coin balance
                updateShopUI();
                
                // Mark task as completed
                window.Telegram.WebApp.CloudStorage.setItem(taskCompletedKey, 'true', (error) => {
                    if (error) {
                        console.error('Error marking task as completed:', error);
                    } else {
                        console.log('Task completed and rewarded.');
                        // Add the 'completed' class to the task item
                        document.querySelector(`.task-item[data-channel="${channelId}"]`).classList.add('completed');
                    }
                });
                
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            } else if (completed) {
                alert('You have already earned coins for this task.');
            } else {
                console.error('Error checking task completion:', error);
            }
        });
    }

    // Gradients data
    const gradients = [
        { id: 'basic', name: t.basicGradient, gradient: 'linear-gradient(135deg, #37aee2, #0078ff)', price: 0 },
        { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #ff8c00, #ff0080)', price: 500 },
        { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #00c853, #009688)', price: 750 },
        { id: 'lavender', name: 'Lavender', gradient: 'linear-gradient(135deg, #e040fb, #7c4dff)', price: 1250 },
        { id: 'fire', name: 'Fire', gradient: 'linear-gradient(135deg, #ff5722, #ff9800)', price: 1500 },
        { id: 'northern-lights', name: 'Northern Lights', gradient: 'linear-gradient(135deg, #1de9b6, #1565c0)', price: 2000 },
        { id: 'gold', name: 'Gold', gradient: 'linear-gradient(135deg, #ffd700, #ffb700)', price: 2500 },
        // Add the new pig gradient
        { id: 'pig', name: t.pigGradient, gradient: 'linear-gradient(135deg, #FFC0CB, #FF69B4)', price: 3000 },
        { id: 'purple', name: 'Purple Dream', gradient: 'linear-gradient(135deg, #6262FF, #3838D9)', price: 7500 },
        { id: 'black-dark', name: 'Black Dark', gradient: 'linear-gradient(135deg, #282828, #000000)', price: 8000 },
    ];

    function updateShopUI() {
        const shopProfileIcon = document.getElementById('shop-profile-icon');
        const shopProfileInitial = document.getElementById('shop-profile-initial');
        const shopProfileName = document.getElementById('shop-profile-name');
        const shopProfileBalanceAmount = document.getElementById('shop-profile-balance-amount');
        const gradientList = document.getElementById('gradient-list');

        shopProfileIcon.style.background = gradients.find(g => g.id === window.gameUtils.currentGradient).gradient;
        
        // Update this part to display the emblem if it exists
        if (window.gameUtils.currentEmblem === 'johny') {
            shopProfileInitial.innerHTML = `<img src="img/johny.webp" alt="Johny" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else if (window.gameUtils.currentEmblem === 'telegram' || window.gameUtils.currentEmblem === 'jedi' || window.gameUtils.currentEmblem === 'poo') { // Added 'poo' here
            const emblem = emblems.find(e => e.id === window.gameUtils.currentEmblem);
            shopProfileInitial.innerHTML = `<div class="ton-emblem"><img src="${emblem.image}" alt="${emblem.name}" style="width: ${emblem.width}; height: ${emblem.height};"></div>`;
        } else if (window.gameUtils.currentEmblem) {
            const emblem = emblems.find(e => e.id === window.gameUtils.currentEmblem);
            if (emblem.icon) {
                shopProfileInitial.innerHTML = `<i class="${emblem.icon}"></i>`;
            }
        } else {
            shopProfileInitial.textContent = user.username ? user.username[0].toUpperCase() : generateUniqueIdentifier()[0].toUpperCase();
        }

        shopProfileName.textContent = user.username || generateUniqueIdentifier();  // Use username or generate unique identifier
        shopProfileBalanceAmount.textContent = formatNumber(window.gameUtils.coins);

        document.getElementById('available-gradients').textContent = t.availableGradients;
        document.getElementById('shop-balance-label').textContent = t.balance;

        gradientList.innerHTML = '';
        gradients.forEach(gradient => {
            const gradientItem = document.createElement('div');
            gradientItem.className = 'gradient-item';
            const isOwned = window.gameUtils.ownedGradients.includes(gradient.id);
            const isActive = window.gameUtils.currentGradient === gradient.id;
            gradientItem.innerHTML = `
                <div class="gradient-preview ${isActive ? 'active' : ''}" style="background: ${gradient.gradient}"></div>
                <span class="gradient-name">${gradient.name}</span>
                <span class="gradient-price">${formatNumber(gradient.price)} ${t.coins}</span>
                ${isOwned 
                    ? `<button class="use-gradient ${isActive ? 'active' : ''}" data-id="${gradient.id}">${isActive ? t.owned : t.useGradient}</button>`
                    : `<button class="buy-gradient" data-id="${gradient.id}">${t.buyGradient}</button>`
                }
            `;
            gradientList.appendChild(gradientItem);
        });

        document.querySelectorAll('.use-gradient').forEach(button => {
            button.addEventListener('click', (e) => {
                window.gameUtils.currentGradient = e.target.dataset.id;
                saveUserData(); // Save the current gradient immediately
                updateShopUI();
                updateProfileIcon();
            });
        });

        document.querySelectorAll('.buy-gradient').forEach(button => {
            button.addEventListener('click', (e) => {
                const gradientId = e.target.dataset.id;
                const gradient = gradients.find(g => g.id === gradientId);
                if (window.gameUtils.coins >= gradient.price) {
                    window.gameUtils.coins -= gradient.price;
                    window.gameUtils.ownedGradients.push(gradientId);
                    window.gameUtils.currentGradient = gradientId;
                    
                    // Create userData object with all existing data
                    const userData = {
                        id: window.gameUtils.userId,
                        username: encodeURIComponent(user.username || 'unknown'),
                        first_name: encodeURIComponent(user.first_name || ''),
                        last_name: encodeURIComponent(user.last_name || ''),
                        coins: window.gameUtils.coins,
                        current_gradient: encodeURIComponent(window.gameUtils.currentGradient),
                        owned_gradients: window.gameUtils.ownedGradients.map(encodeURIComponent).join(','),
                        current_coin: encodeURIComponent(window.gameUtils.currentCoin),
                        owned_coins: window.gameUtils.ownedCoins.map(encodeURIComponent).join(','),
                        last_reward_date: window.gameUtils.user?.last_reward_date,
                        current_emblem: encodeURIComponent(window.gameUtils.currentEmblem),
                        owned_emblems: window.gameUtils.ownedEmblems.map(encodeURIComponent).join(','),
                        // Preserve last_combo_attempt and tap data
                        last_combo_attempt: window.gameUtils.user?.last_combo_attempt || null,
                        daily_tap_count: window.gameUtils.user?.daily_tap_count || 0,
                        last_tap_reset_date: window.gameUtils.user?.last_tap_reset_date || null
                    };

                    // Update server and UI
                    fetch('https://251fecd466c10d.lhr.life/update.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(userData).toString()
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Purchase successful:', data);
                        window.gameUtils.user = { ...window.gameUtils.user, ...userData };
                        updateShopUI();
                        updateProfileIcon();
                    })
                    .catch(error => {
                        console.error('Error saving purchase:', error);
                    });
                } else {
                    alert(t.notEnoughCoins);
                }
            });
        });

        updateProfileModal();

        // Update coin shop
        const coinList = document.getElementById('coin-list');
        const availableCoinsTitle = document.getElementById('available-coins');
        availableCoinsTitle.textContent = t.availableCoins;

        coinList.innerHTML = '';
        coinImages.forEach(coin => {
            const coinItem = document.createElement('div');
            coinItem.className = 'coin-item';
            const isOwned = window.gameUtils.ownedCoins.includes(coin.id);
            const isActive = window.gameUtils.currentCoin === coin.id;
            coinItem.innerHTML = `
                <img src="${coin.image}" alt="${coin.name}" class="coin-preview ${isActive ? 'active' : ''}">
                <span class="coin-name">${coin.name}</span>
                <span class="coin-price">${formatNumber(coin.price)} ${t.coins}</span>
                ${isOwned 
                    ? `<button class="use-coin ${isActive ? 'active' : ''}" data-id="${coin.id}">${isActive ? t.owned : t.useCoin}</button>`
                    : `<button class="buy-coin" data-id="${coin.id}">${t.buyCoin}</button>`
                }
            `;
            coinList.appendChild(coinItem);
        });

        // Add event listeners for coin buttons
        document.querySelectorAll('.use-coin').forEach(button => {
            button.addEventListener('click', (e) => {
                window.gameUtils.currentCoin = e.target.dataset.id;
                saveUserData();
                updateShopUI();
            });
        });

        document.querySelectorAll('.buy-coin').forEach(button => {
            button.addEventListener('click', (e) => {
                const coinId = e.target.dataset.id;
                const coin = coinImages.find(c => c.id === coinId);
                if (window.gameUtils.coins >= coin.price) {
                    window.gameUtils.coins -= coin.price;
                    window.gameUtils.ownedCoins.push(coinId);
                    window.gameUtils.currentCoin = coinId;
                    
                    // Create userData object with all existing data
                    const userData = {
                        id: window.gameUtils.userId,
                        username: encodeURIComponent(user.username || 'unknown'),
                        first_name: encodeURIComponent(user.first_name || ''),
                        last_name: encodeURIComponent(user.last_name || ''),
                        coins: window.gameUtils.coins,
                        current_gradient: encodeURIComponent(window.gameUtils.currentGradient),
                        owned_gradients: window.gameUtils.ownedGradients.map(encodeURIComponent).join(','),
                        current_coin: encodeURIComponent(window.gameUtils.currentCoin),
                        owned_coins: window.gameUtils.ownedCoins.map(encodeURIComponent).join(','),
                        last_reward_date: window.gameUtils.user?.last_reward_date,
                        current_emblem: encodeURIComponent(window.gameUtils.currentEmblem),
                        owned_emblems: window.gameUtils.ownedEmblems.map(encodeURIComponent).join(','),
                        // Preserve last_combo_attempt and tap data
                        last_combo_attempt: window.gameUtils.user?.last_combo_attempt || null,
                        daily_tap_count: window.gameUtils.user?.daily_tap_count || 0,
                        last_tap_reset_date: window.gameUtils.user?.last_tap_reset_date || null
                    };

                    // Update server and UI
                    fetch('https://251fecd466c10d.lhr.life/update.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(userData).toString()
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Purchase successful:', data);
                        window.gameUtils.user = { ...window.gameUtils.user, ...userData };
                        updateShopUI();
                    })
                    .catch(error => {
                        console.error('Error saving purchase:', error);
                    });
                } else {
                    alert(t.notEnoughCoins);
                }
            });
        });

        // Update emblem shop
        const emblemList = document.getElementById('emblem-list');
        const availableEmblemsTitle = document.getElementById('available-emblems');
        availableEmblemsTitle.textContent = t.availableEmblems;

        emblemList.innerHTML = '';
        
        // Add the initial letter option
        const initialItem = document.createElement('div');
        initialItem.className = 'emblem-item';
        const isInitialActive = window.gameUtils.currentEmblem === '';
        initialItem.innerHTML = `
            <div class="emblem-preview ${isInitialActive ? 'active' : ''}" style="background: ${gradients.find(g => g.id === window.gameUtils.currentGradient).gradient};">
                <span>${user.username ? user.username[0].toUpperCase() : ''}</span>
            </div>
            <span class="emblem-name">${t.initialLetter}</span>
            <span class="emblem-price">0 ${t.coins}</span>
            <button class="use-emblem ${isInitialActive ? 'active' : ''}" data-id="">${isInitialActive ? t.owned : t.useEmblem}</button>
        `;
        emblemList.appendChild(initialItem);

        // Add other emblems
        emblems.forEach(emblem => {
            const emblemItem = document.createElement('div');
            emblemItem.className = 'emblem-item';
            const isOwned = window.gameUtils.ownedEmblems.includes(emblem.id);
            const isActive = window.gameUtils.currentEmblem === emblem.id;
            
            let emblemHtml;
            if (emblem.image) {
                const style = emblem.width && emblem.height ? 
                    `width: ${emblem.width}; height: ${emblem.height}; object-fit: contain;` :
                    'width: 100%; height: 100%; object-fit: cover;';
                emblemHtml = `<img src="${emblem.image}" alt="${emblem.name}" style="${style}">`;
            } else {
                emblemHtml = `<i class="${emblem.icon}"></i>`;
            }

            // Modified price display and button logic for TON-priced emblems
            const priceDisplay = emblem.priceTon ? 
                `${emblem.priceTon} TON` : 
                `${formatNumber(emblem.price)} ${t.coins}`;

            emblemItem.innerHTML = `
                <div class="emblem-preview ${isActive ? 'active' : ''}" style="background: ${gradients.find(g => g.id === window.gameUtils.currentGradient).gradient};">
                    ${emblemHtml}
                </div>
                <span class="emblem-name">${emblem.name}</span>
                <span class="emblem-price">${priceDisplay}</span>
                ${isOwned 
                    ? `<button class="use-emblem ${isActive ? 'active' : ''}" data-id="${emblem.id}">${isActive ? t.owned : t.useEmblem}</button>`
                    : `<button class="buy-emblem" data-id="${emblem.id}" data-ton="${emblem.priceTon || 0}">${t.buyEmblem}</button>`
                }
            `;
            emblemList.appendChild(emblemItem);
        });

        // Add event listeners for emblem buttons
        document.querySelectorAll('.use-emblem').forEach(button => {
            button.addEventListener('click', (e) => {
                window.gameUtils.currentEmblem = e.target.dataset.id;
                saveUserData();
                updateShopUI();
                updateProfileIcon();
            });
        });

        document.querySelectorAll('.buy-emblem').forEach(button => {
            button.addEventListener('click', async (e) => {
                const emblemId = e.target.dataset.id;
                const emblem = emblems.find(e => e.id === emblemId);
                const tonPrice = parseFloat(e.target.dataset.ton);

                if (tonPrice > 0) {
                    // Handle TON payment
                    try {
                        if (!window.tonPayments.isWalletConnected()) {
                            await window.tonPayments.connectWallet();
                        }

                        const result = await window.tonPayments.sendTransaction(tonPrice);
                        
                        if (result) {
                            // Add to owned emblems first
                            if (!window.gameUtils.ownedEmblems.includes(emblemId)) {
                                window.gameUtils.ownedEmblems.push(emblemId);
                            }
                            window.gameUtils.currentEmblem = emblemId;
                            
                            // Save the updated user data
                            saveUserData();

                            // Show success message
                            window.Telegram.WebApp.showPopup({
                                title: 'Success!',
                                message: `You have successfully purchased the ${emblem.name} emblem!`,
                                buttons: [{
                                    type: 'ok'
                                }]
                            });
                        }
                    } catch (error) {
                        console.error('Payment error:', error);
                        window.Telegram.WebApp.showPopup({
                            title: 'Error',
                            message: 'Payment failed. Please try again.',
                            buttons: [{
                                type: 'ok'
                            }]
                        });
                    }
                }
            });
        });
    }

    function updateProfileIcon() {
        const profileIcon = document.getElementById('profile-icon');
        const profileInitial = document.getElementById('profile-initial');
        profileIcon.style.background = gradients.find(g => g.id === window.gameUtils.currentGradient).gradient;
        
        if (window.gameUtils.currentEmblem === 'johny') {
            profileInitial.innerHTML = `<img src="img/johny.webp" alt="Johny" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else if (window.gameUtils.currentEmblem === 'telegram' || window.gameUtils.currentEmblem === 'jedi' || window.gameUtils.currentEmblem === 'poo') { // Added 'poo' here
            const emblem = emblems.find(e => e.id === window.gameUtils.currentEmblem);
            profileInitial.innerHTML = `<div class="ton-emblem"><img src="${emblem.image}" alt="${emblem.name}" style="width: ${emblem.width}; height: ${emblem.height};"></div>`;
        } else if (window.gameUtils.currentEmblem) {
            const emblem = emblems.find(e => e.id === window.gameUtils.currentEmblem);
            if (emblem.icon) {
                profileInitial.innerHTML = `<i class="${emblem.icon}"></i>`;
            }
        } else {
            profileInitial.textContent = user.username ? user.username[0].toUpperCase() : generateUniqueIdentifier()[0].toUpperCase();
        }
    }

    
    // Update the fetchUserData function to return a promise
    function fetchUserData() {
        return new Promise((resolve, reject) => {
            if (!window.gameUtils.userId) {
                console.error('User ID not available');
                reject('User ID not available');
                return;
            }

            console.log("Fetching user data for ID: ", window.gameUtils.userId);

            // First fetch last session data
            fetch(`https://251fecd466c10d.lhr.life/session.php?user_id=${window.gameUtils.userId}`)
                .then(response => response.json())
                .then(sessionData => {
                    console.log("Session data:", sessionData);

                    if (sessionData.status === 'success' && sessionData.data) {
                        window.gameUtils.lastSessionData = sessionData.data;
                    }

                    return fetch(`https://251fecd466c10d.lhr.life/check.php?id=${window.gameUtils.userId}&username=${encodeURIComponent(user.username || '')}&nocache=${Date.now()}`, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Database data:", data);

                    // Ensure numeric values are properly parsed
                    data.coins = parseInt(data.coins) || 0;
                    data.tickets = parseInt(data.tickets) || 0;
                    data.ton_balance = parseFloat(data.ton_balance) || 0;
                    data.stars_balance = parseInt(data.stars_balance) || 0;

                    // Properly parse arrays
                    data.owned_gradients = data.owned_gradients ? data.owned_gradients.split(',') : ['basic'];
                    data.owned_coins = data.owned_coins ? data.owned_coins.split(',') : ['pig'];
                    data.owned_emblems = Array.isArray(data.owned_emblems) ? 
                        data.owned_emblems : 
                        (data.owned_emblems || '').split(',').filter(e => e);

                    // Update global variables
                    window.gameUtils.coins = data.coins;
                    window.gameUtils.tickets = data.tickets;
                    window.gameUtils.tonBalance = data.ton_balance;
                    window.gameUtils.starsBalance = data.stars_balance;
                    window.gameUtils.currentGradient = data.current_gradient || 'basic';
                    window.gameUtils.currentCoin = data.current_coin || 'pig';
                    window.gameUtils.currentEmblem = data.current_emblem || '';
                    window.gameUtils.ownedGradients = data.owned_gradients;
                    window.gameUtils.ownedCoins = data.owned_coins;
                    window.gameUtils.ownedEmblems = data.owned_emblems;

                    // Update window.gameUtils.user
                    window.gameUtils.user = { ...user, ...data };
                    user = window.gameUtils.user;

                    // Update profile icons
                    const profileIcon = document.getElementById('profile-icon');
                    const shopProfileIcon = document.getElementById('shop-profile-icon');
                    if (profileIcon) {
                        profileIcon.style.background = gradients.find(g => g.id === window.gameUtils.currentGradient)?.gradient || gradients[0].gradient;
                    }
                    if (shopProfileIcon) {
                        shopProfileIcon.style.background = gradients.find(g => g.id === window.gameUtils.currentGradient)?.gradient || gradients[0].gradient;
                    }

                    // Update emblems
                    const profileInitial = document.getElementById('profile-initial');
                    const shopProfileInitial = document.getElementById('shop-profile-initial');
                    updateProfileEmblems(profileInitial, shopProfileInitial);

                    // Update UI immediately
                    document.getElementById('coin-count').textContent = formatNumber(window.gameUtils.coins);
                    document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
                    document.getElementById('shop-profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);

                    // Update other UI elements
                    updateProfile();
                    updateShopUI();
                    updateTapProgress();
                    updateBalanceDisplay();
                    updateTicketsDisplay();
                    updateTicketNotification();

                    // Set tap data
                    window.gameUtils.dailyTapCount = parseInt(data.daily_tap_count) || 0;
                    window.gameUtils.lastTapResetDate = data.last_tap_reset_date ? new Date(data.last_tap_reset_date) : null;

                    // Check if we need to reset tap count for new day
                    const today = new Date().toISOString().split('T')[0];
                    const lastResetDate = window.gameUtils.lastTapResetDate ? window.gameUtils.lastTapResetDate.toISOString().split('T')[0] : null;
                    
                    if (lastResetDate !== today) {
                        window.gameUtils.dailyTapCount = 0;
                        window.gameUtils.lastTapResetDate = new Date();
                    }

                    // Update progress bar immediately
                    updateTapProgress();

                    // Check daily reward before other updates
                    checkDailyReward();

                    resolve(window.gameUtils.user);
                })
                .catch(error => {
                    console.error('Error in fetchUserData:', error);
                    reject(error);
                })
                .finally(() => {
                    hideLoadingScreen();
                });
        });
    };

    // Add this helper function
    function updateProfileEmblems(profileInitial, shopProfileInitial) {
        if (!window.gameUtils.currentEmblem) {
            // No emblem, show initial
            const initial = user.username ? user.username[0].toUpperCase() : 'O';
            if (profileInitial) profileInitial.textContent = initial;
            if (shopProfileInitial) shopProfileInitial.textContent = initial;
            return;
        }

        const emblem = emblems.find(e => e.id === window.gameUtils.currentEmblem);
        if (!emblem) return;

        const emblemHtml = emblem.image ? 
            `<img src="${emblem.image}" alt="${emblem.name}" style="width: ${emblem.width || '100%'}; height: ${emblem.height || '100%'};">` :
            `<i class="${emblem.icon}"></i>`;

        if (profileInitial) profileInitial.innerHTML = emblemHtml;
        if (shopProfileInitial) shopProfileInitial.innerHTML = emblemHtml;
    }
    
    // Event listener for leaderboard tab button
    const leaderboardTabButton = document.getElementById('leaderboardTabButton');
    if (leaderboardTabButton) {
        leaderboardTabButton.addEventListener('click', () => {
            showPage('leaderboardPage', 'leaderboardTabButton');
            fetchLeaderboard();
            // Add haptic feedback
            if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        });
    }

    // Add this after the fetchLeaderboard function
    function updateUserRankItem(data) {
        if (data.userRank) {
            const userRankItem = document.createElement('li');
            userRankItem.classList.add('leaderboard-item', 'user-item'); // Add user-item class

            const emblem = data.userRank.current_emblem ? emblems.find(e => e.id === data.userRank.current_emblem) : null;
            let emblemHtml;
            if (emblem) {
                if (emblem.image) {
                    const style = `width: ${emblem.width}; height: ${emblem.height};`;
                    emblemHtml = `<div class="ton-emblem"><img src="${emblem.image}" alt="${emblem.name}" style="${style}"></div>`;
                } else {
                    emblemHtml = `<i class="${emblem.icon}"></i>`;
                }
            } else {
                emblemHtml = data.userRank.username ? data.userRank.username[0].toUpperCase() : '';
            }

            userRankItem.innerHTML = `
                <div class="leaderboard-content">
                    <span class="leaderboard-rank">#${data.userRank.rank}</span>
                    <div class="leaderboard-icon" style="background: ${getGradient(data.userRank.current_gradient)};">
                        <span>${emblemHtml}</span>
                    </div>
                    <div class="leaderboard-info">
                        <span class="leaderboard-username">${data.userRank.username}</span>
                        <span class="leaderboard-coins">${formatNumber(data.userRank.coins)} OINK</span>
                    </div>
                </div>
                <button class="boost-rating-button">Boost Rating</button>
            `;

            // Inside the updateUserRankItem function, update the boost modal HTML
            const boostModal = document.createElement('div');
            boostModal.id = 'boost-modal';
            boostModal.innerHTML = `
                <img src="img/Eyes-Emojitelegram.webp" alt="Eyes" class="boost-modal-image">
                <h2>Boost Your Rating</h2>
                <div class="coming-soon-message">
                    <p>Stars payments will be available soon!</p>
                    <p>Stay tuned for updates...</p>
                </div>
            `;

            const boostModalOverlay = document.createElement('div');
            boostModalOverlay.id = 'boost-modal-overlay';

            document.body.appendChild(boostModal);
            document.body.appendChild(boostModalOverlay);

            // Update event listeners
            const boostButton = userRankItem.querySelector('.boost-rating-button');
            boostButton.addEventListener('click', () => {
                boostModal.classList.add('show');
                boostModalOverlay.classList.add('show');
            });

            boostModalOverlay.addEventListener('click', () => {
                boostModal.classList.remove('show');
                boostModalOverlay.classList.remove('show');
            });

            // Update the boost package click handler
            const boostPackages = boostModal.querySelectorAll('.boost-package');
            boostPackages.forEach(package => {
                package.addEventListener('click', async () => {
                    const tonAmount = parseFloat(package.dataset.ton);
                    const oinkAmount = parseInt(package.dataset.oink);

                    try {
                        // Hide the boost modal before showing wallet UI
                        boostModal.classList.remove('show');
                        boostModalOverlay.classList.remove('show');

                        if (!window.tonPayments.isWalletConnected()) {
                            await window.tonPayments.connectWallet();
                        }

                        const result = await window.tonPayments.sendTransaction(tonAmount);
                        
                        if (result) {
                            addCoins(oinkAmount);
                            
                            window.Telegram.WebApp.showPopup({
                                title: 'Success!',
                                message: `You received ${formatNumber(oinkAmount)} OINK!`,
                                buttons: [{
                                    type: 'ok'
                                }]
                            });
                        }
                    } catch (error) {
                        console.error('Payment error:', error);
                        window.Telegram.WebApp.showPopup({
                            title: 'Error',
                            message: 'Payment failed. Please try again.',
                            buttons: [{
                                type: 'ok'
                            }]
                        });
                    }
                });
            });

            return userRankItem;
        }
        return null;
    }

    // Modify the fetchLeaderboard function to use the new updateUserRankItem function
    function fetchLeaderboard() {
        if (!window.gameUtils.userId) {
            console.error('User ID not available');
            return;
        }

        fetch(`https://251fecd466c10d.lhr.life/leaderboard.php?userId=${window.gameUtils.userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const leaderboardList = document.getElementById('leaderboard-list');
                if (!leaderboardList) {
                    console.error('Leaderboard list element not found');
                    return;
                }

                leaderboardList.innerHTML = '';

                // Add "You" heading
                const yourRankHeading = document.createElement('h2');
                yourRankHeading.className = 'leaderboard-section-title';
                yourRankHeading.textContent = t.you;
                leaderboardList.appendChild(yourRankHeading);

                // Add user's rank item
                const userRankItem = updateUserRankItem(data);
                if (userRankItem) {
                    leaderboardList.appendChild(userRankItem);
                }

                // Add "Leaderboard" heading
                const leaderboardHeading = document.createElement('h2');
                leaderboardHeading.className = 'leaderboard-section-title';
                leaderboardHeading.textContent = t.leaderboardTitle;
                leaderboardList.appendChild(leaderboardHeading);

                // Add top 100 users
                if (Array.isArray(data.leaderboard)) {
                    data.leaderboard.forEach((user, index) => {
                        const listItem = document.createElement('li');
                        listItem.classList.add('leaderboard-item');

                        if (index === 0) listItem.classList.add('first-place');
                        else if (index === 1) listItem.classList.add('second-place');
                        else if (index === 2) listItem.classList.add('third-place');

                        const emblem = user.current_emblem ? emblems.find(e => e.id === user.current_emblem) : null;
                        let emblemHtml;
                        if (emblem) {
                            if (emblem.image) {
                                const style = `width: ${emblem.width}; height: ${emblem.height};`;
                                emblemHtml = `<div class="ton-emblem"><img src="${emblem.image}" alt="${emblem.name}" style="${style}"></div>`;
                            } else {
                                emblemHtml = `<i class="${emblem.icon}"></i>`;
                            }
                        } else {
                            emblemHtml = user.username ? user.username[0].toUpperCase() : '';
                        }

                        listItem.innerHTML = `
                            <span class="leaderboard-rank">#${index + 1}</span>
                            <div class="leaderboard-icon" style="background: ${getGradient(user.current_gradient)};">
                                <span>${emblemHtml}</span>
                            </div>
                            <div class="leaderboard-info">
                                <span class="leaderboard-username">${user.username}</span>
                                <span class="leaderboard-coins">${formatNumber(user.coins)} OINK</span>
                            </div>
                        `;

                        leaderboardList.appendChild(listItem);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching leaderboard:', error);
            });
    }


    function getGradient(gradientId) {
        const gradient = gradients.find(g => g.id === gradientId);
        return gradient ? gradient.gradient : 'linear-gradient(135deg, #37aee2, #0078ff)'; // Default gradient
    }


    // Helper function to get gradient for leaderboard icons
    function getGradient(gradientId) {
        const gradient = gradients.find(g => g.id === gradientId);
        return gradient ? gradient.gradient : 'linear-gradient(135deg, #37aee2, #0078ff)'; // Default gradient if not found
    }


    // Profile modal functionality
    const profileSummary = document.getElementById('profile-summary');
    const currentProfile = document.getElementById('current-profile');
    const profileModal = document.getElementById('profile-modal');
    const profileModalContent = document.getElementById('profile-modal-content');
    const profileModalName = document.getElementById('profile-modal-name');
    const profileModalBalance = document.getElementById('profile-modal-balance');
    const profileModalBalanceLabel = document.getElementById('profile-modal-balance-label');
    const profileModalClose = document.getElementById('profile-modal-close');
    const profileModalOverlay = document.getElementById('profile-modal-overlay');

    function openProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        const profileModalOverlay = document.getElementById('profile-modal-overlay');
        if (profileModal && profileModalOverlay) {
            profileModalOverlay.classList.add('show');
            setTimeout(() => {
                profileModal.classList.add('show');
            }, 50); // Small delay to ensure the overlay is visible first
        }
    }

    window.closeProfileModal = function() {
        const profileModal = document.getElementById('profile-modal');
        const profileModalOverlay = document.getElementById('profile-modal-overlay');
        if (profileModal && profileModalOverlay) {
            profileModal.classList.remove('show');
            profileModalOverlay.classList.remove('show');
        }
    };    

    function updateProfileModal() {
        const currentGradientObj = gradients.find(g => g.id === window.gameUtils.currentGradient);
        profileModal.style.background = currentGradientObj.gradient;
        profileModalName.textContent = user.username || '';  // Use username instead of first name
        profileModalBalance.textContent = formatNumber(window.gameUtils.coins);
        profileModalBalanceLabel.textContent = t.yourBalance;
        profileModalClose.textContent = t.close; // Add this line to set the close button text
    }

    if (profileSummary) {
        profileSummary.addEventListener('click', openProfileModal);
    }

    if (currentProfile) {
        currentProfile.addEventListener('click', openProfileModal);
    }

    if (profileModalClose) {
        profileModalClose.addEventListener('click', closeProfileModal);
    }

    if (profileModalOverlay) {
        profileModalOverlay.addEventListener('click', closeProfileModal);
    }

    function initializeApp() {
        console.log("Initializing app...");
        // Initialize all necessary components and update UI
        updateProfile();
        updateShopUI();
        updateTapProgress();
        checkForInvite();
        updateTicketNotification(); // Add this line
    
        // Call initLuckyBoxes() here
        if (window.initLuckyBoxes) {
            window.initLuckyBoxes();
        }
    
        // Hide loading screen and show the app
        console.log("App initialized, hiding loading screen...");
        hideLoadingScreen();
    }    

    function hideLoadingScreen() {
        console.log("Hiding loading screen...");
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        if (loadingScreen && app) {
            loadingScreen.style.display = 'none';
            app.style.display = 'flex';
            console.log("Loading screen hidden, app displayed.");
        } else {
            console.error("Could not find loading screen or app elements");
        }
    }

    // Add this variable at the top of your script, outside any function
    let backButtonReturnTo = 'gamePage';

    // Update the shop button event listener
    const shopButton = document.getElementById('shopButton');
    if (shopButton) {
        shopButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showPage('shopPage');
            document.getElementById('shopPage').scrollTo({top: 0, behavior: 'smooth'});
            window.Telegram.WebApp.BackButton.show();
            backButtonReturnTo = 'gamePage';  // Set to return to the Game Page
            setTabBarVisibility(false); // Hide the tab bar when entering the shop
        });
    }
    
    // Update the back button handler for Shop Page
    if (window.Telegram.WebApp.BackButton) {
        window.Telegram.WebApp.BackButton.offClick(); // Remove any previous listeners
        window.Telegram.WebApp.BackButton.onClick(() => {
            if (backButtonReturnTo === 'gamePage') {
                showPage('gamePage', 'gameTabButton');
                window.Telegram.WebApp.BackButton.hide(); // Hide the back button after returning
                setTabBarVisibility(true); // Show the tab bar when returning to the game page
            }
        });
    }
    
    // Add these functions at the appropriate place in your code

    // Add this function to check if a new day has started
    function isNewDay(lastRewardDate) {
        if (!lastRewardDate) return true;
        const lastDate = new Date(lastRewardDate);
        const currentDate = new Date();
        return currentDate.toDateString() !== lastDate.toDateString();
    }

    // Modify the checkDailyReward function
    function checkDailyReward() {
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const lastRewardDate = window.gameUtils.user?.last_reward_date;
        
        console.log('Checking daily reward:', {
            lastRewardDate: lastRewardDate,
            today: today,
            user: window.gameUtils.user,
            shouldShowReward: !lastRewardDate || 
                             lastRewardDate === '0000-00-00' || 
                             new Date(lastRewardDate).getTime() < new Date(today).getTime()
        });

        // Only show daily reward if:
        // 1. No last reward date
        // 2. Last reward date is invalid
        // 3. Last reward date is before today
        if (!lastRewardDate || 
            lastRewardDate === '0000-00-00' || 
            new Date(lastRewardDate).getTime() < new Date(today).getTime()) {
            
            console.log('Showing daily reward page');
            showDailyRewardPage();
        } else {
            console.log('Daily reward already claimed today');
            initializeApp();
        }
    }

    // Update the claimDailyReward function
    function claimDailyReward() {
        console.log('Claiming daily reward...');
        
        // Update balance first
        if (document.getElementById('moneyBagImage').src.includes('Admission-Tickets.webp')) {
            window.gameUtils.tickets += dailyReward;
            const balanceData = {
                id: window.gameUtils.userId,
                tickets: window.gameUtils.tickets,
                coins: window.gameUtils.coins,
                ton_balance: window.gameUtils.tonBalance,
                stars_balance: window.gameUtils.starsBalance
            };

            // Save balance update
            fetch(`https://251fecd466c10d.lhr.life/balance.php?${new URLSearchParams(balanceData).toString()}`)
                .then(response => {
                    if (!response.ok) throw new Error('Balance update failed');
                    return response.json();
                })
                .then(() => {
                    updateTicketsDisplay();
                    // After balance is updated, save the reward date
                    const userData = {
                        id: window.gameUtils.userId,
                        username: user.username || `OINK_${window.gameUtils.userId}`,
                        first_name: encodeURIComponent(user.first_name || ''),
                        last_name: encodeURIComponent(user.last_name || ''),
                        current_emblem: encodeURIComponent(window.gameUtils.currentEmblem),
                        current_gradient: window.gameUtils.currentGradient,
                        owned_gradients: window.gameUtils.ownedGradients.join(','),
                        current_coin: window.gameUtils.currentCoin,
                        owned_coins: window.gameUtils.ownedCoins.join(',')
                    };

                    return fetch(`https://251fecd466c10d.lhr.life/user.php?${new URLSearchParams(userData).toString()}`);
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to save reward date');
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        window.gameUtils.user.last_reward_date = data.last_reward_date;
                        closeRewardModal();
                    } else {
                        throw new Error(data.message || 'Failed to save reward date');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    closeRewardModal();
                });
        } else {
            // Handle coins reward (similar structure)
            window.gameUtils.coins += dailyReward;
            const balanceData = {
                id: window.gameUtils.userId,
                coins: window.gameUtils.coins,
                tickets: window.gameUtils.tickets,
                ton_balance: window.gameUtils.tonBalance,
                stars_balance: window.gameUtils.starsBalance
            };

            fetch(`https://251fecd466c10d.lhr.life/balance.php?${new URLSearchParams(balanceData).toString()}`)
                .then(response => {
                    if (!response.ok) throw new Error('Balance update failed');
                    return response.json();
                })
                .then(() => {
                    document.getElementById('coin-count').textContent = formatNumber(window.gameUtils.coins);
                    document.getElementById('profile-balance-amount').textContent = formatNumber(window.gameUtils.coins);
                    
                    const userData = {
                        id: window.gameUtils.userId,
                        username: user.username || `OINK_${window.gameUtils.userId}`,
                        first_name: encodeURIComponent(user.first_name || ''),
                        last_name: encodeURIComponent(user.last_name || ''),
                        current_emblem: encodeURIComponent(window.gameUtils.currentEmblem),
                        current_gradient: window.gameUtils.currentGradient,
                        owned_gradients: window.gameUtils.ownedGradients.join(','),
                        current_coin: window.gameUtils.currentCoin,
                        owned_coins: window.gameUtils.ownedCoins.join(',')
                    };

                    return fetch(`https://251fecd466c10d.lhr.life/user.php?${new URLSearchParams(userData).toString()}`);
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to save reward date');
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        window.gameUtils.user.last_reward_date = data.last_reward_date;
                        closeRewardModal();
                    } else {
                        throw new Error(data.message || 'Failed to save reward date');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    closeRewardModal();
                });
        }
    }

    function saveRewardDate(today) {
        const userData = {
            id: window.gameUtils.userId,
            username: user.username || `OINK_${window.gameUtils.userId}`,
            first_name: encodeURIComponent(user.first_name || ''),
            last_name: encodeURIComponent(user.last_name || ''),
            current_emblem: encodeURIComponent(window.gameUtils.currentEmblem),
            current_gradient: window.gameUtils.currentGradient,
            owned_gradients: window.gameUtils.ownedGradients.join(','),
            current_coin: window.gameUtils.currentCoin,
            owned_coins: window.gameUtils.ownedCoins.join(','),
            last_reward_date: today
        };

        fetch(`https://251fecd466c10d.lhr.life/user.php?${new URLSearchParams(userData).toString()}`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to save reward date');
                return response.json();
            })
            .then(() => {
                window.gameUtils.user.last_reward_date = today;
                closeRewardModal();
            })
            .catch(error => {
                console.error('Error saving reward date:', error);
                closeRewardModal(); // Close modal even if there's an error
            });
    }

    function closeRewardModal() {
        const dailyRewardPage = document.getElementById('dailyRewardPage');
        const dailyRewardContent = document.getElementById('dailyRewardContent');
        
        // Add haptic feedback
        if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        if (dailyRewardContent) {
            dailyRewardContent.style.transform = 'translateY(100%)';
        }
        
        if (dailyRewardPage) {
            setTimeout(() => {
                dailyRewardPage.style.display = 'none';
            }, 300);
        }

        // Update UI
        updateProfile();
        updateShopUI();
        
        // Initialize app
        initializeApp();
    }

    // Update the addDailyRewardEventListeners function
    function addDailyRewardEventListeners() {
        const dailyRewardContinueButton = document.getElementById('dailyRewardContinue');

        if (dailyRewardContinueButton) {
            dailyRewardContinueButton.addEventListener('click', (event) => {
                event.preventDefault();
                claimDailyReward();
            });
        }
    }

    // Make sure to call this function when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // ... (existing code)

        addDailyRewardEventListeners();

        // ... (existing code)
    });

    // Update the showDailyRewardPage function
    function showDailyRewardPage() {
        // First determine if user gets tickets or coins (20% chance for tickets)
        const isTicketReward = Math.random() < 0.2;  // 20% chance for tickets

        if (isTicketReward) {
            // Generate random number of tickets between 2 and 5
            dailyReward = Math.floor(Math.random() * 4) + 2; // Random number from 2 to 5
            
            // Update UI for ticket reward
            document.getElementById('moneyBagImage').src = 'img/Admission-Tickets.webp';
            document.getElementById('dailyRewardAmount').textContent = `${dailyReward} Tickets`;
        } else {
            // Generate coin reward as before (skewed towards lower numbers)
            const randomFactor = Math.random() ** 2;
            dailyReward = Math.floor(randomFactor * (10000 - 1000 + 1)) + 1000;
            
            // Update UI for coin reward
            document.getElementById('moneyBagImage').src = 'img/Money-Bag.webp';
            document.getElementById('dailyRewardAmount').textContent = `${formatNumber(dailyReward)} $OINK`;
        }

        document.getElementById('dailyRewardPage').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('dailyRewardContent').style.transform = 'translateY(0)';
        }, 10);
        hideLoadingScreen();
    }

    // Add these functions for invite functionality
    function generateInviteLink() {
        return `https://t.me/oinkcoinbot/oinkcoinweb?start=${user.id}`;
    }

    function copyInviteLink() {
        const inviteLink = generateInviteLink();
        navigator.clipboard.writeText(inviteLink).then(() => {
            alert('Invite link copied to clipboard!');
        }, () => {
            alert('Failed to copy invite link.');
        });
    }

    function shareInviteLink() {
        const inviteLink = generateInviteLink();
        const inviteText = encodeURIComponent("🎉 You're invited to join OinkCoin! 🐷💰 Earn rewards, collect coins, and join the fun!  Click the link to start your journey: ");
        if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${inviteText}`);
    }

    // Function to open the invite modal
    function openInviteModal() {
        const inviteModal = document.getElementById('invite-modal');
        const inviteModalOverlay = document.getElementById('invite-modal-overlay');
        if (inviteModal && inviteModalOverlay) {
            inviteModal.classList.add('show');
            inviteModalOverlay.classList.add('show');
        }
    }

    // Function to close the invite modal
    function closeInviteModal() {
        const inviteModal = document.getElementById('invite-modal');
        const inviteModalOverlay = document.getElementById('invite-modal-overlay');
        if (inviteModal && inviteModalOverlay) {
            inviteModal.classList.remove('show');
            inviteModalOverlay.classList.remove('show');
        }
    }

    // Add event listeners for invite functionality
    const inviteFriendTask = document.getElementById('invite-friend-task');
    const inviteModalCloseButton = document.getElementById('invite-modal-close');
    const inviteButton = document.getElementById('inviteButton');
    const copyInviteLinkButton = document.getElementById('copyInviteLink');
    const inviteModalOverlay = document.getElementById('invite-modal-overlay');

    if (inviteFriendTask) {
        inviteFriendTask.addEventListener('click', openInviteModal);
    }

    if (inviteModalCloseButton) {
        inviteModalCloseButton.addEventListener('click', closeInviteModal);
    }

    if (inviteButton) {
        inviteButton.addEventListener('click', () => {
            shareInviteLink();
            closeInviteModal();
        });
    }

    if (copyInviteLinkButton) {
        copyInviteLinkButton.addEventListener('click', () => {
            copyInviteLink();
            // Don't close the modal after copying, just provide feedback
            copyInviteLinkButton.textContent = 'Copied';
            setTimeout(() => {
                copyInviteLinkButton.textContent = 'Copy Invite Link';
            }, 2000);
        });
    }

    if (inviteModalOverlay) {
        inviteModalOverlay.addEventListener('click', closeInviteModal);
    }

    // Function to check if the user was invited and reward both users
    function checkAndRewardInvite() {
        const urlParams = new URLSearchParams(window.location.search);
        const inviterId = urlParams.get('start');
        if (inviterId && inviterId !== user.id.toString()) {
            // Reward the inviter
            fetch(`https://251fecd466c10d.lhr.life/rewardinvite.php?inviter=${inviterId}&invited=${user.id}`, {
                method: 'GET'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Both users rewarded for invite');
                    // Update the current user's coins
                    window.gameUtils.coins += 1000;
                    updateProfile();
                    saveUserData();
                }
            })
            .catch(error => {
                console.error('Error rewarding invite:', error);
            });
        }
    }

    // Update the DOM with the new translation
    document.getElementById('invite-friends-to-earn').textContent = t.inviteFriendsToEarn;

    const profileIcon = document.getElementById('profile-icon');

    if (profileIcon) {
        profileIcon.addEventListener('click', function() {
            profileIcon.classList.toggle('active');
            setTimeout(() => {
                profileIcon.classList.remove('active');
            }, 300); // Remove the class after 300ms to simulate a click effect
        });
    }

    // Add this near the top of your file, after other variable declarations
    let dailyTapLimit = 8000;
    let dailyTapCount = 0;
    let lastTapResetDate = null;

    // Add this new function to update the tap progress
    function updateTapProgress() {
        const progressBar = document.getElementById('tap-progress-bar');
        const pigImage = document.getElementById('pig');

        if (!progressBar || !pigImage) return;

        const remainingTaps = dailyTapLimit - window.gameUtils.dailyTapCount;
        const progress = (remainingTaps / dailyTapLimit) * 100;

        // Update the width of the progress bar
        progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;

        // Update pig appearance based on remaining taps
        if (window.gameUtils.dailyTapCount >= dailyTapLimit) {
            pigImage.classList.add('grey');
        } else {
            pigImage.classList.remove('grey');
        }
    }

    // Call updateTapProgress after initializing the app
    function initializeApp() {
        console.log("Initializing app...");
        // Initialize all necessary components and update UI
        updateProfile();
        updateShopUI();
        updateTapProgress(); // Add this line
        checkForInvite();
        updateTicketNotification(); // Add this line

        // Hide loading screen and show the app
        console.log("App initialized, hiding loading screen...");
        hideLoadingScreen();
    }

    // Update the translations application
    document.getElementById('fortnite-shop').textContent = t.fortniteShop;

    // Add these helper functions to update the UI
    function updateBalanceDisplay() {
        const balanceContainer = document.getElementById('balance-container');
        if (balanceContainer) {
            balanceContainer.innerHTML = `
                <div class="balance-wrapper">
                    <div class="balance-item">
                        <img src="img/ton.webp" alt="TON" class="balance-icon">
                        <span>${window.gameUtils.tonBalance.toFixed(2)} TON</span>
                    </div>
                    <div class="balance-item">
                        <img src="img/tgstar.webp" alt="Stars" class="balance-icon">
                        <span>${window.gameUtils.starsBalance} Stars</span>
                    </div>
                </div>
            `;
        }
    }

    function updateTicketsDisplay() {
        const ticketsContainer = document.getElementById('tickets-container');
        if (ticketsContainer) {
            ticketsContainer.innerHTML = `
                <span>Your Tickets:</span>
                <span class="ticket-count">${window.gameUtils.tickets}</span>
                <img src="img/ticket.webp" alt="Ticket">
            `;
        }
        updateTicketNotification(); // Add this line
    }

    // Add this near the other task event listeners
    const watchAdTask = document.getElementById('watch-ad-task');
    if (watchAdTask) {
        watchAdTask.addEventListener('click', () => {
            // Show the ad using AdsGram
            AdController.show().then((result) => {
                if (result.done) {
                    // Add coins when user completes watching the ad
                    addCoins(2000);
                    watchAdTask.classList.add('completed');
                    
                    // Show success message
                    window.Telegram.WebApp.showPopup({
                        title: 'Reward Received!',
                        message: 'You earned 2000 OINK for watching the video!',
                        buttons: [{
                            type: 'ok'
                        }]
                    });

                    // Haptic feedback
                    if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    }

                    saveUserData(); // Save the updated coin balance
                }
            }).catch((result) => {
                console.error('Ad error:', result);
                window.Telegram.WebApp.showPopup({
                    title: 'Error',
                    message: result.error ? 
                        'There was an error playing the video. Please try again later.' : 
                        'Video was skipped. Watch the full video to earn rewards.',
                    buttons: [{
                        type: 'ok'
                    }]
                });
            });
        });
    }

    // Update the translation application
    document.getElementById('watch-ad-title').textContent = t.watchAdTitle;

    // Replace the TON payments initialization with this:
    if (!window.tonPaymentsInitialized) {
        window.tonPaymentsInitialized = true;
        window.tonPayments.init().catch(console.error);
    }

    // Add event listener for TON payment task
    const tonPaymentTask = document.getElementById('ton-payment-task');
    if (tonPaymentTask) {
        tonPaymentTask.addEventListener('click', async () => {
            try {
                if (!window.tonPayments.isWalletConnected()) {
                    await window.tonPayments.connectWallet();
                }

                // Check if wallet is blocked before proceeding
                const currentWallet = window.TonConnection.ui.wallet.account.address;
                if (window.tonPayments.BLOCKED_WALLETS.includes(currentWallet)) {
                    window.Telegram.WebApp.showPopup({
                        title: 'Error',
                        message: 'This wallet has been blocked due to suspicious activity.',
                        buttons: [{
                            type: 'ok'
                        }]
                    });
                    return;
                }

                const result = await window.tonPayments.sendTransaction(0.3); // Changed from 0.4 to 0.3
                
                if (result) {
                    // Add OINK coins
                    addCoins(20000);
                    
                    // Add tickets
                    window.gameUtils.tickets += 10;
                    updateTicketsDisplay();
                    updateTicketNotification();
                    
                    // Mark task as completed
                    tonPaymentTask.classList.add('completed');
                    
                    // Show success message with both rewards
                    window.Telegram.WebApp.showPopup({
                        title: 'Success!',
                        message: t.tonPaymentSuccess,
                        buttons: [{
                            type: 'ok'
                        }]
                    });

                    // Haptic feedback
                    if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    }

                    // Save both coins and tickets
                    saveUserData();
                }
            } catch (error) {
                console.error('Payment error:', error);
                let errorMessage = t.tonPaymentError;
                
                // Custom error message for blocked wallets
                if (error.message === 'This wallet has been blocked') {
                    errorMessage = 'This wallet has been blocked due to suspicious activity.';
                }
                
                window.Telegram.WebApp.showPopup({
                    title: 'Error',
                    message: errorMessage,
                    buttons: [{
                        type: 'ok'
                    }]
                });
            }
        });
    }

    // Update translation
    document.getElementById('ton-payment-title').textContent = t.tonPaymentTitle;

    // Add this function to create and update the notification badge
    function updateTicketNotification() {
        const gamesTabButton = document.getElementById('gamesTabButton');
        let badge = gamesTabButton.querySelector('.notification-badge');
        
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'notification-badge';
            gamesTabButton.appendChild(badge);
        }
        
        if (window.gameUtils.tickets > 0) {
            badge.textContent = window.gameUtils.tickets;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }

    // Expose the function globally
    window.updateTicketNotification = updateTicketNotification;

    // Update task titles
    document.querySelector('#invite-friend-task .task-title').textContent = t.inviteAFriend;
    document.querySelector('#publish-story-task .task-title').textContent = t.publishStory;

    // Add event listener for when user exits
    window.addEventListener('beforeunload', () => {
        window.gameUtils.saveSessionData();
    });

    // Add this to the Telegram WebApp events
    window.Telegram.WebApp.onEvent('viewportChanged', () => {
        if (!window.Telegram.WebApp.isExpanded) {
            window.gameUtils.saveSessionData();
        }
    });

    function checkForSuspiciousChanges(lastSession, currentData) {
        const maxAllowedChanges = {
            coins: 10000,
            tickets: 10,
            ton_balance: 1.0,
            stars_balance: 100
        };

        for (const [field, maxChange] of Object.entries(maxAllowedChanges)) {
            const change = Math.abs(currentData[field] - lastSession[field]);
            if (change > maxChange) {
                console.warn(`Suspicious change detected in ${field}: ${change}`);
                return true;
            }
        }
        return false;
    }

    // Add these event listeners at the end of DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        // ... existing code ...

        // Add visibility change listener
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log('App hidden, saving session...');
                window.gameUtils.saveSessionData();
            }
        });

        // Add Telegram specific events
        window.Telegram.WebApp.onEvent('viewportChanged', () => {
            if (!window.Telegram.WebApp.isExpanded) {
                console.log('App minimized, saving session...');
                window.gameUtils.saveSessionData();
            }
        });

        // Add beforeunload event
        window.addEventListener('beforeunload', () => {
            console.log('App closing, saving session...');
            window.gameUtils.saveSessionData();

            // Force the request to complete before unloading
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://251fecd466c10d.lhr.life/session.php', false); // Synchronous request
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                user_id: window.gameUtils.userId,
                session_data: {
                    coins: window.gameUtils.coins,
                    tickets: window.gameUtils.tickets,
                    ton_balance: window.gameUtils.tonBalance,
                    stars_balance: window.gameUtils.starsBalance,
                    daily_tap_count: window.gameUtils.dailyTapCount,
                    last_tap_reset_date: window.gameUtils.lastTapResetDate,
                    last_reward_date: window.gameUtils.user?.last_reward_date,
                    current_gradient: window.gameUtils.currentGradient,
                    current_coin: window.gameUtils.currentCoin,
                    current_emblem: window.gameUtils.currentEmblem,
                    timestamp: new Date().toISOString()
                }
            }));
        });

        // Add back button handler
        window.Telegram.WebApp.BackButton.onClick(() => {
            console.log('Back button pressed, saving session...');
            window.gameUtils.saveSessionData();
        });

        // Add main button handler
        window.Telegram.WebApp.MainButton.onClick(() => {
            console.log('Main button pressed, saving session...');
            window.gameUtils.saveSessionData();
        });

        // Save session periodically (every 5 minutes)
        setInterval(() => {
            console.log('Periodic session save...');
            window.gameUtils.saveSessionData();
        }, 300000); // 5 minutes
    });
});