import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {Space} from "@babylonjs/core/Maths/math.axis";
import {CSG} from "@babylonjs/core/Meshes/csg";
import {Matrix, Vector3} from "@babylonjs/core/Maths/math.vector";
import {Animation} from "@babylonjs/core/Animations/animation";
import {IAnimationKey} from "@babylonjs/core/Animations/animationKey";
import {CreateTorus} from "@babylonjs/core/Meshes/Builders/torusBuilder";
import {CreateSphere} from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import {CreateCylinder} from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import {CreateCapsule} from "@babylonjs/core/Meshes/Builders/capsuleBuilder";
import {CreateBox} from "@babylonjs/core/Meshes/Builders/boxBuilder";
import {buildMeshWithCutouts, getDepth, getHeight, getId, setCastsShadows, setOriginToCenter} from "../MeshUtil";
import MaterialFactory, {TextureName} from "./MaterialFactory";

const frameRate = 60;

export function buildHat(headDiameter: number, height: number, material: StandardMaterial): Mesh {
    const brimHeight = height / 100;
    const topTorusThickness = height / 4;
    
    const topCylinderHeight = height - brimHeight - (topTorusThickness / 2);
    const topCylinderDiameterBottom = headDiameter * 1.1;
    const topCylinderDiameterTop = headDiameter * 0.9;
    const topCylinder = CreateCylinder(getId(), { diameterBottom: topCylinderDiameterBottom, diameterTop: topCylinderDiameterTop, height: topCylinderHeight});
    topCylinder.position.y = brimHeight + (topCylinderHeight / 2);
    
    const brimCylinderDiameter = headDiameter * 1.6;
    const brimCylinder = CreateCylinder(getId(), { diameter: brimCylinderDiameter, height: brimHeight});
    brimCylinder.position.y = brimHeight / 2;
    
    const topTorus = CreateTorus(getId(), { diameter: topCylinderDiameterTop - topTorusThickness, thickness: topTorusThickness });
    topTorus.position.y = height - (topTorusThickness / 2);
    
    const bottomTorusThickness = (brimCylinderDiameter - headDiameter) / 4;
    const bottomTorus = CreateTorus(getId(), { diameter: brimCylinderDiameter - bottomTorusThickness, thickness: bottomTorusThickness });
    bottomTorus.position.y = bottomTorusThickness / 2;

    const hatMesh = Mesh.MergeMeshes([topCylinder, topTorus, brimCylinder, bottomTorus], true);
    hatMesh.material = material;
    setCastsShadows(hatMesh);

    return hatMesh;
}

export function buildCoat(width: number, height: number, depth: number, material: StandardMaterial): Mesh {
    const boxHeight = height - (depth / 2);

    const box = CreateBox(getId(), {
        width: width,
        height: boxHeight,
        depth: depth,
        wrap: true
    });
    
    const cylinder = CreateCylinder(getId(), {
        diameter: depth,
        height: width
    });
    cylinder.bakeTransformIntoVertices(Matrix.RotationZ(Math.PI / 2));
    cylinder.bakeTransformIntoVertices(Matrix.Translation(0, (height / 2) - (depth / 2), 0));
    box.bakeTransformIntoVertices(Matrix.Translation(0, -((height / 2) - (boxHeight / 2)), 0));

    const coatMesh = CSG.FromMesh(cylinder).union(CSG.FromMesh(box)).toMesh(getId());
    cylinder.dispose();
    box.dispose();
    
    coatMesh.material = material;

    setCastsShadows(coatMesh);

    return coatMesh;
}

export function buildArm(height: number, diameter: number, isLeft: boolean, armMaterial: StandardMaterial, handMaterial: StandardMaterial): TransformNode {
    const name = isLeft ? 'left-arm' : 'right-arm';
    const transformNode = new TransformNode(name);

    const shoulderCapsule = CreateCapsule(name + '-shoulder', {
        radius: diameter / 2,
        height: diameter * 2,
        orientation: Vector3.Right()
    });
    shoulderCapsule.bakeTransformIntoVertices(Matrix.Translation(diameter / 2, 0, 0));
    shoulderCapsule.parent = transformNode;
    
    const armCylinder = CreateCylinder(name + '-cylinder', {
        diameter: diameter,
        height: height - diameter
    });
    armCylinder.bakeTransformIntoVertices(Matrix.Translation(0, -((height - diameter) / 2), 0));

    const armAndShoulder = Mesh.MergeMeshes([armCylinder, shoulderCapsule]);
    armAndShoulder.material = armMaterial;
    setCastsShadows(armAndShoulder);
    armAndShoulder.parent = transformNode;
    
    const handSphere = CreateSphere(name + '-hand', { diameter: diameter });
    handSphere.bakeTransformIntoVertices(Matrix.Translation(0, -(height - diameter), 0));
    handSphere.material = handMaterial;
    setCastsShadows(handSphere);
    handSphere.parent = transformNode;

    if (!isLeft) {
        transformNode.scaling = new Vector3(-1, 1, 1);
    }

    return transformNode;
}

export function buildLegsGroup(torsoWidth: number, torsoDepth: number, legHeight: number, legDiameter: number,
                        legMaterial: StandardMaterial, footUpperMaterial: StandardMaterial, footSoleMaterial: StandardMaterial): TransformNode {
    const legsGroup = new TransformNode(getId());

    const hips = buildHips(torsoWidth, torsoDepth, torsoDepth, MaterialFactory.getTransparentMaterial());
    const hipsHeight = getHeight(hips);
    hips.parent = legsGroup;
    hips.position.y = -hipsHeight / 2;

    const legXOffset = (torsoWidth / 2) - (legDiameter / 2);

    const leftLeg = buildLeg(legHeight, legDiameter, legMaterial, footUpperMaterial, footSoleMaterial, 'left-leg');
    leftLeg.parent = legsGroup;
    leftLeg.position.x = -legXOffset;
    leftLeg.position.y = -hipsHeight / 2;

    const rightLeg = buildLeg(legHeight, legDiameter, legMaterial, footUpperMaterial, footSoleMaterial, 'right-leg');
    rightLeg.parent = legsGroup;
    rightLeg.position.x = legXOffset;
    rightLeg.position.y = -hipsHeight / 2;

    return legsGroup;
}

export function buildLeg(height: number, diameter: number, legMaterial: StandardMaterial, footUpperMaterial: StandardMaterial,
                  footSoleMaterial: StandardMaterial, name: string): TransformNode {
    const transformNode = new TransformNode(name);

    const footUpperWidth = diameter;
    
    const foot = buildFoot(footUpperWidth, footUpperMaterial, footSoleMaterial);
    const footLength = getDepth(foot);
    const footHeight = getHeight(foot);

    const cylinderHeight = height - footHeight;
    
    const legCylinder = CreateCylinder(getId(), {
        diameter: diameter,
        height: cylinderHeight
    });
    legCylinder.bakeTransformIntoVertices(Matrix.Translation(0, -(cylinderHeight / 2), 0));
    legCylinder.material = legMaterial;
    legCylinder.parent = transformNode;
    setCastsShadows(legCylinder);

    foot.parent = transformNode;
    foot.translate(Vector3.Down(), (cylinderHeight + (footHeight / 2)), Space.LOCAL);
    foot.translate(Vector3.Forward(), (footLength / 2) - ((footUpperWidth * 1.1) / 2), Space.LOCAL);

    return transformNode;
}

export function buildFoot(upperWidth: number, upperMaterial: StandardMaterial, soleMaterial: StandardMaterial): TransformNode {
    const transformNode = new TransformNode(getId());

    const upperLength = upperWidth * 2;
    const upperHeight = upperWidth / 2;

    const capsule = CreateCapsule(getId(), {
        radius: upperWidth / 2,
        height: upperLength,
        orientation: Vector3.Forward()
    });
    const capsuleMaskBox = CreateBox(getId(), {
        width: upperWidth,
        height: upperHeight,
        depth: upperLength
    });
    capsuleMaskBox.bakeTransformIntoVertices(Matrix.Translation(0, -(upperHeight / 2), 0));

    const halfCapsule = CSG.FromMesh(capsule).subtract(CSG.FromMesh(capsuleMaskBox)).toMesh(getId());
    capsule.dispose();
    capsuleMaskBox.dispose();

    halfCapsule.parent = transformNode;

    const cylinderOffset = ((upperLength / 2) - (upperWidth / 2));

    const cylinder = CreateCylinder(getId(), {
        diameter: upperWidth,
        height: upperHeight
    });
    cylinder.bakeTransformIntoVertices(Matrix.Translation(0, upperHeight / 2, -cylinderOffset));

    const upper = Mesh.MergeMeshes([halfCapsule, cylinder]);
    upper.material = upperMaterial;
    setCastsShadows(upper);
    upper.parent = transformNode;

    const soleWidth = upperWidth * 1.05;
    const soleHeight = upperHeight / 4;

    const soleCylinderFront = CreateCylinder(getId(), {
        diameter: soleWidth,
        height: soleHeight
    });
    soleCylinderFront.bakeTransformIntoVertices(Matrix.Translation(0, 0, cylinderOffset));

    const soleCylinderBack = CreateCylinder(getId(), {
        diameter: soleWidth,
        height: soleHeight
    });
    soleCylinderBack.bakeTransformIntoVertices(Matrix.Translation(0, 0, -cylinderOffset));

    const soleBox = CreateBox(getId(), {
        width: soleWidth,
        height: soleHeight,
        depth: upperLength - upperWidth
    });

    const sole = Mesh.MergeMeshes([soleCylinderFront, soleBox, soleCylinderBack]);
    sole.bakeTransformIntoVertices(Matrix.Translation(0, -(soleHeight / 2), 0));
    sole.material = soleMaterial;
    setCastsShadows(sole);
    sole.parent = transformNode;

    setOriginToCenter(transformNode);

    return transformNode;
}

export function buildHips(width: number, height: number, depth: number, material: StandardMaterial): Mesh {
    const cylinder = CreateCylinder(getId(), {
        diameter: depth,
        height: width
    });
    cylinder.bakeTransformIntoVertices(Matrix.RotationZ(Math.PI / 2));
    
    const boxHeight = height / 2;
    const box = CreateBox(getId(), {
        width: width,
        height: boxHeight,
        depth: depth
    });
    box.bakeTransformIntoVertices(Matrix.Translation(0, (boxHeight / 2), 0));

    const hips = CSG.FromMesh(cylinder).union(CSG.FromMesh(box)).toMesh(getId());
    cylinder.dispose();
    box.dispose();
    
    setCastsShadows(hips);
    hips.material = material;

    return hips;
}

export function buildHead(diameter: number, skinMaterial: StandardMaterial): TransformNode {
    const transformNode = new TransformNode(getId());
    
    const capsule = CreateCapsule(getId(), {
        radius: diameter / 2,
        height: diameter * 2.5,
        orientation: Vector3.Up()
    });
    capsule.bakeTransformIntoVertices(Matrix.Scaling(1, 0.5, 1));
    capsule.material = skinMaterial;
    setCastsShadows(capsule);
    capsule.parent = transformNode;
    
    const earHeight = diameter / 2;
    const earOffsetX = diameter / 2;
    
    const leftEar = buildEar(earHeight, skinMaterial);
    leftEar.position = new Vector3(-earOffsetX, 0, 0);
    leftEar.parent = transformNode;

    const rightEar = buildEar(earHeight, skinMaterial);
    rightEar.position = new Vector3(earOffsetX, 0, 0);
    rightEar.parent = transformNode;
    
    const hairSphere = CreateSphere(getId(), { diameter: diameter * 1.05 });
    const hairMaskBox = CreateBox(getId(), { width: diameter * 2, height: diameter * 2, depth: diameter * 2 });
    hairMaskBox.position = new Vector3(0, -diameter, 0);
    const hair = buildMeshWithCutouts(hairSphere, hairMaskBox);
    hair.scaling = new Vector3(1, 1, 1.2);
    hair.bakeTransformIntoVertices(Matrix.RotationX(-Math.PI / 3));
    hair.material = MaterialFactory.getMaterial(TextureName.LeatherBrown, 4, 4);
    hair.parent = transformNode;
    
    return transformNode;
}

function buildEar(height: number, skinMaterial: StandardMaterial): Mesh {
    const earSphere = CreateSphere(getId(), { diameter: height });
    earSphere.scaling = new Vector3(0.4, 1, 0.6);
    earSphere.material = skinMaterial;
    return earSphere;
}

export function getLimbSwingAnimation(name: string, maxAngle: number): Animation {
    const animation = new Animation(name, 'rotation.x', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);

    const keyFrames: IAnimationKey[] = [];

    keyFrames.push({
        frame: 0,
        value: 0
    });

    keyFrames.push({
        frame: frameRate * 0.25,
        value: maxAngle
    });

    keyFrames.push({
        frame: frameRate * 0.75,
        value: -maxAngle
    });

    keyFrames.push({
        frame: frameRate,
        value: 0
    });

    animation.setKeys(keyFrames);

    return animation;
}
