import {DualFishEyeCanvas, EquirectangularCanvas,
        InsideSphereCanvas, OutsideSphereCanvas} from './canvas.js';
import ThetaStream from './theta.js'

window.addEventListener('load', () => {
    const thetaS = new ThetaStream();
    const fisheyeCanvas = new DualFishEyeCanvas('fisheyeCanvas',
                                                thetaS);
    const eqRectCanvas = new EquirectangularCanvas('equirectangularCanvas',
                                                   thetaS);
    const insideSphereCanvas = new InsideSphereCanvas('insideSphereCanvas',
                                                      thetaS);
    const outsideSphereCanvas = new OutsideSphereCanvas('outsideSphereCanvas',
                                                        thetaS);
    thetaS.connect([fisheyeCanvas.boundThetaStreamCallback,
                    eqRectCanvas.boundThetaStreamCallback,
                    insideSphereCanvas.boundThetaStreamCallback,
                    outsideSphereCanvas.boundThetaStreamCallback]);

    function renderLoop() {
        fisheyeCanvas.render();
        eqRectCanvas.render();
        insideSphereCanvas.render();
        outsideSphereCanvas.render();
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
});
