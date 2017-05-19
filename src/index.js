import {DualFishEyeCanvas, EquirectangularCanvas, PanoramaCanvas} from './canvas.js';
import ThetaStream from './theta.js'

window.addEventListener('load', () => {
    const thetaS = new ThetaStream();
    const fisheyeCanvas = new DualFishEyeCanvas('fisheyeCanvas',
                                                thetaS);
    const eqRectCanvas = new EquirectangularCanvas('equirectangularCanvas',
                                                   thetaS);
    const panoramaCanvas = new PanoramaCanvas('panoramaCanvas',
                                              thetaS);
    thetaS.connect([fisheyeCanvas.boundThetaStreamCallback,
                    eqRectCanvas.boundThetaStreamCallback,
                    panoramaCanvas.boundThetaStreamCallback]);

    function renderLoop() {
        fisheyeCanvas.render();
        eqRectCanvas.render();
        panoramaCanvas.render();
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
});
