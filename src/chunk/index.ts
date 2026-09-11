/**
 * Splits an array into smaller chunks of a specified size.
 *
 * @param array - The source array to split into chunks.
 * @param size - Positive integer specifying the length of each chunk.
 * @returns An array containing array chunks.
 * @throws {TypeError} If the first argument is not an array.
 * @throws {RangeError} If size is not an integer greater than or equal to 1.
 */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array to chunk');
  }

  if (typeof size !== 'number' || Number.isNaN(size) || size < 1 || !Number.isInteger(size)) {
    throw new RangeError('Chunk size must be an integer greater than or equal to 1');
  }

  const length = array.length;
  if (length === 0) {
    return [];
  }

  const result: T[][] = [];
  for (let i = 0; i < length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

export default chunk;
