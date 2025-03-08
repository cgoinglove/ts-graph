/**
 * Base interface for a graph node.
 * Represents an executable unit that processes input data and produces output.
 *
 * @template Name - The type of the node name
 * @template Input - The type of the node input
 * @template Output - The type of the node output
 */
export type GraphNode<Name extends string = string, Input = any, Output = any> = {
  /** Unique identifier for the node */
  readonly name: Name;

  /** Input data for the node */
  input: Input;

  /** Output data from the node. For async outputs, the resolved value is used. */
  output: Output extends PromiseLike<any> ? Awaited<Output> : Output;
};

/**
 * Extracts the input type of a node with a specific name.
 *
 * @template T - The GraphNode type
 * @template Name - The name of the node to extract the input type from
 */
export type InputOf<T extends GraphNode, Name extends T['name']> = Extract<T, { name: Name }>['input'];

/**
 * Extracts the output type of a node with a specific name.
 *
 * @template T - The GraphNode type
 * @template Name - The name of the node to extract the output type from (defaults to T['name'])
 */
export type OutputOf<T extends GraphNode, Name extends T['name'] = T['name']> = Extract<T, { name: Name }>['output'];

/**
 * A GraphNode type with optional output.
 * Used to represent nodes that may not have an output when an error occurs during processing.
 *
 * @template T - The GraphNode type
 */
export type GraphNodeWithOptionalOutput<T extends GraphNode> = {
  [K in keyof T]: K extends 'output' ? T[K] | undefined : T[K];
};

/**
 * Records the execution history of a node.
 * Contains timing information, success/failure status, and error details.
 *
 * @template T - The GraphNode type
 */
export type GraphNodeHistory<T extends GraphNode = GraphNode> = {
  /** Timestamp when the node execution started */
  startedAt: number;

  /** Timestamp when the node execution ended */
  endedAt: number;

  /** Error object if an error occurred during execution (optional) */
  error?: Error;
} & (
  | {
      /** Indicates the node execution was successful */
      isOk: true;

      /** Error object (optional even for successful executions) */
      error?: Error;

      /** The executed node with its input and output */
      node: T;
    }
  | {
      /** Indicates the node execution failed */
      isOk: false;

      /** Error object for the failed execution */
      error: Error;

      /** The executed node with its input and possibly undefined output */
      node: GraphNodeWithOptionalOutput<T>;
    }
);

/**
 * Event emitted when a graph workflow starts execution.
 *
 * @template Input - The input type for the workflow
 */
export type GraphStartEvent<Input = any> = {
  /** Unique identifier for this execution instance */
  executionId: string;

  /** Event type identifier */
  eventType: 'WORKFLOW_START';

  /** Timestamp when the workflow started */
  startedAt: number;

  /** Input data provided to the workflow */
  input: Input;
};

/**
 * Event emitted when a graph workflow completes execution.
 *
 * @template T - The GraphNode type
 * @template Output - The output type of the workflow
 */
export type GraphEndEvent<T extends GraphNode = GraphNode, Output = any> = {
  /** Unique identifier for this execution instance */
  executionId: string;

  /** Event type identifier */
  eventType: 'WORKFLOW_END';

  /** Timestamp when the workflow started */
  startedAt: number;

  /** Timestamp when the workflow ended */
  endedAt: number;

  /** Array of node execution histories */
  histories: GraphNodeHistory<T>[];
} & (
  | {
      /** Indicates the workflow execution failed */
      isOk: false;
      /** Error object for the failed workflow */
      error: Error;
      /** Optional output from the workflow (may be undefined for failures) */
      output?: Output;
    }
  | {
      /** Indicates the workflow execution was successful */
      isOk: true;
      /** Optional error object (for successful workflows with warnings) */
      error?: Error;
      /** Output data from the workflow */
      output: Output;
    }
);

/**
 * Event emitted when a node begins execution.
 *
 * @template T - The GraphNode type
 */
export type GraphNodeStartEvent<T extends GraphNode = GraphNode> = {
  /** Unique identifier for this execution instance */
  executionId: string;
  /** Event type identifier */
  eventType: 'NODE_START';
} & Pick<GraphNodeHistory<T>, 'startedAt' | 'node'>;

/**
 * Event emitted when a node completes execution.
 *
 * @template T - The GraphNode type
 */
export type GraphNodeEndEvent<T extends GraphNode = GraphNode> = {
  /** Unique identifier for this execution instance */
  executionId: string;

  /** Event type identifier */
  eventType: 'NODE_END';
} & GraphNodeHistory<T>;

/**
 * Union type for all possible graph-related events.
 *
 * @template T - The GraphNode type
 * @template StartNodeName - The name of the starting node
 * @template EndNodeName - The name of the ending node
 */
export type GraphEvent<
  T extends GraphNode = GraphNode,
  StartNodeName extends T['name'] = T['name'],
  EndNodeName extends T['name'] = T['name'],
> =
  | GraphStartEvent<InputOf<T, StartNodeName>>
  | GraphEndEvent<T, OutputOf<T, EndNodeName>>
  | GraphNodeStartEvent<T>
  | GraphNodeEndEvent<T>;

/**
 * Utility type to find nodes that can be connected to a given input node.
 * A node is connectable if its input type matches the output type of the input node.
 *
 * @template T - The node type to check if it's connectable
 * @template InputNode - The source node that provides the output
 */
export type ConnectableNode<T extends GraphNode, InputNode extends GraphNode> = {
  [ToName in T['name']]: OutputOf<InputNode, InputNode['name']> extends InputOf<T, ToName> ? ToName : never;
}[T['name']];

/**
 * Options for running a graph workflow.
 */
export interface RunOptions {
  /** Maximum number of times a node can be visited during execution */
  maxNodeVisits: number;
  /** Maximum execution time in milliseconds before timeout */
  timeout: number;
}

/**
 * Represents the structure of a graph.
 * Used for visualization and analysis purposes.
 */
export type GraphStructure = Array<{
  /** Name of the node */
  name: string;
  /** Edge information for the node (if any) */
  edge?:
    | {
        /** Direct edge with explicit target node(s) */
        type: 'direct';
        name: string | string[];
      }
    | {
        /** Dynamic edge with runtime-determined target */
        type: 'dynamic';
        name?: string;
      };
}>;

/**
 * Represents the result of executing a graph workflow.
 *
 * @template T - The GraphNode type
 * @template Output - The output type of the workflow
 */
export type GraphResult<T extends GraphNode = never, Output = unknown> = {
  /** Timestamp when the workflow started */
  startedAt: number;

  /** Timestamp when the workflow ended */
  endedAt: number;

  /** Error object if an error occurred (optional) */
  error?: Error;

  /** Array of node execution histories */
  histories: GraphNodeHistory<T>[];
} & (
  | {
      /** Indicates the workflow execution was successful */
      isOk: true;
      /** Optional error object (for successful workflows with warnings) */
      error?: Error;
      /** Output data from the workflow */
      output: Output;
    }
  | {
      /** Indicates the workflow execution failed */
      isOk: false;
      /** Error object for the failed workflow */
      error: Error;
      /** Optional output from the workflow (may be undefined for failures) */
      output?: Output;
    }
);

/**
 * Function that determines the next node to execute based on a previous node's output.
 * Used for dynamic routing between nodes.
 *
 * @template AllNode - Union type of all possible nodes
 * @template FromNodeName - The name of the source node
 * @template ToNodeName - The name of the target node
 */
export type GraphNodeRouter<
  AllNode extends GraphNode,
  FromNodeName extends AllNode['name'],
  ToNodeName extends AllNode['name'],
> = (output: Extract<AllNode, { name: FromNodeName }>['output']) =>
  | {
      /** Name of the target node */
      name: ToNodeName;
      /** Input to provide to the target node */
      input: InputOf<AllNode, ToNodeName>;
    }
  | ToNodeName
  | undefined
  | null
  | void
  | PromiseLike<
      | {
          /** Name of the target node */
          name: ToNodeName;
          /** Input to provide to the target node */
          input: InputOf<AllNode, ToNodeName>;
        }
      | ToNodeName
      | undefined
      | void
    >;

/**
 * Interface for a runnable graph workflow.
 * Provides methods to execute, visualize, and monitor the graph.
 *
 * @template T - The GraphNode type
 * @template StartNode - The name of the starting node
 * @template EndNode - The name of the ending node
 */
export interface GraphRunnable<
  T extends GraphNode = never,
  StartNode extends T['name'] = never,
  EndNode extends T['name'] = never,
> {
  /**
   * Gets the structure of the graph.
   * @returns The graph structure for visualization and analysis
   */
  getStructure(): GraphStructure;

  /**
   * Subscribes to graph execution events.
   * @param handler - Function to handle emitted events
   */
  subscribe(handler: (event: GraphEvent<T, StartNode, EndNode>) => any): void;

  /**
   * Unsubscribes from graph execution events.
   * @param handler - The handler function to remove
   */
  unsubscribe(handler: (event: any) => any): void;

  /**
   * Executes the graph workflow.
   * @param input - Input data for the starting node
   * @param options - Optional configuration for execution
   * @returns Promise resolving to the execution result
   */
  run(input: InputOf<T, StartNode>, options?: Partial<RunOptions>): Promise<GraphResult<T, OutputOf<T, EndNode>>>;
}

/**
 * Interface for building and configuring a graph.
 * Provides methods to add nodes, define edges, and compile the graph into a runnable workflow.
 *
 * @template T - The GraphNode type
 * @template Connected - Names of nodes that already have outgoing connections
 */
export interface GraphRegistry<T extends GraphNode = never, Connected extends string = never> {
  /**
   * Adds a new node to the graph.
   *
   * @param node - Node configuration with name and execution function
   * @returns Updated graph registry
   */
  addNode<Name extends string = string, Input = any, Output = any>(node: {
    name: Name;
    execute: (input: Input) => Output;
  }): GraphRegistry<T | GraphNode<Name, Input, Output>, Connected>;

  /**
   * Adds a merge node that combines outputs from multiple source nodes.
   *
   * @param node - Merge node configuration
   * @returns Updated graph registry
   */
  addMergeNode<Name extends string = string, NodeNames extends T['name'][] = T['name'][], Output = any>(node: {
    name: Name;
    sources: NodeNames;
    execute: (inputs: { [K in NodeNames[number]]: OutputOf<T, K> }) => Output;
  }): GraphRegistry<T | GraphNode<Name, any, Output>, Connected>;

  /**
   * Creates a direct edge between nodes.
   *
   * @param from - Source node name
   * @param to - Target node name(s)
   * @returns Updated graph registry
   */
  edge<
    FromName extends Exclude<T['name'], Connected>,
    ToName extends Exclude<ConnectableNode<T, Extract<T, { name: FromName }>>, FromName>,
  >(
    from: FromName,
    to: ToName | ToName[]
  ): GraphRegistry<T, Connected | FromName>;

  /**
   * Creates a dynamic edge that uses a router function to determine the next node.
   *
   * @param from - Source node name
   * @param router - Function that determines the next node based on output
   * @returns Updated graph registry
   */
  dynamicEdge<FromName extends T['name'], ToName extends T['name']>(
    from: FromName,
    router: GraphNodeRouter<T, FromName, ToName>
  ): GraphRegistry<T, Connected | FromName>;

  /**
   * Compiles the graph into a runnable workflow.
   *
   * @param startNode - Name of the node to start execution from
   * @param endNode - Optional name of the node to end execution at
   * @returns Runnable graph instance
   */
  compile<StartName extends string = T['name'], EndName extends string = T['name']>(
    startNode: StartName,
    endNode?: EndName
  ): GraphRunnable<T, StartName, EndName>;
}
