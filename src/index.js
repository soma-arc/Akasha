import Vue from 'vue';
import 'keen-ui/src/bootstrap';
import Root from './vue/root.vue';
import { RenderTextureCanvas, EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';
import { ThetaStream, TextureHandler } from './texture.js';
import { MobiusManager, MobiusRotateAroundAxis,
         MobiusTranslateAlongAxis, MobiusZoomIn } from './mobius.js';
//import dat from '../lib/dat.gui/build/dat.gui.min.js';
import { PI, TWO_PI, PI_2 } from './radians.js';

window.addEventListener('load', () => {
    const d = {};
    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        data: d,
        render: (h) => {
            return h('root', { 'props': d })
        },
        components: { 'root': Root }
    })

    const mobius = new MobiusManager();

//    const gui = new dat.GUI();
    const m = new MobiusRotateAroundAxis(PI_2, PI_2, 0);
    mobius.addTransformation(m);
    // const controller = gui.add(m, 'theta', 0, TWO_PI).step(0.01);
    // controller.onChange(() => {
    //     m.update();
    //     mobius.update();
    // });

    const translate = new MobiusTranslateAlongAxis(PI, 0,
                                                   PI, PI,
                                                   PI, PI_2,
                                                   PI, PI_2);
    mobius.addTransformation(translate);
    // const translateController = gui.add(translate, 'translationY', -PI_2, PI_2).step(0.01);
    // translateController.onChange(() => {
    //     translate.update();
    //     mobius.update();
    // });

    const zoom = new MobiusZoomIn(PI, PI_2, 1, 0);
    mobius.addTransformation(zoom);
    // const zoomRealController = gui.add(zoom, 'zoomReal', -5, 5).step(0.01);
    // const zoomImagController = gui.add(zoom, 'zoomImag', -5, 5).step(0.01);
    // function zoomOnChange () {
    //     zoom.update();
    //     mobius.update();
    // }

//    zoomRealController.onChange(zoomOnChange);
//    zoomImagController.onChange(zoomOnChange);

    const thetaS = new ThetaStream(true);
//    const renderTexCanvas = new RenderTextureCanvas('renderTextureCanvas');
    const eqRectCanvas = new EquirectangularCanvas('equirectCanvas',
                                                   mobius);
    const insideSphereCanvas = new InsideSphereCanvas('sphereInnerCanvas',
                                                      mobius);
    const outsideSphereCanvas = new OutsideSphereCanvas('sphereOuterCanvas',
                                                        mobius);
    const canvasList = [eqRectCanvas,
                        insideSphereCanvas, outsideSphereCanvas];
    const texHandler = new TextureHandler(canvasList, thetaS);

    function init () {
        for (const c of canvasList) {
            c.resizeCanvas();
        }
    }
    let resizeTimer = setTimeout(init, 500);

    
    function renderLoop() {
        texHandler.update();
//        renderTexCanvas.render();
        eqRectCanvas.render();
        insideSphereCanvas.render();
        outsideSphereCanvas.render();
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
});
