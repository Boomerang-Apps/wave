/**
 * Dependency Graph Builder Module (Launch Sequence)
 *
 * Phase 4, Step 4.2: Dependency Graph Builder
 *
 * Builds and analyzes story dependency graphs for wave batching.
 */

// ============================================
// Graph Building
// ============================================

/**
 * @typedef {Object} DependencyGraph
 * @property {string[]} nodes - Story IDs
 * @property {Object<string, string[]>} edges - Adjacency list (story -> dependencies)
 * @property {Object<string, Object>} storyMap - Map of story ID to story data
 */

/**
 * Build a dependency graph from stories
 * @param {Object[]} stories - Array of story objects
 * @returns {DependencyGraph} The dependency graph
 */
export function buildDependencyGraph(stories) {
  const nodes = [];
  const edges = {};
  const storyMap = {};

  for (const story of stories) {
    nodes.push(story.id);
    edges[story.id] = story.dependencies || [];
    storyMap[story.id] = story;
  }

  return { nodes, edges, storyMap };
}

// ============================================
// Topological Sort
// ============================================

/**
 * Perform topological sort on stories (Kahn's algorithm)
 * @param {Object[]} stories - Array of story objects
 * @returns {Object[]} Stories in dependency order
 * @throws {Error} If circular dependency detected
 */
export function topologicalSort(stories) {
  if (stories.length === 0) return [];

  const graph = buildDependencyGraph(stories);
  const { nodes, edges, storyMap } = graph;

  // Calculate in-degree for each node
  const inDegree = {};
  for (const node of nodes) {
    inDegree[node] = 0;
  }

  // Build reverse edges (who depends on me)
  const reverseEdges = {};
  for (const node of nodes) {
    reverseEdges[node] = [];
  }

  for (const node of nodes) {
    for (const dep of edges[node] || []) {
      if (reverseEdges[dep]) {
        reverseEdges[dep].push(node);
        inDegree[node]++;
      }
    }
  }

  // Find all nodes with no dependencies (in-degree 0)
  const queue = nodes.filter(n => inDegree[n] === 0);
  const sorted = [];

  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(storyMap[current]);

    // Reduce in-degree for dependents
    for (const dependent of reverseEdges[current] || []) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
      }
    }
  }

  // Check for cycle
  if (sorted.length !== nodes.length) {
    throw new Error('Circular dependency detected');
  }

  return sorted;
}

// ============================================
// Cycle Detection
// ============================================

/**
 * Detect circular dependencies in stories
 * @param {Object[]} stories - Array of story objects
 * @returns {string[][]} Array of cycles (each cycle is array of story IDs)
 */
export function detectCircularDependencies(stories) {
  if (stories.length === 0) return [];

  const graph = buildDependencyGraph(stories);
  const { nodes, edges } = graph;
  const cycles = [];

  // DFS-based cycle detection
  const WHITE = 0; // Unvisited
  const GRAY = 1;  // In current path
  const BLACK = 2; // Fully processed

  const color = {};
  const path = [];

  for (const node of nodes) {
    color[node] = WHITE;
  }

  function dfs(node) {
    color[node] = GRAY;
    path.push(node);

    for (const dep of edges[node] || []) {
      if (!nodes.includes(dep)) continue; // Skip missing dependencies

      if (color[dep] === GRAY) {
        // Found cycle - extract it
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
      } else if (color[dep] === WHITE) {
        dfs(dep);
      }
    }

    path.pop();
    color[node] = BLACK;
  }

  for (const node of nodes) {
    if (color[node] === WHITE) {
      dfs(node);
    }
  }

  return cycles;
}

// ============================================
// Execution Levels
// ============================================

/**
 * Get execution levels (stories that can run in parallel)
 * @param {Object[]} stories - Array of story objects
 * @returns {string[][]} Array of levels, each containing story IDs
 */
export function getExecutionLevels(stories) {
  if (stories.length === 0) return [];

  const graph = buildDependencyGraph(stories);
  const { nodes, edges } = graph;

  // Calculate level for each node
  const levels = {};
  const storySet = new Set(nodes);

  function getLevel(nodeId, visited = new Set()) {
    if (levels[nodeId] !== undefined) return levels[nodeId];
    if (visited.has(nodeId)) return 0; // Cycle protection

    visited.add(nodeId);

    const deps = (edges[nodeId] || []).filter(d => storySet.has(d));
    if (deps.length === 0) {
      levels[nodeId] = 0;
      return 0;
    }

    const maxDepLevel = Math.max(...deps.map(d => getLevel(d, visited)));
    levels[nodeId] = maxDepLevel + 1;
    return levels[nodeId];
  }

  // Calculate levels for all nodes
  for (const node of nodes) {
    getLevel(node);
  }

  // Group nodes by level
  const maxLevel = Math.max(...Object.values(levels), 0);
  const result = [];

  for (let i = 0; i <= maxLevel; i++) {
    const levelNodes = nodes.filter(n => levels[n] === i);
    if (levelNodes.length > 0) {
      result.push(levelNodes);
    }
  }

  return result;
}

// ============================================
// Dependents
// ============================================

/**
 * Get stories that depend on a given story
 * @param {string} storyId - Story ID to find dependents for
 * @param {Object[]} stories - Array of story objects
 * @param {Object} [options] - Options
 * @param {boolean} [options.transitive] - Include transitive dependents
 * @returns {string[]} Array of dependent story IDs
 */
export function getStoryDependents(storyId, stories, options = {}) {
  const directDependents = [];

  for (const story of stories) {
    const deps = story.dependencies || [];
    if (deps.includes(storyId)) {
      directDependents.push(story.id);
    }
  }

  if (!options.transitive) {
    return directDependents;
  }

  // Find transitive dependents
  const allDependents = new Set(directDependents);
  const queue = [...directDependents];

  while (queue.length > 0) {
    const current = queue.shift();
    const moreDependents = getStoryDependents(current, stories);

    for (const dep of moreDependents) {
      if (!allDependents.has(dep)) {
        allDependents.add(dep);
        queue.push(dep);
      }
    }
  }

  return [...allDependents];
}

// ============================================
// Validation
// ============================================

/**
 * @typedef {Object} DependencyValidationResult
 * @property {boolean} valid - Whether dependencies are valid
 * @property {string[]} errors - Array of error messages
 */

/**
 * Validate story dependencies
 * @param {Object[]} stories - Array of story objects
 * @returns {DependencyValidationResult}
 */
export function validateDependencies(stories) {
  const errors = [];
  const storyIds = new Set(stories.map(s => s.id));

  // Check for missing dependencies
  for (const story of stories) {
    const deps = story.dependencies || [];
    for (const dep of deps) {
      if (!storyIds.has(dep)) {
        errors.push(`Story ${story.id} depends on missing story ${dep}`);
      }
    }
  }

  // Check for circular dependencies
  const cycles = detectCircularDependencies(stories);
  for (const cycle of cycles) {
    errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default buildDependencyGraph;
