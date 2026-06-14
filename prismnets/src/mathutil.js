import * as THREE from 'three';

export function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

// Scratch objects reused across calls (single-threaded, no reentrancy concerns).
const _q = new THREE.Quaternion();
const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _worldScale = new THREE.Vector3();
const _parentMat = new THREE.Matrix4();
const _parentQuat = new THREE.Quaternion();
const _axis = new THREE.Vector3();

/**
 * Faithful port of Unity's Transform.RotateAround(point, axis, angleDeg):
 * rotate `obj` about a WORLD-space axis passing through a WORLD-space point,
 * preserving the object's children (they ride along, since we move the node itself).
 *
 * Three.js Object3D has rotateOnWorldAxis (orientation only, about its own origin)
 * but nothing that also orbits the position about an arbitrary pivot — so we do the
 * full world-space transform and convert back into the parent's local space.
 *
 * @param {THREE.Object3D} obj
 * @param {THREE.Vector3} pointWorld  pivot in world space
 * @param {THREE.Vector3} axisWorld   rotation axis in world space (need not be unit)
 * @param {number} angleDeg           degrees (right-hand rule about axis)
 */
export function rotateAroundWorldAxis(obj, pointWorld, axisWorld, angleDeg) {
  _axis.copy(axisWorld).normalize();
  _q.setFromAxisAngle(_axis, THREE.MathUtils.degToRad(angleDeg));

  obj.updateWorldMatrix(true, false);
  obj.matrixWorld.decompose(_worldPos, _worldQuat, _worldScale);

  // New world position: rotate (pos - pivot) about the axis, then re-add pivot.
  _worldPos.sub(pointWorld).applyQuaternion(_q).add(pointWorld);
  // New world orientation: pre-multiply by the rotation.
  _worldQuat.premultiply(_q);

  // Convert the new world transform back into local space under obj.parent.
  const parent = obj.parent;
  if (parent) {
    parent.updateWorldMatrix(true, false);
    _parentMat.copy(parent.matrixWorld).invert();
    // Local position = parentWorld^-1 * worldPos
    obj.position.copy(_worldPos).applyMatrix4(_parentMat);
    // Local rotation = parentWorldQuat^-1 * worldQuat
    parent.getWorldQuaternion(_parentQuat).invert();
    obj.quaternion.copy(_parentQuat).multiply(_worldQuat);
  } else {
    obj.position.copy(_worldPos);
    obj.quaternion.copy(_worldQuat);
  }
  obj.updateMatrixWorld(true);
}
