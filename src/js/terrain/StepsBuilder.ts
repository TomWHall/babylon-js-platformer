import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {CreateBox} from "@babylonjs/core/Meshes/Builders/boxBuilder";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {buildMeshWithCutouts, getId} from "../MeshUtil";
import MaterialFactory, {TextureName} from "./MaterialFactory";
import {MeshType, NodeMetadata} from "../types";

const stepHeight = 1;
const stepThickness = 0.1;
const rampThickness = 0.01;
const sidePlankHeight = 1;
const sidePlankThickness = 0.25;

export function buildSteps(x: number, z: number, yBottom: number, yTop: number, width: number): TransformNode {
    const rootNode = new TransformNode(getId());
    rootNode.position = new Vector3(x, yBottom, z - stepHeight);
    
    addColliders(rootNode, x, z, yBottom, yTop, width);
    addSideBeam(rootNode, x, z, yBottom, yTop, width, true);
    addSideBeam(rootNode, x, z, yBottom, yTop, width, false);
    addSteps(rootNode, x, z, yBottom, yTop, width);
    
    return rootNode;
}

function addColliders(rootNode: TransformNode, x: number, z: number, yBottom: number, yTop: number, width: number): void {
    const sideLength = yTop - yBottom;
    const rampLength = Math.sqrt((sideLength * sideLength) + (sideLength * sideLength));

    const rampBox = CreateBox(getId(), {
        width: width,
        height: rampThickness,
        depth: rampLength,
        wrap: true
    });

    rampBox.material = MaterialFactory.getTransparentMaterial();

    rampBox.metadata = {
        type: MeshType.Solid
    } as NodeMetadata;

    const totalHeight = yTop - yBottom;

    rampBox.position = new Vector3(0, totalHeight / 2, totalHeight / 2);
    rampBox.rotation = new Vector3(-Math.PI / 4, 0, 0);

    rampBox.parent = rootNode;

    const topStepBox = CreateBox(getId(), {
        width: width,
        height: stepThickness,
        depth: stepHeight
    });
    topStepBox.position = new Vector3(0, totalHeight - (stepThickness / 2), (totalHeight + (stepHeight / 2)));
    topStepBox.metadata = {
        type: MeshType.Solid
    } as NodeMetadata;
    topStepBox.material = MaterialFactory.getTransparentMaterial();
    topStepBox.parent = rootNode;
}

function addSteps(rootNode: TransformNode, x: number, z: number, yBottom: number, yTop: number, width: number): void {
    const totalHeight = yTop - yBottom;
    const numSteps = Math.floor(totalHeight / stepHeight);

    for (let i = 1; i <= numSteps; i++) {
        const step = CreateBox(getId(), {
            width: width - sidePlankThickness,
            height: stepThickness,
            depth: stepHeight,
            wrap: true
        });

        step.parent = rootNode;
        step.position = new Vector3(0, (i * stepHeight) - (stepThickness / 2) - 0.001, (i * stepHeight) + (stepHeight / 2));

        step.metadata = {
            type: MeshType.Background,
            castsShadows: true
        } as NodeMetadata;

        const vScale = 2;
        const uScale = (width / stepHeight) * vScale;
        
        step.material = MaterialFactory.getMaterial(TextureName.Metal, uScale, vScale);
    }
}

function addSideBeam(rootNode: TransformNode, x: number, z: number, yBottom: number, yTop: number, width: number, isLeft: boolean): void {
    const sideLength = yTop - yBottom;
    const plankLength = (Math.sqrt((sideLength * sideLength) + (sideLength * sideLength))) + 2;

    const plankBox = CreateBox(getId(), {
        width: sidePlankThickness,
        height: sidePlankHeight,
        depth: plankLength,
        wrap: true
    });

    const vScale = 2;
    const uScale = (plankLength / sidePlankHeight) * vScale;

    plankBox.material = MaterialFactory.getMaterial(TextureName.Metal, uScale, vScale);
    
    plankBox.metadata = {
        type: MeshType.Solid
    } as NodeMetadata;

    const totalHeight = yTop - yBottom;

    const xPos = ((width / 2) - (sidePlankThickness / 2)) * (isLeft ? -1 : 1);
    plankBox.position = new Vector3(xPos, totalHeight / 2, (totalHeight / 2) + 0.5);
    plankBox.rotation = new Vector3(-Math.PI / 4, 0, 0);
    
    const maskBoxTop = CreateBox(getId(), {
        width: 1000,
        height: 4,
        depth: 1000
    });
    maskBoxTop.position.y = yTop + 2;

    const maskBoxBottom = CreateBox(getId(), {
        width: 1000,
        height: 4,
        depth: 1000
    });
    maskBoxBottom.position.y = yBottom - 2;
    
    const plankBoxClipped = buildMeshWithCutouts(plankBox, maskBoxTop, maskBoxBottom);
    plankBoxClipped.parent = rootNode;
}
