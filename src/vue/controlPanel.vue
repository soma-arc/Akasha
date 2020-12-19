<template>
  <div class="controlPanel">
    <b-tabs v-model="activeTab">
      <b-tab-item label="Scene">
        <mobius-panel v-bind:mobiusMngr="mobiusMngr" />
      </b-tab-item>
    </b-tabs>  
  </div>
</template>

<script>
import MobiusPanel from './mobiusPanel.vue';

export default {
    props: ['mobiusMngr'],
    components: {
        MobiusPanel
    }
}
</script>

<style>
.controlPanel {
    border-style: ridge;
    border-color: gray;
    background-color: white;
    flex-basis: 300px;
    display: flex;
    flex-direction: column;
    height: 100%;
  overflow: auto;


  padding: 15px;
}

.objList {
    padding-left: 20px;
    width: 200px;
    height: 100px;
}

ui-tabs__header-items {
    margin: 0;
    display: flex;
    flex-direction: column;
    width: 300px;
}

.ui-tabs {
    padding: 0;
    margin:0;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.ui-tabs__body {
    flex:1;
    margin:0;
    padding:0;
    overflow-y: auto;
    align-items: center;
}

.ui-tab {
    padding-top: 20px;
    flex:1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

</style>
