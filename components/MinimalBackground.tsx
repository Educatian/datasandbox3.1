import React from 'react';

const MinimalBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-slate-900">
            {/* 
                Dark Theme Gradient Animation
                Colors: 
                - #0f172a (Slate 900)
                - #1e293b (Slate 800)
                - #1e1b4b (Deep Indigo 950) for subtle color
            */}
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    background: `linear-gradient(-45deg, #0f172a, #1e293b, #172554, #0f172a)`,
                    backgroundSize: '400% 400%',
                    animation: 'gradientMove 20s ease infinite'
                }}
            />

            {/* Subtle Overlay for Grain/Texture (Optional, keeping it clean for now) */}

            <style>{`
                @keyframes gradientMove {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
            `}</style>
        </div>
    );
};

export default MinimalBackground;
