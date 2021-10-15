<template>
  <div>
    <canvas id="show_video"></canvas>
    <video id="video_real" :src="'static/test_video.mp4'"
           @loadeddata="loadVideo"></video>
    <video id="video_real2" :src="'static/test_video.mp4'"
           controls
           @loadeddata="loadVideo"></video>
    <div>
      <button @click="playVideo">{{playStatus?'暂停':'播放'}}</button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'HelloWorld',
  data () {
    return {
      video_view:null,
      canvas_video:null,
      context:null,
      playStatus:false,
      kernel:null,
      dataOffset:null,
      kernOffset:null,
      Uint8View:null,
      Int8View:null,
      currentTime:0,
      nowTime:0,
    }
  },
  mounted() {

    // console.log(this.$wasm._add(1,1))
    this.video_view = document.getElementById('video_real')
    this.video_view2 = document.getElementById('video_real2')
    this.canvas_video = document.getElementById('show_video')
    this.context = this.canvas_video.getContext('2d')
    this.kernel = this.flipKernel([
      [-1, -1, 1],
      [1, 9, -1],
      [1, -1, 1]
    ]);
// 获取 C/C++ 中存有卷积核矩阵和帧像素数据的数组，在 Wasm 线性内存段中的偏移位置；
    this.dataOffset = this.$wasm._cppGetDataPtr();
    this.kernOffset = this.$wasm._cppGetkernelPtr();
// 扁平化卷积核的二维数组到一位数组，以方便数据的填充；
    const flatKernel = this.kernel.reduce((acc, cur) => acc.concat(cur), []);
// 为 Wasm 模块的线性内存段设置两个用于进行数据操作的视图，分别对应卷积核矩阵和帧像素数据；
    this.Uint8View = new Uint8Array(this.$wasm.memory.buffer);
    this.Int8View = new Int8Array(this.$wasm.memory.buffer);
// 填充卷积核矩阵数据；
    this.Int8View.set(flatKernel, this.kernOffset);
// 封装的 Wasm 滤镜处理函数；
  },
  methods:{
    filterWASM (pixelData, width, height) {
      const arLen = pixelData.length;
      // 填充当前帧画面的像素数据；
      this.Uint8View.set(pixelData, this.dataOffset);
      // 调用滤镜处理函数；
      this.$wasm._cppConvFilter(width, height, 4);
      // 返回经过处理的数据；
      return this.Uint8View.subarray(this.dataOffset, this.dataOffset + arLen);
    },
  flipKernel(kernel) {
    const h = kernel.length;
    const half = Math.floor(h / 2);
    // 按中心对称的方式将矩阵中的数字上下、左右进行互换；
    for (let i = 0; i < half; ++i) {
      for (let j = 0; j < h; ++j) {
        let _t = kernel[i][j];
        kernel[i][j] = kernel[h - i - 1][h - j - 1];
        kernel[h - i - 1][h - j - 1] = _t;
      }
    }
    // 处理矩阵行数为奇数的情况；
    if (h & 1) {
      // 将中间行左右两侧对称位置的数进行互换；
      for (let j = 0; j < half; ++j) {
        let _t = kernel[half][j];
        kernel[half][j] = kernel[half][h - j - 1];
        kernel[half][h - j - 1] = _t;
      }
    }
    return kernel;
  },
    playVideoT(){
      if (!this.playStatus) return
      let _now_time = new Date().getTime()
      // console.log((_now_time-this.nowTime)/1000)
      this.video_view.currentTime += (_now_time-this.nowTime)/1000
      this.nowTime = _now_time
      let that = this
      if (this.video_view.currentTime>=this.video_view.duration) this.playStatus=false
      setTimeout(function (){
        that.playVideoT()
      },0.03333)
    },
    playVideo(){
      this.playStatus = !this.playStatus
      if (this.playStatus){
        this.video_view2.play()
        this.nowTime = new Date().getTime()
        if (this.video_view.currentTime>=this.video_view.duration) this.video_view.currentTime = 0
        this.playVideoT()
      }else{
        this.video_view2.pause()
      }
    },
    loadVideo(){
      this.canvas_video.setAttribute('width',this.video_view.videoWidth)
      this.canvas_video.setAttribute('height',this.video_view.videoHeight)
      this.draw()
    },
    draw(){
      // if (this.playStatus) console.log(this.video_view.currentTime)
      this.context.drawImage(document.getElementById('video_real'),0,0)
      let pixels = this.context.getImageData(0, 0, this.video_view.videoWidth, this.video_view.videoHeight)
      let _data = this.filterWASM (pixels.data, this.video_view.videoWidth, this.video_view.videoHeight)
      for (var i=0;i < _data.length; i+=4) {
        pixels.data[i]   = _data[i];   //red
        pixels.data[i+1] = _data[i+1]; //green
        pixels.data[i+2] = _data[i+2]; //blue
        pixels.data[i+3] = _data[i+3]; //alpha
      }
      this.context.putImageData(pixels,0,0)
      requestAnimationFrame(this.draw)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
