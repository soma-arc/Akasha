import { RenderTextureCanvas, EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';
import { ThetaStream, TextureHandler } from './texture.js';
import { MobiusManager, MobiusRotateAroundAxis,
         MobiusTranslateAlongAxis, MobiusZoomIn } from './mobius.js';
import dat from '../lib/dat.gui/build/dat.gui.min.js';
import { PI, TWO_PI, PI_2 } from './radians.js';

window.addEventListener('load', () => {
    const mobius = new MobiusManager();

    const gui = new dat.GUI();
    const m = new MobiusRotateAroundAxis(PI_2, PI_2, 0);
    mobius.addTransformation(m);
    const controller = gui.add(m, 'theta', 0, TWO_PI).step(0.01);
    controller.onChange(() => {
        m.update();
        mobius.update();
    });

    const translate = new MobiusTranslateAlongAxis(PI, 0,
                                                   PI, PI,
                                                   PI, PI_2,
                                                   PI, PI_2);
    mobius.addTransformation(translate);
    const translateController = gui.add(translate, 'translationY', -PI_2, PI_2).step(0.01);
    translateController.onChange(() => {
        translate.update();
        mobius.update();
    });

    const zoom = new MobiusZoomIn(PI, PI_2, 1, 0);
    mobius.addTransformation(zoom);
    const zoomController = gui.add(zoom, 'zoomReal', 0.5, 5).step(0.01);
    zoomController.onChange(() => {
        zoom.update();
        mobius.update();
    });

    const thetaS = new ThetaStream(true);
    const renderTexCanvas = new RenderTextureCanvas('renderTextureCanvas');
    const eqRectCanvas = new EquirectangularCanvas('equirectangularCanvas',
                                                   mobius);
    const insideSphereCanvas = new InsideSphereCanvas('insideSphereCanvas',
                                                      mobius);
    const outsideSphereCanvas = new OutsideSphereCanvas('outsideSphereCanvas',
                                                        mobius);
    const canvasList = [renderTexCanvas, eqRectCanvas,
                        insideSphereCanvas, outsideSphereCanvas];
    const texHandler = new TextureHandler(canvasList, thetaS);

    function renderLoop() {
        texHandler.update();
        renderTexCanvas.render();
        eqRectCanvas.render();
        insideSphereCanvas.render();
        outsideSphereCanvas.render();
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
});
