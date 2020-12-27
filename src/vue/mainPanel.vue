<template>
<div class="contentPanel">
  <div class="leftPanel">
    <div class="canvasPanel" id="equiCanvas">
      <div class="canvasParent" id="equiParent">
        <canvas id="equirectCanvas"></canvas>
      </div>
    </div>
    <div id="sphereCanvasPanel">
      <div class="canvasPanel">
        <div class="canvasParent">
          <canvas id="sphereOuterCanvas"></canvas>
        </div>
      </div>
      <div class="canvasPanel">
          <div class="canvasParent">
            <canvas id="sphereInnerCanvas"></canvas>
          </div>
      </div>
    </div>
  </div>
  <control-panel :mobiusMngr="mobiusMngr"
                 :canvasMngr="canvasMngr"
                 :texHandler="texHandler"/>
</div>
</template>

<script>
import ControlPanel from './controlPanel.vue';
export default {
    props: ['mobiusMngr', 'canvasMngr', 'texHandler'],
    components: {
        ControlPanel
    }
}

</script>

<style>
.contentPanel {
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
}

.canvasParent {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.leftPanel {
    border-style: ridge;
    border-color: gray;
    background-color: gray;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.canvasPanel {
    border-style: ridge;
    border-color: gray;
    background-color: gray;
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
}

.canvas {
    width: 100%;
    height: 100%;
}

#sphereCanvasPanel {
    display: flex;
    flex-direction: row;
    flex: 1;
}

#equiParent {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;    
    overflow:hidden;
}

</style>
