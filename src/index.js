import { DualFishEyeCanvas, EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';
import ThetaStream from './theta.js';
import { MobiusManager } from './mobius.js';
import dat from '../lib/dat.gui/build/dat.gui.min.js';

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

    const gui = new dat.GUI();
    const controller = gui.add(mobius, 'rotation', 0, Math.PI * 2).step(0.01);
    controller.onChange(mobius.update.bind(mobius));

    const translationController = gui.add(mobius, 'translation', -Math.PI / 2, Math.PI / 2).step(0.01);
    translationController.onChange(mobius.update.bind(mobius));

    const zoomController = gui.add(mobius, 'zoomFactor', 0.1, 10).step(0.01);
    zoomController.onChange(mobius.update.bind(mobius));
    renderLoop();
});
