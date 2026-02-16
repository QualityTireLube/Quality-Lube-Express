// Analytics Tracking Script
(function() {
    'use strict';

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return "tablet";
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)os|Opera M(obi|ini)/.test(ua)) {
            return "mobile";
        }
        return "desktop";
    }

    async function trackPageView() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
           setTimeout(trackPageView, 500);
           return;
        }

        const db = firebase.firestore();
        let path = window.location.pathname;
        if (path.endsWith('/') || path === '') path += 'index.html';
        
        // 1. Page Stats (Aggregate)
        const docId = path.split('/').pop().replace(/\.html$/, '') || 'home';
        db.collection('page_stats').doc(docId).set({
            path: path,
            views: firebase.firestore.FieldValue.increment(1),
            last_updated: firebase.firestore.FieldValue.serverTimestamp(),
            title: document.title
        }, { merge: true }).catch(e => console.error("Stats error", e));

        // 2. Session Tracking (Individual)
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = generateUUID();
            sessionStorage.setItem('analytics_session_id', sessionId);
        }

        const sessionRef = db.collection('visitor_sessions').doc(sessionId);
        
        // Get IP data if not cached
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
        } catch (e) { console.warn('IP fetch failed'); }

        // Update Session
        sessionRef.set({
            lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
            deviceType: getDeviceType(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: { width: window.screen.width, height: window.screen.height },
            ip: ipData.ip || 'unknown',
            city: ipData.city || 'unknown',
            region: ipData.region || 'unknown',
            country: ipData.country_name || 'unknown',
            lastPath: path,
            visits: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }
})();