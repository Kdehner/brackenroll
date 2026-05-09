import { onAuthChange, signOutUser, getUserProfile } from './firebase-init.js';

(function () {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const page = window.location.pathname.split('/').pop() || 'index.html';

    // ── Build structure ──────────────────────────────────────────────────────
    nav.innerHTML =
        '<div class="nav-left">' +
            '<a href="index.html" class="nav-logo">Brackenroll</a>' +
            '<ul class="nav-links">' +
                '<li><a href="index.html">Campaigns</a></li>' +
                '<li><a href="character-builder.html">Characters</a></li>' +
                '<li><a href="handbook.html">Handbook</a></li>' +
            '</ul>' +
        '</div>' +
        '<div class="nav-right" id="navRight">' +
            '<button class="nav-hamburger" aria-label="Toggle navigation" aria-expanded="false">' +
                '<span></span><span></span><span></span>' +
            '</button>' +
        '</div>';

    // Active link
    nav.querySelectorAll('.nav-links a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('nav-active');
    });

    // ── Hamburger ────────────────────────────────────────────────────────────
    const btn = nav.querySelector('.nav-hamburger');
    btn.addEventListener('click', () => {
        const open = nav.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
        });
    });
    document.addEventListener('click', e => {
        if (nav.classList.contains('nav-open') && !nav.contains(e.target)) {
            nav.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            nav.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
            closeDropdown();
        }
    });

    // ── Right side ───────────────────────────────────────────────────────────
    const navRight = document.getElementById('navRight');

    function renderSignedOut() {
        // Remove any existing user wrap
        const existing = navRight.querySelector('.nav-user-wrap, .nav-signin-link');
        if (existing) existing.remove();

        const link = document.createElement('a');
        link.href = 'index.html';
        link.className = 'nav-signin-link';
        link.textContent = 'Sign In';
        navRight.insertBefore(link, btn);
    }

    function renderSignedIn(displayName, avatarColor) {
        const existing = navRight.querySelector('.nav-user-wrap, .nav-signin-link');
        if (existing) existing.remove();

        const wrap = document.createElement('div');
        wrap.className = 'nav-user-wrap';

        const userBtn = document.createElement('button');
        userBtn.className = 'nav-user-btn';
        userBtn.innerHTML =
            `<span class="nav-avatar-dot" style="background:${avatarColor || 'var(--gold)'}"></span>` +
            `<span class="nav-user-name">${esc(displayName || 'Account')}</span>` +
            `<span class="nav-chevron">▾</span>`;

        const dropdown = document.createElement('div');
        dropdown.className = 'nav-dropdown';
        dropdown.innerHTML =
            '<a href="profile.html">Edit Profile</a>' +
            '<button id="navSignOut">Sign Out</button>';

        dropdown.querySelector('#navSignOut').addEventListener('click', async () => {
            await signOutUser();
            window.location.href = 'index.html';
        });

        userBtn.addEventListener('click', e => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('open');
            userBtn.classList.toggle('open', open);
        });

        document.addEventListener('click', () => closeDropdown());

        wrap.append(userBtn, dropdown);
        navRight.insertBefore(wrap, btn);
    }

    function closeDropdown() {
        const wrap = navRight.querySelector('.nav-user-wrap');
        if (!wrap) return;
        wrap.querySelector('.nav-dropdown')?.classList.remove('open');
        wrap.querySelector('.nav-user-btn')?.classList.remove('open');
    }

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Auth state ───────────────────────────────────────────────────────────
    renderSignedOut(); // default until auth resolves

    onAuthChange(async (user) => {
        if (!user) {
            renderSignedOut();
            return;
        }
        const profile = await getUserProfile(user.uid);
        const displayName = profile?.displayName || user.displayName || user.email || 'Account';
        const avatarColor = profile?.avatarColor || '';
        renderSignedIn(displayName, avatarColor);
    });
}());
