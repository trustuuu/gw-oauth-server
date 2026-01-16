import { FIELD_MAP } from "../firebase/firebase-service.js";

export const parseScimFilter = (filter: string): any[][] | null => {
  if (!filter) return null;

  // Simple regex to basic SCIM operators: eq, ne, co, sw, ew, pr, gt, ge, lt, le
  // Note: This is a basic parser and might need expansion for complex filters (and/or/grouping)
  // Example: userName eq "bjensen"
  // Example: meta.lastModified gt "2011-05-13T04:42:34Z"

  const conditions: any[][] = [];

  // Split by 'and' to separate conditions (simple AND logic support)
  const parts = filter.split(/\s+and\s+/i);

  for (const part of parts) {
    const match = part.match(
      /^(\S+)\s+(eq|ne|co|sw|ew|pr|gt|ge|lt|le)\s+(.*)$/i
    );
    if (match) {
      const [, field, op, valueRaw] = match;
      let value: any = valueRaw.trim();

      // Handle quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      // Handle boolean
      if (value === "true") value = true;
      if (value === "false") value = false;

      // Handle numbers if not quoted (and not boolean)
      if (
        typeof value !== "boolean" &&
        !isNaN(Number(value)) &&
        !valueRaw.includes('"')
      ) {
        value = Number(value);
      }

      // Map SCIM ops to Firestore ops
      // Firestore supports: <, <=, ==, >, >=, !=, array-contains, array-contains-any, in, not-in
      // Missing direct mapping for: co (contains), sw (starts with), ew (ends with), pr (present)
      // We will map what we can directly, others might need post-filtering or specific handling depending on DB capabilities.
      // For now, we map standard comparison operators.

      switch (op.toLowerCase()) {
        case "eq":
          conditions.push([field, "==", value]);
          break;
        case "ne":
          conditions.push([field, "!=", value]); // Requires Firestore constraint: "field != value"
          break;
        case "gt":
          conditions.push([field, ">", value]);
          break;
        case "ge":
          conditions.push([field, ">=", value]);
          break;
        case "lt":
          conditions.push([field, "<", value]);
          break;
        case "le":
          conditions.push([field, "<=", value]);
          break;
        // The following are not directly supported by standard Firestore where clauses without specialized indexes or full-text search extensions.
        // We might return them as is if the underlying service handles them, or log/ignore.
        // For 'pr' (present), we can check for null or specific existence checks if supported.
        case "pr":
          // Firestore doesn't have a direct 'exists' query operator in the same way.
          // Often simulated by checking > '' or similar for strings, or != null.
          conditions.push([field, "!=", null]);
          break;
        default:
          console.warn(`Unsupported SCIM operator in filter: ${op}`);
          break;
      }
    }
  }

  return conditions.length > 0 ? conditions : null;
};

export const applyProjection = (
  data: any[],
  attributes?: string,
  excludedAttributes?: string
): any[] => {
  if (!attributes && !excludedAttributes) {
    return data;
  }

  let includedKeys: string[] | null = null;
  let excludedKeys: string[] | null = null;

  // if (attributes) {
  //   includedKeys = attributes.split(",").map((s) => s.trim());
  // }

  // if (excludedAttributes) {
  //   excludedKeys = excludedAttributes.split(",").map((s) => s.trim());
  // }

  if (attributes) {
    includedKeys = attributes.split(",").map((s) => {
      const trimmed = s.trim();
      // Look up the correct casing, default to trimmed if not found
      return FIELD_MAP[trimmed.toLowerCase()] || trimmed;
    });
  }

  if (excludedAttributes) {
    excludedKeys = excludedAttributes.split(",").map((s) => {
      const trimmed = s.trim();
      // Look up the correct casing
      return FIELD_MAP[trimmed.toLowerCase()] || trimmed;
    });
  }

  return data.map((item) => {
    let projectedItem: any = {};

    // If includedKeys is specified, we ONLY include those (plus maybe id/mandatory ones if required, but SCIM says specific)
    if (includedKeys) {
      includedKeys.forEach((key) => {
        // Deep access support could be added here (e.g. name.givenName) using R.path or splitting
        // For now, supporting top-level keys
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          projectedItem[key] = item[key];
        }
      });
      // Ensure ID is always returned? SCIM usually always returns ID unless specifically excluded?
      // User request implies strict filtering. Let's stick to requested attributes.
    } else {
      // Start with everything if no inclusion list
      projectedItem = { ...item };
    }

    // Apply exclusions
    if (excludedKeys) {
      excludedKeys.forEach((key) => {
        delete projectedItem[key];
      });
    }

    return projectedItem;
  });
};
