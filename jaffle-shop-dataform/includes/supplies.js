The dbt code you provided is a standard dbt **model** (a `.sql` file using Jinja templating), not a dbt **macro** (which would start with `{% macro ... %}`).

Converting this dbt model into a Dataform JavaScript function involves two main parts:

1.  **The Dataform `ref()` function:** This is Dataform's equivalent of dbt's `ref()`, used to reference other datasets (tables/views) within your Dataform project.
2.  **How to define a model in Dataform:** Dataform typically defines datasets using `.sqlx` (SQL with Dataform functions) or `.js` files.

---

### Option 1: The most direct Dataform equivalent (a Dataform Model)

For such a simple model, the best Dataform equivalent is a Dataform model definition, which directly defines a view or table. This is what the dbt code essentially does.

**`models/my_new_supplies_model.sqlx`** (or `.js` for more complex logic)

```sqlx
-- This file defines a Dataform view/table named 'my_new_supplies_model'
-- In Dataform, you often don't need the CTE for such a simple pass-through.
-- The most common approach is to just select directly from the ref.

SELECT * FROM ${ref('stg_supplies')}
```

**Explanation:**

*   `SELECT * FROM ${ref('stg_supplies')}`: This is the core logic. `ref('stg_supplies')` tells Dataform to find the fully qualified name of the `stg_supplies` dataset. Dataform will automatically build `stg_supplies` before this model.
*   The CTE `with supplies as (...) select * from supplies` from your dbt example is effectively just a passthrough. Dataform, like dbt, can optimize this away, so directly selecting from `ref('stg_supplies')` is usually sufficient and cleaner.

---

### Option 2: As a JavaScript function (if you truly need to generate the SQL programmatically)

If you have a more complex scenario where you need to generate this SQL string within a reusable JavaScript function (similar to how a dbt macro might abstract SQL generation), you'd define a function that returns the SQL.

You'd typically put such a function in a `includes/` directory (e.g., `includes/utils.js`).

**`includes/utils.js`**

```javascript
// This function takes the Dataform context (ctx) as an argument
// because `ctx.ref()` is needed to resolve dataset references.
function generateSuppliesSql(ctx) {
  // The SQL string is returned by the function.
  // We explicitly use ctx.ref() here.
  return `
    WITH supplies AS (
      SELECT * FROM ${ctx.ref('stg_supplies')}
    )
    SELECT * FROM supplies
  `;
}

// You might export it if you're using modules, or make it globally available
// if this file is loaded in a way that allows it (e.g., in Dataform's include path).
// For simplicity in Dataform, you often don't need explicit exports/imports
// within the Dataform environment if the file is in 'includes/'.
```

**How to use this function in a Dataform model file:**

**`models/my_new_supplies_model.js`**

```javascript
// Define a Dataform view/table.
// We use a .js file because we're calling a JavaScript function to generate the query.
declare({
  name: "my_new_supplies_model",
  description: "Selects all supplies data using a shared JS function.",
  // You can specify other options like schema, tags, etc.
}).query(ctx => generateSuppliesSql(ctx)); // Call the function, passing the context
```

**Explanation:**

*   **`declare({...}).query(ctx => ...)`**: This is how you define a Dataform dataset using a JavaScript file. The `query` method takes a function that receives the Dataform `ctx` (context) object.
*   **`generateSuppliesSql(ctx)`**: We call the JavaScript function we defined in `includes/utils.js`, passing the `ctx` object to it. This allows the function to use `ctx.ref('stg_supplies')` correctly.

---

### Which option to choose?

*   For simple transformations like your example, **Option 1 (a Dataform model directly)** is the most common, idiomatic, and recommended approach. It's concise and easy to understand.
*   **Option 2 (a JavaScript function)** is useful when you have more complex, reusable SQL generation logic that you want to abstract away into a function, similar to how you'd use a dbt macro for complex templating. It makes your model files cleaner by delegating the SQL generation.