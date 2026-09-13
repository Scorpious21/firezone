export const MAPS = [
  { id: 'arena', name: 'Arena', size: 55, desc: 'Balanced combat arena' }
];
export const DEFAULT_MAP = 'arena';
export async function loadMapModule(id){
  const mod = await import('./' + id + '.js');
  return mod.default;
}