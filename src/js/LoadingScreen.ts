import {ILoadingScreen} from "@babylonjs/core/Loading/loadingScreen";

export default class CustomLoadingScreen implements ILoadingScreen {

    loadingUIText: string;
    loadingUIBackgroundColor: string;

    public displayLoadingUI() { }

    public hideLoadingUI() { }
}