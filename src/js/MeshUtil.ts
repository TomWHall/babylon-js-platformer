import {Node} from "@babylonjs/core/node";
import {AbstractMesh} from "@babylonjs/core/Meshes/abstractMesh";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {NodeMetadata, MeshType} from "./types";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {CSG} from "@babylonjs/core/Meshes/csg";

let id = 0;
export function getId(): string {
    id++;
    return id.toString();
}

export function getWidth(node: Node): number {
    const bounds = node.getHierarchyBoundingVectors();
    return bounds.max.x - bounds.min.x;
}

export function getHeight(node: Node): number {
    const bounds = node.getHierarchyBoundingVectors();
    return bounds.max.y - bounds.min.y;
}

export function getDepth(node: Node): number {
    const bounds = node.getHierarchyBoundingVectors();
    return bounds.max.z - bounds.min.z;
}

export function setOriginToCenter(transformNode: TransformNode) {
    const bounds = transformNode.getHierarchyBoundingVectors();

    const offsetX = -(bounds.min.x + ((bounds.max.x - bounds.min.x) / 2));
    const offsetY = -(bounds.min.y + ((bounds.max.y - bounds.min.y) / 2));
    const offsetZ = -(bounds.min.z + ((bounds.max.z - bounds.min.z) / 2));
    
    transformNode.locallyTranslate(new Vector3(offsetX, offsetY, offsetZ));
}

export function setCastsShadows(node: Node, castsShadows: boolean = true): void {
    node.metadata = node.metadata ?? {};
    (node.metadata as NodeMetadata).castsShadows = castsShadows;
}

export function isSolid(mesh: AbstractMesh): boolean {
    return (mesh.metadata as NodeMetadata)?.type === MeshType.Solid;
}

export function stackUp(nodes: TransformNode[]): TransformNode {
    const transformNode = new TransformNode(getId());
    
    let currentY = 0;
    
    nodes.forEach(node => {
        node.parent = transformNode;

        const bounds = node.getHierarchyBoundingVectors();
        const nodeHeight = bounds.max.y - bounds.min.y;

        node.position.y = currentY + (-bounds.min.y);

        currentY += nodeHeight;
    });
    
    return transformNode;
}

export function buildMeshWithCutouts(mesh: Mesh, ...maskMeshes: Mesh[]): Mesh {
    let meshCsg = CSG.FromMesh(mesh);

    maskMeshes.forEach(maskMesh => {
        const maskMeshCsg = CSG.FromMesh(maskMesh);
        meshCsg = meshCsg.subtract(maskMeshCsg);
    });

    const result = meshCsg.toMesh(getId());
    result.material = mesh.material;
    result.metadata = mesh.metadata;
    
    mesh.dispose();
    maskMeshes.forEach(maskMesh => {
        maskMesh.dispose();
    });
    
    return result;
}
