import {KeyboardEventTypes} from "@babylonjs/core/Events/keyboardEvents";
import {Engine} from "@babylonjs/core/Engines/engine";
import {Scene} from "@babylonjs/core/scene";
import {Color4} from "@babylonjs/core/Maths/math.color";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import MaterialFactory from "./terrain/MaterialFactory";
import {MovementDirection, RotationDirection} from "./types";
import Terrain from "./terrain/Terrain";
import LoadingScreen from "./LoadingScreen";
import Player from "./Player";
import Logger from "./Logger";

export default class Game {

    canvas: HTMLCanvasElement;
    scene: Scene;
    player: Player;
    terrain: Terrain;
    lastAnimateTime: number = performance.now();
    active: boolean = true;
    tickTimeFactor = 1;

    async initialize(canvas: HTMLCanvasElement) {
        Logger.log('Game initializing');
        
        this.canvas = canvas;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';

        const engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
        engine.loadingScreen = new LoadingScreen();
        engine.displayLoadingUI();
        
        const scene = this.scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 1);

        await MaterialFactory.loadImages(scene);

        this.addInputHandlers();
    }

    upButtonDown(): void {
        this.player.movementDirection = MovementDirection.Forward;
    }

    upButtonUp(): void {
        this.player.movementDirection = null;
    }
    
    downButtonDown(): void {
        this.player.movementDirection = MovementDirection.Backward;
    }

    downButtonUp(): void {
        this.player.movementDirection = null;
    }
    
    leftButtonDown(): void {
        this.player.rotationDirection = RotationDirection.Left;
    }

    leftButtonUp(): void {
        this.player.rotationDirection = null;
    }
    
    rightButtonDown(): void {
        this.player.rotationDirection = RotationDirection.Right;
    }

    rightButtonUp(): void {
        this.player.rotationDirection = null;
    }
    
    jumpButtonDown(): void {
        this.player.jump();
    }

    start(): void {
        Logger.log('Game starting');
        
        this.terrain = new Terrain(this.scene);
        this.player = new Player(this, new Vector3(-3, 0, -3));
        
        this.terrain.preStart();

        this.canvas.focus();

        this.lastAnimateTime = performance.now();
        this.animate(performance.now());
    }

    private addInputHandlers(): void {
        this.scene.onKeyboardObservable.add((keyboardInfo) => {
            switch (keyboardInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    switch (keyboardInfo.event.key) {
                        case 'ArrowLeft':
                            this.leftButtonDown();
                            break;

                        case 'ArrowRight':
                            this.rightButtonDown();
                            break;

                        case 'ArrowUp':
                            this.upButtonDown();
                            break;

                        case 'ArrowDown':
                            this.downButtonDown();
                            break;

                        case ' ':
                            this.jumpButtonDown();
                            break;
                    }
                    break;

                case KeyboardEventTypes.KEYUP:
                    switch (keyboardInfo.event.key) {
                        case 'ArrowLeft':
                            this.leftButtonUp();
                            break;
                            
                        case 'ArrowRight':
                            this.rightButtonUp();
                            break;

                        case 'ArrowUp':
                            this.upButtonUp();
                            break;
                            
                        case 'ArrowDown':
                            this.downButtonUp();
                            break;
                    }
                    break;
            }
        });
    }

    private animate(time: number): void {
        requestAnimationFrame(this.animate.bind(this));

        if (this.active) {
            let deltaTime = time - (this.lastAnimateTime || time);
            if (deltaTime > 500) deltaTime = 0;

            this.lastAnimateTime = time;

            // Update player
            const timeMultiplier = deltaTime / (1000 / 60);
            this.player.update(time, timeMultiplier);
        }

        this.scene.render();
    }
}