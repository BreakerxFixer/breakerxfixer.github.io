/**
 * Muestra la barra de dirección en / sin rutas tipo /writeups.html.
 * Rutas permitidas fijas (lista blanca) — sin parámetros de usuario → sin LFI por path.
 */
(function () {
    'use strict';

    var ALLOW = {
        '/writeups.html': 1,
        '/ctf.html': 1,
        '/learn.html': 1,
        '/aboutus.html': 1,
        '/leaderboard.html': 1,
        '/terminal.html': 1,
        '/contests.html': 1,
        '/admin.html': 1,
        '/privacy.html': 1,
        '/contest-leaderboard.html': 1,
        '/writeup-community.html': 1,
    };

    var p = location.pathname;
    if (p === '/index.html') {
        try {
            history.replaceState({ bxf: 1 }, '', '/');
        } catch (e) {}
        p = '/';
    }
    var home = p === '/';

    if (home) {
        var nav = performance.getEntriesByType('navigation')[0];
        var reload = nav && nav.type === 'reload';
        if (reload) {
            var saved = sessionStorage.getItem('bxf_active_doc');
            if (saved && ALLOW[saved.split('?')[0]]) {
                location.replace(saved);
                return;
            }
        }
        sessionStorage.removeItem('bxf_active_doc');
        return;
    }

    if (ALLOW[p]) {
        sessionStorage.setItem('bxf_active_doc', p + location.search);
        try {
            history.replaceState({ bxf: 1 }, '', '/');
        } catch (e) {}
    }
})();
