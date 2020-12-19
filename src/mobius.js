import assert from 'power-assert';
import Complex from './complex.js';
import SL2C from './sl2c.js';
import Vec3 from './vec3.js';
import { PI, TWO_PI, PI_2 } from './radians.js';

// This code is based on spherical_image_editing by Henry Segerman
// https://github.com/henryseg/spherical_image_editing
// See also http://elevr.com/spherical-video-editing-effects-with-mobius-transformations/

class CP1 {
    constructor (z, w) {
        assert.ok(z instanceof Complex);
        assert.ok(w instanceof Complex);
        this.z = z;
        this.w = w;
    }

    applySL2C (m) {
        assert.ok(m instanceof SL2C);
        return new CP1(m.a.mult(this.z).add(m.b.mult(this.w)),
                       m.c.mult(this.z).add(m.d.mult(this.w)));
    }

    spherePosFromCP1 () {
        if (this.w.length() > this.z.length()) {
            const c = this.z1.div(this.z2);
            const denom = 1 + c.lengthSq();
            return new Vec3(2 * c.re / denom,
                            (denom - 2) / denom,
                            2 * c.im / denom);
        } else {
            const c = this.z1.div(this.z2).conjugate();
            const denom = 1 + c.lengthSq();
            return new Vec3(2 * c.re / denom,
                            (2 - denom) / denom,
                            2 * c.im / denom);
        }
    }

    static MakeFromSphere(pos) {
        assert.ok(pos instanceof Vec3);
        if (pos.y < 0) {
            return new CP1(new Complex(pos.x, pos.z),
                           new Complex(1 - pos.y, 0));
        } else {
            return new CP1(new Complex(1 + pos.y, 0),
                           new Complex(pos.x, -pos.z));
        }
    }

    static get ZERO_ONE () {
        return new CP1(Complex.ZERO, Complex.ONE);
    }

    static get ONE_ZERO () {
        return new CP1(Complex.ONE, Complex.ZERO);
    }

    static get ONE_ONE () {
        return new CP1(Complex.ONE, Complex.ONE);
    }
}

export function EquirectangularCoord (dir) {
    assert.ok(dir instanceof Vec3);
    let l = Math.atan(dir.z, dir.x);
    if (l < 0) l += TWO_PI;
    return [l, Math.abs(Math.acos(dir.y) - PI)];
}

export function CoordOnSphere (theta, phi) {
    assert.ok(typeof theta === 'number');
    assert.ok(typeof phi === 'number');
    return new Vec3(Math.sin(phi) * Math.cos(theta),
                    Math.cos(phi + PI),
                    Math.sin(phi) * Math.sin(theta));
}

class Mobius {
    constructor () {
        this.sl2c = SL2C.UNIT;
    }

    select (lnglat) {
        return new SelectionState();
    }

    move (lnglat) {}

    // computes SL(2, C) that sends the three points infinity, zero, one to given points p, q, r
    static infZeroOneToTriple (p, q, r) {
        assert.ok(p instanceof CP1);
        assert.ok(q instanceof CP1);
        assert.ok(r instanceof CP1);

        const m = new SL2C(p.z, q.z,
                           p.w, q.w);
        assert.ok(!m.hasNaN);
        const mInv = m.inverse();
        assert.ok(!mInv.hasNaN);
        const v = r.applySL2C(mInv);
        return new SL2C(v.z.mult(p.z), v.w.mult(q.z),
                        v.z.mult(p.w), v.w.mult(q.w));
    }

    // computes SL(2, C) thet sends three points a1, b1, c1 to a2, b2, c2
    static twoTriplesToSL (a1, b1, c1, a2, b2, c2) {
        assert.ok(a1 instanceof CP1);
        assert.ok(b1 instanceof CP1);
        assert.ok(c1 instanceof CP1);
        assert.ok(a2 instanceof CP1);
        assert.ok(b2 instanceof CP1);
        assert.ok(c2 instanceof CP1);

        return this.infZeroOneToTriple(a2, b2, c2).mult(this.infZeroOneToTriple(a1, b1, c1).inverse());
    }

    // p and q are points on sphere
    // computes vector that a normalized vector perpendicular to p and q
    static computeVectorPerpToPQ (p, q) {
        assert.ok(p instanceof Vec3);
        assert.ok(q instanceof Vec3);

        if (Math.abs(Vec3.dot(p, q) + 1) < 0.0001) {
            if (Math.abs(Vec3.dot(p, new Vec3(1, 0, 0))) > 0.99999) {
                return new Vec3(0, 1, 0);
            } else {
                return Vec3.cross(p, new Vec3(1, 0, 0)).normalize();
            }
        } else {
            return Vec3.cross(p, q).normalize();
        }
    }

    // p and q are points on the sphere
    // compute SL(2, C) rotating image of p to image of q on CP1
    static rotateSpherePointsPQ (p, q) {
        assert.ok(p instanceof Vec3);
        assert.ok(q instanceof Vec3);

        if (Math.abs(Vec3.dot(p, q) - 1) < 0.0001) {
            return SL2C.UNIT;
        } else {
            const CP1p = CP1.MakeFromSphere(p);
            const CP1q = CP1.MakeFromSphere(q);

            const r = this.computeVectorPerpToPQ(p, q);
            const CP1r = CP1.MakeFromSphere(r);
            const CP1mr = CP1.MakeFromSphere(r.scale(-1));
            return this.twoTriplesToSL(CP1p, CP1r, CP1mr, CP1q, CP1r, CP1mr);
        }
    }

    // p is the point on the sphere
    // compute SL(2, C) zooming in on p by a factor of scale
    static zoomIn (p, zoomFactor) {
        assert.ok(p instanceof Vec3);
        assert.ok(zoomFactor instanceof Complex);

        const rot = this.rotateSpherePointsPQ(p, CoordOnSphere(0, 0));
        const scl = new SL2C(zoomFactor, Complex.ZERO,
                             Complex.ZERO, Complex.ONE);
        return rot.inverse().mult(scl).mult(rot);
    }

    // p and q are points on sphere
    // compute SL(2,C) zooming along axis from p to q
    static zoomAlongAxisSpherePointsPQ (p, q, zoomFactor) {
        assert.ok(p instanceof Vec3);
        assert.ok(q instanceof Vec3);
        assert.ok(zoomFactor instanceof Complex);

        const CP1p = CP1.MakeFromSphere(p);
        const CP1q = CP1.MakeFromSphere(q);
        assert.ok(Vec3.dot(p, q) < 0.9999, 'points should not be in the same plane');

        const r = this.computeVectorPerpToPQ(p, q);
        const CP1r = CP1.MakeFromSphere(r);
        const standardM = this.twoTriplesToSL(CP1p, CP1q, CP1r,
                                              CP1.ZERO_ONE, CP1.ONE_ZERO, CP1.ONE_ONE);
        const thetaM = new SL2C(zoomFactor, Complex.ZERO,
                                Complex.ZERO, Complex.ONE);
        return standardM.inverse().mult(thetaM).mult(standardM);
    }

    // p and q are points on sphere
    // computes SL(2, C) rotating by angle theta around the axis from p and q
    static rotateAroundAxisSpherePointsPQ (p, q, theta) {
        assert.ok(p instanceof Vec3);
        assert.ok(q instanceof Vec3);
        assert.ok(typeof theta === 'number');

        assert.ok(Vec3.dot(p, q) < 0.9999, 'Axis points should not be in the same place.');

        const CP1p = CP1.MakeFromSphere(p);
        const CP1q = CP1.MakeFromSphere(q);
        const r = this.computeVectorPerpToPQ(p, q);
        const CP1r = CP1.MakeFromSphere(r);

        const standardM = this.twoTriplesToSL(CP1p, CP1q, CP1r,
                                         CP1.ZERO_ONE, CP1.ONE_ZERO, CP1.ONE_ONE);
        assert.ok(!standardM.hasNaN);
        // rotate on axis through 0, infty by theta
        const thetaM = new SL2C(new Complex(Math.cos(theta), Math.sin(theta)), Complex.ZERO,
                                Complex.ZERO, Complex.ONE);
        return standardM.inverse().mult(thetaM).mult(standardM);
    }

    // p1, q1, r1, p2, q2, r2 are points on the sphere
    // compute SL(2,C) that sends the three points p1,q1,r1 to p2,q2,r2
    static threePointsToThreePoints (p1, q1, r1, p2, q2, r2) {
        assert.ok(p1 instanceof Vec3);
        assert.ok(q1 instanceof Vec3);
        assert.ok(r1 instanceof Vec3);
        assert.ok(p2 instanceof Vec3);
        assert.ok(q2 instanceof Vec3);
        assert.ok(r2 instanceof Vec3);
        return this.twoTriplesToSL(CP1.MakeFromSphere(p1),
                                   CP1.MakeFromSphere(q1),
                                   CP1.MakeFromSphere(r1),
                                   CP1.MakeFromSphere(p2),
                                   CP1.MakeFromSphere(q2),
                                   CP1.MakeFromSphere(r2));
    }

    // computes SL(2, C) rotating by angle theta around the axis from p to its antipode
    static rotateAroundAxis (p, theta) {
        assert.ok(p instanceof Vec3);
        assert.ok(typeof theta === 'number');
        return this.rotateAroundAxisSpherePointsPQ(p, p.scale(-1), theta);
    }

    // p, q, r1, r2 are points on the sphere
    // compute SL(2,C) translating/rotating on the axis from p to q
    static translateAlongAxis (p, q, r1, r2) {
        return this.threePointsToThreePoints(p, q, r1, p, q, r2);
    }
}

export class MobiusZoomIn extends Mobius {
    constructor (lng, lat, zoomReal, zoomImag) {
        super();
        this.zoomReal = zoomReal;
        this.zoomImag = zoomImag;
        this.lng = lng;
        this.lat = lat;

        this.update();

        this.uniformObjIndex = 0;
        this.selected = false;
    }

    setUniformLocation(gl, uniLocations, program, index) {
        uniLocations.push(gl.getUniformLocation(program,
                                                `u_mobiusZoomIn${index}`));
        uniLocations.push(gl.getUniformLocation(program,
                                                `u_mobiusZoomInVisible${index}`));
    }

    setUniformValues(gl, uniLocation, uniIndex) {
        let uniI = uniIndex;
        gl.uniform4f(uniLocation[uniI++],
                     this.lng, this.lat, this.zoomReal, this.zoomImag);
        gl.uniform1i(uniLocation[uniI++],
                     this.selected);
        return uniI;
    }

    update () {
        this.p = CoordOnSphere(this.lng, this.lat);
        this.zoomFactor = new Complex(this.zoomReal, this.zoomImag);
        this.sl2c = Mobius.zoomIn(this.p, this.zoomFactor);
    }

    getClassName () {
        return 'MobiusZoomIn';
    }

    select (lnglat) {
        const d = new Complex(this.lng, this.lat);
        const dp = lnglat.sub(d);
        const dzf = lnglat.sub(d.add(new Complex(this.zoomReal, this.zoomImag)));
        if (dp.length() < 0.1) {
            return new SelectionState().setObj(this)
                .setComponentId(this.POINT_ZOOM).setDiffObj(dp);
        } else if (dzf.length() < 0.1) {
            return new SelectionState().setObj(this)
                .setComponentId(this.POINT_ZOOM_FACTOR).setDiffObj(dzf);
        }

        return new SelectionState();
    }

    /**
     *
     * @param {SelectionState} selectionState
     * @param {Complex} lnglat
     */
    move (selectionState, lnglat) {
        const nlnglat = lnglat.sub(selectionState.diffObj);
        switch (selectionState.componentId) {
        case this.POINT_ZOOM: {
            this.lng = nlnglat.re;
            this.lat = nlnglat.im;
            break;
        }
        case this.POINT_ZOOM_FACTOR: {
            const nFact = nlnglat.sub(new Complex(this.lng, this.lat));
            this.zoomReal = nFact.re;
            this.zoomImag = nFact.im;
            break;
        }
        }
        this.update();
    }

    get POINT_ZOOM () {
        return 0;
    }

    get POINT_ZOOM_FACTOR () {
        return 1;
    }
}

export class MobiusRotateAroundAxis extends Mobius {
    constructor (lng, lat, theta) {
        super();

        this.lng = lng;
        this.lat = lat;
        this.theta = theta;

        this.update();
        this.uniformObjIndex = 0;
        this.selected = false;
    }

    setUniformLocation(gl, uniLocations, program, index) {
        uniLocations.push(gl.getUniformLocation(program,
                                                `u_mobiusRotateAroundAxis${index}`));
        uniLocations.push(gl.getUniformLocation(program,
                                                `u_mobiusRotateAroundAxisVisible${index}`));
    }

    setUniformValues(gl, uniLocation, uniIndex) {
        let uniI = uniIndex;
        gl.uniform2f(uniLocation[uniI++], this.lng, this.lat);
        gl.uniform1i(uniLocation[uniI++], this.selected);
        return uniI;
    }

    update () {
        this.p = CoordOnSphere(this.lng, this.lat);
        this.sl2c = Mobius.rotateAroundAxis(this.p, this.theta);
    }

    // avoid name conflict for vue
    update2 () {
        this.p = CoordOnSphere(this.lng, this.lat);
        this.sl2c = Mobius.rotateAroundAxis(this.p, this.theta);
    }

    getClassName () {
        return 'MobiusRotateAroundAxis';
    }

    select (lnglat) {
        const dp = lnglat.sub(new Complex(this.lng, this.lat));
        const d = dp.length();
        if (d > 0.1) return new SelectionState();

        return new SelectionState().setObj(this).setDiffObj(dp);
    }

    /**
     *
     * @param {SelectionState} selectionState
     * @param {Complex} lnglat
     */
    move (selectionState, lnglat) {
        const nlnglat = lnglat.sub(selectionState.diffObj);
        this.lng = nlnglat.re;
        this.lat = nlnglat.im;
        this.update();
    }
}

export class MobiusTranslateAlongAxis extends Mobius {
    constructor (pLng, pLat, qLng, qLat,
                 r1Lng, r1Lat, r2Lng, r2Lat) {
        super();

        this.pLngLat = new Complex(pLng, pLat);
        this.qLngLat = new Complex(qLng, qLat);
        this.r1LngLat = new Complex(r1Lng, r1Lat);
        this.r2LngLat = new Complex(r2Lng, r2Lat);
        this.translationY = 0;
        this.update();

        this.selected = false;
    }

    select (lnglat) {
        const dp = lnglat.sub(this.pLngLat);
        const dq = lnglat.sub(this.qLngLat);
        const dr1 = lnglat.sub(this.r1LngLat);
        const dr2 = lnglat.sub(this.r2LngLat);
        if (dp.length() < 0.1) {
            return new SelectionState().setObj(this)
                .setComponentId(this.POINT_P).setDiffObj(dp);
        } else if (dq.length() < 0.1) {
            return new SelectionState().setObj(this)
                .setComponentId(this.POINT_Q).setDiffObj(dq);
        } else if (dr1.length() < 0.1) {
            return new SelectionState().setObj(this)
                .setComponentId(this.POINT_R1).setDiffObj(dr1);
        } else if (dr2.length() < 0.1) {
            return new SelectionState().setObj(this)
                .setComponentId(this.POINT_R2).setDiffObj(dr2);
        }

        return new SelectionState();
    }

    move (selectionState, lnglat) {
        const nlnglat = lnglat.sub(selectionState.diffObj);
        switch (selectionState.componentId) {
        case this.POINT_P: {
            this.pLngLat = nlnglat;
            break;
        }
        case this.POINT_Q: {
            this.qLngLat = nlnglat;
            break;
        }
        case this.POINT_R1: {
            this.r1LngLat = nlnglat;
            break;
        }
        case this.POINT_R2: {
            this.r2LngLat = nlnglat;
            break;
        }
        }
        this.update();
    }

    setUniformLocation(gl, uniLocations, program, index) {
        uniLocations.push(gl.getUniformLocation(program,
                                                `u_mobiusTranslateAlongAxis${index}`));
        uniLocations.push(gl.getUniformLocation(program,
                                                `u_mobiusTranslateAlongAxisVisible${index}`));
    }

    setUniformValues(gl, uniLocation, uniIndex) {
        let uniI = uniIndex;
        gl.uniform2fv(uniLocation[uniI++],
                      [this.pLngLat.re, this.pLngLat.im,
                       this.qLngLat.re, this.qLngLat.im,
                       this.r1LngLat.re, this.r1LngLat.im,
                       this.r2LngLat.re, this.r2LngLat.im]);
        gl.uniform1i(uniLocation[uniI++],
                     this.selected);
        return uniI;
    }

    update () {
        this.p = CoordOnSphere(this.pLngLat.re, this.pLngLat.im);
        this.q = CoordOnSphere(this.qLngLat.re, this.qLngLat.im);
        this.r1 = CoordOnSphere(this.r1LngLat.re, this.r1LngLat.im);
        this.r2 = CoordOnSphere(this.r2LngLat.re, this.r2LngLat.im);
//        this.r2 = CoordOnSphere(this.r2LngLat.re, this.r2LngLat.im + this.translationY);
        this.sl2c = Mobius.translateAlongAxis(this.p, this.q, this.r1, this.r2);
    }

    getClassName () {
        return 'MobiusTranslateAlongAxis';
    }

    get POINT_P () {
        return 0;
    }

    get POINT_Q () {
        return 1;
    }

    get POINT_R1 () {
        return 2;
    }

    get POINT_R2 () {
        return 3;
    }
}

class SelectionState {
    constructor () {
        this.selectedObj = undefined;
        this.componentId = -1;
        // difference between mouse and the object
        // (e.g. center of the circle)
        this.diffObj = -1;
    }

    /**
     *
     * @param {Mobius} obj
     * @returns {SelectionState}
     */
    setObj (obj) {
        this.selectedObj = obj;
        return this;
    }

    /**
     *
     * @param {number} componentId
     * @returns {SelectionState}
     */
    setComponentId (componentId) {
        this.componentId = componentId;
        return this;
    }

    /**
     * @param {Complex} diffObj
     * @returns {SelectionState}
     */
    setDiffObj (diffObj) {
        this.diffObj = diffObj;
        return this;
    }

    /**
     *
     * @returns {boolean}
     */
    isSelectingObj () {
        return this.selectedObj !== undefined;
    }
}

export class MobiusManager {
    constructor () {
        this.sl2cMatrix = SL2C.UNIT;
        this.transformations = [];
        this.selectionState = new SelectionState();
        this.selectedTransformation = undefined;
    }

    unselectAll() {
        for (const mobius of this.transformations) {
            mobius.selected = false;
        }
    }

    /**
     *
     * @param {Complex} lnglat
     * @return {boolean}
     */
    select (lnglat) {
        for (const mobius of this.transformations) {
            if (mobius.selected === false) continue;
            const state = mobius.select(lnglat);
            if (state.isSelectingObj()) {
                this.selectionState = state;
                return true;
            }
        }
        this.selectionState = new SelectionState();
        return false;
    }

    /**
     *
     * @param {Complex} lnglat
     * @returns {boolean}
     */
    move (lnglat) {
        if (this.selectionState.isSelectingObj()) {
            this.selectionState.selectedObj.move(this.selectionState, lnglat);
            this.update();
            return true;
        }
        return false;
    }

    addTransformation (transformation) {
        assert.ok(transformation instanceof Mobius);
        this.transformations.push(transformation);
        this.update();
    }

    update () {
        if (this.transformations.length === 0) {
            this.sl2cMatrix = SL2C.UNIT;
        } else if (this.transformations.length === 1) {
            this.sl2cMatrix = this.transformations[0].sl2c;
        } else {
            this.sl2cMatrix = this.transformations.map((t) => {
                return t.sl2c;
            }).reduce((prev, curr) => {
                return prev.mult(curr);
            });
        }
    }

    update2 () {
        if (this.transformations.length === 0) {
            this.sl2cMatrix = SL2C.UNIT;
        } else if (this.transformations.length === 1) {
            this.sl2cMatrix = this.transformations[0].sl2c;
        } else {
            this.sl2cMatrix = this.transformations.map((t) => {
                return t.sl2c;
            }).reduce((prev, curr) => {
                return prev.mult(curr);
            });
        }
    }

    setUniformLocations (gl, uniLocations, program) {
        const genNums = {};
        for (const gen of this.transformations) {
            const genName = gen.getClassName();
            if (genNums[genName] === undefined) {
                genNums[genName] = 0;
            }
            gen.setUniformLocation(gl, uniLocations, program, genNums[genName]);
            genNums[genName]++;
        }
    }

    setUniformValues (gl, uniLocations, index) {
        let uniI = index;
        for (const gen of this.transformations) {
            uniI = gen.setUniformValues(gl, uniLocations, uniI);
        }
        return uniI;
    }

    getSceneContext () {
        const context = {};
        for (const gen of this.transformations) {
            const genName = `num${gen.getClassName()}`;
            if (context[genName] === undefined) {
                context[genName] = 0;
            }
            context[genName]++;
        }
        return context;
    }

    get sl2cMatrixArray () {
        return this.sl2cMatrix.inverse().linearArray;
    }
}
