import { getWebGL2Context, createRGBTextures, createSquareVbo,
         attachShader, linkProgram } from './glUtils';

const RENDER_VERTEX = require('./render.vert');
const DUAL_FISH_EYE_FRAGMENT = require('./render.frag');
const EQ_RECTANGULAR_FRAGMENT = require('./equirectangular.frag');
const INSIDE_SPHERE_FRAGMENT = require('./insideSphere.frag');

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
        if (this.thetaStream.streaming) {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0,
                               this.gl.RGBA, this.gl.RGBA,
                               this.gl.UNSIGNED_BYTE, this.thetaStream.video);
        }
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

export class DualFishEyeCanvas extends Canvas2D {
    constructor(canvasId, thetaStream) {
        super(canvasId, thetaStream, DUAL_FISH_EYE_FRAGMENT);
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
    constructor(canvasId, thetaStream) {
        super(canvasId, thetaStream, EQ_RECTANGULAR_FRAGMENT);
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

export class InsideSphereCanvas extends Canvas2D {
    constructor(canvasId, thetaStream) {
        super(canvasId, thetaStream, INSIDE_SPHERE_FRAGMENT);
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
