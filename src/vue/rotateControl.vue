<template>
  <div>
    <!-- <ui-slider id="angleSlider" v-model.number="rotate.theta" -->
    <!--            type="number" key="h-n" /> -->
    <ui-textbox v-model.number="rotate.theta" label="rotation"
                type="number" step="0.1" key="p-x" @change="update"/>
  </div>
</template>

<script>
    import UiSlider from 'keen-ui/lib/UiSlider';
  import UiTextbox from 'keen-ui/lib/UiTextbox';

export default {
    props: ['mobiusMngr', 'rotate'],
    components: {
        UiSlider,
        UiTextbox
    },
    methods: {
        update: function() {
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
