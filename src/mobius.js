import assert from 'power-assert';
import Complex from './complex.js';
import SL2C from './sl2c.js';
import Vec3 from './vec3.js';

const TWO_PI = Math.PI;
const PI_2 = Math.PI / 2;

// This code is based on spherical_image_editing by Henry Segerman
// http://elevr.com/spherical-video-editing-effects-with-mobius-transformations/
// See also http://elevr.com/spherical-video-editing-effects-with-mobius-transformations/

class CP1 {
    constructor (z, w) {
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
    return [l, Math.acos(dir.y)];
}

export function CoordOnSphere (theta, phi) {
    assert.ok(typeof theta === 'number');
    assert.ok(typeof phi === 'number');
    return new Vec3(Math.sin(phi) * Math.cos(theta),
                    Math.cos(phi),
                    Math.sin(phi) * Math.sin(theta));
}

// computes SL(2, C) that sends the three points infinity, zero, one to given points p, q, r
function InfZeroOneToTriple (p, q, r) {
    assert.ok(p instanceof CP1);
    assert.ok(q instanceof CP1);
    assert.ok(r instanceof CP1);

    const m = new SL2C(p.z, p.w, q.z, q.w);
    assert.ok(!m.hasNaN);
    const mInv = m.inverse();
    assert.ok(!mInv.hasNaN);
    const v = r.applySL2C(mInv);
    return new SL2C(v.z.mult(p.z), v.w.mult(q.z),
                    v.z.mult(p.w), v.w.mult(q.w));
}

// computes SL(2, C) thet sends three points a1, b1, c1 to a2, b2, c2
function TwoTriplesToSL (a1, b1, c1, a2, b2, c2) {
    assert.ok(a1 instanceof CP1);
    assert.ok(b1 instanceof CP1);
    assert.ok(c1 instanceof CP1);
    assert.ok(a2 instanceof CP1);
    assert.ok(b2 instanceof CP1);
    assert.ok(c2 instanceof CP1);

    return InfZeroOneToTriple(a2, b2, c2).mult(InfZeroOneToTriple(a1, b1, c1).inverse());
}

// p and q are points on sphere
// computes vector that a normalized vector perpendicular to p and q
function ComputeVectorPerpToPQ (p, q) {
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

// p and q are points on sphere
// computes SL(2, C) rotating by angle theta around the axis from p and q
function RotateAroundAxisSpherePointsPQ (p, q, theta) {
    assert.ok(p instanceof Vec3);
    assert.ok(q instanceof Vec3);
    assert.ok(typeof theta === 'number');

    assert.ok(Vec3.dot(p, q) < 0.9999, 'Axis points should not be in the same place.');

    const CP1p = CP1.MakeFromSphere(p);
    const CP1q = CP1.MakeFromSphere(q);
    const r = ComputeVectorPerpToPQ(p, q);
    const CP1r = CP1.MakeFromSphere(r);

    const standardM = TwoTriplesToSL(CP1p, CP1q, CP1r,
                                     CP1.ZERO_ONE, CP1.ONE_ZERO, CP1.ONE_ONE);
    assert.ok(!standardM.hasNaN);
    // rotate on axis through 0, infty by theta
    const thetaM = new SL2C(new Complex(Math.cos(theta), Math.sin(theta)), Complex.ZERO,
                            Complex.ZERO, Complex.ONE);
    return standardM.inverse().mult(thetaM).mult(standardM);
}

// computes SL(2, C) rotating by angle theta around the axis from p to its antipode
export function RotateAroundAxis (p, theta) {
    assert.ok(p instanceof Vec3);
    assert.ok(typeof theta === 'number');
    return RotateAroundAxisSpherePointsPQ(p, p.scale(-1), theta);
}

export class MobiusManager {
    constructor () {
        this.sl2cMatrix = SL2C.UNIT;

        this.sl2cMatrix = RotateAroundAxis(CoordOnSphere(Math.PI, PI_2), PI_2);
    }

    get sl2cMatrixArray () {
        return this.sl2cMatrix.linearArray;
    }
}
