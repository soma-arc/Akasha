export default class ThetaStream {
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
                console.log(err);
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
