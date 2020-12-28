<template>
<div>
  <b-field label="Longitude  Latitude">
    <b-input v-model.number="rotate.lng"
             type="number"
             @input="updateRotation"
             min="0" max="6.24" step="0.01"/>
    <b-input v-model.number="rotate.lat"
             type="number"
             @input="updateRotation"
             min="0" max="6.24" step="0.01"/>
  </b-field>
  <b-field label="Rotation (radians)">
    <b-input v-model.number="rotate.theta" type="number"
             :min="-6.28" :max="6.28" :step="0.01"
             @input="updateRotation"></b-input>
  </b-field>
</div>
</template>

<script>
export default {
    props: ['mobiusMngr', 'rotate'],
    components: {
    },
    data: function () {
        return {
        }
    },
    methods: {
        updateRotation: function() {
            this.rotate.update2();
            this.mobiusMngr.update2();
        }
    }
}
</script>

<style>
#angleSlider {
    padding-top: 10px;
}
</style>
