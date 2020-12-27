<template>
<div>
  <section>
    <div class="field">
      <b-radio v-model="radio"
               native-value="default"
               @input="selectDefault">
        Default
      </b-radio>
    </div>
    <div class="field">
      <b-radio v-model="radio"
               native-value="checker"
               @input="selectChecker">
        Checker
      </b-radio>
    </div>
    <div class="field">
      <b-radio v-model="radio"
               native-value="camera"
               @input="selectCamera">
        Camera
    </b-radio>
    </div>
    <div class="field">
      <b-radio v-model="radio"
               native-value="load"
               @input="selectOriginal">
        Load original image
      </b-radio>
    </div>
  </section>
  <section v-show="radio === 'load'">
    <b-button @click="loadImage">Load</b-button>
  </section>
</div>
</template>

<script>
export default {
    props: ['mobiusMngr', 'canvasMngr', 'texHandler'],
    components: {},
    data: function () {
        return {
            radio: 'default'
        }
    },
    methods: {
        loadImage: function() {
            this.texHandler.loadOriginal();
        },
        selectDefault: function() {
            this.texHandler.changeToDefault();
        },
        selectChecker: function() {
            this.texHandler.changeToChecker();
        },
        selectCamera: function() {
            this.texHandler.changeToCamera();
        },
        selectOriginal: function() {
            if (this.texHandler.originalTexture.src === '') return;
            this.texHandler.changeToOriginal();
        }
    }
}
</script>

<style>
</style>
