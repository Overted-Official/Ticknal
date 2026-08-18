/**
 * Squarified Treemap Layout Algorithm (Bruls, Huizing, van Wijk)
 * Zero external dependencies. Computes rectangular coordinates for hierarchical sector & stock treemaps.
 */

export interface TreemapNode<T = any> {
  id: string;
  name: string;
  value: number; // Sizing metric (e.g. turnover or volume)
  data: T;
  children?: TreemapNode<any>[];
}

export interface TreemapRect<T = any> {
  id: string;
  name: string;
  value: number;
  data: T;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: TreemapRect<any>[];
}

interface ContainerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes worst aspect ratio of a row of items when laid out in a given length.
 */
function worst(row: number[], length: number): number {
  if (row.length === 0) return Infinity;
  const sum = row.reduce((a, b) => a + b, 0);
  if (sum === 0 || length === 0) return Infinity;

  const max = Math.max(...row);
  const min = Math.min(...row);

  const lengthSq = length * length;
  const sumSq = sum * sum;

  return Math.max(
    (lengthSq * max) / sumSq,
    sumSq / (lengthSq * min)
  );
}

/**
 * Layouts a row of items along the shortest side of the remaining container.
 */
function layoutRow(
  rowNodes: TreemapNode[],
  rowValues: number[],
  container: ContainerBox,
  totalArea: number,
  scale: number
): { rects: TreemapRect[]; remainingContainer: ContainerBox } {
  const isHorizontal = container.width >= container.height;
  const shortSide = isHorizontal ? container.height : container.width;

  const rowSum = rowValues.reduce((a, b) => a + b, 0);
  const rowArea = rowSum * scale;
  const rowThickness = shortSide === 0 ? 0 : rowArea / shortSide;

  const rects: TreemapRect[] = [];
  let currentOffset = 0;

  for (let i = 0; i < rowNodes.length; i++) {
    const node = rowNodes[i];
    const itemValue = rowValues[i];
    const itemArea = itemValue * scale;
    const itemLength = rowThickness === 0 ? 0 : itemArea / rowThickness;

    if (isHorizontal) {
      rects.push({
        id: node.id,
        name: node.name,
        value: node.value,
        data: node.data,
        x: container.x,
        y: container.y + currentOffset,
        width: Math.max(rowThickness, 0),
        height: Math.max(itemLength, 0),
      });
    } else {
      rects.push({
        id: node.id,
        name: node.name,
        value: node.value,
        data: node.data,
        x: container.x + currentOffset,
        y: container.y,
        width: Math.max(itemLength, 0),
        height: Math.max(rowThickness, 0),
      });
    }

    currentOffset += itemLength;
  }

  // Update remaining container
  let remainingContainer: ContainerBox;
  if (isHorizontal) {
    remainingContainer = {
      x: container.x + rowThickness,
      y: container.y,
      width: Math.max(container.width - rowThickness, 0),
      height: container.height,
    };
  } else {
    remainingContainer = {
      x: container.x,
      y: container.y + rowThickness,
      width: container.width,
      height: Math.max(container.height - rowThickness, 0),
    };
  }

  return { rects, remainingContainer };
}

/**
 * Recursively squarifies a list of nodes within a bounding box.
 */
function squarify(
  children: TreemapNode[],
  container: ContainerBox,
  totalValue: number
): TreemapRect[] {
  if (children.length === 0 || container.width <= 0 || container.height <= 0) {
    return [];
  }

  // Filter and sort items descending
  const sorted = children
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  if (sorted.length === 0) return [];

  const totalArea = container.width * container.height;
  const effectiveTotalValue = sorted.reduce((sum, c) => sum + c.value, 0);
  if (effectiveTotalValue === 0) return [];

  const scale = totalArea / effectiveTotalValue;

  const result: TreemapRect[] = [];
  let currentRowNodes: TreemapNode[] = [];
  let currentRowValues: number[] = [];
  let currentContainer = { ...container };

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i];
    const shortSide = Math.min(currentContainer.width, currentContainer.height);

    const testValues = [...currentRowValues, node.value];
    const currentWorst = worst(currentRowValues.map((v) => v * scale), shortSide);
    const newWorst = worst(testValues.map((v) => v * scale), shortSide);

    if (currentRowNodes.length === 0 || newWorst <= currentWorst) {
      currentRowNodes.push(node);
      currentRowValues.push(node.value);
    } else {
      // Row is complete, layout current row
      const { rects, remainingContainer } = layoutRow(
        currentRowNodes,
        currentRowValues,
        currentContainer,
        totalArea,
        scale
      );
      result.push(...rects);
      currentContainer = remainingContainer;

      // Start new row with current node
      currentRowNodes = [node];
      currentRowValues = [node.value];
    }
  }

  // Layout final remaining row
  if (currentRowNodes.length > 0) {
    const { rects } = layoutRow(
      currentRowNodes,
      currentRowValues,
      currentContainer,
      totalArea,
      scale
    );
    result.push(...rects);
  }

  // If node has children, squarify nested children inside this node's rectangle
  for (const rect of result) {
    const originalNode = sorted.find((s) => s.id === rect.id);
    if (originalNode && originalNode.children && originalNode.children.length > 0) {
      const padding = 24; // Padding for sector title
      const innerContainer: ContainerBox = {
        x: rect.x + 4,
        y: rect.y + padding,
        width: Math.max(rect.width - 8, 0),
        height: Math.max(rect.height - padding - 4, 0),
      };
      const childTotal = originalNode.children.reduce((acc, c) => acc + c.value, 0);
      rect.children = squarify(originalNode.children, innerContainer, childTotal);
    }
  }

  return result;
}

export function computeTreemap<T = any>(
  nodes: TreemapNode<T>[],
  width: number,
  height: number
): TreemapRect<T>[] {
  const total = nodes.reduce((sum, n) => sum + n.value, 0);
  return squarify(nodes, { x: 0, y: 0, width, height }, total);
}
