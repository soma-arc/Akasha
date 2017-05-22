import { getWebGL2Context, createRGBTextures, createSquareVbo,
         attachShader, linkProgram } from './glUtils';
import { DegToRad } from './radians.js';
import { RENDER_VERTEX, RENDER_FRAGMENT, EQ_RECTANGULAR_FRAGMENT,
         INSIDE_SPHERE_FRAGMENT, OUTSIDE_SPHERE_FRAGMENT} from './shaders/shaders.js';

export class Canvas2D {
    constructor(canvasId, thetaStream, fragment) {
        this.canvas = document.getElementById(canvasId);
        this.gl = getWebGL2Context(this.canvas);
        this.thetaStream = thetaStream;

        this.vertexBuffer = createSquareVbo(this.gl);
        this.canvasRatio = this.canvas.width / this.canvas.height / 2;
        this.pixelRatio = window.devicePixelRatio;

        // render to canvas
        this.renderProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, fragment,
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);

        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);

        this.thetaTexture = createRGBTextures(this.gl, 256, 256, 1)[0];

        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_texture'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_resolution'));

        this.boundThetaStreamCallback = this.thetaStreamCanplayCallback.bind(this);
    }

    thetaStreamCanplayCallback(video) {
        console.log(`resolution(${video.videoWidth}, ${video.videoHeight})`);
        this.thetaTexture = createRGBTextures(this.gl, video.videoWidth,
                                              video.videoHeight, 1)[0];
    }

    updateThetaTexture() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.thetaTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0,
                           this.gl.RGBA, this.thetaStream.width, this.thetaStream.height,
                           0, this.gl.RGBA, this.gl.UNSIGNED_BYTE,
                           this.thetaStream.equirectangularTextureData);
    }

    getMousePosOnCanvas(event) {
        const rect = this.canvas.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.updateThetaTexture();
        this.gl.uniform1i(this.uniLocations[0], this.thetaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

export class RenderTextureCanvas extends Canvas2D {
    constructor(canvasId, thetaStream) {
        super(canvasId, thetaStream, RENDER_FRAGMENT);
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.updateThetaTexture();

        this.gl.uniform1i(this.uniLocations[0], this.thetaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

export class EquirectangularCanvas extends Canvas2D {
    constructor(canvasId, thetaStream, mobiusMngr) {
        super(canvasId, thetaStream, EQ_RECTANGULAR_FRAGMENT);

        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_mobiusArray'));
        this.mobiusMngr = mobiusMngr;
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.updateThetaTexture();
        this.gl.uniform1i(this.uniLocations[0], this.thetaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.uniform1fv(this.uniLocations[2], this.mobiusMngr.sl2cMatrixArray);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

export class InsideSphereCanvas extends Canvas2D {
    constructor(canvasId, thetaStream, mobiusMngr) {
        super(canvasId, thetaStream, INSIDE_SPHERE_FRAGMENT);

        this.mobiusMngr = mobiusMngr;

        this.cameraPos = [0, 0, 0];
        this.cameraTarget = [0, 0, 0];
        this.fov = 60;
        this.up = [0, 1, 0];

        this.lnglat = [0, 0];
        this.mouseDownLngLat = [0, 0];
        this.isMousePressing = false;
        this.updateCamera();

        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_mobiusArray'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraTarget'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_fov'));

        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseRelease = this.onMouseRelease.bind(this);
        this.boundOnMouseWheel = this.onMouseWheel.bind(this);
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.canvas.addEventListener('mouseup', this.boundOnMouseRelease);
        this.canvas.addEventListener('mousewheel', this.boundOnMouseWheel);
    }

    onMouseDown(event) {
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
        this.fov -= event.wheelDelta * 0.05;
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

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.updateThetaTexture();
        this.gl.uniform1i(this.uniLocations[0], this.thetaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.uniform1fv(this.uniLocations[2], this.mobiusMngr.sl2cMatrixArray);
        this.gl.uniform3f(this.uniLocations[3],
                          this.cameraTarget[0], this.cameraTarget[1], this.cameraTarget[2]);
        this.gl.uniform1f(this.uniLocations[4], DegToRad(this.fov));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

export class OutsideSphereCanvas extends Canvas2D {
    constructor(canvasId, thetaStream, mobiusMngr) {
        super(canvasId, thetaStream, OUTSIDE_SPHERE_FRAGMENT);

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

        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_mobiusArray'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraPos'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraUp'));

        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseRelease = this.onMouseRelease.bind(this);
        this.boundOnMouseWheel = this.onMouseWheel.bind(this);
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.canvas.addEventListener('mouseup', this.boundOnMouseRelease);
        this.canvas.addEventListener('mouseout', this.boundOnMouseRelease);
        this.canvas.addEventListener('mousewheel', this.boundOnMouseWheel);
    }

    onMouseDown(event) {
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
        if (event.wheelDelta < 0 || this.cameraDistance > 1) {
            this.cameraDistance -= event.wheelDelta * 0.001;
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
        this.updateThetaTexture();
        this.gl.uniform1i(this.uniLocations[0], this.thetaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.canvas.width, this.canvas.height);
        this.gl.uniform1fv(this.uniLocations[2], this.mobiusMngr.sl2cMatrixArray);
        this.gl.uniform3f(this.uniLocations[3],
                          this.cameraPos[0], this.cameraPos[1], this.cameraPos[2]);
        this.gl.uniform3f(this.uniLocations[4],
                          this.cameraUp[0], this.cameraUp[1], this.cameraUp[2]);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}
