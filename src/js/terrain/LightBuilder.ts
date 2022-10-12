import {ShadowGenerator} from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Color3} from "@babylonjs/core/Maths/math.color";
import {Scene} from "@babylonjs/core/scene";
import {getId} from "../MeshUtil";
import {NodeMetadata} from "../types";

export function buildMoonLight(scene: Scene): DirectionalLight {
    const distance = 30;
    
    const light = new DirectionalLight(getId(), new Vector3(-1, -1, 1), scene);
    light.position = new Vector3(distance, distance, -distance);
    light.intensity = 0.3;
    
    const moonlightColor = Color3.FromHexString('#E5F1FF');
    light.diffuse = moonlightColor;
    light.specular = moonlightColor;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.usePoissonSampling = true;
    
    light.metadata = {
        shadowGenerator: shadowGenerator
    } as NodeMetadata;

    return light;
}
