import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './core/GameEngine';
import './styles/style.css';

function App() {
    const canvasRef = useRef(null);
    const cursorRef = useRef(null);
    const [ui, setUi] = useState({
        ahaStamina: 100,
        tikaEnergy: 100,
        plantProgress: 0,
        cookingProgress: 0,
        rockProgress: 100,
        time: '05:00',
        superEvolution: false,
        goldenWorm: false
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const cursor = cursorRef.current;

        const handleMouseMove = (e) => {
            if (cursor) {
                cursor.style.left = `${e.clientX}px`;
                cursor.style.top = `${e.clientY}px`;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        const game = new GameEngine(canvas, (state) => {
            if (state) setUi(s => ({ ...s, ...state }));
        });
        game.start();

        return () => {
            game.running = false;
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div id="sim-root">
            <div id="ui-container">
                <div className="ui-element">
                    <label>Stamina AHA</label>
                    <div id="stamina-bar" className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${ui.ahaStamina}%` }}></div>
                    </div>
                </div>
                <div className="ui-element">
                    <label>Energi TIKA</label>
                    <div id="hunger-bar" className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${ui.tikaEnergy}%` }}></div>
                    </div>
                </div>
                <div className="ui-element">
                    <div id="time-display">{ui.time}</div>
                </div>
                <div className="ui-element">
                    <label>Progres Tanaman</label>
                    <div id="plant-bar" className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${ui.plantProgress}%` }}></div>
                    </div>
                </div>
                {ui.cookingProgress > 0 && (
                    <div className="ui-element">
                        <label>Fermentasi Kompos</label>
                        <div id="cooking-bar" className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${ui.cookingProgress}%` }}></div>
                        </div>
                    </div>
                )}
                <div className="ui-element">
                    <label>Progres Batu</label>
                    <div id="rock-bar" className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${ui.rockProgress}%` }}></div>
                    </div>
                </div>
            </div>

            <canvas ref={canvasRef} id="sim-canvas" />
            <div id="light-cursor" ref={cursorRef} />

            {ui.superEvolution && (
                <div id="super-evo-banner">💥 SUPER EVOLUTION MODE AKTIF</div>
            )}
            {ui.goldenWorm && (
                <div id="golden-banner">✨ GOLDEN WORM HAS APPEARED ✨</div>
            )}
        </div>
    );
}

export default App;
