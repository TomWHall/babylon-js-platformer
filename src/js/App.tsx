import * as React from "react";
import Game from "./Game";
import {FunctionComponent, ReactNode, useEffect, useState} from "react";

const App: FunctionComponent = () => {
    const [game, setGame] = useState(new Game());
    const [viewportRef, setViewportRef] = useState(React.createRef<HTMLCanvasElement>());
    let [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        game.initialize(viewportRef.current)
            .then(() => {
                setIsInitialized(true);
                game.start();
            });
    }, []);
    
    return (
        <>
            <canvas id="viewport" ref={viewportRef}></canvas>
            {!isInitialized &&
                <div id="loading">
                    <div>Loading, please wait...</div>
                </div>
            }
            {isInitialized &&
                <>
                    <div className="arrows">
                        {getButton('up-arrow', () => game.upButtonDown(), () => game.upButtonUp())}
                        {getButton('left-arrow', () => game.leftButtonDown(), () => game.leftButtonUp())}
                        {getButton('down-arrow', () => game.downButtonDown(), () => game.downButtonUp())}
                        {getButton('right-arrow', () => game.rightButtonDown(), () => game.rightButtonUp())}
                    </div>
                    {getButton('space-bar', () => game.jumpButtonDown(), () => {})}
                </>
            }
        </>
    );
}

function getButton(className: string, downHandler: () => void, upHandler: () => void): ReactNode {
    return (
        <div className={className}
             onTouchStart={downHandler}
             onMouseDown={downHandler}
             onTouchEnd={upHandler}
             onMouseUp={upHandler}>
        </div>
    );
}

export default App;