import assert from 'power-assert'
import Complex from './complex';

export default class SL2C {
    constructor (a, b, c, d) {
        assert.ok(a instanceof Complex);
        assert.ok(b instanceof Complex);
        assert.ok(c instanceof Complex);
        assert.ok(d instanceof Complex);
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    mult (m) {
        assert.ok(m instanceof SL2C);
        return new SL2C(this.a.mult(m.a).add(this.b.mult(m.c)),
                        this.a.mult(m.b).add(this.b.mult(m.d)),
                        this.c.mult(m.a).add(this.d.mult(m.c)),
                        this.c.mult(m.b).add(this.d.mult(m.d)));
    }

    determinant () {
        return this.a.mult(this.d).sub(this.b.mult(this.c));
    }

    scale (k) {
        assert.ok(k instanceof Complex);
        return new SL2C(this.a.mult(k), this.b.mult(k),
                        this.c.mult(k), this.d.mult(k));
    }

    inverse () {
        return new SL2C(this.d, this.b.mult(Complex.MINUS_ONE),
                        this.c.mult(Complex.MINUS_ONE), this.a).scale(Complex.ONE.div(this.determinant()));
    }

    trace () {
        return this.a.add(this.d);
    }

    get hasNaN () {
        return this.a.hasNaN || this.b.hasNaN || this.c.hasNaN || this.d.hasNaN;
    }

    get linearArray () {
        return this.a.linearArray.concat(this.b.linearArray,
                                         this.c.linearArray,
                                         this.d.linearArray);
    }

    static get UNIT () {
        return new SL2C(Complex.ONE, Complex.ZERO,
                        Complex.ZERO, Complex.ONE);
    }
}
