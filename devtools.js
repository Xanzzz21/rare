// Add this at the very beginning of the file, before any other code
(function preventDevTools() {
    // Disable right-click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', function(e) {
        if (
            // F12
            e.key === 'F12' ||
            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            (e.ctrlKey && (
                (e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
                (e.key === 'u' || e.key === 'U')
            ))
        ) {
            e.preventDefault();
        }
    });

    // Detect if DevTools is open
    const devtools = {
        isOpen: false,
        orientation: undefined
    };

    const threshold = 160;

    // Function to check DevTools state
    const checkDevTools = ({emitEvent = true} = {}) => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const orientation = widthThreshold ? 'vertical' : 'horizontal';

        if (
            !(heightThreshold && widthThreshold) &&
            ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)
        ) {
            if ((!devtools.isOpen || devtools.orientation !== orientation) && emitEvent) {
                window.dispatchEvent(new CustomEvent('devtoolschange', {
                    detail: {
                        isOpen: true,
                        orientation
                    }
                }));
            }
            devtools.isOpen = true;
            devtools.orientation = orientation;
        } else {
            if (devtools.isOpen && emitEvent) {
                window.dispatchEvent(new CustomEvent('devtoolschange', {
                    detail: {
                        isOpen: false,
                        orientation: undefined
                    }
                }));
            }
            devtools.isOpen = false;
            devtools.orientation = undefined;
        }
    };

    // Check on page load
    checkDevTools({emitEvent: false});

    // Recheck on resize
    window.addEventListener('resize', checkDevTools);

    // Handle DevTools state change
    window.addEventListener('devtoolschange', function(e) {
        if (e.detail.isOpen) {
            // If DevTools is opened, redirect or close the app
            window.Telegram.WebApp.showPopup({
                title: 'Security Alert',
                message: 'Developer tools are not allowed.',
                buttons: [{
                    type: 'close'
                }]
            });
            
            setTimeout(() => {
                window.Telegram.WebApp.close();
            }, 1000);
        }
    });

    // Additional protection against console
    const consoleOutput = console.log;
    const consoleError = console.error;
    const consoleWarn = console.warn;
    const consoleDebug = console.debug;
    const consoleInfo = console.info;

    // Override console methods
    console.log = function() {};
    console.error = function() {};
    console.warn = function() {};
    console.debug = function() {};
    console.info = function() {};

    // Prevent debugging
    setInterval(() => {
        checkDevTools();
        
        // Additional check for debugger
        const startTime = new Date();
        debugger;
        const endTime = new Date();
        if (endTime - startTime > 100) {
            window.Telegram.WebApp.close();
        }
    }, 1000);

    // Prevent source map access
    window.addEventListener('devtoolschange', function(e) {
        if (e.detail.isOpen) {
            document.documentElement.innerHTML = '';
        }
    });

    // Additional mobile-specific protections
    function preventSelection() {
        document.documentElement.style.webkitUserSelect = 'none';
        document.documentElement.style.userSelect = 'none';
        document.documentElement.style.webkitTouchCallout = 'none';
    }

    // Prevent view source on mobile
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, { passive: false });

    // Prevent text selection and hold-to-copy
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevent touch hold events
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent pinch zoom
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Detect and block Eruda (popular mobile console)
    function blockEruda() {
        if (window.__ERUDA_TIMING__) {
            window.Telegram.WebApp.close();
        }
    }

    // Check for various mobile debug tools
    function checkDebugTools() {
        const knownDebugTools = [
            '__ERUDA_TIMING__',
            'eruda',
            'VConsole',
            'vconsole',
            '__VCONSOLE_VERSION__',
            'debugConfig',
            'weinre'
        ];

        for (const tool of knownDebugTools) {
            if (window[tool]) {
                window.Telegram.WebApp.close();
                return true;
            }
        }
        return false;
    }

    // Additional check for source viewing attempts
    function checkSourceViewing() {
        if (
            window.outerHeight - window.innerHeight > 200 ||
            window.outerWidth - window.innerWidth > 200
        ) {
            window.Telegram.WebApp.close();
        }
    }

    // Run checks periodically
    setInterval(() => {
        blockEruda();
        checkDebugTools();
        checkSourceViewing();
        preventSelection();
    }, 1000);

    // Prevent page source viewing shortcuts
    document.addEventListener('keydown', function(e) {
        // Prevent common debugging shortcuts
        if (
            (e.ctrlKey && (
                e.key === 'u' || 
                e.key === 's' || 
                e.key === 'p' ||
                e.key === 'g' ||
                e.key === 'j' ||
                e.key === 'i'
            )) ||
            (e.metaKey && (
                e.key === 'u' ||
                e.key === 's' ||
                e.key === 'p' ||
                e.key === 'g' ||
                e.key === 'j' ||
                e.key === 'i'
            )) ||
            e.key === 'F12'
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Disable eval
    window.eval = function() {
        throw new Error('Eval is disabled');
    };

    // Override and disable console methods more aggressively
    ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 
     'groupCollapsed', 'groupEnd', 'clear', 'count', 'countReset', 'assert', 'profile', 
     'profileEnd', 'time', 'timeLog', 'timeEnd', 'timeStamp', 'context', 'memory'].forEach(function(method) {
        console[method] = function() {};
    });
})();



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