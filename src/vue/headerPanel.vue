<template>
  <header>
    <ul class="headerLeft">
      <li class="headerContent"><span>Akasha</span></li>
    </ul>
    <ul class="headerRight">
      <li class="buttonLi">
        <button class="button" @click="clearMobius">Clear</button>
      </li>
      <li class="buttonLi">
        <button class="button" @click="exportParameters">Export</button>
      </li>
      <li class="buttonLi">
        <button class="button" @click="importParameters">Import</button>
      </li>
      <li class="buttonLi">
        <button class="button" @click="saveEquirectangular">SaveImage</button>
      </li>
    </ul>
  </header>
</template>

<script>
export default{
    props: ['canvasMngr', 'mobiusMngr'],
    methods: {
        saveEquirectangular: function() {
            this.canvasMngr.saveEquirectangular();
        },
        clearMobius: function() {
            this.mobiusMngr.selectedTransformation = undefined;
            this.mobiusMngr.unselectAll();
            this.mobiusMngr.clear();
            this.canvasMngr.reCompileShaders();
        },
        exportParameters: function() {
            this.mobiusMngr.exportMobiusTransformations();
        },
        importParameters: function() {
            this.mobiusMngr.importMobiusTransformations(this.canvasMngr);
        }
    }
}
</script>

<style>
header {
    border-style: ridge;
    border-color: gray;

    overflow:hidden;
    font-size: 2rem;

    height: 50px;
    background-color: Azure;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    cursor: default;
}

.headerLeft {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;

    list-style: none;
    height: 100%;
}

.headerRight{
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;

    list-style: none;
    height: 100%;

    flex-direction: row-reverse;
}

.buttonLi {
    flex: 1;
    align-items: center;
    justify-content: center;
    padding-right: 10px;
    display: flex;
}

.headerContent {
    padding: 5px;
}
</style>
