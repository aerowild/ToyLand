const fs = require('fs');

const code = `
function addEvolutionBlock(val, w=0, h=0) {
    playSound('pop');
    lab15State.currentValue += val;
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    
    if (lab15State.puzzleType === 'bridge') {
        const gap = document.getElementById('bridge-gap');
        const block = document.createElement('div');
        let css = \`width:\${absVal * 20}px; height:30px; border-radius:4px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.9rem; box-sizing:border-box;\`;
        if (isNeg) {
            css += \`background:var(--color-danger); border:2px dashed #7f1d1d; margin-left:\${val * 20}px; z-index:10; opacity:0.9;\`;
            block.textContent = val;
        } else {
            css += \`background:var(--color-primary); border:2px solid #1e40af;\`;
            block.textContent = val;
        }
        block.style.cssText = css;
        gap.appendChild(block);
    } else if (lab15State.puzzleType === 'hill') {
        const stack = document.getElementById('hill-stack');
        const block = document.createElement('div');
        let css = \`width:100%; height:\${absVal * 15}px; border-radius:4px; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.9rem; box-sizing:border-box;\`;
        if (isNeg) {
            css += \`background:var(--color-danger); border:2px dashed #7f1d1d; margin-bottom:\${val * 15}px; z-index:10; opacity:0.9;\`;
            block.textContent = val;
        } else {
            css += \`background:var(--color-success); border:2px solid #166534;\`;
            block.textContent = val;
        }
        block.style.cssText = css;
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
        let css = \`width:30px; height:30px; border-radius:50%; display:flex; justify-content:center; align-items:center; color:white; font-weight:bold; font-size:0.8rem; box-sizing:border-box;\`;
        if (isNeg) {
            css += \`background:var(--color-danger); border:2px dashed #7f1d1d; align-self:flex-start; margin-bottom:40px;\`;
            block.textContent = val;
        } else {
            css += \`background:var(--color-warning); border:2px solid #c2410c;\`;
            block.textContent = val;
        }
        block.style.cssText = css;
        container.appendChild(block);
    }
}
`;

const file = 'c:/Users/shashank/Desktop/Rig_teaching/maths/grade1_grade2/app.js';
let content = fs.readFileSync(file, 'utf8');

let startIdx = content.indexOf('function addEvolutionBlock(val');
let endIdx = content.indexOf('function sliceEvolutionBlock(val');

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + code + content.substring(endIdx);
    fs.writeFileSync(file, content);
    console.log('Successfully updated addEvolutionBlock with negative logic.');
} else {
    console.log('Could not find functions to replace.');
}
