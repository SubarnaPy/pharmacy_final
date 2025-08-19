/**
 * Notification Sound Service
 * Manages audio notifications and sound preferences
 */

class NotificationSoundService {
    constructor() {
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.5;
        this.loadSounds();
    }

    /**
     * Load notification sounds
     */
    loadSounds() {
        const soundFiles = {
            default: '/sounds/notification-default.mp3',
            critical: '/sounds/notification-critical.mp3',
            high: '/sounds/notification-high.mp3',
            success: '/sounds/notification-success.mp3',
            error: '/sounds/notification-error.mp3',
            message: '/sounds/notification-message.mp3'
        };

        Object.entries(soundFiles).forEach(([key, src]) => {
            try {
                const audio = new Audio(src);
                audio.preload = 'auto';
                audio.volume = this.volume;
                this.sounds.set(key, audio);
            } catch (error) {
                console.warn(`Failed to load sound: ${key}`, error);
                // Create a silent fallback
                this.sounds.set(key, { play: () => Promise.resolve() });
            }
        });
    }

    /**
     * Play notification sound based on type and priority
     */
    async playNotificationSound(notification) {
        if (!this.enabled) return;

        try {
            let soundKey = 'default';

            // Determine sound based on priority
            if (notification.priority === 'critical') {
                soundKey = 'critical';
            } else if (notification.priority === 'high') {
                soundKey = 'high';
            } else if (notification.type === 'order_delivered' || notification.type === 'prescription_ready') {
                soundKey = 'success';
            } else if (notification.type === 'system_error' || notification.type === 'payment_failed') {
                soundKey = 'error';
            } else if (notification.type === 'message' || notification.type === 'chat') {
                soundKey = 'message';
            }

            const sound = this.sounds.get(soundKey) || this.sounds.get('default');

            if (sound && sound.play) {
                // Reset audio to beginning
                sound.currentTime = 0;
                await sound.play();
            }
        } catch (error) {
            // Audio play failed (likely due to browser autoplay policy)
            console.log('Could not play notification sound:', error.message);
        }
    }

    /**
     * Enable/disable notification sounds
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('notificationSoundsEnabled', enabled.toString());
    }

    /**
     * Check if sounds are enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Set volume level (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('notificationSoundVolume', this.volume.toString());

        // Update volume for all loaded sounds
        this.sounds.forEach(sound => {
            if (sound.volume !== undefined) {
                sound.volume = this.volume;
            }
        });
    }

    /**
     * Get current volume level
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const enabled = localStorage.getItem('notificationSoundsEnabled');
            if (enabled !== null) {
                this.enabled = enabled === 'true';
            }

            const volume = localStorage.getItem('notificationSoundVolume');
            if (volume !== null) {
                this.setVolume(parseFloat(volume));
            }
        } catch (error) {
            console.warn('Failed to load notification sound settings:', error);
        }
    }

    /**
     * Test a specific sound
     */
    async testSound(soundKey = 'default') {
        if (!this.enabled) return;

        try {
            const sound = this.sounds.get(soundKey);
            if (sound && sound.play) {
                sound.currentTime = 0;
                await sound.play();
            }
        } catch (error) {
            console.warn(`Failed to test sound: ${soundKey}`, error);
        }
    }

    /**
     * Get available sound types
     */
    getAvailableSounds() {
        return Array.from(this.sounds.keys());
    }

    /**
     * Check if browser supports audio
     */
    isAudioSupported() {
        return typeof Audio !== 'undefined';
    }

    /**
     * Request audio permissions (for browsers that require it)
     */
    async requestAudioPermissions() {
        if (!this.isAudioSupported()) return false;

        try {
            // Try to play a silent audio to unlock audio context
            const silentAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            silentAudio.volume = 0;
            await silentAudio.play();
            return true;
        } catch (error) {
            console.log('Audio permissions not granted or not needed');
            return false;
        }
    }

    /**
     * Initialize the service
     */
    async init() {
        this.loadSettings();
        await this.requestAudioPermissions();
        console.log('🔊 Notification Sound Service initialized');
    }

    /**
     * Cleanup service
     */
    destroy() {
        this.sounds.clear();
        console.log('🔊 Notification Sound Service destroyed');
    }
}

// Create singleton instance
const notificationSoundService = new NotificationSoundService();

export default notificationSoundService;