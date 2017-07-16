<template>
  <div id="sceneObjPanel">
    <select size="5" @change="updateSelection"
            v-model="mobiusMngr.selectedTransformation"
            class="objList">
      <option v-for="mobius in mobiusMngr.transformations" v-bind:value="mobius" key="obj.id">
        {{ mobius.getClassName() }}
      </option>
    </select>
    <rotate-control v-if="selectedObjName === 'MobiusRotateAroundAxis'"
                    v-bind:rotate="mobiusMngr.selectedTransformation",
                    v-bind:mobiusMngr="mobiusMngr" />
    <!-- <ui-button id="deleteButton" type="secondary" raised color="primary"
               @click="deleteSelectedObj">Delete</ui-button>
      -->
  </div>
</template>

<script>
import UiButton from 'keen-ui/lib/UiButton';
import RotateControl from './rotateControl.vue';

export default {
    props: ['mobiusMngr'],
    components: {
        UiButton,
        RotateControl
    },
    computed: {
        selectedObjName: function() {
            if (this.mobiusMngr.selectedTransformation === undefined) return '';
            return this.mobiusMngr.selectedTransformation.getClassName();
        }
    },
    methods: {
        updateSelection: function() {
            this.mobiusMngr.unselectAll();
            if (this.mobiusMngr.selectedTransformation === undefined) return;
            this.mobiusMngr.selectedTransformation.selected = true;
        }
    }
}
</script>

<style>
#sceneObjPanel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.objList {
    padding-left: 0;
    width: 200px;
    height: 100px;
}

#deleteButton {
    margin: 5px;
}
</style>
