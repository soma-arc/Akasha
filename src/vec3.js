import assert from 'power-assert'

export default class Vec3 {
    constructor (x, y, z) {
        assert.ok(typeof x === 'number');
        assert.ok(typeof y === 'number');
        assert.ok(typeof z === 'number');

        this.x = x;
        this.y = y;
        this.z = z;
    }

    add (v) {
        assert.ok(v instanceof Vec3);
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub (v) {
        assert.ok(v instanceof Vec3);
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mult (v) {
        assert.ok(v instanceof Vec3);
        return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    div (v) {
        assert.ok(v instanceof Vec3);
        return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }

    scale (k) {
        assert.ok(typeof k === 'number');
        return new Vec3(this.x * k, this.y * k, this.z * k);
    }

    length () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize () {
        const l = 1.0 / this.length();
        return new Vec3(this.x * l, this.y * l, this.z * l);
    }

    static dot (a, b) {
        assert.ok(a instanceof Vec3);
        assert.ok(b instanceof Vec3);
        return a.x * b.x + b.y * b.y + a.z * b.z;
    }

    static cross (a, b) {
        assert.ok(a instanceof Vec3);
        assert.ok(b instanceof Vec3);
        return new Vec3(a.y * b.z - a.z * b.y,
                        a.z * b.x - a.x * b.z,
                        a.x * b.y - a.y * b.x);
    }
}
