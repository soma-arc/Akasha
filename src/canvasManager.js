import { EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';

export default class CanvasManager {
    constructor(eqRectCanvasId,
                insideSphereCanvasId,
                outsideSphereCanvasId,
                mobiusMngr) {
        this.eqRectCanvas = new EquirectangularCanvas(eqRectCanvasId,
                                                      mobiusMngr);
        this.insideSphereCanvas = new InsideSphereCanvas(insideSphereCanvasId,
                                                        mobiusMngr);
        this.outsideSphereCanvas = new OutsideSphereCanvas(outsideSphereCanvasId,
                                                           mobiusMngr);
    }

    init() {
        this.eqRectCanvas.init();
        this.insideSphereCanvas.init();
        this.outsideSphereCanvas.init();
    }

    resizeCanvases() {
        this.eqRectCanvas.resizeCanvas();
        this.insideSphereCanvas.resizeCanvas();
        this.outsideSphereCanvas.resizeCanvas();
    }

    renderCanvases() {
        this.eqRectCanvas.render();
        this.insideSphereCanvas.render();
        this.outsideSphereCanvas.render();
    }

    saveEquirectangular() {
        this.eqRectCanvas.save();
    }
}
