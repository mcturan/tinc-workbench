export class GraphTraversal {
  findConnectedComponent(
    startPinKey: string,
    adjacencyList: Map<string, Set<string>>
  ): string[] {
    const visited = new Set<string>();
    const queue: string[] = [startPinKey];
    visited.add(startPinKey);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const neighbors = adjacencyList.get(current);
      if (neighbors) {
        const sortedNeighbors = Array.from(neighbors).sort();
        for (const neighbor of sortedNeighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    return queue.sort();
  }

  findPath(
    startPinKey: string,
    endPinKey: string,
    adjacencyList: Map<string, Set<string>>
  ): string[] | null {
    if (startPinKey === endPinKey) return [startPinKey];

    const visited = new Set<string>();
    const queue: string[] = [startPinKey];
    const parentMap = new Map<string, string>();
    visited.add(startPinKey);

    let head = 0;
    let found = false;

    while (head < queue.length) {
      const current = queue[head++];
      if (current === endPinKey) {
        found = true;
        break;
      }

      const neighbors = adjacencyList.get(current);
      if (neighbors) {
        const sortedNeighbors = Array.from(neighbors).sort();
        for (const neighbor of sortedNeighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            parentMap.set(neighbor, current);
            queue.push(neighbor);
          }
        }
      }
    }

    if (!found) return null;

    const path: string[] = [];
    let curr = endPinKey;
    while (curr !== startPinKey) {
      path.push(curr);
      curr = parentMap.get(curr)!;
    }
    path.push(startPinKey);
    return path.reverse();
  }
}
