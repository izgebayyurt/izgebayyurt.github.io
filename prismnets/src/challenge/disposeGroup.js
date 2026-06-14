// Remove a built-poly group from the scene and free its GPU resources.
export function disposeGroup(scene, group) {
  if (!group) return;
  scene.remove(group);
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}
