# Order confirmation email: show delivery date

Use this shortcode inside the **line_items loop** of your **Order confirmation** email so the customer sees the delivery date they selected for each line item.

## Where to add it

1. In Shopify Admin go to **Settings → Notifications**.
2. Open **Order confirmation**.
3. Edit the email template and find the **line items** / **line_items** loop (where each product in the order is listed).
4. Paste the shortcode where you want the delivery date to appear (e.g. under the product title or after the quantity/price).

## Shortcode (copy-paste)

Use **one** of the options below, depending on how you want it to look.

### Option A: Label + date on its own line (only if date exists)

```liquid
{% if line_item.properties['Delivery Date'] != blank %}
  <p style="margin: 0.25em 0 0 0; font-size: 14px;"><strong>Delivery date:</strong> {{ line_item.properties['Delivery Date'] }}</p>
{% endif %}
```

### Option B: Inline with other line item details

```liquid
{% if line_item.properties['Delivery Date'] != blank %}
  Delivery date: {{ line_item.properties['Delivery Date'] }}
{% endif %}
```

### Option C: Inside an existing properties loop (show only Delivery Date)

If your template already loops over `line_item.properties`, you can show only the delivery date by adding a condition:

```liquid
{% for property in line_item.properties %}
  {% if property.first == 'Delivery Date' %}
    <p style="margin: 0.25em 0 0 0;"><strong>Delivery date:</strong> {{ property.last }}</p>
  {% endif %}
{% endfor %}
```

Or if you want to list all properties but style the delivery date differently:

```liquid
{% for property in line_item.properties %}
  {% unless property.first == 'Delivery Date' %}
    {{ property.first }}: {{ property.last }}
  {% endunless %}
{% endfor %}
{% if line_item.properties['Delivery Date'] != blank %}
  <p><strong>Delivery date:</strong> {{ line_item.properties['Delivery Date'] }}</p>
{% endif %}
```

## Example placement

Typical structure of an order confirmation line items block:

```liquid
{% for line_item in line_items %}
  <tr>
    <td>{{ line_item.title }}</td>
    <td>{{ line_item.quantity }}</td>
    <td>{{ line_item.final_line_price | money }}</td>
  </tr>
  {% if line_item.properties['Delivery Date'] != blank %}
  <tr>
    <td colspan="3" style="padding-top: 0;">
      <strong>Delivery date:</strong> {{ line_item.properties['Delivery Date'] }}
    </td>
  </tr>
  {% endif %}
{% endfor %}
```

## Note

- The property name is exactly **Delivery Date** (with a space), as set by the storefront date picker.
- If the customer did not select a date for that line (e.g. product without the date picker), the shortcode outputs nothing.
