// Centralized DOM selector registry.
// When a page is refactored and an ID changes, update it here — all tests pick it up.
// Mirrors docs/TESTING.md selector table.

module.exports = {

    // ── Auth (signin.html) ──────────────────────────────────────────────────
    AUTH: {
        emailInput:  '#signInEmail',
        passwordInput: '#signInPassword',
        signInBtn:   '#emailSignInBtn',
    },

    // ── Nav (nav.js — injected into every page) ─────────────────────────────
    NAV: {
        root:      '.site-nav',
        homeLink:  '.site-nav a[href="index.html"]',
    },

    // ── Index (index.html) ──────────────────────────────────────────────────
    INDEX: {
        hubContent:       '#hubContent',
        signinPrompt:     '#signinPrompt',
        createCampaignBtn: '#createCampaignBtn',
        campaignModal:    '#campaignModal',
        campaignNameInput: '#campaignNameInput',
        campaignModalSubmit: '#campaignModalSubmit',
        campaignModalCancel: '#campaignModalCancel',
        campaignModalError: '#campaignModalError',
    },

    // ── Campaign hub (campaign.html?id=) ────────────────────────────────────
    CAMPAIGN: {
        name:        '.campaign-name, h1, .camp-title',
        homebrewLink: 'a[href*="homebrew-browser"]',
        tableLink:   'a[href*="table"]',
        worldLink:   'a[href*="primer"]',
    },

    // ── Handbook (handbook.html) ────────────────────────────────────────────
    HANDBOOK: {
        tabBar:       '.tab-bar',
        tabBtns:      '.tab-btn',
        activeTab:    '.tab-btn.active',
        classesTabBtn: '.tab-btn:nth-child(2)', // "Classes"
        classGrid:    '#class-grid',
        classCards:   '#class-grid .click-card',
        domainsTabBtn: '.tab-btn:nth-child(5)', // "Domains"
        domainCards:   '#tab-domains .domain-card',
        modal:        '#modal-shared',
        modalContent: '#modal-content',
    },

    // ── Character Builder (character-builder.html) ──────────────────────────
    CHAR_BUILDER: {
        // Step 1 — Identity
        nameInput:    '#char-name',
        pronounsInput: '#char-pronouns',
        conceptInput: '#char-concept',
        // Navigation — active step only; each step has its own .btn-next/.btn-back
        nextBtn:      '#view-builder .step.active .btn-next',
        backBtn:      '#view-builder .step.active .btn-back',
        // Step 2 — Class
        classGrid:    '#class-grid',
        classCard:    '#class-grid [data-class]',
        // Step 3 — Subclass
        subclassGrid: '#subclass-grid',
        subclassCard: '#subclass-grid [data-sub]',
        // Step 4 — Ancestry
        ancestryGrid: '#ancestry-grid',
        ancestryCard: '#ancestry-grid [data-ancestry]',
        // Step 5 — Community
        communityGrid: '#community-grid',
        communityCard: '#community-grid [data-community]',
        // Step 6 — Traits (click chip then slot)
        traitChip:    '[data-chip]',
        traitSlot:    '[data-trait]',
        // Step 7 — Domain cards
        domainCardGrid: '.domain-card-grid',
        domainCard:   '.domain-card-grid .pick-card',
        // Step 8 — Experiences
        exp1:         '#exp-1',
        exp2:         '#exp-2',
        // Step 9 — Equipment
        weaponCard:   '[data-key="weapon"]',
        armorCard:    '[data-key="armor"]',
        // Step 10 — Inventory
        potionHealth: '#potion-health',
        potionStamina: '#potion-stamina',
        // Step 13 — Save
        saveBtn:      '#btn-save-char',
        // Step labels
        stepLabel:    '#step-label',
        errMsg:       '.error-msg',
        // Roster → Builder transition
        rosterView:   '#view-roster',
        builderView:  '#view-builder',
        newCharBtn:   '#btn-new-char',
        rosterList:   '#rosterList',
    },

    // ── Homebrew Browser (homebrew.html) ────────────────────────────────────
    HB_BROWSER: {
        typeTabs:     '.hb-type-btn',
        newBtn:       '#btnNew',
        searchInput:  '#hbSearch',
        importBtn:    '#btnImport',
        contentArea:  '#hbList',
        emptyState:   '.hb-empty',
    },

    // ── Homebrew Editor (homebrew-editor.html) ──────────────────────────────
    HB_EDITOR: {
        outer:        '#hbeOuter',
        title:        '#hbeTitle',
        typeBadge:    '#hbeTypeBadge',
        nameInput:    '#fName',
        descInput:    '#fPlayerDesc',
        notesInput:   '#fNotes',
        saveBtn:      '#btnSave',
        statusMsg:    '#statusMsg',
        changeNotes:  '#changeNotes',
        templateBtn:  '#tplTriggerBtn',
        templateSearch: '#tplSearch',
    },

    // ── Table (table.html) ──────────────────────────────────────────────────
    TABLE: {
        canvas:       '#tableCanvas, canvas',
        gmToolbar:    '#gmToolbar.visible',
        sceneLabel:   '#tableSceneLabel:not(.hidden)',
        sceneName:    '#tableSceneName',
        fearCount:    '#fearCount',
        // GM toolbar buttons
        btnScenes:    '#btnScenesPanel',
        btnTokens:    '#btnSpawnTokens',
        btnQuickToken: '#btnQuickToken',
        btnFear:      '#btnFearPanel',
        btnClocks:    '#btnClocksPanel',
        btnEncounter: '#btnEncounterPanel',
        btnFog:       '#btnFogPanel',
        // Scenes panel
        scenesPanel:  '#scenesPanel',
        sceneNameInput: '#sceneNameInput',
        sceneBgUrl:   '#sceneBgUrl',
        bgOptUrl:     '.bg-opt[data-bg="url"]',
        createSceneBtn: '#btnCreateScene',
        sceneList:    '#sceneList',
        sceneItem:    '#sceneList .scene-item',
        pushBtn:      '.scene-item-btn.push',
        // Quick token popover
        quickTokenPopover: '#quickTokenPopover',
        qtpLabel:     '#qtpLabel',
        qtpSwatches:  '#qtpSwatches .qtp-swatch',
        qtpAdd:       '#qtpAdd',
        // Tokens panel
        tokensPanel:  '#tokensPanel',
        tokensList:   '#tokensPanelList',
        tokenRow:     '#tokensPanelList .tp-row',
        tokenInScene: '#tokensPanelList .tp-in-scene',
        tokenAddBtn:  '#tokensPanelList .tp-add-btn',
        tokenDelBtn:  '#tokensPanelList .tp-del-btn',
        // Fear panel
        fearPanel:    '#fearPanel',
        fearPlus:     '#btnFearPlus',
        fearMinus:    '#btnFearMinus',
        fearVisible:  '#btnFearVisible',
        // Clocks panel
        clocksPanel:  '#clocksPanel',
        addClockBtn:  '#btnAddClock',
        clockName:    '.clock-name-input, #clockNameInput',
        // Move lock
        moveLockBtn:  '#btnMoveLock',
    },

    // ── Encounter Builder (encounter-builder.html) ──────────────────────────
    ENCOUNTER: {
        wrap:         '#encWrap',
        nameInput:    '#encName',
        createBtn:    '#createEncBtn',
        grid:         '#encGrid',
        card:         '.enc-card',
        cardName:     '.enc-card-name',
        cardOpenBtn:  '.enc-card .btn-sm',
        cardDeleteBtn: '.enc-card .btn-danger-sm',
        detailName:   '#detailName',
        entryList:    '.entry-list, #entryList',
        entryRow:     '.entry-row',
        togglePickerBtn: '#togglePickerBtn',
        pickerPanel:  '#pickerPanel',
        pickerSearch: '#pickerSearch',
        pickerList:   '#pickerList',
        pickerRow:    '#pickerList .picker-row',
        addEntryBtn:  '.btn-add-entry',
        backToList:   '#backToList',
    },

    // ── Loot Generator (loot-generator.html) ────────────────────────────────
    LOOT: {
        wrap:         '#lootWrap',
        rollBtn:      '#btnRoll',
        raritySelect: '#ctrlRarity',
        typeSelect:   '#ctrlType',
        countSelect:  '#ctrlCount',
        results:      '#resultsContainer',
        card:         '.loot-card',
        cardName:     '.loot-card-name',
        rerollBtn:    '.btn-reroll',
        hbToggle:     '#chkHomebrew',
        hbRow:        '#hbRow',
    },

    // ── Profile (profile.html) ──────────────────────────────────────────────
    PROFILE: {
        displayName:  '#displayNameInput',
        avatarCircle: '#avatarCircle',
        avatarName:   '#avatarName',
        saveBtn:      '#saveProfileBtn',
        success:      '#profileSuccess',
        error:        '#profileError',
    },

    // ── Primer (primer.html) ─────────────────────────────────────────────────
    PRIMER: {
        content:      '.primer-content, #primerContent, main',
        emptyState:   '.primer-empty, .empty-state',
        pageList:     '.page-list, #pageList',
    },
};
