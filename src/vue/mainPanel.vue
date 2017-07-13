<template>
  <div class="contentPanel">
    <div id="canvasParentPanel">
      <div class="canvasPanel">
        <div class="canvasParent">
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
    <control-panel/>
  </div>
</template>

<script>
import ControlPanel from './controlPanel.vue';
export default {
    props: [],
    components: {
        ControlPanel
    }
}

</script>

<style>
.contentPanel {
    flex: 1;
    display: flex;
}

#equirectCanvas {
    align-items: center;
}

#canvasParentPanel {
    flex: 1;
    display: flex;
    flex-direction: column;
}

#sphereCanvasPanel {
    flex: 1;
    display: flex;
}

#canvas3dOrb #canvas3dGen {
    width: 100%;
    height: 100%;
    cursor: crosshair;
}

.renderPropertyPanel{
    height: 50px;

    background-color: white;
    border-top: ridge;
    border-color: gray;
    display: flex;
    align-items: center;
    padding-left: 5px;
}

.canvasPanel {
    border-style: ridge;
    border-color: gray;
    background-color: gray;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.canvasParent {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

</style>
