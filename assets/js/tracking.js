// Analytics Tracking Script
(function() {
    'use strict';

    // Helper: Generate UUID for Session
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Main Tracking Function
    async function trackPageView() {
        // Wait for Firebase to load
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
           console.warn('Firebase not loaded yet, retrying tracking...');
           setTimeout(trackPageView, 500);
           return;
        }

        const db = firebase.firestore();
        
        let path = window.location.pathname;
        // Fix path consistency
        if (path.endsWith('/')) path += 'index.html';
        
        // Create a document ID that is safe
        const docId = path.split('/').pop().replace(/\.html$/, '') || 'home';
        
        // Session Management
        let sessionId = sessionStorage.getItem('analytics_session_id');
        let isNewSession = false;
        if (!sessionId) {
            sessionId = generateUUID();
            sessionStorage.setItem('analytics_session_id', sessionId);
            isNewSession = true;
        }

        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // 1. Increment Page View Counter
        const statsRef = db.collection('page_stats').doc(docId);
        
        try {
            await statsRef.set({
                path: path,
                views: firebase.firestore.FieldValue.increment(1),
                last_updated: timestamp,
                title: document.title
            }, { merge: true });
        } catch (e) {
            console.error('Error tracking view:', e);
        }

        // 2. Track Session Start
        if (isNewSession) {
             let ipData = {};
             try {
                const cachedIP = localStorage.getItem('analytics_ip_data');
                if (cachedIP) {
                    ipData = JSON.parse(cachedIP);
                } else {
                    const res = await fetch('https://ipapi.co/json/');
                    if (res.ok) {
                        ipData = await res.json();
                        localStorage.setItem('analytics_ip_data', JSON.stringify(ipData));
                    }
                }
             } catch (e) {
                 console.warn('IP fetch failed', e);
             }

             const analyticsData = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height
                },
                ip: ipData.ip || 'unknown',
                city: ipData.city || 'unknown',
                region: ipData.region || 'unknown',
                country: ipData.country_name || 'unknown',
                session_start: timestamp
             };

             db.collection('visitor_sessions').add(analyticsData);
        }
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }
})();