const fs = require('fs');

const code = `
function getStageParams(stageNum) {
    const types = ['bridge', 'hill', 'sub_bridge', 'area', 'balance'];
    
    // Cycle through types based on stageNum
    let type = types[(stageNum - 1) % types.length];
    
    // Base difficulty multiplier
    let mult = Math.ceil(stageNum / 5);
    
    // Random helper
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    let target, blocks, slices, weights;
    
    if (type === 'bridge') {
        let a = rand(2, 4) * mult;
        let b = rand(3, 5) * mult;
        if (a === b) b++;
        
        let numA = rand(1, 3);
        let numB = rand(1, 3);
        target = (a * numA) + (b * numB);
        blocks = [a, b];
        
        // Introduce subtraction options at higher stages
        if (stageNum > 5 && Math.random() > 0.5) {
            let c = rand(1, 2) * mult; // negative block
            target = target - c;
            blocks = [a, b, -c]; // means you can add negative block to reduce size
        }
        
        return { type, target, blocks };
    } 
    else if (type === 'hill') {
        let a = rand(2, 4) * mult;
        let b = rand(3, 5) * mult;
        if (a === b) b++;
        
        target = (a * rand(1, 3)) + (b * rand(1, 3));
        blocks = [a, b];
        
        if (stageNum > 5 && Math.random() > 0.5) {
            let c = rand(1, 2) * mult;
            target = target - c;
            blocks = [a, b, -c];
        }
        
        return { type, target, blocks };
    }
    else if (type === 'sub_bridge') {
        let a = rand(2, 4) * mult;
        let b = rand(3, 5) * mult;
        if (a === b) b++;
        
        let removed = (a * rand(1, 3)) + (b * rand(1, 3));
        target = rand(3, 6) * mult;
        let start = target + removed;
        
        slices = [a, b];
        
        if (stageNum > 5 && Math.random() > 0.5) {
            let c = rand(1, 3) * mult; // add back log
            slices = [a, b, -c]; // negative slice = add
        }
        
        return { type, target, start, slices };
    }
    else if (type === 'area') {
        let targetW = rand(3, 5) + Math.floor(stageNum/3);
        let targetH = rand(3, 5) + Math.floor(stageNum/3);
        target = targetW * targetH;
        
        // We ensure pieces tile properly by using 1x1, 1x2, 2x2, etc.
        // For simplicity, area pieces are generated that can fill it.
        let h1 = 1; let w1 = rand(2, 3);
        let h2 = rand(2, 3); let w2 = 1;
        let h3 = 1; let w3 = 1;
        
        let area1 = w1 * h1;
        let area2 = w2 * h2;
        let area3 = w3 * h3;
        
        return { type, target, targetW, targetH, blocks: [[area1, w1, h1], [area2, w2, h2], [area3, w3, h3]] };
    }
    else if (type === 'balance') {
        let a = rand(2, 5) * mult;
        let b = rand(3, 6) * mult;
        if (a === b) b++;
        
        target = (a * rand(1, 3)) + (b * rand(1, 3));
        weights = [a, b];
        
        if (stageNum > 5 && Math.random() > 0.5) {
            let c = rand(1, 2) * mult; // helium balloon to reduce weight
            target = target - c;
            weights = [a, b, -c];
        }
        
        return { type, target, weights };
    }
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
        instruction.textContent = \`Drag blocks to build a bridge exactly \${params.target} units long!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; position:relative;">
                <div style="flex:1; height:80px; background:#475569; border-radius:12px 12px 0 0; border-right:4px dashed #cbd5e1;"></div>
                <div id="bridge-gap" style="width:\${params.target * 20}px; height:40px; border-bottom:4px dashed #94a3b8; display:flex; gap:0; align-items:flex-end; justify-content:flex-start; box-sizing:border-box;"></div>
                <div style="flex:1; height:80px; background:#475569; border-radius:12px 12px 0 0; border-left:4px dashed #cbd5e1;"></div>
            </div>
        \`;
        let buttonsHTML = params.blocks.map(b => {
            if (b > 0) return \`<button class="bubble-btn primary" onclick="addEvolutionBlock(\${b})">➕ Add \${b}</button>\`;
            return \`<button class="bubble-btn danger" onclick="addEvolutionBlock(\${b})">➖ Remove \${Math.abs(b)}</button>\`;
        }).join('');
        controls.innerHTML = buttonsHTML + \`
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Bridge</button>
        \`;
    } 
    else if (params.type === 'hill') {
        instruction.textContent = \`Build stairs exactly \${params.target} units high to climb the wall!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; gap:0;">
                <div id="hill-stack" style="width:80px; height:\${params.target * 15}px; border:4px dashed #94a3b8; border-bottom:none; border-right:none; display:flex; flex-direction:column-reverse; align-items:center; gap:0; box-sizing:border-box;"></div>
                <div style="width:80px; height:\${params.target * 15}px; background:#475569; border-radius:12px 12px 0 0; display:flex; justify-content:center; color:white; font-weight:bold; padding-top:10px;">Goal: \${params.target}</div>
            </div>
        \`;
        let buttonsHTML = params.blocks.map(b => {
            if (b > 0) return \`<button class="bubble-btn success" onclick="addEvolutionBlock(\${b})">➕ Stack \${b}</button>\`;
            return \`<button class="bubble-btn danger" onclick="addEvolutionBlock(\${b})">🔨 Dig \${Math.abs(b)}</button>\`;
        }).join('');
        controls.innerHTML = buttonsHTML + \`
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Stairs</button>
        \`;
    }
    else if (params.type === 'sub_bridge') {
        lab15State.currentValue = params.start;
        instruction.textContent = \`Start with a \${params.start}-unit log, make it exactly \${params.target} units to cross the river!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; position:relative;">
                <div style="flex:1; height:60px; background:#64748b; border-radius:12px 12px 0 0; border-right:4px dashed #cbd5e1;"></div>
                <div style="width:\${params.target * 15}px; height:40px; background:rgba(56, 189, 248, 0.3); border-bottom:4px dashed #0284c7; position:relative; display:flex; align-items:flex-end; justify-content:flex-start;">
                    <div id="sub-log" style="position:absolute; bottom:0; left:0; width:\${params.start * 15}px; height:30px; background:#d97706; border:2px solid #78350f; border-radius:8px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; transition:width 0.3s; box-sizing:border-box;">\${params.start}</div>
                </div>
                <div style="flex:1; height:60px; background:#64748b; border-radius:12px 12px 0 0; border-left:4px dashed #cbd5e1;"></div>
            </div>
        \`;
        let buttonsHTML = params.slices.map(s => {
            if (s > 0) return \`<button class="bubble-btn danger" onclick="sliceEvolutionBlock(\${s})">✂️ Slice \${s}</button>\`;
            return \`<button class="bubble-btn primary" onclick="sliceEvolutionBlock(\${s})">🌱 Grow \${Math.abs(s)}</button>\`;
        }).join('');
        controls.innerHTML = buttonsHTML + \`
            <button class="bubble-btn muted" onclick="loadLab15Stage(\${stageNum})">🔄 Reset Log</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Log</button>
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
                    <div id="target-area-box" style="width:\${targetWpx}px; height:\${targetHpx}px; border:4px dashed #64748b; background:rgba(100,116,139,0.1); display:flex; align-content:flex-start; flex-wrap:wrap; position:relative; overflow:hidden; box-sizing:content-box;"></div>
                </div>
            </div>
        \`;
        let buttonsHTML = params.blocks.map(b => {
            return \`<button class="bubble-btn primary" onclick="addEvolutionBlock(\${b[0]}, \${b[1]}, \${b[2]})">➕ Add \${b[1]}x\${b[2]}</button>\`;
        }).join('');
        controls.innerHTML = buttonsHTML + \`
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Area</button>
        \`;
    }
    else if (params.type === 'balance') {
        instruction.textContent = \`Balance the gate mechanism at exactly \${params.target} units to proceed!\`;
        scene.innerHTML = \`
            <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end;">
                <div id="balance-beam" style="width:250px; height:20px; background:#94a3b8; border:3px solid #475569; border-radius:10px; display:flex; align-items:flex-end; justify-content:space-between; padding:0 20px; transition:transform 0.5s ease; transform:rotate(-15deg); box-sizing:border-box; position:relative;">
                    <div style="position:absolute; bottom:150%; left:10px; background:#fef3c7; padding:5px 10px; border-radius:8px; border:2px solid #f59e0b; font-weight:bold;">Goal: \${params.target}</div>
                    <div id="balance-container" style="display:flex; flex-wrap:wrap; gap:2px; align-items:flex-end; height:100%; margin-bottom:20px;"></div>
                </div>
                <div style="width:0; height:0; border-left:30px solid transparent; border-right:30px solid transparent; border-bottom:40px solid #64748b; margin-top:-5px; z-index:-1;"></div>
            </div>
        \`;
        let buttonsHTML = params.weights.map(w => {
            if (w > 0) return \`<button class="bubble-btn primary" onclick="addEvolutionBlock(\${w})">⚖️ Add \${w}</button>\`;
            return \`<button class="bubble-btn danger" onclick="addEvolutionBlock(\${w})">🎈 Balloon \${Math.abs(w)}</button>\`;
        }).join('');
        controls.innerHTML = buttonsHTML + \`
            <button class="bubble-btn muted" onclick="clearEvolutionBlocks()">🧹 Clear</button>
            <button class="bubble-btn warning" onclick="checkEvolutionPuzzle()">✨ Verify Balance</button>
        \`;
    }
}
`;

const file = 'c:/Users/shashank/Desktop/Rig_teaching/maths/grade1_grade2/app.js';
let content = fs.readFileSync(file, 'utf8');

let getStageParamsIdx = content.indexOf('function getStageParams(stageNum)');
let addEvolutionBlockIdx = content.indexOf('function addEvolutionBlock(val');

if (getStageParamsIdx !== -1 && addEvolutionBlockIdx !== -1) {
    content = content.substring(0, getStageParamsIdx) + code + content.substring(addEvolutionBlockIdx);
    fs.writeFileSync(file, content);
    console.log('Successfully updated random logic.');
} else {
    console.log('Could not find functions to replace.');
}
