export default class webvideoPlayer {
    private _id = '__cocos_webvideoPlayer__'

    private _playing = false;
    private _timeupdate = false;
    private _copyVideo = false
    private _gl = null
    private _texture = null
    private _video = null

    private _cb_videoOpen = null
    private _cb_videoFirstFrame = null
    private _cb_videoProgress = null
    private _cb_videoFinish = null
    private _cb_videoError = null
    private _cb_videoLoading = null
    private _cb_videoWorking = null

    private _cb_videoFirstFrame_iscall = false
    private __eventListeners = {};

    public constructor() {}

    getTexture() {
        return this._texture
    }

    _bindEvent(video) {
        let cbs: any = this.__eventListeners;

        let checkReady = () => {
            if (this._playing && this._timeupdate) {
                this._copyVideo = true;
            }
        }
        cbs.play = () => {
            cc.log('video.addEventListener play')
        }
        cbs.pause = () => {
            cc.log('video.addEventListener pause')
        }
        cbs.playing = () => {
            cc.log('video.addEventListener playing')
            this._playing = true;
            checkReady();
        }
        cbs.canplay = () => {
            cc.log('video.addEventListener canplay')
            this._cb_videoWorking && this._cb_videoWorking()
        }
        cbs.canplaythrough = () => {
            cc.log('video.addEventListener canplaythrough')
        }
        cbs.suspend = () => {
            cc.log('video.addEventListener suspend')
        }
        cbs.ended = () => {
            cc.log('video.addEventListener ended')
            this._cb_videoFinish && this._cb_videoFinish()
        }
        cbs.error = () => {
            cc.log('video.addEventListener error')
            this._cb_videoError && this._cb_videoError()
        }
        cbs.loadeddata = () => {
            cc.log('video.addEventListener loadeddata')
            this._cb_videoOpen && this._cb_videoOpen(true)
        }
        cbs.timeupdate = () => {
            // cc.log('video.addEventListener timeupdate')
            this._timeupdate = true;
            checkReady();
            if (this._cb_videoFirstFrame && !this._cb_videoFirstFrame_iscall) {
                this._cb_videoFirstFrame_iscall = true
                this._cb_videoFirstFrame('')
            }
        }

        video.addEventListener('play', cbs.play, true);
        video.addEventListener('pause', cbs.pause, true);
        video.addEventListener('playing', cbs.playing, true);
        video.addEventListener('canplay', cbs.canplay, true);
        video.addEventListener('canplaythrough', cbs.canplaythrough, true);
        video.addEventListener('suspend', cbs.suspend, true);
        video.addEventListener('ended', cbs.ended, true);
        video.addEventListener('error', cbs.error, true);
        video.addEventListener('loadeddata', cbs.loadeddata, true);
        video.addEventListener('timeupdate', cbs.timeupdate, true);
    }
    open(url, cb) {
        this.initTexture(() => {
            this._gl = this.getGL()
            this._video = this.setupVideo(url)
            cb && cb(this._video.duration)
        })
    }

    getGL() {
        //@ts-ignore
        let gl = cc.renderer.device._gl
        return gl
    }

    setupVideo(url) {
        const video = document.createElement('video');
        video.volume = 0
        video.id = this._id
        video.autoplay = true;
        video.loop = true;
        this._bindEvent(video)
        video.src = url;
        video.play();
        return video;
    }
    initTexture(cb) {
        cc.resources.load('video/video_texture', cc.Texture2D, (err, asset: any) => {
            this._texture = asset
            cb && cb()
        })
    }
    updateTexture(gl, texture, video) {
        gl.bindTexture(gl.TEXTURE_2D, texture._glID);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }
    update(dt) {
        if (this._copyVideo && this._texture) {
            this.updateTexture(this._gl, this._texture._texture, this._video)
        }
    }
    destroy() {
        let cbs: any = this.__eventListeners;
        let video = this._video
        video.removeEventListener('play', cbs.play, true);
        video.removeEventListener('pause', cbs.pause, true);
        video.removeEventListener('playing', cbs.pause, true);
        video.removeEventListener('canplay', cbs.canplay, true);
        video.removeEventListener('canplaythrough', cbs.canplaythrough, true);
        video.removeEventListener('suspend', cbs.suspend, true);
        video.removeEventListener('ended', cbs.ended, true);
        video.removeEventListener('error', cbs.error, true);
        video.removeEventListener('loadeddata', cbs.loadeddata, true);
        video.removeEventListener('timeupdate', cbs.timeupdate, true);

        cc.assetManager.releaseAsset(this._texture)
        video.remove()
    }

    /**
     * 
     * @param v 
     */
    setVolume(v) {
        this._video.volume = v
    }
    isPlaying() {
        return this._playing
    }
    isPause() {
        return !this._playing
    }
    startPlay() {
        this._video.play();
    }
    resumePlay() {
        this._video.play();
    }
    pausePlay() {
        this._video.pause()
    }
    stopPlay() {
        this._video.pause()
    }
    /**
     * 
     * @param time 秒
     */
    seekPlay(time) {
        this._video.currentTime = time
    }

    /**
     * 打开视频文件成功
     * @param cb return {boolean} true
     */
    setVideoOpenCallback(cb: Function) {
        this._cb_videoOpen = cb
    }
    /**
     * 可以开始渲染第一帧
     * @param cb return {string} shader_key
     */
    setVideoFirstFrameCallback(cb: Function) {
        this._cb_videoFirstFrame = cb
    }
    /**
     * 播放进度
     * @param cb return {process,total}
     */
    setVideoProgressCallback(cb: Function) {
        this._cb_videoProgress = cb
    }
    /**
     * 播放完成
     * @param cb 
     */
    setVideoFinishCallback(cb: Function) {
        this._cb_videoFinish = cb
    }
    /**
     * 播放失败
     * @param cb 
     */
    setVideoErrorCallback(cb: Function) {
        this._cb_videoError = cb
    }
    /**
     * 加载中(开始缓存)
     * @param cb 
     */
    setVideoLoadingCallback(cb: Function) {
        this._cb_videoLoading = cb
    }
    /**
     * loading结束  开始播放
     * @param cb 
     */
    setVideoWorkingCallback(cb: Function) {
        this._cb_videoWorking = cb
    }
}
