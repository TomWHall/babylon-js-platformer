import "@babylonjs/core/Animations/animatable";
import {AbstractMesh} from "@babylonjs/core/Meshes/abstractMesh";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {MeshType, MovementDirection, NodeMetadata, RotationDirection} from "./types";
import {Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {Space} from "@babylonjs/core/Maths/math.axis";
import {UniversalCamera} from "@babylonjs/core/Cameras/universalCamera";
import {Ray} from "@babylonjs/core/Culling/ray";
import {Node} from "@babylonjs/core/node";
import {AnimationGroup} from "@babylonjs/core/Animations/animationGroup";
import {buildArm, buildCoat, buildHat, buildHead, buildLegsGroup, getLimbSwingAnimation} from "./terrain/CharacterBuilder";
import MaterialFactory, {TextureName} from "./terrain/MaterialFactory";
import config from './config';
import Game from "./Game";
import {getId, isSolid} from "./MeshUtil";
import {buildBox} from "./terrain/MeshFactory";

const torsoWidth = 1;
const torsoHeight = 1.6;
const torsoDepth = 0.75;

const legDiameter = 0.45;
const legHeight = 2.4;

const armDiameter = 0.33;
const armHeight = torsoHeight * 1.2;

const forwardVector = Vector3.Forward();
const upwardVector = Vector3.Up();

const armMaxAngle = Math.PI / 8;
const legMaxAngle = Math.PI / 8;

function getHeight(node: Node): number {
    const bounds = node.getHierarchyBoundingVectors();
    return bounds.max.y - bounds.min.y;
}

export default class Player {

    game: Game;
    container: TransformNode;
    collider: AbstractMesh = null;
    rayDetector: AbstractMesh = null;
    camera: UniversalCamera;
    ray: Ray;

    rotationDirection: RotationDirection = null;
    movementDirection: MovementDirection = null;
    
    forwardIncrement = 0;
    upIncrement = 0;
    
    isOnMesh: boolean;

    leftArm: TransformNode;
    rightArm: TransformNode;
    leftLeg: TransformNode;
    rightLeg: TransformNode;

    walkAnimationGroup: AnimationGroup;
    
    // Meshes which obstruct the camera's view of the top or bottom of the player
    obstructingMeshTop: AbstractMesh = null;
    obstructingMeshBottom: AbstractMesh = null;

    lastOnSolidTime: number = 0;
    
    constructor(game: Game, position: Vector3) {
        this.game = game;

        this.buildGeometry();
        this.addAnimations();

        const camera = this.camera = new UniversalCamera(getId(), new Vector3(0, 10, -15), this.game.scene);
        camera.parent = this.container;
        camera.target = new Vector3(0, 0, 25);

        this.ray = new Ray(Vector3.Zero(), Vector3.Zero(), 1000);
        
        this.setPosition(position);
    }

    setPosition(position: Vector3): void {
        this.container.position = position;
    }
    
    update(time: number, timeMultiplier: number): void {
        const {forwardIncrement, upIncrement} = this;
        const {movementSpeedDelta, maxMovementSpeed, verticalSpeedDelta, minVerticalSpeed} = config;

        const terrainMeshes = this.game.scene.meshes.filter(m => (m.metadata as NodeMetadata)?.type === MeshType.Solid);

        let isOnMesh = this.isOnMesh = false;
        
        let rotationToAdd = 0;
        let newForwardIncrement = forwardIncrement;
        let newUpIncrement: number;
        
        let didMove = false;
        let didRotate = false;

        // Jump / gravity
        newUpIncrement = upIncrement - (verticalSpeedDelta * this.game.tickTimeFactor);
        newUpIncrement = Math.max(newUpIncrement, minVerticalSpeed);
        if (newUpIncrement <= 0) {
            const collidingMesh = this.tryMove(0, newUpIncrement, terrainMeshes).collidingMesh;
            if (collidingMesh) {
                const meshTopY = collidingMesh.getBoundingInfo().boundingBox.maximumWorld.y;
                if (meshTopY < this.container.position.y) {
                    const adjustY = meshTopY - this.container.position.y;
                    this.tryMove(0, adjustY, terrainMeshes);
                }
            }
            
            isOnMesh = this.isOnMesh = collidingMesh !== undefined;
            if (isOnMesh) {
                newUpIncrement = 0;
                this.lastOnSolidTime = time;
            }
        }
        
        if (isOnMesh) {
            const rotationDirection = this.rotationDirection;
            if (rotationDirection) {
                rotationToAdd = (Math.PI / 64) * timeMultiplier * (rotationDirection === RotationDirection.Left ? -1 : 1);
            }

            const movementDirection = this.movementDirection;
            if (!movementDirection) {
                // Bring player softly to a stop
                newForwardIncrement *= 0.8;
                if (newForwardIncrement < 0.01) {
                    newForwardIncrement = 0;
                }
            } else {
                // Increase speed, up to maximum
                if (movementDirection === MovementDirection.Forward) {
                    newForwardIncrement += (movementSpeedDelta * this.game.tickTimeFactor);
                    newForwardIncrement = Math.min(newForwardIncrement, maxMovementSpeed);
                } else {
                    newForwardIncrement -= (movementSpeedDelta * this.game.tickTimeFactor);
                    newForwardIncrement = Math.max(newForwardIncrement, -maxMovementSpeed);
                }
            }
        }
        
        // Rotating
        if (rotationToAdd !== 0) {
            const collidingMesh = this.tryRotate(rotationToAdd, terrainMeshes).collidingMesh;
            if (collidingMesh === undefined) {
                didRotate = true;
            } else {
                if (collidingMesh.rotation.x === -(Math.PI / 4)) {
                    if (this.tryMove(0, 0.025, terrainMeshes).collidingMesh === undefined) {
                        if (this.tryRotate(rotationToAdd, terrainMeshes).collidingMesh === undefined) {
                            didRotate = true;
                        }
                    }
                } else {
                    if (this.tryMove(-0.1, 0, terrainMeshes).collidingMesh === undefined) {
                        if (this.tryRotate(rotationToAdd, terrainMeshes).collidingMesh === undefined) {
                            didRotate = true;
                        }
                    }
                }
            }
        }

        // If there is movement to apply...
        if (newForwardIncrement !== 0 || newUpIncrement !== 0) {
            const collidingMesh = this.tryMove(newForwardIncrement, newUpIncrement, terrainMeshes).collidingMesh;
            if (collidingMesh === undefined) {
                didMove = true;
            } else {
                if (newForwardIncrement !== 0) {
                    if (this.tryMove(newForwardIncrement, Math.abs(newForwardIncrement), terrainMeshes).collidingMesh === undefined) {
                        didMove = true;
                        newForwardIncrement = Math.min(newForwardIncrement, maxMovementSpeed * 0.25);
                    } else if (this.tryStepUp(newForwardIncrement, terrainMeshes)) {
                        didMove = true;
                    } else if (this.tryMove(0, newUpIncrement, terrainMeshes).collidingMesh === undefined) {
                        didMove = true;
                    }
                }
            }
            
            if (!didMove) {
                newForwardIncrement = 0;
                newUpIncrement = 0;
            }
        }

        this.forwardIncrement = newForwardIncrement;
        this.upIncrement = newUpIncrement;

        // Set animation speed
        if (isOnMesh || ((time - this.lastOnSolidTime) < 250)) {
            if (didMove) {
                this.walkAnimationGroup.speedRatio = this.forwardIncrement * 15;
            } else if (didRotate) {
                this.walkAnimationGroup.speedRatio = 1;
            } else {
                this.walkAnimationGroup.speedRatio = 0;
            }
        } else {
            this.walkAnimationGroup.speedRatio = 0;
        }

        // Reduce opacity of meshes obscuring player
        this.handleObscuringMeshes();
    }

    jump(): void {
        if (this.isOnMesh) {
            this.upIncrement = config.jumpInitialVerticalSpeed;
        }
    }
    
    private tryStepUp(newForwardIncrement: number, terrainMeshes: AbstractMesh[]): boolean {
        for (let i = 0.1; i <= 1; i += 0.1) {
            if (this.tryMove(newForwardIncrement, i, terrainMeshes).collidingMesh === undefined) {
                return true;
            }
        }
        return false;
    }

    private tryMove(newMovementSpeed: number, newVerticalSpeed: number, terrainMeshes: AbstractMesh[]): MoveResult {
        const container = this.container;
        container.translate(forwardVector, newMovementSpeed, Space.LOCAL);
        container.translate(upwardVector, newVerticalSpeed, Space.LOCAL);
        this.updateMatrices();

        const collidingMesh = this.getCollidingMesh(terrainMeshes);
        if (collidingMesh !== undefined) {
            container.translate(forwardVector, -newMovementSpeed, Space.LOCAL);
            container.translate(upwardVector, -newVerticalSpeed, Space.LOCAL);
            this.updateMatrices();
        }
        
        return {
            collidingMesh: collidingMesh
        };
    }

    private tryRotate(rotationToAdd: number, terrainMeshes: AbstractMesh[]): MoveResult {
        const container = this.container;
        container.addRotation(0, rotationToAdd, 0);
        this.updateMatrices();

        const collidingMesh = this.getCollidingMesh(terrainMeshes);
        if (this.getCollidingMesh(terrainMeshes) !== undefined) {
            container.addRotation(0, -rotationToAdd, 0);
            this.updateMatrices();
        }

        return {
            collidingMesh: collidingMesh
        };
    }

    private handleObscuringMeshes(): void {
        if (this.obstructingMeshTop) {
            this.obstructingMeshTop.visibility = 1;
            this.obstructingMeshTop = null;
        }
        if (this.obstructingMeshBottom) {
            this.obstructingMeshBottom.visibility = 1;
            this.obstructingMeshBottom = null;
        }

        const hitMeshTop = this.getHitMesh(3);
        if (hitMeshTop && hitMeshTop !== this.rayDetector) {
            this.obstructingMeshTop = hitMeshTop;
            this.obstructingMeshTop.visibility = config.obstructingMeshOpacity;
        }

        const hitMeshBottom = this.getHitMesh(1);
        if (hitMeshBottom && hitMeshBottom !== this.rayDetector) {
            this.obstructingMeshBottom = hitMeshBottom;
            this.obstructingMeshBottom.visibility = config.obstructingMeshOpacity;
        }
    }

    private getHitMesh(yOffset: number): AbstractMesh {
        const cameraPosition = this.getWorldPosition(this.camera);
        const targetPosition = this.getWorldPosition(this.container).add(new Vector3(0, yOffset, 0));

        const ray = this.ray;
        ray.origin = cameraPosition;
        ray.direction = targetPosition.subtract(cameraPosition);
        
        const pickingInfo = this.game.scene.pickWithRay(ray, m => m === this.rayDetector || (m.metadata as NodeMetadata)?.type === MeshType.Solid, false);

        return pickingInfo.pickedMesh;
    }

    private getWorldPosition(node: Node): Vector3 {
        const worldMatrix = node.getWorldMatrix();
        
        const quaternion = new Quaternion();
        const position = new Vector3();
        const scale = new Vector3();
        worldMatrix.decompose(scale, quaternion, position);
        
        return position;
    }
    
    private getCollidingMesh(terrainMeshes: AbstractMesh[]): AbstractMesh {
        return terrainMeshes.find(m => isSolid(m)
            && this.collider.intersectsMesh(m, true)
            && m.getBoundingInfo().boundingBox.maximumWorld.y !== this.container.position.y);
    }
    
    private updateMatrices(): void {
        this.collider.computeWorldMatrix(true);
    }

    private buildGeometry(): void {
        const container = this.container = new TransformNode(getId());

        const skinMaterial = MaterialFactory.getMaterial(TextureName.Skin, 2, 2);
        const metalMaterial = MaterialFactory.getMaterial(TextureName.Metal, 4, 4);
        const fabricGreyMaterial = MaterialFactory.getMaterial(TextureName.FabricGrey, 1, 1);
        const leatherBrownMaterial = MaterialFactory.getMaterial(TextureName.LeatherBrown, 1, 1);

        const legsGroup = buildLegsGroup(torsoWidth, torsoDepth, legHeight, legDiameter, fabricGreyMaterial, leatherBrownMaterial, metalMaterial);
        legsGroup.parent = container;
        legsGroup.position.y = getHeight(legsGroup);

        this.leftLeg = legsGroup.getChildren(n => n.name == 'left-leg')[0] as TransformNode;
        this.rightLeg = legsGroup.getChildren(n => n.name == 'right-leg')[0] as TransformNode;

        const coatHeight = torsoHeight + (torsoDepth / 2);
        const coat = buildCoat(torsoWidth, coatHeight, torsoDepth, fabricGreyMaterial);
        coat.parent = container;
        const coatBottomY = getHeight(legsGroup) - (torsoDepth);
        coat.position.y = coatBottomY + (coatHeight / 2);
        const coatTopY = coatBottomY + coatHeight;

        const armXOffset = ((torsoWidth / 2) + (armDiameter / 2)) - (armDiameter / 6);
        const armYOffset = coatTopY - (armDiameter / 2);

        const leftArm = this.leftArm = buildArm(armHeight, armDiameter, true, fabricGreyMaterial, skinMaterial);
        leftArm.parent = container;
        leftArm.position.x = -armXOffset;
        leftArm.position.y = armYOffset;

        const rightArm = this.rightArm = buildArm(armHeight, armDiameter, false, fabricGreyMaterial, skinMaterial);
        rightArm.parent = container;
        rightArm.position.x = armXOffset;
        rightArm.position.y = armYOffset;

        const head = buildHead(0.7, skinMaterial);
        head.parent = container;
        head.position.y = coatTopY + (getHeight(head) / 2);

        const hat = buildHat(0.7, 0.5, fabricGreyMaterial);
        hat.parent = container;
        hat.position.y = (coatTopY + getHeight(head)) - 0.3;

        const collisionBoxHeight = getHeight(container);

        const collider = this.collider = buildBox(torsoWidth, collisionBoxHeight, torsoDepth);
        collider.parent = container;
        collider.position.y = (collisionBoxHeight / 2);
        collider.material = MaterialFactory.getTransparentMaterial();
        collider.metadata = null;

        const rayDetector = this.rayDetector = buildBox(torsoWidth, collisionBoxHeight, torsoDepth);
        rayDetector.parent = container;
        rayDetector.position.y = (collisionBoxHeight / 2);
        rayDetector.material = MaterialFactory.getTransparentMaterial();
        rayDetector.metadata = null;
    }

    private addAnimations(): void {
        const leftArmAnim = getLimbSwingAnimation('leftArmRotate', armMaxAngle);
        this.leftArm.animations.push(leftArmAnim);

        const rightArmAnim = getLimbSwingAnimation('rightArmRotate', -armMaxAngle);
        this.rightArm.animations.push(rightArmAnim);

        const leftLegAnim = getLimbSwingAnimation('leftLegRotate', -legMaxAngle);
        this.leftLeg.animations.push(leftLegAnim);

        const rightLegAnim = getLimbSwingAnimation('rightLegRotate', legMaxAngle);
        this.rightLeg.animations.push(rightLegAnim);

        const walkAnimationGroup = this.walkAnimationGroup = new AnimationGroup('walk');
        walkAnimationGroup.addTargetedAnimation(leftArmAnim, this.leftArm);
        walkAnimationGroup.addTargetedAnimation(rightArmAnim, this.rightArm);
        walkAnimationGroup.addTargetedAnimation(leftLegAnim, this.leftLeg);
        walkAnimationGroup.addTargetedAnimation(rightLegAnim, this.rightLeg);

        walkAnimationGroup.start(true, 1);
    }
}

interface MoveResult {
    collidingMesh: AbstractMesh;
}