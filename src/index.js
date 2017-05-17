import { getWebGL2Context, createRGBTextures, createSquareVbo,
         attachShader, linkProgram } from './glUtils';

class ThetaStream {
    constructor() {
        this.video = document.createElement('video');
        this.streaming = false;
        this.width = 0;
        this.height = 0;
    }

    connect(canplayCallbacks) {
        const media = {video: true, audio: false};

        const successCallback = (localMediaStream) => {
            this.video.src = window.URL.createObjectURL(localMediaStream);
            const canplayListener = () => {
                this.video.removeEventListener('canplay', canplayListener);
                this.streaming = true;
                this.width = this.video.videoWidth;
                this.height = this.video.videoHeight;
                for (const callback of canplayCallbacks) {
                    callback(this.video);
                }
            }
            this.video.addEventListener('canplay', canplayListener);
            this.video.play();
        }

        const failureCallback = (err) => {
            if (err.name === 'PermissionDeniedError') {
                alert('denied permission');
            } else {
                alert('can not be used webcam');
            }
        }

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(media).then(successCallback,
                                                            failureCallback);
        } else {
            alert('not supported getUserMedia');
        }
    }
}

const RENDER_VERTEX = require('./render.vert');
const RENDER_FRAGMENT = require('./render.frag');

class Canvas2D {
    constructor(canvasId, thetaStream) {
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
        attachShader(this.gl, RENDER_FRAGMENT,
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);

        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);
        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_texture'));

        this.thetaTexture = createRGBTextures(this.gl, 256, 256, 1)[0];
    }

    thetaStreamCanplayCallback(video) {
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

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }
}

window.addEventListener('load', () => {
    const thetaS = new ThetaStream();
    const canvas = new Canvas2D('canvas', thetaS);
    thetaS.connect([canvas.thetaStreamCanplayCallback.bind(canvas)]);

    function renderLoop() {
        canvas.render();
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
});
