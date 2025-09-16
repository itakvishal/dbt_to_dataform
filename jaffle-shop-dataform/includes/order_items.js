To convert your dbt Jinja macro into a Dataform JavaScript function, you'll wrap the SQL logic inside Dataform's `publish()` function and use Dataform's `ref()` function (which works similarly to dbt's `ref`) to reference other datasets.

Here's the Dataform JavaScript equivalent:

```javascript
// models/your_model_name.js (or whatever you want to name this file)
publish("your_model_name", { // Replace "your_model_name" with the actual name for this output table/view
  type: "table", // or "view" if you prefer
  description: "A description of what this table contains.",
  tags: ["your_tag"], // Optional: Add relevant tags
  // Dependencies are automatically inferred by Dataform from the ref() calls below.
  // You can also list them explicitly if you prefer:
  // dependencies: [
  //   "stg_order_items",
  //   "stg_orders",
  //   "stg_products",
  //   "stg_supplies"
  // ]
}).query(ctx => `
    with

    order_items as (

        select * from ${ctx.ref("stg_order_items")}

    ),

    orders as (

        select * from ${ctx.ref("stg_orders")}

    ),

    products as (

        select * from ${ctx.ref("stg_products")}

    ),

    supplies as (

        select * from ${ctx.ref("stg_supplies")}

    ),

    order_supplies_summary as (

        select
            product_id,

            sum(supply_cost) as supply_cost

        from supplies

        group by 1

    ),

    joined as (

        select
            order_items.*,

            orders.ordered_at,

            products.product_name,
            products.product_price,
            products.is_food_item,
            products.is_drink_item,

            order_supplies_summary.supply_cost

        from order_items

        left join orders on order_items.order_id = orders.order_id

        left join products on order_items.product_id = products.product_id

        left join order_supplies_summary
            on order_items.product_id = order_supplies_summary.product_id

    )

    select * from joined
`);
```

### Explanation of Changes:

1.  **File Naming:** Dataform JavaScript files typically define a single table or view. The file name (e.g., `your_model_name.js`) often matches the name of the published dataset.
2.  **`publish()` function:**
    *   The entire SQL definition is wrapped within `publish("your_model_name", {...}).query(ctx => \`...\`)`.
    *   `"your_model_name"`: This is the name Dataform will give to the resulting table or view in your BigQuery dataset. **Remember to change this to an appropriate name for your model.**
    *   `type: "table"`: Specifies that this should be created as a BigQuery table. You can change this to `"view"` if you prefer a view.
    *   `description` and `tags`: These are optional metadata properties for documentation and organization within Dataform.
    *   `query(ctx => \`...\`)`: This is where your SQL query goes. The `ctx` object provides Dataform-specific functions like `ref()`.
3.  **`ctx.ref()` for Dependencies:**
    *   Instead of `{{ ref('stg_order_items') }}`, you now use `${ctx.ref("stg_order_items")}`.
    *   `ctx.ref()` tells Dataform to resolve the name of the `stg_order_items` dataset (which could be a table or view) and insert its fully qualified reference into the SQL.
    *   Dataform automatically infers dependencies from these `ctx.ref()` calls, building your project's DAG (Directed Acyclic Graph).
4.  **Backticks for Multi-line Strings:** JavaScript uses backticks (`` ` ``) for multi-line strings, which is very convenient for SQL queries.
5.  **`$` for JavaScript Variables/Expressions:** Within the backtick string, `${}` is used to embed JavaScript expressions (like `ctx.ref("stg_order_items")`) directly into the SQL string.

This Dataform JavaScript file will create a new table (or view) in your BigQuery project with the name you specify in `publish()`, based on the logic you've defined.