// app.js - Visual Math Lab Interactive Engine

// Global State
let currentView = 'dashboard';

// --- Scoring & Profile State ---
let profileState = {
    stars: 0,
    attempts: {
        seesaw: { right: 0, wrong: 0 },
        cookies: { right: 0, wrong: 0 },
        birds: { right: 0, wrong: 0 },
        snapper: { right: 0, wrong: 0 },
        farm: { right: 0, wrong: 0 },
        frogger: { right: 0, wrong: 0 },
        pizza: { right: 0, wrong: 0 },
        clock: { right: 0, wrong: 0 },
        tangram: { right: 0, wrong: 0 },
        market: { right: 0, wrong: 0 },
        algebra: { right: 0, wrong: 0 },
        alligator: { right: 0, wrong: 0 },
        balloon: { right: 0, wrong: 0 },
        measure: { right: 0, wrong: 0 },
        evolution: { right: 0, wrong: 0 }
    },
    config: {
        maxNumberLimit: 20,
        skipFactors: [2, 5, 10]
    },
    themesOwned: ['classic'],
    themeEquipped: 'classic',
    stickersOwned: [],
    hintsUnlocked: [],
    costumesOwned: [],
    evolutionStage: 1,
    evolutionFeatures: []
};

// Load Profile on startup
function loadProfile() {
    const saved = localStorage.getItem('toy_land_profile');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.stars !== undefined) profileState.stars = parsed.stars;
            if (parsed.attempts) {
                for (let key in profileState.attempts) {
                    if (parsed.attempts[key]) {
                        profileState.attempts[key].right = parsed.attempts[key].right || 0;
                        profileState.attempts[key].wrong = parsed.attempts[key].wrong || 0;
                    }
                }
            }
            if (parsed.config) {
                profileState.config = { ...profileState.config, ...parsed.config };
            }
            if (parsed.themesOwned) profileState.themesOwned = parsed.themesOwned;
            if (parsed.themeEquipped) profileState.themeEquipped = parsed.themeEquipped;
            if (parsed.stickersOwned) profileState.stickersOwned = parsed.stickersOwned;
            if (parsed.hintsUnlocked) profileState.hintsUnlocked = parsed.hintsUnlocked;
            if (parsed.costumesOwned) profileState.costumesOwned = parsed.costumesOwned;
            if (parsed.evolutionStage !== undefined) profileState.evolutionStage = parsed.evolutionStage;
            if (parsed.evolutionFeatures !== undefined) profileState.evolutionFeatures = parsed.evolutionFeatures;
        } catch (e) {
            console.error("Error parsing saved profile", e);
        }
    }
    
    // Sync lab15State
    lab15State.currentStage = profileState.evolutionStage || 1;
    lab15State.features = profileState.evolutionFeatures || [];
    
    updateParentDashboard();
    initShopOnLoad();
}

function saveProfile() {
    profileState.evolutionStage = lab15State.currentStage;
    profileState.evolutionFeatures = lab15State.features;
    localStorage.setItem('toy_land_profile', JSON.stringify(profileState));
    updateParentDashboard();
}

// Difficulty map for variable coin rewards
const gameDifficulty = {
    seesaw: 10, cookies: 10, birds: 10, frogger: 10, alligator: 10,
    snapper: 15, farm: 15, clock: 15, balloon: 15, market: 15,
    pizza: 25, tangram: 25, algebra: 25, measure: 25,
    evolution: 10 // base, modified by stage
};

function trackAnswer(gameId, isRight, extraInfo) {
    if (isRight) {
        profileState.attempts[gameId].right++;
        
        // Calculate variable reward
        let reward = gameDifficulty[gameId] || 10;
        if (gameId === 'evolution' && extraInfo && extraInfo.stage) {
            reward = 10 + extraInfo.stage * 2;
        }
        
        profileState.stars += reward;
        
        // Show success popup with stars
        triggerConfetti();
        animateCoins(reward);
        playSound('coin');
    } else {
        profileState.attempts[gameId].wrong++;
        playSound('sad');
    }
    saveProfile();
    updateHeaderCoins();
}

function resetProgress() {
    playSound('click');
    if (confirm("Are you sure you want to clear all stars and badges progress?")) {
        profileState = {
            stars: 0,
            attempts: {
                seesaw: { right: 0, wrong: 0 },
                cookies: { right: 0, wrong: 0 },
                birds: { right: 0, wrong: 0 },
                snapper: { right: 0, wrong: 0 },
                farm: { right: 0, wrong: 0 },
                frogger: { right: 0, wrong: 0 },
                pizza: { right: 0, wrong: 0 },
                clock: { right: 0, wrong: 0 },
                tangram: { right: 0, wrong: 0 },
                market: { right: 0, wrong: 0 },
                algebra: { right: 0, wrong: 0 },
                alligator: { right: 0, wrong: 0 },
                balloon: { right: 0, wrong: 0 },
                measure: { right: 0, wrong: 0 },
                evolution: { right: 0, wrong: 0 }
            },
            config: {
                maxNumberLimit: 20,
                skipFactors: [2, 5, 10]
            },
            themesOwned: ['classic'],
            themeEquipped: 'classic',
            stickersOwned: [],
            hintsUnlocked: [],
            costumesOwned: []
        };
        applyTheme('classic');
        saveProfile();
        alert("Progress cleared! You can start earning stars fresh!");
    }
}

// Update the Parent Report Room
function updateParentDashboard() {
    const starsEl = document.getElementById('parent-stars');
    const badgesCountEl = document.getElementById('parent-badges-count');
    if (starsEl) starsEl.textContent = `${profileState.stars} Stars`;
    updateHeaderCoins();
    updateShopCoinsDisplay();
    
    // Check and render badges
    const badges = [];
    const att = profileState.attempts;
    
    if (att.seesaw.right >= 1) badges.push({ icon: '⚖️', title: 'Seesaw Leveler', desc: 'Balanced matching blocks!' });
    if (att.cookies.right >= 1) badges.push({ icon: '🍪', title: 'Monster Feeder', desc: 'Fed Cookie Monster correctly!' });
    if (att.birds.right >= 1) badges.push({ icon: '🌳', title: 'Time Detective', desc: 'Solved the bird past mystery!' });
    if (att.snapper.right >= 1) badges.push({ icon: '🧮', title: 'Tray Snapper', desc: 'Mastered snapping to ten!' });
    if (att.farm.right >= 1) badges.push({ icon: '🥕', title: 'Patch Planner', desc: 'Grew grid crops!' });
    if (att.frogger && att.frogger.right >= 1) badges.push({ icon: '🐸', title: 'Lilypad Jumper', desc: 'Hopped the number line!' });
    if (att.pizza && att.pizza.right >= 1) badges.push({ icon: '🍕', title: 'Pizza Chef', desc: 'Partitioned circular pizzas!' });
    if (att.clock && att.clock.right >= 1) badges.push({ icon: '⏰', title: 'Time Keeper', desc: 'Perfected reading clock hands!' });
    if (att.tangram && att.tangram.right >= 1) badges.push({ icon: '📐', title: 'Tangram Builder', desc: 'Matched shape outlines!' });
    if (att.market && att.market.right >= 1) badges.push({ icon: '🪙', title: 'Market Cashier', desc: 'Paid with exact coins!' });
    if (att.algebra && att.algebra.right >= 1) badges.push({ icon: '🤹', title: 'Riddle Solver', desc: 'Solved shape weight ratios!' });
    if (att.alligator && att.alligator.right >= 1) badges.push({ icon: '🐊', title: 'Gator Feeder', desc: 'Compared group sizes!' });
    if (att.balloon && att.balloon.right >= 1) badges.push({ icon: '🎈', title: 'Balloon Popper', desc: 'Finished skip sequences!' });
    if (att.measure && att.measure.right >= 1) badges.push({ icon: '📏', title: 'Measuring Ruler', desc: 'Measured cute bug lengths!' });
    if (profileState.stars >= 100) badges.push({ icon: '🌟', title: 'Gold Superstar', desc: 'Earned over 100 stars!' });

    if (badgesCountEl) badgesCountEl.textContent = `${badges.length} Badges`;
    
    const shelf = document.getElementById('badge-shelf-container');
    if (shelf) {
        shelf.innerHTML = '';
        if (badges.length === 0) {
            shelf.innerHTML = `<span style="color:#94a3b8; font-weight:600; font-style:italic;">No badges earned yet. Complete see-saws, feed cookies, or travel time to unlock medals!</span>`;
        } else {
            badges.forEach(b => {
                const badgeEl = document.createElement('div');
                badgeEl.style.cssText = `
                    display:flex; flex-direction:column; align-items:center; width:95px; background:#f8fafc;
                    border:3px solid var(--border-color); border-radius:12px; padding:10px; box-shadow:0 4px 0 var(--border-color);
                `;
                badgeEl.innerHTML = `
                    <div style="font-size:2.2rem; margin-bottom:5px;">${b.icon}</div>
                    <div style="font-weight:700; font-size:0.75rem; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;" title="${b.title}">${b.title}</div>
                `;
                shelf.appendChild(badgeEl);
            });
        }
    }

    // Render Stats Table Rows
    const tableBody = document.getElementById('parent-stats-table');
    if (tableBody) {
        let rowsHtml = '';
        const games = [
            { key: 'seesaw', name: '⚖️ Seesaw Balance', medal: 'Leveling Expert' },
            { key: 'cookies', name: '🍪 Cookie Monster', medal: 'Master Chef' },
            { key: 'birds', name: '🌳 Tree Time Machine', medal: 'Time Cop' },
            { key: 'snapper', name: '🧮 Magic Tray Snapper', medal: 'Grid Master' },
            { key: 'farm', name: '🥕 Carrot Farming', medal: 'Master Farmer' },
            { key: 'frogger', name: '🐸 Lilypad Jumper', medal: 'Pond Explorer' },
            { key: 'pizza', name: '🍕 Pizza Fractions', medal: 'Master Baker' },
            { key: 'clock', name: '⏰ Telling Time Clock', medal: 'Time Master' },
            { key: 'tangram', name: '📐 Tangram Builder', medal: 'Grand Architect' },
            { key: 'market', name: '🪙 Money Toy Store', medal: 'Finance Master' },
            { key: 'algebra', name: '🤹 Shape Riddles', medal: 'Algebra Legend' },
            { key: 'alligator', name: '🐊 Gator Comparison', medal: 'Swamp Leader' },
            { key: 'balloon', name: '🎈 Skip Count Balloons', medal: 'Pattern Popper' },
            { key: 'measure', name: '📏 Measurement Ruler', medal: 'Ruler Champion' },
            { key: 'evolution', name: '🦸‍♂️ Character Evolution', medal: 'Hero Builder' }
        ];
        
        games.forEach(g => {
            const stats = att[g.key] || { right: 0, wrong: 0 };
            rowsHtml += `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px 10px; font-weight:600;">${g.name}</td>
                    <td style="padding:8px 10px; color:var(--color-success); font-weight:700;">${stats.right}</td>
                    <td style="padding:8px 10px; color:var(--color-danger); font-weight:700;">${stats.wrong}</td>
                    <td style="padding:8px 10px; font-size:0.9rem; font-weight:600; color:#475569;">${stats.right >= 2 ? '🔥 ' + g.medal : 'Active'}</td>
                </tr>
            `;
        });
        tableBody.innerHTML = rowsHtml;
    }

    // Set config values in UI
    const limitEl = document.getElementById('config-max-limit');
    if (limitEl && profileState.config) {
        limitEl.value = profileState.config.maxNumberLimit || 20;
    }

    // Generate Diagnostics Tips
    const diagnosticsTipsEl = document.getElementById('parent-diagnostics-tips');
    if (diagnosticsTipsEl) {
        let tipsHtml = '';
        
        if (att.seesaw.wrong > att.seesaw.right) {
            tipsHtml += `<li><strong>Seesaw Balance:</strong> Your child is exploring weight adjustments. Ask: <em>"If we have a blue block on the left see-saw pan, what goes on the right see-saw pan to make it level?"</em></li>`;
        } else if (att.seesaw.right > 0) {
            tipsHtml += `<li><strong>Seesaw Balance:</strong> Great seesaw level skills! Your child intuitively understands commutativity (that order doesn't change weight: 6 + 5 weighs same as 5 + 6).</li>`;
        }
        if (att.cookies.right > 0) {
            tipsHtml += `<li><strong>Cookie Monster:</strong> Your child is exploring subtraction. Try the <strong>"Give 6 out of 5"</strong> challenge together and talk about deficits.</li>`;
        }
        if (att.birds.wrong > 0) {
            tipsHtml += `<li><strong>Tree Time Machine:</strong> Word problems working-backwards is in progress! Remind them to drag the timeline all the way left to the <strong>Start (Past)</strong> to watch the birds fly back.</li>`;
        }
        if (att.snapper.wrong > att.snapper.right) {
            tipsHtml += `<li><strong>Magic Tray Snapper:</strong> Subtraction bridging 10 is underway. Encourage them to empty <strong>Tray 2</strong> first to reach 10, then pop from Tray 1.</li>`;
        }
        if (att.frogger && att.frogger.wrong > 0) {
            tipsHtml += `<li><strong>Lilypad Jumper:</strong> Your child is learning addition/subtraction along number lines. Ask them to manually count hops one-by-one!</li>`;
        }
        if (att.pizza && att.pizza.wrong > 0) {
            tipsHtml += `<li><strong>Pizza Fractions:</strong> Partitioning shapes is in progress! Prompt them to double check the slice count matching the denominator (bottom number).</li>`;
        }
        if (att.clock && att.clock.wrong > 0) {
            tipsHtml += `<li><strong>Time Clock:</strong> Tell-time practice is active. Remind them that the shorter hand is the hour and the longer is the minute.</li>`;
        }
        if (att.market && att.market.wrong > 0) {
            tipsHtml += `<li><strong>Money Toy Store:</strong> Coin counting skip counts (5s, 10s, 25s) are in progress. Practice stacking nickels and dimes at home!</li>`;
        }
        
        if (tipsHtml === '') {
            tipsHtml = "Play some game adventures! The Play Lab will compile diagnostic observations, coaching tips, and recommended craft worksheets here.";
        } else {
            tipsHtml = `<ul style="display:flex; flex-direction:column; gap:10px; padding-left:15px; margin:0;">${tipsHtml}</ul>`;
        }
        diagnosticsTipsEl.innerHTML = tipsHtml;
    }
}

// --- Confetti Effect (Big Reward Canvas) ---
let confettiActive = false;
let confettiParticles = [];
const confettiColors = ['#f97316', '#3b82f6', '#22c55e', '#ec4899', '#a855f7', '#fef08a'];

function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    confettiParticles = [];
    confettiActive = true;
    
    // Spawn 120 falling shapes
    for (let i = 0; i < 120; i++) {
        confettiParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height, // start above screen
            r: Math.random() * 6 + 4,
            d: Math.random() * canvas.height,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0
        });
    }
    
    requestAnimationFrame(updateConfetti);
    
    // Stop and hide after 3.5 seconds
    setTimeout(() => {
        confettiActive = false;
        canvas.style.display = 'none';
    }, 3500);
}

function updateConfetti() {
    if (!confettiActive) return;
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let finished = true;
    
    confettiParticles.forEach(p => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2; // falling speed
        p.x += Math.sin(p.tiltAngle); // sway sway
        p.tilt = Math.sin(p.tiltAngle - (p.r / 3)) * 15;
        
        if (p.y < canvas.height) {
            finished = false;
        }
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
    });
    
    if (!finished && confettiActive) {
        requestAnimationFrame(updateConfetti);
    }
}

// --- View Router View Hook ---
function switchView(viewId) {
    playSound('click');
    
    // Hide all panels
    document.querySelectorAll('.lab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Show selected panel
    const targetPanel = document.getElementById('view-' + viewId);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    
    // Update navigation active states by checking onclick handler content
    document.querySelectorAll('#main-nav .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        const clickHandler = btn.getAttribute('onclick') || '';
        if (clickHandler.includes(`'${viewId}'`)) {
            btn.classList.add('active');
        }
    });

    currentView = viewId;

    // View specific initializations
    if (viewId === 'lab1') resetLab1();
    if (viewId === 'lab2') resetLab2();
    if (viewId === 'lab3') resetLab3();
    if (viewId === 'lab4') resetLab4();
    if (viewId === 'lab5') updateGarden();
    if (viewId === 'lab6') loadLab6Problem();
    if (viewId === 'lab7') loadLab7Problem();
    if (viewId === 'lab8') loadLab8Problem();
    if (viewId === 'lab9') loadLab9Problem();
    if (viewId === 'lab10') loadLab10Problem();
    if (viewId === 'lab11') loadLab11Problem();
    if (viewId === 'lab12') loadLab12Problem();
    if (viewId === 'lab13') loadLab13Problem();
    if (viewId === 'lab14') loadLab14Problem();
    if (viewId === 'lab15') resetLab15();
    if (viewId === 'parent') updateParentDashboard();
    if (viewId === 'shop') renderShop();
}

// --- Celebrations & Modals ---
function showSuccessPopup(message) {
    playSound('success');
    const overlay = document.getElementById('success-overlay');
    const msgEl = document.getElementById('success-message');
    if (msgEl && overlay) {
        msgEl.textContent = message;
        overlay.style.display = 'flex';
    }
}

function closeSuccessPopup() {
    playSound('click');
    const overlay = document.getElementById('success-overlay');
    if (overlay) overlay.style.display = 'none';
}


// ==========================================================================
// LAB 1: Balance Scale & Fact Families (The Seesaw Balance)
// ==========================================================================
let lab1State = {
    numA: 6,
    numB: 5,
    isSubtraction: false,
    subType: 'sub1',
    leftBlocks: [],
    rightBlocks: [],
    completed: false
};

function resetLab1() {
    // Default to addition problem 6 & 5
    loadLab1Problem(6, 5, false);
}

function loadLab1Problem(numA, numB, isSubtraction, subType = 'sub1') {
    lab1State.numA = numA;
    lab1State.numB = numB;
    lab1State.isSubtraction = isSubtraction;
    lab1State.subType = subType;
    lab1State.completed = false;
    
    // Hide fact family house
    const house = document.getElementById('fact-family-house');
    if (house) house.style.display = 'none';

    if (isSubtraction) {
        const sumVal = numA + numB;
        // Left side has the combined block
        lab1State.leftBlocks = [{ weight: sumVal, color: 'purple' }];
        // Right side has the target block
        if (subType === 'sub1') {
            lab1State.rightBlocks = [{ weight: numB, color: 'red' }]; // target is numB
        } else {
            lab1State.rightBlocks = [{ weight: numA, color: 'blue' }]; // target is numA
        }
        document.getElementById('scale-status').textContent = `
            ⚖️ Level by slicing: Slice off a block from the left pan to balance the scale!
        `;
    } else {
        lab1State.leftBlocks = [];
        lab1State.rightBlocks = [];
        document.getElementById('scale-status').innerHTML = `
            ⚖️ Left Pan has 0 weight. Right Pan has 0. Add blocks to level the scale at <strong>${numA + numB}</strong>!
        `;
    }

    renderScale();
    renderLab1Buttons();
}

function selectFactFamilyWindow(windowId) {
    playSound('click');
    document.querySelectorAll('.house-window').forEach(win => {
        win.classList.remove('selected');
    });
    const selectedWin = document.getElementById('window-' + windowId);
    if (selectedWin) selectedWin.classList.add('selected');
}

// Render persistent block controls
function renderLab1Buttons() {
    const controls = document.getElementById('add-block-controls');
    if (!controls) return;
    
    if (lab1State.completed) {
        controls.innerHTML = '';
        return;
    }
    
    let leftTotal = lab1State.leftBlocks.reduce((sum, b) => sum + b.weight, 0);
    let rightTotal = lab1State.rightBlocks.reduce((sum, b) => sum + b.weight, 0);
    
    if (leftTotal === 0 && rightTotal === 0) {
        controls.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; gap:10px;">
                <div style="font-weight:700; color:#475569; font-size:1.05rem;">👇 Click to put blocks on the scale:</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
                    <button class="bubble-btn primary" style="padding:8px 16px; font-size:1rem;" onclick="addBlockToScale('left', ${lab1State.numA}, 'blue')">➕ Add ${lab1State.numA} to Left Pan 🟦</button>
                    <button class="bubble-btn danger" style="padding:8px 16px; font-size:1rem;" onclick="addBlockToScale('left', ${lab1State.numB}, 'red')">➕ Add ${lab1State.numB} to Left Pan 🟥</button>
                    <button class="bubble-btn danger" style="padding:8px 16px; font-size:1rem;" onclick="addBlockToScale('right', ${lab1State.numB}, 'red')">➕ Add ${lab1State.numB} to Right Pan 🟥</button>
                    <button class="bubble-btn primary" style="padding:8px 16px; font-size:1rem;" onclick="addBlockToScale('right', ${lab1State.numA}, 'blue')">➕ Add ${lab1State.numA} to Right Pan 🟦</button>
                </div>
            </div>
        `;
        return;
    }
    
    let diff = Math.abs(leftTotal - rightTotal);
    
    let recommendedHtml = '';
    if (diff > 0) {
        recommendedHtml += `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; gap:8px;">
                <div style="font-weight:700; color:#475569; font-size:1.05rem;">💡 Recommended ways to level the see-saw:</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
        `;
        if (leftTotal > rightTotal) {
            // Left is heavier
            recommendedHtml += `
                <button class="bubble-btn danger" style="padding:10px 20px; font-size:1.05rem;" onclick="applyCustomOperation('slice', ${diff}, 'left')">✂️ Slice off ${diff} from Left Pan 🟦</button>
                <button class="bubble-btn primary" style="padding:10px 20px; font-size:1.05rem;" onclick="applyCustomOperation('add', ${diff}, 'right')">➕ Add ${diff} to Right Pan 🟥</button>
            `;
        } else {
            // Right is heavier
            recommendedHtml += `
                <button class="bubble-btn primary" style="padding:10px 20px; font-size:1.05rem;" onclick="applyCustomOperation('slice', ${diff}, 'right')">✂️ Slice off ${diff} from Right Pan 🟥</button>
                <button class="bubble-btn danger" style="padding:10px 20px; font-size:1.05rem;" onclick="applyCustomOperation('add', ${diff}, 'left')">➕ Add ${diff} to Left Pan 🟦</button>
            `;
        }
        recommendedHtml += `
                </div>
            </div>
        `;
    }
    
    // Custom Play Box HTML
    let customBoxHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:620px; background:#f8fafc; border:3px dashed var(--border-color); border-radius:18px; padding:12px; box-shadow: 0 4px 0 var(--border-color); margin-top:8px;">
            <div style="font-weight:700; color:var(--text-color); font-size:1.05rem;">🛠️ Choose Your Own Balance Action:</div>
            <div style="display:flex; gap:12px; align-items:center; justify-content:center; flex-wrap:wrap; width:100%;">
                <!-- Action Type -->
                <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-start;">
                    <span style="font-size:0.8rem; font-weight:700; color:#64748b;">Action:</span>
                    <select id="custom-op-type" class="bubble-select" style="padding:5px 10px; border-radius:10px; font-weight:600; font-family:'Fredoka',sans-serif; border:2px solid var(--border-color); background:white;">
                        <option value="add" selected>➕ Add</option>
                        <option value="slice">✂️ Slice</option>
                    </select>
                </div>
                
                <!-- Number Input -->
                <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-start;">
                    <span style="font-size:0.8rem; font-weight:700; color:#64748b;">How many:</span>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <button class="bubble-btn" style="padding:2px 8px; font-size:0.9rem; min-width:unset; height:32px; line-height:24px;" onclick="adjustCustomWeight(-1)">-</button>
                        <input type="number" id="custom-op-weight" value="${diff > 0 ? diff : 5}" min="1" max="25" class="bubble-input" style="width:50px; height:32px; text-align:center; padding:0; font-weight:700; font-family:'Fredoka',sans-serif; font-size:1.05rem; box-sizing:border-box; border:3px solid var(--border-color); border-radius:12px;">
                        <button class="bubble-btn" style="padding:2px 8px; font-size:0.9rem; min-width:unset; height:32px; line-height:24px;" onclick="adjustCustomWeight(1)">+</button>
                    </div>
                </div>
                
                <!-- Which Pan -->
                <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-start;">
                    <span style="font-size:0.8rem; font-weight:700; color:#64748b;">Which Pan:</span>
                    <select id="custom-op-pan" class="bubble-select" style="padding:5px 10px; border-radius:10px; font-weight:600; font-family:'Fredoka',sans-serif; border:2px solid var(--border-color); background:white;">
                        <option value="left" ${leftTotal < rightTotal ? 'selected' : ''}>👈 Left Pan</option>
                        <option value="right" ${rightTotal < leftTotal ? 'selected' : ''}>👉 Right Pan</option>
                    </select>
                </div>
                
                <!-- Try Button -->
                <button class="bubble-btn success" style="padding:6px 14px; font-size:1rem; height:34px; line-height:20px; display:inline-flex; align-items:center;" onclick="submitCustomOperation()">⚖️ Try it!</button>
            </div>
        </div>
    `;
    
    controls.innerHTML = recommendedHtml + customBoxHtml;
}

function adjustCustomWeight(amount) {
    const input = document.getElementById('custom-op-weight');
    if (!input) return;
    let current = parseInt(input.value) || 0;
    let nextVal = Math.max(1, Math.min(25, current + amount));
    input.value = nextVal;
    playSound('click');
}

function submitCustomOperation() {
    const typeEl = document.getElementById('custom-op-type');
    const weightEl = document.getElementById('custom-op-weight');
    const panEl = document.getElementById('custom-op-pan');
    
    if (!typeEl || !weightEl || !panEl) return;
    
    const opType = typeEl.value;
    const amount = parseInt(weightEl.value) || 0;
    const pan = panEl.value;
    
    applyCustomOperation(opType, amount, pan);
}

function addBlockToScale(pan, amount, color) {
    if (isNaN(amount) || amount <= 0) return;
    let blocks = (pan === 'left') ? lab1State.leftBlocks : lab1State.rightBlocks;
    blocks.push({ weight: amount, color: color });
    playSound('pop');
    renderScale();
    checkScaleBalance();
    renderLab1Buttons();
}

function applyCustomOperation(opType, amount, pan) {
    if (isNaN(amount) || amount <= 0) {
        playSound('sad');
        document.getElementById('scale-status').innerHTML = `<span style="color:var(--color-danger)">⚠️ Please enter a number greater than 0!</span>`;
        return;
    }
    
    let blocks = (pan === 'left') ? lab1State.leftBlocks : lab1State.rightBlocks;
    
    if (opType === 'add') {
        const color = (pan === 'left') ? 'blue' : 'red';
        addBlockToScale(pan, amount, color);
    } else if (opType === 'slice') {
        if (blocks.length === 0) {
            playSound('sad');
            document.getElementById('scale-status').innerHTML = `<span style="color:var(--color-danger)">⚠️ That pan has no blocks to slice!</span>`;
            return;
        }
        
        let totalWeight = blocks.reduce((sum, b) => sum + b.weight, 0);
        if (amount >= totalWeight) {
            playSound('sad');
            document.getElementById('scale-status').innerHTML = `
                <span style="color:var(--color-danger)">⚠️ Slicing off ${amount} would make the pan empty or negative! Pick a number smaller than ${totalWeight}.</span>
            `;
            return;
        }
        
        // Play slice animation on the target pan
        playSound('slide'); // slice whoosh
        const container = document.getElementById(pan === 'left' ? 'left-pan-content' : 'right-pan-content');
        if (!container) return;
        
        container.innerHTML = '';
        const bigBlock = document.createElement('div');
        const blockColor = blocks[0].color || 'purple';
        bigBlock.className = `math-block ${blockColor} slicing-animation`;
        bigBlock.innerHTML = `${totalWeight} <div class="slice-effect" id="scale-slicer"></div>`;
        container.appendChild(bigBlock);
        
        setTimeout(() => {
            const slicer = document.getElementById('scale-slicer');
            if (slicer) slicer.classList.add('active');
            
            setTimeout(() => {
                playSound('pop');
                
                // Update state
                const remainingVal = totalWeight - amount;
                if (pan === 'left') {
                    lab1State.leftBlocks = [{ weight: remainingVal, color: blockColor }];
                } else {
                    lab1State.rightBlocks = [{ weight: remainingVal, color: blockColor }];
                }
                renderScale();
                checkScaleBalance();
            }, 300);
        }, 300);
    }
}

function checkScaleBalance() {
    let leftTotal = lab1State.leftBlocks.reduce((sum, b) => sum + b.weight, 0);
    let rightTotal = lab1State.rightBlocks.reduce((sum, b) => sum + b.weight, 0);
    
    if (leftTotal === 0 && rightTotal === 0) return;
    
    const sumVal = lab1State.numA + lab1State.numB;
    
    if (lab1State.isSubtraction) {
        const remainingAmount = (lab1State.subType === 'sub1') ? lab1State.numB : lab1State.numA;
        const sliceAmount = (lab1State.subType === 'sub1') ? lab1State.numA : lab1State.numB;
        
        if (leftTotal === rightTotal && (leftTotal === sumVal || leftTotal === remainingAmount)) {
            // Balanced successfully!
            lab1State.completed = true;
            renderLab1Buttons(); // Hide buttons
            
            // Setup fact family house numbers
            document.getElementById('house-top-num').textContent = sumVal;
            document.getElementById('house-left-num').textContent = lab1State.numA;
            document.getElementById('house-right-num').textContent = lab1State.numB;
            
            document.getElementById('window-add1').textContent = `${lab1State.numA} + ${lab1State.numB} = ${sumVal}`;
            document.getElementById('window-add2').textContent = `${lab1State.numB} + ${lab1State.numA} = ${sumVal}`;
            document.getElementById('window-sub1').textContent = `${sumVal} - ${lab1State.numA} = ${lab1State.numB}`;
            document.getElementById('window-sub2').textContent = `${sumVal} - ${lab1State.numB} = ${lab1State.numA}`;
            
            // Highlight selected window
            document.querySelectorAll('.house-window').forEach(win => win.classList.remove('selected'));
            const selectedWindow = (lab1State.subType === 'sub1') ? 'window-sub1' : 'window-sub2';
            document.getElementById(selectedWindow).classList.add('selected');
            
            // Show secret clubhouse
            const house = document.getElementById('fact-family-house');
            if (house) {
                house.style.display = 'flex';
                house.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Record success & launch fanfare!
            trackAnswer('seesaw', true);
            
            let message = "";
            if (leftTotal === sumVal) {
                document.getElementById('scale-status').innerHTML = `
                    <span style="color:var(--color-success)">🎉 PERFECTLY LEVEL! 🎉</span><br>
                    Left Pan has <strong>${sumVal}</strong> | Right Pan has <strong>${remainingAmount} plus ${sliceAmount} = ${sumVal}</strong>
                `;
                message = `Clubhouse Secret: Adding ${sliceAmount} to the right balances the scale at ${sumVal}!`;
            } else {
                document.getElementById('scale-status').innerHTML = `
                    <span style="color:var(--color-success)">🎉 PERFECTLY LEVEL! 🎉</span><br>
                    Left Pan has <strong>${sumVal} minus ${sliceAmount} = ${remainingAmount}</strong> | Right Pan has <strong>${remainingAmount}</strong>
                `;
                message = `Clubhouse Secret: Slicing ${sliceAmount} off the left balances the scale at ${remainingAmount}!`;
            }
            showSuccessPopup(message);
        } else if (leftTotal === rightTotal) {
            document.getElementById('scale-status').innerHTML = `
                ⚖️ Balanced at <strong>${leftTotal}</strong>, but let's try to slice to <strong>${remainingAmount}</strong> or add to <strong>${sumVal}</strong>!
            `;
        } else {
            document.getElementById('scale-status').innerHTML = `
                ⚖️ Left side has <strong>${leftTotal}</strong> weight. Right side has <strong>${rightTotal}</strong>. Make both sides level!
            `;
        }
    } else {
        // Addition game
        if (leftTotal === rightTotal && leftTotal === sumVal) {
            // Balanced successfully!
            lab1State.completed = true;
            renderLab1Buttons();
            
            document.getElementById('scale-status').innerHTML = `
                <span style="color:var(--color-success)">🎉 PERFECTLY LEVEL! 🎉</span><br>
                Left Pan: <strong>${lab1State.numA} and ${lab1State.numB} make ${sumVal}</strong> | Right Pan: <strong>${lab1State.numB} and ${lab1State.numA} make ${sumVal}</strong>
            `;
            
            // Setup house elements
            document.getElementById('house-top-num').textContent = sumVal;
            document.getElementById('house-left-num').textContent = lab1State.numA;
            document.getElementById('house-right-num').textContent = lab1State.numB;
            
            document.getElementById('window-add1').textContent = `${lab1State.numA} + ${lab1State.numB} = ${sumVal}`;
            document.getElementById('window-add2').textContent = `${lab1State.numB} + ${lab1State.numA} = ${sumVal}`;
            document.getElementById('window-sub1').textContent = `${sumVal} - ${lab1State.numA} = ${lab1State.numB}`;
            document.getElementById('window-sub2').textContent = `${sumVal} - ${lab1State.numB} = ${lab1State.numA}`;
            
            // Show Secret Clubhouse
            const house = document.getElementById('fact-family-house');
            if (house) {
                house.style.display = 'flex';
                house.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Record success & launch fanfare!
            trackAnswer('seesaw', true);
            showSuccessPopup(`Seesaw Balanced! Placing blocks in either order (${lab1State.numA} + ${lab1State.numB} or ${lab1State.numB} + ${lab1State.numA}) totals ${sumVal} and balances the see-saw!`);
        } else if (leftTotal === rightTotal) {
            document.getElementById('scale-status').innerHTML = `
                ⚖️ Balanced at ${leftTotal}, but let's try to balance 
                <strong>${lab1State.numA} and ${lab1State.numB}</strong> on both sides!
            `;
        } else {
            document.getElementById('scale-status').innerHTML = `
                ⚖️ Left side has <strong>${leftTotal}</strong> weight. Right side has <strong>${rightTotal}</strong>. Make both sides level!
            `;
        }
    }
}

function renderScale() {
    const leftContainer = document.getElementById('left-pan-content');
    const rightContainer = document.getElementById('right-pan-content');
    if (!leftContainer || !rightContainer) return;

    leftContainer.innerHTML = '';
    rightContainer.innerHTML = '';

    // Render left pan blocks
    lab1State.leftBlocks.forEach(b => {
        const block = document.createElement('div');
        block.className = `math-block ${b.color}`;
        block.textContent = b.weight;
        leftContainer.appendChild(block);
    });

    // Render right pan blocks
    lab1State.rightBlocks.forEach(b => {
        const block = document.createElement('div');
        block.className = `math-block ${b.color}`;
        block.textContent = b.weight;
        rightContainer.appendChild(block);
    });

    // Calculate totals
    let leftTotal = lab1State.leftBlocks.reduce((sum, b) => sum + b.weight, 0);
    let rightTotal = lab1State.rightBlocks.reduce((sum, b) => sum + b.weight, 0);

    // Seesaw beam tilt angle calculation
    // Left heavy should tilt left down (negative angle).
    // Right heavy should tilt right down (positive angle).
    let diff = rightTotal - leftTotal;
    let angle = Math.max(-12, Math.min(12, diff * 1.5));

    // Update style transforms
    const beam = document.getElementById('scale-beam');
    if (beam) {
        beam.style.transform = `rotate(${angle}deg)`;
    }

    // Update hangers transform to keep them vertical
    document.querySelectorAll('.scale-left-hanger, .scale-right-hanger').forEach(hanger => {
        hanger.style.transform = `rotate(${-angle}deg)`;
    });
}


// ==========================================================================
// LAB 2: The Cookie Shop (Cookie Monster)
// ==========================================================================
let lab2State = {
    active: false,
    numA: 6,
    numB: 5,
    cookiesOnPlate: 6,
    cookiesEaten: 0
};

function resetLab2() {
    loadLab2Challenge(6, 5);
}

function loadLab2Challenge(numA, numB) {
    lab2State.active = true;
    lab2State.numA = numA;
    lab2State.numB = numB;
    lab2State.cookiesOnPlate = numA;
    lab2State.cookiesEaten = 0;
    
    const plate = document.getElementById('cookie-plate-area');
    if (plate) {
        plate.innerHTML = '';
        for (let i = 1; i <= numA; i++) {
            const cookie = document.createElement('div');
            cookie.className = 'cookie';
            cookie.id = `cookie-${i}`;
            cookie.draggable = true;
            cookie.setAttribute('ondragstart', 'drag(event)');
            cookie.setAttribute('onclick', 'feedCookie(this.id)');
            
            // Add chips
            for (let j = 0; j < 5; j++) {
                const chip = document.createElement('div');
                chip.className = 'cookie-chip';
                cookie.appendChild(chip);
            }
            plate.appendChild(cookie);
        }
    }
    
    document.getElementById('plate-count').textContent = numA;
    document.getElementById('eaten-count').textContent = 0;
    document.getElementById('cookie-monster').textContent = "👾";
    document.getElementById('monster-bubble').textContent = `Feed me ${numB} cookies from the plate!`;
    
    updateSubtractionFormula();
}

function feedCookie(cookieId) {
    if (!lab2State.active) return;
    
    const cookie = document.getElementById(cookieId);
    if (!cookie) return;
    
    // If monster has eaten enough, stop
    if (lab2State.cookiesEaten >= lab2State.numB) {
        playSound('sad'); // click sound block
        document.getElementById('monster-bubble').textContent = "Burp! I am full! No more cookies needed.";
        return;
    }
    
    playSound('crunch'); // Funny Crunch crunch crunch + "Yum Yum" sound
    
    // Animate feeding
    cookie.style.transform = 'scale(0)';
    setTimeout(() => {
        cookie.remove();
    }, 200);
    
    lab2State.cookiesOnPlate--;
    lab2State.cookiesEaten++;
    
    document.getElementById('plate-count').textContent = lab2State.cookiesOnPlate;
    document.getElementById('eaten-count').textContent = lab2State.cookiesEaten;
    
    // Chewing animation
    const monster = document.getElementById('cookie-monster');
    monster.textContent = "😋";
    setTimeout(() => {
        if (lab2State.cookiesEaten === lab2State.numB) {
            monster.textContent = "😎";
        } else {
            monster.textContent = "👾";
        }
    }, 400);
    
    updateSubtractionFormula();
    checkCookieChallenge();
}

function checkCookieChallenge() {
    if (lab2State.numA >= lab2State.numB) {
        if (lab2State.cookiesEaten === lab2State.numB) {
            lab2State.active = false;
            document.getElementById('monster-bubble').innerHTML = `
                Yum! I ate <strong>${lab2State.numB}</strong> cookies. <br>
                You have <strong>${lab2State.cookiesOnPlate}</strong> left on the plate!
            `;
            // Record Success
            trackAnswer('cookies', true);
            showSuccessPopup(`Cookie Game Success: Feed ${lab2State.numB} out of ${lab2State.numA} cookies, and we have exactly ${lab2State.cookiesOnPlate} cookies left!`);
        }
    } else {
        // For deficit cases like 5 - 6
        if (lab2State.cookiesOnPlate === 0 && lab2State.cookiesEaten < lab2State.numB) {
            lab2State.active = false;
            const missing = lab2State.numB - lab2State.numA;
            
            // Add a visual negative deficit box next to formula
            const formulaEl = document.getElementById('subtraction-formula');
            const deficitBox = document.createElement('div');
            deficitBox.className = 'deficit-container';
            deficitBox.textContent = `Need ${missing}`;
            formulaEl.appendChild(deficitBox);
            
            document.getElementById('monster-bubble').innerHTML = `
                Oh no! You gave me all <strong>${lab2State.numA}</strong> cookies, but I still want 1 more! <br>
                We can't do this because we are short of <strong>${missing}</strong> cookie!
            `;
            // Slicing/deficit exploration counts as a success once fully completed!
            trackAnswer('cookies', true);
        }
    }
}

function updateSubtractionFormula() {
    const formula = document.getElementById('subtraction-formula');
    if (!formula) return;
    formula.innerHTML = `${lab2State.numA} - ${lab2State.cookiesEaten} = <strong>${lab2State.cookiesOnPlate}</strong>`;
}

// Drag & Drop Handlers
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function dropOnMonster(ev) {
    ev.preventDefault();
    let data = ev.dataTransfer.getData("text");
    feedCookie(data);
}

function dropOnPlate(ev) {
    ev.preventDefault();
}


// ==========================================================================
// LAB 3: Time-Travel Bird Tree (Tree Time Machine)
// ==========================================================================
let lab3State = {
    numA: 10,
    numB: 3,
    initialBirds: 13,
    nowLeft: 10,
    flewAway: 3,
    timelineStep: 2,
    answered: false
};

function resetLab3() {
    loadLab3Problem(10, 3);
}

function loadLab3Problem(nowLeft, flewAway) {
    lab3State.numA = nowLeft;
    lab3State.numB = flewAway;
    lab3State.initialBirds = nowLeft + flewAway;
    lab3State.nowLeft = nowLeft;
    lab3State.flewAway = flewAway;
    lab3State.timelineStep = 2;
    lab3State.answered = false;
    
    const tree = document.getElementById('tree-scene');
    if (tree) {
        // Clear old birds
        document.querySelectorAll('.bird-sprite').forEach(b => b.remove());
        
        // Spawn static birds
        for (let i = 0; i < nowLeft; i++) {
            const bird = document.createElement('div');
            bird.className = 'bird-sprite';
            bird.textContent = '🐦';
            // Random positions in the green area
            bird.style.left = `${Math.random() * 45 + 25}%`;
            bird.style.top = `${Math.random() * 35 + 25}%`;
            tree.appendChild(bird);
        }
        
        // Spawn fly away birds
        for (let i = 0; i < flewAway; i++) {
            const bird = document.createElement('div');
            bird.className = 'bird-sprite fly-away-target flying-away';
            bird.textContent = '🐦';
            bird.style.left = `${Math.random() * 40 + 30}%`;
            bird.style.top = `${Math.random() * 30 + 30}%`;
            tree.appendChild(bird);
        }
    }
    
    setTimeSlider(2);
}

function timeTravelSlide(value) {
    setTimeSlider(parseInt(value));
}

function setTimeSlider(step) {
    playSound('flap'); // wing flaps creaks
    lab3State.timelineStep = step;
    const slider = document.getElementById('time-slider');
    if (slider) slider.value = step;
    
    // Highlight labels
    document.querySelectorAll('.timeline-label').forEach((lbl, idx) => {
        lbl.classList.toggle('active', idx === step);
    });
    
    const birdsToFly = document.querySelectorAll('.fly-away-target');
    const questionPanel = document.getElementById('bird-question');
    const storyEl = document.getElementById('bird-story-text');
    
    if (step === 2) {
        birdsToFly.forEach(b => b.classList.add('flying-away'));
        if (storyEl) {
            storyEl.innerHTML = `
                ⏭️ <strong>Right Now:</strong> The ${lab3State.flewAway} birds have flown away. <br>
                We see exactly <strong>${lab3State.nowLeft} birds</strong> left on the tree. Let's slide back in time to find the start!
            `;
        }
        if (questionPanel) questionPanel.style.display = 'flex';
        renderBirdOptions();
    } else if (step === 1) {
        birdsToFly.forEach(b => b.classList.add('flying-away'));
        if (storyEl) {
            storyEl.innerHTML = `
                💨 <strong>Time Travelling:</strong> Zoom! <strong>${lab3State.flewAway} birds</strong> are flying out of the tree!
            `;
        }
        if (questionPanel) questionPanel.style.display = 'none';
    } else if (step === 0) {
        birdsToFly.forEach(b => b.classList.remove('flying-away'));
        if (storyEl) {
            storyEl.innerHTML = `
                ⏮️ <strong>In the Past (Start):</strong> Time machine set to the start! The ${lab3State.flewAway} birds flew back to the tree. <br>
                Let's count them: we have <strong>${lab3State.initialBirds} birds</strong> in total!
            `;
        }
        if (questionPanel) questionPanel.style.display = 'flex';
        renderBirdOptions();
    }
}

function answerBirdQuestion(ans) {
    if (ans === lab3State.initialBirds) {
        lab3State.answered = true;
        // Record Success
        trackAnswer('birds', true);
        showSuccessPopup(`Mystery Solved! At the start, there were ${lab3State.initialBirds} birds. Flying away is reversed by flying back: ${lab3State.nowLeft} birds left + ${lab3State.flewAway} that returned = ${lab3State.initialBirds} birds!`);
        renderBirdOptions();
    } else {
        // Record incorrect attempt
        trackAnswer('birds', false);
        alert("Oops! Drag the time machine slider back to 'Start (Past)' to watch the birds fly back and count them all.");
    }
}

function renderBirdOptions() {
    const optionsContainer = document.getElementById('bird-options');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    
    if (lab3State.answered) {
        optionsContainer.innerHTML = '<div style="font-weight: 700; color: var(--color-success); font-size: 1.2rem; text-align:center; width:100%;">Correct! You solved the mystery!</div>';
        return;
    }

    const correct = lab3State.initialBirds;
    const choices = [correct, lab3State.nowLeft, lab3State.flewAway, correct + 2];
    
    // Remove duplicates and filter valid numbers
    const uniqueChoices = [...new Set(choices)].filter(c => c > 0).sort(() => Math.random() - 0.5);
    
    uniqueChoices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'bubble-btn primary';
        btn.style.padding = '10px 20px';
        btn.style.fontSize = '1.2rem';
        btn.value = c;
        btn.textContent = c;
        btn.onclick = () => answerBirdQuestion(c);
        optionsContainer.appendChild(btn);
    });
}


// ==========================================================================
// LAB 4: Base-10 & Ten-Frames (Magic Tray Snapper)
// ==========================================================================
let lab4State = {
    type: 'add',
    numA: 8,
    numB: 5,
    dotsMoved: 0,
    dotsPopped: 0
};

function resetLab4() {
    loadLab4Problem('add', 8, 5);
}

function loadLab4Problem(type, numA, numB) {
    lab4State.type = type;
    lab4State.numA = numA;
    lab4State.numB = numB;
    lab4State.dotsMoved = 0;
    lab4State.dotsPopped = 0;
    
    const frame1 = document.getElementById('ten-frame-1');
    const frame2 = document.getElementById('ten-frame-2');
    if (!frame1 || !frame2) return;
    
    frame1.innerHTML = '';
    frame2.innerHTML = '';
    
    document.getElementById('step-row-2').classList.remove('active');
    document.getElementById('step-row-3').classList.remove('active');
    
    if (type === 'add') {
        document.getElementById('frame-2-title').textContent = 'Tray 2';
        document.getElementById('step-math-1').textContent = `${numA} + ${numB} = ?`;
        document.getElementById('step-desc-2').textContent = 'Grouping to fill Tray 1:';
        document.getElementById('step-math-2').textContent = `${numA} + ${10 - numA} + ${numB - (10 - numA)}`;
        document.getElementById('step-math-3').textContent = `10 + ${numB - (10 - numA)} = ${numA + numB}`;
        
        document.getElementById('ten-frame-instruction').innerHTML = `
            Drag dots from <strong>Tray 2</strong> to fill the empty slots in <strong>Tray 1</strong>!
        `;
        
        // Create 10 slots for Frame 1
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'ten-frame-slot';
            if (i < numA) {
                const dot = document.createElement('div');
                dot.className = 'ten-frame-dot blue';
                slot.appendChild(dot);
            } else {
                slot.className += ' empty-slot';
                slot.setAttribute('ondragover', 'allowDrop(event)');
                slot.setAttribute('ondrop', 'dropDotEvent(event)');
            }
            frame1.appendChild(slot);
        }
        
        // Create 10 slots for Frame 2
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'ten-frame-slot';
            if (i < numB) {
                const dot = document.createElement('div');
                dot.className = 'ten-frame-dot red';
                dot.id = `snap-dot-${i}`;
                dot.draggable = true;
                dot.setAttribute('ondragstart', 'drag(event)');
                slot.appendChild(dot);
            }
            frame2.appendChild(slot);
        }
    } else {
        // Subtraction mode
        document.getElementById('frame-2-title').textContent = `Tray 2 (+${numA - 10} extra)`;
        document.getElementById('step-math-1').textContent = `${numA} - ${numB} = ?`;
        document.getElementById('step-desc-2').textContent = 'Pop down to 10 first:';
        
        const extra = numA - 10;
        document.getElementById('step-math-2').textContent = `${numA} - ${extra} = 10`;
        document.getElementById('step-math-3').textContent = `10 - ${numB - extra} = ${numA - numB}`;
        
        document.getElementById('ten-frame-instruction').innerHTML = `
            Pop <strong>${extra} dots</strong> in Tray 2 first to leave exactly 10!
        `;
        
        // Frame 1 has 10 dots (source is f1)
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'ten-frame-slot';
            const dot = document.createElement('div');
            dot.className = 'ten-frame-dot blue';
            dot.onclick = function() { popDot(this, 'f1'); };
            slot.appendChild(dot);
            frame1.appendChild(slot);
        }
        
        // Frame 2 has extra dots (source is f2)
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'ten-frame-slot';
            if (i < extra) {
                const dot = document.createElement('div');
                dot.className = 'ten-frame-dot red';
                dot.onclick = function() { popDot(this, 'f2'); };
                slot.appendChild(dot);
            }
            frame2.appendChild(slot);
        }
    }
}

function dropDotEvent(ev) {
    ev.preventDefault();
    let dotId = ev.dataTransfer.getData("text");
    moveDotToSlot(dotId, ev.currentTarget);
}

function startCustomSnapAdd() {
    let x = parseInt(document.getElementById('snap-x').value);
    let y = parseInt(document.getElementById('snap-y').value);
    if (x > 10) {
        alert("Tray 1 cannot have more than 10 dots for adding!");
        return;
    }
    loadLab4Problem('add', x, y);
}

function startCustomSnapSub() {
    let x = parseInt(document.getElementById('snap-x').value);
    let y = parseInt(document.getElementById('snap-y').value);
    if (x <= 10) {
        alert("Total dots must be greater than 10 to practice crossing-ten subtraction!");
        return;
    }
    loadLab4Problem('sub', x, y);
}

function moveDotToSlot(dotId, slot) {
    const dot = document.getElementById(dotId);
    if (!dot || slot.children.length > 0) return;
    
    playSound('pop'); // snapping dot pop
    slot.appendChild(dot);
    dot.draggable = false; // Make it lock
    
    // Remove listeners so we don't drop on it again
    slot.removeEventListener('dragover', allowDrop);
    
    lab4State.dotsMoved++;
    const needed = 10 - lab4State.numA;
    
    if (lab4State.dotsMoved === needed) {
        document.getElementById('step-row-2').classList.add('active');
        document.getElementById('ten-frame-instruction').innerHTML = `
            Tray 1 is now full! Now count the rest: <strong>10 + ${lab4State.numB - needed} = ${lab4State.numA + lab4State.numB}</strong>
        `;
        
        setTimeout(() => {
            document.getElementById('step-row-3').classList.add('active');
            
            // Record Success
            trackAnswer('snapper', true);
            showSuccessPopup(`Success! We filled a tray: ${lab4State.numA} and ${lab4State.numB} snaps together to make a full tray of 10 plus ${lab4State.numB - needed} left over, which is ${lab4State.numA + lab4State.numB}!`);
        }, 800);
    }
}

function popDot(dotEl, frameSource) {
    const extra = lab4State.numA - 10;
    
    if (frameSource === 'f2') {
        if (lab4State.dotsPopped >= extra) {
            trackAnswer('snapper', false); // wrong order
            alert("Wait! Pop the dots in Tray 2 first to leave exactly 10 in Tray 1!");
            return;
        }
        
        playSound('pop');
        dotEl.style.transform = 'scale(0)';
        setTimeout(() => dotEl.remove(), 200);
        
        lab4State.dotsPopped++;
        
        if (lab4State.dotsPopped === extra) {
            document.getElementById('step-row-2').classList.add('active');
            const remainingToPop = lab4State.numB - extra;
            document.getElementById('ten-frame-instruction').innerHTML = `
                Tray 2 is clear! We have exactly 10 in Tray 1. <br>
                Now pop <strong>${remainingToPop} more dots</strong> from Tray 1!
            `;
        }
    } else if (frameSource === 'f1') {
        if (lab4State.dotsPopped < extra) {
            trackAnswer('snapper', false); // wrong order
            alert(`Wait! Pop the ${extra - lab4State.dotsPopped} dots in Tray 2 first to leave exactly 10.`);
            return;
        }
        
        const totalTarget = lab4State.numB;
        if (lab4State.dotsPopped >= totalTarget) {
            playSound('error');
            return;
        }
        
        playSound('pop');
        dotEl.style.transform = 'scale(0)';
        setTimeout(() => dotEl.remove(), 200);
        
        lab4State.dotsPopped++;
        
        if (lab4State.dotsPopped === totalTarget) {
            document.getElementById('step-row-3').classList.add('active');
            document.getElementById('ten-frame-instruction').innerHTML = `
                All ${totalTarget} dots popped! We have <strong>${lab4State.numA - totalTarget}</strong> remaining!
            `;
            setTimeout(() => {
                // Record Success
                trackAnswer('snapper', true);
                showSuccessPopup(`Success! We popped ${totalTarget} dots out of ${lab4State.numA} by popping ${extra} to make 10, then popping ${totalTarget - extra} more to leave exactly ${lab4State.numA - totalTarget}!`);
            }, 800);
        }
    }
}


// ==========================================================================
// LAB 5: The Array Garden (Carrot Farming Grid)
// ==========================================================================
let lab5State = {
    mode: 'none'
};

function resetLab5() {
    document.getElementById('garden-rows').value = 3;
    document.getElementById('garden-cols').value = 4;
    document.getElementById('garden-item').value = '🥕';
    setGardenMode('none');
}

function setGardenMode(mode) {
    playSound('click');
    lab5State.mode = mode;
    
    document.getElementById('btn-mode-none').classList.toggle('active', mode === 'none');
    document.getElementById('btn-mode-rows').classList.toggle('active', mode === 'rows');
    document.getElementById('btn-mode-cols').classList.toggle('active', mode === 'cols');
    
    // Exploring layout awards stars!
    if (mode === 'rows' || mode === 'cols') {
        trackAnswer('farm', true);
    }
    updateGarden();
}

function updateGarden() {
    const grid = document.getElementById('garden-grid');
    const formula = document.getElementById('garden-math');
    if (!grid || !formula) return;
    
    let rows = parseInt(document.getElementById('garden-rows').value);
    let cols = parseInt(document.getElementById('garden-cols').value);
    let item = document.getElementById('garden-item').value;
    
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.style.cssText = `
                display:flex; justify-content:center; align-items:center; font-size:2rem;
                background:#fef08a; border:3px solid var(--border-color); border-radius:12px;
                height:60px; box-shadow:inset 0 -4px 0 #fde047; transition: all 0.2s;
            `;
            
            if (lab5State.mode === 'rows') {
                cell.style.backgroundColor = r % 2 === 0 ? '#bbf7d0' : '#86efac'; // Alternating row color
            } else if (lab5State.mode === 'cols') {
                cell.style.backgroundColor = c % 2 === 0 ? '#bfdbfe' : '#93c5fd'; // Alternating col color
            }
            
            cell.textContent = item;
            grid.appendChild(cell);
        }
    }
    
    const total = rows * cols;
    let repeatedAddText = '';
    if (lab5State.mode === 'rows') {
        repeatedAddText = ' &rarr; Repeated Addition by Rows: ' + Array(rows).fill(cols).join(' + ') + ' = ' + total;
    } else if (lab5State.mode === 'cols') {
        repeatedAddText = ' &rarr; Repeated Addition by Columns: ' + Array(cols).fill(rows).join(' + ') + ' = ' + total;
    }
    
    formula.innerHTML = `<strong>${rows} rows</strong> of <strong>${cols}</strong> = <strong>${total}</strong> total plants.${repeatedAddText}`;
}


// ==========================================================================
// PRINTABLE KIT GENERATOR
// ==========================================================================
function generatePrintable(type) {
    playSound('click');
    const printArea = document.getElementById('printable-area');
    if (!printArea) return;
    
    let printHtml = '';
    
    if (type === 'ten-frames') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:40px; color:#1e293b;">
                <h2 style="text-align:center; font-size:2rem; margin-bottom:10px;">🧮 Ten-Frames & Counter Dots Craft Kit</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:30px;">Cut out the trays and dots to practice adding and subtraction by bridging ten!</p>
                
                <div style="display:flex; flex-direction:column; gap:40px; align-items:center; margin-bottom:50px;">
                    <!-- Tray 1 -->
                    <div style="border:4px solid #1e293b; border-radius:16px; padding:15px; width:500px; background:#fff;">
                        <div style="font-weight:bold; margin-bottom:10px; font-size:1.2rem;">Magic Tray 1</div>
                        <div style="display:grid; grid-template-columns:repeat(5, 1fr); grid-template-rows:repeat(2, 1fr); gap:10px; height:180px;">
                            ${Array(10).fill('<div style="border:3px dashed #cbd5e1; border-radius:12px; background:#f8fafc;"></div>').join('')}
                        </div>
                    </div>
                    
                    <!-- Magic Tray 2 -->
                    <div style="border:4px solid #1e293b; border-radius:16px; padding:15px; width:500px; background:#fff;">
                        <div style="font-weight:bold; margin-bottom:10px; font-size:1.2rem;">Magic Tray 2</div>
                        <div style="display:grid; grid-template-columns:repeat(5, 1fr); grid-template-rows:repeat(2, 1fr); gap:10px; height:180px;">
                            ${Array(10).fill('<div style="border:3px dashed #cbd5e1; border-radius:12px; background:#f8fafc;"></div>').join('')}
                        </div>
                    </div>
                </div>
                
                <div style="border-top:3px dashed #cbd5e1; padding-top:30px; text-align:center;">
                    <h3 style="margin-bottom:15px;">🔴 Blue & Red Counter Dots (Cut along circular lines)</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:15px; justify-content:center;">
                        ${Array(10).fill('<div style="width:45px; height:45px; border-radius:50%; border:3px solid #1e293b; background:#3b82f6; display:flex; justify-content:center; align-items:center; font-weight:bold; color:white;">1</div>').join('')}
                        ${Array(10).fill('<div style="width:45px; height:45px; border-radius:50%; border:3px solid #1e293b; background:#ef4444; display:flex; justify-content:center; align-items:center; font-weight:bold; color:white;">1</div>').join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'fact-houses') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:40px; color:#1e293b; display:flex; flex-direction:column; align-items:center;">
                <h2 style="text-align:center; font-size:2rem; margin-bottom:10px;">🏡 Secret Fact Family Houses</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:40px;">Fill in the numbers in the roofs and write down the addition/subtraction equations!</p>
                
                <div style="display:flex; gap:50px; justify-content:center; width:100%; flex-wrap:wrap;">
                    <!-- House 1 -->
                    <div style="width:300px; border:4px solid #1e293b; border-radius:24px; padding:20px; background:#fff; display:flex; flex-direction:column; align-items:center; position:relative; min-height:400px; margin-top:50px;">
                        <div style="position:absolute; top:-40px; left:-4px; width:calc(100% + 8px); height:40px; background:#f97316; border:4px solid #1e293b; clip-path:polygon(50% 0%, 0% 100%, 100% 100%);"></div>
                        <div style="display:flex; justify-content:space-between; width:100%; margin-top:-20px; z-index:10; margin-bottom:30px;">
                            <div style="width:40px; height:40px; border-radius:50%; border:3px solid #1e293b; background:#fff; display:flex; justify-content:center; align-items:center; font-weight:bold;"></div>
                            <div style="width:40px; height:40px; border-radius:50%; border:3px solid #1e293b; background:#fff; display:flex; justify-content:center; align-items:center; font-weight:bold; transform:translateY(-15px);"></div>
                            <div style="width:40px; height:40px; border-radius:50%; border:3px solid #1e293b; background:#fff; display:flex; justify-content:center; align-items:center; font-weight:bold;"></div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:15px; width:100%; margin-top:20px;">
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ + ___ = ___</div>
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ + ___ = ___</div>
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ - ___ = ___</div>
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ - ___ = ___</div>
                        </div>
                    </div>
                    
                    <!-- House 2 -->
                    <div style="width:300px; border:4px solid #1e293b; border-radius:24px; padding:20px; background:#fff; display:flex; flex-direction:column; align-items:center; position:relative; min-height:400px; margin-top:50px;">
                        <div style="position:absolute; top:-40px; left:-4px; width:calc(100% + 8px); height:40px; background:#a855f7; border:4px solid #1e293b; clip-path:polygon(50% 0%, 0% 100%, 100% 100%);"></div>
                        <div style="display:flex; justify-content:space-between; width:100%; margin-top:-20px; z-index:10; margin-bottom:30px;">
                            <div style="width:40px; height:40px; border-radius:50%; border:3px solid #1e293b; background:#fff; display:flex; justify-content:center; align-items:center; font-weight:bold;"></div>
                            <div style="width:40px; height:40px; border-radius:50%; border:3px solid #1e293b; background:#fff; display:flex; justify-content:center; align-items:center; font-weight:bold; transform:translateY(-15px);"></div>
                            <div style="width:40px; height:40px; border-radius:50%; border:3px solid #1e293b; background:#fff; display:flex; justify-content:center; align-items:center; font-weight:bold;"></div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:15px; width:100%; margin-top:20px;">
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ + ___ = ___</div>
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ + ___ = ___</div>
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ - ___ = ___</div>
                            <div style="border-bottom:2px dashed #cbd5e1; height:30px; font-size:1.2rem; text-align:center;">___ - ___ = ___</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'match-cards') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:30px; color:#1e293b;">
                <h2 style="text-align:center; font-size:1.8rem; margin-bottom:5px;">🎴 Fact Family Matching Memory Cards</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:20px;">Cut out the cards to play memory match. Match an addition card to its subtraction cousin!</p>
                
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:15px; justify-items:center;">
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#eff6ff;">
                        <div style="font-size:0.8rem; color:#3b82f6; font-weight:bold;">ADDITION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">6 + 5 = 11</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#fef2f2;">
                        <div style="font-size:0.8rem; color:#ef4444; font-weight:bold;">SUBTRACTION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">11 - 6 = 5</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#eff6ff;">
                        <div style="font-size:0.8rem; color:#3b82f6; font-weight:bold;">ADDITION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">8 + 4 = 12</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#fef2f2;">
                        <div style="font-size:0.8rem; color:#ef4444; font-weight:bold;">SUBTRACTION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">12 - 4 = 8</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#eff6ff;">
                        <div style="font-size:0.8rem; color:#3b82f6; font-weight:bold;">ADDITION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">7 + 3 = 10</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#fef2f2;">
                        <div style="font-size:0.8rem; color:#ef4444; font-weight:bold;">SUBTRACTION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">10 - 7 = 3</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#eff6ff;">
                        <div style="font-size:0.8rem; color:#3b82f6; font-weight:bold;">ADDITION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">5 + 6 = 11</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                    <div style="width:130px; height:180px; border:3px solid #1e293b; border-radius:12px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; background:#fef2f2;">
                        <div style="font-size:0.8rem; color:#ef4444; font-weight:bold;">SUBTRACTION</div>
                        <div style="font-size:1.4rem; font-weight:bold;">11 - 5 = 6</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">Math Lab Kit</div>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'array-grids') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:40px; color:#1e293b;">
                <h2 style="text-align:center; font-size:2rem; margin-bottom:10px;">📏 Array Drawing & Grid Paper</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:35px;">Draw your own rows and columns of crops! Write the repeated addition sums below your grids.</p>
                
                <div style="display:flex; justify-content:center; margin-bottom:40px;">
                    <div style="display:grid; grid-template-columns:repeat(15, 25px); grid-template-rows:repeat(10, 25px); border:3px solid #1e293b; background:#fff; gap:1px; background-color:#cbd5e1; padding:1px;">
                        ${Array(150).fill('<div style="background:#fff;"></div>').join('')}
                    </div>
                </div>
                
                <div style="border:3px solid #1e293b; border-radius:16px; padding:20px; background:#f8fafc; font-size:1.1rem; line-height:1.8;">
                    <strong>My Garden Array:</strong><br>
                    1. I drew ____ rows and ____ columns of __________________.<br>
                    2. Repeated Addition: _________________________________________ = ________ total.<br>
                    3. Multiplication: ______ &times; ______ = ________ total.
                </div>
            </div>
        `;
    } else if (type === 'lilypad-game') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:30px; color:#1e293b;">
                <h2 style="text-align:center; font-size:2rem; margin-bottom:10px;">🐸 Lilypad Pond Board Game</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:20px;">Cut out the frog tokens and movement cards, then follow the numbered path to reach the big water lily at 20!</p>
                
                <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; margin-bottom:30px; background:#e0f2fe; padding:20px; border-radius:16px; border:3px solid #0284c7;">
                    ${Array(21).fill(0).map((_, i) => `
                        <div style="border:3px solid #0284c7; border-radius:50% 50% 40% 40%; background:#22c55e; color:#fff; display:flex; flex-direction:column; justify-content:center; align-items:center; height:65px; font-weight:bold; font-size:1.1rem; position:relative; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                            <span style="font-size:0.7rem; color:#fef08a;">PAD</span>
                            ${i}
                        </div>
                    `).join('')}
                    <div style="border:3px dashed #0284c7; border-radius:12px; background:#fff; display:flex; justify-content:center; align-items:center; grid-column:span 3; font-weight:bold; color:#0284c7;">
                        🐸 Cut-Out Frogs: 🐸 Green 🐸 Pink 🐸 Yellow
                    </div>
                </div>

                <div style="border-top:3px dashed #cbd5e1; padding-top:20px;">
                    <h3 style="text-align:center; margin-bottom:15px;">🃏 Movement Cards (Cut out and draw from a deck)</h3>
                    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#f0fdf4;">
                            <div style="font-weight:bold; color:#15803d; font-size:1.2rem;">Hop +2</div>
                            <span style="font-size:0.8rem; color:#64748b;">Jump forward 2 pads</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#f0fdf4;">
                            <div style="font-weight:bold; color:#15803d; font-size:1.2rem;">Hop +5</div>
                            <span style="font-size:0.8rem; color:#64748b;">Jump forward 5 pads</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#fef2f2;">
                            <div style="font-weight:bold; color:#b91c1c; font-size:1.2rem;">Slip -1</div>
                            <span style="font-size:0.8rem; color:#64748b;">Slide back 1 pad</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#fef2f2;">
                            <div style="font-weight:bold; color:#b91c1c; font-size:1.2rem;">Slip -3</div>
                            <span style="font-size:0.8rem; color:#64748b;">Slide back 3 pads</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#f0fdf4;">
                            <div style="font-weight:bold; color:#15803d; font-size:1.2rem;">Hop +3</div>
                            <span style="font-size:0.8rem; color:#64748b;">Jump forward 3 pads</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#f0fdf4;">
                            <div style="font-weight:bold; color:#15803d; font-size:1.2rem;">Hop +10</div>
                            <span style="font-size:0.8rem; color:#64748b;">Giant leap 10 pads!</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#fef2f2;">
                            <div style="font-weight:bold; color:#b91c1c; font-size:1.2rem;">Slip -2</div>
                            <span style="font-size:0.8rem; color:#64748b;">Slide back 2 pads</span>
                        </div>
                        <div style="border:2px solid #1e293b; padding:10px; border-radius:8px; text-align:center; background:#fff7ed;">
                            <div style="font-weight:bold; color:#c2410c; font-size:1.2rem;">Double Hop</div>
                            <span style="font-size:0.8rem; color:#64748b;">Multiply your next hop by 2!</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'clock-craft') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:30px; color:#1e293b; display:flex; flex-direction:column; align-items:center;">
                <h2 style="text-align:center; font-size:2rem; margin-bottom:10px;">⏰ My Tick-Tock Craft Clock</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:20px;">Cut out the round clock face, the hour hand, and the minute hand. Pin them in the center with a paper fastener!</p>
                
                <div style="width:320px; height:320px; border:8px solid #475569; border-radius:50%; background:#fff; position:relative; display:flex; justify-content:center; align-items:center; margin-bottom:30px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <!-- Center Pin Hole -->
                    <div style="width:16px; height:16px; border-radius:50%; background:#1e293b; z-index:10; border:2px solid #fff;"></div>
                    
                    <!-- Clock Numbers -->
                    ${[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num, i) => {
                        const angle = (i * 30) * Math.PI / 180;
                        const radius = 125;
                        const x = Math.round(radius * Math.sin(angle));
                        const y = Math.round(-radius * Math.cos(angle));
                        return `
                            <div style="position:absolute; font-weight:bold; font-size:1.6rem; color:#1e293b; width:40px; height:40px; display:flex; justify-content:center; align-items:center; transform:translate(${x}px, ${y}px);">
                                ${num}
                            </div>
                        `;
                    }).join('')}

                    <!-- Clock Minutes Indicators -->
                    ${[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min, i) => {
                        const angle = (i * 30) * Math.PI / 180;
                        const radius = 90;
                        const x = Math.round(radius * Math.sin(angle));
                        const y = Math.round(-radius * Math.cos(angle));
                        return `
                            <div style="position:absolute; font-weight:normal; font-size:0.8rem; color:#64748b; width:30px; height:30px; display:flex; justify-content:center; align-items:center; transform:translate(${x}px, ${y}px); border-radius:50%; background:#f1f5f9;">
                                :${min.toString().padStart(2, '0')}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="border-top:3px dashed #cbd5e1; width:100%; padding-top:20px; display:flex; gap:40px; justify-content:center; align-items:center;">
                    <div>
                        <h4 style="margin-bottom:10px;">✂️ Cut-Out Clock Hands:</h4>
                        <div style="display:flex; flex-direction:column; gap:20px; padding:15px; border:2px dashed #64748b; background:#f8fafc; border-radius:12px;">
                            <!-- Hour Hand -->
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:75px; height:18px; background:#ef4444; border:2px solid #1e293b; border-radius:10px 0 0 10px; position:relative;">
                                    <div style="position:absolute; right:-14px; top:-3px; border-left:16px solid #ef4444; border-top:10px solid transparent; border-bottom:10px solid transparent; width:0; height:0;"></div>
                                </div>
                                <span style="font-weight:bold; font-size:0.9rem; color:#ef4444;">Short Hour Hand</span>
                            </div>
                            <!-- Minute Hand -->
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:110px; height:14px; background:#3b82f6; border:2px solid #1e293b; border-radius:10px 0 0 10px; position:relative;">
                                    <div style="position:absolute; right:-14px; top:-5px; border-left:16px solid #3b82f6; border-top:10px solid transparent; border-bottom:10px solid transparent; width:0; height:0;"></div>
                                </div>
                                <span style="font-weight:bold; font-size:0.9rem; color:#3b82f6;">Long Minute Hand</span>
                            </div>
                        </div>
                    </div>
                    <div style="max-width:300px; font-size:0.9rem; color:#475569; line-height:1.6;">
                        <strong>💡 How to play:</strong><br>
                        Set the hour and minute hands to show times like <strong>3:00</strong>, <strong>4:30</strong>, or <strong>6:15</strong>. Can your child read it and match it to their digital clock?
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'tangram-blocks') {
        printHtml = `
            <div class="print-sheet" style="font-family:'Fredoka', sans-serif; padding:30px; color:#1e293b;">
                <h2 style="text-align:center; font-size:2rem; margin-bottom:10px;">📐 Tangram Geometric Blocks</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:25px;">Cut out these colorful shapes and try to fit them together to build animals, boats, and houses!</p>
                
                <!-- Tangram Shapes Board -->
                <div style="display:flex; justify-content:center; gap:30px; margin-bottom:30px;">
                    <div style="border:4px solid #1e293b; padding:20px; background:#fff; border-radius:16px; display:flex; flex-wrap:wrap; gap:15px; width:360px; justify-content:center; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                        <!-- Big Triangle Red -->
                        <div style="width:0; height:0; border-left:80px solid transparent; border-right:80px solid transparent; border-bottom:80px solid #ef4444; position:relative; margin-bottom:10px;">
                            <div style="position:absolute; top:40px; left:-35px; color:#fff; font-weight:bold; font-size:0.9rem;">Cut 1</div>
                        </div>
                        <!-- Big Triangle Blue -->
                        <div style="width:0; height:0; border-left:80px solid transparent; border-right:80px solid transparent; border-bottom:80px solid #3b82f6; position:relative; margin-bottom:10px;">
                            <div style="position:absolute; top:40px; left:-35px; color:#fff; font-weight:bold; font-size:0.9rem;">Cut 2</div>
                        </div>
                        <!-- Medium Triangle Purple -->
                        <div style="width:0; height:0; border-left:55px solid transparent; border-right:55px solid transparent; border-bottom:55px solid #a855f7; position:relative;">
                            <div style="position:absolute; top:25px; left:-25px; color:#fff; font-weight:bold; font-size:0.8rem;">Cut 3</div>
                        </div>
                        <!-- Square Orange -->
                        <div style="width:75px; height:75px; background:#f97316; border:3px solid #1e293b; border-radius:6px; display:flex; justify-content:center; align-items:center; color:#fff; font-weight:bold; font-size:0.9rem;">
                            Cut 4
                        </div>
                        <!-- Small Triangle Green -->
                        <div style="width:0; height:0; border-left:40px solid transparent; border-right:40px solid transparent; border-bottom:40px solid #22c55e; position:relative;">
                            <div style="position:absolute; top:15px; left:-18px; color:#fff; font-weight:bold; font-size:0.7rem;">Cut 5</div>
                        </div>
                        <!-- Small Triangle Yellow -->
                        <div style="width:0; height:0; border-left:40px solid transparent; border-right:40px solid transparent; border-bottom:40px solid #eab308; position:relative;">
                            <div style="position:absolute; top:15px; left:-18px; color:#fff; font-weight:bold; font-size:0.7rem;">Cut 6</div>
                        </div>
                        <!-- Parallelogram Pink -->
                        <div style="width:90px; height:50px; background:#ec4899; transform:skew(20deg); border:3px solid #1e293b; display:flex; justify-content:center; align-items:center; color:#fff; font-weight:bold; font-size:0.9rem; margin-left:10px;">
                            Cut 7
                        </div>
                    </div>
                </div>

                <div style="border-top:3px dashed #cbd5e1; padding-top:20px; display:grid; grid-template-columns:repeat(2, 1fr); gap:20px;">
                    <div style="border:3px dashed #cbd5e1; border-radius:12px; padding:15px; background:#fafafa; text-align:center; height:200px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                        <h4 style="margin-bottom:10px; color:#64748b;">🎨 Mystery Animal Silhouette</h4>
                        <!-- Simple drawing outline using shapes -->
                        <div style="width:120px; height:120px; border:3px solid #94a3b8; border-radius:8px; display:flex; justify-content:center; align-items:center; background:#fff; position:relative;">
                            <div style="width:0; height:0; border-left:35px solid transparent; border-right:35px solid transparent; border-bottom:35px solid #cbd5e1;"></div>
                            <div style="width:35px; height:35px; background:#cbd5e1; border:2px solid #cbd5e1; transform:rotate(45deg); position:absolute; top:20px;"></div>
                        </div>
                        <span style="font-size:0.8rem; color:#94a3b8; margin-top:5px;">Place shapes here to build a Fox!</span>
                    </div>
                    <div style="border:3px dashed #cbd5e1; border-radius:12px; padding:15px; background:#fafafa; text-align:center; height:200px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                        <h4 style="margin-bottom:10px; color:#64748b;">⛵ Mystery Boat Silhouette</h4>
                        <div style="width:120px; height:120px; border:3px solid #94a3b8; border-radius:8px; display:flex; justify-content:center; align-items:center; background:#fff; position:relative;">
                            <div style="width:0; height:0; border-left:45px solid transparent; border-right:45px solid transparent; border-bottom:45px solid #cbd5e1; transform:rotate(-45deg); position:absolute; left:15px; top:15px;"></div>
                            <div style="width:90px; height:25px; background:#cbd5e1; transform:skew(-20deg); position:absolute; bottom:15px;"></div>
                        </div>
                        <span style="font-size:0.8rem; color:#94a3b8; margin-top:5px;">Place shapes here to build a Boat!</span>
                    </div>
                </div>
            </div>
        `;
    }
    printArea.innerHTML = printHtml;
    window.print();
}

function updateParentConfig() {
    const limitEl = document.getElementById('config-max-limit');
    if (limitEl) {
        profileState.config.maxNumberLimit = parseInt(limitEl.value) || 20;
        saveProfile();
    }
}

// ==========================================================================
// ADVENTURE 6: Frog Lilypad Jumper
// ==========================================================================
let lab6State = {
    frogPos: 0,
    targetPos: 0,
    numA: 0,
    numB: 0,
    isSub: false
};

function loadLab6Problem() {
    const maxVal = profileState.config.maxNumberLimit || 20;
    lab6State.isSub = Math.random() < 0.5;
    
    if (lab6State.isSub) {
        lab6State.numA = Math.floor(Math.random() * (maxVal - 5)) + 6;
        lab6State.numB = Math.floor(Math.random() * (lab6State.numA - 2)) + 2;
        lab6State.frogPos = lab6State.numA;
        lab6State.targetPos = lab6State.numA - lab6State.numB;
    } else {
        lab6State.targetPos = Math.floor(Math.random() * (maxVal - 5)) + 6;
        lab6State.numA = Math.floor(Math.random() * (lab6State.targetPos - 3)) + 2;
        lab6State.numB = lab6State.targetPos - lab6State.numA;
        lab6State.frogPos = lab6State.numA;
    }
    
    const line = document.getElementById('lilypad-line');
    if (line) {
        line.innerHTML = '';
        for (let i = 0; i <= maxVal; i++) {
            const pad = document.createElement('div');
            pad.className = `pond-lilypad ${i === lab6State.frogPos ? 'active' : ''}`;
            pad.id = `lilypad-${i}`;
            pad.textContent = i;
            pad.onclick = () => selectLilypadDirectly(i);
            line.appendChild(pad);
        }
        const frog = document.createElement('div');
        frog.className = 'frog-token';
        frog.id = 'pond-frog';
        frog.textContent = '🐸';
        const currentActive = document.getElementById(`lilypad-${lab6State.frogPos}`);
        if (currentActive) currentActive.appendChild(frog);
    }
    
    const formula = document.getElementById('frog-formula');
    if (formula) {
        formula.innerHTML = `${lab6State.numA} ${lab6State.isSub ? '-' : '+'} ${lab6State.numB} = <span style="border-bottom: 3px dashed var(--text-color); padding: 0 15px;" id="frog-answer">?</span>`;
    }
    const status = document.getElementById('frog-status');
    if (status) status.innerHTML = '';
}

function selectLilypadDirectly(index) {
    if (index === lab6State.frogPos) return;
    playSound('splash');
    const oldActive = document.getElementById(`lilypad-${lab6State.frogPos}`);
    const newActive = document.getElementById(`lilypad-${index}`);
    const frog = document.getElementById('pond-frog');
    if (oldActive && newActive && frog) {
        oldActive.classList.remove('active');
        newActive.classList.add('active');
        newActive.appendChild(frog);
        lab6State.frogPos = index;
        const ans = document.getElementById('frog-answer');
        if (ans) ans.textContent = index;
    }
}

function jumpFrog(amount) {
    const maxVal = profileState.config.maxNumberLimit || 20;
    const nextPos = Math.max(0, Math.min(maxVal, lab6State.frogPos + amount));
    selectLilypadDirectly(nextPos);
}

function checkFrogPosition() {
    const status = document.getElementById('frog-status');
    if (!status) return;
    if (lab6State.frogPos === lab6State.targetPos) {
        trackAnswer('frogger', true);
        showSuccessPopup(`Ribbit! You hopped the frog to ${lab6State.targetPos}! ${lab6State.numA} ${lab6State.isSub ? 'minus' : 'plus'} ${lab6State.numB} is exactly ${lab6State.targetPos}!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Ribbit! Perfect hop!</span>`;
    } else {
        playSound('sad');
        trackAnswer('frogger', false);
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Oops, the frog landed on ${lab6State.frogPos}! Let's count hops and try again!</span>`;
    }
}

// ==========================================================================
// ADVENTURE 7: Pizza Party Fraction
// ==========================================================================
let lab7State = {
    slicesCount: 4,
    orderWhole: 1,
    orderPart: 2,
    orderTopping: '🍕',
    selectedToppings: [],
    slicesInTray: 0
};

function loadLab7Problem() {
    const denominators = [2, 3, 4];
    const den = denominators[Math.floor(Math.random() * denominators.length)];
    const num = Math.floor(Math.random() * (den - 1)) + 1;
    const toppings = ['🍕', '🍍', '🍄'];
    const topping = toppings[Math.floor(Math.random() * toppings.length)];
    
    lab7State.slicesCount = den;
    lab7State.orderWhole = den;
    lab7State.orderPart = num;
    lab7State.orderTopping = topping;
    lab7State.selectedToppings = [];
    lab7State.slicesInTray = 0;
    
    const customer = document.getElementById('pizza-customer');
    if (customer) {
        const toppingName = topping === '🍕' ? 'Pepperoni' : topping === '🍍' ? 'Pineapple' : 'Mushroom';
        customer.innerHTML = `🛎️ Customer: "Please serve me <strong>${num}/${den}</strong> of a pizza decorated with <strong>${toppingName}</strong>!"`;
    }
    const tray = document.getElementById('pizza-delivery-tray');
    if (tray) {
        tray.textContent = 'No slices selected';
        tray.style.background = 'white';
    }
    const status = document.getElementById('pizza-status');
    if (status) status.textContent = '';
    
    cutPizza(den);
}

function cutPizza(slices) {
    playSound('click');
    lab7State.slicesCount = slices;
    const linesContainer = document.getElementById('pizza-cut-lines');
    if (linesContainer) {
        linesContainer.innerHTML = '';
        for (let i = 0; i < slices; i++) {
            const angle = (360 / slices) * i;
            const line = document.createElement('div');
            line.className = 'pizza-fraction-line';
            line.style.transform = `rotate(${angle}deg)`;
            linesContainer.appendChild(line);
        }
    }
    redrawPizzaToppings();
}

function addPizzaTopping(emoji) {
    playSound('pop');
    lab7State.selectedToppings.push(emoji);
    redrawPizzaToppings();
}

function resetPizzaToppings() {
    playSound('click');
    lab7State.selectedToppings = [];
    redrawPizzaToppings();
}

function redrawPizzaToppings() {
    const container = document.getElementById('pizza-toppings');
    if (!container) return;
    container.innerHTML = '';
    const slices = lab7State.slicesCount;
    lab7State.selectedToppings.forEach((t, idx) => {
        const sliceIdx = idx % slices;
        const sliceAngle = (360 / slices) * sliceIdx + (180 / slices);
        const radius = 45;
        const rad = (sliceAngle * Math.PI) / 180;
        const x = 75 + radius * Math.sin(rad);
        const y = 75 - radius * Math.cos(rad);
        
        const item = document.createElement('div');
        item.className = 'pizza-topping-item';
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.textContent = t;
        container.appendChild(item);
    });
}

function addSliceToTray() {
    if (lab7State.slicesInTray >= lab7State.slicesCount) {
        playSound('sad');
        return;
    }
    playSound('click');
    lab7State.slicesInTray++;
    
    const tray = document.getElementById('pizza-delivery-tray');
    if (tray) {
        tray.style.background = '#fef2f2';
        tray.innerHTML = `
            <div style="font-size:3rem; margin-bottom:5px;">🍕</div>
            <div style="font-size:1.15rem; font-weight:800;">${lab7State.slicesInTray} Slices</div>
            <div style="font-size:0.8rem; color:#ef4444; cursor:pointer;" onclick="removeSliceFromTray()">(Take back a slice)</div>
        `;
    }
}

function removeSliceFromTray() {
    if (lab7State.slicesInTray <= 0) return;
    playSound('click');
    lab7State.slicesInTray--;
    
    const tray = document.getElementById('pizza-delivery-tray');
    if (tray) {
        if (lab7State.slicesInTray === 0) {
            tray.textContent = 'No slices selected';
            tray.style.background = 'white';
        } else {
            tray.innerHTML = `
                <div style="font-size:3rem; margin-bottom:5px;">🍕</div>
                <div style="font-size:1.15rem; font-weight:800;">${lab7State.slicesInTray} Slices</div>
                <div style="font-size:0.8rem; color:#ef4444; cursor:pointer;" onclick="removeSliceFromTray()">(Take back a slice)</div>
            `;
        }
    }
}

function deliverPizza() {
    const status = document.getElementById('pizza-status');
    if (!status) return;
    const target = lab7State.orderPart;
    const slices = lab7State.slicesInTray;
    const hasTopping = lab7State.selectedToppings.includes(lab7State.orderTopping);
    
    if (slices === target && hasTopping) {
        trackAnswer('pizza', true);
        showSuccessPopup(`Delicious! You sliced the pizza into ${lab7State.slicesCount} parts, added ${lab7State.orderTopping}, and served exactly ${target}/${lab7State.slicesCount} slices!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Yum! Chef badge unlocked!</span>`;
    } else {
        playSound('sad');
        trackAnswer('pizza', false);
        if (!hasTopping) {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Wait, you forgot the customer's favorite topping: ${lab7State.orderTopping}!</span>`;
        } else {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Close! Customer wanted ${target} slices, but you served ${slices} slices! Let's recount!</span>`;
        }
    }
}

// ==========================================================================
// ADVENTURE 8: Telling Time Clock
// ==========================================================================
let lab8State = {
    targetHour: 3,
    targetMinute: 30,
    currentHour: 12,
    currentMinute: 0
};

function loadLab8Problem() {
    lab8State.targetHour = Math.floor(Math.random() * 12) + 1;
    const mins = [0, 15, 30, 45];
    lab8State.targetMinute = mins[Math.floor(Math.random() * mins.length)];
    
    lab8State.currentHour = 12;
    lab8State.currentMinute = 0;
    
    const hrStr = String(lab8State.targetHour).padStart(2, '0');
    const minStr = String(lab8State.targetMinute).padStart(2, '0');
    const targetEl = document.getElementById('clock-target');
    if (targetEl) targetEl.textContent = `Target Time: ${hrStr}:${minStr}`;
    
    const status = document.getElementById('clock-status');
    if (status) status.textContent = '';
    
    updateClockVisuals();
}

function adjustClockTime(type, amount) {
    playSound('ticktock');
    if (type === 'hour') {
        lab8State.currentHour = ((lab8State.currentHour + amount - 1) % 12) + 1;
    } else {
        lab8State.currentMinute = (lab8State.currentMinute + amount) % 60;
    }
    updateClockVisuals();
}

function resetClockToDefault() {
    playSound('click');
    lab8State.currentHour = 12;
    lab8State.currentMinute = 0;
    updateClockVisuals();
}

function updateClockVisuals() {
    const minAngle = lab8State.currentMinute * 6;
    const hourAngle = (lab8State.currentHour % 12) * 30 + lab8State.currentMinute * 0.5;
    
    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    if (hourHand) hourHand.style.transform = `rotate(${hourAngle}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minAngle}deg)`;
    
    const isNight = lab8State.currentHour >= 7 || lab8State.currentHour <= 5;
    const sky = document.getElementById('sky-backdrop');
    const body = document.getElementById('sky-body');
    const desc = document.getElementById('sky-desc');
    if (sky && body && desc) {
        if (isNight) {
            sky.style.background = 'linear-gradient(to right, #1e1b4b, #312e81)';
            body.textContent = '🌙';
            body.style.transform = 'rotate(180deg)';
            desc.textContent = 'Night Time!';
            desc.style.color = '#bfdbfe';
        } else {
            sky.style.background = 'linear-gradient(to right, #38bdf8, #bae6fd)';
            body.textContent = '☀️';
            body.style.transform = 'rotate(0deg)';
            desc.textContent = 'Day Time!';
            desc.style.color = '#0369a1';
        }
    }
}

function checkClockTime() {
    const status = document.getElementById('clock-status');
    if (!status) return;
    if (lab8State.currentHour === lab8State.targetHour && lab8State.currentMinute === lab8State.targetMinute) {
        trackAnswer('clock', true);
        const hrStr = String(lab8State.targetHour).padStart(2, '0');
        const minStr = String(lab8State.targetMinute).padStart(2, '0');
        showSuccessPopup(`Tick Tock! Excellent! The clock hands show exactly ${hrStr}:${minStr}!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Tick Tock! Perfect time setting!</span>`;
    } else {
        playSound('sad');
        trackAnswer('clock', false);
        const curHrStr = String(lab8State.currentHour).padStart(2, '0');
        const curMinStr = String(lab8State.currentMinute).padStart(2, '0');
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Your clock currently shows ${curHrStr}:${curMinStr}. Try spinning hands to match the target!</span>`;
    }
}

// ==========================================================================
// ADVENTURE 9: Geometric Shape Builder
// ==========================================================================
let lab9State = {
    placedShapes: {},
    targetPattern: [5, 6, 9, 10],
    symmetryLineActive: false
};
let activeSelectedShape = { type: 'square', icon: '🟦', color: 'blue' };

function loadLab9Problem() {
    lab9State.placedShapes = {};
    lab9State.symmetryLineActive = false;
    lab9State.targetPattern = [5, 6, 9, 10];
    
    const board = document.getElementById('tangram-board');
    if (board) {
        board.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const tile = document.createElement('div');
            tile.style.cssText = `
                width: 100%; height: 100%; border: 2px dashed #cbd5e1; border-radius: 8px;
                display: flex; justify-content: center; align-items: center; cursor: pointer;
                transition: all 0.2s ease; box-sizing: border-box; background: white;
            `;
            if (lab9State.targetPattern.includes(i)) {
                tile.style.background = '#f1f5f9';
                tile.style.borderColor = '#94a3b8';
            }
            tile.onclick = () => selectTangramTile(i);
            tile.id = `tangram-tile-${i}`;
            board.appendChild(tile);
        }
    }
    
    const drawer = document.getElementById('tangram-drawer');
    if (drawer) {
        drawer.innerHTML = '';
        const shapes = [
            { type: 'triangle', icon: '🔺', color: 'red' },
            { type: 'square', icon: '🟦', color: 'blue' },
            { type: 'hexagon', icon: '🟨', color: 'yellow' }
        ];
        shapes.forEach(s => {
            const btn = document.createElement('button');
            btn.className = `tangram-tile`;
            btn.style.cssText = `
                width: 46px; height: 46px; font-size: 1.3rem; background: white;
                display: flex; justify-content: center; align-items: center; border-radius: 12px;
                cursor: pointer; border: 3px solid var(--border-color); box-shadow: 0 3px 0 var(--border-color);
            `;
            btn.innerHTML = s.icon;
            btn.onclick = () => addShapeToSelection(s.type, s.icon, s.color);
            drawer.appendChild(btn);
        });
    }
    
    const symmetryBtn = document.getElementById('tangram-symmetry-btn');
    if (symmetryBtn) {
        symmetryBtn.textContent = '🪞 Turn Symmetry Line ON';
        symmetryBtn.classList.remove('success');
    }
    const status = document.getElementById('tangram-status');
    if (status) status.textContent = '';
}

function addShapeToSelection(type, icon, color) {
    playSound('click');
    activeSelectedShape = { type, icon, color };
}

function selectTangramTile(index) {
    if (lab9State.placedShapes[index]) {
        playSound('click');
        lab9State.placedShapes[index].rotation = (lab9State.placedShapes[index].rotation + 90) % 360;
        updateTangramTileVisual(index);
        
        if (lab9State.symmetryLineActive) {
            const symIndex = getSymmetricalIndex(index);
            if (symIndex !== null && lab9State.placedShapes[symIndex]) {
                lab9State.placedShapes[symIndex].rotation = lab9State.placedShapes[index].rotation;
                updateTangramTileVisual(symIndex);
            }
        }
        return;
    }
    
    playSound('pop');
    lab9State.placedShapes[index] = {
        type: activeSelectedShape.type,
        icon: activeSelectedShape.icon,
        color: activeSelectedShape.color,
        rotation: 0
    };
    updateTangramTileVisual(index);
    
    if (lab9State.symmetryLineActive) {
        const symIndex = getSymmetricalIndex(index);
        if (symIndex !== null && !lab9State.placedShapes[symIndex]) {
            lab9State.placedShapes[symIndex] = {
                type: activeSelectedShape.type,
                icon: activeSelectedShape.icon,
                color: activeSelectedShape.color,
                rotation: 0
            };
            updateTangramTileVisual(symIndex);
        }
    }
}

function getSymmetricalIndex(idx) {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const refCol = 3 - col;
    return row * 4 + refCol;
}

function updateTangramTileVisual(index) {
    const tile = document.getElementById(`tangram-tile-${index}`);
    if (!tile) return;
    const shape = lab9State.placedShapes[index];
    if (shape) {
        tile.innerHTML = `<span style="display:inline-block; transition:transform 0.2s ease; transform: rotate(${shape.rotation}deg);">${shape.icon}</span>`;
        tile.style.background = '#f8fafc';
    } else {
        tile.innerHTML = '';
        if (lab9State.targetPattern.includes(index)) {
            tile.style.background = '#f1f5f9';
        } else {
            tile.style.background = 'white';
        }
    }
}

function toggleTangramSymmetry() {
    playSound('click');
    lab9State.symmetryLineActive = !lab9State.symmetryLineActive;
    const btn = document.getElementById('tangram-symmetry-btn');
    if (btn) {
        btn.textContent = lab9State.symmetryLineActive ? '🪞 Turn Symmetry Line OFF' : '🪞 Turn Symmetry Line ON';
        btn.classList.toggle('success', lab9State.symmetryLineActive);
    }
    const board = document.getElementById('tangram-board');
    if (board) {
        if (lab9State.symmetryLineActive) {
            board.style.borderLeft = '4px dashed #3b82f6';
            board.style.borderRight = '4px dashed #3b82f6';
        } else {
            board.style.borderLeft = '4px dashed var(--border-color)';
            board.style.borderRight = '4px dashed var(--border-color)';
        }
    }
}

function checkTangram() {
    const status = document.getElementById('tangram-status');
    if (!status) return;
    let correct = true;
    lab9State.targetPattern.forEach(idx => {
        if (!lab9State.placedShapes[idx]) correct = false;
    });
    for (let i = 0; i < 16; i++) {
        if (!lab9State.targetPattern.includes(i) && lab9State.placedShapes[i]) correct = false;
    }
    if (correct) {
        trackAnswer('tangram', true);
        showSuccessPopup("Awesome Tangram! You matched the layout pattern and filled the silhouette blocks perfectly!");
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Fantastic builder! Silhouette matched!</span>`;
    } else {
        playSound('sad');
        trackAnswer('tangram', false);
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Silhouette is not filled correctly. Add shapes only to the gray boxes!</span>`;
    }
}

// ==========================================================================
// ADVENTURE 10: Money Toy Market
// ==========================================================================
let lab10State = {
    targetPrice: 35,
    paidAmount: 0,
    coinsList: []
};

function loadLab10Problem() {
    const toy = toysList[Math.floor(Math.random() * toysList.length)];
    lab10State.targetPrice = toy.price;
    lab10State.paidAmount = 0;
    lab10State.coinsList = [];
    
    const emojiEl = document.getElementById('market-toy-emoji');
    const nameEl = document.getElementById('market-toy-name');
    const priceEl = document.getElementById('market-toy-price');
    if (emojiEl) emojiEl.textContent = toy.emoji;
    if (nameEl) nameEl.textContent = toy.name;
    if (priceEl) priceEl.textContent = `${toy.price}¢`;
    
    clearCoinsVisuals();
    const status = document.getElementById('market-status');
    if (status) status.textContent = '';
}

function addCoinToCounter(val) {
    playSound('chime');
    lab10State.paidAmount += val;
    lab10State.coinsList.push(val);
    
    const paidEl = document.getElementById('market-paid-total');
    if (paidEl) paidEl.textContent = lab10State.paidAmount;
    
    const counterArea = document.getElementById('market-counter-area');
    if (counterArea) {
        const coin = document.createElement('div');
        coin.className = 'coin-counter-item';
        coin.textContent = val === 25 ? '🪙' : val === 10 ? '🪙' : val === 5 ? '🪙' : '🥉';
        coin.title = `${val}¢`;
        coin.onclick = () => removeCoin(coin, val);
        counterArea.appendChild(coin);
    }
}

function removeCoin(el, val) {
    playSound('click');
    lab10State.paidAmount -= val;
    const paidEl = document.getElementById('market-paid-total');
    if (paidEl) paidEl.textContent = lab10State.paidAmount;
    const idx = lab10State.coinsList.indexOf(val);
    if (idx > -1) lab10State.coinsList.splice(idx, 1);
    el.remove();
}

function clearCoins() {
    playSound('click');
    lab10State.paidAmount = 0;
    lab10State.coinsList = [];
    clearCoinsVisuals();
}

function clearCoinsVisuals() {
    const paidEl = document.getElementById('market-paid-total');
    if (paidEl) paidEl.textContent = 0;
    const counterArea = document.getElementById('market-counter-area');
    if (counterArea) counterArea.innerHTML = '';
}

function buyToy() {
    const status = document.getElementById('market-status');
    if (!status) return;
    if (lab10State.paidAmount === lab10State.targetPrice) {
        trackAnswer('market', true);
        showSuccessPopup(`Ka-ching! You paid exactly ${lab10State.targetPrice}¢ and bought the toy! Excellent change counting!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Toy purchased! Ka-ching!</span>`;
    } else {
        playSound('sad');
        trackAnswer('market', false);
        if (lab10State.paidAmount > lab10State.targetPrice) {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Too much change! You paid ${lab10State.paidAmount}¢ but it only costs ${lab10State.targetPrice}¢. Sweep it!</span>`;
        } else {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Not enough change! You paid ${lab10State.paidAmount}¢ but we need ${lab10State.targetPrice}¢!</span>`;
        }
    }
}

// ==========================================================================
// ADVENTURE 11: Shape Balance Riddles
// ==========================================================================
let lab11State = {
    starValue: 2,
    starCount: 3,
    targetTriangles: 6,
    inputAnswer: 0
};

function loadLab11Problem() {
    lab11State.starValue = Math.floor(Math.random() * 3) + 2;
    lab11State.starCount = Math.floor(Math.random() * 3) + 2;
    lab11State.targetTriangles = lab11State.starValue * lab11State.starCount;
    lab11State.inputAnswer = 0;
    
    const card = document.getElementById('riddle-card');
    if (card) card.innerHTML = `If <strong>1 Star</strong> 🌟 = <strong>${lab11State.starValue} Triangles</strong> 🔺`;
    
    const question = document.getElementById('riddle-question');
    if (question) question.innerHTML = `How many Triangles 🔺 balance <strong>${lab11State.starCount} Stars</strong> 🌟?`;
    
    const input = document.getElementById('riddle-answer-input');
    if (input) input.value = 0;
    
    const status = document.getElementById('riddle-status');
    if (status) status.textContent = '';
    
    updateRiddleScale();
}

function adjustRiddleInput(amount) {
    playSound('click');
    const input = document.getElementById('riddle-answer-input');
    if (input) {
        let val = Math.max(0, Math.min(25, parseInt(input.value) + amount));
        input.value = val;
        lab11State.inputAnswer = val;
        updateRiddleScale();
    }
}

function updateRiddleScale() {
    const leftPan = document.getElementById('riddle-left-pan-content');
    if (leftPan) {
        leftPan.innerHTML = '';
        for (let i = 0; i < lab11State.starCount; i++) {
            const star = document.createElement('span');
            star.textContent = '🌟';
            star.style.fontSize = '1.3rem';
            leftPan.appendChild(star);
        }
    }
    const rightPan = document.getElementById('riddle-right-pan-content');
    if (rightPan) {
        rightPan.innerHTML = '';
        for (let i = 0; i < lab11State.inputAnswer; i++) {
            const tri = document.createElement('span');
            tri.textContent = '🔺';
            tri.style.fontSize = '1.2rem';
            rightPan.appendChild(tri);
        }
    }
    const leftWeight = lab11State.starCount * lab11State.starValue;
    const rightWeight = lab11State.inputAnswer;
    let diff = rightWeight - leftWeight;
    let angle = Math.max(-10, Math.min(10, diff * 1.8));
    const beam = document.getElementById('riddle-scale-beam');
    if (beam) beam.style.transform = `rotate(${angle}deg)`;
}

function checkRiddle() {
    const status = document.getElementById('riddle-status');
    if (!status) return;
    if (lab11State.inputAnswer === lab11State.targetTriangles) {
        trackAnswer('algebra', true);
        showSuccessPopup(`Excellent deduction! Since 1 star = ${lab11State.starValue} triangles, then ${lab11State.starCount} stars equals ${lab11State.starCount} × ${lab11State.starValue} = ${lab11State.targetTriangles} triangles!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Balanced! Scales level!</span>`;
    } else {
        playSound('sad');
        trackAnswer('algebra', false);
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ The scale is still tilted! Recalculate exchange values.</span>`;
    }
}

// ==========================================================================
// ADVENTURE 12: Alligator Comparison
// ==========================================================================
let lab12State = {
    leftCount: 0,
    rightCount: 0,
    selectedOperator: '>'
};

function loadLab12Problem() {
    lab12State.leftCount = Math.floor(Math.random() * 8) + 2;
    lab12State.rightCount = Math.floor(Math.random() * 8) + 2;
    lab12State.selectedOperator = '>';
    
    const leftBowl = document.getElementById('gator-left-bowl');
    const rightBowl = document.getElementById('gator-right-bowl');
    if (leftBowl) {
        leftBowl.innerHTML = '';
        for (let i = 0; i < lab12State.leftCount; i++) {
            const fish = document.createElement('span');
            fish.textContent = '🐠';
            leftBowl.appendChild(fish);
        }
    }
    if (rightBowl) {
        rightBowl.innerHTML = '';
        for (let i = 0; i < lab12State.rightCount; i++) {
            const fish = document.createElement('span');
            fish.textContent = '🐠';
            rightBowl.appendChild(fish);
        }
    }
    
    const leftLabel = document.getElementById('gator-left-count');
    const rightLabel = document.getElementById('gator-right-count');
    if (leftLabel) leftLabel.textContent = lab12State.leftCount;
    if (rightLabel) rightLabel.textContent = lab12State.rightCount;
    
    selectGatorOp('>');
    const status = document.getElementById('gator-status');
    if (status) status.textContent = '';
}

function selectGatorOp(op) {
    playSound('click');
    lab12State.selectedOperator = op;
    const btnGt = document.getElementById('gator-op-gt');
    const btnLt = document.getElementById('gator-op-lt');
    const btnEq = document.getElementById('gator-op-eq');
    if (btnGt) btnGt.classList.toggle('active', op === '>');
    if (btnLt) btnLt.classList.toggle('active', op === '<');
    if (btnEq) btnEq.classList.toggle('active', op === '=');
    
    const gator = document.getElementById('gator-visual');
    if (gator) {
        if (op === '>') {
            gator.textContent = '🐊';
            gator.style.transform = 'scaleX(1)';
        } else if (op === '<') {
            gator.textContent = '🐊';
            gator.style.transform = 'scaleX(-1)';
        } else {
            gator.textContent = '🎀';
            gator.style.transform = 'none';
        }
    }
}

function checkGator() {
    const status = document.getElementById('gator-status');
    if (!status) return;
    const left = lab12State.leftCount;
    const right = lab12State.rightCount;
    const op = lab12State.selectedOperator;
    
    let correct = false;
    if (op === '>' && left > right) correct = true;
    if (op === '<' && left < right) correct = true;
    if (op === '=' && left === right) correct = true;
    
    if (correct) {
        trackAnswer('alligator', true);
        showSuccessPopup(`Yum! The hungry alligator eats the bigger number of fish! ${left} is ${op === '>' ? 'greater than' : op === '<' ? 'less than' : 'equal to'} ${right}!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Yum Yum! Gator is happy!</span>`;
    } else {
        playSound('sad');
        trackAnswer('alligator', false);
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ The alligator wants to eat the larger pile. Spin the mouth toward it!</span>`;
    }
}

// ==========================================================================
// ADVENTURE 13: Skip Counting Balloon Pop
// ==========================================================================
let lab13State = {
    sequence: [],
    missingIndex: 2,
    targetValue: 0
};

function loadLab13Problem() {
    const factors = [2, 5, 10, 3];
    const step = factors[Math.floor(Math.random() * factors.length)];
    const start = Math.floor(Math.random() * 4) + 1;
    
    const seq = [];
    for (let i = 0; i < 5; i++) seq.push(start * step + i * step);
    
    const missingIdx = Math.floor(Math.random() * 3) + 1;
    const target = seq[missingIdx];
    
    lab13State.sequence = seq;
    lab13State.missingIndex = missingIdx;
    lab13State.targetValue = target;
    
    const displaySeq = [...seq];
    displaySeq[missingIdx] = '?';
    const sequenceEl = document.getElementById('balloon-sequence');
    if (sequenceEl) sequenceEl.textContent = displaySeq.join(' , ');
    
    const sky = document.getElementById('balloon-sky');
    if (sky) {
        sky.innerHTML = '';
        const wrong1 = target + step * (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
        const wrong2 = target + step * (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 3);
        const options = [target, wrong1, wrong2].filter(o => o > 0);
        
        while (options.length < 3) {
            options.push(target + Math.floor(Math.random() * 20) + 1);
        }
        options.sort(() => Math.random() - 0.5);
        const colors = ['#f43f5e', '#0ea5e9', '#eab308', '#22c55e', '#a855f7'];
        
        options.forEach((val, idx) => {
            const balloon = document.createElement('div');
            balloon.className = 'sky-balloon';
            balloon.textContent = val;
            balloon.style.background = colors[idx % colors.length];
            balloon.style.borderColor = '#1e293b';
            balloon.style.animationDelay = `${idx * 1.5}s`;
            balloon.onclick = () => popSkyBalloon(balloon, val);
            sky.appendChild(balloon);
        });
    }
    const status = document.getElementById('balloon-status');
    if (status) status.textContent = '';
}

function popSkyBalloon(el, val) {
    const status = document.getElementById('balloon-status');
    if (!status) return;
    playSound('pop');
    el.style.transform = 'scale(1.4)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 150);
    
    if (val === lab13State.targetValue) {
        trackAnswer('balloon', true);
        showSuccessPopup(`POP! Excellent! ${lab13State.targetValue} completes the sequence: ${lab13State.sequence.join(', ')}!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 POP! Perfect number popped!</span>`;
        const sequenceEl = document.getElementById('balloon-sequence');
        if (sequenceEl) sequenceEl.textContent = lab13State.sequence.join(' , ');
    } else {
        playSound('sad');
        trackAnswer('balloon', false);
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Pop! Oops, ${val} doesn't fit the sequence. Try another balloon!</span>`;
    }
}

// ==========================================================================
// ADVENTURE 14: Measurement Ruler
// ==========================================================================
let lab14State = {
    targetLength: 6,
    inputLength: 0,
    creatureName: 'caterpillar'
};

const creatures = [
    { name: 'caterpillar 🐛', emoji: '🐛', length: 6 },
    { name: 'earthworm 🪱', emoji: '🪱', length: 4 },
    { name: 'ladybug 🐞', emoji: '🐞', length: 2 },
    { name: 'lizard 🦎', emoji: '🦎', length: 7 },
    { name: 'scuttling bug 🕷️', emoji: '🕷️', length: 5 }
];

function loadLab14Problem() {
    const c = creatures[Math.floor(Math.random() * creatures.length)];
    lab14State.targetLength = c.length;
    lab14State.creatureName = c.name;
    lab14State.inputLength = 0;
    
    const desc = document.getElementById('measure-target-desc');
    if (desc) desc.innerHTML = `Measure the <strong>${c.name}</strong> from head to tail!`;
    
    const creature = document.getElementById('measure-creature');
    if (creature) {
        creature.textContent = c.emoji;
        // set visual width of creature (e.g. 1 inch is 38px)
        creature.style.width = `${c.length * 38}px`;
        creature.style.letterSpacing = `${c.length > 4 ? 4 : 2}px`;
    }
    const ruler = document.getElementById('measure-ruler');
    if (ruler) ruler.style.left = '10px';
    
    const input = document.getElementById('measure-answer-input');
    if (input) input.value = 0;
    
    const status = document.getElementById('measure-status');
    if (status) status.textContent = '';
}

function adjustMeasureInput(amount) {
    playSound('click');
    const input = document.getElementById('measure-answer-input');
    if (input) {
        let val = Math.max(0, Math.min(10, parseInt(input.value) + amount));
        input.value = val;
        lab14State.inputLength = val;
    }
}

function checkMeasurement() {
    const status = document.getElementById('measure-status');
    if (!status) return;
    if (lab14State.inputLength === lab14State.targetLength) {
        trackAnswer('measure', true);
        showSuccessPopup(`Well measured! The ${lab14State.creatureName} is exactly ${lab14State.targetLength} inches long!`);
        status.innerHTML = `<span style="color:var(--color-success)">🎉 Correct! Measurement master!</span>`;
    } else {
        playSound('sad');
        trackAnswer('measure', false);
        status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Not quite! Line up the ruler's '0' mark with the head and check tail count.</span>`;
    }
}

// Simple draggable ruler implementation
let isDraggingRuler = false;
let startX = 0;
let rulerLeft = 10;

window.addEventListener('DOMContentLoaded', () => {
    const ruler = document.getElementById('measure-ruler');
    if (ruler) {
        ruler.addEventListener('mousedown', (e) => {
            isDraggingRuler = true;
            startX = e.clientX;
            rulerLeft = parseInt(ruler.style.left) || 10;
        });
        ruler.addEventListener('touchstart', (e) => {
            isDraggingRuler = true;
            startX = e.touches[0].clientX;
            rulerLeft = parseInt(ruler.style.left) || 10;
        });
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingRuler) return;
    const dx = e.clientX - startX;
    const ruler = document.getElementById('measure-ruler');
    if (ruler) {
        let nextLeft = Math.max(0, Math.min(140, rulerLeft + dx));
        ruler.style.left = `${nextLeft}px`;
    }
});
window.addEventListener('touchmove', (e) => {
    if (!isDraggingRuler) return;
    const dx = e.touches[0].clientX - startX;
    const ruler = document.getElementById('measure-ruler');
    if (ruler) {
        let nextLeft = Math.max(0, Math.min(140, rulerLeft + dx));
        ruler.style.left = `${nextLeft}px`;
    }
});
window.addEventListener('mouseup', () => { isDraggingRuler = false; });
window.addEventListener('touchend', () => { isDraggingRuler = false; });

const toysList = [
    { emoji: '🧸', name: 'Teddy Bear', price: 35 },
    { emoji: '🎈', name: 'Magic Balloon', price: 12 },
    { emoji: '🚗', name: 'Toy Racing Car', price: 65 },
    { emoji: '✈️', name: 'Paper Plane', price: 40 },
    { emoji: '🤖', name: 'Bubbly Robot', price: 80 }
];


// Initialize application on page load
window.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get('game');
    if (game) {
        switchView(game);
    } else {
        switchView('dashboard');
    }
});


// ==========================================================================
// LAB 15: Character Evolution
// ==========================================================================
let lab15State = {
    currentStage: 1,
    maxStage: 24,
    features: [], 
    targetValue: 0,
    currentValue: 0,
    puzzleType: ''
};

function resetLab15() {
    lab15State.currentStage = 1;
    lab15State.features = [];
    saveProfile();
    loadLab15Stage(lab15State.currentStage);
}

function updateEvolutionAvatar() {
    const avatar = document.getElementById('evolution-avatar');
    if (!avatar) return;
    
    avatar.className = 'avatar-stick';
    lab15State.features.forEach(f => avatar.classList.add(f));
    
    // Update character display name based on evolution level
    const nameEl = avatar.parentElement ? avatar.parentElement.querySelector('.hero-name-label') : null;
    const level = lab15State.features.length;
    const titles = [
        'Stick Figure', 'Sprout Rookie', 'Quick Scout', 'Brave Warrior', 'Vanguard Knight',
        'Valiant Champion', 'Arena Legend', 'Grand Master', 'Ascended Hero', 'Cosmic Guardian',
        'Divine Paladin', 'Epic Overlord', 'Iron Titan', 'Rune Warden', 'Flame Phoenix',
        'Mythic Sage', 'Astral Sovereign', 'Eternal Dragon', 'Infinity Lord', 'Universal Hero',
        'Ascended Legend', 'Quantum Guardian', 'Nebula Overlord', 'Supernova Legend', 'Omnipresent Creator'
    ];
    if (nameEl) {
        nameEl.textContent = titles[Math.min(level, titles.length - 1)];
    }
    const levelEl = document.getElementById('hero-level-num');
    if (levelEl) levelEl.textContent = level;
    
    // Flash the avatar on evolution
    if (level > 0) {
        avatar.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
        avatar.style.transform = 'scale(1.1)';
        avatar.style.boxShadow = '0 0 20px rgba(34,197,94,0.5)';
        setTimeout(() => {
            avatar.style.transform = 'scale(1)';
            avatar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
        }, 600);
    }
    
    const bar = document.getElementById('evolution-progress-bar');
    if (bar) {
        bar.style.width = ((lab15State.currentStage - 1) / lab15State.maxStage * 100) + '%';
    }
}

function nextEvolutionStage(featureReward) {
    if (featureReward && !lab15State.features.includes(featureReward)) {
        lab15State.features.push(featureReward);
    }
    
    trackAnswer('evolution', true, { stage: lab15State.currentStage });
    
    lab15State.currentStage++;
    updateEvolutionAvatar();
    
    const status = document.getElementById('evolution-status');
    if (status) {
        status.innerHTML = '<span style="color:var(--color-success)">🎉 Stage Cleared! Evolving... 🎉</span>';
    }
    
    setTimeout(() => {
        if (lab15State.currentStage > 24) {
            if (status) status.innerHTML = '<span style="color:var(--color-success)">🎉 You completed ALL 24 evolution stages! You are the ultimate Hero! 🎉</span>';
        } else {
            loadLab15Stage(lab15State.currentStage);
        }
    }, 2500);
}


function getStageParams(stageNum) {
    const stageIdx = Math.max(1, Math.min(24, stageNum));
    
    const stages = {
        // --- LEVEL 1 (Stages 1 - 8) ---
        1: { type: 'bridge', target: 6, blocks: [2, 3, 4, -1, -2], clicks: [2, 3, 4, -1, -2] },
        2: { type: 'water', target: 8, blocks: [2, 3, 5, -2], clicks: [2, 3, 5, -2] },
        3: { type: 'sub_bridge', start: 10, target: 6, slices: [1, 2, 3, 5], clicks: [1, 2, 3, 5] },
        4: { type: 'area', target: 6, targetW: 3, targetH: 2, blocks: [[2, 2, 1], [1, 1, 1], [3, 3, 1], [4, 2, 2]], clicks: [{w:2, h:1}, {w:1, h:1}, {w:3, h:1}, {w:2, h:2}] },
        5: { type: 'electricity', target: 7, blocks: [2, 3, 5, -2], clicks: [2, 3, 5, -2] },
        6: { type: 'clock', target: 3.0, clicks: [1.0, 2.0, 3.0] },
        7: { type: 'fraction', target: 0.5, pieces: 4, targetPieces: 2, clicks: [1, 2] },
        8: { type: 'pattern', target: 1, sequence: ['sphere', 'box', 'sphere', 'box'], clicks: [1, 2, 3] },

        // --- LEVEL 2 (Stages 9 - 16) ---
        9: { type: 'bridge', target: 12, blocks: [3, 4, 6, -1, -2], clicks: [3, 4, 6, -1, -2] },
        10: { type: 'water', target: 15, blocks: [3, 5, 8, -3], clicks: [3, 5, 8, -3] },
        11: { type: 'sub_bridge', start: 18, target: 10, slices: [2, 3, 4, 8], clicks: [2, 3, 4, 8] },
        12: { type: 'area', target: 12, targetW: 4, targetH: 3, blocks: [[4, 2, 2], [2, 2, 1], [3, 3, 1], [6, 3, 2]], clicks: [{w:2, h:2}, {w:2, h:1}, {w:3, h:1}, {w:3, h:2}] },
        13: { type: 'electricity', target: 14, blocks: [3, 5, 8, -3], clicks: [3, 5, 8, -3] },
        14: { type: 'clock', target: 6.5, clicks: [1.0, 2.0, 0.5] },
        15: { type: 'fraction', target: 0.75, pieces: 8, targetPieces: 6, clicks: [1, 3] },
        16: { type: 'pattern', target: 2, sequence: ['sphere', 'sphere', 'box', 'sphere', 'sphere'], clicks: [1, 2, 3] },

        // --- LEVEL 3 (Stages 17 - 24) ---
        17: { type: 'bridge', target: 20, blocks: [5, 8, 12, -2, -4], clicks: [5, 8, 12, -2, -4] },
        18: { type: 'water', target: 22, blocks: [4, 6, 10, -4], clicks: [4, 6, 10, -4] },
        19: { type: 'sub_bridge', start: 28, target: 15, slices: [3, 4, 5, 8, 13], clicks: [3, 4, 5, 8, 13] },
        20: { type: 'area', target: 20, targetW: 5, targetH: 4, blocks: [[6, 3, 2], [8, 4, 2], [4, 2, 2], [2, 2, 1]], clicks: [{w:3, h:2}, {w:4, h:2}, {w:2, h:2}, {w:2, h:1}] },
        21: { type: 'electricity', target: 24, blocks: [5, 8, 12, -5], clicks: [5, 8, 12, -5] },
        22: { type: 'clock', target: 9.75, clicks: [1.0, 2.0, 0.5, 0.25] },
        23: { type: 'fraction', target: 0.625, pieces: 8, targetPieces: 5, clicks: [1, 2] },
        24: { type: 'pattern', target: 3, sequence: ['sphere', 'box', 'cylinder', 'sphere', 'box'], clicks: [1, 2, 3] }
    };
    
    return stages[stageIdx] || stages[1];
}

function loadLab15Stage(stageNum) {
    updateEvolutionAvatar();
    const stageHeader = document.getElementById('lab15-stage-header');
    const instruction = document.getElementById('puzzle-instruction');
    const scene = document.getElementById('puzzle-scene');
    const controls = document.getElementById('puzzle-controls');
    const status = document.getElementById('evolution-status');
    
    if(!stageHeader || !instruction || !scene || !controls || !status) return;
    status.innerHTML = '';
    scene.innerHTML = '';
    controls.innerHTML = '';
    
    const params = getStageParams(stageNum);
    lab15State.puzzleType = params.type;
    lab15State.targetValue = params.target;
    lab15State.currentValue = 0;

    // Compute dynamic scale based on target parameters to prevent overflow
    let scale = 15; // default
    if (params.type === 'bridge') {
        scale = Math.max(4, Math.min(20, 450 / params.target));
    } else if (params.type === 'hill') {
        scale = Math.max(4, Math.min(15, 140 / params.target));
    } else if (params.type === 'sub_bridge') {
        const maxVal = Math.max(params.target, params.start || 0);
        scale = Math.max(4, Math.min(20, 450 / maxVal));
    } else if (params.type === 'area') {
        const scaleW = 350 / params.targetW;
        const scaleH = 140 / params.targetH;
        scale = Math.max(6, Math.min(20, scaleW, scaleH));
    }
    lab15State.scale = scale;

    const titles = {
        'bridge': 'The Gap Bridge',
        'hill': 'The High Wall',
        'sub_bridge': 'The Subtraction River',
        'area': 'The Area Wall',
        'balance': 'The Balance Gate',
        'water': 'The Water Jar',
        'electricity': 'The Power Circuit',
        'clock': 'The Clock Tower',
        'fraction': 'The Fraction Forest',
        'pattern': 'The Pattern Sequence'
    };
    
    stageHeader.textContent = `Stage ${stageNum}: ${titles[params.type]}`;

    if (params.type === 'bridge') {
        instruction.innerHTML = `<span style="color:#3b82f6;">🌉</span> Build a bridge exactly <strong style="color:#2563eb; font-size:1.3rem;">${params.target}</strong> units long!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; position:relative;">
                <div style="flex:1; height:80px; background:linear-gradient(180deg,#475569,#334155); border-radius:12px 12px 0 0; border-right:4px solid #94a3b8; box-shadow:inset 0 -4px 8px rgba(0,0,0,0.3);">
                    <div style="padding:10px; text-align:right; color:#94a3b8; font-weight:700; font-size:0.8rem;">🚶 Start</div>
                </div>
                <div id="bridge-gap" style="width:${params.target * lab15State.scale}px; height:40px; border-bottom:4px dashed #60a5fa; background:repeating-linear-gradient(90deg, rgba(96,165,250,0.08) 0px, rgba(96,165,250,0.08) 10px, transparent 10px, transparent 20px); display:flex; gap:0; align-items:flex-end; justify-content:flex-start; box-sizing:border-box; position:relative;">
                    <div style="position:absolute; bottom:-22px; left:50%; transform:translateX(-50%); font-size:0.7rem; color:#60a5fa; font-weight:700;">${params.target} units</div>
                </div>
                <div style="flex:1; height:80px; background:linear-gradient(180deg,#475569,#334155); border-radius:12px 12px 0 0; border-left:4px solid #94a3b8; box-shadow:inset 0 -4px 8px rgba(0,0,0,0.3);">
                    <div style="padding:10px; color:#94a3b8; font-weight:700; font-size:0.8rem;">🏁 Goal</div>
                </div>
            </div>
        `;
        let buttonsHTML = params.blocks.map(b => {
            if (b > 0) return `<button class="bubble-btn primary" onclick="addEvolutionBlock(${b})">➕ Add ${b}</button>`;
            return `<button class="bubble-btn danger" onclick="addEvolutionBlock(${b})">➖ Remove ${Math.abs(b)}</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Bridge</button>
        `;
    } 
    else if (params.type === 'hill') {
        instruction.innerHTML = `<span style="color:#22c55e;">🧱</span> Stack blocks exactly <strong style="color:#16a34a; font-size:1.3rem;">${params.target}</strong> units high!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; gap:0;">
                <div id="hill-stack" style="width:80px; height:${params.target * lab15State.scale}px; border:4px dashed #86efac; border-bottom:none; border-right:none; display:flex; flex-direction:column-reverse; align-items:center; gap:0; box-sizing:border-box; background:repeating-linear-gradient(0deg, rgba(134,239,172,0.06) 0px, rgba(134,239,172,0.06) 10px, transparent 10px, transparent 20px);"></div>
                <div style="width:80px; height:${params.target * lab15State.scale}px; background:linear-gradient(180deg,#475569,#334155); border-radius:12px 12px 0 0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; color:white; font-weight:bold; padding-top:10px; box-shadow:inset 0 -4px 8px rgba(0,0,0,0.3);">
                    <div style="font-size:0.7rem; opacity:0.7;">GOAL</div>
                    <div style="font-size:1.1rem;">${params.target}</div>
                    <div style="margin-top:auto; padding-bottom:8px;">🏳️</div>
                </div>
            </div>
        `;
        let buttonsHTML = params.blocks.map(b => {
            if (b > 0) return `<button class="bubble-btn success" onclick="addEvolutionBlock(${b})">➕ Stack ${b}</button>`;
            return `<button class="bubble-btn danger" onclick="addEvolutionBlock(${b})">🔨 Dig ${Math.abs(b)}</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Stairs</button>
        `;
    }
    else if (params.type === 'sub_bridge') {
        lab15State.currentValue = params.start;
        lab15State.startValue = params.start;
        instruction.innerHTML = `<span style="color:#d97706;">✂️</span> Start with a <strong style="color:#d97706; font-size:1.2rem;">${params.start}</strong>-unit log, make it exactly <strong style="color:#0284c7; font-size:1.2rem;">${params.target}</strong> units!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; position:relative;">
                <div style="flex:1; height:60px; background:#64748b; border-radius:12px 12px 0 0; border-right:4px dashed #cbd5e1;"></div>
                <div style="width:${params.target * lab15State.scale}px; height:40px; background:rgba(56, 189, 248, 0.3); border-bottom:4px dashed #0284c7; position:relative; display:flex; align-items:flex-end; justify-content:flex-start;">
                    <div id="sub-log" style="position:absolute; bottom:0; left:0; width:${params.start * lab15State.scale}px; height:30px; background:#d97706; border:2px solid #78350f; border-radius:8px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; transition:width 0.3s; box-sizing:border-box;">${params.start}</div>
                </div>
                <div style="flex:1; height:60px; background:#64748b; border-radius:12px 12px 0 0; border-left:4px dashed #cbd5e1;"></div>
            </div>
        `;
        // Dynamically build/update subtraction river controls
        updateSubBridgeControls();
    }
    else if (params.type === 'area') {
        instruction.innerHTML = `<span style="color:#a855f7;">🧩</span> Fill the <strong style="color:#7c3aed; font-size:1.2rem;">${params.targetW}×${params.targetH}</strong> wall (<strong style="color:#a855f7; font-size:1.2rem;">${params.target}</strong> sq units)!`;
        const s = lab15State.scale;
        
        // Use CSS Grid for proper tiling
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; gap:40px;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                    <div style="font-weight:bold; color:#475569;">Target Area (<span style="color:#7c3aed;">${params.targetW}×${params.targetH}</span>)</div>
                    <div id="target-area-box" style="width:${params.targetW * s}px; height:${params.targetH * s}px; display:grid; grid-template-columns:repeat(${params.targetW}, ${s}px); grid-template-rows:repeat(${params.targetH}, ${s}px); border:4px dashed #7c3aed; background:rgba(168,85,247,0.05); position:relative; overflow:hidden; box-sizing:content-box;"></div>
                </div>
            </div>
        `;
        // Initialize grid occupation map
        lab15State.areaGrid = [];
        for (let r = 0; r < params.targetH; r++) {
            lab15State.areaGrid.push(new Array(params.targetW).fill(false));
        }
        lab15State.areaW = params.targetW;
        lab15State.areaH = params.targetH;
        
        let buttonsHTML = params.blocks.map(b => {
            return `<button class="bubble-btn primary" onclick="addAreaBlock(${b[1]}, ${b[2]})">➕ Add ${b[1]}x${b[2]}</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Area</button>
        `;
    }
    else if (params.type === 'balance') {
        instruction.innerHTML = `<span style="color:#f59e0b;">⚖️</span> Balance the scale at exactly <strong style="color:#d97706; font-size:1.3rem;">${params.target}</strong> units!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end;">
                <div id="balance-beam" style="width:260px; height:22px; background:linear-gradient(180deg,#cbd5e1,#94a3b8); border:3px solid #475569; border-radius:10px; display:flex; align-items:flex-end; justify-content:space-between; padding:0 20px; transition:transform 0.5s ease; transform:rotate(-15deg); box-sizing:border-box; position:relative; box-shadow:0 4px 8px rgba(0,0,0,0.2);">
                    <div style="position:absolute; bottom:150%; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#fef3c7,#fde68a); padding:6px 14px; border-radius:12px; border:3px solid #f59e0b; font-weight:900; color:#92400e; font-size:1rem; box-shadow:0 3px 0 #f59e0b; white-space:nowrap;">🎯 Goal: ${params.target}</div>
                    <div id="balance-container" style="display:flex; flex-wrap:wrap; gap:2px; align-items:flex-end; height:100%; margin-bottom:20px;"></div>
                </div>
                <div style="width:0; height:0; border-left:30px solid transparent; border-right:30px solid transparent; border-bottom:45px solid #64748b; margin-top:-5px; z-index:-1; filter:drop-shadow(0 4px 4px rgba(0,0,0,0.2));"></div>
            </div>
        `;
        let buttonsHTML = params.weights.map(w => {
            if (w > 0) return `<button class="bubble-btn primary" onclick="addEvolutionBlock(${w})">⚖️ Add ${w}</button>`;
            return `<button class="bubble-btn danger" onclick="addEvolutionBlock(${w})">🎈 Balloon ${Math.abs(w)}</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Balance</button>
        `;
    }
    else if (params.type === 'water') {
        instruction.innerHTML = `<span style="color:#3b82f6;">⛲</span> Fill the jar exactly to <strong style="color:#2563eb; font-size:1.3rem;">${params.target}</strong> Liters!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding-bottom:10px;">
                <div style="width:90px; height:150px; border:4px solid #cbd5e1; border-top:none; border-radius:0 0 16px 16px; position:relative; background:rgba(248,250,252,0.6); box-shadow:inset 0 -5px 10px rgba(0,0,0,0.05); overflow:hidden;">
                    <div id="water-fill" style="position:absolute; bottom:0; left:0; width:100%; height:0%; background:linear-gradient(180deg,#60a5fa,#3b82f6); transition:height 0.4s ease; box-shadow:inset 0 4px 6px rgba(255,255,255,0.3);">
                        <div style="position:absolute; top:0; left:0; width:100%; height:8px; background:rgba(255,255,255,0.3); border-radius:50%;"></div>
                    </div>
                    <div style="position:absolute; top:20%; left:0; width:12px; height:2px; background:#94a3b8;"></div>
                    <div style="position:absolute; top:40%; left:0; width:12px; height:2px; background:#94a3b8;"></div>
                    <div style="position:absolute; top:60%; left:0; width:12px; height:2px; background:#94a3b8;"></div>
                    <div style="position:absolute; top:80%; left:0; width:12px; height:2px; background:#94a3b8;"></div>
                    <div style="position:absolute; bottom:98%; left:0; width:100%; height:2px; border-top:2px dashed #dc2626; z-index:5;">
                        <span style="position:absolute; right:4px; top:-14px; font-size:0.65rem; color:#dc2626; font-weight:800; white-space:nowrap;">Target: ${params.target}L</span>
                    </div>
                </div>
                <div style="margin-top:8px; font-weight:800; color:#475569;" id="water-current-text">0 / ${params.target} Liters</div>
            </div>
        `;
        let buttonsHTML = params.blocks.map(b => {
            if (b > 0) return `<button class="bubble-btn primary" onclick="addWaterBlock(${b})">➕ Pour ${b}L</button>`;
            return `<button class="bubble-btn danger" onclick="addWaterBlock(${b})">➖ Drain ${Math.abs(b)}L</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearWaterJar()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Water</button>
        `;
    }
    else if (params.type === 'electricity') {
        instruction.innerHTML = `<span style="color:#eab308;">⚡</span> Power the circuit to exactly <strong style="color:#d97706; font-size:1.3rem;">${params.target}</strong> Volts to open the lock!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; gap:25px;">
                <div style="width:70px; height:60px; background:#475569; border-radius:12px; border:3px solid #334155; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-size:0.7rem; font-weight:800; position:relative; box-shadow:0 4px 6px rgba(0,0,0,0.15);">
                    <span>⚡ GEN</span>
                    <div style="position:absolute; right:-6px; top:15px; width:8px; height:8px; background:#ef4444; border-radius:50%;"></div>
                    <div style="position:absolute; right:-6px; top:33px; width:8px; height:8px; background:#3b82f6; border-radius:50%;"></div>
                </div>
                <div id="elec-wire" style="flex:1; max-width:80px; height:6px; background:#cbd5e1; transition:background 0.3s; border-radius:3px; position:relative;">
                    <div id="elec-glow" style="position:absolute; inset:0; background:#fbbf24; opacity:0; transition:opacity 0.3s; border-radius:3px; box-shadow:0 0 10px #f59e0b;"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div id="elec-bulb" style="width:48px; height:48px; background:#e2e8f0; border-radius:50%; border:3px solid #94a3b8; display:flex; align-items:center; justify-content:center; font-size:1.5rem; transition:all 0.3s ease;">💡</div>
                    <div style="width:28px; height:12px; background:#64748b; border-radius:0 0 4px 4px;"></div>
                </div>
                <div id="elec-door" style="width:60px; height:75px; background:#ef4444; border:3px solid #dc2626; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-weight:800; font-size:0.7rem; box-shadow:0 4px 6px rgba(0,0,0,0.15); transition:background 0.3s, border-color 0.3s;">
                    <span id="elec-door-status">🔒 LOCK</span>
                </div>
            </div>
            <div style="text-align:center; font-weight:800; color:#475569; margin-top:8px;" id="elec-current-text">Voltage: 0 / ${params.target} V</div>
        `;
        let buttonsHTML = params.blocks.map(b => {
            if (b > 0) return `<button class="bubble-btn primary" onclick="addElectricityBlock(${b})">➕ Inject ${b}V</button>`;
            return `<button class="bubble-btn danger" onclick="addElectricityBlock(${b})">➖ Reduce ${Math.abs(b)}V</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearElectricity()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Circuit</button>
        `;
    }
    else if (params.type === 'clock') {
        instruction.innerHTML = `<span style="color:#3b82f6;">🕒</span> Set the clock exactly to <strong style="color:#2563eb; font-size:1.3rem;">${formatTime(params.target)}</strong>!`;
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div style="width:110px; height:110px; border:6px solid #78350f; border-radius:50%; background:#f8fafc; position:relative; box-shadow:0 4px 8px rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center;">
                    <div style="position:absolute; top:4px; font-weight:800; font-size:0.75rem; color:#475569;">12</div>
                    <div style="position:absolute; right:4px; font-weight:800; font-size:0.75rem; color:#475569;">3</div>
                    <div style="position:absolute; bottom:4px; font-weight:800; font-size:0.75rem; color:#475569;">6</div>
                    <div style="position:absolute; left:4px; font-weight:800; font-size:0.75rem; color:#475569;">9</div>
                    <div style="width:8px; height:8px; background:#0f172a; border-radius:50%; z-index:10; position:relative;"></div>
                    <div id="clock-hour-hand" style="position:absolute; bottom:50%; left:calc(50% - 2px); width:4px; height:32px; background:#1e293b; border-radius:4px; transform-origin:bottom center; transform:rotate(0deg); transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1); z-index:8;"></div>
                    <div id="clock-minute-hand" style="position:absolute; bottom:50%; left:calc(50% - 1.5px); width:3px; height:45px; background:#64748b; border-radius:3px; transform-origin:bottom center; transform:rotate(0deg); transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1); z-index:9;"></div>
                </div>
                <div style="margin-top:10px; font-weight:800; color:#475569;" id="clock-current-text">Time: 12:00 / Target: ${formatTime(params.target)}</div>
            </div>
        `;
        let buttonsHTML = params.clicks.map(c => {
            return `<button class="bubble-btn primary" onclick="addClockTime(${c})">➕ Add ${c}h</button>`;
        }).join('');
        controls.innerHTML = buttonsHTML + `
            <button class="bubble-btn muted" onclick="clearClockTime()">🧹 Reset</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Time</button>
        `;
        setTimeout(() => updateClockUI(params), 50);
    }
    else if (params.type === 'fraction') {
        const targetCount = Math.round(params.target * params.pieces);
        instruction.innerHTML = `<span style="color:#a855f7;">🍰</span> Color exactly <strong style="color:#7c3aed; font-size:1.3rem;">${targetCount}</strong> out of <strong style="color:#7c3aed; font-size:1.3rem;">${params.pieces}</strong> slices (fraction: <strong style="color:#7c3aed;">${targetCount}/${params.pieces}</strong>)!`;
        
        let slicesHTML = '';
        for (let i = 0; i < params.pieces; i++) {
            slicesHTML += `
                <div id="fraction-slice-${i}" onclick="toggleFractionSlice(${i})" style="width:35px; height:45px; background:#cbd5e1; border:2px solid #94a3b8; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:800; color:#475569; cursor:pointer; transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1); user-select:none; font-size:0.85rem;">
                    ${i + 1}
                </div>
            `;
        }
        
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;">
                <div style="display:flex; gap:6px; align-items:center;">
                    ${slicesHTML}
                </div>
                <div style="font-weight:800; color:#475569;" id="fraction-current-text">Colored: 0 / ${params.pieces}</div>
            </div>
        `;
        
        controls.innerHTML = `
            <button class="bubble-btn muted" onclick="clearFractionSlices()">🧹 Reset</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Slices</button>
        `;
        
        lab15State.fractionSlices = new Array(params.pieces).fill(false);
    }
    else if (params.type === 'pattern') {
        instruction.innerHTML = `<span style="color:#ef4444;">🧩</span> Complete the pattern sequence by choosing the next shape!`;
        
        const shapeIcons = {
            'sphere': '🔴 Sphere',
            'box': '🟦 Box',
            'cylinder': '🟡 Cylinder'
        };
        const shapeIconsOnly = {
            'sphere': '🔴',
            'box': '🟦',
            'cylinder': '🟡'
        };
        
        let seqHTML = params.sequence.map(shape => `
            <div style="width:40px; height:40px; background:white; border:2px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                ${shapeIconsOnly[shape] || '❓'}
            </div>
        `).join('');
        
        scene.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:15px;">
                <div style="display:flex; gap:8px; align-items:center;">
                    ${seqHTML}
                    <div style="font-size:1.1rem; font-weight:800; color:#94a3b8;">➡️</div>
                    <div id="pattern-target-slot" style="width:40px; height:40px; border:3px dashed #fbbf24; background:rgba(251,191,36,0.05); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:800; color:#f59e0b;">
                        ?
                    </div>
                </div>
                <div style="font-weight:800; color:#475569;" id="pattern-current-text">Select a shape below to complete the pattern!</div>
            </div>
        `;
        
        let choicesHTML = params.clicks.map(choiceIdx => {
            let shapeName = '';
            if (choiceIdx === 1) shapeName = 'sphere';
            else if (choiceIdx === 2) shapeName = 'box';
            else if (choiceIdx === 3) shapeName = 'cylinder';
            
            return `<button class="bubble-btn primary" onclick="selectPatternChoice(${choiceIdx}, '${shapeName}')">${shapeIcons[shapeName]}</button>`;
        }).join('');
        
        controls.innerHTML = choicesHTML + `
            <button class="bubble-btn muted" onclick="clearPatternChoice()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Pattern</button>
        `;
    }
}

function addEvolutionBlock(val, w=0, h=0) {
    playSound('pop');
    lab15State.currentValue += val;
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const scale = lab15State.scale || 15;
    
    if (lab15State.puzzleType === 'bridge') {
        const gap = document.getElementById('bridge-gap');
        const block = document.createElement('div');
        const showText = (absVal * scale >= 18);
        block.title = val;
        let css = `width:${absVal * scale}px; height:30px; border-radius:6px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.9rem; box-sizing:border-box; transition: transform 0.2s ease; animation: blockPop 0.35s cubic-bezier(0.34,1.56,0.64,1);`;
        if (isNeg) {
            css += `background:linear-gradient(135deg,#ef4444,#dc2626); border:2px dashed #7f1d1d; margin-left:${val * scale}px; z-index:10; opacity:0.9; box-shadow:0 2px 6px rgba(239,68,68,0.4);`;
            block.textContent = showText ? val : '';
        } else {
            css += `background:linear-gradient(135deg,#3b82f6,#2563eb); border:2px solid #1e40af; box-shadow:0 2px 6px rgba(59,130,246,0.4);`;
            block.textContent = showText ? val : '';
        }
        block.style.cssText = css;
        gap.appendChild(block);
    } else if (lab15State.puzzleType === 'hill') {
        const stack = document.getElementById('hill-stack');
        const block = document.createElement('div');
        const showText = (absVal * scale >= 18);
        block.title = val;
        let css = `width:100%; height:${absVal * scale}px; border-radius:6px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.9rem; box-sizing:border-box; animation: blockSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);`;
        if (isNeg) {
            css += `background:linear-gradient(135deg,#ef4444,#dc2626); border:2px dashed #7f1d1d; margin-bottom:${val * scale}px; z-index:10; opacity:0.9; box-shadow:0 2px 6px rgba(239,68,68,0.4);`;
            block.textContent = showText ? val : '';
        } else {
            css += `background:linear-gradient(135deg,#22c55e,#16a34a); border:2px solid #166534; box-shadow:0 2px 6px rgba(34,197,94,0.4);`;
            block.textContent = showText ? val : '';
        }
        block.style.cssText = css;
        stack.appendChild(block);
    } else if (lab15State.puzzleType === 'area') {
        // Use the new grid-based addAreaBlock function
        addAreaBlock(w, h);
        return; // handled by addAreaBlock
    } else if (lab15State.puzzleType === 'balance') {
        const container = document.getElementById('balance-container');
        const block = document.createElement('div');
        let css = `width:30px; height:30px; border-radius:50%; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.8rem; box-sizing:border-box; animation: blockPop 0.35s cubic-bezier(0.34,1.56,0.64,1);`;
        if (isNeg) {
            css += `background:linear-gradient(135deg,#ef4444,#dc2626); border:2px dashed #7f1d1d; align-self:flex-start; margin-bottom:40px; box-shadow:0 2px 6px rgba(239,68,68,0.4);`;
            block.textContent = val;
        } else {
            css += `background:linear-gradient(135deg,#f59e0b,#d97706); border:2px solid #c2410c; box-shadow:0 2px 6px rgba(245,158,11,0.4);`;
            block.textContent = val;
        }
        block.style.cssText = css;
        container.appendChild(block);
    }
}
function updateSubBridgeControls() {
    const controls = document.getElementById('evolution-controls');
    if (!controls || lab15State.puzzleType !== 'sub_bridge') return;
    
    const params = getStageParams(lab15State.currentStage);
    let buttonsHTML = '';
    const positiveSlices = params.slices.filter(s => s > 0);
    const negSlices = params.slices.filter(s => s < 0);
    
    positiveSlices.forEach(s => {
        buttonsHTML += `<button class="bubble-btn danger" onclick="sliceEvolutionBlock(${s})">✂️ Slice ${s}</button>`;
    });
    
    if (lab15State.currentValue < lab15State.startValue) {
        positiveSlices.forEach(s => {
            buttonsHTML += `<button class="bubble-btn success" onclick="sliceEvolutionBlock(${-s})">➕ Add ${s}</button>`;
        });
    }
    
    negSlices.forEach(s => {
        buttonsHTML += `<button class="bubble-btn primary" onclick="sliceEvolutionBlock(${s})">🌱 Grow ${Math.abs(s)}</button>`;
    });
    
    controls.innerHTML = buttonsHTML + `
        <button class="bubble-btn muted" onclick="loadLab15Stage(${lab15State.currentStage})">🔄 Reset Log</button>
        <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Log</button>
    `;
}

function sliceEvolutionBlock(val) {
    const newVal = lab15State.currentValue - val;
    if (newVal < 0) {
        playSound('sad');
        const status = document.getElementById('evolution-status');
        if (status) status.innerHTML = '<span style="color:var(--color-danger)">⚠️ Cannot slice that much!</span>';
        return;
    }
    playSound(val > 0 ? 'slide' : 'click');
    lab15State.currentValue = newVal;
    
    if (lab15State.puzzleType === 'sub_bridge') {
        const log = document.getElementById('sub-log');
        if (log) {
            const scale = lab15State.scale || 15;
            const logWidth = lab15State.currentValue * scale;
            log.style.width = logWidth + 'px';
            log.title = lab15State.currentValue;
            log.textContent = (logWidth >= 18) ? lab15State.currentValue : '';
        }
        updateSubBridgeControls();
    }
}

function clearEvolutionBlocks() {
    playSound('click');
    lab15State.currentValue = 0;
    
    if (lab15State.puzzleType === 'bridge') {
        document.getElementById('bridge-gap').innerHTML = '';
    } else if (lab15State.puzzleType === 'hill') {
        document.getElementById('hill-stack').innerHTML = '';
    } else if (lab15State.puzzleType === 'area') {
        document.getElementById('target-area-box').innerHTML = '';
        // Reset grid
        if (lab15State.areaGrid) {
            for (let r = 0; r < lab15State.areaH; r++) {
                lab15State.areaGrid[r].fill(false);
            }
        }
    } else if (lab15State.puzzleType === 'balance') {
        document.getElementById('balance-container').innerHTML = '';
    }
}


// Grid-based area block placement
function addAreaBlock(bw, bh) {
    const grid = lab15State.areaGrid;
    if (!grid) return;
    const gW = lab15State.areaW;
    const gH = lab15State.areaH;
    const scale = lab15State.scale || 15;
    
    // Find first position where bw x bh block fits
    let placed = false;
    for (let r = 0; r <= gH - bh && !placed; r++) {
        for (let c = 0; c <= gW - bw && !placed; c++) {
            let fits = true;
            for (let dr = 0; dr < bh && fits; dr++) {
                for (let dc = 0; dc < bw && fits; dc++) {
                    if (grid[r + dr][c + dc]) fits = false;
                }
            }
            if (fits) {
                // Mark cells as occupied
                for (let dr = 0; dr < bh; dr++) {
                    for (let dc = 0; dc < bw; dc++) {
                        grid[r + dr][c + dc] = true;
                    }
                }
                // Create visual block
                const container = document.getElementById('target-area-box');
                const block = document.createElement('div');
                const area = bw * bh;
                const showText = (bw * scale >= 18 && bh * scale >= 18);
                block.title = bw + 'x' + bh + ' (' + area + ')';
                // Use CSS grid placement
                block.style.cssText = 'grid-column:' + (c+1) + ' / span ' + bw + '; grid-row:' + (r+1) + ' / span ' + bh + '; background:linear-gradient(135deg,#a855f7,#7c3aed); border:2px solid #6b21a8; box-sizing:border-box; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 6px rgba(168,85,247,0.4); animation: blockPop 0.35s cubic-bezier(0.34,1.56,0.64,1); border-radius:4px;';
                block.textContent = showText ? area : '';
                container.appendChild(block);
                
                lab15State.currentValue += area;
                playSound('click');
                placed = true;
            }
        }
    }
    
    if (!placed) {
        playSound('sad');
        const status = document.getElementById('evolution-status');
        if (status) status.innerHTML = '<span style="color:var(--color-danger)">⚠️ No space for this block! Try a different size or clear.</span>';
    }
}

function formatTime(val) {
    const hours = Math.floor(val);
    const mins = Math.round((val - hours) * 60);
    const paddedMins = mins < 10 ? '0' + mins : mins;
    const displayHours = hours === 0 ? 12 : hours;
    return `${displayHours}:${paddedMins}`;
}

function addWaterBlock(val) {
    playSound('pop');
    const params = getStageParams(lab15State.currentStage);
    lab15State.currentValue = Math.max(0, lab15State.currentValue + val);
    const fill = document.getElementById('water-fill');
    if (fill) {
        const pct = Math.min(100, (lab15State.currentValue / params.target) * 100);
        fill.style.height = pct + '%';
    }
    const txt = document.getElementById('water-current-text');
    if (txt) {
        txt.textContent = `${lab15State.currentValue} / ${params.target} Liters`;
    }
}

function clearWaterJar() {
    playSound('click');
    lab15State.currentValue = 0;
    const fill = document.getElementById('water-fill');
    if (fill) fill.style.height = '0%';
    const txt = document.getElementById('water-current-text');
    if (txt) {
        const params = getStageParams(lab15State.currentStage);
        txt.textContent = `0 / ${params.target} Liters`;
    }
}

function addElectricityBlock(val) {
    playSound('pop');
    const params = getStageParams(lab15State.currentStage);
    lab15State.currentValue = Math.max(0, lab15State.currentValue + val);
    updateElectricityUI(params);
}

function clearElectricity() {
    playSound('click');
    const params = getStageParams(lab15State.currentStage);
    lab15State.currentValue = 0;
    updateElectricityUI(params);
}

function updateElectricityUI(params) {
    const isCharged = lab15State.currentValue === params.target;
    const txt = document.getElementById('elec-current-text');
    if (txt) txt.textContent = `Voltage: ${lab15State.currentValue} / ${params.target} V`;
    
    const wireGlow = document.getElementById('elec-glow');
    if (wireGlow) wireGlow.style.opacity = lab15State.currentValue > 0 ? (lab15State.currentValue / params.target) : 0;
    
    const bulb = document.getElementById('elec-bulb');
    if (bulb) {
        if (lab15State.currentValue === 0) {
            bulb.style.background = '#e2e8f0';
            bulb.style.borderColor = '#94a3b8';
            bulb.style.boxShadow = '0 0 0 transparent';
        } else if (isCharged) {
            bulb.style.background = '#fef08a';
            bulb.style.borderColor = '#eab308';
            bulb.style.boxShadow = '0 0 20px #facc15';
        } else {
            bulb.style.background = '#ffedd5';
            bulb.style.borderColor = '#f97316';
            bulb.style.boxShadow = '0 0 10px #fdba74';
        }
    }
    const door = document.getElementById('elec-door');
    const doorStatus = document.getElementById('elec-door-status');
    if (door && doorStatus) {
        if (isCharged) {
            door.style.background = '#22c55e';
            door.style.borderColor = '#16a34a';
            doorStatus.textContent = '🔓 OPEN';
        } else {
            door.style.background = '#ef4444';
            door.style.borderColor = '#dc2626';
            doorStatus.textContent = '🔒 LOCK';
        }
    }
}

function addClockTime(val) {
    playSound('pop');
    const params = getStageParams(lab15State.currentStage);
    lab15State.currentValue = (lab15State.currentValue + val) % 12;
    updateClockUI(params);
}

function clearClockTime() {
    playSound('click');
    const params = getStageParams(lab15State.currentStage);
    lab15State.currentValue = 0;
    updateClockUI(params);
}

function updateClockUI(params) {
    const hrHand = document.getElementById('clock-hour-hand');
    const minHand = document.getElementById('clock-minute-hand');
    const txt = document.getElementById('clock-current-text');
    
    const hrAngle = (lab15State.currentValue % 12) * 30; 
    const minAngle = (lab15State.currentValue % 1) * 360; 
    
    if (hrHand) hrHand.style.transform = `rotate(${hrAngle}deg)`;
    if (minHand) minHand.style.transform = `rotate(${minAngle}deg)`;
    
    if (txt) {
        txt.textContent = `Time: ${formatTime(lab15State.currentValue)} / Target: ${formatTime(params.target)}`;
    }
}

function toggleFractionSlice(idx) {
    playSound('click');
    const params = getStageParams(lab15State.currentStage);
    if (!lab15State.fractionSlices) {
        lab15State.fractionSlices = new Array(params.pieces).fill(false);
    }
    lab15State.fractionSlices[idx] = !lab15State.fractionSlices[idx];
    
    const coloredCount = lab15State.fractionSlices.filter(Boolean).length;
    lab15State.currentValue = coloredCount / params.pieces;
    
    const el = document.getElementById(`fraction-slice-${idx}`);
    if (el) {
        if (lab15State.fractionSlices[idx]) {
            el.style.background = '#22c55e';
            el.style.borderColor = '#16a34a';
            el.style.color = 'white';
            el.style.transform = 'scale(1.1)';
        } else {
            el.style.background = '#cbd5e1';
            el.style.borderColor = '#94a3b8';
            el.style.color = '#475569';
            el.style.transform = 'scale(1)';
        }
    }
    
    const txt = document.getElementById('fraction-current-text');
    if (txt) txt.textContent = `Colored: ${coloredCount} / ${params.pieces}`;
}

function clearFractionSlices() {
    playSound('slide');
    const params = getStageParams(lab15State.currentStage);
    lab15State.fractionSlices = new Array(params.pieces).fill(false);
    lab15State.currentValue = 0;
    
    for (let i = 0; i < params.pieces; i++) {
        const el = document.getElementById(`fraction-slice-${i}`);
        if (el) {
            el.style.background = '#cbd5e1';
            el.style.borderColor = '#94a3b8';
            el.style.color = '#475569';
            el.style.transform = 'scale(1)';
        }
    }
    const txt = document.getElementById('fraction-current-text');
    if (txt) txt.textContent = `Colored: 0 / ${params.pieces}`;
}

function selectPatternChoice(choiceIdx, shapeName) {
    playSound('pop');
    lab15State.currentValue = choiceIdx;
    
    const slot = document.getElementById('pattern-target-slot');
    if (slot) {
        const shapeIconsOnly = {
            'sphere': '🔴',
            'box': '🟦',
            'cylinder': '🟡'
        };
        slot.textContent = shapeIconsOnly[shapeName];
        slot.style.borderStyle = 'solid';
        slot.style.borderColor = '#fbbf24';
        slot.style.background = 'white';
    }
    
    const txt = document.getElementById('pattern-current-text');
    if (txt) {
        const capitalize = shapeName.charAt(0).toUpperCase() + shapeName.slice(1);
        txt.textContent = `Selected: ${capitalize}`;
    }
}

function clearPatternChoice() {
    playSound('click');
    lab15State.currentValue = 0;
    const slot = document.getElementById('pattern-target-slot');
    if (slot) {
        slot.textContent = '?';
        slot.style.borderStyle = 'dashed';
        slot.style.borderColor = '#fbbf24';
        slot.style.background = 'rgba(251,191,36,0.05)';
    }
    const txt = document.getElementById('pattern-current-text');
    if (txt) txt.textContent = `Select a shape below to complete the pattern!`;
}

function checkEvolutionPuzzle() {
    const status = document.getElementById('evolution-status');
    if (!status) return;
    
    let isCorrect = false;
    if (lab15State.puzzleType === 'fraction') {
        isCorrect = Math.abs(lab15State.currentValue - lab15State.targetValue) < 0.001;
    } else {
        isCorrect = lab15State.currentValue === lab15State.targetValue;
    }
    
    if (isCorrect) {
        playSound('success');
        triggerConfetti();
        
        if (lab15State.puzzleType === 'balance') {
            const beam = document.getElementById('balance-beam');
            if (beam) beam.style.transform = 'rotate(0deg)';
        }
        
        const rewards = [
            '', 'feature-muscles', 'feature-shirt', 'feature-pants', 'feature-shoes', 'feature-color',
            'feature-hair', 'feature-cape', 'feature-belt', 'feature-gloves', 'feature-shield',
            'feature-sword', 'feature-crown', 'feature-pet', 'feature-aura', 'feature-wings',
            'feature-wand', 'feature-helmet', 'feature-armor', 'feature-boots', 'feature-badge',
            'feature-forceshield', 'feature-laserblaster', 'feature-halo', 'feature-starcrown'
        ];
        let featureReward = rewards[lab15State.currentStage] || '';
        
        nextEvolutionStage(featureReward);
    } else {
        playSound('sad');
        trackAnswer('evolution', false);
        
        if (lab15State.puzzleType === 'fraction') {
            const params = getStageParams(lab15State.currentStage);
            const coloredCount = Math.round(lab15State.currentValue * params.pieces);
            const targetCount = Math.round(lab15State.targetValue * params.pieces);
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Not quite! You colored ${coloredCount}/${params.pieces}, but you need ${targetCount}/${params.pieces}. Try again!</span>`;
        } else if (lab15State.puzzleType === 'clock') {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Not quite! You set ${formatTime(lab15State.currentValue)}, but you need ${formatTime(lab15State.targetValue)}. Try again!</span>`;
        } else if (lab15State.puzzleType === 'pattern') {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Not quite! That shape does not complete the pattern. Try again!</span>`;
        } else {
            status.innerHTML = `<span style="color:var(--color-danger)">⚠️ Not quite! You have ${lab15State.currentValue}, but you need ${lab15State.targetValue}. Try again!</span>`;
        }
    }
}

// ==========================================================================
// COIN ECONOMY, SHOP, HINTS & THEMES
// ==========================================================================

function updateHeaderCoins() {
    const el = document.getElementById('header-stars-count');
    if (el) {
        el.textContent = profileState.stars + ' Stars';
        // Pulse animation
        const counter = document.getElementById('coin-counter-header');
        if (counter) {
            counter.classList.add('coin-pulse');
            setTimeout(() => counter.classList.remove('coin-pulse'), 400);
        }
    }
}

function updateShopCoinsDisplay() {
    const el = document.getElementById('shop-coins-display');
    if (el) el.textContent = profileState.stars + ' Stars';
}

function animateCoins(amount) {
    const count = Math.min(amount / 5, 8); // 1 coin per 5 stars, max 8
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'flying-coin';
            coin.textContent = '\u{1fa99}';
            // Random starting position near center-bottom
            const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
            const startY = window.innerHeight * 0.6 + (Math.random() - 0.5) * 80;
            coin.style.left = startX + 'px';
            coin.style.top = startY + 'px';
            coin.style.setProperty('--fly-x', ((Math.random() - 0.5) * 150) + 'px');
            document.body.appendChild(coin);
            setTimeout(() => coin.remove(), 950);
        }, i * 110);
    }
}

// --- SHOP ITEMS CATALOG ---
const shopItems = {
    themes: [
        { id: 'classic', name: 'Classic', icon: '\u{1f3e0}', price: 0, desc: 'The default playground' },
        { id: 'cosmic', name: 'Cosmic Space', icon: '\u{1f680}', price: 80, desc: 'Dark purple galaxy!' },
        { id: 'undersea', name: 'Undersea Candy', icon: '\u{1f41f}', price: 80, desc: 'Deep ocean blues!' },
        { id: 'forest', name: 'Enchanted Forest', icon: '\u{1f332}', price: 80, desc: 'Magical green woods!' }
    ],
    stickers: [
        { id: 'stk-unicorn', name: 'Unicorn', icon: '\u{1f984}', price: 30 },
        { id: 'stk-dino', name: 'Dinosaur', icon: '\u{1f995}', price: 30 },
        { id: 'stk-rocket', name: 'Rocket', icon: '\u{1f680}', price: 30 },
        { id: 'stk-rainbow', name: 'Rainbow', icon: '\u{1f308}', price: 30 },
        { id: 'stk-dragon', name: 'Dragon', icon: '\u{1f409}', price: 30 },
        { id: 'stk-star', name: 'Shooting Star', icon: '\u{1f31f}', price: 40 },
        { id: 'stk-cake', name: 'Birthday Cake', icon: '\u{1f382}', price: 25 },
        { id: 'stk-crown', name: 'Royal Crown', icon: '\u{1f451}', price: 50 }
    ],
    costumes: [
        { id: 'cos-ninja', name: 'Ninja Suit', icon: '\u{1f977}', price: 60, feature: 'feature-armor', desc: 'Stealth mode!' },
        { id: 'cos-wizard', name: 'Wizard Robe', icon: '\u{1f9d9}', price: 60, feature: 'feature-cape', desc: 'Magic powers!' },
        { id: 'cos-knight', name: 'Knight Armor', icon: '\u{2694}\ufe0f', price: 75, feature: 'feature-helmet', desc: 'Shield & helm!' },
        { id: 'cos-super', name: 'Superhero Cape', icon: '\u{1f9b8}', price: 50, feature: 'feature-cape', desc: 'Fly high!' },
        { id: 'cos-crown', name: 'Royal Crown', icon: '\u{1f451}', price: 90, feature: 'feature-crown', desc: 'Rule the kingdom!' },
        { id: 'cos-pet', name: 'Puppy Sidekick', icon: '\u{1f436}', price: 100, feature: 'feature-pet', desc: 'Best friend!' }
    ]
};

function renderShop() {
    updateShopCoinsDisplay();
    
    const grid = document.getElementById('shop-store-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Theme cards
    shopItems.themes.forEach(item => {
        const owned = profileState.themesOwned.includes(item.id);
        const equipped = profileState.themeEquipped === item.id;
        const card = document.createElement('div');
        card.className = 'shop-item-card' + (equipped ? ' equipped' : owned ? ' owned' : '');
        
        let btnHtml = '';
        if (equipped) {
            btnHtml = '<div style="color:var(--color-primary); font-weight:800; font-size:0.85rem;">\u2705 Equipped</div>';
        } else if (owned) {
            btnHtml = '<button class="bubble-btn primary" style="padding:4px 14px; font-size:0.85rem;" onclick="equipTheme(\'' + item.id + '\')">Equip</button>';
        } else if (item.price === 0) {
            btnHtml = '<div class="shop-item-price free">Free</div>';
        } else {
            btnHtml = '<button class="bubble-btn warning" style="padding:4px 14px; font-size:0.85rem;" onclick="buyShopItem(\'' + item.id + '\', \'theme\', ' + item.price + ')">Buy ' + item.price + ' \u{1fa99}</button>';
        }
        
        card.innerHTML = '<div class="shop-item-icon">' + item.icon + '</div>' +
            '<div class="shop-item-name">' + item.name + '</div>' +
            '<div style="font-size:0.8rem; color:#64748b;">' + item.desc + '</div>' +
            btnHtml;
        grid.appendChild(card);
    });
    
    // Sticker cards
    shopItems.stickers.forEach(item => {
        const owned = profileState.stickersOwned.includes(item.id);
        const card = document.createElement('div');
        card.className = 'shop-item-card' + (owned ? ' owned' : '');
        
        let btnHtml = '';
        if (owned) {
            btnHtml = '<div style="color:var(--color-success); font-weight:800; font-size:0.85rem;">\u2705 Collected!</div>';
        } else {
            btnHtml = '<button class="bubble-btn warning" style="padding:4px 14px; font-size:0.85rem;" onclick="buyShopItem(\'' + item.id + '\', \'sticker\', ' + item.price + ')">Buy ' + item.price + ' \u{1fa99}</button>';
        }
        
        card.innerHTML = '<div class="shop-item-icon">' + item.icon + '</div>' +
            '<div class="shop-item-name">' + item.name + '</div>' +
            btnHtml;
        grid.appendChild(card);
    });
    
    // Costume cards (hero outfits!)
    if (shopItems.costumes) {
        shopItems.costumes.forEach(item => {
            const owned = (profileState.costumesOwned || []).includes(item.id);
            const card = document.createElement('div');
            card.className = 'shop-item-card' + (owned ? ' owned' : '');
            
            let btnHtml = '';
            if (owned) {
                btnHtml = '<div style="color:var(--color-success); font-weight:800; font-size:0.85rem;">\u2705 Owned!</div>';
            } else {
                btnHtml = '<button class="bubble-btn warning" style="padding:4px 14px; font-size:0.85rem;" onclick="buyShopItem(\'' + item.id + '\', \'costume\', ' + item.price + ')">Buy ' + item.price + ' \u{1fa99}</button>';
            }
            
            card.innerHTML = '<div class="shop-item-icon">' + item.icon + '</div>' +
                '<div class="shop-item-name">' + item.name + '</div>' +
                '<div style="font-size:0.8rem; color:#64748b;">' + item.desc + '</div>' +
                btnHtml;
            grid.appendChild(card);
        });
    }
    
    // Sticker album
    renderStickerAlbum();
}

function renderStickerAlbum() {
    const shelf = document.getElementById('sticker-book-shelf');
    if (!shelf) return;
    shelf.innerHTML = '';
    
    shopItems.stickers.forEach(item => {
        const owned = profileState.stickersOwned.includes(item.id);
        const slot = document.createElement('div');
        slot.className = 'sticker-slot ' + (owned ? 'unlocked' : 'locked');
        slot.textContent = item.icon;
        slot.title = owned ? item.name : 'Locked - Buy from shop!';
        shelf.appendChild(slot);
    });
}

function buyShopItem(itemId, type, cost) {
    const pennyDialog = document.getElementById('penny-dialog-text');
    
    if (profileState.stars < cost) {
        playSound('sad');
        if (pennyDialog) {
            pennyDialog.textContent = 'Oink! You need ' + cost + ' Stars but only have ' + profileState.stars + '. Keep solving puzzles to earn more!';
        }
        return;
    }
    
    // Deduct cost
    profileState.stars -= cost;
    playSound('coin');
    playSound('success');
    
    if (type === 'theme') {
        if (!profileState.themesOwned.includes(itemId)) {
            profileState.themesOwned.push(itemId);
        }
        equipTheme(itemId);
        if (pennyDialog) {
            pennyDialog.textContent = 'Oink oink! Beautiful! Your new ' + itemId + ' theme is now active! Enjoy the new look!';
        }
    } else if (type === 'sticker') {
        if (!profileState.stickersOwned.includes(itemId)) {
            profileState.stickersOwned.push(itemId);
        }
        if (pennyDialog) {
            const sticker = shopItems.stickers.find(s => s.id === itemId);
            pennyDialog.textContent = 'Squeal! You got the ' + (sticker ? sticker.name : '') + ' sticker! Check your album below!';
        }
    } else if (type === 'costume') {
        if (!profileState.costumesOwned) profileState.costumesOwned = [];
        if (!profileState.costumesOwned.includes(itemId)) {
            profileState.costumesOwned.push(itemId);
        }
        // Apply the costume feature to the evolution avatar
        const costume = shopItems.costumes.find(c => c.id === itemId);
        if (costume && costume.feature) {
            const avatar = document.getElementById('evolution-avatar');
            if (avatar) avatar.classList.add(costume.feature);
            // Also add to lab15State features for persistence during play
            if (!lab15State.features.includes(costume.feature)) {
                lab15State.features.push(costume.feature);
            }
        }
        if (pennyDialog) {
            pennyDialog.textContent = 'Oink oink! Your hero got an awesome new outfit! Check them out in Adventure 15!';
        }
    }
    
    saveProfile();
    updateHeaderCoins();
    renderShop();
    triggerConfetti();
}

function equipTheme(themeId) {
    profileState.themeEquipped = themeId;
    applyTheme(themeId);
    saveProfile();
    renderShop();
}

function applyTheme(themeId) {
    const main = document.querySelector('main');
    if (!main) return;
    main.classList.remove('theme-cosmic', 'theme-undersea', 'theme-forest');
    if (themeId !== 'classic') {
        main.classList.add('theme-' + themeId);
    }
}

// --- HINT SYSTEM ---
const gameHints = {
    seesaw: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">⚖️ Make Both Sides Equal!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin:10px 0;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="background:#3b82f6; color:white; font-weight:900; padding:8px 16px; border-radius:8px; font-size:1.2rem;">6</div>
                    <div style="font-size:0.7rem; color:#64748b; margin-top:2px;">Left side</div>
                </div>
                <div style="font-size:1.5rem;">⚖️</div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="display:flex; gap:4px;">
                        <div style="background:#22c55e; color:white; font-weight:900; padding:8px 12px; border-radius:8px;">4</div>
                        <div style="font-size:1.2rem; align-self:center;">+</div>
                        <div style="background:#f59e0b; color:white; font-weight:900; padding:8px 12px; border-radius:8px;">2</div>
                    </div>
                    <div style="font-size:0.7rem; color:#64748b; margin-top:2px;">Right side</div>
                </div>
            </div>
            <div style="background:#dbeafe; padding:6px 12px; border-radius:8px; font-size:0.85rem;">6 = 4 + 2 ✅ <strong>Balanced!</strong></div>
        </div>`,
    cookies: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🍪 Count What's Left!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin:10px 0;">
                <div style="position:relative;">
                    <div style="font-size:2.5rem;">🫙</div>
                    <div style="position:absolute; top:5px; left:50%; transform:translateX(-50%); font-weight:900; color:#92400e; font-size:0.8rem;">5</div>
                </div>
                <div style="font-size:1.3rem; font-weight:900; color:#ef4444;">➜ eats 2 ➜</div>
                <div style="position:relative;">
                    <div style="font-size:2.5rem;">🫙</div>
                    <div style="position:absolute; top:5px; left:50%; transform:translateX(-50%); font-weight:900; color:#16a34a; font-size:0.8rem;">3</div>
                </div>
            </div>
            <div style="background:#fef3c7; padding:6px 12px; border-radius:8px; font-size:0.85rem;"><strong>5 − 2 = 3</strong> cookies left!</div>
        </div>`,
    birds: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🌳 Drag the Timeline!</div>
            <div style="margin:10px 0;">
                <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                    <div style="font-size:0.75rem; font-weight:700; color:#16a34a;">Past</div>
                    <div style="display:flex; align-items:center;">
                        <div style="font-size:1.5rem;">⬅️</div>
                        <div style="width:120px; height:12px; background:linear-gradient(90deg,#86efac,#fde68a,#fca5a5); border-radius:6px; position:relative;">
                            <div style="position:absolute; left:20%; top:-2px; width:16px; height:16px; background:#3b82f6; border-radius:50%; border:2px solid white;"></div>
                        </div>
                        <div style="font-size:1.5rem;">➡️</div>
                    </div>
                    <div style="font-size:0.75rem; font-weight:700; color:#ef4444;">Now</div>
                </div>
            </div>
            <div style="background:#dcfce7; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Slide <strong>left</strong> to go back in time! 🔙</div>
        </div>`,
    snapper: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🧮 Bridge to 10 First!</div>
            <div style="display:flex; justify-content:center; gap:12px; margin:10px 0;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:0.7rem; font-weight:700;">Tray 1</div>
                    <div style="display:grid; grid-template-columns:repeat(5,18px); gap:2px;">
                        <div style="width:18px;height:18px;background:#3b82f6;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#3b82f6;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#3b82f6;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#e2e8f0;border-radius:4px;border:1px dashed #94a3b8;"></div>
                        <div style="width:18px;height:18px;background:#e2e8f0;border-radius:4px;border:1px dashed #94a3b8;"></div>
                    </div>
                </div>
                <div style="font-size:1.2rem; align-self:center;">➜</div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:0.7rem; font-weight:700;">Tray 2</div>
                    <div style="display:grid; grid-template-columns:repeat(5,18px); gap:2px;">
                        <div style="width:18px;height:18px;background:#22c55e;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#22c55e;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#22c55e;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#22c55e;border-radius:4px;"></div>
                        <div style="width:18px;height:18px;background:#22c55e;border-radius:4px;"></div>
                    </div>
                </div>
            </div>
            <div style="background:#dbeafe; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Fill Tray 2 to <strong>10</strong>, then pop from Tray 1!</div>
        </div>`,
    farm: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🥕 Rows × Columns!</div>
            <div style="display:inline-grid; grid-template-columns:repeat(4,22px); gap:3px; margin:8px 0; padding:8px; background:#fef9c3; border-radius:8px; border:2px solid #eab308;">
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
                <div style="width:22px;height:22px;background:#22c55e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">🥕</div>
            </div>
            <div style="display:flex; justify-content:center; gap:6px; font-size:0.85rem; font-weight:700;">
                <span style="color:#2563eb;">3 rows</span> × <span style="color:#dc2626;">4 cols</span> = <span style="color:#16a34a;">12</span>
            </div>
        </div>`,
    frogger: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🐸 Count the Hops!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:0; margin:10px 0;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:1.2rem;">🐸</div>
                    <div style="background:#22c55e; color:white; font-weight:900; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center;">3</div>
                </div>
                <div style="color:#3b82f6; font-weight:900; font-size:0.8rem; margin:0 2px;">→+1→</div>
                <div style="background:#e2e8f0; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">4</div>
                <div style="color:#3b82f6; font-weight:900; font-size:0.8rem; margin:0 2px;">→+1→</div>
                <div style="background:#e2e8f0; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">5</div>
                <div style="color:#3b82f6; font-weight:900; font-size:0.8rem; margin:0 2px;">→+1→</div>
                <div style="background:#fde68a; border:2px solid #f59e0b; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900;">6</div>
            </div>
            <div style="background:#dcfce7; padding:6px 12px; border-radius:8px; font-size:0.85rem;"><strong>3 + 3 = 6</strong> — hop right 3 times!</div>
        </div>`,
    pizza: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🍕 Slices = Bottom Number!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:15px; margin:10px 0;">
                <div style="font-size:1.8rem; font-weight:900; color:#dc2626; line-height:1;">
                    <div style="border-bottom:3px solid #1e293b; padding-bottom:2px;">2</div>
                    <div style="padding-top:2px;">4</div>
                </div>
                <div style="font-size:1.3rem;">=</div>
                <div style="width:70px; height:70px; border-radius:50%; background:conic-gradient(#ef4444 0deg 180deg, #fde68a 180deg 360deg); border:3px solid #b91c1c;"></div>
            </div>
            <div style="background:#fef2f2; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Cut into <strong style="color:#2563eb;">4</strong> slices, color <strong style="color:#dc2626;">2</strong> red!</div>
        </div>`,
    clock: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">⏰ Two Hands!</div>
            <div style="position:relative; width:90px; height:90px; border:4px solid #1e293b; border-radius:50%; margin:8px auto; background:#fefce8;">
                <div style="position:absolute; top:50%; left:50%; width:4px; height:28px; background:#dc2626; border-radius:2px; transform-origin:bottom center; transform:translate(-50%, -100%) rotate(0deg);"></div>
                <div style="position:absolute; top:50%; left:50%; width:3px; height:36px; background:#2563eb; border-radius:2px; transform-origin:bottom center; transform:translate(-50%, -100%) rotate(90deg);"></div>
                <div style="position:absolute; top:50%; left:50%; width:6px; height:6px; background:#1e293b; border-radius:50%; transform:translate(-50%,-50%);"></div>
                <div style="position:absolute; top:4px; left:50%; transform:translateX(-50%); font-size:0.6rem; font-weight:900;">12</div>
                <div style="position:absolute; right:4px; top:50%; transform:translateY(-50%); font-size:0.6rem; font-weight:900;">3</div>
                <div style="position:absolute; bottom:4px; left:50%; transform:translateX(-50%); font-size:0.6rem; font-weight:900;">6</div>
                <div style="position:absolute; left:4px; top:50%; transform:translateY(-50%); font-size:0.6rem; font-weight:900;">9</div>
            </div>
            <div style="display:flex; gap:10px; justify-content:center; font-size:0.8rem;">
                <span><span style="color:#dc2626; font-weight:900;">Short</span> = Hour</span>
                <span><span style="color:#2563eb; font-weight:900;">Long</span> = Minutes</span>
            </div>
        </div>`,
    tangram: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">📐 Big Pieces First!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin:10px 0;">
                <div style="display:flex; flex-direction:column; gap:3px; align-items:center;">
                    <div style="font-size:0.7rem; font-weight:700; color:#16a34a;">Step 1</div>
                    <div style="width:40px; height:40px; background:#22c55e; clip-path:polygon(0 0, 100% 0, 50% 100%);"></div>
                </div>
                <div style="font-size:1.2rem;">→</div>
                <div style="display:flex; flex-direction:column; gap:3px; align-items:center;">
                    <div style="font-size:0.7rem; font-weight:700; color:#2563eb;">Step 2</div>
                    <div style="width:25px; height:25px; background:#3b82f6; border-radius:4px;"></div>
                </div>
                <div style="font-size:1.2rem;">→</div>
                <div style="display:flex; flex-direction:column; gap:3px; align-items:center;">
                    <div style="font-size:0.7rem; font-weight:700; color:#dc2626;">Step 3</div>
                    <div style="width:18px; height:18px; background:#ef4444; clip-path:polygon(50% 0, 100% 100%, 0 100%);"></div>
                </div>
            </div>
            <div style="background:#f0fdf4; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Start <strong>big</strong>, fill the <strong>gaps</strong>!</div>
        </div>`,
    market: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🪙 Biggest Coins First!</div>
            <div style="display:flex; align-items:flex-end; justify-content:center; gap:6px; margin:10px 0;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:36px; height:36px; background:linear-gradient(135deg,#fbbf24,#f59e0b); border-radius:50%; border:3px solid #b45309; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.7rem; color:#78350f;">25c</div>
                    <div style="font-size:0.65rem; color:#64748b; margin-top:2px;">Quarter</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:30px; height:30px; background:linear-gradient(135deg,#e2e8f0,#cbd5e1); border-radius:50%; border:3px solid #64748b; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.65rem;">10c</div>
                    <div style="font-size:0.65rem; color:#64748b; margin-top:2px;">Dime</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:28px; height:28px; background:linear-gradient(135deg,#e2e8f0,#cbd5e1); border-radius:50%; border:3px solid #64748b; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.6rem;">5c</div>
                    <div style="font-size:0.65rem; color:#64748b; margin-top:2px;">Nickel</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width:22px; height:22px; background:linear-gradient(135deg,#d97706,#b45309); border-radius:50%; border:2px solid #78350f; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.55rem; color:white;">1c</div>
                    <div style="font-size:0.65rem; color:#64748b; margin-top:2px;">Penny</div>
                </div>
            </div>
            <div style="background:#fef9c3; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Use <strong>big</strong> coins first, then fill with <strong>small</strong>!</div>
        </div>`,
    algebra: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🤹 Find the Pattern!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin:10px 0;">
                <div style="background:#fef08a; padding:6px 10px; border-radius:8px; border:2px solid #eab308; font-weight:900;">⭐ = 3</div>
            </div>
            <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin:6px 0;">
                <span style="font-size:1.3rem;">⭐⭐</span>
                <span style="font-weight:900;">=</span>
                <span style="font-weight:900; font-size:1.1rem; color:#2563eb;">3 + 3</span>
                <span style="font-weight:900;">=</span>
                <span style="background:#22c55e; color:white; font-weight:900; padding:4px 10px; border-radius:8px;">6</span>
            </div>
            <div style="background:#eff6ff; padding:6px 12px; border-radius:8px; font-size:0.85rem; margin-top:6px;">Multiply the <strong>value</strong> by the <strong>count</strong>!</div>
        </div>`,
    alligator: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🐊 Gator Eats the Bigger!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin:10px 0;">
                <div style="background:#dcfce7; padding:8px 14px; border-radius:10px; border:2px solid #22c55e; font-weight:900; font-size:1.3rem;">7</div>
                <div style="font-size:2rem;">🐊</div>
                <div style="background:#fef2f2; padding:8px 14px; border-radius:10px; border:2px solid #ef4444; font-weight:900; font-size:1.3rem;">4</div>
            </div>
            <div style="background:#fef9c3; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Mouth <strong>always</strong> faces the <strong style="color:#16a34a;">bigger</strong> number! 7 > 4</div>
        </div>`,
    balloon: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🎈 Find the Skip Pattern!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; margin:10px 0;">
                <div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:1.3rem;">🎈</div><div style="font-weight:900;">2</div></div>
                <div style="color:#3b82f6; font-weight:900; font-size:0.75rem;">+2→</div>
                <div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:1.3rem;">🎈</div><div style="font-weight:900;">4</div></div>
                <div style="color:#3b82f6; font-weight:900; font-size:0.75rem;">+2→</div>
                <div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:1.3rem;">🎈</div><div style="font-weight:900;">6</div></div>
                <div style="color:#3b82f6; font-weight:900; font-size:0.75rem;">+2→</div>
                <div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:1.3rem;">🎈</div><div style="font-weight:900; color:#ef4444;">?</div></div>
            </div>
            <div style="background:#eff6ff; padding:6px 12px; border-radius:8px; font-size:0.85rem;">The gap is always <strong style="color:#2563eb;">+2</strong>! So next is <strong>8</strong>!</div>
        </div>`,
    measure: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">📏 Line Up and Read!</div>
            <div style="margin:10px 0; position:relative;">
                <div style="width:140px; height:18px; background:#fde68a; border:2px solid #d97706; border-radius:4px; margin:0 auto;"></div>
                <div style="width:180px; height:24px; background:linear-gradient(180deg,#fef3c7,#fde68a); border:2px solid #b45309; border-radius:4px; margin:4px auto 0; display:flex; justify-content:space-between; padding:0 6px; align-items:flex-end; font-size:0.6rem; font-weight:700;">
                    <span>|0</span><span>|1</span><span>|2</span><span>|3</span><span>|4</span><span>|5</span><span>|6</span><span>|7</span>
                </div>
            </div>
            <div style="display:flex; gap:10px; justify-content:center; font-size:0.8rem; margin-top:4px;">
                <span style="color:#22c55e; font-weight:700;">Start at 0</span>
                <span style="color:#ef4444; font-weight:700;">Read the end</span>
            </div>
        </div>`,
    evolution: `
        <div style="text-align:center;">
            <div style="font-weight:800; margin-bottom:8px;">🧩 Mix and Match Blocks!</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; margin:10px 0;">
                <div style="background:#3b82f6; color:white; font-weight:900; padding:6px 20px; border-radius:6px;">4</div>
                <div style="font-weight:900;">+</div>
                <div style="background:#3b82f6; color:white; font-weight:900; padding:6px 20px; border-radius:6px;">4</div>
                <div style="font-weight:900;">+</div>
                <div style="background:#22c55e; color:white; font-weight:900; padding:6px 14px; border-radius:6px;">3</div>
                <div style="font-weight:900;">=</div>
                <div style="background:#f59e0b; color:white; font-weight:900; padding:6px 12px; border-radius:8px;">11</div>
            </div>
            <div style="background:#eff6ff; padding:6px 12px; border-radius:8px; font-size:0.85rem;">Try different combos! Each block can be used <strong>many times</strong></div>
        </div>`
};

const HINT_COST = 15;

function buyHint(gameId) {
    const bubble = document.getElementById('lab-hint-bubble');
    if (!bubble) return;
    
    if (profileState.hintsUnlocked.includes(gameId)) {
        showHintBubble(gameId);
        return;
    }
    
    if (profileState.stars < HINT_COST) {
        playSound('sad');
        bubble.style.display = 'block';
        bubble.innerHTML = '<div class="hint-bubble"><span class="hint-close" onclick="closeHintBubble()">✖</span><div style="color:var(--color-danger);">Not enough Stars! You need ' + HINT_COST + ' but have ' + profileState.stars + '. Keep solving puzzles!</div></div>';
        return;
    }
    
    profileState.stars -= HINT_COST;
    profileState.hintsUnlocked.push(gameId);
    playSound('chime');
    saveProfile();
    updateHeaderCoins();
    showHintBubble(gameId);
}

function showHintBubble(gameId) {
    const bubble = document.getElementById('lab-hint-bubble');
    if (!bubble) return;
    const hint = gameHints[gameId] || '<div>Think carefully about the numbers!</div>';
    bubble.style.display = 'block';
    bubble.innerHTML = '<div class="hint-bubble" style="max-width:320px;"><span class="hint-close" onclick="closeHintBubble()">✖</span>' + hint + '</div>';
}

function closeHintBubble() {
    const bubble = document.getElementById('lab-hint-bubble');
    if (bubble) bubble.style.display = 'none';
}

// Initialize theme on load
function initShopOnLoad() {
    updateHeaderCoins();
    if (profileState.themeEquipped && profileState.themeEquipped !== 'classic') {
        applyTheme(profileState.themeEquipped);
    }
}

// ── 3D GAME LAUNCHER ──
function launchEvolution3D() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'evolution3d_open' }, '*');
    } else {
        const stage = lab15State.currentStage || 1;
        window.location.href = `/?view=mathquest3d&stage=${stage}`;
    }
}

function closeEvolution3D() {
    const overlay = document.getElementById('evo3d-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        const iframe = document.getElementById('evo3d-frame');
        if (iframe) {
            iframe.src = ''; // Unload to free GPU resources
        }
        overlay.remove();
    }
}

// Listen for messages from 3D game
window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    
    if (e.data.type === 'evolution3d_reward') {
        // Receive coins from 3D game
        profileState.stars += e.data.coins;
        
        // Update stage and features in parent window!
        const nextStage = e.data.stage + 1;
        const finalStage = nextStage > 20 ? 20 : nextStage;
        lab15State.currentStage = Math.max(lab15State.currentStage, finalStage);
        
        const featureIdx = e.data.stage - 1;
        if (featureIdx < 20 && !lab15State.features.includes(featureIdx)) {
            lab15State.features.push(featureIdx);
        }
        
        saveProfile();
        updateHeaderCoins();
        updateEvolutionAvatar();
    } else if (e.data.type === 'evolution3d_close') {
        closeEvolution3D();
    } else if (e.data.type === 'evolution3d_reset_progress') {
        // Reset legacy profile
        profileState = {
            stars: 0,
            attempts: {
                seesaw: { right: 0, wrong: 0 },
                cookies: { right: 0, wrong: 0 },
                birds: { right: 0, wrong: 0 },
                frogger: { right: 0, wrong: 0 },
                alligator: { right: 0, wrong: 0 },
                snapper: { right: 0, wrong: 0 },
                farm: { right: 0, wrong: 0 },
                pizza: { right: 0, wrong: 0 },
                clock: { right: 0, wrong: 0 },
                tangram: { right: 0, wrong: 0 },
                market: { right: 0, wrong: 0 },
                ruler: { right: 0, wrong: 0 },
                evolution: { right: 0, wrong: 0 }
            },
            config: {
                addition: true,
                subtraction: true,
                range: 10
            },
            themesOwned: ['classic'],
            themeEquipped: 'classic',
            stickersOwned: [],
            hintsUnlocked: [],
            costumesOwned: [],
            evolutionStage: 1,
            evolutionFeatures: []
        };
        lab15State.currentStage = 1;
        lab15State.features = [];
        saveProfile();
        updateHeaderCoins();
        updateEvolutionAvatar();
        
        // Reload iframe
        const iframe = document.getElementById('evo3d-frame');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'evolution3d_init',
                coins: 0,
                features: [],
                stage: 1
            }, '*');
        }
    }
});
