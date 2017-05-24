import assert from 'power-assert';
import Complex from './complex.js';
import SL2C from './sl2c.js';
import Vec3 from './vec3.js';
import { PI, TWO_PI, PI_2 } from './radians.js';

// This code is based on spherical_image_editing by Henry Segerman
// http://elevr.com/spherical-video-editing-effects-with-mobius-transformations/
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
        this.p = CoordOnSphere(lng, lat);
        this.zoomFactor = new Complex(zoomReal, zoomImag)

        this.update();
    }

    update () {
        this.zoomFactor = new Complex(this.zoomReal, this.zoomImag);
        this.sl2c = Mobius.zoomIn(this.p, this.zoomFactor);
    }
}

export class MobiusRotateAroundAxis extends Mobius {
    constructor (lng, lat, theta) {
        super();
        assert.ok(typeof lng === 'number');
        assert.ok(typeof lat === 'number');
        assert.ok(typeof theta === 'number');

        this.sphereLng = lng;
        this.sphereLat = lat;
        this.p = CoordOnSphere(lng, lat);
        this.theta = theta;

        this.update();
    }

    update () {
        this.sl2c = Mobius.rotateAroundAxis(this.p, this.theta);
    }
}

export class MobiusTranslateAlongAxis extends Mobius {
    constructor (pLng, pLat, qLng, qLat,
                 r1Lng, r1Lat, r2Lng, r2Lat) {
        super();

        this.r2Lng = r2Lng;
        this.r2Lat = r2Lat;
        this.p = CoordOnSphere(pLng, pLat);
        this.q = CoordOnSphere(qLng, qLat);
        this.r1 = CoordOnSphere(r1Lng, r1Lat);
        this.r2 = CoordOnSphere(r2Lng, r2Lat);
        this.translationY = 0;
        this.update();
    }

    update () {
        this.r2 = CoordOnSphere(this.r2Lng, this.r2Lat + this.translationY);
        this.sl2c = Mobius.translateAlongAxis(this.p, this.q, this.r1, this.r2);
    }
}

export class MobiusManager {
    constructor () {
        this.sl2cMatrix = SL2C.UNIT;
        this.transformations = [];
    }

    addTransformation (transformation) {
        assert.ok(transformation instanceof Mobius);
        this.transformations.push(transformation);
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

    get sl2cMatrixArray () {
        return this.sl2cMatrix.inverse().linearArray;
    }
}
