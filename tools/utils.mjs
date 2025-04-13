export function isEmpty(object) {
  if (Array.isArray(object)) {
    return object.length === 0;
  } else if (object instanceof Object) {
    return Object.keys(object).length === 0;
  } else if (object === undefined || object === null) {
    return true;
  }
  return false;
}
