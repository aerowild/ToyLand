const fs = require('fs');

const code = `
// ==========================================================================
// LAB 15: Character Evolution
// ==========================================================================
let lab15State = {
    currentStage: 1,
    maxStage: 20,
    features: [], 
    targetValue: 0,
    currentValue: 0,
    puzzleType: ''
};

function resetLab15() {
    lab15State.currentStage = 1;
    lab15State.features = [];
    loadLab15Stage(lab15State.currentStage);
}

function updateEvolutionAvatar() {
    const avatar = document.getElementById('evolution-avatar');
    if (!avatar) return;
    
    avatar.className = 'avatar-stick';
    lab15State.features.forEach(f => avatar.classList.add(f));
    
    const bar = document.getElementById('evolution-progress-bar');
    if (bar) {
        bar.style.width = ((lab15State.currentStage - 1) / lab15State.maxStage * 100) + '%';
    }
}

function nextEvolutionStage(featureReward) {
    if (featureReward && !lab15State.features.includes(featureReward)) {
        lab15State.features.push(featureReward);
    }
    
    trackAnswer('evolution', true);
    
    lab15State.currentStage++;
    updateEvolutionAvatar();
    
    const status = document.getElementById('evolution-status');
    if (status) {
        status.innerHTML = '<span style="color:var(--color-success)">🎉 Stage Cleared! Evolving... 🎉</span>';
    }
    
    setTimeout(() => {
        if (lab15State.currentStage > 20) {
            if (status) status.innerHTML = '<span style="color:var(--color-success)">🎉 You completed ALL 20 evolution stages! You are the ultimate Hero! 🎉</span>';
        } else {
            loadLab15Stage(lab15State.currentStage);
        }
    }, 2500);
}

function getStageParams(stageNum) {
    const stages = [
        {}, // 0 index unused
        { type: 'bridge', target: 12, blocks: [2, 5] },
        { type: 'hill', target: 10, blocks: [3, 4] },
        { type: 'sub_bridge', target: 8, start: 15, slices: [2, 5] },
        { type: 'area', target: 16, targetW: 4, targetH: 4, blocks: [[4, 2, 2], [6, 2, 3]] },
        { type: 'balance', target: 14, weights: [4, 6] },
        
        { type: 'bridge', target: 15, blocks: [3, 5] },
        { type: 'hill', target: 12, blocks: [2, 4] },
        { type: 'sub_bridge', target: 10, start: 20, slices: [4, 6] },
        { type: 'area', target: 24, targetW: 6, targetH: 4, blocks: [[8, 2, 4], [12, 3, 4]] },
        { type: 'balance', target: 20, weights: [5, 10] },
        
        { type: 'bridge', target: 20, blocks: [4, 6] },
        { type: 'hill', target: 15, blocks: [3, 5] },
        { type: 'sub_bridge', target: 12, start: 25, slices: [5, 8] },
        { type: 'area', target: 36, targetW: 6, targetH: 6, blocks: [[9, 3, 3], [12, 3, 4]] },
        { type: 'balance', target: 25, weights: [5, 15] },
        
        { type: 'bridge', target: 24, blocks: [6, 8] },
        { type: 'hill', target: 20, blocks: [4, 5] },
        { type: 'sub_bridge', target: 15, start: 30, slices: [5, 10] },
        { type: 'area', target: 48, targetW: 8, targetH: 6, blocks: [[16, 4, 4], [20, 5, 4]] },
        { type: 'balance', target: 30, weights: [10, 15] }
    ];
    return stages[stageNum] || stages[1];
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

    const titles = {
        'bridge': 'The Gap Bridge',
        'hill': 'The High Wall',
        'sub_bridge': 'The Subtraction River',
        'area': 'The Area Wall',
        'balance': 'The Balance Gate'
    };
    
    stageHeader.textContent = \`Stage \${stageNum}: \${titles[params.type]}\`;

    if (params.type === 'bridge') {
        instruction.textContent = \`Drag blocks to build a bridge across the \${params.target}-unit gap!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:space-between; position:relative;">
                <div style="width:20%; height:80px; background:#475569; border-radius:12px 12px 0 0;"></div>
                <div id="bridge-gap" style="width:60%; height:40px; border-bottom:4px dashed #94a3b8; display:flex; gap:2px; align-items:center; justify-content:center; padding:0 10px;"></div>
                <div style="width:20%; height:80px; background:#475569; border-radius:12px 12px 0 0;"></div>
            </div>
        \`;
        controls.innerHTML = \`
            <button class="bubble-btn primary" onclick="addEvolutionBlock(\${params.blocks[0]})">➕ Add \${params.blocks[0]}-Block</button>
            <button class="bubble-btn success" onclick="addEvolutionBlock(\${params.blocks[1]})">➕ Add \${params.blocks[1]}-Block</button>
            <button class="bubble-btn danger" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Bridge</button>
        \`;
    } 
    else if (params.type === 'hill') {
        instruction.textContent = \`Stack blocks to build stairs exactly \${params.target} units high to climb the wall!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; gap:20px;">
                <div id="hill-stack" style="width:80px; min-height:20px; border:4px dashed #94a3b8; border-bottom:none; display:flex; flex-direction:column-reverse; align-items:center; gap:2px;"></div>
                <div style="width:60px; height:150px; background:#475569; border-radius:12px 12px 0 0; display:flex; justify-content:center; color:white; font-weight:bold; padding-top:10px;">Goal: \${params.target}</div>
            </div>
        \`;
        controls.innerHTML = \`
            <button class="bubble-btn primary" onclick="addEvolutionBlock(\${params.blocks[0]})">➕ Add Height \${params.blocks[0]}</button>
            <button class="bubble-btn success" onclick="addEvolutionBlock(\${params.blocks[1]})">➕ Add Height \${params.blocks[1]}</button>
            <button class="bubble-btn danger" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Stairs</button>
        \`;
    }
    else if (params.type === 'sub_bridge') {
        lab15State.currentValue = params.start;
        instruction.textContent = \`Start with a \${params.start}-unit log, then slice off parts to make it exactly \${params.target} units to cross the river!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:space-between; position:relative;">
                <div style="width:15%; height:60px; background:#64748b; border-radius:12px 12px 0 0;"></div>
                <div style="flex:1; height:40px; background:rgba(56, 189, 248, 0.3); border-bottom:4px dashed #0284c7; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding-bottom:5px;">
                    <div id="sub-log" style="width:200px; height:30px; background:#d97706; border:3px solid #78350f; border-radius:8px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; transition:width 0.3s;">\${params.start}</div>
                </div>
                <div style="width:15%; height:60px; background:#64748b; border-radius:12px 12px 0 0;"></div>
            </div>
        \`;
        controls.innerHTML = \`
            <button class="bubble-btn danger" onclick="sliceEvolutionBlock(\${params.slices[0]})">✂️ Slice \${params.slices[0]}</button>
            <button class="bubble-btn warning" onclick="sliceEvolutionBlock(\${params.slices[1]})">✂️ Slice \${params.slices[1]}</button>
            <button class="bubble-btn muted" onclick="loadLab15Stage(\${stageNum})">🔄 Reset Log</button>
            <button class="bubble-btn success" onclick="checkEvolutionPuzzle()">✨ Verify Log</button>
        \`;
    }
    else if (params.type === 'area') {
        instruction.textContent = \`Match the area of the wall (\${params.target} square units) by combining blocks!\`;
        const targetWpx = params.targetW * 20;
        const targetHpx = params.targetH * 20;
        
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; gap:40px;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                    <div style="font-weight:bold; color:#475569;">Target Area (\${params.targetW}x\${params.targetH})</div>
                    <div id="target-area-box" style="width:\${targetWpx}px; height:\${targetHpx}px; border:4px dashed #64748b; background:rgba(100,116,139,0.1); display:flex; align-content:flex-start; flex-wrap:wrap; position:relative; overflow:hidden;"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                    <div style="font-weight:bold; color:#475569;">Your Blocks</div>
                    <div id="area-container" style="display:flex; flex-wrap:wrap; width:120px; gap:4px; justify-content:center; display:none;"></div>
                </div>
            </div>
        \`;
        controls.innerHTML = \`
            <button class="bubble-btn primary" onclick="addEvolutionBlock(\${params.blocks[0][0]}, \${params.blocks[0][1]}, \${params.blocks[0][2]})">➕ Add \${params.blocks[0][1]}x\${params.blocks[0][2]} Block (Area \${params.blocks[0][0]})</button>
            <button class="bubble-btn success" onclick="addEvolutionBlock(\${params.blocks[1][0]}, \${params.blocks[1][1]}, \${params.blocks[1][2]})">➕ Add \${params.blocks[1][1]}x\${params.blocks[1][2]} Block (Area \${params.blocks[1][0]})</button>
            <button class="bubble-btn danger" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Area</button>
        \`;
    }
    else if (params.type === 'balance') {
        instruction.textContent = \`Balance the gate mechanism at exactly \${params.target} units of weight to proceed!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center;">
                <div style="width:200px; height:120px; border:4px solid #cbd5e1; border-bottom:none; border-radius:20px 20px 0 0; position:relative; display:flex; justify-content:center;">
                    <div style="position:absolute; top:-20px; background:#fef3c7; padding:5px 15px; border-radius:10px; border:3px solid #f59e0b; font-weight:bold;">Goal: \${params.target}</div>
                    <div id="balance-container" style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:space-around; padding-bottom:10px;"></div>
                </div>
            </div>
        \`;
        controls.innerHTML = \`
            <button class="bubble-btn primary" onclick="addEvolutionBlock(\${params.weights[0]})">➕ Add \${params.weights[0]} Weight</button>
            <button class="bubble-btn success" onclick="addEvolutionBlock(\${params.weights[1]})">➕ Add \${params.weights[1]} Weight</button>
            <button class="bubble-btn danger" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Balance</button>
        \`;
    }
}

function addEvolutionBlock(val, w=0, h=0) {
    playSound('pop');
    lab15State.currentValue += val;
    
    if (lab15State.puzzleType === 'bridge') {
        const gap = document.getElementById('bridge-gap');
        const block = document.createElement('div');
        block.style.cssText = \`width:\${val * 15}px; height:30px; background:var(--color-primary); border:3px solid #1e40af; border-radius:6px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.9rem;\`;
        block.textContent = val;
        gap.appendChild(block);
    } else if (lab15State.puzzleType === 'hill') {
        const stack = document.getElementById('hill-stack');
        const block = document.createElement('div');
        block.style.cssText = \`width:60px; height:\${val * 15}px; background:var(--color-success); border:3px solid #166534; border-radius:6px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.9rem;\`;
        block.textContent = val;
        stack.appendChild(block);
    } else if (lab15State.puzzleType === 'area') {
        const container = document.getElementById('target-area-box');
        const block = document.createElement('div');
        block.style.cssText = \`width:\${w * 20}px; height:\${h * 20}px; background:var(--color-accent); border:2px solid #6b21a8; box-sizing:border-box; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.8rem;\`;
        block.textContent = val;
        container.appendChild(block);
    } else if (lab15State.puzzleType === 'balance') {
        const container = document.getElementById('balance-container');
        const block = document.createElement('div');
        block.style.cssText = \`width:40px; height:40px; border-radius:50%; background:var(--color-warning); border:3px solid #c2410c; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold;\`;
        block.textContent = val;
        container.appendChild(block);
    }
}

function sliceEvolutionBlock(val) {
    if (lab15State.currentValue - val < 0) {
        playSound('sad');
        const status = document.getElementById('evolution-status');
        if (status) status.innerHTML = '<span style="color:var(--color-danger)">⚠️ Cannot slice that much!</span>';
        return;
    }
    playSound('slide');
    lab15State.currentValue -= val;
    
    if (lab15State.puzzleType === 'sub_bridge') {
        const log = document.getElementById('sub-log');
        if (log) {
            log.style.width = (lab15State.currentValue * 13) + 'px';
            log.textContent = lab15State.currentValue;
        }
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
    } else if (lab15State.puzzleType === 'balance') {
        document.getElementById('balance-container').innerHTML = '';
    }
}

function checkEvolutionPuzzle() {
    const status = document.getElementById('evolution-status');
    if (!status) return;
    
    if (lab15State.currentValue === lab15State.targetValue) {
        playSound('success');
        triggerConfetti();
        
        const rewards = [
            '', 'feature-muscles', 'feature-shirt', 'feature-pants', 'feature-shoes', 'feature-color',
            'feature-hair', 'feature-cape', 'feature-belt', 'feature-gloves', 'feature-shield',
            'feature-sword', 'feature-crown', 'feature-pet', 'feature-aura', 'feature-wings',
            'feature-wand', 'feature-helmet', 'feature-armor', 'feature-boots', 'feature-badge'
        ];
        let featureReward = rewards[lab15State.currentStage] || '';
        
        nextEvolutionStage(featureReward);
    } else {
        playSound('sad');
        trackAnswer('evolution', false);
        status.innerHTML = \`<span style="color:var(--color-danger)">⚠️ Not quite! You have \${lab15State.currentValue}, but you need \${lab15State.targetValue}. Try again!</span>\`;
    }
}
`;

const file = 'c:/Users/shashank/Desktop/Rig_teaching/maths/grade1_grade2/app.js';
let content = fs.readFileSync(file, 'utf8');

const marker = '// LAB 15: Character Evolution';
let idx = content.indexOf(marker);

if (idx !== -1) {
    // find the previous line start
    let startIdx = content.lastIndexOf('// =================================', idx);
    if (startIdx !== -1) {
        content = content.substring(0, startIdx) + code;
        fs.writeFileSync(file, content);
        console.log('Successfully updated app.js');
    } else {
        console.log('Could not find start marker');
    }
} else {
    console.log('Could not find LAB 15 marker');
}
