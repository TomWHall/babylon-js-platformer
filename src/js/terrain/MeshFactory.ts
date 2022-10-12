import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {CreateBox} from "@babylonjs/core/Meshes/Builders/boxBuilder";
import {CreateCylinder} from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import {Matrix, Vector3} from "@babylonjs/core/Maths/math.vector";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {VertexBuffer} from "@babylonjs/core/Buffers/buffer";
import {getId} from "../MeshUtil";
import {NodeMetadata, MeshType} from "../types";

export function buildBox(width: number, height: number, depth: number, position?: Vector3, material?: StandardMaterial): Mesh {
    const mesh = CreateBox(getId(), {
        width: width,
        height: height,
        depth: depth,
        wrap: true
    });
    mesh.metadata = {
        type: MeshType.Solid,
        castsShadows: true
    } as NodeMetadata;

    if (position) {
        mesh.position = position;
    }
    if (material) {
        mesh.material = material;
    }

    return mesh;
}

export function buildCylinder(diameter: number, height: number, position?: Vector3, material?: StandardMaterial): Mesh {
    const mesh = CreateCylinder(getId(), {
        diameter: diameter,
        height: height
    });
    mesh.metadata = {
        type: MeshType.Solid,
        castsShadows: true
    } as NodeMetadata;

    if (position) {
        mesh.position = position;
    }
    if (material) {
        mesh.material = material;
    }

    return mesh;
}

export function taperMesh(mesh: Mesh, slopeMultiplier: number, flipVertical: boolean = false): void {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);

    const numberOfVertices = positions.length / 3;
    for (let i = 0; i < numberOfVertices; i++) {
        const first = i * 3; // x value
        if (positions[first + 1] > 0) {
            positions[first] *= slopeMultiplier;
            positions[first + 2] *= slopeMultiplier;
        }
    }

    mesh.setVerticesData(VertexBuffer.PositionKind, positions);
    
    if (flipVertical) {
        mesh.bakeTransformIntoVertices(Matrix.RotationZ(Math.PI));
    } else {
        mesh.bakeCurrentTransformIntoVertices();
    }
}

export function buildTaperedBox(width: number, height: number, depth: number, slopeMultiplier: number, flipVertical: boolean = false): Mesh {
    const box = CreateBox(getId(), {
        width: width,
        height: height,
        depth: depth,
        updatable: true
    });

    taperMesh(box, slopeMultiplier, flipVertical);
    
    return box;
}
