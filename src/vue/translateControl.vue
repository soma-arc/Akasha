<template>
<div>
  <b-field label="P">
    <b-input v-model.number="translate.pLngLat.re"
             type="number"
             @input="updateTranslation"
             min="0" max="6.24" step="0.01"/>
    <b-input v-model.number="translate.pLngLat.im"
             type="number"
             @input="updateTranslation"
             min="0" max="6.24" step="0.01"/>
  </b-field>
  <b-field label="Q">
    <b-input v-model.number="translate.qLngLat.re"
             type="number"
             @input="updateTranslation"
             step="0.01"/>
    <b-input v-model.number="translate.qLngLat.im"
             type="number"
             @input="updateTranslation"
             step="0.01"/>
  </b-field>
  <b-field label="R1">
    <b-input v-model.number="translate.r1LngLat.re"
             type="number"
             @input="updateTranslation"
             min="0" max="6.24" step="0.01"/>
    <b-input v-model.number="translate.r1LngLat.im"
             type="number"
             @input="updateTranslation"
             min="0" max="6.24" step="0.01"/>
  </b-field>
  <b-field label="R2">
    <b-input v-model.number="translate.r2LngLat.re"
             type="number"
             @input="updateTranslation"
             step="0.01"/>
    <b-input v-model.number="translate.r2LngLat.im"
             type="number"
             @input="updateTranslation"
             step="0.01"/>
  </b-field>
</div>
</template>

<script>
export default {
    props: ['mobiusMngr', 'translate'],
    components: {
    },
    data: function () {
        return {
        }
    },
    methods: {
        updateTranslation: function() {
            this.translate.update();
            this.mobiusMngr.update2();
        }
    }
}
</script>

<style>
</style>
