<template>
<div id="root">
  <header-panel :mobiusMngr="mobiusMngr"
                :canvasMngr="canvasMngr"/>
  <main-panel :mobiusMngr="mobiusMngr"
              :canvasMngr="canvasMngr"/>
  <footer-panel/>
</div>
</template>

<script>
import HeaderPanel from './headerPanel.vue';
import MainPanel from './mainPanel.vue';
import FooterPanel from './footerPanel.vue';

export default {
    props: ['mobiusMngr', 'canvasMngr'],
    components: {
        HeaderPanel,
        MainPanel,
        FooterPanel
    },
    methods: {
        saveEquirectangular: function() {
            this.canvasMngr.saveEquirectangular();
        },
        clearMobius: function() {
            this.mobiusMngr.selectedTransformation = undefined;
            this.mobiusMngr.unselectAll();
            this.mobiusMngr.clear();
            this.canvasMngr.reCompileShaders();
        }
    }
}

</script>

<style>
#root {
    font-family: "Times New Roman";
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
}

</style>
