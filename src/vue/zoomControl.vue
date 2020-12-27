<template>
<div>
  <b-field label="Longitude  Latitude">
    <b-input v-model.number="zoom.lng"
             type="number"
             @input="updateZoom"
             min="0" max="6.24" step="0.01"/>
    <b-input v-model.number="zoom.lat"
             type="number"
             @input="updateZoom"
             min="0" max="6.24" step="0.01"/>
  </b-field>
  <b-field label="Zoom real and image">
    <b-input v-model.number="zoom.zoomReal"
             type="number"
             @input="updateZoom"
             step="0.01"/>
    <b-input v-model.number="zoom.zoomImag"
             type="number"
             @input="updateZoom"
             step="0.01"/>
  </b-field>
</div>
</template>

<script>
export default {
    props: ['mobiusMngr', 'zoom'],
    components: {
    },
    data: function () {
        return {
        }
    },
    methods: {
        updateZoom: function() {
            this.zoom.update();
            this.mobiusMngr.update2();
        }
    }
}
</script>

<style>
</style>
