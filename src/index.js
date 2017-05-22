import { RenderTextureCanvas, EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';
import ThetaStream from './theta.js';
import { MobiusManager } from './mobius.js';
import dat from '../lib/dat.gui/build/dat.gui.min.js';
import { PI, TWO_PI, PI_2 } from './radians.js';

window.addEventListener('load', () => {
    const thetaS = new ThetaStream();
    const mobius = new MobiusManager();
    const renderTexCanvas = new RenderTextureCanvas('renderTextureCanvas',
                                                thetaS);
    const eqRectCanvas = new EquirectangularCanvas('equirectangularCanvas',
                                                   thetaS, mobius);
    const insideSphereCanvas = new InsideSphereCanvas('insideSphereCanvas',
                                                      thetaS, mobius);
    const outsideSphereCanvas = new OutsideSphereCanvas('outsideSphereCanvas',
                                                        thetaS, mobius);
    thetaS.connect([renderTexCanvas.boundThetaStreamCallback,
                    eqRectCanvas.boundThetaStreamCallback,
                    insideSphereCanvas.boundThetaStreamCallback,
                    outsideSphereCanvas.boundThetaStreamCallback]);

    function renderLoop() {
        thetaS.updateTexture();
        renderTexCanvas.render();
        eqRectCanvas.render();
        insideSphereCanvas.render();
        outsideSphereCanvas.render();
        requestAnimationFrame(renderLoop);
    }

    const gui = new dat.GUI();
    const controller = gui.add(mobius, 'rotation', 0, TWO_PI).step(0.01);
    controller.onChange(mobius.update.bind(mobius));

    const translationController = gui.add(mobius, 'translation', -PI_2, PI_2).step(0.01);
    translationController.onChange(mobius.update.bind(mobius));

    const zoomController = gui.add(mobius, 'zoomFactor', 0.1, 10).step(0.01);
    zoomController.onChange(mobius.update.bind(mobius));
    renderLoop();
});
