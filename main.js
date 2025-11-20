// --- State Management ---
let activities = JSON.parse(localStorage.getItem('dayflow_activities')) || [];
let currentAttachment = null; // { type: 'image' | 'link', data: string }

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

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.error('Service Worker Error', err));
    }
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
notifyBtn.addEventListener('click', () => {
    if (!('Notification' in window)) {
        alert('This browser does not support desktop notifications');
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            new Notification('DayFlow', {
                body: 'Notifications enabled! We will remind you to log your day.',
                icon: 'https://via.placeholder.com/192x192.png?text=Icon'
            });
            notifyBtn.style.display = 'none';
        }
    });
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
                <button class="favorite-btn ${favClass}" onclick="toggleFavorite(${activity.id})" aria-label="Toggle Favorite">
                    <i class="${favIconClass} fa-star"></i>
                </button>
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
