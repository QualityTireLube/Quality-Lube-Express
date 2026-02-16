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
        // Wait for Firebase to be initialized
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
           console.log("Waiting for Firebase..."); 
           setTimeout(trackPageView, 500);
           return;
        }

        try {
            const db = firebase.firestore();
            let path = window.location.pathname;
            
            // Exclude Admin Dashboard from analytics
            if (path.includes('/admin/') || path.includes('dashboard.html')) {
                console.log("Analytics: Admin dashboard skipped.");
                return;
            }

            if (path.endsWith('/') || path === '') path += 'index.html';
            
            // 1. Page Stats (Aggregate)
            // Clean ID generation to handle folders
            const cleanPath = path.replace(/^\//, '').replace(/\.html$/, '').replace(/\//g, '_');
            const docId = cleanPath || 'home';
            
            await db.collection('page_stats').doc(docId).set({
                path: path,
                views: firebase.firestore.FieldValue.increment(1),
                last_updated: firebase.firestore.FieldValue.serverTimestamp(),
                title: document.title
            }, { merge: true });

            // 2. Session Tracking
            let sessionId = sessionStorage.getItem('analytics_session_id');
            if (!sessionId) {
                sessionId = generateUUID();
                sessionStorage.setItem('analytics_session_id', sessionId);
            }

            const sessionRef = db.collection('visitor_sessions').doc(sessionId);
            
            // Get IP data if not cached
            let ipData = {};
            if (!sessionStorage.getItem('analytics_session_init')) {
                // New session initialization (only run once per session)
                sessionStorage.setItem('analytics_session_init', 'true');
                
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
                } catch (e) { console.warn('IP fetch failed', e); }

                await sessionRef.set({
                    firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    deviceType: getDeviceType(),
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    screen: { width: window.screen.width, height: window.screen.height },
                    ip: ipData.ip || 'unknown',
                    city: ipData.city || 'unknown',
                    region: ipData.region || 'unknown',
                    country: ipData.country_name || 'unknown',
                    referrer: document.referrer || 'direct'
                }, { merge: true });
            }

            // Update Activity on Every Page View
            await sessionRef.set({
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                lastPath: path,
                visits: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
            
            console.log("Analytics verified: Logged view for " + path);
        } catch (e) {
            console.error("Analytics Error:", e);
        }
    }

    // Event Tracking (Calls, Directions)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.href;
        let type = null;
        
        if (href.includes('tel:')) type = 'call';
        else if (href.includes('maps.google') || href.includes('/maps')) type = 'directions';
        
        if (type) {
            // Log event
             if (typeof firebase !== 'undefined' && firebase.apps.length) {
                const db = firebase.firestore();
                db.collection('analytics_events').add({
                    type: type, // 'call' or 'directions'
                    url: href,
                    path: window.location.pathname,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    sessionId: sessionStorage.getItem('analytics_session_id') || 'unknown'
                }).catch(console.error);
                console.log(`Tracked ${type} event`);
             }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }
})();