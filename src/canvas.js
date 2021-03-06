import { getWebGL2Context, createRGBTextures, createSquareVbo,
         attachShader, linkProgram } from './glUtils';
import { DegToRad, TWO_PI, PI } from './radians.js';
import { RENDER_VERTEX, RENDER_FRAGMENT,
         EQ_RECTANGULAR_TMPL, EQ_RECTANGULAR_FLIPPED_TMPL,
         OUTSIDE_SPHERE_TMPL,
         INSIDE_SPHERE_TMPL } from './shaders/shaders.js';
import Complex from './complex.js';

export class Canvas2D {
    constructor(canvasId, fragment) {
        this.canvasId = canvasId
        this.fragmant = fragment;
    }

    init() {
        this.canvas = document.getElementById(this.canvasId);
        this.gl = getWebGL2Context(this.canvas);

        this.resizeCanvas();
        this.vertexBuffer = createSquareVbo(this.gl);
        this.canvasRatio = this.canvas.width / this.canvas.height / 2;
        this.pixelRatio = window.devicePixelRatio;

        this.panoramaTexture = createRGBTextures(this.gl, 256, 256, 1)[0];
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.panoramaTexture);

        this.boundInitPanoramaTexture = this.initPanoramaTexture.bind(this);
    }

    compileRenderShader() {
        this.renderProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, this.fragment,
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);

        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');

        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);
        this.getUniformLocations();
    }

    getUniformLocations() {
        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_texture'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_resolution'));
    }

    setUniformValues() {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.uniform1i(this.uniLocations[0], this.panoramaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
    }

    initPanoramaTexture (width, height) {
        this.panoramaTexture = createRGBTextures(this.gl, width, height, 1)[0];
    }

    updatePanoramaTexture (data, width, height) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.panoramaTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,
                           width, height, 0, this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE, data);
    }

    getMousePosOnCanvas(event) {
        const rect = this.canvas.getBoundingClientRect();
        return [(event.clientX - rect.left) * this.pixelRatio,
                (event.clientY - rect.top) * this.pixelRatio];
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.uniform1i(this.uniLocations[0], this.panoramaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.style.width = parent.clientWidth + 'px';
        this.canvas.style.height = parent.clientHeight + 'px';
        this.canvas.width = parent.clientWidth * this.pixelRatio;
        this.canvas.height = parent.clientHeight * this.pixelRatio;
        this.canvasRatio = this.canvas.width / this.canvas.height / 2;
    }

        // https://stackoverflow.com/questions/37135417/download-canvas-as-png-in-fabric-js-giving-network-error
    dataURLtoBlob (dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    saveImage (gl, x, y, width, height, filename) {
        const data = new Uint8Array(width * height * 4);
        const type = gl.UNSIGNED_BYTE;
        gl.readPixels(x, y, width, height, gl.RGBA, type, data);

        const saveCanvas = document.createElement('canvas');
        saveCanvas.width = width;
        saveCanvas.height = height;
        const context = saveCanvas.getContext('2d');

        const imageData = context.createImageData(width, height);
        imageData.data.set(data);
        context.putImageData(imageData, 0, 0);
        const a = document.createElement('a');
        const canvasData = saveCanvas.toDataURL();
        const blob = this.dataURLtoBlob(canvasData);

        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }
}

export class RenderTextureCanvas extends Canvas2D {
    constructor(canvasId, mobiusMngr) {
        super(canvasId, RENDER_FRAGMENT);
        this.mobiusMngr = mobiusMngr;
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.setUniformValues();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

export class EquirectangularCanvas extends Canvas2D {
    constructor(canvasId, mobiusMngr) {
        super(canvasId, EQ_RECTANGULAR_TMPL.render(mobiusMngr.getSceneContext()));

        this.mobiusMngr = mobiusMngr;

        this.isMousePressing = false;
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseRelease = this.onMouseRelease.bind(this);
    }

    init() {
        super.init();
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.canvas.addEventListener('mouseup', this.boundOnMouseRelease);
        this.compileRenderShader();
    }

    compileRenderShader() {
        this.renderProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, EQ_RECTANGULAR_TMPL.render(this.mobiusMngr.getSceneContext()),
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);

        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);

        this.renderProductProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProductProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, EQ_RECTANGULAR_FLIPPED_TMPL.render(this.mobiusMngr.getSceneContext()),
                     this.renderProductProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProductProgram);
        this.renderCanvasFlippedVAttrib = this.gl.getAttribLocation(this.renderProductProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasFlippedVAttrib);
        this.locations = [];
        this.productLocations = [];
        this.getUniformLocations(this.locations, this.renderProgram);
        this.getUniformLocations(this.productLocations, this.renderProductProgram);
    }

    getUniformLocations(locations, program) {
        locations.push(this.gl.getUniformLocation(program,
                                                  'u_texture'));
        locations.push(this.gl.getUniformLocation(program,
                                                  'u_resolution'));
        locations.push(this.gl.getUniformLocation(program,
                                                  'u_mobiusArray'));
        this.mobiusMngr.setUniformLocations(this.gl, locations, program);
    }

    setUniformValues(locations) {
        let uniI = 0;
        this.gl.uniform1i(locations[uniI++], this.panoramaTexture);
        this.gl.uniform2f(locations[uniI++], this.canvas.width, this.canvas.height);
        this.gl.uniform1fv(locations[uniI++], this.mobiusMngr.sl2cMatrixArray);
        uniI = this.mobiusMngr.setUniformValues(this.gl, locations, uniI);
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        if (parent.clientWidth > parent.clientHeight) {
            this.canvas.style.width = parent.clientHeight * 2 + 'px';
            this.canvas.style.height = parent.clientHeight + 'px';
            this.canvas.width = parent.clientHeight * 2 * this.pixelRatio;
            this.canvas.height = parent.clientHeight * this.pixelRatio;
        } else {
            this.canvas.style.width = parent.clientWidth + 'px';
            this.canvas.style.height = parent.clientWidth / 2 + 'px';
            this.canvas.width = parent.clientWidth * this.pixelRatio;
            this.canvas.height = parent.clientWidth * this.pixelRatio / 2;
        }

        this.canvasRatio = this.canvas.width / this.canvas.height / 2;
    }

    onMouseDown(event) {
        event.preventDefault();
        this.isMousePressing = true;
        this.mouseDownXY = this.getMousePosOnCanvas(event);
        this.mobiusMngr.select(new Complex(TWO_PI * this.mouseDownXY[0] / this.canvas.width,
                                           PI * Math.abs(this.mouseDownXY[1] / this.canvas.height - 1)));
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.isMousePressing) {
            const mouse = this.getMousePosOnCanvas(event);
            this.mobiusMngr.move(new Complex(TWO_PI * mouse[0] / this.canvas.width,
                                             PI * Math.abs(mouse[1] / this.canvas.height - 1)));
        }
    }

    onMouseRelease(event) {
        this.isMousePressing = false;
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);

        this.setUniformValues(this.locations);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    renderProduct() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProductProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);

        this.setUniformValues(this.productLocations);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasFlippedVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    save() {
        this.renderProduct();
        this.saveImage(this.gl, 0, 0,
                       this.canvas.width, this.canvas.height,
                       'equirectangular.png');
    }
}

export class InsideSphereCanvas extends Canvas2D {
    constructor(canvasId, mobiusMngr) {
        super(canvasId, INSIDE_SPHERE_TMPL.render(mobiusMngr.getSceneContext()));

        this.mobiusMngr = mobiusMngr;

        this.cameraPos = [0, 0, 0];
        this.cameraTarget = [0, 0, 0];
        this.fov = 60;
        this.up = [0, 1, 0];

        this.lnglat = [180, 0];
        this.mouseDownLngLat = [0, 0];
        this.isMousePressing = false;
        this.updateCamera();

        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseRelease = this.onMouseRelease.bind(this);
        this.boundOnMouseWheel = this.onMouseWheel.bind(this);
    }

    init() {
        super.init();
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.canvas.addEventListener('mouseup', this.boundOnMouseRelease);
        this.canvas.addEventListener('wheel', this.boundOnMouseWheel);

        this.compileRenderShader();
    }

    compileRenderShader() {
        this.renderProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, INSIDE_SPHERE_TMPL.render(this.mobiusMngr.getSceneContext()),
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);

        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);
        this.getUniformLocations();
    }

    onMouseDown(event) {
        event.preventDefault();
        this.isMousePressing = true;
        this.mouseDownXY = this.getMousePosOnCanvas(event);
        this.mouseDownLngLat = [this.lnglat[0], this.lnglat[1]];
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.isMousePressing) {
            const mouse = this.getMousePosOnCanvas(event);
            this.lnglat = [(this.mouseDownXY[0] - mouse[0]) * 0.1 + this.mouseDownLngLat[0],
                           (mouse[1] - this.mouseDownXY[1]) * 0.1 + this.mouseDownLngLat[1]];
            this.updateCamera();
        }
    }

    onMouseRelease(event) {
        this.isMousePressing = false;
    }

    onMouseWheel(event) {
        event.preventDefault();
        this.fov += Math.sign(event.deltaY) * 10;
        this.fov = Math.max(1, Math.min(this.fov, 180));
    }

    updateCamera() {
        this.lnglat[1] = Math.max(-85, Math.min(85, this.lnglat[1]));
        const phi = DegToRad(90 - this.lnglat[1]);
        const theta = DegToRad(this.lnglat[0]);

        this.cameraTarget = [Math.sin(phi) * Math.cos(theta),
                             Math.cos(phi),
                             Math.sin(phi) * Math.sin(theta)];
    }

    getUniformLocations() {
        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_texture'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_resolution'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_mobiusArray'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraTarget'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_fov'));
    }

    setUniformValues() {
        this.gl.uniform1i(this.uniLocations[0], this.panoramaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.uniform1fv(this.uniLocations[2], this.mobiusMngr.sl2cMatrixArray);
        this.gl.uniform3f(this.uniLocations[3],
                          this.cameraTarget[0], this.cameraTarget[1], this.cameraTarget[2]);
        this.gl.uniform1f(this.uniLocations[4], DegToRad(this.fov));
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);

        this.setUniformValues();

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

export class OutsideSphereCanvas extends Canvas2D {
    constructor(canvasId, mobiusMngr) {
        super(canvasId, OUTSIDE_SPHERE_TMPL.render(mobiusMngr.getSceneContext()));

        this.mobiusMngr = mobiusMngr;

        this.cameraPos = [0, 1, 1];
        this.cameraTarget = [0, 0, 0];
        this.fov = 60;
        this.cameraUp = [0, 1, 0];

        this.lnglat = [0, 0];
        this.mouseDownLngLat = [0, 0];
        this.isMousePressing = false;
        this.cameraDistance = 2;
        this.updateCamera();

        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseRelease = this.onMouseRelease.bind(this);
        this.boundOnMouseWheel = this.onMouseWheel.bind(this);
    }

    init() {
        super.init();
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.canvas.addEventListener('mouseup', this.boundOnMouseRelease);
        this.canvas.addEventListener('mouseout', this.boundOnMouseRelease);
        this.canvas.addEventListener('wheel', this.boundOnMouseWheel);

        this.compileRenderShader();
    }

    compileRenderShader() {
        this.renderProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, OUTSIDE_SPHERE_TMPL.render(this.mobiusMngr.getSceneContext()),
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);

        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);
        this.getUniformLocations();
    }

    getUniformLocations() {
        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_texture'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_resolution'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_mobiusArray'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraPos'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraUp'));
        this.mobiusMngr.setUniformLocations(this.gl, this.uniLocations, this.renderProgram);
    }

    setUniformValues() {
        let uniI = 0;
        this.gl.uniform1i(this.uniLocations[uniI++], this.panoramaTexture);
        this.gl.uniform2f(this.uniLocations[uniI++], this.canvas.width, this.canvas.height);
        this.gl.uniform1fv(this.uniLocations[uniI++], this.mobiusMngr.sl2cMatrixArray);
        this.gl.uniform3f(this.uniLocations[uniI++],
                          this.cameraPos[0], this.cameraPos[1], this.cameraPos[2]);
        this.gl.uniform3f(this.uniLocations[uniI++],
                          this.cameraUp[0], this.cameraUp[1], this.cameraUp[2]);
        uniI = this.mobiusMngr.setUniformValues(this.gl, this.uniLocations, uniI);
    }

    onMouseDown(event) {
        event.preventDefault();
        this.isMousePressing = true;
        this.mouseDownXY = this.getMousePosOnCanvas(event);
        this.mouseDownLngLat = [this.lnglat[0], this.lnglat[1]];
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.isMousePressing) {
            const mouse = this.getMousePosOnCanvas(event);
            this.lnglat = [(this.mouseDownXY[0] - mouse[0]) * 0.5 + this.mouseDownLngLat[0],
                           (mouse[1] - this.mouseDownXY[1]) * 0.5 + this.mouseDownLngLat[1]];
            this.updateCamera();
        }
    }

    onMouseRelease(event) {
        this.isMousePressing = false;
    }

    onMouseWheel(event) {
        event.preventDefault();
        if (event.deltaY > 0) {
            this.cameraDistance *= 1.25;
        } else if (this.cameraDistance > 1.1) {
            this.cameraDistance /= 1.25;
        }
        this.updateCamera();
    }

    updateCamera() {
        this.lnglat[1] = Math.max(-85, Math.min(85, this.lnglat[1]));
        const phi = DegToRad(90 - this.lnglat[1]);
        const theta = DegToRad(this.lnglat[0]);

        this.cameraPos = [this.cameraDistance * Math.sin(phi) * Math.cos(theta),
                          Math.max(-0.9, this.cameraDistance * Math.cos(phi)),
                          this.cameraDistance * Math.sin(phi) * Math.sin(theta)];
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.setUniformValues();

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}
