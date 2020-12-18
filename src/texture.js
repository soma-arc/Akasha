
import { getWebGL2Context, createSquareVbo, attachShader,
         linkProgram, createRGBTextures } from './glUtils.js';
import { RENDER_VERTEX, STITCH_FRAGMENT } from './shaders/shaders.js';
import { MobiusRotateAroundAxis } from './mobius.js';
import { PI_2 } from './radians.js';

export class ThetaStream {
    constructor (enableStitching) {
        this.video = document.createElement('video');
        this.streaming = false;
        this.enableStitching = enableStitching;
        this.width = 256;
        this.height = 256;

        this.stitchingCanvas = document.createElement('canvas');
        this.gl = getWebGL2Context(this.stitchingCanvas);

        this.vertexBuffer = createSquareVbo(this.gl);

        this.renderProgram = this.gl.createProgram();
        attachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        attachShader(this.gl, STITCH_FRAGMENT,
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        linkProgram(this.gl, this.renderProgram);
        this.renderCanvasVAttrib = this.gl.getAttribLocation(this.renderProgram,
                                                             'a_vertex');
        this.gl.enableVertexAttribArray(this.renderCanvasVAttrib);

        this.textureFrameBuffer = this.gl.createFramebuffer();

        this.thetaTexture = createRGBTextures(this.gl, 256, 256, 1)[0];
        this.stitchedTexture = createRGBTextures(this.gl, 256, 256, 1)[0];

        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_dualFishEyeTexture'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_resolution'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_mobiusArray'));

        this.mobius = new MobiusRotateAroundAxis(PI_2, PI_2, PI_2);

        this.textureDataContainer = new Uint8Array(this.width * this.height * 4);
    }

    connect(canplayCallback, failure) {
        const media = { video: true, audio: false };

        const successCallback = (localMediaStream) => {
            this.video = document.createElement('video');
            this.video.srcObject = localMediaStream;
            const canplayListener = () => {
                this.video.removeEventListener('canplay', canplayListener);
                this.streaming = true;
                this.width = this.video.videoWidth;
                this.height = this.video.videoHeight;

                this.thetaTexture = createRGBTextures(this.gl,
                                                      this.width, this.height, 1)[0];
                this.stitchedTexture = createRGBTextures(this.gl,
                                                         this.width, this.height, 1)[0];
                this.textureDataContainer = new Uint8Array(this.width * this.height * 4);
                canplayCallback(this.width, this.height);
            }
            this.video.addEventListener('canplay', canplayListener);
            this.video.play();
        }

        const failureCallback = (err) => {
            failure();
            console.log('failure');
            if (err.name === 'PermissionDeniedError') {
                console.log('denied permission');
            } else {
                console.log(err);
                console.log('can not be used webcam');
            }
        }

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(media).then(successCallback,
                                                            failureCallback);
        } else {
            console.log('not supported getUserMedia');
        }
    }

    stitch () {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.textureFrameBuffer);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.stitchedTexture);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                                     this.gl.TEXTURE_2D, this.stitchedTexture, 0);

        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.thetaTexture);
        this.gl.uniform1i(this.uniLocations[0], this.thetaTexture);
        this.gl.uniform2f(this.uniLocations[1], this.width, this.height);
        this.gl.uniform1fv(this.uniLocations[2], this.mobius.sl2c.linearArray);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    update () {
        if (!this.streaming) return;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.thetaTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0,
                           this.gl.RGBA, this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE, this.video);
        if (this.enableStitching) {
            this.stitch();
        }
    }

    get equirectangularTextureData () {
        if (!this.streaming) return this.textureDataContainer;
        if (this.enableStitching) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.stitchedTexture);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.textureFrameBuffer);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                                         this.gl.TEXTURE_2D, this.stitchedTexture, 0);

            this.gl.readPixels(0, 0, this.width, this.height,
                               this.gl.RGBA, this.gl.UNSIGNED_BYTE,
                               this.textureDataContainer);

            return this.textureDataContainer;
        } else {
            return this.video;
        }
    }
}

const DEFAULT_CHECKER_TEXTURE = require('./img/checker.png');

export class TextureHandler {
    constructor (canvases, video) {
        this.video = video;
        this.canvasInitFunctions = canvases.map((c) => {
            return c.boundInitPanoramaTexture;
        });
        this.video.connect(this.initCanvasTextures.bind(this),
                           () => {
                               this.initCanvasTextures(this.defaultTexture.width,
                                                       this.defaultTexture.height);
                               this.updatePanoramaTexture(this.defaultTexture,
                                                          this.defaultTexture.width,
                                                          this.defaultTexture.height);
                           });
        this.useVideo = true;
        this.canvases = canvases;

        this.defaultTexture = new Image();
        this.defaultTexture.src = DEFAULT_CHECKER_TEXTURE;
    }

    update () {
        if (this.useVideo && this.video.streaming) {
            this.updateVideoFrame();
            this.updatePanoramaTexture(this.video.equirectangularTextureData,
                                       this.video.width,
                                       this.video.height);
        }
    }

    updateVideoFrame () {
        this.video.update();
    }

    updatePanoramaTexture (textureData, width, height) {
        for (const canvas of this.canvases) {
            canvas.updatePanoramaTexture(textureData, width, height);
        }
    }

    initCanvasTextures (width, height) {
        for (const initTexture of this.canvasInitFunctions) {
            initTexture(width, height);
        }
    }
}
