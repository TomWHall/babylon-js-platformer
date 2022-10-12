import {Scene} from "@babylonjs/core/scene";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {CreateBox} from "@babylonjs/core/Meshes/Builders/boxBuilder";
import {Matrix, Vector3} from "@babylonjs/core/Maths/math.vector";
import {AbstractMesh} from "@babylonjs/core/Meshes/abstractMesh";
import {CreateCylinder} from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {SpotLight} from "@babylonjs/core/Lights/spotLight";
import {CreateSphere} from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import {Color3} from "@babylonjs/core/Maths/math.color";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {VertexBuffer} from "@babylonjs/core/Buffers/buffer";
import {ShadowGenerator} from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import {CreateCapsule} from "@babylonjs/core/Meshes/Builders/capsuleBuilder";
import {GlowLayer} from "@babylonjs/core/Layers/glowLayer";
import MaterialFactory, {TextureName} from "./MaterialFactory";
import {getHeight, getId, setCastsShadows, stackUp} from "../MeshUtil";
import {buildTaperedBox, taperMesh} from "./MeshFactory";
import {MeshType, NodeMetadata} from "../types";

const width = 1;
const height = 10;

const bulbColor = Color3.FromHexString('#ffff99');
const glassColor = Color3.FromHexString('#ffcc33');

function getMetalMaterial(uScale: number, vScale: number): StandardMaterial {
    const scale = 2;
    return MaterialFactory.getMaterial(TextureName.Metal, uScale * scale, vScale * scale);
}

function buildPole(diameter: number, height: number): Mesh {
    const cylinder = CreateCylinder(getId(), {
        diameter: diameter,
        height: height
    });
    cylinder.material = getMetalMaterial(1, (height / diameter) / 3);
    
    setCastsShadows(cylinder);
    
    return cylinder;
}

function buildDisc(diameter: number, height: number): Mesh {
    const cylinder = CreateCylinder(getId(), {
        diameter: diameter,
        height: height
    });
    cylinder.material = getMetalMaterial(1, 1);

    setCastsShadows(cylinder);

    return cylinder;
}

function buildCone(diameterBottom: number, diameterTop: number, height: number): Mesh {
    const cone = CreateCylinder(getId(), {
        diameterBottom: diameterBottom,
        diameterTop: diameterTop,
        height: height
    });
    cone.material = getMetalMaterial(1, (height / diameterBottom) / 2);

    setCastsShadows(cone);

    return cone;
}

function buildRoundedCone(diameterBottom: number, diameterTop: number, height: number): Mesh {
    const cone = CreateCapsule(getId(), {
        radiusBottom: diameterBottom / 2,
        radiusTop: diameterTop / 2,
        height: height
    });
    cone.material = getMetalMaterial(1, (height / diameterBottom) / 2);

    setCastsShadows(cone);

    return cone;
}

function buildBox(width: number, height: number, depth: number): Mesh {
    const box = CreateBox(getId(), {
        width: width,
        height: height,
        depth: depth,
        wrap: true,
        updatable: true
    });

    box.material = getMetalMaterial(1, height / width);

    setCastsShadows(box);

    return box;
}

function buildMetalTaperedBox(width: number, height: number, depth: number, slopeMultiplier: number, flipVertical: boolean = false): Mesh {
    const box = buildTaperedBox(width, height, depth, slopeMultiplier, flipVertical);

    box.material = getMetalMaterial(1, height / width);

    setCastsShadows(box);

    return box;
}

function buildSphere(diameter: number): Mesh {
    const sphere = CreateSphere(getId(), {
        diameter: diameter
    });
    sphere.material = getMetalMaterial(1, 1);

    setCastsShadows(sphere);

    return sphere;
}

function buildPost(): TransformNode {
    const topTaperedBoxWidth = width * 0.375;

    return stackUp([
        buildDisc(width * 2, height * 0.01),
        buildPole(width * 0.9, height * 0.1),
        buildPole(width, height * 0.01),
        buildCone(width * 0.8, width * 0.4, height * 0.2),
        buildPole(width * 0.5, height * 0.01),
        buildPole(width * 0.25, height * 0.6325),
        buildMetalTaperedBox(topTaperedBoxWidth, topTaperedBoxWidth, topTaperedBoxWidth, 0.7, true)
    ]);
} 

function buildWallMount(): TransformNode {
    const barDiameter = width * 0.25;
    const uprightHeight = width;
    const crossLength = width;
    const wallDiscDiameter = width * 0.75;
    const wallDiscThickness = width * 0.05;
    
    const uprightCylinder = buildPole(barDiameter, uprightHeight);

    const crossCylinder = buildPole(barDiameter, crossLength);
    crossCylinder.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2));
    crossCylinder.bakeTransformIntoVertices(Matrix.Translation(0, 0, crossLength * 0.5));

    const wallCylinder = buildPole(wallDiscDiameter, wallDiscThickness);
    wallCylinder.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2));
    wallCylinder.bakeTransformIntoVertices(Matrix.Translation(0, 0, crossLength - (wallDiscThickness * 0.5))); 
    
    const bobbleSphere = buildSphere(barDiameter * 1.5);
    bobbleSphere.position.y = -(uprightHeight / 2);
    
    return Mesh.MergeMeshes([uprightCylinder, crossCylinder, wallCylinder, bobbleSphere]);
}

function buildGlass(scene: Scene): AbstractMesh {
    const box = buildTaperedBox(width, width, width, 0.5, true);

    const material = MaterialFactory.getMaterial(TextureName.Glass, 2, 2);
    material.diffuseColor = glassColor;
    material.ambientColor = glassColor;
    material.emissiveColor = glassColor;
    material.specularPower = 4;
    material.alpha = 0.75;
    box.material = material;
    
    setCastsShadows(box);

    const glowLayer = new GlowLayer(getId(), scene);
    glowLayer.customEmissiveColorSelector = function(mesh, subMesh, material, result) {
        const r = 1;
        const g = 0.8125;
        const b = 0.25;
        const brightness = 0.5;
        
        if (mesh === box) {
            result.set(r * brightness, g * brightness, b * brightness, 0.9);
        } else {
            result.set(0, 0, 0, 0);
        }
    }
    
    return box;
}

function buildGlassSupports(): Mesh {
    const supportWidth = 0.05;
    const supportHeight = width;
    const supportOffset = width / 2;

    const supportFrontLeft = buildBox(supportWidth, supportHeight, supportWidth);
    supportFrontLeft.position.x = -supportOffset;
    supportFrontLeft.position.z = -supportOffset;

    const supportFrontRight = buildBox(supportWidth, supportHeight, supportWidth);
    supportFrontRight.position.x = supportOffset;
    supportFrontRight.position.z = -supportOffset;

    const supportBackLeft = buildBox(supportWidth, supportHeight, supportWidth);
    supportBackLeft.position.x = -supportOffset;
    supportBackLeft.position.z = supportOffset;

    const supportBackRight = buildBox(supportWidth, supportHeight, supportWidth);
    supportBackRight.position.x = supportOffset;
    supportBackRight.position.z = supportOffset;

    const supports = Mesh.MergeMeshes([supportFrontLeft, supportFrontRight, supportBackLeft, supportBackRight]);
    
    supports.markVerticesDataAsUpdatable(VertexBuffer.PositionKind, true);
    taperMesh(supports, 0.5, true);

    supports.material = getMetalMaterial(1, 1);
    
    return supports;
}

function buildEnclosure(scene: Scene): TransformNode {
    const transformNode = new TransformNode(getId());

    const glass = buildGlass(scene);
    glass.parent = transformNode;

    const glassSupports = buildGlassSupports();
    glassSupports.parent = transformNode;

    const bulbDiameter = 0.375;
    const glassTopY = glass.getBoundingInfo().boundingBox.maximumWorld.y;
    const lightPosition = new Vector3(0, glassTopY - (bulbDiameter / 2), 0);

    const spotLight = new SpotLight(getId(), lightPosition, new Vector3(0, -1, 0), Math.PI * 0.5, 16, scene);
    spotLight.intensity = 8;
    spotLight.parent = transformNode;
    spotLight.metadata = {};

    const shadowGenerator = new ShadowGenerator(1024, spotLight);
    shadowGenerator.usePoissonSampling = true;
    (spotLight.metadata as NodeMetadata).shadowGenerator = shadowGenerator;

    const bulbSphere = CreateSphere(getId(), {
        diameter: bulbDiameter
    });
    bulbSphere.position = lightPosition;
    bulbSphere.parent = transformNode;

    const bulbMaterial = MaterialFactory.getMaterial(TextureName.Glass, 2, 2);
    bulbMaterial.diffuseColor = bulbColor;
    bulbMaterial.ambientColor = bulbColor;
    bulbMaterial.emissiveColor = bulbColor;
    bulbMaterial.specularPower = 4;
    bulbSphere.material = bulbMaterial;

    return transformNode;
}

function buildLampHead(scene: Scene): TransformNode {
    return stackUp([
        buildBox(width * 0.5, width * 0.05, width * 0.5),
        buildEnclosure(scene),
        buildBox(width * 1.25, width * 0.05, width * 1.25),
        buildMetalTaperedBox(width, width * 0.5, width, 0.5),
        buildRoundedCone(width * 0.3, width * 0.15, width * 0.5)
    ]);
}

export function buildLampPost(scene: Scene, position?: Vector3): TransformNode {
    const transformNode = stackUp([
        buildPost(),
        buildLampHead(scene)
    ]);

    const fullHeight = getHeight(transformNode);

    const collider = CreateCylinder(getId(), {
        diameter: width,
        height: fullHeight 
    });
    collider.parent = transformNode;
    collider.position.y = fullHeight / 2;
    collider.material = MaterialFactory.getTransparentMaterial();
    collider.metadata = {
        type: MeshType.Solid
    } as NodeMetadata;
    
    if (position) {
        transformNode.position = position;
    }
    
    return transformNode;
}

export function buildWallLamp(scene: Scene, position?: Vector3): TransformNode {
    const transformNode = stackUp([
        buildWallMount(),
        buildLampHead(scene)
    ]);

    const fullHeight = getHeight(transformNode);

    const collider = CreateBox(getId(), {
        width: width,
        height: fullHeight
    });
    collider.parent = transformNode;
    collider.position.y = fullHeight / 2;
    collider.material = MaterialFactory.getTransparentMaterial();
    collider.metadata = {
        type: MeshType.Solid
    } as NodeMetadata;

    if (position) {
        transformNode.position = position;
    }
    
    return transformNode;
}