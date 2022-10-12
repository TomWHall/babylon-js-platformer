import {AssetsManager, TextureAssetTask} from "@babylonjs/core/Misc/assetsManager";
import {Scene} from "@babylonjs/core/scene";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import Logger from "../Logger";
import {getId} from "../MeshUtil";

export enum TextureName {
    Pavement,
    Metal,
    Glass,
    LeatherBrown,
    FabricGrey,
    Skin,
    BricksOrange,
    WoodRed,
    BooleanSign
}

const imagePaths: Array<string[]> = new Array(9);
imagePaths[TextureName.Pavement] = ['Pavement/pavement.jpg', null, 'Pavement/pavement-spec.jpg'];
imagePaths[TextureName.Metal] = ['Metal/metal.jpg', 'Metal/metal-normal.jpg', 'Metal/metal-spec.jpg'];
imagePaths[TextureName.Glass] = ['Glass/glass.jpg'];
imagePaths[TextureName.LeatherBrown] = ['LeatherBrown/leather-brown.jpg', 'LeatherBrown/leather-brown-normal.jpg', 'LeatherBrown/leather-brown-spec.jpg'];
imagePaths[TextureName.FabricGrey] = ['FabricGrey/fabric-grey.jpg', 'FabricGrey/fabric-grey-normal.jpg', 'FabricGrey/fabric-grey-spec.jpg'];
imagePaths[TextureName.Skin] = ['Skin/skin.jpg'];
imagePaths[TextureName.BricksOrange] = ['BricksOrange/bricks-orange.jpg', 'BricksOrange/bricks-orange-normal.jpg', 'BricksOrange/bricks-orange-spec.jpg'];
imagePaths[TextureName.WoodRed] = ['WoodRed/wood-red.jpg', 'WoodRed/wood-red-normal.jpg', 'WoodRed/wood-red-spec.jpg'];
imagePaths[TextureName.BooleanSign] = ['BooleanSign/boolean-sign.jpg'];

async function loadImages(scene: Scene): Promise<void> {
    const assetsManager = new AssetsManager(scene);
    
    imagePaths.forEach((paths: string[], index: number) => {
        const url = `img/${paths[0]}`;
        const textureTask = assetsManager.addTextureTask(`TextureTask-${url}`, url);

        textureTask.onSuccess = function (task) {
            Textures[index] = Textures[index] ?? {} as TextureData;
            Textures[index].Color = textureTask.texture;
        }
        textureTask.onError = imageLoadError;

        if (paths.length >= 2 && paths[1]) {
            const normalUrl = `img/${paths[1]}`;
            const normalTextureTask = assetsManager.addTextureTask(`TextureTask-${normalUrl}`, normalUrl);

            normalTextureTask.onSuccess = function (task) {
                Textures[index] = Textures[index] ?? {} as TextureData;
                Textures[index].Normal = textureTask.texture;
            }
            normalTextureTask.onError = imageLoadError;
        }

        if (paths.length >= 3 && paths[2]) {
            const specUrl = `img/${paths[2]}`;
            const specTextureTask = assetsManager.addTextureTask(`TextureTask-${specUrl}`, specUrl);

            specTextureTask.onSuccess = function (task) {
                Textures[index] = Textures[index] ?? {} as TextureData;
                Textures[index].Spec = textureTask.texture;
            }
            specTextureTask.onError = imageLoadError;
        }
    });

    return new Promise<void>((resolve, reject) => {
        Logger.log('Loading assets');
        const startTime = performance.now();

        assetsManager.onFinish = tasks => {
            const duration = performance.now() - startTime;
            Logger.log(`Loaded assets in ${duration}ms`);

            resolve();
        };

        assetsManager.load();
    });
}

function imageLoadError(task: TextureAssetTask, message?: string, exception?: any) {
    Logger.log(`Error loading texture from URL ${task.url}`, message, exception);
}

function getTransparentMaterial(): StandardMaterial {
    const material = new StandardMaterial(getId());
    material.alpha = 0;
    
    return material;
}

function getMaterial(textureName: TextureName, uScale: number, vScale: number): StandardMaterial {
    const textureData = Textures[textureName]; 
    
    const baseTexture = getTexture(textureData.Color, uScale, vScale);

    const material = new StandardMaterial(getId());
    material.diffuseTexture = baseTexture;
    material.ambientTexture = baseTexture;
    
    if (textureData.Normal) {
        material.bumpTexture = getTexture(textureData.Normal, uScale, vScale);
    }

    if (textureData.Spec) {
        material.specularTexture = getTexture(textureData.Spec, uScale, vScale);
    }
    
    return material;
}

function getTexture(texture: Texture, uScale: number, vScale: number): Texture {
    const textureClone = texture.clone();
    textureClone.uScale = uScale;
    textureClone.vScale = vScale;

    return textureClone;
}

export default {
    loadImages: loadImages,
    getMaterial: getMaterial,
    getTransparentMaterial: getTransparentMaterial
}

interface TextureMap {
    [textureId: number]: TextureData;
}

export const Textures = {} as TextureMap;

interface TextureData {
    Color: Texture;
    Normal?: Texture;
    Spec?: Texture;
}