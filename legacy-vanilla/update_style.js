const fs = require('fs');

const css = `
/* Stage 6-20 Evolutions */
.avatar-stick.feature-hair .avatar-head::before { content: ''; position: absolute; top: -8px; left: -5px; width: 34px; height: 15px; background: #ea580c; border-radius: 15px 15px 0 0; }
.avatar-stick.feature-belt .avatar-body::after { content: ''; position: absolute; top: 35px; left: -2px; width: 24px; height: 8px; background: #f59e0b; border: 2px solid #b45309; border-radius: 4px; z-index: 6; }
.avatar-stick.feature-gloves .avatar-arms::before { content: ''; position: absolute; left: -8px; top: -5px; width: 16px; height: 16px; background: #2563eb; border-radius: 50%; z-index: 7; }
.avatar-stick.feature-gloves .avatar-arms::after { content: ''; position: absolute; right: -8px; top: -5px; width: 16px; height: 16px; background: #2563eb; border-radius: 50%; z-index: 7; }
.avatar-stick.feature-shield .avatar-body::before { content: ''; position: absolute; left: 25px; top: 10px; width: 35px; height: 45px; background: #94a3b8; border: 4px solid #475569; border-radius: 5px 5px 20px 20px; z-index: 8; }
.avatar-stick.feature-sword .avatar-arms::after { content: ''; position: absolute; left: -20px; top: -45px; width: 6px; height: 60px; background: #cbd5e1; border: 2px solid #64748b; border-radius: 2px; transform: rotate(-20deg); z-index: 6; }
.avatar-stick.feature-crown .avatar-head::after { content: ''; position: absolute; top: -20px; left: 0; width: 24px; height: 15px; background: #fbbf24; clip-path: polygon(0 0, 20% 50%, 50% 0, 80% 50%, 100% 0, 100% 100%, 0 100%); z-index: 6; }
.avatar-stick.feature-pet::after { content: '🐕'; position: absolute; left: 70px; top: 100px; font-size: 2.5rem; z-index: 5; }
.avatar-stick.feature-aura { box-shadow: 0 0 40px 15px rgba(56, 189, 248, 0.6); border-radius: 50%; }
.avatar-stick.feature-wings::before { content: '🦋'; position: absolute; left: -15px; top: 20px; font-size: 4.5rem; opacity: 0.9; z-index: 0; }
.avatar-stick.feature-wand .avatar-arms::before { content: ''; position: absolute; right: -15px; top: -35px; width: 6px; height: 45px; background: #b45309; transform: rotate(20deg); z-index: 6; }
.avatar-stick.feature-helmet .avatar-head { border: 6px solid #64748b; background: #cbd5e1 !important; }
.avatar-stick.feature-armor .avatar-body { background: #94a3b8 !important; border: 4px solid #475569; border-radius: 10px; }
.avatar-stick.feature-boots .avatar-legs { border-bottom: 18px solid #4338ca !important; border-radius: 10px; }
.avatar-stick.feature-badge .avatar-body::before { content: '⭐'; position: absolute; top: 5px; left: 2px; font-size: 1.2rem; z-index: 9; }
`;

const file = 'c:/Users/shashank/Desktop/Rig_teaching/maths/grade1_grade2/style.css';
fs.appendFileSync(file, css);
console.log('Appended styles successfully.');
