// Unit cube, edge length 1 (vertices at ±0.5). Face 0 is the base (bottom), so the
// net lays out on the y = -0.5 plane with adjacent face centroids exactly 1 apart —
// which is what NetEnumeration's integer rounding expects.
//
// Every face is wound consistently counter-clockwise as seen from OUTSIDE the cube,
// so unfold directions come out uniform (see PolyhedronBuilder.OutwardNormal).
export const CUBE = {
  name: 'cube',
  vertices: [
    [-0.5, -0.5, -0.5], // 0
    [ 0.5, -0.5, -0.5], // 1
    [ 0.5, -0.5,  0.5], // 2
    [-0.5, -0.5,  0.5], // 3
    [-0.5,  0.5, -0.5], // 4
    [ 0.5,  0.5, -0.5], // 5
    [ 0.5,  0.5,  0.5], // 6
    [-0.5,  0.5,  0.5], // 7
  ],
  faces: [
    [0, 1, 2, 3], // 0 bottom  (base, normal -y)
    [7, 6, 5, 4], // 1 top     (normal +y)
    [0, 4, 5, 1], // 2 front   (normal -z)
    [3, 2, 6, 7], // 3 back    (normal +z)
    [0, 3, 7, 4], // 4 left    (normal -x)
    [1, 5, 6, 2], // 5 right   (normal +x)
  ],
};
