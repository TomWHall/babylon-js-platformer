import {ShadowGenerator} from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export enum RotationDirection {
    Left = 1,
    Right = 2
}

export enum MovementDirection {
    Forward = 1,
    Backward = 2
}

export enum MeshType {
    Background,
    Solid
}

export interface NodeMetadata {
    type?: MeshType // Default: Background
    castsShadows?: boolean; // Default: false
    shadowGenerator?: ShadowGenerator;
}
