import { DualFishEyeCanvas, EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';
import ThetaStream from './theta.js';
import { MobiusManager } from './mobius.js';

window.addEventListener('load', () => {
    const thetaS = new ThetaStream();
    const mobius = new MobiusManager();
    const fisheyeCanvas = new DualFishEyeCanvas('fisheyeCanvas',
                                                thetaS);
    const eqRectCanvas = new EquirectangularCanvas('equirectangularCanvas',
                                                   thetaS, mobius);
    const insideSphereCanvas = new InsideSphereCanvas('insideSphereCanvas',
                                                      thetaS, mobius);
    const outsideSphereCanvas = new OutsideSphereCanvas('outsideSphereCanvas',
                                                        thetaS, mobius);
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
