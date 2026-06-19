// src/components/MiniGames.jsx - Interactive 2D math mini-games in React
import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';

// ==========================================
// 1. COOKIE MONSTER SUBTRACTION
// ==========================================
export function CookieMonsterGame({ onEarnStars }) {
    const [cookiesInJar, setCookiesInJar] = useState(12);
    const [cookiesEaten, setCookiesEaten] = useState(0);
    const [targetEat, setTargetEat] = useState(5);
    const [gameState, setGameState] = useState('playing'); // playing, success

    const initRound = () => {
        const jarCount = Math.floor(Math.random() * 6) + 8; // 8 to 13
        const target = Math.floor(Math.random() * 5) + 3; // 3 to 7
        setCookiesInJar(jarCount);
        setCookiesEaten(0);
        setTargetEat(target);
        setGameState('playing');
    };

    useEffect(() => {
        initRound();
    }, []);

    const feedCookie = () => {
        if (gameState !== 'playing' || cookiesInJar <= 0) return;
        playSound('crunch');
        setCookiesInJar(c => c - 1);
        setCookiesEaten(e => {
            const nextEaten = e + 1;
            if (nextEaten === targetEat) {
                setGameState('success');
                playSound('success');
                onEarnStars(5);
            }
            return nextEaten;
        });
    };

    return (
        <div className="mini-game-container" style={gameContainerStyle}>
            <h3 style={titleStyle}>🍪 Cookie Monster Subtraction</h3>
            <p style={descStyle}>
                The Monster wants to eat exactly <strong>{targetEat}</strong> cookies. 
                Feed them one by one!
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '20px 0', width: '100%' }}>
                {/* Cookie Jar */}
                <div style={{ textAlign: 'center' }}>
                    <div style={jarStyle}>
                        <div style={{ fontSize: '3rem', cursor: cookiesInJar > 0 ? 'pointer' : 'default' }} onClick={feedCookie}>🍯</div>
                        <div style={labelStyle}>{cookiesInJar} Cookies left</div>
                    </div>
                </div>

                {/* Subtraction Formula */}
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#64748b' }}>
                    {cookiesInJar + cookiesEaten} - {cookiesEaten} = {cookiesInJar}
                </div>

                {/* Monster */}
                <div style={{ textAlign: 'center' }}>
                    <div style={monsterStyle}>
                        <div style={{ fontSize: '4.5rem', animation: gameState === 'playing' && cookiesEaten > 0 ? 'wiggle 0.5s infinite' : 'none' }}>
                            {gameState === 'success' ? '😋' : '👾'}
                        </div>
                        <div style={labelStyle}>{cookiesEaten} / {targetEat} eaten</div>
                    </div>
                </div>
            </div>

            {gameState === 'success' ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#16a34a', fontWeight: '800', fontSize: '1.25rem', marginBottom: '10px' }}>
                        🎉 Great Job! You earned +5 Stars!
                    </div>
                    <button className="bubble-btn success" onClick={initRound} style={buttonStyle}>
                        Next Round →
                    </button>
                </div>
            ) : (
                <button className="bubble-btn primary" onClick={feedCookie} disabled={cookiesInJar === 0} style={{ ...buttonStyle, background: '#f59e0b', borderColor: '#d97706' }}>
                    🍪 Feed 1 Cookie
                </button>
            )}
        </div>
    );
}

// ==========================================
// 2. SEE-SAW BALANCE
// ==========================================
export function SeeSawGame({ onEarnStars }) {
    const [leftWeight, setLeftWeight] = useState(8);
    const [rightWeight, setRightWeight] = useState(3);
    const [targetBalance, setTargetBalance] = useState(8);

    const initRound = () => {
        const left = Math.floor(Math.random() * 7) + 5; // 5 to 11
        const initialRight = Math.floor(Math.random() * 4) + 1; // 1 to 4
        setLeftWeight(left);
        setTargetBalance(left);
        setRightWeight(initialRight);
    };

    useEffect(() => {
        initRound();
    }, []);

    const addWeight = (val) => {
        playSound('pop');
        setRightWeight(w => {
            const next = Math.max(0, w + val);
            if (next === targetBalance) {
                playSound('success');
                onEarnStars(8);
            }
            return next;
        });
    };

    // Calculate angle of tilt
    const diff = leftWeight - rightWeight;
    const tiltAngle = Math.max(-15, Math.min(15, diff * 3.5));

    return (
        <div className="mini-game-container" style={gameContainerStyle}>
            <h3 style={titleStyle}>⚖️ See-Saw Weight Balance</h3>
            <p style={descStyle}>
                Add or lift weights on the right side to balance the see-saw! (Target = <strong>{targetBalance}</strong>)
            </p>

            {/* See saw drawing */}
            <div style={{ height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', width: '100%', margin: '20px 0' }}>
                {/* Board */}
                <div style={{
                    width: '80%',
                    height: '14px',
                    background: '#d97706',
                    border: '3px solid #b45309',
                    borderRadius: '8px',
                    margin: '0 auto',
                    position: 'relative',
                    transformOrigin: 'center center',
                    transform: `rotate(${tiltAngle}deg)`,
                    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    boxSizing: 'border-box'
                }}>
                    {/* Left weight display */}
                    <div style={{
                        position: 'absolute',
                        bottom: '14px',
                        left: '10px',
                        background: '#3b82f6',
                        color: 'white',
                        border: '3px solid #1d4ed8',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        transform: `rotate(${-tiltAngle}deg)`,
                        transition: 'transform 0.4s'
                    }}>
                        ⚖️ {leftWeight}
                    </div>

                    {/* Right weight display */}
                    <div style={{
                        position: 'absolute',
                        bottom: '14px',
                        right: '10px',
                        background: rightWeight === targetBalance ? '#22c55e' : '#f59e0b',
                        color: 'white',
                        border: '3px solid #166534',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        transform: `rotate(${-tiltAngle}deg)`,
                        transition: 'transform 0.4s, background-color 0.2s'
                    }}>
                        {rightWeight}
                    </div>
                </div>

                {/* Fulcrum (Stand) */}
                <div style={{
                    width: '0',
                    height: '0',
                    borderLeft: '24px solid transparent',
                    borderRight: '24px solid transparent',
                    borderBottom: '40px solid #64748b',
                    margin: '0 auto',
                    zIndex: 0
                }} />
            </div>

            {leftWeight === rightWeight ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#16a34a', fontWeight: '800', fontSize: '1.25rem', marginBottom: '10px' }}>
                        🎉 Perfectly Balanced! You earned +8 Stars!
                    </div>
                    <button className="bubble-btn success" onClick={initRound} style={buttonStyle}>
                        Next Round →
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="bubble-btn primary" onClick={() => addWeight(1)} style={btnStyle}>➕ Add 1</button>
                    <button className="bubble-btn primary" onClick={() => addWeight(3)} style={btnStyle}>➕ Add 3</button>
                    {rightWeight > 0 && (
                        <button className="bubble-btn danger" onClick={() => addWeight(-2)} style={{ ...btnStyle, background: '#ef4444', borderColor: '#dc2626' }}>🎈 Lift 2</button>
                    )}
                </div>
            )}
        </div>
    );
}

// ==========================================
// 3. ALLIGATOR COMPARISONS
// ==========================================
export function AlligatorGame({ onEarnStars }) {
    const [leftCount, setLeftCount] = useState(5);
    const [rightCount, setRightCount] = useState(8);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const initRound = () => {
        const left = Math.floor(Math.random() * 8) + 2; // 2 to 9
        let right = Math.floor(Math.random() * 8) + 2; // 2 to 9
        setLeftCount(left);
        setRightCount(right);
        setAnswered(false);
    };

    useEffect(() => {
        initRound();
    }, []);

    const makeChoice = (symbol) => {
        if (answered) return;
        
        let correct = false;
        if (symbol === '<' && leftCount < rightCount) correct = true;
        if (symbol === '>' && leftCount > rightCount) correct = true;
        if (symbol === '=' && leftCount === rightCount) correct = true;

        setIsCorrect(correct);
        setAnswered(true);

        if (correct) {
            playSound('success');
            onEarnStars(5);
        } else {
            playSound('sad');
        }
    };

    return (
        <div className="mini-game-container" style={gameContainerStyle}>
            <h3 style={titleStyle}>🐊 Hungry Alligator Comparisons</h3>
            <p style={descStyle}>
                Feed the alligator! Choose the mouth symbol pointing towards the larger group of fish!
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '20px 0', width: '100%' }}>
                {/* Left Group */}
                <div style={bowlStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', width: '90px', justifyContent: 'center' }}>
                        {Array.from({ length: leftCount }).map((_, i) => (
                            <span key={i} style={{ fontSize: '1.6rem' }}>🐟</span>
                        ))}
                    </div>
                    <div style={labelStyle}>{leftCount} Fish</div>
                </div>

                {/* Alligator Mouth */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {answered ? (
                        <div style={{ fontSize: '3rem', fontWeight: '900', color: isCorrect ? '#22c55e' : '#ef4444' }}>
                            {leftCount > rightCount ? '>' : leftCount < rightCount ? '<' : '='}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="bubble-btn warning" onClick={() => makeChoice('>')} style={symBtnStyle}>🐊 &gt;</button>
                            <button className="bubble-btn warning" onClick={() => makeChoice('=')} style={symBtnStyle}>🐊 =</button>
                            <button className="bubble-btn warning" onClick={() => makeChoice('<')} style={symBtnStyle}>&lt; 🐊</button>
                        </div>
                    )}
                </div>

                {/* Right Group */}
                <div style={bowlStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', width: '90px', justifyContent: 'center' }}>
                        {Array.from({ length: rightCount }).map((_, i) => (
                            <span key={i} style={{ fontSize: '1.6rem' }}>🐟</span>
                        ))}
                    </div>
                    <div style={labelStyle}>{rightCount} Fish</div>
                </div>
            </div>

            {answered && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: isCorrect ? '#16a34a' : '#ef4444', fontWeight: '800', fontSize: '1.25rem', marginBottom: '10px' }}>
                        {isCorrect ? '🎉 Correct! Alligator is full! +5 Stars' : '❌ Oh no! Alligator got confused!'}
                    </div>
                    <button className="bubble-btn success" onClick={initRound} style={buttonStyle}>
                        Next Round →
                    </button>
                </div>
            )}
        </div>
    );
}

// Styles
const gameContainerStyle = {
    background: 'white',
    border: '4px solid #e2e8f0',
    borderRadius: '20px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
    boxSizing: 'border-box'
};

const titleStyle = {
    fontFamily: "'Fredoka', sans-serif",
    fontSize: '1.35rem',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 5px 0',
    textAlign: 'center'
};

const descStyle = {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: '0 0 15px 0',
    textAlign: 'center',
    lineHeight: '1.4'
};

const jarStyle = {
    background: '#f8fafc',
    border: '3px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
};

const bowlStyle = {
    background: '#e0f2fe',
    border: '3px solid #7dd3fc',
    borderRadius: '16px',
    padding: '16px',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
};

const monsterStyle = {
    background: '#fef2f2',
    border: '3px dashed #fecaca',
    borderRadius: '16px',
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
};

const labelStyle = {
    fontSize: '0.82rem',
    fontWeight: '800',
    color: '#475569',
    marginTop: '6px'
};

const buttonStyle = {
    padding: '10px 24px',
    fontSize: '1.05rem',
    fontWeight: '800',
    borderRadius: '14px',
    cursor: 'pointer'
};

const btnStyle = {
    padding: '8px 16px',
    fontSize: '0.95rem',
    fontWeight: '800',
    borderRadius: '12px',
    cursor: 'pointer'
};

const symBtnStyle = {
    padding: '8px 14px',
    fontSize: '1.1rem',
    fontWeight: '900',
    borderRadius: '12px',
    cursor: 'pointer'
};
