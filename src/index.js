import Vue from 'vue';
import Root from './vue/root.vue';
import { RenderTextureCanvas, EquirectangularCanvas,
         InsideSphereCanvas, OutsideSphereCanvas } from './canvas.js';
import { ThetaStream, TextureHandler } from './texture.js';
import { MobiusManager, MobiusRotateAroundAxis,
         MobiusTranslateAlongAxis, MobiusZoomIn } from './mobius.js';
//import dat from '../lib/dat.gui/build/dat.gui.min.js';
import { PI, TWO_PI, PI_2 } from './radians.js';
import 'keen-ui/src/bootstrap';

window.addEventListener('load', () => {
    const mobius = new MobiusManager();

    const m = new MobiusRotateAroundAxis(PI_2, PI_2, 0);
    mobius.addTransformation(m);

    const translate = new MobiusTranslateAlongAxis(PI, 0,
                                                   PI, PI,
                                                   PI, PI_2,
                                                   PI, PI_2);
    mobius.addTransformation(translate);
    const zoom = new MobiusZoomIn(PI, PI_2, 1, 0);
    mobius.addTransformation(zoom);

    const d = { 'mobiusMngr': mobius };
    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        data: d,
        render: (h) => {
            return h('root', { 'props': d })
        },
        components: { 'root': Root }
    })

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

    function resize () {
        for (const c of canvasList) {
            c.resizeCanvas();
        }
    }

    let resizeTimer = setTimeout(resize, 500);
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 500);
    })

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
