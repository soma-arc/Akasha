<template>
<div>
  <b-field label="Transformations">
    <b-select id="transformSelection"
              native-size="4" @input="updateSelection"
              v-model="mobiusMngr.selectedTransformation"
              expanded
              class="objList">
      <option v-for="mobius in mobiusMngr.transformations"
              :value="mobius" key="obj.id">
        {{ mobius.getName() }}
      </option>
    </b-select>
  </b-field>
  <br><br>
  <b-field>
    <b-button @click="deleteSelectedMobius">Delete</b-button>
  </b-field>
  <b-field label="Add Transformations">
    <b-select placeholder="Select a transformation"
              v-model="selectedVariation">
      <option
        v-for="option in variations"
        :value="option"
        :key="option.id">
        {{ option.name }}
      </option>
    </b-select>
    <b-button @click="addMobius">Add</b-button>
  </b-field>
  <b-field>
    <rotate-control v-show="selectedObjName === 'MobiusRotateAroundAxis'"
                    :rotate="mobiusMngr.selectedTransformation"
                    :mobiusMngr="mobiusMngr" />
    <translate-control v-show="selectedObjName === 'MobiusTranslateAlongAxis'"
                  :translate="mobiusMngr.selectedTransformation"
                  :mobiusMngr="mobiusMngr"/>
    <zoom-control v-show="selectedObjName === 'MobiusZoomIn'"
                  :zoom="mobiusMngr.selectedTransformation"
                  :mobiusMngr="mobiusMngr"/>
  </b-field>
</div>
</template>

<script>
import RotateControl from './rotateControl.vue';
import TranslateControl from './translateControl.vue';
import ZoomControl from './zoomControl.vue';
import { MobiusRotateAroundAxis,
         MobiusTranslateAlongAxis, MobiusZoomIn } from '../mobius.js'
import { PI, PI_2 } from '../radians.js';
export default {
    props: ['mobiusMngr', 'canvasMngr'],
    data: function () {
        return {
            selectedVariation: undefined,
            variations: [{ id: 0, name: 'Rotation' },
                         { id: 1, name: 'Translation' },
                         { id: 2, name: 'Zoom' }],
            mobiusIndex: 3,
        }
    },
    components: {
        RotateControl, TranslateControl, ZoomControl
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
        },
        deleteSelectedMobius: function() {
            if (this.mobiusMngr.transformations.length === 0 ||
                this.mobiusMngr.selectedTransformation === undefined) return;
            this.mobiusMngr.transformations.splice(
                this.mobiusMngr.selectedTransformation.index - this.mobiusMngr.numDeleted, 1);
            this.mobiusMngr.selectedTransformation = undefined;
            this.mobiusMngr.numDeleted++;

            this.mobiusMngr.update2();
            this.canvasMngr.reCompileShaders();
        },
        addMobius: function() {
            let m;
            if (this.selectedVariation.name === 'Rotation') {
                m = new MobiusRotateAroundAxis(PI_2, PI_2, 0);
            } else if (this.selectedVariation.name === 'Translation') {
                m = new MobiusTranslateAlongAxis(PI, 0,
                                                 PI, PI,
                                                 PI, PI_2,
                                                 PI, PI_2);
            } else if (this.selectedVariation.name === 'Zoom') {
                m = new MobiusZoomIn(PI, PI_2, 1, 0);
            }
            m.index = this.mobiusMngr.mobiusIndex;
            this.mobiusMngr.mobiusIndex++;

            this.mobiusMngr.addTransformation(m);
            this.canvasMngr.reCompileShaders();
        }
    }
}
</script>

<style>
#transformSelection {
    height:150px;
    width: 100%;
}
</style>
