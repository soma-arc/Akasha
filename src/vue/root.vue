<template>
<div id="body">
  <header class="header">
    <ul class="headerLeft">
      <li class="headerContent"><span>Akasha</span></li>
    </ul>
    <ul class="headerRight">
      <li class="buttonLi">
        <button class="button" @click="clearMobius">Clear</button>
      </li>
      <li class="buttonLi">
        <button class="button" @click="">Export</button>
      </li>
      <li class="buttonLi">
        <button class="button" @click="">Import</button>
      </li>
      <li class="buttonLi">
        <button class="button" @click="saveEquirectangular">SaveImage</button>
      </li>
    </ul>
  </header>
  <main-panel v-bind:mobiusMngr="mobiusMngr"/>
  <footer>
    <div id="left">
      <a id="ghLink" href="https://github.com/soma-arc/Akasha"
       target="_blank">
        <img src="../img/GitHub-Mark-32px.png" class="imgLink"/>
      </a>
    </div>
    <div>
      Created by soma_arc
    </div>
  </footer>
</div>
</template>

<script>
import MainPanel from './mainPanel.vue';
export default {
    props: ['mobiusMngr', 'canvasMngr'],
    components: {
        MainPanel
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

html {
    height: 100%;
    font-family: "Times New Roman";
}

#body {
    font-family: "Times New Roman";
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

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

.myBtn {
    display: flex;
    align-items: center;
    height: 100%;
    border-right-style: ridge;
    border-right-color: gray;
}

.btnLink {
    margin-top: 10px;
    padding-left: 10px;
    padding-right: 10px;
    height: 100%;
}

.myBtn:hover{
    background-color: PaleTurquoise;
}

a {
    text-decoration: none;
}
a:link   {color:#000000;}
a:visited{color:#000000;}
a:hover  {color:#000000;}
a:active {color:#000000;}

.mainPanel {
    flex: 1;
    display: flex;
}

footer {
    border-style: ridge;
    border-color: gray;
    height: 50px;
    background-color: Azure;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-right: 0.9rem;
    
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    cursor: default;
}

.imgLink{
    padding: 10px;
}

#ghLink {
    height: 50px;
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

#left {
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-left: 10px;
}
</style>
