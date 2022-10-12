import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import {HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {ShadowLight} from "@babylonjs/core/Lights/shadowLight";
import {NodeMetadata} from "../types";
import {GlowLayer} from "@babylonjs/core/Layers/glowLayer";
import {buildLampPost, buildWallLamp} from "./LampBuilder";
import {buildMeshWithCutouts, getId, setCastsShadows} from "../MeshUtil";
import {buildSteps} from "./StepsBuilder";
import {buildMoonLight} from "./LightBuilder";
import MaterialFactory, {TextureName} from "./MaterialFactory";
import {buildBox, buildCylinder} from "./MeshFactory";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {CreateSphere} from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import {CreateCylinder} from "@babylonjs/core/Meshes/Builders/cylinderBuilder";

export default class Terrain {

    scene: Scene;
    directionalLight: DirectionalLight;
    hemisphericLight: HemisphericLight;

    constructor(scene: Scene) {
        this.scene = scene;
        
        this.buildGround();
        this.buildWall();
        this.buildDoor(scene);
        this.buildSign();
        buildSteps(-10, 7, 0, 8, 4);
        this.buildPromenade();

        buildLampPost(scene, new Vector3(5, 0, -5));
        buildWallLamp(scene, new Vector3(-7, 12, 14));

        // Ambient light
        const hemisphericLight = this.hemisphericLight = new HemisphericLight(getId(), new Vector3(0, 20, 0), scene);
        hemisphericLight.intensity = 0.2;
        
        // Moonlight
        this.directionalLight = buildMoonLight(scene);
    }

    private buildGround(): void {
        buildBox(32, 1, 32, new Vector3(0, -0.5, 0), MaterialFactory.getMaterial(TextureName.Pavement, 6, 6));
    }

    private buildWall(): void {
        buildMeshWithCutouts(
            buildBox(32, 16, 1, new Vector3(0, 8, 15.5), MaterialFactory.getMaterial(TextureName.BricksOrange, 8, 4)),
            buildBox(3, 6, 6, new Vector3(-10, 11, 15.5))
        );
    }

    private buildDoor(scene: Scene): void {
        // Door
        buildBox(2.9, 5.9, 0.5, new Vector3(-10, 11, 15.5), MaterialFactory.getMaterial(TextureName.WoodRed, 1, 1));

        // Handle
        const sphere = CreateSphere(getId(), {
            diameter: 0.3
        });
        sphere.position = new Vector3(-11.1, 11.2, 15);
        sphere.material = MaterialFactory.getMaterial(TextureName.Metal, 1, 1);
        setCastsShadows(sphere);
        
        const cylinder = CreateCylinder(getId(), {
            diameter: 0.2,
            height: 0.3
        });
        cylinder.rotation = new Vector3(Math.PI / 2, 0, 0);
        cylinder.position = new Vector3(-11.1, 11.2, 15.1);
        cylinder.material = MaterialFactory.getMaterial(TextureName.Metal, 1, 1);
        setCastsShadows(cylinder);
        
        // Lock plate
        buildBox(0.3, 0.8, 0.01, new Vector3(-11.1, 11, 15.24), MaterialFactory.getMaterial(TextureName.Metal, 1, 1));
        
        // Glow around door
        const doorGlowBox = buildMeshWithCutouts(
            buildBox(3, 6, 0.7, new Vector3(-10, 11, 15.5)),
            buildBox(2.9, 5.9, 1, new Vector3(-10, 11, 15.5))
        );
        doorGlowBox.metadata = null;
        
        const glowLayer = new GlowLayer(getId(), scene);
        glowLayer.customEmissiveColorSelector = function(mesh, subMesh, material, result) {
            mesh === doorGlowBox
                ? result.set(1, 0.8125, 0.25, 1)
                : result.set(0, 0, 0, 0);
        }
    }

    private buildSign(): void {
        // Sign
        buildBox(7, 7, 0.01, new Vector3(-3, 8, 15), MaterialFactory.getMaterial(TextureName.BooleanSign, 1, 1));
        
        const metalMaterial = MaterialFactory.getMaterial(TextureName.Metal, 1, 1);
        
        // Bolts
        function addBolt(position: Vector3): void {
            const cylinder = CreateCylinder(getId(), {
                diameter: 0.2,
                height: 0.3
            });
            cylinder.rotation = new Vector3(Math.PI / 2, 0, 0);
            cylinder.position = position;
            cylinder.material = metalMaterial;
            setCastsShadows(cylinder);
        }

        addBolt(new Vector3(-6.3, 4.7, 15));
        addBolt(new Vector3(0.3, 4.7, 15));
        addBolt(new Vector3(-6.3, 11.3, 15));
        addBolt(new Vector3(0.3, 11.3, 15));
    }

    private buildPromenade(): void {
        const promenade = new TransformNode(getId());
        
        const platform = buildBox(32, 2, 8, new Vector3(0, 1, 0), MaterialFactory.getMaterial(TextureName.Pavement, 6, 1.5));
        platform.parent = promenade;
        
        const front = buildBox(32, 2, 0.2, new Vector3(0, 1, -4.1), MaterialFactory.getMaterial(TextureName.BricksOrange, 8, 0.5));
        front.parent = promenade;

        const wallBottom = buildBox(32, 2, 1, new Vector3(0, 3, 3.5), MaterialFactory.getMaterial(TextureName.BricksOrange, 8, 0.5));
        wallBottom.parent = promenade;

        const wallTop = buildCylinder(1, 32, new Vector3(0, 4, 3.5), MaterialFactory.getMaterial(TextureName.BricksOrange, 0.5, 8));
        wallTop.rotation = new Vector3(0, 0, Math.PI / 2);
        wallTop.parent = promenade;
        
        promenade.position = new Vector3(12, 0, 0);
        promenade.rotation = new Vector3(0, Math.PI / 2, 0);
    }

    preStart(): void {
        // Setup shadows
        this.scene.lights.forEach(light => {
           if (light instanceof ShadowLight) {
               const shadowGenerator = (light.metadata as NodeMetadata).shadowGenerator;
               
               this.scene.meshes.forEach(m => {
                   if ((m.metadata as NodeMetadata)?.castsShadows) {
                       shadowGenerator.addShadowCaster(m);
                       m.receiveShadows = true;
                   }
               });
           }
        });
    }
}