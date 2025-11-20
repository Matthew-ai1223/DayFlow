// --- State Management ---
let activities = JSON.parse(localStorage.getItem('dayflow_activities')) || [];
let currentAttachment = null; // { type: 'image' | 'link', data: string }
let deferredPrompt = null; // For PWA install prompt
let swRegistration = null; // Service worker registration

// --- DOM Elements ---
const activityText = document.getElementById('activity-text');
const saveBtn = document.getElementById('save-btn');
const activityList = document.getElementById('activity-list');
const dateDisplay = document.getElementById('date-display');
const themeToggle = document.getElementById('theme-toggle');
const notifyBtn = document.getElementById('notify-btn');
const imageUpload = document.getElementById('image-upload');
const linkBtn = document.getElementById('link-btn');
const linkInputContainer = document.getElementById('link-input-container');
const linkInput = document.getElementById('link-input');
const attachmentPreview = document.getElementById('attachment-preview');
const clearAllBtn = document.getElementById('clear-all-btn');
const installBtn = document.getElementById('install-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderActivities();
    updateDate();
    checkNotificationPermission();

    // Load saved theme
    const savedTheme = localStorage.getItem('dayflow_theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }

    // Register Service Worker with better handling
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker Registered');
                swRegistration = reg;

                // Check for updates every 30 minutes
                setInterval(() => {
                    reg.update();
                }, 1800000);

                // Request periodic sync for daily reminders (if supported)
                if ('periodicSync' in reg) {
                    reg.periodicSync.register('daily-reminder', {
                        minInterval: 24 * 60 * 60 * 1000 // 24 hours
                    }).catch(err => console.log('Periodic Sync not supported:', err));
                }
            })
            .catch(err => console.error('Service Worker Error', err));
    }

    // Handle PWA install prompt
    setupPWAInstall();

    // Schedule daily notifications
    scheduleDailyReminders();
});

// --- Event Listeners ---

// Theme Toggle
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('dayflow_theme', newTheme);
});

// Notification Request
notifyBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
        alert('This browser does not support desktop notifications');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Show welcome notification
            new Notification('DayFlow Notifications Enabled! 🎉', {
                body: 'You\'ll receive daily reminders to log your activities.',
                icon: './icon-192.png',
                badge: './icon-192.png',
                vibrate: [200, 100, 200]
            });

            notifyBtn.style.display = 'none';

            // Schedule daily reminders
            scheduleDailyReminders();

            // Subscribe to push notifications if available
            if (swRegistration && swRegistration.pushManager) {
                subscribeToPush();
            }
        }
    } catch (err) {
        console.error('Notification permission error:', err);
    }
});

// Image Upload
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setAttachment('image', event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// Link Toggle
linkBtn.addEventListener('click', () => {
    linkInputContainer.classList.toggle('hidden');
    if (!linkInputContainer.classList.contains('hidden')) {
        linkInput.focus();
    }
});

linkInput.addEventListener('change', () => {
    if (linkInput.value) {
        setAttachment('link', linkInput.value);
        linkInput.value = '';
        linkInputContainer.classList.add('hidden');
    }
});

// Save Activity
saveBtn.addEventListener('click', saveActivity);

// Clear All Activities
clearAllBtn.addEventListener('click', clearAllActivities);

// --- Functions ---

function updateDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
}

function checkNotificationPermission() {
    if (Notification.permission === 'granted') {
        notifyBtn.style.display = 'none';
    }
}

function setAttachment(type, data) {
    currentAttachment = { type, data };
    renderPreview();
}

function clearAttachment() {
    currentAttachment = null;
    renderPreview();
    imageUpload.value = ''; // Reset file input
}

function renderPreview() {
    attachmentPreview.innerHTML = '';
    if (!currentAttachment) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';

    if (currentAttachment.type === 'image') {
        const img = document.createElement('img');
        img.src = currentAttachment.data;
        wrapper.appendChild(img);
    } else if (currentAttachment.type === 'link') {
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.background = 'rgba(255,255,255,0.1)';
        wrapper.innerHTML = '<i class="fa-solid fa-link"></i>';
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeBtn.onclick = clearAttachment;

    wrapper.appendChild(removeBtn);
    attachmentPreview.appendChild(wrapper);
}

function saveActivity() {
    const text = activityText.value.trim();

    if (!text && !currentAttachment) {
        alert('Please enter some text or add an attachment.');
        return;
    }

    const newActivity = {
        id: Date.now(),
        text: text,
        timestamp: new Date().toISOString(),
        attachment: currentAttachment,
        isFavorite: false
    };

    activities.unshift(newActivity);
    localStorage.setItem('dayflow_activities', JSON.stringify(activities));

    // Reset Input
    activityText.value = '';
    clearAttachment();

    renderActivities();

    // Trigger a small vibration if supported for feedback
    if (navigator.vibrate) navigator.vibrate(50);
}

function toggleFavorite(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        activity.isFavorite = !activity.isFavorite;
        localStorage.setItem('dayflow_activities', JSON.stringify(activities));
        renderActivities();

        if (navigator.vibrate) navigator.vibrate(20);
    }
}

function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        activities = activities.filter(a => a.id !== id);
        localStorage.setItem('dayflow_activities', JSON.stringify(activities));
        renderActivities();

        if (navigator.vibrate) navigator.vibrate(50);
    }
}

function clearAllActivities() {
    if (confirm('Are you sure you want to clear all activities? This cannot be undone!')) {
        activities = [];
        localStorage.setItem('dayflow_activities', JSON.stringify(activities));
        renderActivities();

        if (navigator.vibrate) navigator.vibrate(100);
    }
}

function renderActivities() {
    activityList.innerHTML = '';

    // Filter: Show only Today and Yesterday OR Favorites
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let visibleActivities = activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        // Show if it's a favorite OR if it's within the last 2 days
        return activity.isFavorite || activityDate.getTime() >= yesterday.getTime();
    });

    // Sort: Favorites first, then by Date (newest first)
    visibleActivities.sort((a, b) => {
        if (a.isFavorite === b.isFavorite) {
            // If both are favorites or both are not, sort by date (newest first)
            return new Date(b.timestamp) - new Date(a.timestamp);
        }
        // If one is favorite and the other isn't, favorite comes first
        return a.isFavorite ? -1 : 1;
    });

    if (visibleActivities.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clipboard-list"></i>
                <p>No activities in the last 2 days. Start logging!</p>
            </div>
        `;
        return;
    }

    visibleActivities.forEach(activity => {
        const card = document.createElement('div');
        card.className = 'activity-card';

        const time = new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateObj = new Date(activity.timestamp);

        // Smart date label (Today, Yesterday, or Date)
        let dateLabel = dateObj.toLocaleDateString();
        if (dateObj.setHours(0, 0, 0, 0) === today.getTime()) {
            dateLabel = 'Today';
        } else if (dateObj.setHours(0, 0, 0, 0) === yesterday.getTime()) {
            dateLabel = 'Yesterday';
        }

        let mediaHtml = '';
        if (activity.attachment) {
            if (activity.attachment.type === 'image') {
                mediaHtml = `<div class="activity-media"><img src="${activity.attachment.data}" alt="Activity Image"></div>`;
            } else if (activity.attachment.type === 'link') {
                mediaHtml = `<a href="${activity.attachment.data}" target="_blank" class="activity-link"><i class="fa-solid fa-link"></i> ${activity.attachment.data}</a>`;
            }
        }

        const favClass = activity.isFavorite ? 'active' : '';
        const favIconClass = activity.isFavorite ? 'fa-solid' : 'fa-regular';

        card.innerHTML = `
            <div class="card-header">
                <span class="activity-time">${dateLabel} • ${time}</span>
                <div class="activity-actions">
                    <button class="favorite-btn ${favClass}" onclick="toggleFavorite(${activity.id})" aria-label="Toggle Favorite">
                        <i class="${favIconClass} fa-star"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteActivity(${activity.id})" aria-label="Delete Activity">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="activity-content">${linkify(activity.text)}</div>
            ${mediaHtml}
        `;

        activityList.appendChild(card);
    });
}

// Helper to make URLs clickable in text
function linkify(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" style="color:var(--accent-color)">${url}</a>`);
}

// --- PWA Install Prompt ---
function setupPWAInstall() {
    // Capture the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the default prompt
        e.preventDefault();
        // Store the event for later use
        deferredPrompt = e;

        // Show install button
        console.log('PWA Install prompt available');
        showInstallPromotion();
    });

    // Listen for the app installed event
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully!');
        deferredPrompt = null;

        // Hide install button
        if (installBtn) {
            installBtn.classList.add('hidden');
        }

        // Show a thank you notification
        if (Notification.permission === 'granted') {
            new Notification('Welcome to DayFlow! 🎉', {
                body: 'App installed successfully! Start logging your activities.',
                icon: './icon-192.png',
                badge: './icon-192.png'
            });
        }
    });
}

function showInstallPromotion() {
    // Show the install button
    if (installBtn) {
        installBtn.classList.remove('hidden');
        console.log('Install button shown');
    }
}

async function installPWA() {
    if (!deferredPrompt) {
        console.log('No install prompt available');
        return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Hide the install button
    if (installBtn && outcome === 'accepted') {
        installBtn.classList.add('hidden');
    }

    // Clear the deferred prompt
    deferredPrompt = null;
}

// Install button click handler
if (installBtn) {
    installBtn.addEventListener('click', installPWA);
}

// --- Push Notifications ---
async function subscribeToPush() {
    if (!swRegistration || !swRegistration.pushManager) {
        console.log('Push notifications not supported');
        return;
    }

    try {
        // Check if already subscribed
        let subscription = await swRegistration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe to push notifications
            subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    // This is a placeholder VAPID public key
                    // In production, generate your own VAPID keys
                    'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8brD2ZmFJ6z9Hqpg-aKW6w_6W6dDn8xZCR7-8LMGlJPYTiJJAk8dJo'
                )
            });

            console.log('Push subscription successful:', subscription);

            // Send subscription to your server (if you have one)
            // await sendSubscriptionToServer(subscription);
        }
    } catch (err) {
        console.error('Failed to subscribe to push notifications:', err);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// --- Daily Notification Reminders ---
function scheduleDailyReminders() {
    // Check if notifications are enabled
    if (Notification.permission !== 'granted') {
        return;
    }

    // Clear existing reminders
    const existingReminders = localStorage.getItem('dayflow_reminders');
    if (existingReminders) {
        const reminders = JSON.parse(existingReminders);
        reminders.forEach(id => clearTimeout(id));
    }

    // Schedule reminders at specific times
    const reminderTimes = [
        { hour: 12, minute: 0, message: 'Lunchtime check-in! 🍽️ Log your morning activities.' },
        { hour: 18, minute: 0, message: 'Evening reminder! 🌅 How was your day?' },
        { hour: 21, minute: 0, message: 'End of day! 🌙 Don\'t forget to log your achievements.' }
    ];

    const scheduledIds = [];

    reminderTimes.forEach(({ hour, minute, message }) => {
        const timerId = scheduleNotificationAt(hour, minute, message);
        if (timerId) {
            scheduledIds.push(timerId);
        }
    });

    // Save scheduled reminder IDs
    localStorage.setItem('dayflow_reminders', JSON.stringify(scheduledIds));
}

function scheduleNotificationAt(hour, minute, message) {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime - now;

    // Schedule the notification
    const timerId = setTimeout(() => {
        showDailyReminder(message);
        // Reschedule for next day
        setTimeout(() => scheduleNotificationAt(hour, minute, message), 24 * 60 * 60 * 1000);
    }, timeUntilNotification);

    return timerId;
}

function showDailyReminder(message) {
    if (Notification.permission === 'granted') {
        new Notification('DayFlow Reminder', {
            body: message,
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [200, 100, 200, 100, 200],
            tag: 'daily-reminder',
            requireInteraction: false,
            actions: [
                { action: 'open', title: 'Log Now' },
                { action: 'dismiss', title: 'Later' }
            ]
        });
    }
}

// Listen for notification clicks from service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
            // Focus on the activity input
            const activityTextInput = document.getElementById('activity-text');
            if (activityTextInput) {
                activityTextInput.focus();
            }
        }
    });
}
